"""The Tavily allowance has to last until judging closes on 15 Dec.

Three things are being pinned here, all of them about money or honesty:

1. A hard daily cap. Past it the child still gets the curated helplines, so
   the only thing a spent budget costs is the local service.
2. A cache that survives a restart. `_cache` used to be a dict in memory, so
   every redeploy paid for the same sixteen states again.
3. Extract that never invents a phone number. "Siehe Webseite" is an honest
   answer; a number nobody answers is not.

No network: `httpx.MockTransport` serves every request, and a test that
reached the real API would fail rather than quietly spend a credit.
"""

import json

import httpx
import pytest

from engine import resources as R


@pytest.fixture(autouse=True)
def isolate(tmp_path, monkeypatch):
    """A fresh state file per test, and no inherited key or cap."""
    monkeypatch.setattr(R, "STATE_FILE", tmp_path / "state.json")
    monkeypatch.setenv("TAVILY_API_KEY", "test-key-not-real")
    monkeypatch.delenv("TAVILY_DAILY_CAP", raising=False)
    R._reset_state_for_tests()
    yield
    R._reset_state_for_tests()


SEARCH_HIT = {
    "results": [
        {"title": "Schulpsychologische Beratungsstelle", "url": "https://zsl-bw.de/beratung"}
    ]
}


def transport(handler):
    R._transport = httpx.MockTransport(handler)
    return R._transport


def serve(*, search=None, extract=None, calls=None):
    """One handler for both endpoints, recording what was asked for."""

    def handler(request: httpx.Request) -> httpx.Response:
        if calls is not None:
            calls.append(str(request.url))
        if "extract" in str(request.url):
            if extract is None:
                return httpx.Response(500, json={"error": "nope"})
            return httpx.Response(200, json=extract)
        return httpx.Response(200, json=search if search is not None else {"results": []})

    return handler


# --- 1. the cap -------------------------------------------------------------


async def test_the_cap_stops_live_calls_and_the_child_still_gets_help(monkeypatch):
    """Past the cap: no request leaves, and the helplines are still there."""
    monkeypatch.setenv("TAVILY_DAILY_CAP", "0")
    calls: list[str] = []
    transport(serve(search=SEARCH_HIT, calls=calls))

    found, source = await R.resources_with_source("BW", "de")

    assert calls == [], f"the cap was reached and a request still went out: {calls}"
    assert source == "fallback"
    assert found, "a spent Tavily budget must never empty the list a child sees"
    assert all(r["contact"] for r in found)


async def test_the_cap_counts_every_call_including_a_failed_one(monkeypatch):
    """Tavily bills the request, not the answer.

    A cap that only counted successes could be walked straight through by a
    failing endpoint, which is the exact case a cap is for.
    """
    monkeypatch.setenv("TAVILY_DAILY_CAP", "3")

    def failing(request: httpx.Request) -> httpx.Response:
        return httpx.Response(500, json={"error": "upstream"})

    transport(failing)

    for _ in range(5):
        R._reset_state_for_tests()  # a restart must not reset the allowance
        await R._search_local("BW")

    assert R.tavily_status()["tavily_spent_today"] == "3"


async def test_the_cap_is_reported_for_health():
    transport(serve(search=SEARCH_HIT, extract={"results": []}))
    await R.resources_with_source("BW", "de")

    status = R.tavily_status()
    assert status["tavily_daily_cap"] == str(R.DEFAULT_DAILY_CAP)
    assert int(status["tavily_spent_today"]) >= 1
    assert all(isinstance(v, str) for v in status.values()), "contract says dict[str, str]"


# --- 2. the cache across a restart -----------------------------------------


async def test_the_cache_survives_a_restart():
    """The whole point: a redeploy must not pay for the same state again."""
    calls: list[str] = []
    transport(serve(search=SEARCH_HIT, extract={"results": []}, calls=calls))

    first, _ = await R.resources_with_source("BW", "de")
    after_first = len(calls)

    R._reset_state_for_tests()  # same as a new process reading the file
    second, _ = await R.resources_with_source("BW", "de")

    assert len(calls) == after_first, (
        f"a restart paid for the lookup again: {calls}. The cache is on disk "
        "so a redeploy or a second instance reuses it."
    )
    assert [r["contact"] for r in second] == [r["contact"] for r in first]


async def test_only_a_successful_lookup_is_cached():
    """A failure must be retried, not remembered for a day."""
    calls: list[str] = []
    transport(serve(search={"results": []}, calls=calls))

    await R.resources_with_source("BW", "de")
    R._reset_state_for_tests()
    await R.resources_with_source("BW", "de")

    assert len(calls) == 2, "an empty result was cached; it must be retried"


async def test_an_expired_entry_is_refetched(monkeypatch):
    transport(serve(search=SEARCH_HIT, extract={"results": []}))
    await R.resources_with_source("BW", "de")

    state = R._load_state()
    state["entries"]["BW"]["expires"] = 0.0  # as if written 25 hours ago
    R._save_state()
    R._reset_state_for_tests()

    calls: list[str] = []
    transport(serve(search=SEARCH_HIT, extract={"results": []}, calls=calls))
    await R.resources_with_source("BW", "de")

    assert calls, "a day-old entry must be refetched, not served forever"


async def test_a_corrupt_state_file_does_not_break_a_child_s_request():
    """Whatever is on disk, the list still comes back."""
    R.STATE_FILE.write_text("{not json at all", encoding="utf-8")
    R._reset_state_for_tests()
    transport(serve(search=SEARCH_HIT, extract={"results": []}))

    found, _ = await R.resources_with_source("BW", "de")

    assert found


# --- 3. extract -------------------------------------------------------------

PAGE = (
    "Schulpsychologische Beratungsstelle\n"
    "Telefon: 0711 6642-0\n"
    "Sprechzeiten: Mo - Fr 9 - 16 Uhr\n"
    "Postfach 12345, Hausnummer 7\n"
)


async def test_extract_replaces_the_placeholder_with_what_the_page_says():
    transport(serve(search=SEARCH_HIT, extract={"results": [{"raw_content": PAGE}]}))

    found, _ = await R.resources_with_source("BW", "de")
    local = found[-1]

    assert local["contact"] == "0711 6642-0"
    assert "Uhr" in local["hours"] and local["hours"] != "Siehe Webseite"
    assert local["source_url"] == "https://zsl-bw.de/beratung", (
        "the page must stay linked after the number replaces it, so an adult "
        "can check where it came from"
    )
    assert local["retrieved_at"]


async def test_extract_failure_leaves_the_link_exactly_as_before():
    """The old behaviour is the fallback, not an error."""
    transport(serve(search=SEARCH_HIT, extract=None))  # extract returns 500

    found, _ = await R.resources_with_source("BW", "de")
    local = found[-1]

    assert local["hours"] == "Siehe Webseite"
    assert local["contact"] == "https://zsl-bw.de/beratung"


async def test_a_page_with_no_phone_number_is_left_alone():
    prose = "Wir beraten Schulen und Eltern. Weitere Informationen auf unserer Webseite."
    transport(serve(search=SEARCH_HIT, extract={"results": [{"raw_content": prose}]}))

    found, _ = await R.resources_with_source("BW", "de")

    assert found[-1]["contact"] == "https://zsl-bw.de/beratung"
    assert found[-1]["hours"] == "Siehe Webseite"


async def test_a_number_that_is_not_labelled_a_phone_number_is_never_taken():
    """The one that matters: no guessing.

    A postcode, a house number and a file reference are all number-shaped. A
    wrong number on a child-safety screen is worse than no number, because the
    child rings it and nobody answers.
    """
    misleading = (
        "Postfach 70173 Stuttgart\n"
        "Aktenzeichen 2026-4451-99\n"
        "Hausnummer 12\n"
        "Gegründet 1998\n"
    )
    transport(serve(search=SEARCH_HIT, extract={"results": [{"raw_content": misleading}]}))

    found, _ = await R.resources_with_source("BW", "de")

    assert found[-1]["contact"] == "https://zsl-bw.de/beratung", (
        f"a number with no phone label was taken: {found[-1]['contact']!r}"
    )


async def test_extract_is_never_asked_for_a_host_we_did_not_vet():
    """Defence in depth: this is the one place a URL from Tavily's answer is
    fed back into an outbound request of ours."""
    calls: list[str] = []
    R._transport = httpx.MockTransport(serve(extract={"results": [{"raw_content": PAGE}]},
                                             calls=calls))

    phone, hours = await R._extract_details(
        "https://evil.example.com/page", "zsl-bw.de", "test-key-not-real"
    )

    assert (phone, hours) == (None, None)
    assert calls == [], f"a foreign host was fetched: {calls}"


async def test_a_foreign_search_result_never_reaches_the_child():
    off_site = {"results": [{"title": "Beratung", "url": "https://evil.example.com/x"}]}
    transport(serve(search=off_site))

    found, source = await R.resources_with_source("BW", "de")

    assert source == "fallback"
    assert all("evil.example.com" not in r["contact"] for r in found)


async def test_extract_costs_one_credit_and_only_for_the_best_result():
    """Three search hits must not mean three extracts: that is the difference
    between the 32-credit measured run Neel budgeted and a 64-credit one."""
    three = {"results": [
        {"title": "A", "url": "https://zsl-bw.de/a"},
        {"title": "B", "url": "https://zsl-bw.de/b"},
        {"title": "C", "url": "https://zsl-bw.de/c"},
    ]}
    calls: list[str] = []
    transport(serve(search=three, extract={"results": [{"raw_content": PAGE}]}, calls=calls))

    await R.resources_with_source("BW", "de")

    extracts = [c for c in calls if "extract" in c]
    assert len(extracts) == 1, f"expected one extract, got {len(extracts)}: {extracts}"
    assert R.tavily_status()["tavily_spent_today"] == "2", "one search plus one extract"


async def test_the_state_file_holds_no_key_and_no_child_text():
    """It is written to disk, so it must stay boring."""
    transport(serve(search=SEARCH_HIT, extract={"results": [{"raw_content": PAGE}]}))
    await R.resources_with_source("BW", "de")

    raw = R.STATE_FILE.read_text(encoding="utf-8")
    assert "test-key-not-real" not in raw
    assert set(json.loads(raw)) == {"day", "spent", "entries"}

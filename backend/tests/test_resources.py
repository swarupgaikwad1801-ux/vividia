"""Tests for engine/resources.py. No network: Tavily is replaced by a mock.

    backend/.venv/Scripts/python -m pytest -q tests/test_resources.py
"""

import asyncio
import json

import httpx
import pytest

from engine import resources as res


def run(coro):
    return asyncio.run(coro)


def tavily_returning(results, seen=None):
    def handler(request: httpx.Request) -> httpx.Response:
        if seen is not None:
            seen.append(json.loads(request.content))
        return httpx.Response(200, json={"results": results})
    return httpx.MockTransport(handler)


@pytest.fixture(autouse=True)
def no_real_network(monkeypatch, tmp_path):
    monkeypatch.setenv("TAVILY_API_KEY", "test-key")
    monkeypatch.setattr(res, "_transport", tavily_returning([]))
    # The cache lives in a file now so it survives a redeploy, which means
    # each test needs its own: a shared one would leak lookups between tests
    # and would write into the working tree. This replaces _cache.clear().
    monkeypatch.setattr(res, "STATE_FILE", tmp_path / "tavily_state.json")
    monkeypatch.delenv("TAVILY_DAILY_CAP", raising=False)
    res._reset_state_for_tests()
    yield
    res._reset_state_for_tests()


def test_helplines_are_shown_without_any_lookup(monkeypatch):
    monkeypatch.delenv("TAVILY_API_KEY")
    found, source = run(res.resources_with_source("", "ar"))
    contacts = [r["contact"] for r in found]
    assert "116 111" in contacts
    assert "https://krisenchat.de/" in contacts
    assert source == "fallback"


def test_every_curated_entry_carries_its_source():
    for resource in res.national_helplines() + res.emergency_numbers():
        assert resource["source_url"].startswith("https://")
        assert resource["retrieved_at"]


def test_emergency_numbers_are_curated_not_searched():
    contacts = {r["contact"] for r in res.emergency_numbers()}
    assert contacts == {"110", "112"}


def test_live_results_from_the_state_site_are_added(monkeypatch):
    monkeypatch.setattr(res, "_transport", tavily_returning([
        {"title": "Staatliche Schulberatung in Bayern", "url": "https://www.schulberatung.bayern.de/"},
    ]))
    found, source = run(res.resources_with_source("BY", "de"))
    assert source == "live"
    assert found[-1]["source_url"] == "https://www.schulberatung.bayern.de/"


def test_results_from_other_hosts_are_dropped(monkeypatch):
    monkeypatch.setattr(res, "_transport", tavily_returning([
        {"title": "Some forum", "url": "https://forum.example.com/schulpsychologie"},
        {"title": "Lookalike", "url": "https://schulberatung.bayern.de.evil.example/"},
    ]))
    found, source = run(res.resources_with_source("BY", "de"))
    assert source == "fallback"
    assert all("example" not in r["contact"] for r in found)


def test_unknown_state_never_triggers_a_search(monkeypatch):
    seen = []
    monkeypatch.setattr(res, "_transport", tavily_returning([], seen))
    run(res.resources_with_source("XX", "de"))
    assert seen == []


def test_all_sixteen_states_have_a_vetted_site():
    assert len(res.STATE_SITES) == 16
    assert all(domain and "/" not in domain for _, domain in res.STATE_SITES.values())


def test_only_the_state_is_sent_to_tavily(monkeypatch):
    seen = []
    monkeypatch.setattr(res, "_transport", tavily_returning([], seen))
    run(res.resources_with_source("NW", "hi"))
    assert seen[0]["include_domains"] == ["schulministerium.nrw"]
    assert "Nordrhein-Westfalen" in seen[0]["query"]


def test_a_failed_search_falls_back_quietly(monkeypatch):
    monkeypatch.setattr(res, "_transport", httpx.MockTransport(lambda r: httpx.Response(500)))
    found, source = run(res.resources_with_source("BE", "de"))
    assert source == "fallback"
    assert any(r["contact"] == "116 111" for r in found)


def test_a_state_is_searched_once_a_day(monkeypatch):
    seen = []
    monkeypatch.setattr(res, "_transport", tavily_returning([
        {"title": "Staatliche Schulberatung in Bayern", "url": "https://www.schulberatung.bayern.de/"},
    ], seen))
    first, _ = run(res.resources_with_source("BY", "de"))
    second, source = run(res.resources_with_source("by", "de"))
    # Counted by kind, not by request: a search carries "query", an extract
    # carries "urls". The first lookup may also extract from the page it
    # found; what must not happen twice is the LOOKUP.
    searches = [body for body in seen if "query" in body]
    assert len(searches) == 1, f"the state was searched more than once: {searches}"
    assert source == "live" and second == first


def test_a_failed_search_is_not_cached(monkeypatch):
    seen = []
    monkeypatch.setattr(res, "_transport", tavily_returning([], seen))
    run(res.resources_with_source("BE", "de"))
    run(res.resources_with_source("BE", "de"))
    assert len(seen) == 2


def test_resources_keeps_the_contract_signature():
    found = run(res.resources("", "de"))
    assert isinstance(found, list) and found

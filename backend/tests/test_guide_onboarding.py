"""Do the adult's guide and the first-run screens reach the app as written?

`GET /api/guide` serves `content/adult_guide.json` (the trusted adult's
5-minute guide and the escalation ladder) and `GET /api/onboarding` serves
`content/onboarding.json`. Both are Neel's wording, served rather than
re-described, so these tests hold the routes to three things: nothing is
reworded, no note to the team leaks out at any depth, and both load when the
demo has spent its allowance or has no key.

Read-only on `content/`. No model calls: these routes make none.
"""

import json

import pytest
from fastapi.testclient import TestClient

import main
from app.limits import Guard
from engine.config import REPO_ROOT

client = TestClient(main.app, raise_server_exceptions=False)

GUIDE = json.loads((REPO_ROOT / "content" / "adult_guide.json").read_text(encoding="utf-8"))
ONBOARDING = json.loads((REPO_ROOT / "content" / "onboarding.json").read_text(encoding="utf-8"))


def get(path: str) -> dict:
    response = client.get(path)
    assert response.status_code == 200, response.text
    return response.json()


def keys_anywhere(value) -> set[str]:
    if isinstance(value, dict):
        return set(value) | {key for item in value.values() for key in keys_anywhere(item)}
    if isinstance(value, list):
        return {key for item in value for key in keys_anywhere(item)}
    return set()


# --- the guide ---------------------------------------------------------------


# These three pinned the raw file passthrough. /api/guide is a typed,
# language-selected response now (issue #3 step 7), so they pin the same
# INTENT against the new shape: every step survives, every source resolves,
# and the ladder keeps its order. The deeper contract tests live in
# tests/test_guide_contract.py.


def test_every_guide_step_comes_through_unchanged():
    for lang in ("de", "en"):
        served = [step["text"] for step in get(f"/api/guide?lang={lang}")["steps"]]
        assert served == [step[lang] for step in GUIDE["guide"]["steps"]], (
            f"a step was changed or dropped in {lang}; the adult would get a "
            "different guide from the one a person checked"
        )


def test_every_guide_step_names_a_source_the_payload_can_resolve():
    """The handoff card links each step to the page it comes from.

    Resolved server-side now, so the card does not carry the `sources` map.
    """
    served = get("/api/guide?lang=en")["steps"]
    cited = [step for step in GUIDE["guide"]["steps"] if step.get("source")]

    urls = [step["source_url"] for step in served if step["source_url"]]
    assert len(urls) == len(cited), "a step lost its source on the way out"
    for url in urls:
        assert url.startswith("https://")
        assert url in GUIDE["sources"].values()


def test_the_escalation_ladder_comes_through_in_order():
    """Order is the content: a child already at the head of year is never
    sent back to their form teacher.

    `emergency` is dropped on purpose and lib/followups.ts leaves it out of
    LADDER for the same reason - an emergency is not an escalation. 110 is
    what you do INSTEAD of climbing, and it stays one tap away on every
    screen from /api/emergency.
    """
    served = [rung["id"] for rung in get("/api/guide?lang=de")["ladder"]]
    expected = [
        step["id"] for step in GUIDE["escalation_ladder"]["steps"]
        if step["id"] != "emergency"
    ]

    assert served == expected
    assert "emergency" not in served, (
        "110 was offered as the next rung up a ladder rather than as the "
        "thing you do instead of climbing"
    )


# --- onboarding --------------------------------------------------------------


def test_every_onboarding_screen_comes_through_unchanged():
    assert get("/api/onboarding")["screens"] == ONBOARDING["screens"]


def test_onboarding_says_whether_the_hindi_has_been_reviewed():
    expected = bool(ONBOARDING["_review"]["hi"])
    assert get("/api/onboarding")["hindi_reviewed"] is expected


def test_a_signed_review_shows_as_reviewed(monkeypatch, tmp_path):
    signed = tmp_path / "onboarding.json"
    signed.write_text(json.dumps({**ONBOARDING, "_review": {"hi": "neel 2026-10-26"}}), encoding="utf-8")
    monkeypatch.setattr(main, "ONBOARDING", signed)

    assert get("/api/onboarding")["hindi_reviewed"] is True


# --- both --------------------------------------------------------------------


@pytest.mark.parametrize("path", ["/api/guide", "/api/onboarding"])
def test_no_note_to_the_team_leaks_at_any_depth(path):
    """adult_guide.json has a _comment inside escalation_ladder, not only at the top."""
    assert not [key for key in keys_anywhere(get(path)) if key.startswith("_")]


@pytest.mark.parametrize("path", ["/api/guide", "/api/onboarding"])
def test_it_loads_when_the_daily_cap_is_spent(monkeypatch, path):
    spent = Guard(daily_usd=0.01)
    spent.record_spend(1.0)
    monkeypatch.setattr(main, "GUARD", spent)

    assert client.post(
        "/api/translate", json={"text": "They took my bag again.", "source_lang": "en"}
    ).status_code == 503
    assert client.get(path).status_code == 200


@pytest.mark.parametrize("path", ["/api/guide", "/api/onboarding"])
def test_it_loads_with_no_api_keys(monkeypatch, path):
    monkeypatch.delenv("NEBIUS_API_KEY", raising=False)
    monkeypatch.delenv("TAVILY_API_KEY", raising=False)

    assert client.get(path).status_code == 200


@pytest.mark.parametrize("path,name", [("/api/guide", "ADULT_GUIDE"), ("/api/onboarding", "ONBOARDING")])
def test_a_broken_file_is_a_calm_error_not_a_traceback(monkeypatch, path, name):
    monkeypatch.setattr(main, name, REPO_ROOT / "content" / "does_not_exist.json")

    response = client.get(path)

    assert response.status_code >= 400
    assert response.json()["message_child"]
    assert "Traceback" not in response.text

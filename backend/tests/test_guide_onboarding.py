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


def test_every_guide_step_comes_through_unchanged():
    served = get("/api/guide")["guide"]["steps"]
    assert served == GUIDE["guide"]["steps"]


def test_every_guide_step_names_a_source_the_payload_can_resolve():
    """The handoff card links each step to the page it comes from."""
    body = get("/api/guide")
    for step in body["guide"]["steps"]:
        assert body["sources"][step["source"]].startswith("https://")


def test_the_escalation_ladder_comes_through_in_order():
    served = [step["id"] for step in get("/api/guide")["escalation_ladder"]["steps"]]
    assert served == [step["id"] for step in GUIDE["escalation_ladder"]["steps"]]


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

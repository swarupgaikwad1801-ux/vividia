"""Can a child reach 110 when nothing else works?

That is the whole point of this endpoint, so most of these tests are about the
conditions under which it must still answer: no API key, no credit left, no
network to Nebius, no Tavily. It reads one curated file and nothing else.

The other half is that no screen may hold its own copy of an emergency
number. The content-integrity test in #16 enforces that across the repo; this
endpoint is what makes obeying it possible, so these tests check the numbers
it serves really are the ones in content/helplines.json rather than a second
copy that happens to agree today.

Read-only on content/. Offline; no model calls.
"""

import json

import pytest
from fastapi.testclient import TestClient

import main
from app.limits import Guard
from app.schemas import EmergencyResponse, Resource
from engine.config import REPO_ROOT

client = TestClient(main.app, raise_server_exceptions=False)

CURATED = json.loads((REPO_ROOT / "content" / "helplines.json").read_text(encoding="utf-8"))


def get_emergency() -> dict:
    response = client.get("/api/emergency")
    assert response.status_code == 200, response.text
    return response.json()


# --- what it serves --------------------------------------------------------


def test_it_serves_the_emergency_numbers():
    body = EmergencyResponse.model_validate(get_emergency())

    contacts = {resource.contact for resource in body.contacts}
    assert "110" in contacts
    assert "112" in contacts


def test_the_numbers_are_the_ones_in_the_curated_file():
    """Not a second copy that agrees today. If helplines.json changes, this
    endpoint changes with it, which is the entire reason it exists."""
    served = [resource["contact"] for resource in get_emergency()["contacts"]]
    expected = [entry["contact"] for entry in CURATED["emergency"]]

    assert served == expected


def test_every_number_says_where_it_came_from_and_when():
    """A child is never shown an emergency number the app cannot source."""
    for resource in EmergencyResponse.model_validate(get_emergency()).contacts:
        assert resource.source_url.startswith("https://"), resource.name
        assert resource.retrieved_at, resource.name


def test_every_number_declares_the_languages_it_works_in():
    """So the screen can print "German only" rather than hide it, which
    CLAUDE.md requires and lib/help.ts in #29 renders."""
    for resource in EmergencyResponse.model_validate(get_emergency()).contacts:
        assert resource.languages, resource.name


def test_each_contact_matches_the_frozen_resource_model():
    for resource in get_emergency()["contacts"]:
        Resource.model_validate(resource)


def test_the_list_is_never_empty():
    """An empty emergency screen is worse than an error, so the model itself
    refuses one."""
    body = EmergencyResponse.model_validate(get_emergency())
    assert len(body.contacts) >= 1


# --- the conditions it exists for ------------------------------------------


def test_it_answers_when_the_daily_cap_is_spent(monkeypatch):
    """The most important test here. A child in danger on a day the demo has
    spent its allowance still needs 110."""
    spent = Guard(daily_usd=0.01)
    spent.record_spend(1.0)
    monkeypatch.setattr(main, "GUARD", spent)

    assert client.post(
        "/api/translate", json={"text": "They took my bag again.", "source_lang": "en"}
    ).status_code == 503, "translation should be off, or this proves nothing"

    assert client.get("/api/emergency").status_code == 200


def test_it_answers_with_no_api_key(monkeypatch):
    monkeypatch.delenv("NEBIUS_API_KEY", raising=False)
    monkeypatch.delenv("TAVILY_API_KEY", raising=False)

    assert client.get("/api/emergency").status_code == 200


def test_it_is_not_rate_limited_per_client(monkeypatch):
    """A child pressing the help button repeatedly must not be throttled out
    of the emergency numbers."""
    tight = Guard(daily_usd=10.0, per_ip_requests=2, per_ip_window_s=3600.0)
    monkeypatch.setattr(main, "GUARD", tight)

    for _ in range(6):
        assert client.get("/api/emergency").status_code == 200


def test_it_makes_no_model_calls(monkeypatch):
    """Replacing the engine with something that explodes proves the route
    never touches it."""

    async def explode(*args, **kwargs):  # noqa: ARG001
        raise AssertionError("the emergency route reached the engine")

    monkeypatch.setattr(main.ENGINE, "translate", explode)
    monkeypatch.setattr(main.ENGINE, "safety_check", explode)

    assert client.get("/api/emergency").status_code == 200


def test_the_mock_engine_serves_the_real_numbers():
    """A mock showing a made-up emergency number is worse than one showing
    none, so this route does not go through the mock/live switch at all."""
    assert main.ENGINE.__name__.endswith("mock"), "default test engine changed"

    contacts = {r["contact"] for r in get_emergency()["contacts"]}
    assert {"110", "112"} <= contacts


# --- failure ---------------------------------------------------------------


def test_a_broken_content_file_is_a_calm_sentence_not_a_traceback(monkeypatch):
    def explode() -> list:
        raise OSError("content file unreadable")

    monkeypatch.setattr(main, "emergency_numbers", explode)

    response = client.get("/api/emergency")

    assert response.status_code >= 400
    assert response.json()["message_child"], "no calm sentence for the reader"
    assert "Traceback" not in response.text


def test_nothing_a_child_wrote_could_reach_this_route():
    """It takes no input at all, which is the simplest way to guarantee it."""
    assert client.post("/api/emergency").status_code in (404, 405)

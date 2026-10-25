"""Can a judge press one button and see the whole journey?

A judge in the Nebius Discord asked for exactly this: make it easy to try,
don't make them paste an API key, give them something prefilled to press send
on. `GET /api/demo` is what the "Try the demo story" button calls.

The tests that matter most here are the two that are not about the happy path:
the story must still load on a day the demo has spent its daily allowance, and
the timeline must be valid against the frozen `Entry` model, because
`demo_story.json` claims it is and a judge is the wrong person to discover
otherwise.

Read-only on `content/`. No model calls: this route makes none, which is why
it needs no key.
"""

import json

import pytest
from fastapi.testclient import TestClient

import main
from app.limits import Guard
from app.schemas import Entry
from engine.config import REPO_ROOT

client = TestClient(main.app, raise_server_exceptions=False)

DEMO_FILE = REPO_ROOT / "content" / "demo_story.json"
ON_DISK = json.loads(DEMO_FILE.read_text(encoding="utf-8"))


def get_demo():
    response = client.get("/api/demo")
    assert response.status_code == 200, response.text
    return response.json()


# --- it serves the story -----------------------------------------------------


def test_the_demo_story_is_served():
    body = get_demo()

    assert body["persona"]["name"] == ON_DISK["persona"]["name"]
    assert len(body["timeline"]) == len(ON_DISK["timeline"])
    assert body["live_message"]["text"] == ON_DISK["live_message"]["text"]


def test_the_timeline_is_valid_against_the_frozen_entry_model():
    """demo_story.json says it "uses the exact Entry shape so the app can load
    them as an already-approved timeline". That claim is checked here rather
    than in a screen in front of a judge."""
    for entry in get_demo()["timeline"]:
        model = Entry.model_validate(entry)
        assert model.text_child and model.text_de
        assert model.date and model.mood


def test_the_approved_german_comes_through_unchanged():
    """The demo timeline is already approved, so this route must not reword it."""
    served = {entry["text_de"] for entry in get_demo()["timeline"]}
    assert served == {entry["text_de"] for entry in ON_DISK["timeline"]}


def test_the_live_message_is_the_one_with_two_readings():
    """The clarification question is the moment the demo exists to show, so
    the prefilled sentence has to be the ambiguous one."""
    body = get_demo()
    assert body["live_message"]["text"] == "He said he would get me after school."


def test_the_persona_carries_the_line_that_says_it_is_made_up():
    """No real child is shown, and the UI has to say so on screen. The text it
    shows comes from here, so it must be in the payload."""
    label = get_demo()["persona"]["label_on_screen"]
    assert label.strip()
    assert "made-up" in label or "made up" in label


def test_notes_to_the_team_are_not_part_of_the_payload():
    """The top-level _comment is instructions for us, not for the client."""
    body = get_demo()
    assert not [key for key in body if key.startswith("_")]


def test_the_child_language_is_stated_so_the_app_knows_what_to_send():
    body = get_demo()
    assert body["persona"]["child_lang"] == ON_DISK["persona"]["child_lang"]


# --- the two that matter -----------------------------------------------------


def test_the_story_still_loads_when_the_daily_cap_is_spent(monkeypatch):
    """A judge arriving after the allowance is gone should still see the whole
    journey, exactly as the helplines stay reachable. This route makes no model
    calls, so metering it would cost nothing and block everything."""
    spent = Guard(daily_usd=0.01)
    spent.record_spend(1.0)
    monkeypatch.setattr(main, "GUARD", spent)

    # translation is off...
    assert client.post(
        "/api/translate", json={"text": "They took my bag again.", "source_lang": "en"}
    ).status_code == 503
    # ...and the demo story still loads
    assert client.get("/api/demo").status_code == 200


def test_the_story_loads_with_no_api_key(monkeypatch):
    """Judges must not have to paste a key, which means this path cannot touch
    Token Factory at all."""
    monkeypatch.delenv("NEBIUS_API_KEY", raising=False)
    monkeypatch.delenv("TAVILY_API_KEY", raising=False)

    assert client.get("/api/demo").status_code == 200


def test_a_broken_demo_file_is_a_calm_error_not_a_traceback(monkeypatch):
    """If someone edits demo_story.json badly, a judge sees one sentence
    rather than a stack trace."""
    missing = REPO_ROOT / "content" / "does_not_exist.json"
    monkeypatch.setattr(main, "DEMO_STORY", missing)

    response = client.get("/api/demo")

    assert response.status_code >= 400
    body = response.json()
    assert body["message_child"], "no calm sentence for the reader"
    assert "Traceback" not in response.text


def test_an_invalid_timeline_is_refused_rather_than_served(monkeypatch, tmp_path):
    """A timeline that does not match Entry would break the screens, so it
    fails here instead."""
    broken = tmp_path / "broken.json"
    broken.write_text(
        json.dumps({"persona": {}, "timeline": [{"date": "2026-10-06"}], "live_message": {}}),
        encoding="utf-8",
    )
    monkeypatch.setattr(main, "DEMO_STORY", broken)

    assert client.get("/api/demo").status_code >= 400


# --- the handoff section -----------------------------------------------------


def test_the_handoff_section_is_included():
    """Step 4 of the journey needs it, and it carries the rule that family is
    only offered when the harm is not at home."""
    handoff = get_demo().get("handoff")
    assert handoff, "the handoff card would have nothing to show"
    assert handoff["where_it_happens"]
    assert handoff["suggested_adults_en"]


@pytest.mark.parametrize("section", ["persona", "timeline", "live_message", "handoff"])
def test_every_section_the_frontend_needs_is_present(section):
    assert section in get_demo()

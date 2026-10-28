"""The contract test: every endpoint answers in the shape all three of us agreed.

This is the test that stops one person's change from silently breaking another
person's screens. It makes no network calls, so it is safe to run in CI.

    backend/.venv/Scripts/python -m pytest -q
"""

import pytest
from fastapi.testclient import TestClient

import main
from app.schemas import (
    HealthResponse,
    ReportResponse,
    ResourcesResponse,
    TranslateResponse,
)

client = TestClient(main.app)

# content/demo_story.json's `live_message`, and the sentence the reviewed word
# list still has two honest readings for ("get me": a threat, or a lift home).
# It is used here so the ambiguity and clarify tests below have something to
# check in mock mode as well as in live. With a sentence that carries no
# ambiguity they pass by iterating over an empty list, which is the kind of
# green that hides a broken screen.
DISCLOSURE = "He said he would get me after school."


def test_health_reports_which_engine_is_wired_up():
    response = client.get("/api/health")
    assert response.status_code == 200
    body = HealthResponse.model_validate(response.json())
    assert body.engine in ("mock", "live")
    if body.engine == "live":
        # In live mode health must name the models and say, per function,
        # whether it is real yet, so nobody demos a mock believing it is real.
        assert "fanout" in body.models and "judge" in body.models
        assert body.models["translate"] in ("live", "mock")


def test_translate_returns_the_agreed_shape():
    response = client.post("/api/translate", json={"text": DISCLOSURE, "source_lang": "en"})
    assert response.status_code == 200
    body = TranslateResponse.model_validate(response.json())
    assert body.translation
    assert 0.0 <= body.confidence <= 1.0
    # The true count, which depends on the engine. ">= 1" here was asserting
    # the old mock's claim to have made eleven calls it never made; the mock
    # now reports 0, because 0 is what it did.
    engine = HealthResponse.model_validate(client.get("/api/health").json()).engine
    if engine == "live":
        assert body.usage.calls_made >= 1
    else:
        assert body.usage.calls_made == 0


def test_translate_always_reports_a_safety_result():
    """Safety is part of the translate response so a caller cannot skip it."""
    body = TranslateResponse.model_validate(
        client.post("/api/translate", json={"text": DISCLOSURE, "source_lang": "en"}).json()
    )
    assert body.safety.category in ("none", "danger", "self_harm", "sexual")
    if not body.safety.urgent:
        assert body.safety.message_child == ""


def test_every_ambiguity_can_be_answered_by_a_child():
    """An ambiguity the UI cannot render is worse than no ambiguity at all."""
    body = TranslateResponse.model_validate(
        client.post("/api/translate", json={"text": DISCLOSURE, "source_lang": "en"}).json()
    )
    for ambiguity in body.ambiguities:
        assert ambiguity.question.strip(), "a question with no text cannot be shown"
        assert len(ambiguity.options) >= 2, "a choice needs at least two options"
        ids = [option.id for option in ambiguity.options]
        assert len(ids) == len(set(ids)), "option ids must be distinct to be selectable"
        assert all(option.label.strip() for option in ambiguity.options)


def test_clarify_accepts_the_childs_choice_and_resolves_it():
    first = TranslateResponse.model_validate(
        client.post("/api/translate", json={"text": DISCLOSURE, "source_lang": "en"}).json()
    )
    if not first.ambiguities:
        pytest.skip("engine returned no ambiguity for this text")

    # The client sends back the ambiguities it was shown, unchanged. An option
    # id alone is meaningless to the server: the id -> meaning_de mapping only
    # exists in the response being held here.
    ambiguity = first.ambiguities[0]
    response = client.post(
        "/api/clarify",
        json={
            "text": DISCLOSURE,
            "source_lang": "en",
            "choices": {ambiguity.phrase: ambiguity.options[0].id},
            "ambiguities": [a.model_dump() for a in first.ambiguities],
        },
    )
    assert response.status_code == 200
    second = TranslateResponse.model_validate(response.json())
    assert second.translation
    assert second.confidence >= first.confidence, "answering a question should not lower confidence"


def test_report_returns_both_languages():
    response = client.post(
        "/api/report",
        json={
            "entries": [
                {"date": "2026-10-21", "mood": "sad", "text_child": "x", "text_de": "y", "place": "schoolyard"}
            ],
            "child_lang": "ar",
        },
    )
    assert response.status_code == 200
    body = ReportResponse.model_validate(response.json())
    assert body.child_version and body.german_version


def test_resources_say_whether_they_are_live_or_fallback():
    """The UI shows the source and date, so the child is never shown an unsourced number."""
    response = client.get("/api/resources", params={"lang": "ar"})
    assert response.status_code == 200
    body = ResourcesResponse.model_validate(response.json())
    assert body.source in ("live", "fallback")
    for resource in body.resources:
        assert resource.source_url, "every resource must carry where it came from"


@pytest.mark.parametrize("payload", [
    {"source_lang": "en"},                       # no text
    {"text": "", "source_lang": "en"},           # empty text
    {"text": "hi"},                              # no language
    {"text": "x" * 2001, "source_lang": "en"},   # over the length cap
])
def test_bad_input_is_rejected_before_any_model_call(payload):
    assert client.post("/api/translate", json=payload).status_code == 422

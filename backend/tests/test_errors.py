"""A child must never meet a stack trace.

Two things are checked here, and the second is the one that would be easy to
lose later: that the copy exists for every failure in every language we ship,
and that the developer's half of the message never bleeds into the child's half.

Offline; no model calls.
"""

import json
import logging

import pytest
import recorded
from fastapi.testclient import TestClient

import main
from app.schemas import ErrorCode, ErrorResponse
from engine.client import EngineError
from engine.errors import (
    LANGS,
    MESSAGES,
    RETRYABLE,
    message_for,
    safe_traceback,
    status_for,
    to_error_response,
)
from engine.translate import BASELINE, translate

# raise_server_exceptions=False so the app's own handler answers an unexpected
# bug, the way it would in production. The default re-raises it into the test.
client = TestClient(main.app, raise_server_exceptions=False)


# --- the copy exists, for every code and every language ----------------------


def test_every_error_code_in_the_contract_has_copy():
    """Ties the copy to the frozen contract: adding an ErrorCode to schemas.py
    without copy for it would leave a child with a blank screen."""
    for code in ErrorCode:
        assert code.value in MESSAGES, f"no child-facing copy for {code.value}"


@pytest.mark.parametrize("code", [c.value for c in ErrorCode])
@pytest.mark.parametrize("lang", LANGS)
def test_copy_exists_in_every_shipped_language(code, lang):
    message = MESSAGES[code].get(lang, "")
    assert message.strip(), f"{code} has no {lang} text"


@pytest.mark.parametrize("code", [c.value for c in ErrorCode])
def test_a_language_we_have_no_copy_for_still_gets_a_sentence(code):
    """A child writing Ukrainian today would otherwise get an empty screen."""
    assert message_for(code, "uk") == MESSAGES[code]["en"]


def test_an_unknown_code_does_not_produce_an_empty_message():
    assert message_for("something_new", "en") == MESSAGES["internal"]["en"]


# --- nothing technical reaches the child -------------------------------------

# Words that mean the developer's message leaked into the child's.
FORBIDDEN = [
    "token", "model", "http", "api", "nebius", "nemotron", "json",
    "traceback", "exception", "error", "null", "none", "500", "503", "429", "402",
]


@pytest.mark.parametrize("code", [c.value for c in ErrorCode])
@pytest.mark.parametrize("lang", LANGS)
def test_the_childs_message_says_nothing_technical(code, lang):
    message = MESSAGES[code][lang].lower()
    for word in FORBIDDEN:
        assert word not in message, f"{code}/{lang} says {word!r} to a child"


@pytest.mark.parametrize("lang", LANGS)
def test_the_childs_message_never_promises_safety(lang):
    """CLAUDE.md: never "this keeps you safe", and never imply quick exit
    erases anything. Copy is reviewed as text, so this is worth pinning."""
    for code in MESSAGES:
        message = MESSAGES[code][lang].lower()
        assert "safe" not in message
        assert "sicher" not in message
        assert "history" not in message
        assert "verlauf" not in message


def test_the_developer_message_keeps_the_detail_the_logs_need():
    error = EngineError("rate_limited", "Token Factory rate limit", True)
    body = to_error_response(error, "en")

    assert "rate_limited" in body["message"]
    assert "Token Factory" in body["message"]
    assert "Token Factory" not in body["message_child"]


# --- mapping -----------------------------------------------------------------


@pytest.mark.parametrize("code", [c.value for c in ErrorCode])
def test_an_engine_error_keeps_its_own_code_and_retry_advice(code):
    error = EngineError(code, "something upstream", RETRYABLE[code])
    body = to_error_response(error, "en")

    assert body["code"] == code
    assert body["retryable"] is RETRYABLE[code]
    ErrorResponse.model_validate(body)


def test_a_bug_of_ours_becomes_internal_and_is_not_offered_as_retryable():
    body = to_error_response(KeyError("ambiguities"), "en")

    assert body["code"] == "internal"
    assert body["retryable"] is False
    assert "KeyError" in body["message"], "the logs still need to know"
    assert "KeyError" not in body["message_child"]


def test_a_timeout_is_recognised_even_when_it_is_not_an_engine_error():
    """asyncio raises the builtin TimeoutError, which carries no code of ours."""
    body = to_error_response(TimeoutError("took too long"), "en")

    assert body["code"] == "upstream_timeout"
    assert body["retryable"] is True


def test_an_unknown_engine_code_degrades_to_internal():
    body = to_error_response(EngineError("teapot", "?", False), "en")
    assert body["code"] == "internal"


@pytest.mark.parametrize(
    "code,status",
    [
        ("upstream_timeout", 504),
        ("upstream_unavailable", 503),
        ("rate_limited", 429),
        ("credit_exhausted", 503),
        ("invalid_input", 422),
        ("internal", 500),
    ],
)
def test_each_failure_answers_with_the_right_status(code, status):
    assert status_for(EngineError(code, "x", RETRYABLE[code])) == status


def test_every_body_validates_against_the_frozen_contract():
    for code in ErrorCode:
        for lang in LANGS:
            body = to_error_response(EngineError(code.value, "x", True), lang)
            model = ErrorResponse.model_validate(body)
            assert model.message_child
            assert json.loads(model.model_dump_json())["code"] == code.value


# --- end to end: a real engine failure becomes a calm sentence ---------------


async def test_an_unreachable_model_becomes_one_calm_retryable_sentence(monkeypatch):
    transcript = recorded.load("translate_model_down")
    recorded.install(monkeypatch, transcript, rpm=100_000)

    with pytest.raises(EngineError) as raised:
        await translate(transcript.data["text"], "en", strategy=BASELINE)

    body = to_error_response(raised.value, "en")
    assert body["code"] == "upstream_unavailable"
    assert body["retryable"] is True
    assert body["message_child"] == MESSAGES["upstream_unavailable"]["en"]
    assert transcript.count("translate") == 3, "all three attempts were used"


async def test_running_out_of_credit_is_final_and_points_at_people(monkeypatch):
    """A retry button would be a lie here, and the child still needs somewhere
    to go, so this message names krisenchat and 116 111."""
    transcript = recorded.load("translate_out_of_credit")
    recorded.install(monkeypatch, transcript, rpm=100_000)

    with pytest.raises(EngineError) as raised:
        await translate(transcript.data["text"], "hi", strategy=BASELINE)

    body = to_error_response(raised.value, "hi")
    assert body["code"] == "credit_exhausted"
    assert body["retryable"] is False
    assert "krisenchat.de" in body["message_child"]
    assert "116 111" in body["message_child"]
    assert transcript.count("translate") == 1, "a 402 must not be retried"


# --- over the wire: what the browser actually receives -----------------------

CHILD_TEXT = "They took my bag again and everyone laughed at me."


def _failing(error):
    async def _call(*args, **kwargs):  # noqa: ARG001 - stands in for the engine
        raise error

    return _call


def test_a_rejected_request_answers_with_an_error_response_not_a_field_list():
    """FastAPI's own 422 body is a list of field errors with nothing a child
    could read. The contract says every non-2xx body IS an ErrorResponse."""
    response = client.post("/api/translate", json={"source_lang": "hi"})

    assert response.status_code == 422
    body = ErrorResponse.model_validate(response.json())
    assert body.code == ErrorCode.INVALID_INPUT
    assert body.retryable is False
    # Read from the body that failed validation, so the child gets their own
    # language even though the request never reached a route.
    assert body.message_child == MESSAGES["invalid_input"]["hi"]


def test_a_rejected_request_with_no_language_still_gets_a_sentence():
    body = ErrorResponse.model_validate(client.post("/api/translate", json={}).json())
    assert body.message_child == MESSAGES["invalid_input"]["en"]


@pytest.mark.parametrize(
    "error,status,retryable",
    [
        (EngineError("rate_limited", "Token Factory rate limit", True), 429, True),
        (EngineError("upstream_timeout", "Token Factory timed out", True), 504, True),
        (EngineError("credit_exhausted", "Nebius credit exhausted", False), 503, False),
    ],
)
def test_an_engine_failure_reaches_the_browser_with_its_own_code(
    monkeypatch, error, status, retryable
):
    """Before this, main.py mapped every failure to internal/500, so the client
    could not tell a rate limit from an exhausted account."""
    monkeypatch.setattr(main.ENGINE, "translate", _failing(error))

    response = client.post(
        "/api/translate", json={"text": CHILD_TEXT, "source_lang": "hi"}
    )

    assert response.status_code == status
    body = ErrorResponse.model_validate(response.json())
    assert body.code.value == error.code
    assert body.retryable is retryable
    assert body.message_child == MESSAGES[error.code]["hi"]


def test_an_unexpected_bug_is_still_one_calm_sentence(monkeypatch):
    monkeypatch.setattr(main.ENGINE, "translate", _failing(KeyError("ambiguities")))

    response = client.post(
        "/api/translate", json={"text": CHILD_TEXT, "source_lang": "en"}
    )

    assert response.status_code == 500
    body = ErrorResponse.model_validate(response.json())
    assert body.code == ErrorCode.INTERNAL
    assert body.message_child == MESSAGES["internal"]["en"]


@pytest.mark.parametrize(
    "path,payload",
    [
        ("/api/translate", {"text": CHILD_TEXT, "source_lang": "hi"}),
        ("/api/clarify", {"text": CHILD_TEXT, "source_lang": "hi", "choices": {"a": "b"}}),
    ],
)
def test_no_error_body_ever_repeats_what_the_child_wrote(monkeypatch, path, payload):
    """A disclosure must not come back in an error body, where it could be
    logged by a proxy or shown in a browser console."""
    monkeypatch.setattr(main.ENGINE, "translate", _failing(RuntimeError(CHILD_TEXT)))

    response = client.post(path, json=payload)

    assert response.status_code >= 400
    assert CHILD_TEXT not in response.text
    assert "my bag" not in response.text.lower()


def test_a_failure_body_carries_no_traceback_or_model_name(monkeypatch):
    monkeypatch.setattr(
        main.ENGINE,
        "translate",
        _failing(EngineError("internal", "nvidia/Nemotron-3.5-Super-VL returned 500", False)),
    )

    response = client.post(
        "/api/translate", json={"text": CHILD_TEXT, "source_lang": "en"}
    )
    body = ErrorResponse.model_validate(response.json())

    # The developer half keeps the detail the logs need...
    assert "Nemotron" in body.message
    # ...and the child's half carries none of it.
    assert "Nemotron" not in body.message_child
    assert "Traceback" not in response.text


# --- "the backend logs no message content", enforced ------------------------


def test_the_frames_are_kept_and_the_exception_text_is_not():
    """safe_traceback must give us the file and line, and drop the message."""
    try:
        raise RuntimeError(CHILD_TEXT)
    except RuntimeError as error:
        frames = safe_traceback(error)

    assert "test_errors.py" in frames, "we still need to know where it broke"
    # The frames quote our own source, so the word "RuntimeError" appears as
    # code. What must not appear is the exception's message line, which is where
    # a value the exception was given would show up.
    assert CHILD_TEXT not in frames
    assert f"RuntimeError: {CHILD_TEXT}" not in frames


def test_nothing_the_child_wrote_reaches_the_log(monkeypatch, caplog):
    """The README and CLAUDE.md both publish that the backend logs no message
    content. This is that claim as a test rather than as an intention."""
    monkeypatch.setattr(main.ENGINE, "translate", _failing(RuntimeError(CHILD_TEXT)))

    with caplog.at_level(logging.DEBUG, logger="vividia"):
        client.post("/api/translate", json={"text": CHILD_TEXT, "source_lang": "en"})

    logged = "\n".join(record.getMessage() for record in caplog.records)
    assert logged, "the failure should still be logged somehow"
    assert CHILD_TEXT not in logged
    for word in ("bag", "laughed", "took my"):
        assert word not in logged.lower(), f"the log quotes the child: {word!r}"


def test_a_successful_request_logs_no_text_either(caplog):
    with caplog.at_level(logging.DEBUG, logger="vividia"):
        response = client.post(
            "/api/translate", json={"text": CHILD_TEXT, "source_lang": "en"}
        )

    assert response.status_code == 200
    logged = "\n".join(record.getMessage() for record in caplog.records)
    assert CHILD_TEXT not in logged
    assert "laughed" not in logged.lower()
    # The shape of a request is fine to log, and useful: it is what tells us a
    # sentence escalated without recording the sentence.
    assert "chars=" in logged

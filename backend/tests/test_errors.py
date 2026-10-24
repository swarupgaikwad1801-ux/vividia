"""A child must never meet a stack trace.

Two things are checked here, and the second is the one that would be easy to
lose later: that the copy exists for every failure in every language we ship,
and that the developer's half of the message never bleeds into the child's half.

Offline; no model calls.
"""

import json

import pytest
import recorded

from app.schemas import ErrorCode, ErrorResponse
from engine.client import EngineError
from engine.errors import LANGS, MESSAGES, RETRYABLE, message_for, status_for, to_error_response
from engine.translate import BASELINE, translate


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

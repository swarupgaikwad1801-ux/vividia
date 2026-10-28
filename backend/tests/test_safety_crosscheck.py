"""The live safety check is two checks: the model, and the fixed rules.

safety.py asks the model what the child means, then cross-checks the text
against engine/safety_rules.py. Either can raise the prompt; the rules never
lower a model that fired; and the rules are held to the same MUST_NOT_FIRE
list as the model, so the cross-check adds no false alarm the suite would
not catch. No live call: the model's answer is faked here.
"""

import json

import pytest

import engine.safety as safety
from tests.test_safety import MUST_NOT_FIRE


def model_says(monkeypatch, category):
    async def fake_call(*args, **kwargs):
        if category == "raise":
            raise RuntimeError("model down")
        return json.dumps({"category": category})

    monkeypatch.setattr(safety, "call", fake_call)


@pytest.mark.parametrize(
    "text,expected",
    [
        ("he said he would kill me after school", "danger"),
        ("He said he will bring a knife tomorrow and wait for me.", "danger"),
        ("I want to die", "self_harm"),
    ],
)
@pytest.mark.parametrize("model", ["none", "raise"])
@pytest.mark.asyncio
async def test_the_rules_catch_what_the_model_missed_or_could_not_read(monkeypatch, text, expected, model):
    model_says(monkeypatch, model)
    result = await safety.safety_check(text, "en")
    assert result["category"] == expected
    assert result["urgent"] is True
    assert result["message_child"], "the words come from content/, never empty when urgent"


@pytest.mark.asyncio
async def test_the_rules_never_lower_a_model_that_fired(monkeypatch):
    model_says(monkeypatch, "danger")
    result = await safety.safety_check("They are outside the toilet right now.", "en")
    assert result["category"] == "danger"


@pytest.mark.parametrize("text,lang", MUST_NOT_FIRE)
@pytest.mark.asyncio
async def test_the_cross_check_adds_no_false_alarm(monkeypatch, text, lang):
    model_says(monkeypatch, "none")
    result = await safety.safety_check(text, lang)
    assert result["category"] == "none", f"false alarm on: {text}"

"""POST /api/listen: one word about what the child said, and the safety check.

The listening screen answers every message before it offers a card. What it
says comes from fixed sentences in strings.ts; this route only says which
KIND of thing the child told us. These pin the parts that keep that honest:
the kind is always one of a closed list, the child's text never comes back,
and a crisis is caught on every message, not only on the card.

Mock engine, offline, no credits.
"""

import inspect

import pytest
from fastapi.testclient import TestClient

import main
from app.schemas import ListenKind
from engine import listen as live_listen
from engine import mock

client = TestClient(main.app)


@pytest.fixture(autouse=True)
def no_waiting(monkeypatch):
    monkeypatch.setattr(mock, "PRETEND_LATENCY", 0)


def heard(text: str, lang: str = "en") -> dict:
    response = client.post("/api/listen", json={"text": text, "lang": lang})
    assert response.status_code == 200, response.text
    return response.json()


@pytest.mark.parametrize(
    ("text", "lang", "kind"),
    [
        ("He pushed me on the stairs.", "en", "hurt"),
        ("They call me names because of my accent.", "en", "names"),
        ("Nobody wants to sit with me at lunch.", "en", "left_out"),
        ("They took my bag again.", "en", "taken"),
        ("Someone posted a photo of me in the class group.", "en", "online"),
        ("He said he would get me after school.", "en", "threat"),
        ("I feel so sad today.", "en", "feeling"),
        ("pause me woh log mera tiffin chheen lete hai", "hi", "taken"),
        ("usne kaha agar kisi ko bataya to dekh lena", "hi", "threat"),
        ("Heute war es wieder schlimm.", "de", "other"),
        # Good news gets good news back, and "nobody bothered me" is good
        # news, not being left out.
        ("Today was a good day, nobody bothered me.", "en", "good"),
        ("What should I do?", "en", "asking"),
    ],
)
def test_the_mock_names_the_kind(text, lang, kind):
    assert heard(text, lang)["kind"] == kind


def test_a_threat_sent_online_is_still_a_threat():
    # The kind picks the sentence; for a threat it is the one that says an
    # adult should know soon. Losing that to "online" would lose the urgency.
    assert heard("In the group chat he said he would get me after school.")["kind"] == "threat"


def test_the_kind_is_always_from_the_closed_list():
    kinds = {kind.value for kind in ListenKind}
    assert kinds == set(live_listen.KINDS)
    for text in ["", "?", "asdf", "मुझे नहीं पता"]:
        if text:
            assert heard(text)["kind"] in kinds


def test_the_childs_words_never_come_back():
    secret = "Meera from 7b took my phone"
    body = heard(secret)
    assert "Meera" not in str(body) and "7b" not in str(body)


def test_a_crisis_in_the_middle_of_talking_is_caught():
    body = heard("I don't want to live anymore")
    assert body["safety"]["urgent"] is True
    assert body["safety"]["category"] == "self_harm"
    assert body["safety"]["message_child"]


def test_the_mock_makes_no_model_calls():
    assert heard("They took my bag.")["usage"]["calls_made"] == 0


def test_a_message_too_long_for_the_card_is_refused():
    response = client.post("/api/listen", json={"text": "x" * 2001, "lang": "en"})
    assert response.status_code in (400, 422)


def test_the_model_only_classifies():
    # The prompt must ask for one word from the list and forbid a reply, and
    # the schema must not leave room for any free text to reach the child.
    assert "You do not\nreply to the child" in live_listen.LISTEN_SYSTEM
    schema = live_listen.LISTEN_SCHEMA["json_schema"]["schema"]
    assert list(schema["properties"]) == ["kind"]
    assert schema["properties"]["kind"]["enum"] == list(live_listen.KINDS)


def test_a_failed_model_call_falls_back_to_other(monkeypatch):
    async def broken(*args, **kwargs):
        raise RuntimeError("no credit")

    monkeypatch.setattr(live_listen, "call", broken)
    import asyncio

    result = asyncio.run(live_listen.listen("anything", "en"))
    assert result["kind"] == "other"


def test_live_and_mock_have_the_same_signature():
    from engine import live

    assert inspect.signature(live.listen) == inspect.signature(mock.listen)


# --- The written reply for "other" messages: two gates, then the child ------

import asyncio
import json


def fake_model(answers: list[str]):
    """A stand-in for engine.client.call that answers in order, and counts."""
    calls = []

    async def call(role, system, user, usage, **kwargs):
        calls.append(role)
        return answers[len(calls) - 1]

    return call, calls


GOOD = json.dumps({"reply": "We can hear how heavy this feels for you right now."})


def written(monkeypatch, answers, text="I don't know what to say", lang="en"):
    call, calls = fake_model(answers)
    monkeypatch.setattr(live_listen, "call", call)
    return asyncio.run(live_listen.reply(text, lang))["reply"], calls


def test_a_reply_that_passes_both_checks_reaches_the_child(monkeypatch):
    reply, calls = written(monkeypatch, [GOOD, json.dumps({"ok": True})])
    assert reply == "We can hear how heavy this feels for you right now."
    assert calls == ["fanout", "judge"]


def test_the_second_check_can_stop_it(monkeypatch):
    reply, _ = written(monkeypatch, [GOOD, json.dumps({"ok": False})])
    assert reply is None


@pytest.mark.parametrize(
    ("bad", "lang"),
    [
        ("I understand how you feel.", "en"),
        ("We promise it will stop soon.", "en"),
        ("You should tell a teacher.", "en"),
        ("That sounds hard. Want to talk more?", "en"),
        ("Call 116 111 now.", "en"),
        ("Ich verstehe dich.", "de"),
        ("Tum akele nahi ho, main yahan hoon.", "hi"),
        ("हम समझते हैं।", "hi"),
        ("We hear you. " * 20, "en"),
    ],
)
def test_the_code_check_stops_a_bad_reply_before_the_second_model_sees_it(monkeypatch, bad, lang):
    reply, calls = written(monkeypatch, [json.dumps({"reply": bad}), json.dumps({"ok": True})], lang=lang)
    assert reply is None
    assert calls == ["fanout"], "a reply that fails the code rules must not cost a second call"


def test_any_error_falls_back_to_the_reviewed_sentence(monkeypatch):
    reply, _ = written(monkeypatch, ["not json"])
    assert reply is None


def test_the_route_asks_for_a_reply_only_for_other_and_never_when_urgent(monkeypatch):
    asked = []

    async def spy(text, lang):
        asked.append(text)
        return {"reply": "We hear you.", "calls_made": 0}

    monkeypatch.setattr(mock, "reply", spy)
    assert heard("Heute war es wieder schlimm.", "de")["reply"] == "We hear you."
    assert heard("They took my bag again.")["reply"] is None
    # "other" AND urgent: the case the rule exists for. Fixed words only.
    crisis = heard("Sometimes I want to die.")
    assert crisis["kind"] == "other" and crisis["safety"]["urgent"] is True
    assert crisis["reply"] is None
    assert asked == ["Heute war es wieder schlimm."]


def test_the_mock_never_writes(monkeypatch):
    assert heard("Heute war es wieder schlimm.", "de")["reply"] is None

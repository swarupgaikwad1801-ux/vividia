"""Short messages whose meaning is plain: "thanks", "bye", "ok", "not now".

Swarup, 28 Oct: "even if we put random messages it still says, thank you for
your message". These are answered by code, before any model call, so they
cost nothing and cannot be misread. Anything longer or mixed ("ok but they
hit me") must still reach the model.
"""

import asyncio
import json

import pytest
from fastapi.testclient import TestClient

import main
from engine import listen as live_listen
from engine import mock
from engine.config import REPO_ROOT

client = TestClient(main.app)

PLAIN = {
    "thanks": ["thanks", "Thank you so much!", "thx", "ok thanks", "danke", "Vielen Dank", "shukriya"],
    "bye": ["bye", "byeee", "ok bye", "thanks bye", "good night", "tschüss", "bis morgen", "alvida"],
    "unsure": ["ok", "Okkk", "no", "nooo", "yes", "hmm", "idk", "I don't know", "nothing", "???", "...",
               "haan", "nahi", "pata nahi", "nein", "weiß nicht", "keine ahnung"],
    "not_now": ["I don't want to talk about it", "i dont wanna tell", "not now", "later",
                "abhi nahi", "mujhe nahi batana", "ich will nicht darüber reden", "nicht jetzt"],
    "about_app": ["who are you?", "are you a robot?", "Are you real", "who am i talking to",
                  "tum kaun ho", "aap kon ho", "wer bist du", "bist du ein Roboter?"],
}


@pytest.mark.parametrize("kind,text", [(kind, text) for kind, texts in PLAIN.items() for text in texts])
def test_plain_short_messages_are_read_by_code(kind, text):
    assert live_listen.quick_kind(text) == kind


@pytest.mark.parametrize(
    "text",
    ["ok but they hit me", "no they took my bag", "thanks, they stopped", "bye forever",
     "goodbye everyone", "I want to die", "nobody sits with me", "hi", "😢", "they called me names",
     "I don't want to go to school", "is this", "later he hit me", "usne mujhe maara"],
)
def test_anything_more_goes_to_the_model(text):
    assert live_listen.quick_kind(text) is None


def test_no_sentence_in_the_test_sets_is_read_by_code():
    for name in ("en_core", "hi_core", "en_starter", "hi_starter"):
        data = json.loads((REPO_ROOT / "eval" / "testset" / f"{name}.json").read_text(encoding="utf-8"))
        for case in data["cases"]:
            text = case.get("text") or case.get("source") or ""
            assert live_listen.quick_kind(text) is None, f"{name}: {text}"


def test_plain_messages_cost_no_model_call(monkeypatch):
    async def must_not_call(*args, **kwargs):
        raise AssertionError("the model was called for 'thanks'")

    monkeypatch.setattr(live_listen, "call", must_not_call)
    result = asyncio.run(live_listen.listen("thanks", "en", "where"))
    assert result["kind"] == "thanks"
    assert result["told"] == []
    assert result["calls_made"] == 0


def test_every_quick_kind_is_a_kind_the_model_may_give():
    for kind, _ in live_listen._QUICK:
        assert kind in live_listen.KINDS
        assert f'"{kind}" -' in live_listen.LISTEN_SYSTEM, f"the prompt does not explain {kind}"


def test_the_mock_knows_the_messages_the_battery_missed():
    # Found by running 38 conversations through the mock (28 Oct).
    cases = {
        "mera phone le liya": "taken",
        "mujhe darr lagta hai": "feeling",
        "koi mere saath nahi baithta": "left_out",
        "my teacher shouts at me": "names",
        "Keiner redet mit mir": "left_out",
        "I like pizza": "smalltalk",
        "what is 2+2": "smalltalk",
        "Ich mag Fußball": "smalltalk",
        "hello how are you": "talk",
        "can you help me": "asking",
        "I like it when nobody talks to me": "left_out",
    }
    for text, kind in cases.items():
        assert asyncio.run(mock.listen(text, "en"))["kind"] == kind, text


def test_the_route_answers_plain_messages_without_a_written_reply():
    answer = client.post("/api/listen", json={"text": "thanks", "lang": "en"}).json()
    assert answer["kind"] == "thanks"
    assert answer["reply"] is None


def test_danger_is_still_found_in_a_message_that_starts_like_chat():
    answer = client.post("/api/listen", json={"text": "ok bye, I want to die", "lang": "en"}).json()
    assert answer["safety"]["urgent"] is True

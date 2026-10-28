"""The chat reads context and notices nonsense (28 Oct, Swarup: "I want it to think").

- Keys hit at random are "unclear", decided in code before any model call.
- The question the app just asked is passed along, so "at the bus stop" is
  read as the answer to "Where did it happen?".
No live call: the model is faked where it is needed at all.
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


@pytest.mark.parametrize("text", ["asdfgh", "jjjjjjj", "qwrtzp ghjkl", "hjkl", "zxcvbnm asdf"])
def test_keys_hit_at_random_are_unclear(text):
    assert live_listen.looks_unclear(text)


@pytest.mark.parametrize(
    "text",
    ["ok", "pls", "hmm", "thnks", "hahahaha", "property", "Wert", "1234", "😢😢",
     "They took my bag", "usne mujhe maara", "मुझे मारा", "Sie haben mich geschubst", "asdf they hit me"],
)
def test_words_are_never_called_unclear(text):
    assert not live_listen.looks_unclear(text)


def test_no_sentence_in_the_test_sets_is_called_unclear():
    for name in ("en_core", "hi_core", "en_starter", "hi_starter"):
        data = json.loads((REPO_ROOT / "eval" / "testset" / f"{name}.json").read_text(encoding="utf-8"))
        for case in data["cases"]:
            text = case.get("text") or case.get("source") or ""
            assert not live_listen.looks_unclear(text), f"{name}: {text}"


def test_unclear_costs_no_model_call(monkeypatch):
    async def must_not_call(*args, **kwargs):
        raise AssertionError("the model was called for random keys")

    monkeypatch.setattr(live_listen, "call", must_not_call)
    result = asyncio.run(live_listen.listen("asdfghjkl", "en"))
    assert result["kind"] == "unclear"
    assert result["calls_made"] == 0


def test_the_model_is_told_which_question_was_asked(monkeypatch):
    seen = {}

    async def spy(role, system, user, *args, **kwargs):
        seen["user"] = user
        return '{"kind": "other", "told": ["where"]}'

    monkeypatch.setattr(live_listen, "call", spy)
    result = asyncio.run(live_listen.listen("at the bus stop", "en", "where"))
    assert "The app just asked: Where did it happen?" in seen["user"]
    assert result["told"] == ["where"]


def test_without_a_question_nothing_extra_is_sent(monkeypatch):
    seen = {}

    async def spy(role, system, user, *args, **kwargs):
        seen["user"] = user
        return '{"kind": "hurt", "told": []}'

    monkeypatch.setattr(live_listen, "call", spy)
    asyncio.run(live_listen.listen("he pushed me", "en"))
    assert "just asked" not in seen["user"]


def test_the_mock_reads_a_short_reply_as_the_answer_to_the_question():
    answer = asyncio.run(mock.listen("at the bus stop", "en", "where"))
    assert answer == {"kind": "other", "told": ["where"], "calls_made": 0}
    assert asyncio.run(mock.listen("at the bus stop", "en"))["told"] == []
    assert asyncio.run(mock.listen("asdfgh", "en", "where"))["kind"] == "unclear"


def test_the_route_takes_the_question_and_refuses_anything_else():
    ok = client.post("/api/listen", json={"text": "at the bus stop", "lang": "en", "asked": "where"})
    assert ok.status_code == 200
    assert ok.json()["told"] == ["where"]
    assert client.post("/api/listen", json={"text": "x", "lang": "en", "asked": "nonsense"}).status_code == 422
    unclear = client.post("/api/listen", json={"text": "asdfgh", "lang": "en"})
    assert unclear.json()["kind"] == "unclear"
    assert unclear.json()["reply"] is None, "no written reply for random keys"

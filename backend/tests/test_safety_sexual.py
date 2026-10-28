"""A sexual disclosure opens the help pop-up, in the chat and everywhere else.

Swarup, 28 Oct: "my friend does give me bj" was answered "It takes courage
to write this. Where did it happen?". The app knew two emergencies, danger
and self-harm, and this was neither. Now "sexual" is a third: the fixed
rules and the model each can raise it, and the words shown come from
content/safety_messages.json like the other two.

Offline: the rules are code, and the route runs on the mock.
"""

import re

import pytest
from fastapi.testclient import TestClient

import main
from engine import mock
from engine.safety import URGENT, SAFETY_SCHEMA, contacts_for, message_for
from engine.safety_rules import CRISIS, rule_category

from tests.test_safety import MUST_NOT_FIRE

client = TestClient(main.app)

SEXUAL = [
    "my friend does give me bj",
    "he made me give him a blowjob",
    "my uncle touches my private parts",
    "he touched me down there",
    "someone grabbed my boobs in the corridor",
    "he made me undress",
    "a boy keeps asking me for nudes",
    "they shared naked pictures of me in the group",
    "he raped me",
    "Er hat mich vergewaltigt",
    "Er hat mich zwischen den Beinen angefasst",
    "Sie haben ein Nacktbild von mir geteilt",
    "usne mujhe galat tarike se chhua",
    "उसने मुझे गलत तरीके से छुआ",
]

# Everyday sentences close to the patterns above. A false alarm costs the
# child's trust (safety.py, rule 3).
NOT_SEXUAL = [
    "they touched my bag and threw it",
    "he grabbed my arm and pulled me",
    "we had sex education today and they laughed at me",
    "they call me a slut",
    "Er hat mir die Brotdose weggenommen",
    "I am so sad today",
]


@pytest.mark.parametrize("text", SEXUAL)
def test_the_fixed_rules_find_a_sexual_disclosure(text):
    assert rule_category(text) == "sexual", text


@pytest.mark.parametrize("text", NOT_SEXUAL)
def test_close_everyday_sentences_do_not_fire(text):
    assert rule_category(text) is None, text


def test_a_name_that_is_also_slang_fires_and_that_is_the_accepted_cost():
    # "bj" has no everyday meaning in a child's message about their day.
    # A child named BJ gets a gentle pop-up they can close with Continue;
    # a child disclosing gets help. That trade is the decision.
    assert rule_category("BJ is my best friend's name") == "sexual"


@pytest.mark.parametrize("text,lang", MUST_NOT_FIRE)
def test_the_existing_false_alarm_list_still_holds(text, lang):
    assert rule_category(text) is None, text


def test_danger_is_still_tried_first():
    # A threat of rape is someone else's threat: danger keeps 110/112 on top.
    assert rule_category("he said he will rape me after school and he has a knife") == "danger"


def test_every_language_has_the_fixed_words_and_no_phone_number_in_them():
    for lang in ("en", "de", "hi"):
        words = message_for("sexual", lang)
        assert words, lang
        assert not re.search(r"\d{3}", words), "contacts live in helplines.json only"


def test_the_hinglish_never_genders_the_child():
    gendered = re.compile(r"\b(sakte|sakti|rahe|rahi|karte|karti|chahte|chahti) ho\b|\bnahi chahte\b", re.I)
    for category in URGENT:
        assert not gendered.search(message_for(category, "hi")), category


def test_a_sexual_disclosure_is_offered_people_to_talk_to():
    assert contacts_for("sexual"), "the pop-up would list no one"


def test_the_model_and_the_rules_know_the_same_categories():
    assert set(URGENT) == set(CRISIS)
    assert SAFETY_SCHEMA["json_schema"]["schema"]["properties"]["category"]["enum"] == ["none", *URGENT]


@pytest.mark.asyncio
async def test_the_mock_raises_it():
    result = await mock.safety_check("my friend does give me bj", "en")
    assert result == {"urgent": True, "category": "sexual", "message_child": message_for("sexual", "en")}


def test_the_chat_opens_help_instead_of_asking_where():
    answer = client.post("/api/listen", json={"text": "my friend does give me bj", "lang": "en"}).json()
    assert answer["safety"]["urgent"] is True
    assert answer["safety"]["category"] == "sexual"
    assert answer["reply"] is None

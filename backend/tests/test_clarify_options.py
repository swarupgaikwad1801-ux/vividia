"""Can a child say "neither of those"?

Two buttons are a trap when the child meant something else: every answer is
wrong, and the only way forward is to pick a meaning they did not intend. A
child who has been punished for speaking up before will pick the nearest one
and stop trusting the app, which is the failure this product exists to avoid.

So every question ends with a fixed third option in the child's language, and
choosing it leads to a rewrite rather than to a translated guess.

Replays recorded transcripts; no live model calls.
"""

import json

import pytest
import recorded

from app.schemas import Ambiguity as AmbiguitySchema
from app.schemas import TranslateResponse
from engine.clarify_text import LABELS, OTHER_ID, label_for, other_option, rewrite_prompt_for
from engine.translate import ADAPTIVE, MULTI_PASS, _decisions_text, translate

# Some tests below ask for MULTI_PASS rather than ADAPTIVE. They are about the
# shape of the escape option, not about which sentences get verified, and two
# of them feed an English fixture in as Hindi to check the option's language.
# They used to reach the question through ADAPTIVE because an unnamed actor
# ("he", "they") counted as a risk marker; that marker was removed on main
# after it was measured firing on 29 of 50 English sentences and escalating
# almost everything. Asking for the full check directly keeps these tests
# about their own subject, instead of breaking whenever triage is tuned.

FAST = 100_000


def replay(monkeypatch, name):
    transcript = recorded.load(name)
    recorded.install(monkeypatch, transcript, rpm=FAST)
    return transcript


# --- the option is there, and it is ours ------------------------------------


async def test_every_question_offers_a_way_out(monkeypatch):
    transcript = replay(monkeypatch, "get_me_after_school")

    result = await translate(transcript.data["text"], "en", strategy=ADAPTIVE)

    assert result["ambiguities"], "no question to check"
    for question in result["ambiguities"]:
        assert question["options"][-1]["id"] == OTHER_ID, (
            "the escape option must be last, so the readings are read first"
        )


async def test_the_escape_label_is_our_fixed_text_not_the_models(monkeypatch):
    """The transcript's question options are all about getting picked up or
    hurt. If the third label matched our constant only by luck, this would
    catch it: the model never produced this string."""
    transcript = replay(monkeypatch, "get_me_after_school")

    result = await translate(transcript.data["text"], "en", strategy=ADAPTIVE)
    escape = result["ambiguities"][0]["options"][-1]

    assert escape["label"] == LABELS["en"]
    model_labels = [
        option["label"]
        for option in transcript.data["responses"]["question"][0]["options"]
    ]
    assert escape["label"] not in model_labels, "this came from the model, not from us"


async def test_the_escape_option_is_in_the_childs_language(monkeypatch):
    """A Hindi-speaking child must not meet an English button."""
    transcript = replay(monkeypatch, "get_me_after_school")

    result = await translate(transcript.data["text"], "hi", strategy=MULTI_PASS)
    escape = result["ambiguities"][0]["options"][-1]

    assert escape["label"] == LABELS["hi"]
    assert escape["label"] != LABELS["en"]


async def test_the_escape_option_carries_no_german(monkeypatch):
    """Picking it says neither reading was right, so there is nothing to
    render. An invented German here would be a guess presented as the child's
    own words."""
    transcript = replay(monkeypatch, "get_me_after_school")

    result = await translate(transcript.data["text"], "en", strategy=ADAPTIVE)

    assert result["ambiguities"][0]["options"][-1]["meaning_de"] == ""


async def test_the_real_readings_are_still_offered_first(monkeypatch):
    transcript = replay(monkeypatch, "get_me_after_school")

    result = await translate(transcript.data["text"], "en", strategy=ADAPTIVE)
    options = result["ambiguities"][0]["options"]

    assert [option["meaning_de"] for option in options[:-1]] == [
        "er kriegt mich nach der Schule",
        "er holt mich nach der Schule ab",
    ]


# --- the frozen contract still holds ----------------------------------------


async def test_a_question_still_validates_against_the_contract(monkeypatch):
    transcript = replay(monkeypatch, "get_me_after_school")

    result = await translate(transcript.data["text"], "en", strategy=ADAPTIVE)

    for question in result["ambiguities"]:
        model = AmbiguitySchema.model_validate(question)
        assert 2 <= len(model.options) <= 3


async def test_three_readings_do_not_overflow_the_contract(monkeypatch):
    """schemas.Ambiguity caps options at 3 and the escape option takes the
    third slot, so the readings are capped at two. Without that cap this
    sentence would build four options and the response would fail validation
    on its way out, which a child would see as a 500 rather than a question."""
    transcript = replay(monkeypatch, "three_readings")

    result = await translate(transcript.data["text"], "en", strategy=MULTI_PASS)

    question = result["ambiguities"][0]
    assert len(question["options"]) == 3
    AmbiguitySchema.model_validate(question)
    assert question["options"][-1]["id"] == OTHER_ID
    # The two readings kept are the first two the check reported.
    assert [option["meaning_de"] for option in question["options"][:-1]] == [
        "hat mit mir herumgealbert",
        "hat mich absichtlich geärgert",
    ]


async def test_option_ids_stay_distinct_so_the_ui_can_tell_them_apart(monkeypatch):
    for name in ("get_me_after_school", "three_readings"):
        transcript = replay(monkeypatch, name)
        result = await translate(transcript.data["text"], "en", strategy=MULTI_PASS)
        for question in result["ambiguities"]:
            ids = [option["id"] for option in question["options"]]
            assert len(ids) == len(set(ids)), f"{name}: duplicate option id in {ids}"


# --- picking it does not translate a guess ----------------------------------


def test_choosing_something_else_renders_no_decision():
    """The translator must never be told the child "meant" the escape option."""
    ambiguities = [
        {
            "phrase": "get me after school",
            "options": [
                {"id": "opt0", "label": "Hurt me", "meaning_de": "er kriegt mich"},
                {"id": "opt1", "label": "Pick me up", "meaning_de": "er holt mich ab"},
                other_option("en"),
            ],
        }
    ]

    assert _decisions_text(ambiguities, {"get me after school": OTHER_ID}) == ""
    # A real reading still renders, so the skip is targeted and not a blanket.
    assert "er kriegt mich" in _decisions_text(ambiguities, {"get me after school": "opt0"})


async def test_choosing_something_else_does_not_reach_the_clarified_prompt(monkeypatch):
    """End to end: the clarified system prompt is only used when there is a
    decision to render, so picking the escape option must not trigger it."""
    transcript = replay(monkeypatch, "child_answer_is_rendered")
    ambiguities = [
        {
            "phrase": "laughed at me",
            "options": [
                {"id": "opt0", "label": "To make fun of me", "meaning_de": "mich ausgelacht"},
                {"id": "opt1", "label": "Together with me", "meaning_de": "mit mir gelacht"},
                other_option("en"),
            ],
        }
    ]

    await translate(
        transcript.data["text"],
        "en",
        clarifications={"laughed at me": OTHER_ID},
        _ambiguities=ambiguities,
    )

    assert transcript.count("translate_clarified") == 0, (
        "the translator was told to render the escape option as a meaning"
    )


# --- the fixed text itself ---------------------------------------------------


@pytest.mark.parametrize("lang", ["en", "hi", "de"])
def test_the_label_and_the_rewrite_prompt_exist_in_every_shipped_language(lang):
    assert LABELS[lang].strip()
    assert rewrite_prompt_for(lang).strip()


def test_a_language_we_have_no_copy_for_still_gets_a_button():
    assert label_for("uk") == LABELS["en"]
    assert rewrite_prompt_for("uk") == rewrite_prompt_for("en")


@pytest.mark.parametrize("lang", ["en", "hi", "de"])
def test_the_escape_option_never_blames_the_child(lang):
    """It must not read as "you wrote this unclearly". The child did nothing
    wrong; our two guesses were simply not what they meant."""
    text = (LABELS[lang] + " " + rewrite_prompt_for(lang)).lower()
    for word in ("wrong", "mistake", "unclear", "error", "falsch", "fehler", "गलत"):
        assert word not in text, f"{lang} copy says {word!r}"


def test_the_id_is_stable_because_the_client_keys_on_it():
    """The frontend shows its rewrite box when it sees this id. Changing it
    silently breaks that, so it is pinned here rather than only in a comment."""
    assert OTHER_ID == "other"
    assert other_option("en")["id"] == "other"


# --- over the wire -----------------------------------------------------------


async def test_the_option_survives_serialisation(monkeypatch):
    """What the browser actually receives, through the real response model."""
    transcript = replay(monkeypatch, "get_me_after_school")
    result = await translate(transcript.data["text"], "hi", strategy=MULTI_PASS)

    body = TranslateResponse(
        translation=result["translation"],
        confidence=result["confidence"],
        ambiguities=result["ambiguities"],
        safety={"urgent": False, "category": "none", "message_child": ""},
        strategy_used="adaptive",
        usage=result["usage"],
    )
    sent = json.loads(body.model_dump_json())

    escape = sent["ambiguities"][0]["options"][-1]
    assert escape["id"] == OTHER_ID
    assert escape["label"] == LABELS["hi"]
    assert escape["meaning_de"] == ""

"""Does the mock engine answer the sentence it was given?

It did not. `mock.translate()` returned one fixed German sentence about a
stolen bag whatever the child wrote, with a confidence of 0.82 and a
clarification question about "laughed at me". Typing "I dont feel good" into
the running app produced somebody else's story, an agreement score for a
translation of a sentence that was never written, and a question about words
the child had not used.

That is not a cosmetic bug in a stub. The app makes exactly one promise to a
child - *these are your words, nobody rewrote them* - and in mock mode the app
broke it on every screen, convincingly, with a percentage next to it. Mock
mode is also the only mode anyone sees without a key: every teammate, every
reviewer and anyone who clones the repo.

So these tests are mostly about what the mock must NOT do: not answer with a
sentence the child did not write, not quote a phrase they did not use, not
report a number it did not measure, and not stay silent when a child says
something that needs help. The one thing it IS allowed to do is less.

No model calls happen anywhere in here, which the last test proves rather
than assumes.
"""

import json

import pytest

from app.schemas import Ambiguity as AmbiguityOut
from app.schemas import TranslateResponse
from engine import client, mock, safety, translate
from engine.clarify_text import OTHER_ID
from engine.config import REPO_ROOT

# The engine's own "did the child write this" comparison, so this test and the
# code it checks agree about what counts as the same words. `_said_by_the_child`
# in #86 is the stricter version of it and this should move to it once that
# lands; for now the rule on main is a normalised substring.
from engine.translate import _normalise

# The German the old mock returned for every sentence ever typed into it.
OLD_FIXED_ANSWER = "Sie haben mir wieder meine Tasche weggenommen"

# Sentences a child might actually write, none of which is in any reviewed
# phrasebook. Deliberately varied: a feeling with no event in it, an event
# with no feeling, a question, one word, and another language.
NOT_IN_ANY_PHRASEBOOK = [
    "I dont feel good",
    "nobody talked to me today",
    "why does it always happen to me",
    "sad",
    "mujhe school nahi jana hai",
]


@pytest.fixture(autouse=True)
def no_pretend_latency(monkeypatch):
    """The mock sleeps to give the UI something to show a spinner for.

    Forty tests x 1.5s is a minute of CI doing nothing, and none of these
    tests are about how long it takes.
    """
    monkeypatch.setattr(mock, "PRETEND_LATENCY", 0)


@pytest.fixture(scope="module")
def timeline() -> list[dict]:
    """The five approved entries from content/demo_story.json, read-only."""
    story = json.loads(
        (REPO_ROOT / "content" / "demo_story.json").read_text(encoding="utf-8")
    )
    return story["timeline"]


# --- the sentence that started it -------------------------------------------


async def test_a_feeling_comes_back_as_the_feeling():
    """The screenshot case. A child says how they feel and nothing else."""
    result = await mock.translate("I dont feel good", "en")

    assert result["translation"] == "I dont feel good"
    assert result["ambiguities"] == [], "nothing in that sentence is ambiguous"


@pytest.mark.parametrize("text", NOT_IN_ANY_PHRASEBOOK)
async def test_no_sentence_gets_somebody_elses_story(text):
    result = await mock.translate(text, "en")

    assert OLD_FIXED_ANSWER not in result["translation"]
    assert result["translation"] == text, (
        "with no reviewed German for this sentence, the honest answer is the "
        "child's own sentence, unchanged"
    )


async def test_two_different_sentences_get_two_different_answers():
    """The property the old mock could not satisfy at all.

    Every other test here could in principle be passed by a cleverer fixed
    answer. This one cannot: the output has to depend on the input.
    """
    first = await mock.translate("they took my pencil case", "en")
    second = await mock.translate("I sat alone at lunch again", "en")

    assert first["translation"] != second["translation"]


# --- what it is allowed to say in German ------------------------------------


async def test_reviewed_german_is_used_where_it_exists(timeline):
    """A demo sentence gets the German Neel wrote for it, not a guess."""
    for entry in timeline:
        result = await mock.translate(entry["text_child"], "en")
        assert result["translation"] == entry["text_de"]


async def test_the_phrasebook_is_read_not_copied(timeline):
    """mock.py must hold no German of its own.

    Two copies of a sentence drift apart silently, and this German is content,
    reviewed by the person who owns the wording. The same rule the resources
    mock already follows for phone numbers.
    """
    source = (REPO_ROOT / "backend" / "engine" / "mock.py").read_text(encoding="utf-8")
    for entry in timeline:
        assert entry["text_de"] not in source

    assert mock._phrasebook(), "...and the phrasebook is not empty either"


async def test_punctuation_does_not_decide_it(timeline):
    """A child typing without the full stop still gets the reviewed German."""
    entry = timeline[0]
    sloppy = entry["text_child"].rstrip(".").lower() + "  "

    result = await mock.translate(sloppy, "en")
    assert result["translation"] == entry["text_de"]


# --- what it is allowed to quote back ---------------------------------------


async def test_a_known_two_meaning_phrase_is_asked_about():
    """The demo's centrepiece sentence, from demo_story.json's live_message."""
    result = await mock.translate("He said he would get me after school.", "en")

    assert len(result["ambiguities"]) == 1
    question = result["ambiguities"][0]
    assert question["phrase"] == "get me"
    assert question["severity"] == "critical"

    labels = [option["label"] for option in question["options"]]
    assert "a threat to hurt me" in labels, "the reading that matters"
    assert "come and collect me" in labels


@pytest.mark.parametrize(
    "text",
    [
        *NOT_IN_ANY_PHRASEBOOK,
        "He said he would get me after school.",
        "they were playing with me at break",
        "he touched me and I didnt like it",
        "kal chhutti ke baad",
    ],
)
async def test_every_quoted_phrase_is_the_childs_own(text):
    """The rule from #86, applied to the mock as well.

    A phrase in quotation marks on a child's screen that they never wrote is
    the most alarming thing this app can do: they wrote one sentence about
    their own life and the app answered with somebody else's words.
    """
    result = await mock.translate(text, "en")

    for question in result["ambiguities"]:
        assert _normalise(question["phrase"]) in _normalise(text), (
            f"the mock quoted {question['phrase']!r}, which is not in {text!r}"
        )
        assert question["phrase"] in question["question"]


@pytest.mark.parametrize(
    "text, written, headword",
    [
        ("woh mujhe roz chhedte hain", "chhedte", "chhedna"),
        ("kal ke baad kya hoga", "kal", "kal"),
        ("उसने मुझे देख लेना बोला", "देख लेना", "dekh lena"),
    ],
)
async def test_the_question_quotes_the_word_the_child_typed(text, written, headword):
    """Not the word list's headword, which is a different word.

    A child who writes "chhedte" is reported by the word list under its
    dictionary form "chhedna", and one who writes देवनागरी is reported under a
    Latin spelling of it. Either would put a word the child never typed in
    quotation marks on their screen.
    """
    result = await mock.translate(text, "hi")

    quoted = [question["phrase"] for question in result["ambiguities"]]
    assert written in quoted
    if headword != written:
        assert headword not in quoted


async def test_never_more_than_two_questions():
    """A child owes us nothing. Two interruptions is the cap, as in live."""
    crowded = "kal chhutti ke baad bhaiya ne didi ko dekh lena bola aur chhedte the"

    result = await mock.translate(crowded, "hi")
    assert len(result["ambiguities"]) <= mock.MAX_QUESTIONS == 2


async def test_there_is_always_a_way_out():
    """Every question ends with "something else", with no German behind it."""
    result = await mock.translate("He said he would get me after school.", "en")

    for question in result["ambiguities"]:
        escape = question["options"][-1]
        assert escape["id"] == OTHER_ID
        assert escape["meaning_de"] == "", "there is no German for 'neither of those'"


async def test_the_options_still_fit_the_frozen_contract():
    """2 or 3 options, or the child sees a 500 instead of a question."""
    for text in [*NOT_IN_ANY_PHRASEBOOK, "He said he would get me after school."]:
        result = await mock.translate(text, "en")
        for question in result["ambiguities"]:
            AmbiguityOut.model_validate(question)

        TranslateResponse.model_validate(
            {
                "translation": result["translation"],
                "confidence": result["confidence"],
                "ambiguities": result["ambiguities"],
                "safety": await mock.safety_check(text, "en"),
                "strategy_used": "adaptive",
                "usage": {
                    "calls_made": result["calls_made"],
                    "input_tokens": 0,
                    "output_tokens": 0,
                    "latency_ms": 1,
                    "estimated_cost_usd": 0.0,
                },
            }
        )


# --- the numbers ------------------------------------------------------------


@pytest.mark.parametrize("text", NOT_IN_ANY_PHRASEBOOK)
async def test_no_number_is_invented(text):
    """0.82 agreement across passes that never ran was the worst of it.

    `confidence` is agreement between independent passes. The mock runs none,
    so there is no agreement to report, and 0.0 is the only honest value.
    `calls_made` is 0 for the same reason: none were made.
    """
    result = await mock.translate(text, "en")

    assert result["confidence"] == 0.0
    assert result["calls_made"] == 0


async def test_answering_a_question_settles_it():
    text = "He said he would get me after school."
    first = await mock.translate(text, "en")
    phrase = first["ambiguities"][0]["phrase"]

    answered = await mock.translate(text, "en", clarifications={phrase: "opt0"})
    assert answered["ambiguities"] == []

    # ...and a question nobody answered is still open.
    unrelated = await mock.translate(text, "en", clarifications={"something else": "opt0"})
    assert [a["phrase"] for a in unrelated["ambiguities"]] == [phrase]


# --- the report -------------------------------------------------------------


async def test_the_report_is_about_these_entries(timeline):
    """It used to say "In 3 Fällen ist etwas passiert" and nothing else.

    A card about a child with none of the child in it. The real builder makes
    no model calls, so the mock delegates to it and the card is the card.
    """
    card = await mock.report(timeline, "en")

    for entry in timeline:
        assert entry["text_de"] in card["german_version"]
        assert entry["text_child"] in card["child_version"]

    assert "Beispieltext" not in card["german_version"]
    assert "example text" not in card["child_version"]


# --- safety -----------------------------------------------------------------


@pytest.mark.parametrize(
    "text, category",
    [
        ("I want to die", "self_harm"),
        ("sometimes I want to hurt myself", "self_harm"),
        ("he had a knife in his bag", "danger"),
    ],
)
async def test_a_child_in_crisis_is_not_met_with_a_blank(text, category):
    result = await mock.safety_check(text, "en")

    assert result["urgent"] is True
    assert result["category"] == category
    assert result["message_child"].strip(), "and the fixed, reviewed wording is shown"


@pytest.mark.parametrize(
    "text",
    [
        "my mum will kill me when she sees this",
        "I was dead embarrassed",
        "they took my bag again",
    ],
)
async def test_exaggeration_is_not_a_crisis(text):
    """Children exaggerate constantly, and a crisis screen is not free.

    The real check reads what a child means and gets these right. This one
    cannot, so the phrases it would get wrong are deliberately not in its
    list - a keyword check that fires on "kill me" would show the crisis
    screen to a child who is scared of their report card.
    """
    result = await mock.safety_check(text, "en")

    assert result["urgent"] is False
    assert result["message_child"] == ""


# --- and none of it costs anything ------------------------------------------


async def test_the_mock_makes_no_model_calls(monkeypatch, timeline):
    """The reason the mock exists: it runs with no key and spends nothing.

    Every module that could reach the network has its `call` replaced with
    something that fails the test loudly. The old mock passed this by having
    no engine code in it at all; this one passes it while reading the same
    word list and building the same report as live.
    """

    async def forbidden(*args, **kwargs):
        raise AssertionError("the mock reached for a model")

    for module in (client, translate, safety):
        monkeypatch.setattr(module, "call", forbidden, raising=False)

    await mock.translate("He said he would get me after school.", "en")
    await mock.safety_check("I want to die", "en")
    await mock.report(timeline, "en")
    await mock.resources_with_source("BY", "en")

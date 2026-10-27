"""Does the backend speak to the child the way the screens do?

Hindi has two second persons. आप is what a stranger, a teacher or an official
form calls you; तुम is what a friend or a family member calls you. German has
the same split as Sie and du, and this app has always used du - so the Hindi
should always have been तुम.

It was आप in six error messages, in all six onboarding screens, in both safety
messages and in the rewrite prompt, while the screens moved to तुम (#74). A
child would have read तुम on the button and आप in the sentence the app shows
after a crash, or - worst of the lot - in the message that tells them to call
110. An app that changes how it addresses you halfway through stops sounding
like a person and starts sounding like a form, and that is the one thing this
app cannot afford to sound like. Found by Neel, issue #5, where it is listed
as "small"; it is small per string and not small in total.

The one place आप is right is the report header, because the reader there is
the adult the child hands the card to. That is pinned too, so nobody "fixes"
it by sweeping the codebase.

This test does not check that the Hindi is good - none of us can do that from
here, and it still needs a native read. It checks only that we address the
child consistently, which is a thing code can tell.
"""

import json
import re
from pathlib import Path

import pytest

from engine.clarify_text import LABELS, REWRITE_PROMPT
from engine.errors import MESSAGES
from engine.report_text import HEADER
from engine.prompts import QUESTION_SYSTEM

CONTENT = Path(__file__).resolve().parents[2] / "content"

# A word edge, the same idea as in translate.py: Devanagari vowel signs are
# not \w in Python's re, so \b alone would cut words in half.
_EDGE = r"[\wऀ-ॣ०-ॿ]"

# आप and the case forms a sentence actually uses. The optional suffix plus the
# closing edge check is what keeps आपस ("mutual") out of the results - a real
# word that merely starts with the same two letters.
_FORMAL_DEV = rf"(?<!{_EDGE})आप(?:का|की|के|को|से|ने)?(?!{_EDGE})"
_INFORMAL_DEV = rf"(?<!{_EDGE})तुम(?:्हारा|्हारी|्हारे|्हें|से|ने)?(?!{_EDGE})"

# The same two words in the Latin alphabet, because the engine's Hindi is
# Hinglish now (Neel's item 4) and a register check that only reads Devanagari
# would pass an engine that had gone back to आप in Latin letters - "aapko",
# "aapki" - without noticing. Register is a property of the word, not the
# script it is spelled in.
_FORMAL_LAT = r"\b(?:aap|aapka|aapki|aapke|aapko|aapse|aapne)\b"
_INFORMAL_LAT = r"\b(?:tum|tumhara|tumhari|tumhare|tumhe|tumse|tumne|tumhara)\b"

FORMAL = re.compile(f"{_FORMAL_DEV}|{_FORMAL_LAT}", re.IGNORECASE)
INFORMAL = re.compile(f"{_INFORMAL_DEV}|{_INFORMAL_LAT}", re.IGNORECASE)

# Devanagari anywhere in a child-facing engine string. The screens are Hinglish
# (#77), so a sentence that arrives in Devanagari is the one thing on screen a
# child reading Latin script may not be able to read - and it arrives exactly
# when something has gone wrong or they are being asked a question.
DEVANAGARI = re.compile(r"[\u0900-\u097F]")

# content/onboarding.json is still Devanagari on main; #77 converts it along
# with the screens, and it is Neel's file. Delete this the moment #77 lands.
NOT_YET_CONVERTED = "onboarding.json"


def hindi_strings_a_child_reads():
    """Every Hindi string the app shows the child, with a label for failures."""
    for code, langs in MESSAGES.items():
        yield f"errors.py::{code}", langs["hi"]
    yield "clarify_text.py::LABELS", LABELS["hi"]
    yield "clarify_text.py::REWRITE_PROMPT", REWRITE_PROMPT["hi"]

    screens = json.loads((CONTENT / "onboarding.json").read_text(encoding="utf-8"))
    for screen in screens["screens"]:
        yield f"onboarding.json::{screen['id']}", screen["hi"]

    safety = json.loads((CONTENT / "safety_messages.json").read_text(encoding="utf-8"))
    for key, message in safety["messages"].items():
        yield f"safety_messages.json::{key}", message["hi"]


CHILD_FACING = list(hindi_strings_a_child_reads())


def test_there_is_something_to_check():
    # Guards the generator above: a silent zero would make every test below
    # pass by checking nothing, which is how this kind of test dies quietly.
    assert len(CHILD_FACING) >= 12, CHILD_FACING


@pytest.mark.parametrize("where,text", CHILD_FACING, ids=[w for w, _ in CHILD_FACING])
def test_the_child_is_never_addressed_as_आप(where, text):
    found = FORMAL.findall(text)
    assert not found, (
        f"{where} addresses the child with आप. The screens use तुम (#74) and "
        "the German uses du."
    )


def test_at_least_some_of_it_actually_says_तुम():
    # Not every sentence needs a pronoun, but if none of them had one the test
    # above would be satisfied by Hindi that addresses nobody at all. Counted
    # across both scripts: "tum" and तुम are the same word and the same choice.
    speaking = [where for where, text in CHILD_FACING if INFORMAL.search(text)]
    assert len(speaking) >= 8, f"only {len(speaking)} strings address the child: {speaking}"


@pytest.mark.parametrize("where,text", CHILD_FACING, ids=[w for w, _ in CHILD_FACING])
def test_the_engine_writes_hindi_in_the_script_the_screens_use(where, text):
    """Neel's item 4: the engine was Devanagari while the screens went Hinglish.

    A child met Latin script on every button and Devanagari the moment
    something failed, a question was asked, or the safety message fired - the
    three places where being unable to read it costs the most. The register
    sweep above fixed WHICH second person we use; this fixes whether the child
    can read it at all.
    """
    if NOT_YET_CONVERTED in where:
        pytest.skip(f"{NOT_YET_CONVERTED} is converted by #77, which owns that file")

    found = DEVANAGARI.findall(text)
    assert not found, (
        f"{where} is written in Devanagari while the screens are Hinglish. "
        f"The child reads one script, not two: {''.join(found[:20])}"
    )


def test_the_question_prompt_asks_for_the_latin_alphabet():
    """The clarification question is written by the model, not by us.

    So the only place to say it is the prompt, and a prompt rule that nobody
    pins is one merge away from being gone - which is what the test below this
    one already exists to prevent for तुम.
    """
    assert "LATIN alphabet" in QUESTION_SYSTEM
    assert "Tumhara matlab kya tha?" in QUESTION_SYSTEM


def test_the_report_header_still_addresses_the_adult_formally():
    # The one correct आप in the codebase. The reader here is the teacher or
    # parent the child chose to hand the card to, not the child.
    assert FORMAL.search(HEADER["hi"]), (
        "the report is read by an adult; आप is right there and a sweep must "
        "not have taken it"
    )


def test_the_question_prompt_tells_the_model_which_form_to_use():
    # The questions are written by a model at request time, so this is the
    # only place the rule can live for them.
    assert "In Hindi use तुम, never आप" in QUESTION_SYSTEM
    assert "In German use du, never Sie" in QUESTION_SYSTEM


# --- the word edge, which is the part most likely to be wrong ----------------


@pytest.mark.parametrize(
    "text,formal",
    [
        ("तुम्हारे शब्द यहीं हैं।", False),
        ("आपके शब्द यहीं हैं।", True),
        ("आप अभी बात कर सकते हो।", True),
        ("हम आपस में बात करते हैं।", False),  # आपस is a word, not आप
        ("क्या तुम इसे फिर से लिख सकते हो?", False),
    ],
)
def test_the_pattern_finds_the_pronoun_and_not_words_that_start_like_it(text, formal):
    assert bool(FORMAL.search(text)) is formal

"""Fake engine with the final signatures, so the app can be built now.

Vernika's routes call these until the real functions exist. The real ones
(translate.py, report.py, safety.py, resources.py) must keep exactly these
signatures and return shapes from contract.py.

**Everything here is derived from what the child actually typed, or read from
a reviewed content file.** It was not. `translate()` used to return one fixed
German sentence about a stolen bag no matter what the child wrote, with a
confidence of 0.82 and a clarification question about "laughed at me". A child
who typed "I dont feel good" got back somebody else's story, 82% agreement on
a translation of a sentence they never wrote, and a question about words they
had not used. `report()` said "In 3 Fällen ist in der Schule etwas passiert"
whatever those three entries contained, and `safety_check()` answered "none"
to every sentence, including "I want to die".

Four rules, so that cannot come back:

1. **Nothing is invented.** German comes from reviewed content or not at all;
   where there is none, the child's own sentence comes back unchanged. A mock
   cannot translate, and pretending to is what caused the bug above.
2. **Only the child's own words are quoted back.** Questions come from the
   reviewed word list, matched against the text in code, so a phrase in
   quotation marks on a child's screen is always one they wrote.
3. **The numbers are true.** No model calls are made, so `calls_made` is 0,
   and nothing was verified, so `confidence` is 0.0 - which is what "no
   agreement measured" looks like, not a 0% score.
4. **A mock may never be more convincing than the real thing.** Where it can
   only do less, it does less and says so, rather than filling the gap with
   something that looks finished.

The data this reads (content/demo_story.json) is a fictional example, not a
real child.
"""

import asyncio
import json
import re
from functools import lru_cache

from engine.clarify_text import other_option
from engine.config import REPO_ROOT
from engine.contract import Entry, Report, Resource, SafetyResult, TranslationResult
from engine.report import report as _real_report
from engine.resources import national_helplines
from engine.safety import message_for

# _normalise is imported rather than copied. It is the comparison the engine
# already matches a child's phrases with, and a second definition here would
# drift from it: the mock would start recognising a sentence the engine does
# not, or stop recognising one it does.
from engine.translate import _normalise, lexicon_ambiguities

MAX_QUESTIONS = 2  # as in translate.py: never interrupt a child with more

# The one pretence left in this file. The real fan-out takes seconds, and the
# UI's loading and progress states have to be built against something, so the
# waits below stay. A multiplier rather than a hard-coded sleep because a test
# suite that calls translate() forty times should not spend a minute asleep:
# tests set this to 0.
PRETEND_LATENCY = 1.0


@lru_cache(maxsize=1)
def _phrasebook() -> dict[str, str]:
    """{the child's sentence: the reviewed German}, read from demo_story.json.

    Read, not copied, for the reason resources() reads helplines.json: two
    copies of a sentence drift apart silently, and this German is Neel's to
    word, not this file's.

    Only the demo timeline has reviewed German. demo_story.json's
    `live_message` - the sentence the judge types during the demo - has none,
    so in mock mode it comes back as the child wrote it. If the one-click demo
    should show German for it, the German belongs in that file, with one
    sentence per reading so the child's answer picks between them.
    """
    story = json.loads(
        (REPO_ROOT / "content" / "demo_story.json").read_text(encoding="utf-8")
    )
    return {
        _normalise(entry["text_child"]): entry["text_de"]
        for entry in story["timeline"]
        if entry.get("text_child") and entry.get("text_de")
    }


# Example wording, shown only in mock mode. In live mode the question itself
# is written by the judge model in the child's language, which is why there is
# no fixed template in translate.py to reuse. Like the rest of our
# child-facing copy, the German and Hindi need a native read.
_QUESTION = {
    "en": "What did you mean by “{phrase}”?",
    "de": "Was hast du mit „{phrase}“ gemeint?",
    # Hinglish, like the screens (#77) and like the rest of the engine's Hindi
    # (#93). clarify.title in strings.ts is "Tumhara matlab kya tha?", so the
    # mock asks the question the real screens ask, in the script the child is
    # already reading everywhere else.
    "hi": "“{phrase}” se tumhara matlab kya tha?",
}


def _question_for(item: dict, text: str, lang: str) -> dict:
    """One word-list hit, turned into the Ambiguity shape from contract.py.

    The readings are capped at two for the same reason as translate.py's
    `_question`: the frozen contract allows three options and the "something
    else" escape takes the third slot, so a third reading would fail
    validation on the way out and the child would see a 500 instead of a
    question.

    The labels are the reading meanings from the word list, which is what
    translate.py falls back to when the model's own labels come back unusable.
    """
    readings = item["readings"][:2]
    template = _QUESTION.get(lang) or _QUESTION["en"]
    # Already the form the child typed, not the word list's headword:
    # lexicon_ambiguities() does that for the live engine and this alike.
    phrase = item["phrase"]
    return {
        "phrase": phrase,
        "question": template.format(phrase=phrase),
        "options": [
            *(
                {
                    "id": f"opt{index}",
                    "label": reading["meaning"],
                    "meaning_de": reading["target_phrasing"],
                }
                for index, reading in enumerate(readings)
            ),
            other_option(lang),
        ],
        "severity": "critical",
    }


async def translate(
    text: str,
    source_lang: str,
    target_lang: str = "de",
    clarifications: dict[str, str] | None = None,
    strategy: str = "adaptive",
    _ambiguities: list | None = None,
) -> TranslationResult:
    """`clarifications` maps an ambiguous phrase to the option label the child picked."""
    await asyncio.sleep(1.5 * PRETEND_LATENCY)  # roughly what the real fan-out feels like

    # The child's own sentence when there is no reviewed German for it. This
    # is the whole fix: the one thing a mock must never return is a different
    # child's sentence, because the app's only promise is that the words are
    # the child's own.
    german = _phrasebook().get(_normalise(text), text)

    questions = [
        _question_for(item, text, source_lang)
        for item in lexicon_ambiguities(text, source_lang)
    ][:MAX_QUESTIONS]

    if clarifications:
        # The child has answered. Their answers decide which German the live
        # engine writes; there is no German here to rewrite, so the honest
        # effect is that an answered question stops being asked. An
        # unanswered one is still open and stays on the list.
        answered = {phrase.casefold() for phrase in clarifications}
        questions = [q for q in questions if q["phrase"].casefold() not in answered]

    return {
        "translation": german,
        "confidence": 0.0,
        "ambiguities": questions,
        "calls_made": 0,
    }


async def report(entries: list[Entry], child_lang: str) -> Report:
    """The real report builder, which needs no model and no key.

    engine/report.py assembles the card from the entries and the reviewed
    labels in report_text.py. It makes no calls - its Usage stays empty - so
    there was never a reason for the mock to have a second version, and the
    second version was a card about a child with none of the child in it.
    """
    return await _real_report(entries, child_lang)


# Unambiguous crisis phrases, for mock mode only.
#
# The real check (safety.py) asks the judge model to read what a child MEANS,
# and so gets "my mum will kill me when she sees this" right - fear of being
# told off, not danger. This cannot do that. It is a keyword list: it will
# miss almost everything a child actually writes, and anything cleverer here
# would be a lie about what a mock can do.
#
# It exists because the old mock answered "none" to every sentence. Nobody
# should type "I want to die" into this app, in any mode, and get a blank
# screen back. Bare "kill me" is deliberately absent: it is the one phrase
# children use when they mean nothing of the kind, and showing a crisis screen
# to a child who is scared of their report card is its own harm.
#
# The wording still comes from safety_messages.json via message_for(), so the
# mock generates no crisis text, exactly like live.
_CRISIS: dict[str, list[str]] = {
    "self_harm": [
        r"kill myself",
        r"want to die",
        r"wanna die",
        r"end my life",
        r"hurt myself",
        r"cut myself",
        r"don'?t want to live",
        r"nicht mehr leben",
        r"umbringen",
        r"मरना चाह",  # marna chah- : want to die
        r"खुद को मार",  # khud ko maar- : hurt myself
    ],
    "danger": [
        r"\b(has|had|with|brought)\s+a\s+knife",
        r"\bweapon\b",
        r"\bmesser\b",
        r"चाकू",  # chaaku : knife
    ],
}
_CRISIS_PATTERNS = {
    category: [re.compile(pattern, re.IGNORECASE | re.UNICODE) for pattern in patterns]
    for category, patterns in _CRISIS.items()
}


async def safety_check(text: str, lang: str) -> SafetyResult:
    await asyncio.sleep(0.3 * PRETEND_LATENCY)
    for category, patterns in _CRISIS_PATTERNS.items():
        if any(pattern.search(text) for pattern in patterns):
            return {
                "urgent": True,
                "category": category,
                "message_child": message_for(category, lang),
            }
    return {"urgent": False, "category": "none", "message_child": ""}


async def resources_with_source(state: str, lang: str) -> tuple[list[Resource], str]:
    """Always "fallback": the mock looks nothing up, so it must not claim it did."""
    return await resources(state, lang), "fallback"


async def resources(state: str, lang: str) -> list[Resource]:
    await asyncio.sleep(0.5 * PRETEND_LATENCY)
    # Read the curated list rather than keeping a second copy of a phone
    # number. helplines.json is the single source of truth, and two copies of
    # an emergency number drift apart silently. This entry used to hold
    # "116 111" with hours and source_url set to "TBD", which is exactly the
    # drift that file's comment forbids, and a mock showing an unsourced
    # emergency number is worse than one showing none.
    #
    # national_helplines() only reads that file: no network, no key, nothing
    # to pay for, so the mock stays usable with nothing configured.
    return national_helplines()

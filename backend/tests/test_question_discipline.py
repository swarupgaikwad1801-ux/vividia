"""Which disagreements are worth interrupting a child for.

A child using this app is in the middle of describing being bullied. Every
question we ask takes them out of that and makes them adjudicate their own
sentence, and we allow ourselves at most two. So a question has to buy
something: the answer has to change what the German says in a way that changes
what an adult would do about it.

Neel's live run spent one on `टिफ़िन` - "the box, or the lunch inside it?" -
reported by the judge as `source_ambiguous` with severity `critical`. Nobody
decides anything differently either way. Two things changed:

- `prompts.py` now tells the judge that WHICH THING IT WAS is never critical,
  and not to report a phrase at all when both readings leave "what was done to
  this child" the same.
- `_ask_the_child` drops an explicitly `minor` dispute rather than asking it,
  so the rule holds even when the model ignores the prompt. That is the half
  tested here: a prompt is a request, and the code is what we can promise.

Only an explicit "minor" is dropped. A dispute with no severity is still
asked - the lexicon sets "critical" deliberately, so an unlabelled one is more
likely a shape we did not anticipate than a question not worth asking.
"""

import pytest

from engine import prompts
from engine import translate as T
from engine.client import Usage

LEXICON_HIT = {
    "phrase": "कल",
    "readings": [{"label": "yesterday"}, {"label": "tomorrow"}],
    "severity": "critical",
    "source": "lexicon",
}


def dispute(phrase, severity, kind="source_ambiguous"):
    return {
        "phrase": phrase,
        "kind": kind,
        "severity": severity,
        "readings": [{"label": "one"}, {"label": "two"}],
    }


@pytest.fixture
def asked(monkeypatch):
    """Record which phrases reached _question, without a model call."""
    seen = []

    async def fake_question(phrase, readings, source_lang, usage):
        seen.append(phrase)
        return {"phrase": phrase, "question": "?", "options": [], "severity": "critical"}

    monkeypatch.setattr(T, "_question", fake_question)
    return seen


# The sentence the disputes are about. Every phrase these tests put to
# `_ask_the_child` has to appear in it, because the other guard on that path
# drops a phrase the child never wrote - which is the whole of #86. A fixture
# of "some text" quietly tested nothing once that landed: all three disputes
# were rejected for the wrong reason and the severity rule was never reached.
CHILD_WROTE = (
    "कल छुट्टी के बाद उसने मेरा टिफ़िन लिया और कहा देख लेगा, "
    "ब्रेक में और कुछ भी हुआ"
)


async def ask(disputes, found=None):
    return await T._ask_the_child(CHILD_WROTE, disputes, found or [], "hi", Usage())


async def test_a_minor_dispute_is_not_put_to_the_child(asked):
    await ask([dispute("टिफ़िन", "minor")])
    assert asked == [], "nothing an adult does turns on which object it was"


async def test_a_critical_dispute_still_is(asked):
    await ask([dispute("देख लेगा", "critical")])
    assert asked == ["देख लेगा"]


async def test_a_dispute_with_no_severity_is_still_asked(asked):
    # Fail towards asking: an unlabelled dispute is an unfamiliar shape, not a
    # judgement that it does not matter.
    # The phrase has to be one the child wrote, or the other guard drops it
    # first and this test passes for a reason it is not about.
    await ask([{"phrase": "और कुछ", "kind": "source_ambiguous", "readings": [{}, {}]}])
    assert asked == ["और कुछ"]


async def test_dropping_a_minor_frees_the_slot_for_a_real_one(asked):
    # The whole point. Two slots; before this, the first two in the list won,
    # whatever they were worth.
    await ask([
        dispute("टिफ़िन", "minor"),
        dispute("ब्रेक", "minor"),
        dispute("देख लेगा", "critical"),
    ])
    assert asked == ["देख लेगा"]


async def test_the_lexicon_still_goes_first_and_the_cap_still_holds(asked):
    await ask(
        [dispute("देख लेगा", "critical"), dispute("और कुछ", "critical")],
        found=[LEXICON_HIT],
    )
    assert asked == ["कल", "देख लेगा"]
    assert len(asked) == 2, "a child is never asked more than two questions"


async def test_a_translation_error_is_still_never_the_childs_problem(asked):
    # Unchanged, and pinned here because the new `continue` sits right where
    # this rule is enforced: our own mistake is not something to make a child
    # adjudicate, whatever severity the judge gave it.
    await ask([dispute("whatever", "critical", kind="translation_error")])
    assert asked == []

# --- the other half: the prompt that stops it being reported at all ----------


def test_the_judge_is_told_that_which_thing_it_was_is_never_critical():
    # The code above can only drop what the judge labels. These two lines are
    # what stops the question being generated, and both have been lost in a
    # merge before now, so they are written down rather than trusted.
    assert "WHICH THING IT WAS is not critical" in prompts.JUDGE_SYSTEM
    assert "do not report" in prompts.JUDGE_SYSTEM


def test_the_translator_is_told_not_to_hand_a_teacher_a_word_they_cannot_use():
    # "Tiffin" in a German sentence tells a teacher nothing. The child's own
    # version keeps their word; the adult's version has to be readable.
    assert "Brotdose" in prompts.TRANSLATE_SYSTEM
    # Short enough not to straddle the prompt's own line wrap.
    assert "stay as the child wrote them" in prompts.TRANSLATE_SYSTEM


def test_the_judge_is_told_that_when_it_happened_is_critical():
    """Vernika's review of #80, and the regression it caught.

    This PR is the first time `severity` decides whether a child is asked
    anything: before it, `_ask_the_child` asked every `source_ambiguous`
    dispute whatever its severity, so the definition above only had to be
    roughly right. Now a `minor` dispute is dropped in code, which means every
    category missing from that definition is silently never asked.

    "When" was missing from it, and timing is the exact failure CLAUDE.md
    documents at length: "kal chhutti ke baad chaaku leke aayega" became "nach
    den Ferien" instead of "morgen nach der Schule" - a knife threat that lost
    its timing. `kal` and `chhutti` are in the word list, and lexicon hits
    reach the child without passing the severity gate, so those two words were
    never at risk. The model check is what covers the words nobody has added
    yet: "he said he'd come for me after the break" is in no list.
    """
    assert "WHEN it happened or will happen" in prompts.JUDGE_SYSTEM


def test_the_test_the_judge_applies_asks_about_when_too():
    """The paragraph that decides whether a phrase is reported at all.

    Left as it was, it told the judge the opposite of the line above: for a
    timing ambiguity both readings leave *what was done* identical, so "if
    both readings leave what was done to this child the same, do not report
    it" ruled out exactly the knife-on-Tuesday case.
    """
    assert '"what was done to this child", AND WHEN, the same' in prompts.JUDGE_SYSTEM

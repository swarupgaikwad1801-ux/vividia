"""Nothing is ever quoted back to a child that they did not write.

Swarup ran the app and typed "I dont feel good". The screen showed his words
beside a German sentence about a bag being taken, and then asked him what he
had meant by "laughed at me" - a phrase he never wrote. That particular screen
was the mock engine (see #84), but the shape of it was possible for real.

Questions reach the child from two places:

  _find_ambiguity   the model's own list, which has filtered invented phrases
                    since the day it was written - the comment there reads
                    "asking a child what they meant by words they never used
                    is worse than asking nothing"
  _ask_the_child    the judge's `source_ambiguous` disputes, which were
                    passed straight through, unchecked

So we had already met this failure, written the guard, and applied it to one
of the two doors. This file pins the rule to both, and to a third place: the
repair prompt, where a phrase is quoted as 'where the child wrote "X"' and an
invented one becomes an instruction to put words into the German that the
child never said.

No model calls: `_ask_the_child` is driven directly with a fake `_question`.
"""

import pytest

from engine import translate as T
from engine.client import Usage

CHILD = "he said he would get me after school"


def dispute(phrase, kind="source_ambiguous"):
    return {
        "phrase": phrase,
        "kind": kind,
        "severity": "critical",
        "readings": [{"label": "one"}, {"label": "two"}],
    }


@pytest.fixture
def asked(monkeypatch):
    seen = []

    async def fake_question(phrase, readings, source_lang, usage):
        seen.append(phrase)
        return {"phrase": phrase, "question": "?", "options": [], "severity": "critical"}

    monkeypatch.setattr(T, "_question", fake_question)
    return seen


async def ask(text, disputes, found=None):
    return await T._ask_the_child(text, disputes, found or [], "en", Usage())


# --- the bug -----------------------------------------------------------------


async def test_a_phrase_the_child_never_wrote_is_not_put_to_them(asked):
    # The screen that started this: the child wrote about being got after
    # school, and the question was about laughing.
    await ask(CHILD, [dispute("laughed at me")])
    assert asked == []


async def test_a_phrase_the_child_did_write_is_still_asked(asked):
    await ask(CHILD, [dispute("get me")])
    assert asked == ["get me"]


async def test_an_invented_phrase_does_not_use_up_a_real_ones_slot(asked):
    # Only two questions ever reach the child. Before this, an invented
    # phrase could take one of them.
    await ask(CHILD, [dispute("laughed at me"), dispute("get me")])
    assert asked == ["get me"]


async def test_an_empty_or_missing_phrase_is_dropped_rather_than_quoted(asked):
    await ask(CHILD, [dispute(""), {"kind": "source_ambiguous", "readings": [{}, {}]}])
    assert asked == []


# --- the rule itself ---------------------------------------------------------


@pytest.mark.parametrize(
    "phrase,text,expected",
    [
        ("get me", CHILD, True),
        # Punctuation and spacing must not matter: the child's sentence and
        # the model's quote of it rarely agree on those.
        ("get me", "He said, he would GET ME... after school!", True),
        ("laughed at me", CHILD, False),
        ("", CHILD, False),
        # Devanagari: whole words on the raw text. "देख लेगा" is in the
        # sentence; "दीदी" is not, and must not match on bare consonants.
        ("देख लेगा", "उसने कहा कल छुट्टी के बाद देख लेगा", True),
        ("दीदी", "उसने कहा कल छुट्टी के बाद देख लेगा", False),
    ],
)
def test_the_rule(phrase, text, expected):
    assert T._said_by_the_child(phrase, text) is expected


def test_the_devanagari_case_is_the_one_that_needed_the_whole_word_rule():
    """`_normalise` would have let the invented phrase through.

    It strips Devanagari vowel signs, so दीदी becomes two bare consonants
    that appear inside "बाद देख". A substring rule would call that the
    child's own words.
    """
    invented, sentence = "दीदी", "उसने कहा कल छुट्टी के बाद देख लेगा"
    assert T._normalise(invented) in T._normalise(sentence), "the trap is real"
    assert not T._said_by_the_child(invented, sentence), "and the rule avoids it"


# --- the third door: the repair prompt ---------------------------------------


def test_the_repair_prompt_never_names_a_phrase_the_child_did_not_write():
    # Not shown to the child, but quoted into the prompt as 'where the child
    # wrote "X"', which is an instruction to put those words in the German.
    import inspect

    source = inspect.getsource(T._verify)
    assert "_said_by_the_child" in source, (
        "meaning_lost phrases go into the repair prompt and must be checked "
        "against the child's sentence like everything else"
    )

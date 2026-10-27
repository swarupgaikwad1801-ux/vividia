r"""Devanagari forms must be matched on the text, not on its skeleton.

`_normalise` exists to compare two whole strings - "is the model's output the
same as the child's input?" - where shredding both sides identically is
harmless. Reusing it to search for a form inside a sentence is where it
breaks: it replaces everything that is not `\w` with a space, Devanagari
vowel signs are not `\w` in Python's `re`, and so a form collapses to its
bare consonants before it is used as a needle.

    देख लूँगा  ->  'द ख ल ग'
    दीदी      ->  'द द'

A needle of two consonants matches across word boundaries. That is how
"उसने कहा कल छुट्टी के बाद देख लेगा।" - a threat - came back on 26 Oct as
"er werde es morgen nach den Ferien ansehen" ("he'll look at it").
The sentence reported four matches, one of them the spurious *didi* from
"बाद देख", and only the first two are ever asked about.
"""
import json
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from engine.translate import _form_in, _normalise, lexicon_ambiguities

REPO_ROOT = Path(__file__).resolve().parents[2]

# The sentence from Neel's live run on 26 Oct.
THREAT = "उसने कहा कल छुट्टी के बाद देख लेगा।"


def phrases(text, lang):
    return [item["phrase"] for item in lexicon_ambiguities(text, lang)]


def test_the_shredding_that_caused_it_is_real():
    """Pin the mechanism, so a future change to _normalise cannot quietly
    re-enable this by making the needles short again."""
    assert _normalise("दीदी") == "द द"
    assert _normalise("देख लूँगा") == _normalise("देख लेगा")


def test_didi_does_not_match_the_letters_of_other_words():
    assert "didi" not in phrases(THREAT, "hi")
    assert "didi" not in phrases("बाद दो", "hi")


def test_didi_still_matches_a_real_didi():
    assert "didi" in phrases("मेरी दीदी आई", "hi")
    assert "didi" in phrases("didi ne kaha", "hi")


def test_the_third_person_future_threat_is_matched():
    """देख लेगा used to match only because देख लूँगा shredded to the same
    consonants. With raw matching that accident is gone, so the form itself
    has to be in the list - the two changes only work together."""
    assert "dekh lena" in phrases("वो देख लेगा", "hi")
    assert "dekh lena" in phrases("woh dekh lega", "hi")


def test_the_threat_is_asked_about_before_the_timing():
    """Only two questions reach the child (`ask_about[:2]`). Whether this is
    a threat has to be settled before when it happens: read as "take a look
    at it", the sentence is harmless and its timing does not matter."""
    found = phrases(THREAT, "hi")
    assert found[0] == "dekh lena", found
    assert set(found[:2]) == {"dekh lena", "kal"}, found


def test_ask_first_entries_are_marked_in_the_content_file():
    data = json.loads(
        (REPO_ROOT / "content" / "ambiguous_words.json").read_text(encoding="utf-8")
    )["languages"]
    marked = {
        (lang, entry["word"])
        for lang, entries in data.items()
        if not lang.startswith("_")
        for entry in entries
        if entry.get("ask_first")
    }
    assert marked == {("hi", "dekh lena"), ("en", "get me")}, marked


@pytest.mark.parametrize("form, text, hit", [
    ("दीदी", "मेरी दीदी", True),
    ("दीदी", "बाद देख", False),
    ("देख लेगा", "वो देख लेगा।", True),
    ("देख लेगा", "वो देख लेना", False),
    ("कल", "कल स्कूल", True),
    ("कल", "कला की क्लास", False),   # कला (art) is not कल
])
def test_devanagari_forms_match_on_the_text_itself(form, text, hit):
    assert _form_in(form, text) is hit


@pytest.mark.parametrize("form, text, hit", [
    ("chhed", "woh chhedkar bhaagta hai", True),   # substring, as before
    ("kal", "kal chhutti", True),
    ("get me", "he will get me, later", True),
])
def test_latin_forms_keep_the_matching_they_had(form, text, hit):
    """Latin forms still go through _normalise on both sides. The bug was
    specific to scripts whose marks _normalise drops, and narrowing Latin
    matching here would be a second, unrequested change."""
    assert _form_in(form, text) is hit


def test_a_sentence_ending_in_a_danda_still_matches():
    """। (U+0964) is the Hindi full stop. It sits inside the Devanagari block,
    so a word-edge class written as the whole block treats it as a letter and
    makes every word at the end of a Hindi sentence unmatchable."""
    assert "dekh lena" in phrases("वो देख लेगा।", "hi")
    assert "dekh lena" in phrases("वो देख लेगा", "hi")
    # Same for a child on English screens writing Devanagari (#70's path).
    assert "dekh lena" in phrases("वो देख लेगा।", "en")


def test_nakal_is_not_kal():
    """From hi_core: "क्लास वाले मेरी नकल उड़ाते हैं" (the class mimics me).
    Shredding matched कल inside नकल, so a child reporting mockery was asked
    whether they meant yesterday or tomorrow."""
    assert phrases("क्लास वाले मेरी नकल उड़ाते हैं", "hi") == []

"""A word-list question quotes the child's own spelling, never the headword.

The word list files every form under one headword. The live engine used to
put that headword in quotation marks on the child's screen: a child who
wrote "chhedte" was asked about "chhedna", and one who wrote "कल" was asked
about "kal", in an alphabet they had not used. The mock was fixed first
(#87); this is the same rule for the engine that judges actually use.
"""

import pytest

from engine.translate import _said_by_the_child, lexicon_ambiguities


def asked(text: str, lang: str) -> dict[str, str]:
    """{headword: the phrase the child would see}."""
    return {item["word"]: item["phrase"] for item in lexicon_ambiguities(text, lang)}


@pytest.mark.parametrize(
    ("text", "lang", "word", "shown"),
    [
        ("woh mujhe roz chhedte hain", "hi", "chhedna", "chhedte"),
        ("उसने कहा कल छुट्टी के बाद देख लेगा।", "hi", "kal", "कल"),
        ("Kal chhutti ke baad", "hi", "kal", "Kal"),
        # A Latin form can match inside a longer word; the child sees the
        # word they wrote, not a fragment of it.
        ("woh chhedkar bhaag gaya", "hi", "chhedna", "chhedkar"),
    ],
)
def test_the_question_quotes_what_the_child_typed(text, lang, word, shown):
    assert asked(text, lang).get(word) == shown


def test_every_quoted_phrase_passes_the_rule_model_phrases_already_pass():
    # `_said_by_the_child` guards every phrase a model returns. Word-list hits
    # never went through it, which is how the headword reached the screen.
    for text in [
        "woh mujhe roz chhedte hain",
        "उसने कहा कल छुट्टी के बाद देख लेगा।",
        "kal chhutti ke baad",
    ]:
        for item in lexicon_ambiguities(text, "hi"):
            assert _said_by_the_child(item["phrase"], text), (item["phrase"], text)

"""Does the reviewed word list ask about 'kal' exactly when tense cannot settle it?

Hindi *kal* is both "tomorrow" and "yesterday". `content/ambiguous_words.json`
skips the question when the sentence carries a future or past verb, because
then the tense decides. Those skip patterns used `\\b`, which never matches
after a Devanagari vowel sign (U+093E `ा` is category Mn, not a word
character), so in Hindi script the skip never fired and every *kal* was
asked about. These cases pin both scripts in both directions.

Offline; no model calls. `lexicon_ambiguities` reads only the content file.
"""

import pytest

from engine.translate import lexicon_ambiguities


def asks_about_kal(text: str) -> bool:
    return any(found["phrase"] == "kal" for found in lexicon_ambiguities(text, "hi"))


@pytest.mark.parametrize(
    "text",
    [
        "woh kal school aayega",  # future, Latin
        "woh kal aaya tha",  # past, Latin
        "वो कल आएगा",  # future, Devanagari
        "वो कल आया था",  # past, Devanagari
        "वो कल मुझे मारेगी",  # future, feminine
        "कल उसने मेरा बैग छीन लिया था",  # past perfect
        "कल वो लोग आएंगे",  # future plural: ends in ग + े
        "कल बहुत बुरा हुआ",  # past, हुआ
        "कल वो आएगा",  # future after a vowel stem: ए before गा
        "कल वो जाएँगी",  # future plural feminine, with chandrabindu
        "कल मैं बताऊँगी",  # first person: ऊँ before गी
        "कल तुम करोगे",  # second person: ो before गे
    ],
)
def test_a_tense_marker_settles_kal_so_the_child_is_not_asked(text):
    assert not asks_about_kal(text), f"asked about kal in {text!r}, but the verb settles it"


@pytest.mark.parametrize(
    "text",
    [
        "kal ke baare me bata",  # no verb tense
        "कल वाली बात",  # "the kal thing": no verb at all
        "कल स्कूल के बाद",  # "kal after school": a threat's timing, unsettled
        "woh kal",
        # Nouns ending in -गी/-गा are not future verbs (found by Swarup, #35).
        # Skipping on them makes the app silently pick yesterday or tomorrow.
        "कल ज़िंदगी",  # zindagi, life
        "कल मुर्गी",  # murgi, hen
        "कल ज़िंदगी बुरी है",  # present tense: nothing settles kal
        "कल रोगी",  # rogi, a sick person: has the ो a future ending has
        "कल उपयोगी",  # upyogi, useful
        "कल उन्होंने मुझे गूंगा बोला",  # "called me mute": गूंगा is an insult, not a verb
    ],
)
def test_without_a_tense_marker_kal_is_asked_about(text):
    assert asks_about_kal(text), f"did not ask about kal in {text!r}"


def test_a_tense_word_glued_inside_another_word_does_not_count():
    """The lookarounds must still respect word edges: था inside a longer
    Devanagari word is not the past-tense marker."""
    assert asks_about_kal("कल थाली")  # "kal plate": थाली starts with था

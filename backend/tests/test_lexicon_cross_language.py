"""Does the reviewed word list still ask when the child writes in another language
than the one their screens are in?

`source_lang` is the language of the child's screens (`Write.tsx` sends the
UI language). A child who reads English best may still write Hindi, usually
in Latin letters. Until 26 Oct only the screen language's list was read, so
"kal chhutti ke baad chaaku leke aayega" on English screens never asked about
kal or chhutti: the knife-threat case the list exists for.

Offline; no model calls. `lexicon_ambiguities` reads only the content file.
"""

import pytest

from engine.translate import lexicon_ambiguities


def phrases(text: str, lang: str) -> set[str]:
    return {found["phrase"] for found in lexicon_ambiguities(text, lang)}


@pytest.mark.parametrize(
    "text, expected",
    [
        # The benchmark sentence, typed on English screens.
        ("kal chhutti ke baad chaaku leke aayega", {"kal", "chhutti"}),
        # Mixed English and Hinglish, the way children actually type.
        ("He said kal chhutti ke baad he will bring a knife", {"kal", "chhutti"}),
        # Hindi script on English screens.
        ("कल छुट्टी के बाद", {"kal", "chhutti"}),
        ("my bhaiya hits me", {"bhaiya"}),
        ("didi took my phone", {"didi"}),
        ("usne kaha dekh lena", {"dekh lena"}),
    ],
)
def test_hindi_words_on_english_screens_are_asked_about(text, expected):
    assert expected <= phrases(text, "en"), f"missed {expected - phrases(text, 'en')} in {text!r}"


def test_english_words_on_hindi_screens_are_asked_about():
    """The same gap the other way round: Hindi screens, English sentence."""
    assert "get me" in phrases("he said he would get me after school", "hi")


def test_a_tense_word_from_the_screen_language_does_not_silence_kal():
    """Hindi past-tense "the" (थे) is English "the". Applying Hindi's skip
    patterns to mixed text would skip kal here and silently pick a day."""
    assert "kal" in phrases("kal the teacher hit me", "en")


@pytest.mark.parametrize(
    "text",
    [
        "I ate kale at lunch",  # "kal" inside an English word
        "we made a kaleidoscope in art",
        "woh mujhe class se nikal deta hai",  # "kal" inside Hinglish "nikal"
        "कला की क्लास में",  # कला (art): _normalise would turn it into कल
        "I didn't tell anyone",  # "didi" inside "didn't"
        "he played football with me at break",
    ],
)
def test_another_languages_word_inside_a_longer_word_is_not_that_word(text):
    assert phrases(text, "en") == set(), f"false alarm in {text!r}: {phrases(text, 'en')}"


@pytest.mark.parametrize(
    "text, lang",
    [
        ("he said he would get me after school", "en"),
        ("woh kal", "hi"),
        ("कल स्कूल के बाद", "hi"),
        ("woh kal aaya tha", "hi"),  # tense settles it: still not asked
    ],
)
def test_the_screen_languages_own_list_behaves_exactly_as_before(text, lang):
    """Nothing changes for a child writing in their screen language: same
    matching, same tense skips. Only other languages' lists are new."""
    from engine import translate

    own_only = []
    haystack = translate._normalise(text)
    for entry in translate._ambiguous_words().get(lang, []):
        skip = entry.get("skip_when", {}).get("patterns", [])
        if any(translate.re.search(p, text, translate.re.IGNORECASE | translate.re.UNICODE) for p in skip):
            continue
        if any(translate._normalise(form) in haystack for form in entry["forms"]):
            own_only.append(entry["word"])

    found = [item["phrase"] for item in lexicon_ambiguities(text, lang)]
    assert found[: len(own_only)] == own_only, "the screen language's own matches must come first, unchanged"
    assert set(found) - set(own_only) == set(), f"a foreign-list match appeared in {text!r}: {found}"


def test_a_german_speaking_child_writing_hinglish_is_asked_too():
    assert "kal" in phrases("Er hat gesagt kal nach der Schule", "de")


def test_every_match_is_a_full_lexicon_item():
    for item in lexicon_ambiguities("kal chhutti ke baad", "en"):
        assert item["source"] == "lexicon"
        assert item["severity"] == "critical"
        assert len(item["readings"]) >= 2
        assert all("meaning" in r and "target_phrasing" in r for r in item["readings"])

"""Two things the card said that were not true, and the tests that hold them.

Both found by Neel running the live app (issue #5).

**"1 entries".** `_period` built the count as `f"{n} {labels['entries']}"`, so a
timeline of one read "1 entries" in English and "1 Einträge" in German. A
timeline of one is the ordinary case, not an edge case - the first thing a
child does is write one thing down, and the first card they can hand over has
one entry on it. The card is the single document meant to be read by an adult
who may act on it, and software that cannot count to one does not read like
something built carefully.

**"from notes they wrote themselves" / "in their own words".** True when every
sentence was typed. Since the app asks the picture questions first (#3), some
lines are sentences the child *tapped*, written in advance by us. The frontend
marks those "Aus Bildern gewählt", but that flag never leaves the phone, so the
backend cannot tell the two kinds apart - which means the header has to be true
of both or it is false of some. The claim that survives both is not authorship
but approval: tapped or typed, the child read the sentence and confirmed it.

These are assertions about text an adult reads, so they are pinned here rather
than left to a reviewer noticing. The German and Hindi still need a native read
before submission.
"""

import pytest

from engine import mock
from engine.report import report
from engine.report_text import FOOTER, HEADER, LABELS, count_label_for

LANGS = ["en", "hi", "de"]


def entries(count: int) -> list[dict]:
    return [
        {
            "id": f"e{i}",
            "date": f"2026-10-{20 + i:02d}",
            "text_child": f"entry {i}",
            "text_de": f"Eintrag {i}",
        }
        for i in range(count)
    ]


# --- counting ----------------------------------------------------------------


@pytest.mark.parametrize("lang", LANGS)
def test_one_entry_uses_the_singular(lang):
    assert count_label_for(1, lang) == f"1 {LABELS[lang]['entry']}"
    assert count_label_for(2, lang) == f"2 {LABELS[lang]['entries']}"


@pytest.mark.parametrize("lang", LANGS)
def test_every_language_distinguishes_one_from_many(lang):
    singular, plural = LABELS[lang]["entry"], LABELS[lang]["entries"]
    assert singular and plural
    assert singular != plural, f"{lang} needs a real singular, not a copy"


@pytest.mark.parametrize("lang", LANGS)
def test_an_unknown_language_still_counts_correctly(lang):
    # Falls back to English rather than crashing or printing a bare number.
    assert count_label_for(1, "uk") == f"1 {LABELS['en']['entry']}"


async def test_a_card_with_one_entry_never_says_1_entries():
    result = await report(entries(1), "hi")
    for version in (result["german_version"], result["child_version"]):
        assert "1 Einträge" not in version
        assert "1 entries" not in version
        assert f"1 {LABELS['hi']['entries']}" not in version
    assert f"1 {LABELS['de']['entry']}" in result["german_version"]


async def test_a_card_with_three_entries_still_says_entries():
    result = await report(entries(3), "de")
    assert f"3 {LABELS['de']['entries']}" in result["german_version"]


async def test_the_mock_counts_to_one_too():
    # Mock mode is what a judge sees if the key is missing, so its example text
    # has to survive being read.
    one = await mock.report(entries(1), "de")
    assert "In 1 Fällen" not in one["german_version"]
    assert "1 times" not in one["child_version"]
    many = await mock.report(entries(4), "de")
    assert "In 4 Fällen" in many["german_version"]


# --- what the card claims about its own words --------------------------------


@pytest.mark.parametrize("lang", LANGS)
def test_the_header_does_not_claim_the_child_wrote_every_line(lang):
    text = HEADER[lang]
    # The exact claims the header used to make, each of which says the child
    # typed the lines. "picked or wrote themselves" is fine and is what it now
    # says, so the banned text has to be the old phrase and not a fragment of
    # it - the first version of this test failed on its own fix.
    for only_written in (
        "notes they wrote themselves",
        "aus eigenen Notizen",
        "अपने लिखे नोट्स से",
    ):
        assert only_written not in text, (
            "Picture questions come first, so some lines were tapped, not "
            "written. The header is read by an adult deciding what to do."
        )


@pytest.mark.parametrize("lang", LANGS)
def test_the_footer_does_not_claim_every_line_is_the_childs_own_words(lang):
    text = FOOTER[lang]
    for only_written in ("in their own words", "seinen eigenen Worten", "उनके ही शब्दों में"):
        assert only_written not in text


@pytest.mark.parametrize("lang", LANGS)
def test_the_frame_still_says_the_child_both_chose_and_approved(lang):
    # The two claims that are true of a tapped line and a typed line alike.
    # Written per language rather than as a keyword search, so a wording change
    # in one language cannot quietly pass on another language's word.
    chose = {"en": "picked or wrote", "de": "ausgewählt oder geschrieben", "hi": "चुना या लिखा"}
    approved = {"en": "approved", "de": "bestätigt", "hi": "मंज़ूर"}
    frame = HEADER[lang] + " " + FOOTER[lang]
    assert chose[lang] in frame
    assert approved[lang] in frame


@pytest.mark.parametrize("lang", LANGS)
async def test_the_card_still_carries_the_frame_and_the_childs_sentence(lang):
    result = await report(entries(2), lang)
    assert HEADER["de"] in result["german_version"]
    assert FOOTER["de"] in result["german_version"]
    assert HEADER[lang] in result["child_version"]
    # The promise the module exists for: the approved sentence, unchanged.
    assert "Eintrag 1" in result["german_version"]

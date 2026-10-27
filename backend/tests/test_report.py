"""Does the report still contain the child's own words?

By the time a timeline reaches `report()`, each entry's `text_de` is a sentence
the child read and approved word by word. The adult acts on what this document
says, so the one thing that must never happen is a paraphrase replacing an
approved sentence.

So most of these tests are about what the report does NOT do: not summarise
the entries away, not judge them, not diagnose anyone, not decide that any of
it is true, and not put a word like "bullying" on the child's account on their
behalf.

The timeline used is the five approved entries from `content/demo_story.json`,
read read-only, so the test and the one-click demo cannot drift apart.

A report makes no model calls, so there is nothing to replay here.
"""

import json

import pytest

from app.schemas import ReportResponse
from engine.client import EngineError
from engine.config import REPO_ROOT
from engine.report import report
from engine.report_text import (
    FOOTER,
    HEADER,
    LABELS,
    OVERVIEW_LABELS,
    PLACES,
    format_date,
    overview_for,
    place_for,
)

DEMO = json.loads(
    (REPO_ROOT / "content" / "demo_story.json").read_text(encoding="utf-8")
)
TIMELINE = DEMO["timeline"]
CHILD_LANG = DEMO["persona"]["child_lang"]

# Words that would turn a record into an assessment. Checked against the
# frame and the overview, never against the child's own sentences: those are
# theirs and may say anything.
JUDGEMENT = [
    "traumatised", "traumatized", "distressed", "struggling", "vulnerable",
    "isolated", "victim", "bullying", "harassment", "clearly", "obviously",
    "proven", "confirmed", "credible", "serious case",
    "traumatisiert", "offensichtlich", "bewiesen", "glaubhaft", "mobbing",
    "opfer", "schikane",
]


# --- the child's words survive ----------------------------------------------


async def test_every_approved_german_sentence_appears_untouched():
    """The sentences the child confirmed word by word are what the adult reads.
    A summary in their place would be a paraphrase nobody approved."""

    result = await report(TIMELINE, CHILD_LANG)

    for entry in TIMELINE:
        assert entry["text_de"] in result["german_version"], (
            f"approved sentence missing or altered: {entry['text_de']!r}"
        )


async def test_every_sentence_the_child_wrote_appears_in_their_own_version():
    """The child approves what they can read, so their version has to carry the
    same entries, or they are approving something they never saw."""

    result = await report(TIMELINE, CHILD_LANG)

    for entry in TIMELINE:
        assert entry["text_child"] in result["child_version"]


async def test_the_place_and_the_people_stay_in_the_childs_words():
    """"two older boys" is the child's description. It must not be tidied into
    a category by us or by a model."""

    result = await report(TIMELINE, CHILD_LANG)

    assert "two older boys" in result["child_version"]
    assert "some kids in my class" in result["child_version"]


async def test_the_entries_are_in_date_order():

    result = await report(TIMELINE, CHILD_LANG)
    positions = [
        result["german_version"].index(entry["text_de"])
        for entry in sorted(TIMELINE, key=lambda e: e["date"])
    ]

    assert positions == sorted(positions), "the timeline is out of order"


# --- the frame is ours, and says what this is not ---------------------------


async def test_the_header_and_footer_are_the_fixed_text():
    """An adult reading a tidy German document may assume a professional made
    it. The frame says a child did, and it is not model-generated."""

    result = await report(TIMELINE, CHILD_LANG)

    assert HEADER["de"] in result["german_version"]
    assert FOOTER["de"] in result["german_version"]
    assert HEADER[CHILD_LANG] in result["child_version"]
    assert FOOTER[CHILD_LANG] in result["child_version"]


async def test_the_report_never_says_any_of_it_is_proven():
    """CLAUDE.md: never a judgement that an allegation is true. The footer
    states plainly that this records what the child said happened."""

    result = await report(TIMELINE, CHILD_LANG)

    assert "what the child said happened" in result["child_version"]
    assert "nicht ist" in result["german_version"], "the German footer is missing its limits"


async def test_neither_version_judges_diagnoses_or_labels():
    """Checked against everything except the child's own sentences, which are
    theirs and may say anything they like."""

    result = await report(TIMELINE, CHILD_LANG)

    for version in ("child_version", "german_version"):
        text = result[version]
        for entry in TIMELINE:
            text = text.replace(entry["text_child"], "").replace(entry["text_de"], "")
        for word in JUDGEMENT:
            assert word not in text.lower(), f"{version} says {word!r}"


# --- the overview: the reason this module has no model in it ---------------
#
# Neel's review on PR #19: the first draft asked a model for the German
# overview and the child's overview as two independent strings in one call.
# The child can only read and approve the one in their own language, so
# nothing made the German say the same thing - an unapproved, unverified
# German paragraph in front of the adult, in the one document whose promise is
# that the adult reads only what the child approved.


async def test_the_two_overviews_say_the_same_thing():
    """The test the review asked for. Built from the same entries by the same
    template, so approving one really is approving the other."""
    result = await report(TIMELINE, CHILD_LANG)

    german = overview_for(TIMELINE, "de")
    child = overview_for(TIMELINE, CHILD_LANG)

    assert german in result["german_version"]
    assert child in result["child_version"]
    # Same number of facts on each side: same places, same people.
    assert german.count(",") == child.count(",")
    assert german.count(":") == child.count(":")


async def test_the_people_are_identical_in_both_versions():
    """They are the child's own words, quoted, so they are the same bytes in
    both. If these ever differed, one of the two readers would be seeing a
    description the other is not."""
    german = overview_for(TIMELINE, "de")
    child = overview_for(TIMELINE, CHILD_LANG)

    def people(text):
        line = [l for l in text.splitlines() if ":" in l][-1]
        return line.split(":", 1)[1].strip()

    assert people(german) == people(child)
    assert '"two older boys"' in people(german)


async def test_each_place_is_the_same_place_in_both_versions():
    """The German says Klassenzimmer where the English says classroom. Those
    have to be the same code, not two independent guesses."""
    german = overview_for(TIMELINE, "de").splitlines()[0].split(":", 1)[1]
    child = overview_for(TIMELINE, CHILD_LANG).splitlines()[0].split(":", 1)[1]

    german_places = [p.strip() for p in german.split(",")]
    child_places = [p.strip() for p in child.split(",")]

    assert len(german_places) == len(child_places)
    for de_place, child_place in zip(german_places, child_places):
        code = next(
            (c for c, by_lang in PLACES.items() if by_lang["de"] == de_place), None
        )
        assert code is not None, f"{de_place} is not a known place code"
        assert PLACES[code][CHILD_LANG] == child_place


async def test_the_overview_lists_rather_than_summarises():
    """It adds what the period line does not carry, and nothing it invents."""
    result = await report(TIMELINE, CHILD_LANG)

    assert OVERVIEW_LABELS["de"]["places"] in result["german_version"]
    assert OVERVIEW_LABELS["de"]["people"] in result["german_version"]
    # Every place in the overview came from an entry
    for entry in TIMELINE:
        assert place_for(entry["place"], "de") in result["german_version"]


async def test_an_entry_the_child_gave_no_place_for_adds_nothing():
    sparse = [{**TIMELINE[0], "place": None, "people": None}]

    assert overview_for(sparse, "de") == ""


async def test_the_overview_never_merges_two_descriptions():
    """"two older boys" and "the two older boys" stay separate. Merging them
    would be us deciding they are the same people."""
    german = overview_for(TIMELINE, "de")

    assert '"two older boys"' in german
    assert '"the two older boys"' in german


async def test_the_report_leaves_no_gap_where_the_model_used_to_be():
    """No stray blank block, and nothing that reads like a missing step."""
    result = await report(TIMELINE, CHILD_LANG)

    assert "\n\n\n" not in result["german_version"]
    for word in ("unavailable", "error", "null", "nicht verfügbar", "tbd"):
        assert word not in result["german_version"].lower()


# --- shape, cost and edges ---------------------------------------------------


async def test_the_result_matches_the_frozen_contract():

    result = await report(TIMELINE, CHILD_LANG)
    body = ReportResponse(
        child_version=result["child_version"],
        german_version=result["german_version"],
        usage=result["usage"],
    )

    assert body.child_version and body.german_version


async def test_a_report_costs_no_model_calls_at_all():
    """Every part of the document is either the child's approved words or
    fixed text, so there is nothing to pay for and no outage to handle."""
    result = await report(TIMELINE, CHILD_LANG)

    assert result["usage"]["calls_made"] == 0
    assert result["usage"]["estimated_cost_usd"] == 0.0


async def test_a_german_speaking_child_is_not_shown_the_same_text_twice():

    result = await report(TIMELINE, "de")

    assert result["child_version"] == result["german_version"]


async def test_a_language_we_have_no_labels_for_still_gets_a_readable_report():
    """A child writing Ukrainian today must not get a blank or broken document:
    the labels fall back to English, and their own sentences are still theirs."""

    result = await report(TIMELINE, "uk")

    assert HEADER["en"] in result["child_version"]
    for entry in TIMELINE:
        assert entry["text_child"] in result["child_version"]


async def test_one_entry_is_enough():

    result = await report(TIMELINE[:1], CHILD_LANG)

    assert TIMELINE[0]["text_de"] in result["german_version"]
    # Singular. This line used to assert the plural, which is how "1 Einträge"
    # survived a green suite until Neel read a real card (issue #5).
    assert f"1 {LABELS['de']['entry']}" in result["german_version"]


async def test_an_empty_timeline_is_refused_rather_than_handed_over():
    """An empty report given to a teacher is worse than an error."""

    with pytest.raises(EngineError) as raised:
        await report([], CHILD_LANG)

    assert raised.value.code == "invalid_input"


async def test_an_entry_with_no_place_or_people_still_renders():
    sparse = [{**TIMELINE[0], "place": None, "people": None}]

    result = await report(sparse, CHILD_LANG)

    assert sparse[0]["text_de"] in result["german_version"]
    # "Wo" on its own also occurs inside "Worten" in the footer, so the label
    # is only a label when it is followed by its colon.
    assert f"{LABELS['de']['where']}: " not in result["german_version"]
    assert f"{LABELS['de']['who']}: " not in result["german_version"]


# --- dates -------------------------------------------------------------------


async def test_german_dates_are_written_the_way_a_german_teacher_reads_them():

    result = await report(TIMELINE, CHILD_LANG)

    assert "06.10.2026" in result["german_version"]
    assert "2026-10-06" not in result["german_version"]


def test_a_date_we_cannot_parse_is_passed_through_not_dropped():
    """It is still the child's data."""
    assert format_date("sometime in October", "de") == "sometime in October"
    assert format_date("", "de") == ""


# --- place and people: translated only where we can do it honestly ----------


async def test_a_known_place_is_rendered_in_the_readers_language():
    """A German teacher should read "Klassenzimmer", not "classroom". Place
    codes are fixed text, so this needs no model and no approval step."""

    result = await report(TIMELINE, CHILD_LANG)

    assert "Wo: Klassenzimmer" in result["german_version"]
    assert "Wo: Mensa" in result["german_version"]
    assert "Wo: classroom" not in result["german_version"]
    # and the child still reads it in their own language
    assert "Where: classroom" in result["child_version"]


async def test_a_place_the_child_typed_is_quoted_not_translated():
    """We have no German for "the corridor behind the gym" that the child ever
    approved. Guessing one and putting it in front of a teacher is the
    unapproved paraphrase this module exists to avoid."""
    typed = [{**TIMELINE[0], "place": "the corridor behind the gym"}]

    result = await report(typed, CHILD_LANG)

    assert '"the corridor behind the gym"' in result["german_version"]


async def test_who_was_involved_is_always_the_childs_own_words():
    """"two older boys" is the child's description, in both versions, quoted so
    a German reader can see it is verbatim rather than our wording."""

    result = await report(TIMELINE, CHILD_LANG)

    assert 'Wer: "two older boys"' in result["german_version"]
    assert 'Who: "two older boys"' in result["child_version"]


async def test_place_codes_are_translated_for_every_shipped_language():
    from engine.report_text import PLACES

    for code, by_lang in PLACES.items():
        for lang in ("en", "hi", "de"):
            assert by_lang.get(lang, "").strip(), f"{code} has no {lang} wording"

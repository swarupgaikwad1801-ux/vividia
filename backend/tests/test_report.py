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

Replays recorded transcripts; no live model calls.
"""

import json

import pytest
import recorded

from app.schemas import ReportResponse
from engine.client import EngineError
from engine.config import REPO_ROOT
from engine.report import report
from engine.report_text import FOOTER, HEADER, LABELS, format_date

DEMO = json.loads(
    (REPO_ROOT / "content" / "demo_story.json").read_text(encoding="utf-8")
)
TIMELINE = DEMO["timeline"]
CHILD_LANG = DEMO["persona"]["child_lang"]

FAST = 100_000

# Words that would turn a record into an assessment. Checked against the
# generated overview and the fixed frame, never against the child's own
# sentences: those are theirs and may say anything.
JUDGEMENT = [
    "traumatised", "traumatized", "distressed", "struggling", "vulnerable",
    "isolated", "victim", "bullying", "harassment", "clearly", "obviously",
    "proven", "confirmed", "credible", "serious case",
    "traumatisiert", "offensichtlich", "bewiesen", "glaubhaft", "mobbing",
    "opfer", "schikane",
]


def replay(monkeypatch, name="report_amara"):
    transcript = recorded.load(name)
    recorded.install(monkeypatch, transcript, rpm=FAST)
    return transcript


@pytest.fixture
def built(monkeypatch):
    replay(monkeypatch)
    return None


# --- the child's words survive ----------------------------------------------


async def test_every_approved_german_sentence_appears_untouched(monkeypatch):
    """The sentences the child confirmed word by word are what the adult reads.
    A summary in their place would be a paraphrase nobody approved."""
    replay(monkeypatch)

    result = await report(TIMELINE, CHILD_LANG)

    for entry in TIMELINE:
        assert entry["text_de"] in result["german_version"], (
            f"approved sentence missing or altered: {entry['text_de']!r}"
        )


async def test_every_sentence_the_child_wrote_appears_in_their_own_version(monkeypatch):
    """The child approves what they can read, so their version has to carry the
    same entries, or they are approving something they never saw."""
    replay(monkeypatch)

    result = await report(TIMELINE, CHILD_LANG)

    for entry in TIMELINE:
        assert entry["text_child"] in result["child_version"]


async def test_the_place_and_the_people_stay_in_the_childs_words(monkeypatch):
    """"two older boys" is the child's description. It must not be tidied into
    a category by us or by a model."""
    replay(monkeypatch)

    result = await report(TIMELINE, CHILD_LANG)

    assert "two older boys" in result["child_version"]
    assert "some kids in my class" in result["child_version"]


async def test_the_entries_are_in_date_order(monkeypatch):
    replay(monkeypatch)

    result = await report(TIMELINE, CHILD_LANG)
    positions = [
        result["german_version"].index(entry["text_de"])
        for entry in sorted(TIMELINE, key=lambda e: e["date"])
    ]

    assert positions == sorted(positions), "the timeline is out of order"


# --- the frame is ours, and says what this is not ---------------------------


async def test_the_header_and_footer_are_the_fixed_text(monkeypatch):
    """An adult reading a tidy German document may assume a professional made
    it. The frame says a child did, and it is not model-generated."""
    replay(monkeypatch)

    result = await report(TIMELINE, CHILD_LANG)

    assert HEADER["de"] in result["german_version"]
    assert FOOTER["de"] in result["german_version"]
    assert HEADER[CHILD_LANG] in result["child_version"]
    assert FOOTER[CHILD_LANG] in result["child_version"]


async def test_the_report_never_says_any_of_it_is_proven(monkeypatch):
    """CLAUDE.md: never a judgement that an allegation is true. The footer
    states plainly that this records what the child said happened."""
    replay(monkeypatch)

    result = await report(TIMELINE, CHILD_LANG)

    assert "what the child said happened" in result["child_version"]
    assert "nicht ist" in result["german_version"], "the German footer is missing its limits"


async def test_neither_version_judges_diagnoses_or_labels(monkeypatch):
    """Checked against everything except the child's own sentences, which are
    theirs and may say anything they like."""
    replay(monkeypatch)

    result = await report(TIMELINE, CHILD_LANG)

    for version in ("child_version", "german_version"):
        text = result[version]
        for entry in TIMELINE:
            text = text.replace(entry["text_child"], "").replace(entry["text_de"], "")
        for word in JUDGEMENT:
            assert word not in text.lower(), f"{version} says {word!r}"


async def test_the_overview_is_included_but_is_not_the_report(monkeypatch):
    transcript = replay(monkeypatch)
    recorded_overview = transcript.data["responses"]["report"][0]

    result = await report(TIMELINE, CHILD_LANG)

    assert recorded_overview["overview_target"] in result["german_version"]
    assert recorded_overview["overview_child"] in result["child_version"]
    # and it is a small part of the whole, not a replacement for it
    assert len(recorded_overview["overview_target"]) < len(result["german_version"]) / 2


# --- a model failure must not cost the child the report ---------------------


async def test_a_failed_overview_still_produces_a_whole_report(monkeypatch):
    """The timeline needs no model at all. Losing the overview costs an adult
    half a minute of reading; losing the report costs the child the
    conversation they were building up to."""
    replay(monkeypatch, "report_model_down")

    result = await report(TIMELINE, CHILD_LANG)

    for entry in TIMELINE:
        assert entry["text_de"] in result["german_version"]
    assert HEADER["de"] in result["german_version"]
    assert FOOTER["de"] in result["german_version"]


async def test_a_failed_overview_leaves_no_gap_or_placeholder(monkeypatch):
    """No "overview unavailable" line, and no stray blank block: an adult
    should not be able to tell that a step was skipped."""
    replay(monkeypatch, "report_model_down")

    result = await report(TIMELINE, CHILD_LANG)

    assert "\n\n\n" not in result["german_version"]
    for word in ("unavailable", "error", "none", "null", "nicht verfügbar"):
        assert word not in result["german_version"].lower()


async def test_all_three_attempts_are_spent_before_giving_up(monkeypatch):
    transcript = replay(monkeypatch, "report_model_down")

    await report(TIMELINE, CHILD_LANG)

    assert transcript.count("report") == 3


# --- shape, cost and edges ---------------------------------------------------


async def test_the_result_matches_the_frozen_contract(monkeypatch):
    replay(monkeypatch)

    result = await report(TIMELINE, CHILD_LANG)
    body = ReportResponse(
        child_version=result["child_version"],
        german_version=result["german_version"],
        usage=result["usage"],
    )

    assert body.child_version and body.german_version


async def test_a_report_costs_one_model_call(monkeypatch):
    """The entries are assembled locally, so only the overview is paid for."""
    transcript = replay(monkeypatch)

    result = await report(TIMELINE, CHILD_LANG)

    assert result["usage"]["calls_made"] == 1
    assert transcript.count("report") == 1


async def test_a_german_speaking_child_is_not_shown_the_same_text_twice(monkeypatch):
    replay(monkeypatch)

    result = await report(TIMELINE, "de")

    assert result["child_version"] == result["german_version"]


async def test_a_language_we_have_no_labels_for_still_gets_a_readable_report(monkeypatch):
    """A child writing Ukrainian today must not get a blank or broken document:
    the labels fall back to English, and their own sentences are still theirs."""
    replay(monkeypatch)

    result = await report(TIMELINE, "uk")

    assert HEADER["en"] in result["child_version"]
    for entry in TIMELINE:
        assert entry["text_child"] in result["child_version"]


async def test_one_entry_is_enough(monkeypatch):
    replay(monkeypatch)

    result = await report(TIMELINE[:1], CHILD_LANG)

    assert TIMELINE[0]["text_de"] in result["german_version"]
    assert LABELS["de"]["entries"] in result["german_version"]


async def test_an_empty_timeline_is_refused_rather_than_handed_over(monkeypatch):
    """An empty report given to a teacher is worse than an error."""
    replay(monkeypatch)

    with pytest.raises(EngineError) as raised:
        await report([], CHILD_LANG)

    assert raised.value.code == "invalid_input"


async def test_an_entry_with_no_place_or_people_still_renders(monkeypatch):
    replay(monkeypatch)
    sparse = [{**TIMELINE[0], "place": None, "people": None}]

    result = await report(sparse, CHILD_LANG)

    assert sparse[0]["text_de"] in result["german_version"]
    # "Wo" on its own also occurs inside "Worten" in the footer, so the label
    # is only a label when it is followed by its colon.
    assert f"{LABELS['de']['where']}: " not in result["german_version"]
    assert f"{LABELS['de']['who']}: " not in result["german_version"]


# --- dates -------------------------------------------------------------------


async def test_german_dates_are_written_the_way_a_german_teacher_reads_them(monkeypatch):
    replay(monkeypatch)

    result = await report(TIMELINE, CHILD_LANG)

    assert "06.10.2026" in result["german_version"]
    assert "2026-10-06" not in result["german_version"]


def test_a_date_we_cannot_parse_is_passed_through_not_dropped():
    """It is still the child's data."""
    assert format_date("sometime in October", "de") == "sometime in October"
    assert format_date("", "de") == ""


# --- place and people: translated only where we can do it honestly ----------


async def test_a_known_place_is_rendered_in_the_readers_language(monkeypatch):
    """A German teacher should read "Klassenzimmer", not "classroom". Place
    codes are fixed text, so this needs no model and no approval step."""
    replay(monkeypatch)

    result = await report(TIMELINE, CHILD_LANG)

    assert "Wo: Klassenzimmer" in result["german_version"]
    assert "Wo: Mensa" in result["german_version"]
    assert "Wo: classroom" not in result["german_version"]
    # and the child still reads it in their own language
    assert "Where: classroom" in result["child_version"]


async def test_a_place_the_child_typed_is_quoted_not_translated(monkeypatch):
    """We have no German for "the corridor behind the gym" that the child ever
    approved. Guessing one and putting it in front of a teacher is the
    unapproved paraphrase this module exists to avoid."""
    replay(monkeypatch)
    typed = [{**TIMELINE[0], "place": "the corridor behind the gym"}]

    result = await report(typed, CHILD_LANG)

    assert '"the corridor behind the gym"' in result["german_version"]


async def test_who_was_involved_is_always_the_childs_own_words(monkeypatch):
    """"two older boys" is the child's description, in both versions, quoted so
    a German reader can see it is verbatim rather than our wording."""
    replay(monkeypatch)

    result = await report(TIMELINE, CHILD_LANG)

    assert 'Wer: "two older boys"' in result["german_version"]
    assert 'Who: "two older boys"' in result["child_version"]


async def test_place_codes_are_translated_for_every_shipped_language():
    from engine.report_text import PLACES

    for code, by_lang in PLACES.items():
        for lang in ("en", "hi", "de"):
            assert by_lang.get(lang, "").strip(), f"{code} has no {lang} wording"

"""What the verification actually does, proved without a live model call.

Each test replays a recorded transcript (tests/fixtures/, see tests/recorded.py)
and asserts the behaviour that transcript exists to pin down. Only the HTTP call
is replaced: the rate limiter, the retry rules and the cost accounting in
engine/client.py all run for real.

These run in CI with no API key and cost nothing.

    backend/.venv/Scripts/python -m pytest tests/test_engine_recorded.py -v
"""

import json

import pytest
import recorded

from engine.client import EngineError
from engine.safety import safety_check
from engine.translate import ADAPTIVE, BASELINE, MULTI_PASS, translate

# High enough that the limiter never sleeps: these tests are about logic, not
# timing. The latency-budget test deliberately uses the real limits instead.
FAST = 100_000


def replay(monkeypatch, name, *, rpm=FAST):
    transcript = recorded.load(name)
    recorded.install(monkeypatch, transcript, rpm=rpm)
    return transcript


# --- strategy C decides how much to spend ------------------------------------


async def test_a_safe_sentence_costs_two_calls_and_stops(monkeypatch):
    """C has to be able to say no, or it is just B with extra steps."""
    transcript = replay(monkeypatch, "safe_sentence_stops_early")

    result = await translate(transcript.data["text"], "en", strategy=ADAPTIVE)

    assert result["calls_made"] == 2
    assert result["ambiguities"] == []
    assert transcript.count("judge") == 0, "a safe sentence must not reach the judge"
    assert transcript.count("back_translate") == 0


async def test_baseline_makes_one_call_and_claims_no_confidence(monkeypatch):
    """A reports 0.0 because nothing checked it, which is not the same as agreement."""
    transcript = replay(monkeypatch, "baseline_single_call")

    result = await translate(transcript.data["text"], "en", strategy=BASELINE)

    assert result["calls_made"] == 1
    assert result["confidence"] == 0.0
    assert result["strategy_used"] == BASELINE


# --- the repair pass: when every candidate is wrong the same way -------------


async def test_the_repair_pass_puts_back_the_harm_every_pass_lost(monkeypatch):
    """'hits me' became 'trifft mich' (meets me) in all five passes.

    Agreement was 1.00 and nothing disagreed, so choosing between candidates
    could not have helped. Only the back-translation showed it.
    """
    transcript = replay(monkeypatch, "hits_trifft_repair")

    result = await translate(transcript.data["text"], "en", strategy=ADAPTIVE)

    assert "schlägt" in result["translation"]
    assert "trifft" not in result["translation"], "the harm is still missing"
    assert result["meaning_repaired"] == 1
    assert transcript.count("repair") == 1


async def test_confidence_is_capped_once_meaning_had_to_be_repaired(monkeypatch):
    """The judge said agreement 1.00. Agreement had already proved worthless here,
    so the number the UI shows must not inherit it."""
    transcript = replay(monkeypatch, "hits_trifft_repair")

    result = await translate(transcript.data["text"], "en", strategy=ADAPTIVE)

    assert json.loads(json.dumps(transcript.data["responses"]["judge"][0]))["agreement"] == 1.0
    assert result["confidence"] <= 0.6


async def test_full_verification_costs_the_fifteen_calls_we_publish(monkeypatch):
    """CLAUDE.md quotes 15 calls for a sentence needing full verification and
    repair. If the pipeline changes shape, this is the number to update there.

    It was 13 until the direction check was added: a repaired translation is
    back-translated again and then checked for who did what to whom, because
    choosing between candidates had been seen to flip a threat around."""
    transcript = replay(monkeypatch, "hits_trifft_repair")

    result = await translate(transcript.data["text"], "en", strategy=ADAPTIVE)

    assert result["calls_made"] == 15
    assert transcript.count("translate") == 5
    assert transcript.count("back_translate") == 6  # 5 candidates + the repaired text
    assert transcript.count("ambiguity") == 1
    assert transcript.count("judge") == 1
    assert transcript.count("repair") == 1
    assert transcript.count("actor_threat") == 1


async def test_multi_pass_verifies_a_sentence_that_adaptive_would_have_skipped(monkeypatch):
    transcript = replay(monkeypatch, "hits_trifft_repair")

    result = await translate(transcript.data["text"], "en", strategy=MULTI_PASS)

    assert result["strategy_used"] == MULTI_PASS
    assert transcript.count("translate") == 5, "B always fans out"
    assert transcript.count("judge") == 1


# --- the question to the child: what no translation can resolve --------------


async def test_the_child_is_asked_even_though_every_pass_agreed(monkeypatch):
    """"get me after school" is a threat or a lift home, and every pass chose
    the lift. The judge saw nothing wrong because there was no disagreement;
    the separate check on the child's own sentence is what caught it."""
    transcript = replay(monkeypatch, "get_me_after_school")

    result = await translate(transcript.data["text"], "en", strategy=ADAPTIVE)

    assert len(result["ambiguities"]) == 1, "the one question worth interrupting a child for"
    question = result["ambiguities"][0]
    assert question["phrase"] == "get me after school"
    assert question["question"].strip()
    assert len(question["options"]) == 2

    ids = [option["id"] for option in question["options"]]
    assert len(set(ids)) == 2, "option ids must be distinct to be selectable"

    # Each option carries the German it would produce, so the child's choice
    # decides the wording rather than the model deciding it afterwards.
    assert [option["meaning_de"] for option in question["options"]] == [
        "er kriegt mich nach der Schule",
        "er holt mich nach der Schule ab",
    ]


async def test_an_agreed_translation_is_not_downgraded_by_a_question(monkeypatch):
    """Asking the child is not an admission that the translation was wrong."""
    transcript = replay(monkeypatch, "get_me_after_school")

    result = await translate(transcript.data["text"], "en", strategy=ADAPTIVE)

    assert result["confidence"] == 1.0
    assert result["meaning_repaired"] == 0


# --- the child's answer decides the wording ----------------------------------


async def test_the_childs_answer_reaches_the_final_pass(monkeypatch):
    """Called the way the engine intends: the chosen reading is passed back in,
    and the final pass renders that decision."""
    transcript = replay(monkeypatch, "child_answer_is_rendered")
    ambiguities = [
        {
            "phrase": "laughed at me",
            "options": [
                {"id": "opt0", "label": "To make fun of me", "meaning_de": "mich ausgelacht"},
                {"id": "opt1", "label": "Together with me", "meaning_de": "mit mir gelacht"},
            ],
        }
    ]

    result = await translate(
        transcript.data["text"],
        "en",
        clarifications={"laughed at me": "opt0"},
        _ambiguities=ambiguities,
    )

    assert transcript.count("translate_clarified") == 1, "the child's decision was not sent"
    assert "ausgelacht" in result["translation"]
    assert result["ambiguities"] == []


@pytest.mark.xfail(
    strict=True,
    reason="Known bug, Swarup's to fix (issue #3, item 8: 'report.py and the clarify "
    "flow'). /api/clarify sends only {phrase: option.id}; the option.id -> meaning_de "
    "mapping lives in the Ambiguity objects the client already has, and main.py never "
    "passes them as _ambiguities. _decisions_text then returns '', the clarified "
    "suffix is never appended, and the child's choice is silently dropped while the "
    "response still reports confidence 1.0. Fixing it needs a contract change, so it "
    "is not this session's to make.",
)
async def test_the_childs_answer_survives_the_api_shaped_call(monkeypatch):
    """Called exactly the way backend/main.py calls it: no _ambiguities.

    When this starts passing, delete the xfail and the bug is closed.
    """
    transcript = replay(monkeypatch, "child_answer_is_rendered")

    result = await translate(
        transcript.data["text"], "en", clarifications={"laughed at me": "opt0"}
    )

    assert transcript.count("translate_clarified") == 1
    assert "ausgelacht" in result["translation"]


# --- untranslated output must never reach a teacher -------------------------


async def test_an_echoed_input_is_retried_rather_than_shipped(monkeypatch):
    transcript = replay(monkeypatch, "untranslated_recovers")

    result = await translate(transcript.data["text"], "en", strategy=BASELINE)

    assert transcript.count("translate_retry") == 1
    assert result["translation"] == "Sie haben mir wieder meine Tasche weggenommen."
    assert result["calls_made"] == 2, "the wasted call is still counted"


async def test_an_echoed_input_fails_loudly_when_the_retry_echoes_too(monkeypatch):
    """Better a friendly error than a German report that is actually Hindi."""
    transcript = replay(monkeypatch, "untranslated_fails_loudly")

    with pytest.raises(EngineError) as raised:
        await translate(transcript.data["text"], "hi", strategy=BASELINE)

    assert raised.value.code == "upstream_unavailable"
    assert raised.value.retryable is True


# --- safety: classify, then read fixed text ---------------------------------


async def test_a_real_threat_is_recognised_and_shows_human_written_words(monkeypatch):
    transcript = replay(monkeypatch, "safety_danger")

    result = await safety_check(transcript.data["text"], "en")

    assert result["urgent"] is True
    assert result["category"] == "danger"
    assert "110" in result["message_child"], "the words must come from content/, not the model"


async def test_everyday_exaggeration_does_not_fire(monkeypatch):
    transcript = replay(monkeypatch, "safety_exaggeration")

    result = await safety_check(transcript.data["text"], "en")

    assert result["urgent"] is False
    assert result["category"] == "none"
    assert result["message_child"] == ""


async def test_a_model_outage_does_not_block_the_child(monkeypatch):
    """Detection is a prompt, not a gate: help is on every screen regardless."""
    transcript = replay(monkeypatch, "safety_model_down")

    result = await safety_check(transcript.data["text"], "en")

    assert result["category"] == "none"
    assert result["urgent"] is False
    assert transcript.count("safety") == 3, "all three attempts in client.call were used"


# --- accounting --------------------------------------------------------------


async def test_every_call_is_counted_including_the_wasted_ones(monkeypatch):
    """The spending cap and the live check counter both read these numbers."""
    transcript = replay(monkeypatch, "hits_trifft_repair")

    result = await translate(transcript.data["text"], "en", strategy=ADAPTIVE)
    usage = result["usage"]

    assert usage["calls_made"] == 15 == len(transcript.calls)
    assert usage["input_tokens"] == 15 * transcript.data["tokens"]["prompt"]
    assert usage["output_tokens"] == 15 * transcript.data["tokens"]["completion"]
    # The token counts in a hand-authored transcript are filler, so this checks
    # that cost is accumulated at all, never that a dollar figure is accurate.
    assert usage["estimated_cost_usd"] > 0


# --- report ------------------------------------------------------------------


@pytest.mark.skip(
    reason="engine/report.py does not exist yet (Swarup, issue #3 item 8). The "
    "transcript for it cannot be written before the prompts it replays exist; "
    "tests/test_contract.py covers the mock's shape until then."
)
async def test_report_renders_both_languages_from_a_transcript():
    raise NotImplementedError


# --- the honesty rule, enforced ---------------------------------------------


def test_every_transcript_says_where_it_came_from():
    """CLAUDE.md: never claim a number that wasn't measured. A transcript without
    provenance is one someone could later mistake for captured model output."""
    files = sorted(recorded.FIXTURES.glob("*.json"))
    assert files, "no transcripts found"
    for path in files:
        data = json.loads(path.read_text(encoding="utf-8"))
        assert data.get("_provenance") in ("hand-authored", "captured"), path.name
        assert data.get("scenario"), f"{path.name} does not say what it pins down"


# --- a failed ambiguity check costs a question, not the translation --------


async def test_a_failed_ambiguity_check_does_not_lose_the_translation(monkeypatch):
    """It used to be gathered with the fan-out, so a failure took the whole
    request down. One of three defences should not be able to do that: losing
    it costs a question the child might have been asked, while raising costs
    them the translation they were building up to."""
    transcript = replay(monkeypatch, "ambiguity_check_down")

    result = await translate(transcript.data["text"], "en", strategy=ADAPTIVE)

    assert result["translation"], "the translation was lost with the check"
    assert transcript.count("ambiguity") == 3, "all three attempts were spent"


async def test_the_reviewed_word_list_still_asks_when_the_model_call_fails(monkeypatch):
    """The list in content/ambiguous_words.json needs no model at all, so it
    must survive the call that does. "get me" is on it, and for a threat that
    is the half of this check that matters most."""
    transcript = replay(monkeypatch, "ambiguity_check_down")

    result = await translate(transcript.data["text"], "en", strategy=ADAPTIVE)

    assert result["ambiguities"], "the child was asked nothing, despite a listed word"
    phrases = [a["phrase"].lower() for a in result["ambiguities"]]
    assert any("get me" in phrase for phrase in phrases), phrases

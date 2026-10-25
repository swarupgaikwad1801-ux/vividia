"""Does the pipeline's shape keep the child inside the ten-second budget?

This is a test about concurrency, not about the network. Each replayed call
sleeps for a pessimistic length of time, so steps the pipeline gathers overlap
and steps it awaits one after another add up. Thirteen calls run sequentially
break the budget; the same thirteen, run in the gathers the pipeline actually
uses, do not. Replace a gather with a loop and this test says so.

The numbers below are ceilings we chose, not measurements. Only the 430 ms for
a fan-out call comes from a real run (CLAUDE.md, the language gate). Nothing
here is evidence of how fast the live system is, and no README number should
be taken from it.

Offline; no model calls.
"""

import asyncio
import time

import pytest
import recorded

from engine.budget import STEP_MS, TOTAL_MS, over_budget
from engine.client import ROLES, Usage
from engine.translate import ADAPTIVE, FANOUT_TEMPERATURES, translate

# Deliberately slower than we expect in production, so passing means there is
# headroom. The judge and the ambiguity check are larger models answering under
# a JSON schema, so they get the most.
PESSIMISTIC_MS = {
    "translate": 700,
    "translate_retry": 700,
    "back_translate": 700,
    "ambiguity": 1_800,
    "judge": 2_500,
    # The focused check on the chosen text. It had NO entry here, so it was
    # simulated as instant and this suite reported the pipeline well inside
    # budget while the real 15-call path was over it. Same model as the judge,
    # so the same figure.
    "actor_threat": 2_500,
    "question": 1_500,
    "repair": 1_200,
    "safety": 1_200,
}

# What the same work would cost with no concurrency at all: 5 fan-out passes,
# 5 back-translations, the ambiguity check, the judge and the repair.
SEQUENTIAL_MS = (
    5 * PESSIMISTIC_MS["translate"]
    + 5 * PESSIMISTIC_MS["back_translate"]
    + PESSIMISTIC_MS["ambiguity"]
    + PESSIMISTIC_MS["judge"]
    + PESSIMISTIC_MS["repair"]
    # the back-translation of the repaired text, then the direction check
    + PESSIMISTIC_MS["back_translate"]
    + PESSIMISTIC_MS["actor_threat"]
)


def replay(monkeypatch, name, *, rpm=100_000):
    transcript = recorded.load(name)
    recorded.install(monkeypatch, transcript, rpm=rpm, latency_ms=PESSIMISTIC_MS)
    return transcript


def test_the_sequential_cost_would_actually_break_the_budget():
    """If this ever stops being true the test below proves nothing, because
    even a fully serial pipeline would pass it."""
    assert SEQUENTIAL_MS > TOTAL_MS, (
        f"the pessimistic latencies total {SEQUENTIAL_MS}ms serially, which is "
        f"under the {TOTAL_MS}ms budget, so this suite can no longer tell a "
        "parallel pipeline from a sequential one"
    )


async def test_a_full_verification_stays_inside_the_budget(monkeypatch):
    """The whole journey for the hardest sentence: five passes, five
    back-translations, the ambiguity check, the judge and a repair."""
    transcript = replay(monkeypatch, "hits_trifft_repair")

    result = await translate(transcript.data["text"], "en", strategy=ADAPTIVE)

    assert result["calls_made"] == 15
    assert result["usage"]["latency_ms"] < TOTAL_MS, (
        f"{result['usage']['latency_ms']}ms for 15 calls; the gathers in "
        "translate.py are what keep this under budget"
    )
    assert result["budget_breaches"] == []


async def test_the_fan_out_runs_in_parallel_not_one_after_another(monkeypatch):
    """Five passes at 700 ms each cost about 700 ms, not 3.5 s. This is the
    assertion that fails if someone replaces a gather with a loop."""
    transcript = replay(monkeypatch, "hits_trifft_repair")

    result = await translate(transcript.data["text"], "en", strategy=ADAPTIVE)

    assert transcript.count("translate") == 5
    assert result["usage"]["latency_ms"] < SEQUENTIAL_MS * 0.75, (
        f"{result['usage']['latency_ms']}ms is close to the sequential cost of "
        f"{SEQUENTIAL_MS}ms, so the steps are no longer overlapping"
    )


async def test_a_safe_sentence_is_answered_quickly(monkeypatch):
    """Most sentences are not the hard case, and they must not pay for it."""
    transcript = replay(monkeypatch, "safe_sentence_stops_early")

    result = await translate(transcript.data["text"], "en", strategy=ADAPTIVE)

    assert result["calls_made"] == 2
    # Two gathered passes at 700 ms each, so comfortably inside one step's
    # ceiling rather than anywhere near the total budget.
    assert result["usage"]["latency_ms"] < 2 * PESSIMISTIC_MS["translate"]
    assert result["budget_breaches"] == []


async def test_the_real_rate_limit_still_leaves_room(monkeypatch):
    """With the limits the console actually sets, not a test-only high value.

    Super-VL and Super are both 300 RPM, which our 0.8 safety factor turns into
    a 250 ms gap between calls to the same role. Thirteen calls pay that gap,
    and the budget still has to hold.
    """
    transcript = replay(monkeypatch, "hits_trifft_repair", rpm=None)

    result = await translate(transcript.data["text"], "en", strategy=ADAPTIVE)

    assert ROLES["fanout"].rpm == 300, "the limiter maths below assumes 300 RPM"
    assert result["usage"]["latency_ms"] < TOTAL_MS, (
        f"{result['usage']['latency_ms']}ms once the rate limiter is paid; "
        "a lower RPM or more fan-out passes would need the budget revisited"
    )


# --- the budget reporting itself --------------------------------------------


def test_a_slow_step_is_reported_with_its_name_and_its_ceiling():
    usage = Usage()
    usage.record_step("judge", STEP_MS["judge"] + 1_500)

    breaches = over_budget(usage)

    assert len(breaches) == 1
    assert "judge" in breaches[0]
    assert str(STEP_MS["judge"]) in breaches[0]


def test_a_step_inside_its_budget_is_not_reported():
    usage = Usage()
    usage.record_step("judge", STEP_MS["judge"] - 1)
    assert over_budget(usage) == []


def test_an_unknown_step_is_not_judged_against_a_budget_it_has_none_of():
    """Adding a step to the pipeline should not fail the build before someone
    has decided what its budget is."""
    usage = Usage()
    usage.record_step("some_new_step", 60_000)
    assert [b for b in over_budget(usage) if "some_new_step" in b] == []


def test_the_slowest_step_is_the_one_worth_optimising():
    usage = Usage()
    usage.record_step("translate", 400)
    usage.record_step("translate", 450)
    usage.record_step("judge", 2_100)

    assert usage.slowest_step() == ("judge", 2_100)


def test_the_step_summary_carries_timings_and_nothing_else():
    """It goes straight into the log, so it must be safe by construction."""
    usage = Usage()
    usage.record_step("translate", 400)
    usage.record_step("translate", 450)
    usage.record_step("judge", 2_100)

    summary = usage.step_summary()

    assert summary == "judgex1=2100ms translatex2=850ms"
    assert "=" in summary and "ms" in summary


@pytest.mark.parametrize("step", sorted(STEP_MS))
def test_every_step_the_pipeline_labels_has_a_budget(step):
    """STEP_MS and the step= names in translate.py must not drift apart."""
    assert STEP_MS[step] > 0
    assert STEP_MS[step] <= TOTAL_MS


# --- the scheduling the budget depends on ----------------------------------
#
# These are the shape of the pipeline, not its speed. Each pins an overlap
# that the 10 s bar now relies on, so undoing one fails here rather than
# showing up as a slow demo.


def test_the_fan_out_size_the_limiter_assumes_is_the_real_one():
    """client.FANOUT_PASSES is declared there because client.py cannot import
    translate.py. This is what stops the two drifting apart."""
    from engine.client import FANOUT_PASSES

    assert FANOUT_PASSES == len(FANOUT_TEMPERATURES)


async def test_the_limiter_serves_a_fan_out_without_spacing_it_out():
    """The old limiter put a fixed 250 ms between calls at 300 RPM, turning a
    five-call fan-out into a second of our own throttling. A burst that size
    is nothing against 300 requests a minute."""
    from engine.client import FANOUT_PASSES, _Limiter

    limiter = _Limiter(300)
    started = time.perf_counter()
    await asyncio.gather(*[limiter.wait() for _ in range(FANOUT_PASSES)])
    elapsed_ms = (time.perf_counter() - started) * 1000

    assert elapsed_ms < 100, f"a fan-out still waits {elapsed_ms:.0f} ms on our own limiter"


async def test_the_limiter_still_enforces_the_average_it_promises():
    """The burst is allowed; the rate is not. Past the bucket's capacity the
    calls are paced, or the 300 RPM cap would be a suggestion."""
    from engine.client import _Limiter

    limiter = _Limiter(300)  # 4 requests/second after the safety factor
    started = time.perf_counter()
    await asyncio.gather(*[limiter.wait() for _ in range(16)])
    elapsed = time.perf_counter() - started

    # 16 calls at 4/s cannot finish in under a second however big the burst.
    assert elapsed > 0.8, f"16 calls took {elapsed:.2f}s; the rate is not being enforced"


async def test_the_ambiguity_check_overlaps_the_judge(monkeypatch):
    """It reads the child's sentence alone, so it depends on neither the
    fan-out nor the judge. Gathered with the fan-out it delayed everything
    behind it; as a task it hides inside the back-translations and the judge."""
    transcript = replay(monkeypatch, "hits_trifft_repair")

    result = await translate(transcript.data["text"], "en", strategy=ADAPTIVE)

    assert transcript.count("ambiguity") == 1
    # If it were serial, the total would have to include its full 1.8 s on top
    # of everything else. This is the headroom that overlap buys.
    serial_floor = (
        2 * PESSIMISTIC_MS["translate"]
        + PESSIMISTIC_MS["ambiguity"]
        + PESSIMISTIC_MS["back_translate"] * 2
        + PESSIMISTIC_MS["judge"]
        + PESSIMISTIC_MS["repair"]
        + PESSIMISTIC_MS["actor_threat"]
    )
    assert result["usage"]["latency_ms"] < serial_floor


async def test_the_questions_overlap_the_chosen_text_chain(monkeypatch):
    """A question is about the child's own sentence and the judge's disputes,
    so it needs nothing the repair or the direction check produces."""
    transcript = replay(monkeypatch, "get_me_after_school")

    result = await translate(transcript.data["text"], "en", strategy=ADAPTIVE)

    assert transcript.count("question") >= 1, "no question was asked, so nothing is being tested"
    assert result["ambiguities"], "the question did not survive being run concurrently"
    # The question's own time is hidden inside the actor/threat check.
    assert result["usage"]["latency_ms"] < 10_000 - PESSIMISTIC_MS["question"]

"""Being told is not being obeyed: the child's chosen wording must survive.

Found in the 25 Oct benchmark. `dekh lena` is either a threat ("you'll see")
or an invitation to look. The child picked the threat, the decision reached
the prompt correctly - verified, it renders as one clean bullet - and the
model answered "wird er es schon richten": *he'll sort it out*. Reassurance,
from a sentence that was a threat, on the one step where the child had
already said which reading was theirs.

Every strategy failed that case, so it was not a triage problem. The fix is
the stance the engine already takes with `untranslated()`: check the output
instead of trusting the instruction, and repair once if the wording is gone.

Offline: every model call is stubbed, and the stub records what it was asked.
"""

import pytest

from engine.translate import (
    ADAPTIVE,
    _decided_pairs,
    _decisions_kept,
    _decisions_text,
    translate,
)

THREAT = "du wirst schon sehen"

AMBIGUITY = {
    "phrase": "dekh lena",
    "question": "Was hat er gemeint?",
    "options": [
        {"id": "opt0", "label": "a threat", "meaning_de": THREAT},
        {"id": "opt1", "label": "take a look", "meaning_de": "schau es dir an"},
    ],
    "severity": "critical",
}
HINDI = "usne kaha agar kisi ko bataya to dekh lena"

# What the model actually returned on 25 Oct, and what it should have.
SOFTENED = "Er sagte, wenn jemandem etwas erzählt wird, wird er es schon richten."
CORRECT = "Er sagte: Wenn du es jemandem erzählst, du wirst schon sehen."


def stub(monkeypatch, replies):
    """Serve `replies` in order to the translate step; record every prompt."""
    seen: list[str] = []

    async def fake_call(role, system, user, usage, **kwargs):
        seen.append(system)
        step = kwargs.get("step", "")
        if step.startswith("translate"):
            return replies[min(len(seen) - 1, len(replies) - 1)]
        raise AssertionError(f"unexpected step {step!r} on the clarified path")

    monkeypatch.setattr("engine.translate.call", fake_call)
    return seen


# --- the unit the whole thing turns on --------------------------------------


def test_a_dropped_phrasing_is_detected():
    pairs = _decided_pairs([AMBIGUITY], {"dekh lena": "opt0"})
    assert pairs == [("dekh lena", THREAT)]
    assert _decisions_kept(SOFTENED, pairs) == [THREAT], (
        "the softened output lost the child's wording and that must be visible"
    )
    assert _decisions_kept(CORRECT, pairs) == []


def test_the_prompt_tells_the_model_what_to_output_not_what_the_hindi_means():
    """"means:" invited a paraphrase and the model took the invitation."""
    rendered = _decisions_text([AMBIGUITY], {"dekh lena": "opt0"})

    assert THREAT in rendered
    assert "means:" not in rendered, (
        "a gloss of the Hindi is what produced 'wird er es schon richten'; "
        "this line has to be an instruction about the German output"
    )


def test_the_check_and_the_prompt_read_the_same_decision():
    """One source of truth. A check with its own copy of "which option did
    the child pick" would eventually pass the output it exists to catch."""
    choices = {"dekh lena": "opt0"}
    pairs = _decided_pairs([AMBIGUITY], choices)
    rendered = _decisions_text([AMBIGUITY], choices)

    for _, meaning in pairs:
        assert meaning in rendered


# --- the behaviour ----------------------------------------------------------


async def test_a_softened_threat_is_repaired(monkeypatch):
    """The regression. First answer loses the threat; second keeps it."""
    seen = stub(monkeypatch, [SOFTENED, CORRECT])

    result = await translate(
        HINDI, "hi", "de",
        clarifications={"dekh lena": "opt0"},
        _ambiguities=[AMBIGUITY],
        strategy=ADAPTIVE,
    )

    assert result["translation"] == CORRECT
    assert result["meaning_repaired"] == 1
    assert len(seen) == 2, "exactly one repair, not a retry loop"
    assert THREAT in seen[1], "the repair has to name the phrase that went missing"


async def test_confidence_does_not_claim_1_0_after_a_repair(monkeypatch):
    """A pass that had to be corrected did not do what it was told."""
    stub(monkeypatch, [SOFTENED, CORRECT])

    result = await translate(
        HINDI, "hi", "de",
        clarifications={"dekh lena": "opt0"},
        _ambiguities=[AMBIGUITY],
        strategy=ADAPTIVE,
    )

    assert result["confidence"] == 0.6


async def test_no_repair_when_the_wording_is_already_there(monkeypatch):
    """The common case must not cost a second call."""
    seen = stub(monkeypatch, [CORRECT])

    result = await translate(
        HINDI, "hi", "de",
        clarifications={"dekh lena": "opt0"},
        _ambiguities=[AMBIGUITY],
        strategy=ADAPTIVE,
    )

    assert result["translation"] == CORRECT
    assert result["meaning_repaired"] == 0
    assert result["confidence"] == 1.0
    assert len(seen) == 1, f"a needless repair was spent: {len(seen)} calls"


async def test_a_repair_that_fails_again_does_not_replace_the_first_answer(monkeypatch):
    """A second guess that also lost the wording is not an improvement.

    It must not be presented as a repair either, or `meaning_repaired` would
    claim something was put back when nothing was.
    """
    also_wrong = "Er sagte etwas ganz anderes."
    seen = stub(monkeypatch, [SOFTENED, also_wrong])

    result = await translate(
        HINDI, "hi", "de",
        clarifications={"dekh lena": "opt0"},
        _ambiguities=[AMBIGUITY],
        strategy=ADAPTIVE,
    )

    assert result["translation"] == SOFTENED
    assert result["meaning_repaired"] == 0
    assert len(seen) == 2, "one repair attempt, then stop"


async def test_the_escape_option_asks_for_nothing_and_repairs_nothing(monkeypatch):
    """Picking "something else" is not a decision, so there is nothing to keep
    and nothing to check - and certainly no repair to spend a call on."""
    from engine.clarify_text import other_option

    escape = dict(AMBIGUITY)
    escape["options"] = AMBIGUITY["options"] + [other_option("hi")]
    seen = stub(monkeypatch, [SOFTENED])

    result = await translate(
        HINDI, "hi", "de",
        clarifications={"dekh lena": other_option("hi")["id"]},
        _ambiguities=[escape],
        strategy=ADAPTIVE,
    )

    assert result["meaning_repaired"] == 0
    assert len(seen) == 1
    assert result["translation"] == SOFTENED


@pytest.mark.parametrize("output", [
    "Er sagte, DU WIRST SCHON SEHEN, wenn du es erzählst.",
    "Er sagte: „Du wirst schon sehen.“",
])
async def test_the_check_is_not_fooled_by_case_or_quotes(monkeypatch, output):
    """The wording is there; a check that missed it would spend a call and
    could replace a correct answer with a worse one."""
    seen = stub(monkeypatch, [output])

    result = await translate(
        HINDI, "hi", "de",
        clarifications={"dekh lena": "opt0"},
        _ambiguities=[AMBIGUITY],
        strategy=ADAPTIVE,
    )

    assert result["meaning_repaired"] == 0, f"false repair on {output!r}"
    assert len(seen) == 1

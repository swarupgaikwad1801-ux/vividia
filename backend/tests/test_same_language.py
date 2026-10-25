"""A German-speaking child must not be translated.

Most bullied children in Germany already speak German. HBSC 2022 puts 8.6% of
schoolchildren here in the bullied role, and the barrier that keeps them quiet
is not language: of 12-to-17-year-olds who were bullied, about 40% asked no
one at all for help (Gruene & Willems 2024, nationally representative). The
app is for them too, not only for a child who has just arrived.

Before 25 Oct it was not. `untranslated()` treats output identical to the
input as a failed pass - correct for Hindi to German, exactly wrong for
German to German, where the correct answer IS the input. So the pass "failed",
the retry instructed the model "Do not repeat the German text", and the child
got either an upstream error or their own words paraphrased back at them.

A paraphrase is the one thing that must never reach a teacher. report.py
refuses to let a model describe the child's entries for this exact reason;
there is no point guarding that at the report if the translation step hands a
paraphrase in. These tests pin the behaviour that replaced it.

No live model calls: the one call this path may make is stubbed here.
"""

import json

import pytest

from engine.translate import ADAPTIVE, BASELINE, MULTI_PASS, translate


def stub_calls(monkeypatch, *, ambiguous_phrases=()):
    """Serve the ambiguity check and fail loudly on anything that translates.

    The point of the German path is that nothing is translated, so a test that
    merely checked the output would pass even if the engine quietly ran five
    passes and got lucky. This records every step the engine asks for.
    """
    steps = []

    async def fake_call(role, system, user, usage, **kwargs):
        step = kwargs.get("step", "?")
        steps.append(step)
        if step.startswith("translate"):
            raise AssertionError(
                f"the engine tried to translate German into German (step={step!r}). "
                "A German-speaking child's words must be passed through untouched."
            )
        if step == "ambiguity":
            return json.dumps({"ambiguous_phrases": list(ambiguous_phrases)})
        if step == "question":
            return json.dumps(
                {
                    "question": "Was meinst du damit?",
                    "options": [{"label": "beschimpft"}, {"label": "angebaggert"}],
                }
            )
        raise AssertionError(f"unexpected step {step!r} on the same-language path")

    monkeypatch.setattr("engine.translate.call", fake_call)
    return steps


GERMAN = "Er hat gesagt, er kriegt mich nach der Schule."


# --- the child's words survive, character for character ---------------------


@pytest.mark.parametrize("strategy", [ADAPTIVE, MULTI_PASS, BASELINE])
async def test_a_german_childs_words_are_returned_unchanged(monkeypatch, strategy):
    """Whatever strategy is asked for, the text is the child's own."""
    stub_calls(monkeypatch)

    result = await translate(GERMAN, "de", "de", strategy=strategy)

    assert result["translation"] == GERMAN, (
        "a German-speaking child's sentence came back altered; the adult must "
        "read the words the child wrote and approved, not a model's version"
    )


async def test_no_translation_call_is_made_for_a_german_child(monkeypatch):
    """The regression guard. stub_calls raises on any translate step."""
    steps = stub_calls(monkeypatch)

    await translate(GERMAN, "de", "de", strategy=ADAPTIVE)

    assert "translate" not in steps and "translate_retry" not in steps
    assert steps == ["ambiguity"], (
        f"expected only the ambiguity check, got {steps}. Every other call on "
        "this path is spending credit to rewrite a child who was already clear."
    )


async def test_the_old_failure_is_really_gone(monkeypatch):
    """The exact shape of the bug: an echo must not be read as a failure.

    Before the fix this raised EngineError('upstream_unavailable') or returned
    a paraphrase, because `untranslated(text, text, "de")` is True.
    """
    stub_calls(monkeypatch)

    result = await translate(GERMAN, "de", "de", strategy=ADAPTIVE)

    assert result["translation"] == GERMAN
    assert result["meaning_repaired"] == 0, "nothing was translated, so nothing was repaired"
    assert result["errors_caught"] == 0


# --- what the app still does for a German-speaking child --------------------


async def test_a_german_child_is_still_asked_about_a_two_meaning_phrase(monkeypatch):
    """The promise is not translation, it is never guessing.

    "angemacht" is being chatted up or being picked on, and an adult acts
    very differently on the two. The child decides, in German just as in
    Hindi.
    """
    stub_calls(
        monkeypatch,
        ambiguous_phrases=[
            {
                "phrase": "angemacht",
                "readings": [
                    {"meaning": "sie haben mich beschimpft", "target_phrasing": "beschimpft"},
                    {"meaning": "sie haben mich angebaggert", "target_phrasing": "angebaggert"},
                ],
            }
        ],
    )

    result = await translate("Die haben mich angemacht.", "de", "de", strategy=ADAPTIVE)

    assert result["ambiguities"], (
        "a German child wrote a phrase with two readings and was asked nothing; "
        "the one thing this app claims to do is ask instead of guessing"
    )
    question = result["ambiguities"][0]
    assert question["options"], "a question with no options is the same as no question"


async def test_confidence_does_not_pretend_to_understand(monkeypatch):
    """1.0 means "no meaning was lost in translation", because none happened.

    It must never be read as "the app understood the child". That is what the
    question is for, and the README says confidence is agreement between
    passes and not a correctness score.
    """
    stub_calls(monkeypatch)

    result = await translate(GERMAN, "de", "de", strategy=ADAPTIVE)

    assert result["confidence"] == 1.0


async def test_the_baseline_comparison_stays_fair(monkeypatch):
    """Neither path spends a call on a German sentence.

    If the baseline were charged a call here and ours were not, every cost
    and latency number in the README would quietly flatter us.
    """
    steps = stub_calls(monkeypatch)

    result = await translate(GERMAN, "de", "de", strategy=BASELINE)

    assert steps == [], f"baseline should not call anything for de->de, got {steps}"
    assert result["calls_made"] == 0
    assert result["translation"] == GERMAN


async def test_an_answer_from_the_child_never_rewrites_their_own_words(monkeypatch):
    """A clarification changes the German for a Hindi speaker. For a German
    speaker there is nothing to re-render, and inventing a "clearer" sentence
    would be the paraphrase this whole path exists to prevent."""
    stub_calls(monkeypatch)

    result = await translate(
        "Die haben mich angemacht.",
        "de",
        "de",
        clarifications={"angemacht": "opt_0"},
        strategy=ADAPTIVE,
    )

    assert result["translation"] == "Die haben mich angemacht."
    assert result["ambiguities"] == [], "already answered; do not ask twice"


# --- a newcomer is unaffected ----------------------------------------------


async def test_a_different_source_language_still_goes_through_translation(monkeypatch):
    """The guard is keyed on source == target, so Hindi must be untouched by
    it. Without this, a bug here could silently stop translating everyone."""

    async def fake_call(role, system, user, usage, **kwargs):
        if kwargs.get("step", "").startswith("translate"):
            raise RuntimeError("reached the translation step, as it should")
        return json.dumps({"ambiguous_phrases": []})

    monkeypatch.setattr("engine.translate.call", fake_call)

    with pytest.raises(RuntimeError, match="as it should"):
        await translate("woh mujhe maarte hain", "hi", "de", strategy=BASELINE)

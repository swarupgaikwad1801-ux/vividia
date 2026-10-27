"""The per-element eval score: whole words, and blind to nothing it claims to see.

eval/run_eval.py scores each translation on actor, negation, threat and timing
(testset/elements.json). These pin the matching, because a matcher that is
too loose makes every strategy look perfect, and one that is too strict makes
the human references fail their own key.
"""

import importlib.util
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
_spec = importlib.util.spec_from_file_location("run_eval", REPO_ROOT / "eval" / "run_eval.py")
run_eval = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(run_eval)

HE = {"all_of": [["er", "der junge"]]}
NOBODY = {"all_of": [["niemand*", "keiner"]]}
KNIFE_TOMORROW = {"all_of": [["morgen"], ["nach der schule"]]}


def kept(spec, german):
    return run_eval.element_kept(spec, german)[0]


def test_a_short_word_is_matched_as_a_word_not_inside_another():
    # "er" is inside "erzaehlt" and "Lehrer"; neither says who did it.
    assert kept(HE, "Er hat mich geschubst.")
    assert not kept(HE, "Ich habe es dem Lehrer erzählt.")


def test_a_star_matches_any_ending():
    assert kept(NOBODY, "Es würde niemanden kümmern.")
    assert kept({"all_of": [["beste* freund*"]]}, "Meine beste Freundin meldet sich nicht.")


def test_umlauts_fold_the_same_way_as_check():
    assert kept({"all_of": [["maedchen"]]}, "Ein Mädchen hat gespuckt.")


def test_a_threat_moved_to_another_day_loses_its_timing():
    # The real output for chaaku-kal on 25 Oct: the gist check passed (it has
    # "Messer"), but "kal" became "after the holidays" instead of tomorrow.
    assert not kept(KNIFE_TOMORROW, "Er sagte, er werde nach den Ferien ein Messer mitbringen.")
    assert kept(KNIFE_TOMORROW, "Er hat gesagt, dass er morgen nach der Schule ein Messer mitbringt.")


def test_every_element_is_reported_separately():
    scored = run_eval.score_elements(
        {"actor": HE, "timing": KNIFE_TOMORROW},
        "Er bringt nach den Ferien ein Messer mit.",
    )
    assert scored["actor"]["kept"] is True
    assert scored["timing"]["kept"] is False
    assert scored["timing"]["problems"]


def test_every_key_names_a_known_element_and_a_real_case():
    # --dry-run checks this too, in CI; this keeps it in the pytest run.
    assert run_eval.dry_run(sorted(run_eval.TESTSET_DIR.glob("*_core.json"))) == 0

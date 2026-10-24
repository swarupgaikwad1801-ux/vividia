"""Does the verification hold up in the languages we actually ship?

Everything so far was measured in English. The hero user writes Arabic,
Ukrainian or Turkish, and a pipeline that only works from English is worth
nothing to them. This is the Sunday gate from PLAN.md: if a language fails
here, we swap it before anyone builds screens for it.

Method
------
English is the ground truth, because that is where we know what each sentence
means and which trap it contains.

    English (known meaning)  ->  pivot language  ->  our pipeline  ->  German
                                                                        |
                        a grader compares the German against the ENGLISH meaning

A separate grader call decides whether the trap survived. It is shown the
English original and the German output, never the pivot text, so it grades the
end-to-end result rather than any single hop.

Honest limitations, to be repeated wherever these numbers appear:
- The pivot sentences are machine-translated, not written by children and not
  yet reviewed by native speakers. Neel's review replaces this.
- The grader is a model. Model-graded results are evidence, not proof, and
  must be reported separately from human review.

    backend/.venv/Scripts/python eval/language_gate.py
    backend/.venv/Scripts/python eval/language_gate.py --languages ar,uk
"""

import argparse
import asyncio
import json
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(REPO_ROOT / "backend"))

from engine import translate as T  # noqa: E402
from engine.client import Usage, call  # noqa: E402
from engine.prompts import language_name  # noqa: E402

PIVOT_SYSTEM = """Translate this English sentence into {target_name}.

It is something a child might write about their day at school. Write it the
way a child of about 12 would write it in {target_name}: simple, direct, not
formal and not literary.

Keep the meaning exactly. Reply with the translation only."""

GRADER_SYSTEM = """You check whether a German sentence still says what an
English sentence said.

You are given the English original, the German text, and the one detail that
matters most in this sentence.

Answer two things.

"detail_kept": true only if the German still carries that exact detail. If the
harm became milder, if a threat became harmless, if who did what changed, or
if a negation disappeared, answer false.

"meaning_kept": true if the German says the same thing overall.

Be strict. This text may be shown to a teacher deciding whether a child needs
help, so a German sentence that sounds fine but has lost the point is a
failure, not a pass."""

GRADER_SCHEMA = {
    "type": "json_schema",
    "json_schema": {
        "name": "grade",
        "strict": True,
        "schema": {
            "type": "object",
            "additionalProperties": False,
            "properties": {
                "detail_kept": {"type": "boolean"},
                "meaning_kept": {"type": "boolean"},
                "what_changed": {"type": "string", "description": "empty when nothing changed"},
            },
            "required": ["detail_kept", "meaning_kept", "what_changed"],
        },
    },
}


async def to_pivot(text, lang, usage):
    return await call(
        "fanout",
        PIVOT_SYSTEM.format(target_name=language_name(lang)),
        text,
        usage,
        temperature=0.3,
        max_tokens=400,
    )


async def grade(english, german, detail, usage):
    user = (
        f"English original:\n{english}\n\n"
        f"German text:\n{german}\n\n"
        f"The detail that matters:\n{detail}"
    )
    raw = await call(
        "judge", GRADER_SYSTEM, user, usage, temperature=0.0, max_tokens=400,
        response_format=GRADER_SCHEMA,
    )
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        return {"detail_kept": False, "meaning_kept": False, "what_changed": "grader returned invalid JSON"}


async def run_case(case, lang, overhead, semaphore):
    """One sentence, one language, both strategies, graded against English.

    The pivot is graded too. If the machine-made pivot already lost the trap,
    the detail is simply not in our pipeline's input, and scoring the pipeline
    on it measures the pivot translator instead of us. Those cases are
    reported separately rather than quietly counted as our failures.
    """
    async with semaphore:
        pivot = await to_pivot(case["text"], lang, overhead)
        pivot_grade = await grade(case["text"], pivot, case["trap"], overhead)

        base = await T.translate(pivot, lang, strategy=T.BASELINE)
        adaptive = await T.translate(pivot, lang, strategy=T.ADAPTIVE)

        base_grade, adaptive_grade = await asyncio.gather(
            grade(case["text"], base["translation"], case["trap"], overhead),
            grade(case["text"], adaptive["translation"], case["trap"], overhead),
        )

    return {
        "id": case["id"],
        "lang": lang,
        "pivot": pivot,
        "pivot_kept_trap": pivot_grade["detail_kept"],
        "pivot_lost": pivot_grade["what_changed"],
        "baseline": {"german": base["translation"], **base_grade, "calls": base["usage"]["calls_made"]},
        "adaptive": {
            "german": adaptive["translation"],
            **adaptive_grade,
            "calls": adaptive["usage"]["calls_made"],
            "repaired": adaptive.get("meaning_repaired", 0),
            "asked": len(adaptive["ambiguities"]),
            "cost": adaptive["usage"]["estimated_cost_usd"],
        },
    }


async def main() -> int:
    parser = argparse.ArgumentParser(description="Check the pipeline in the languages we ship.")
    parser.add_argument("--languages", default="hi", help="comma-separated ISO 639-1 codes")
    parser.add_argument("--cases", type=int, default=6, help="how many sentences from the starter set")
    parser.add_argument("--concurrency", type=int, default=3)
    args = parser.parse_args()

    cases = json.loads((REPO_ROOT / "eval/testset/en_starter.json").read_text(encoding="utf-8"))["cases"]
    cases = cases[: args.cases]
    languages = [code.strip() for code in args.languages.split(",") if code.strip()]

    overhead = Usage()  # pivot + grading calls, kept out of the pipeline's own numbers
    semaphore = asyncio.Semaphore(args.concurrency)

    results = await asyncio.gather(
        *[run_case(case, lang, overhead, semaphore) for lang in languages for case in cases]
    )

    print(f"\n{'=' * 78}")
    print("Trap survival, graded against the English original")
    print(f"{'=' * 78}")
    unusable = [r for r in results if not r["pivot_kept_trap"]]
    if unusable:
        print(f"\nExcluded: {len(unusable)} of {len(results)} cases where the machine-made")
        print("pivot already lost the detail before our pipeline saw it.")
        for row in unusable:
            print(f"    [{row['lang']}/{row['id']}] {row['pivot']}")

    for lang in languages:
        rows = [r for r in results if r["lang"] == lang and r["pivot_kept_trap"]]
        if not rows:
            print(f"\n{language_name(lang)} ({lang}): no usable cases")
            continue
        base_kept = sum(r["baseline"]["detail_kept"] for r in rows)
        adaptive_kept = sum(r["adaptive"]["detail_kept"] for r in rows)
        repaired = sum(r["adaptive"]["repaired"] for r in rows)
        asked = sum(r["adaptive"]["asked"] for r in rows)
        calls = sum(r["adaptive"]["calls"] for r in rows) / len(rows)
        print(f"\n{language_name(lang)} ({lang}), {len(rows)} sentences")
        print(f"  baseline  kept the key detail: {base_kept}/{len(rows)}")
        print(f"  adaptive  kept the key detail: {adaptive_kept}/{len(rows)}"
              f"   (repairs {repaired}, questions to the child {asked}, mean {calls:.1f} calls)")
        for row in rows:
            if not row["adaptive"]["detail_kept"] or not row["baseline"]["detail_kept"]:
                base_mark = "ok  " if row["baseline"]["detail_kept"] else "LOST"
                adaptive_mark = "ok  " if row["adaptive"]["detail_kept"] else "LOST"
                print(f"    [{row['id']}] baseline {base_mark} | adaptive {adaptive_mark}")
                if not row["adaptive"]["detail_kept"]:
                    print(f"        -> {row['adaptive']['german']}")
                    print(f"        changed: {row['adaptive']['what_changed'][:110]}")

    out = REPO_ROOT / "eval/results/language_gate.json"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(results, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"\nFull results: {out}")
    print(f"Grading and pivot overhead: {overhead.calls_made} calls, "
          f"${overhead.estimated_cost_usd:.4f} (not counted in the pipeline figures above)")
    print("\nPivot sentences are machine-translated and not yet reviewed by native")
    print("speakers; the grader is a model. Report these as model-graded evidence.")
    return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))

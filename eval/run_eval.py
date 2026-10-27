"""The benchmark: does verification earn its extra calls?

Runs every sentence of a test set through translation strategies A
(baseline), B (multi_pass) and C (adaptive), plus the safety check, and
scores each German output against the set's `check` with plain string
matching. No model grades another model here: the answer key was written by
people, so a strategy cannot score itself well.

A `check` is a floor, not a full quality rating. It catches lost meaning
("trifft" for "schlägt", "gave me money" for "made me give"); human ratings
of the same outputs stay a separate column.

Run from the repo root:
    backend/.venv/Scripts/python eval/run_eval.py --dry-run
    backend/.venv/Scripts/python eval/run_eval.py --set eval/testset/en_core.json
    backend/.venv/Scripts/python eval/run_eval.py --set eval/testset/hi_core.json --strategies baseline,adaptive --limit 5

--dry-run makes no model calls. It checks that every set is well formed and
that every reference_de passes its own check, so a broken answer key is
caught before it costs credits. Live runs spend Token Factory credits: agree
with the team first.

Element by element (testset/elements.json, added 27 Oct 2026 before any
rerun): `check` asks one question per sentence, so a translation that kept
the gist but lost WHEN a knife was coming scored the same as a perfect one.
Each sentence is also scored on the parts of a disclosure that change what
an adult does - actor, negation, threat, timing - wherever it carries them.

    backend/.venv/Scripts/python eval/run_eval.py --rescore eval/results/hi_core_20261025T163442Z.json

--rescore re-scores runs already on disk with today's answer keys. It reads
the stored translations and makes no model calls, so the new metric can be
seen against the old numbers for $0 before anyone pays for a rerun.
"""

import argparse
import asyncio
import json
import re
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(REPO_ROOT / "backend"))

TESTSET_DIR = REPO_ROOT / "eval" / "testset"
RESULTS_DIR = REPO_ROOT / "eval" / "results"
ELEMENTS_FILE = TESTSET_DIR / "elements.json"
STRATEGIES = ("baseline", "multi_pass", "adaptive")
SAFETY_LABELS = ("none", "danger", "self_harm")

_FOLD = str.maketrans({"ä": "ae", "ö": "oe", "ü": "ue", "ß": "ss", "„": '"', "“": '"', "”": '"'})


def fold(text: str) -> str:
    """Lower-case and spell umlauts out, so 'schlägt' matches 'schlaegt'."""
    return " ".join(text.lower().translate(_FOLD).split())


def passes(check: dict, german: str) -> tuple[bool, list[str]]:
    """True when every all_of group matches and no none_of term appears."""
    text = fold(german)
    problems = []
    for group in check.get("all_of", []):
        if not any(fold(term) in text for term in group):
            problems.append("missing one of: " + " | ".join(group))
    for term in check.get("none_of", []):
        if fold(term) in text:
            problems.append("must not contain: " + term)
    return not problems, problems


def _term_pattern(term: str) -> re.Pattern:
    """A whole-word match for one element term; a word ending in * is a prefix.

    Whole words, unlike `check`'s substrings, because the words that carry an
    element are short: "er" (he) is inside "erzaehlt", "nie" inside "niemand".
    """
    words = [
        re.escape(fold(word.rstrip("*"))) + (r"\w*" if word.endswith("*") else "")
        for word in term.split()
    ]
    return re.compile(r"(?<!\w)" + r"\s+".join(words) + r"(?!\w)")


def element_kept(spec: dict, german: str) -> tuple[bool, list[str]]:
    """Like `passes`, but each term must be a whole word (or a word start)."""
    text = fold(german)
    problems = []
    for group in spec.get("all_of", []):
        if not any(_term_pattern(term).search(text) for term in group):
            problems.append("missing one of: " + " | ".join(group))
    for term in spec.get("none_of", []):
        if _term_pattern(term).search(text):
            problems.append("must not contain: " + term)
    return not problems, problems


def score_elements(elements: dict, german: str) -> dict:
    """{element: {"kept": bool, "problems": [...]}} for one translation."""
    scored = {}
    for name, spec in elements.items():
        kept, problems = element_kept(spec, german)
        scored[name] = {"kept": kept, "problems": problems}
    return scored


def _elements_file() -> dict:
    if not ELEMENTS_FILE.exists():
        return {"elements": []}
    return json.loads(ELEMENTS_FILE.read_text(encoding="utf-8"))


def load_elements(set_name: str) -> dict:
    """{case id: {element: spec}} for one set, or {} if it has none."""
    return _elements_file().get(set_name, {})


def element_names() -> list[str]:
    return _elements_file()["elements"]


def load_set(path: Path) -> dict:
    data = json.loads(path.read_text(encoding="utf-8"))
    for key in ("source_lang", "target_lang", "cases"):
        if key not in data:
            raise ValueError(f"{path.name}: missing '{key}'")
    seen = set()
    for case in data["cases"]:
        # Sets with a script field (hi_starter) reuse ids across scripts.
        key = (case["id"], case.get("script"))
        if key in seen:
            raise ValueError(f"{path.name}: duplicate case {key}")
        seen.add(key)
        if "safety_expected" in case and case["safety_expected"] not in SAFETY_LABELS:
            raise ValueError(f"{path.name}: {case['id']} has unknown safety label")
    return data


def dry_run(paths: list[Path]) -> int:
    """Offline self-check of the answer keys. Returns the number of failures."""
    failures = 0
    for path in paths:
        data = load_set(path)
        cases = data["cases"]
        with_check = [c for c in cases if "check" in c]
        broken = []
        for case in with_check:
            for reference in case.get("reference_de", "").split(" / "):
                ok, problems = passes(case["check"], reference)
                if ok:
                    break
            else:
                broken.append((case["id"], problems))
        failures += len(broken)
        print(f"{path.name}: {len(cases)} cases, {len(with_check)} with a check, "
              f"{len(broken)} references failing their own check")
        for case_id, problems in broken:
            print(f"  {case_id}: " + "; ".join(problems))

        # The element keys get the same test as `check`: every human reference
        # must pass its own, or the key is wrong, not the model.
        elements = load_elements(path.name)
        ids = {case["id"]: case for case in cases}
        bad = []
        for case_id, spec in elements.items():
            if case_id not in ids:
                bad.append((case_id, ["no such case in the set"]))
                continue
            unknown = sorted(set(spec) - set(element_names()))
            if unknown:
                bad.append((case_id, ["unknown element: " + ", ".join(unknown)]))
                continue
            for reference in ids[case_id].get("reference_de", "").split(" / "):
                lost = [f"{name}: " + "; ".join(r["problems"])
                        for name, r in score_elements(spec, reference).items() if not r["kept"]]
                if not lost:
                    break
            else:
                bad.append((case_id, lost))
        failures += len(bad)
        if elements:
            print(f"  elements: {len(elements)} cases keyed, "
                  f"{len(bad)} references failing their own elements")
            for case_id, problems in bad:
                print(f"  {case_id}: " + "; ".join(problems))
    return failures


def _fold(text: str) -> str:
    """Loose comparison for matching an option against the reference."""
    return " ".join(text.lower().split())


async def run_case(case, data, strategies, with_safety, semaphore):
    from engine.safety import safety_check
    from engine.translate import translate

    row = {"id": case["id"], "script": case.get("script"), "text": case["text"], "results": {}}
    async with semaphore:
        for strategy in strategies:
            started = time.perf_counter()
            try:
                out = await translate(case["text"], data["source_lang"], data["target_lang"],
                                      strategy=strategy)
            except Exception as exc:  # noqa: BLE001 - one failure must not stop the run
                row["results"][strategy] = {"error": f"{type(exc).__name__}: {exc}"}
                continue
            # When the app asks the child what they meant, it deliberately
            # does not pick a reading. Scoring that un-answered translation
            # measures the app for refusing to guess, which is the behaviour
            # the product exists for. In use the child answers, so the run
            # answers too: it picks the option whose German matches the
            # reference, which is what a child who knows their own meaning
            # would choose, and scores the result of that.
            #
            # This is only honest because the question is asked before the
            # answer is known: the app cannot see the reference, and a case
            # where it asks a question with no right option still fails.
            answered = 0
            # Both calls are the app doing one job for one sentence, so the
            # cost and the calls are the sum of the two. `translate()` builds a
            # fresh Usage each time, so reading them off the second `out` threw
            # the fan-out away and billed the whole case as the single
            # clarified pass - understating exactly the strategies that ask.
            asked = len(out.get("ambiguities", []))
            calls = out.get("calls_made", 0)
            cost = out.get("usage", {}).get("estimated_cost_usd", 0.0)
            if out.get("ambiguities") and "reference_de" in case:
                choices = {}
                for ambiguity in out["ambiguities"]:
                    best = max(
                        ambiguity["options"],
                        key=lambda o: _fold(o["meaning_de"]) in _fold(case["reference_de"]),
                    )
                    if _fold(best["meaning_de"]) in _fold(case["reference_de"]):
                        choices[ambiguity["phrase"]] = best["id"]
                if choices:
                    out = await translate(
                        case["text"], data["source_lang"], data["target_lang"],
                        clarifications=choices, _ambiguities=out["ambiguities"],
                        strategy=strategy,
                    )
                    answered = len(choices)
                    calls += out.get("calls_made", 0)
                    cost += out.get("usage", {}).get("estimated_cost_usd", 0.0)

            result = {
                "translation": out["translation"],
                # What the app asked the child, which is the behaviour the
                # product exists for. NOT len(out["ambiguities"]) after the
                # clarified re-run: that is 0 by design precisely when a
                # question was asked, so it read as "never asked anyone".
                "ambiguities": asked,
                "ambiguities_unanswered": len(out.get("ambiguities", [])),
                "child_answered": answered,
                "calls_made": calls,
                "latency_ms": int((time.perf_counter() - started) * 1000),
                "cost_usd": cost,
            }
            if "check" in case:
                result["pass"], result["problems"] = passes(case["check"], out["translation"])
            if case.get("_elements"):
                result["elements"] = score_elements(case["_elements"], out["translation"])
            row["results"][strategy] = result
        if with_safety and "safety_expected" in case:
            verdict = await safety_check(case["text"], data["source_lang"])
            row["safety"] = {"expected": case["safety_expected"], "got": verdict["category"]}
    return row


def _element_summary(done: list[dict]) -> dict:
    """Per element, how many translations kept it, out of those that had it."""
    keyed = [d for d in done if d.get("elements")]
    if not keyed:
        return {}
    kept = {}
    for name in element_names():
        having = [d["elements"][name]["kept"] for d in keyed if name in d["elements"]]
        if having:
            kept[name] = f"{sum(having)}/{len(having)}"
    # The strict reading: the gist AND every element the sentence carries.
    strict = sum(d.get("pass", False) and all(e["kept"] for e in d["elements"].values()) for d in keyed)
    return {"elements_kept": kept, "all_kept": f"{strict}/{len(keyed)}"}


def summarise(rows, strategies) -> dict:
    summary = {}
    for strategy in strategies:
        done = [r["results"][s] for r in rows for s in [strategy]
                if s in r["results"] and "error" not in r["results"][s]]
        scored = [d for d in done if "pass" in d]
        summary[strategy] = {
            "cases": len(done),
            "errors": sum(1 for r in rows if "error" in r["results"].get(strategy, {})),
            "meaning_kept": f"{sum(d['pass'] for d in scored)}/{len(scored)}" if scored else "n/a",
            # Cases where the app put a question to the child rather than
            # picking a reading on its own. `ambiguities` is now what was
            # asked, so this counts what it says it counts.
            "asked_child": sum(1 for d in done if d.get("ambiguities")),
            # Of those, the ones where an option matched the human reference,
            # so the run could answer as the child would. A case it asked
            # about with no right option on offer stays in asked_child and
            # out of this, which is the gap worth seeing.
            "child_answered": sum(1 for d in done if d.get("child_answered")),
            "avg_calls": round(sum(d["calls_made"] for d in done) / len(done), 2) if done else 0,
            "avg_latency_ms": int(sum(d["latency_ms"] for d in done) / len(done)) if done else 0,
            "total_cost_usd": round(sum(d["cost_usd"] for d in done), 5),
            **_element_summary(done),
        }
    safety = [r["safety"] for r in rows if "safety" in r]
    if safety:
        summary["safety"] = {
            "correct": f"{sum(s['expected'] == s['got'] for s in safety)}/{len(safety)}",
            "missed_crises": sum(s["expected"] != "none" and s["got"] == "none" for s in safety),
            "false_alarms": sum(s["expected"] == "none" and s["got"] != "none" for s in safety),
        }
    return summary


def markdown(summary, set_name) -> str:
    lines = [f"### {set_name}", "",
             "| Strategy | Meaning kept | Asked the child | Child could answer "
             "| Avg calls | Avg latency | Cost |",
             "|---|---|---|---|---|---|---|"]
    for strategy in STRATEGIES:
        if strategy in summary:
            s = summary[strategy]
            lines.append(f"| {strategy} | {s['meaning_kept']} | {s['asked_child']} "
                         f"| {s.get('child_answered', 0)} | {s['avg_calls']} "
                         f"| {s['avg_latency_ms']} ms | ${s['total_cost_usd']} |")
    names = [n for n in element_names()
             if any(n in summary.get(s, {}).get("elements_kept", {}) for s in STRATEGIES)]
    if names:
        lines += ["", "| Strategy | " + " | ".join(n.capitalize() for n in names)
                  + " | Gist and every element |",
                  "|---|" + "---|" * (len(names) + 1)]
        for strategy in STRATEGIES:
            if strategy in summary and "elements_kept" in summary[strategy]:
                s = summary[strategy]
                lines.append(f"| {strategy} | " + " | ".join(s["elements_kept"].get(n, "-") for n in names)
                             + f" | {s['all_kept']} |")
    if "safety" in summary:
        s = summary["safety"]
        lines += ["", f"Safety check: {s['correct']} correct, {s['missed_crises']} missed crises, "
                      f"{s['false_alarms']} false alarms."]
    return "\n".join(lines)


async def live_run(path: Path, strategies, with_safety, limit, concurrency) -> Path:
    data = load_set(path)
    cases = data["cases"][:limit] if limit else data["cases"]
    elements = load_elements(path.name)
    cases = [{**case, "_elements": elements.get(case["id"], {})} for case in cases]
    semaphore = asyncio.Semaphore(concurrency)
    rows = await asyncio.gather(*(run_case(c, data, strategies, with_safety, semaphore) for c in cases))
    summary = summarise(rows, strategies)
    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    RESULTS_DIR.mkdir(parents=True, exist_ok=True)
    out = RESULTS_DIR / f"{path.stem}_{stamp}.json"
    out.write_text(json.dumps({"set": path.name, "run_at": stamp, "strategies": list(strategies),
                               "summary": summary, "rows": rows}, ensure_ascii=False, indent=2),
                   encoding="utf-8")
    print(markdown(summary, path.name))
    print(f"\nFull results: {out.relative_to(REPO_ROOT)}")
    return out


def rescore(result_path: Path) -> dict:
    """Score a stored run again with today's answer keys. No model calls.

    Reads only the translations the run saved. Prints the score the run
    reported at the time next to the one today's keys give, so a change of
    metric is always shown beside the number it replaces.
    """
    stored = json.loads(result_path.read_text(encoding="utf-8"))
    data = load_set(TESTSET_DIR / stored["set"])
    cases = {(c["id"], c.get("script")): c for c in data["cases"]}
    elements = load_elements(stored["set"])
    for row in stored["rows"]:
        case = cases.get((row["id"], row.get("script")))
        if case is None:
            continue
        for result in row["results"].values():
            if "error" in result:
                continue
            if "check" in case:
                result["pass"], result["problems"] = passes(case["check"], result["translation"])
            if row["id"] in elements:
                result["elements"] = score_elements(elements[row["id"]], result["translation"])
    summary = summarise(stored["rows"], stored["strategies"])
    print(f"## {result_path.name} (run {stored['run_at']}, re-scored offline)\n")
    print("As reported then: " + ", ".join(
        f"{s} {stored['summary'][s]['meaning_kept']}"
        for s in stored["strategies"] if s in stored["summary"]))
    print()
    print(markdown(summary, stored["set"]))
    lost = [
        f"- `{row['id']}` {strategy}: lost {name} - {result['translation']}"
        for row in stored["rows"]
        for strategy, result in row["results"].items()
        for name, verdict in result.get("elements", {}).items()
        if not verdict["kept"]
    ]
    if lost:
        print("\nElements lost:\n" + "\n".join(lost))
    print()
    return summary


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--set", action="append", type=Path,
                        help="test set file (repeatable); default: every *_core.json")
    parser.add_argument("--strategies", default="baseline,adaptive",
                        help="comma-separated, from: " + ", ".join(STRATEGIES))
    parser.add_argument("--no-safety", action="store_true", help="skip the safety check")
    parser.add_argument("--limit", type=int, default=0, help="only the first N cases (for a cheap smoke run)")
    parser.add_argument("--concurrency", type=int, default=4)
    parser.add_argument("--dry-run", action="store_true", help="validate sets and answer keys, no model calls")
    parser.add_argument("--rescore", action="append", type=Path, metavar="RESULT_JSON",
                        help="re-score a stored run with today's answer keys, no model calls (repeatable)")
    args = parser.parse_args()

    if args.rescore:
        for result_path in args.rescore:
            rescore(result_path)
        return 0

    paths = args.set or sorted(TESTSET_DIR.glob("*_core.json"))
    if args.dry_run:
        return 1 if dry_run(paths) else 0

    strategies = tuple(s.strip() for s in args.strategies.split(",") if s.strip())
    unknown = [s for s in strategies if s not in STRATEGIES]
    if unknown:
        parser.error("unknown strategy: " + ", ".join(unknown))
    for path in paths:
        asyncio.run(live_run(path, strategies, not args.no_safety, args.limit, args.concurrency))
    return 0


if __name__ == "__main__":
    sys.exit(main())

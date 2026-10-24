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
"""

import argparse
import asyncio
import json
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(REPO_ROOT / "backend"))

TESTSET_DIR = REPO_ROOT / "eval" / "testset"
RESULTS_DIR = REPO_ROOT / "eval" / "results"
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
    return failures


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
            result = {
                "translation": out["translation"],
                "ambiguities": len(out.get("ambiguities", [])),
                "calls_made": out.get("calls_made", 0),
                "latency_ms": int((time.perf_counter() - started) * 1000),
                "cost_usd": out.get("usage", {}).get("estimated_cost_usd", 0.0),
            }
            if "check" in case:
                result["pass"], result["problems"] = passes(case["check"], out["translation"])
            row["results"][strategy] = result
        if with_safety and "safety_expected" in case:
            verdict = await safety_check(case["text"], data["source_lang"])
            row["safety"] = {"expected": case["safety_expected"], "got": verdict["category"]}
    return row


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
            "asked_child": sum(1 for d in done if d["ambiguities"]),
            "avg_calls": round(sum(d["calls_made"] for d in done) / len(done), 2) if done else 0,
            "avg_latency_ms": int(sum(d["latency_ms"] for d in done) / len(done)) if done else 0,
            "total_cost_usd": round(sum(d["cost_usd"] for d in done), 5),
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
             "| Strategy | Meaning kept | Asked the child | Avg calls | Avg latency | Cost |",
             "|---|---|---|---|---|---|"]
    for strategy in STRATEGIES:
        if strategy in summary:
            s = summary[strategy]
            lines.append(f"| {strategy} | {s['meaning_kept']} | {s['asked_child']} | {s['avg_calls']} "
                         f"| {s['avg_latency_ms']} ms | ${s['total_cost_usd']} |")
    if "safety" in summary:
        s = summary["safety"]
        lines += ["", f"Safety check: {s['correct']} correct, {s['missed_crises']} missed crises, "
                      f"{s['false_alarms']} false alarms."]
    return "\n".join(lines)


async def live_run(path: Path, strategies, with_safety, limit, concurrency) -> Path:
    data = load_set(path)
    cases = data["cases"][:limit] if limit else data["cases"]
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
    args = parser.parse_args()

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

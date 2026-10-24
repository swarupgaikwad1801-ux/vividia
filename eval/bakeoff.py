"""Bake-off: which Nemotron model should run the translation fan-out?

Nano is the obvious pick on price, but the console caps it at 100 RPM, the
lowest on the platform, while Lightning allows 600 RPM at the same price.
This script measures both on the same sentences so the choice is made on
evidence, not on the model's name.

Run from the repo root:
    backend/.venv/Scripts/python eval/bakeoff.py
    backend/.venv/Scripts/python eval/bakeoff.py --repeat 3
"""

import argparse
import asyncio
import json
import sys
import time
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(REPO_ROOT / "backend"))

from openai import AsyncOpenAI  # noqa: E402

from engine.config import load_settings  # noqa: E402

# reasoning_effort is the only switch that controls these models' thinking
# (see eval/probe_thinking.py). The usable value differs per model:
#   Lightning: "none" works; every other value floods the answer with reasoning.
#   Nano: "none" returns an EMPTY answer, so "minimal" is the lowest usable one.
CANDIDATES = {
    "nano": ("nvidia/NVIDIA-Nemotron-3-Nano-30B-A3B", "minimal"),
    "lightning": ("nvidia/Nemotron-3_5-Lightning", "none"),
}

# The fan-out only proves something if the passes can differ, so vary the
# temperature across repeats the way the real fan-out will.
TEMPERATURES = [0.2, 0.6, 1.0, 0.4, 0.8]

PROMPT = (
    "Translate the message from a child into German.\n"
    "Keep the child's own voice: do not soften, do not make it more formal, "
    "do not add or remove anything.\n"
    "Reply with the translation only, nothing else."
)


async def translate_once(client, model, effort, text, semaphore, temperature):
    async with semaphore:
        start = time.perf_counter()
        response = await client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": PROMPT},
                {"role": "user", "content": text},
            ],
            temperature=temperature,
            max_tokens=600,
            extra_body={"reasoning_effort": effort},
        )
        elapsed = time.perf_counter() - start

    choice = response.choices[0].message
    # Some Nemotron models stream their reasoning in a separate field; others
    # put it inline. Record both so we can see which, and how much it costs.
    reasoning = getattr(choice, "reasoning_content", None)
    return {
        "text": (choice.content or "").strip(),
        "reasoning_chars": len(reasoning) if reasoning else 0,
        "seconds": elapsed,
        "out_tokens": response.usage.completion_tokens if response.usage else 0,
    }


async def run_model(client, label, model, effort, cases, repeat, concurrency):
    semaphore = asyncio.Semaphore(concurrency)
    started = time.perf_counter()
    results = await asyncio.gather(
        *[
            translate_once(client, model, effort, case["text"], semaphore,
                           TEMPERATURES[index % len(TEMPERATURES)])
            for case in cases
            for index in range(repeat)
        ],
        return_exceptions=True,
    )
    wall = time.perf_counter() - started

    failures = [r for r in results if isinstance(r, Exception)]
    ok = [r for r in results if not isinstance(r, Exception)]
    if not ok:
        print(f"\n{label}: every call failed. First error: {failures[0]}")
        return None

    print(f"\n{'=' * 78}\n{label}  ({model}, reasoning_effort={effort!r})\n{'=' * 78}")
    per_case = {}
    for index, case in enumerate(cases):
        runs = ok[index * repeat : (index + 1) * repeat]
        per_case[case["id"]] = runs
        print(f"\n[{case['id']}] {case['text']}")
        print(f"    trap: {case['trap']}")
        for run in runs:
            note = f"  (+{run['reasoning_chars']} reasoning chars)" if run["reasoning_chars"] else ""
            print(f"    -> {run['text']}{note}")

    mean_latency = sum(r["seconds"] for r in ok) / len(ok)
    mean_tokens = sum(r["out_tokens"] for r in ok) / len(ok)
    distinct = {case["id"]: len({r["text"] for r in runs}) for case, runs in zip(cases, per_case.values())}
    print(f"\n  calls: {len(ok)} ok, {len(failures)} failed")
    print(f"  wall clock: {wall:.1f} s at concurrency {concurrency}")
    print(f"  mean latency: {mean_latency:.2f} s | mean output tokens: {mean_tokens:.0f}")
    if repeat > 1:
        spread = sum(distinct.values()) / len(distinct)
        print(f"  mean distinct answers per sentence over {repeat} runs: {spread:.2f}")
    return {"label": label, "wall": wall, "latency": mean_latency, "tokens": mean_tokens, "failed": len(failures)}


async def main() -> int:
    parser = argparse.ArgumentParser(description="Compare Nemotron models for the translation fan-out.")
    parser.add_argument("--repeat", type=int, default=1, help="translations per sentence (spread check)")
    parser.add_argument("--concurrency", type=int, default=5, help="parallel calls; keep low, Nano allows 100 RPM")
    args = parser.parse_args()

    cases = json.loads((REPO_ROOT / "eval/testset/en_starter.json").read_text(encoding="utf-8"))["cases"]
    settings = load_settings()
    client = AsyncOpenAI(base_url=settings.base_url, api_key=settings.api_key)

    summaries = []
    for label, (model, effort) in CANDIDATES.items():
        summary = await run_model(client, label, model, effort, cases, args.repeat, args.concurrency)
        if summary:
            summaries.append(summary)

    if len(summaries) > 1:
        print(f"\n{'=' * 78}\nSummary\n{'=' * 78}")
        for s in summaries:
            print(f"  {s['label']:<10} {s['latency']:.2f} s/call | {s['tokens']:.0f} out tokens | {s['wall']:.1f} s total")
    return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))

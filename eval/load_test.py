"""Can the API take 50 children at once?

The quality bar says the demo must work on a cheap phone and finish in about
ten seconds. That is a promise about one request. This script asks the other
question: does request 50 still get served while 49 others are in flight, or
does the app serialise and leave the last child waiting a minute?

What it measures, and what it does not
--------------------------------------
By default it drives the FastAPI app in-process against the MOCK engine, so it
spends nothing and needs no key. That tests OUR concurrency: the routes, the
guard, the gathers. It does NOT test uvicorn, the host's own limits, or the
network, because there is no socket involved. Pass --url to test a deployment
for real.

The mock sleeps 1.5 s in `translate` and 0.3 s in `safety_check`, which the
routes run together, so a correctly concurrent app serves 50 requests in a
little over 1.5 s. One that serialises takes 75 s. The gap is the finding.

Each simulated child gets its own X-Forwarded-For, because 50 requests from one
address is what the per-client limit exists to stop. Use --same-client to point
this at the limiter deliberately and watch it work.

    cd backend && .venv/Scripts/python ../eval/load_test.py
    cd backend && .venv/Scripts/python ../eval/load_test.py --requests 50 --same-client
    cd backend && .venv/Scripts/python ../eval/load_test.py --url https://... --i-have-the-teams-ok

Running it against the live API spends credit on every request, so that needs
the team's agreement first; the flag is there to make it a decision rather
than a typo.
"""

import argparse
import asyncio
import logging
import os
import sys
import time
from collections import Counter
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(REPO_ROOT / "backend"))

import httpx  # noqa: E402

# Invented for testing, as everything in eval/testset is. A real disclosure is
# never used, here or anywhere.
SENTENCES = [
    "They took my bag again and everyone laughed at me.",
    "Nobody wants to sit next to me at lunch.",
    "He pushed me on the stairs and said it was just a joke.",
    "I'm scared to tell anyone because last time it got worse.",
    "They call me names about where I come from.",
]

# What we expect to hold. Failing either is a finding, so the script exits
# non-zero and can be wired into CI later.
MAX_ERROR_RATE = 0.02
MAX_P95_MS = 10_000


async def one_request(client, index: int, same_client: bool) -> dict:
    headers = {
        # .11 upward stays inside 198.51.100.0/24, which is reserved for
        # documentation and can never be a real person's address.
        "x-forwarded-for": "198.51.100.10" if same_client else f"198.51.100.{11 + index % 240}"
    }
    payload = {"text": SENTENCES[index % len(SENTENCES)], "source_lang": "en"}

    started = time.perf_counter()
    try:
        response = await client.post("/api/translate", json=payload, headers=headers)
        elapsed_ms = int((time.perf_counter() - started) * 1000)
    except Exception as error:  # noqa: BLE001 - a dropped connection is a result
        return {
            "ok": False,
            "ms": int((time.perf_counter() - started) * 1000),
            "label": f"no response ({type(error).__name__})",
        }

    if response.status_code == 200:
        body = response.json()
        return {
            "ok": True,
            "ms": elapsed_ms,
            "label": "200",
            "calls": body["usage"]["calls_made"],
            "cost": body["usage"]["estimated_cost_usd"],
        }

    # A non-2xx must still be an ErrorResponse, so read the code from it rather
    # than reporting a bare status.
    try:
        code = response.json().get("code", "?")
    except ValueError:
        code = "not an ErrorResponse"
    return {"ok": False, "ms": elapsed_ms, "label": f"{response.status_code} {code}"}


def report(results: list[dict], wall_ms: int, requests: int) -> int:
    ok = [r for r in results if r["ok"]]
    failed = [r for r in results if not r["ok"]]
    latencies = sorted(r["ms"] for r in results)

    def percentile(share: float) -> int:
        if not latencies:
            return 0
        return latencies[min(len(latencies) - 1, int(len(latencies) * share))]

    print(f"\n{'=' * 70}")
    print(f"{requests} parallel requests")
    print(f"{'=' * 70}")
    print(f"  wall clock       {wall_ms} ms")
    print(f"  served           {len(ok)}/{len(results)}")
    print(f"  latency p50      {percentile(0.50)} ms")
    print(f"  latency p95      {percentile(0.95)} ms")
    print(f"  latency max      {latencies[-1] if latencies else 0} ms")
    if wall_ms:
        print(f"  throughput       {len(results) / (wall_ms / 1000):.1f} requests/s")

    if ok and "cost" in ok[0]:
        print(f"  model calls      {sum(r.get('calls', 0) for r in ok)}")
        print(f"  estimated cost   ${sum(r.get('cost', 0.0) for r in ok):.6f}")

    if failed:
        print("\n  not served:")
        for label, count in Counter(r["label"] for r in failed).most_common():
            print(f"    {count:>4}  {label}")

    # The point of the exercise: concurrency. If the requests were served one
    # after another, the wall clock is close to the sum of the latencies.
    serial_ms = sum(latencies)
    if latencies and wall_ms > serial_ms * 0.5:
        print(f"\n  WARNING: wall clock {wall_ms} ms against {serial_ms} ms of")
        print("  summed latency suggests the requests were NOT served in parallel.")

    error_rate = len(failed) / len(results) if results else 1.0
    problems = []
    if error_rate > MAX_ERROR_RATE:
        problems.append(f"error rate {error_rate:.1%} is over {MAX_ERROR_RATE:.0%}")
    if percentile(0.95) > MAX_P95_MS:
        problems.append(f"p95 {percentile(0.95)} ms is over the {MAX_P95_MS} ms budget")

    if problems:
        print("\n  FAILED:")
        for problem in problems:
            print(f"    - {problem}")
        return 1

    print(f"\n  within budget (error rate {error_rate:.1%}, p95 under {MAX_P95_MS} ms)")
    return 0


async def main() -> int:
    parser = argparse.ArgumentParser(description="Load test the API.")
    parser.add_argument("--requests", type=int, default=50, help="how many at once")
    parser.add_argument("--url", default="", help="test a deployment instead of the app in-process")
    parser.add_argument(
        "--same-client",
        action="store_true",
        help="send every request from one address, to exercise the per-client limit",
    )
    parser.add_argument(
        "--i-have-the-teams-ok",
        action="store_true",
        help="required with --url: every request spends credit",
    )
    parser.add_argument("--timeout", type=float, default=60.0)
    args = parser.parse_args()

    # 50 requests produce 150 lines of per-request logging, which buries the
    # numbers this script exists to print.
    for noisy in ("httpx", "httpcore", "vividia"):
        logging.getLogger(noisy).setLevel(logging.WARNING)

    if args.url and not args.i_have_the_teams_ok:
        print("--url sends real traffic to a deployment, and every request there")
        print("spends Token Factory credit. Agree the spend with the team, then")
        print("pass --i-have-the-teams-ok.")
        return 2

    if args.url:
        print(f"Target: {args.url} (live; this spends credit)")
        transport = None
        base_url = args.url.rstrip("/")
    else:
        # Imported here so --url mode never needs the app or its settings.
        if os.getenv("ENGINE_MODE") == "live":
            print("ENGINE_MODE=live would spend credit on every request.")
            print("Unset it to load test the mock, or use --url with the team's OK.")
            return 2
        import main as app_module

        print(f"Target: the app in-process, {app_module.ENGINE.__name__}")
        print("(our own concurrency only: no socket, no uvicorn, no network)")
        transport = httpx.ASGITransport(app=app_module.app)
        base_url = "http://load-test"

        # The per-client limit would otherwise refuse request 41 and the run
        # would measure the limiter rather than the app. --same-client is how
        # you ask for the opposite.
        if not args.same_client:
            app_module.GUARD.per_ip_requests = max(
                app_module.GUARD.per_ip_requests, args.requests + 10
            )

    if args.same_client:
        print("All requests from one address: expect the per-client limit to refuse most.")

    async with httpx.AsyncClient(
        transport=transport, base_url=base_url, timeout=args.timeout
    ) as client:
        started = time.perf_counter()
        results = await asyncio.gather(
            *[one_request(client, i, args.same_client) for i in range(args.requests)]
        )
        wall_ms = int((time.perf_counter() - started) * 1000)

    exit_code = report(list(results), wall_ms, args.requests)

    if args.same_client:
        # Refusals are the expected outcome here, so the budget verdict above
        # does not apply.
        print("\n  (--same-client: refusals are the point, so the verdict above")
        print("   is not a judgement on the app.)")
        return 0
    return exit_code


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))

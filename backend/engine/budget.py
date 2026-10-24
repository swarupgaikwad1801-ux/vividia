"""How long each step may take, and what we do when one takes longer.

The quality bar in CLAUDE.md says verification "finishes in about 10 s or
less". A child who has just written down something hard is watching a progress
indicator; past about ten seconds they assume it broke.

A budget is only useful if something checks it, so:

- `over_budget()` reports every step that ran long, and is logged on each
  request, which is how we find out a step got slower before a judge does.
- `tests/test_latency.py` fails if the pipeline's SHAPE breaks the budget,
  using deliberately pessimistic per-call latencies. That test is about
  concurrency: 13 calls run sequentially blow the budget, the same 13 run in
  the gathers the pipeline actually uses do not.

The per-step ceilings are for ONE call. The fan-out makes five of them at once,
so five translate calls at 2 s each cost about 2 s, not 10.
"""

# The whole request, as the child experiences it.
TOTAL_MS = 10_000

# One call to each step. Over this and the step is the thing to optimise.
#
# Set from the one latency we have measured and otherwise generously: a fan-out
# call on Nemotron-3.5-Super-VL took 0.43 s (CLAUDE.md, the language gate), and
# the judge is a larger model answering under a JSON schema, so it gets more.
# Only the 0.43 s is a measurement; the rest are ceilings we are choosing, and
# none of them is a claim about how fast the live system runs.
STEP_MS = {
    "translate": 2_500,
    "translate_retry": 2_500,
    "back_translate": 2_500,
    "ambiguity": 4_000,
    "judge": 5_000,
    "question": 4_000,
    "repair": 4_000,
    "safety": 4_000,
}


def over_budget(usage) -> list[str]:
    """Which steps, if any, ran longer than they are allowed to.

    Returns strings safe to log: step names and milliseconds only.
    """
    breaches = []
    for step, times in usage.steps.items():
        ceiling = STEP_MS.get(step)
        if ceiling is None:
            continue
        worst = max(times)
        if worst > ceiling:
            breaches.append(f"{step} took {worst}ms (budget {ceiling}ms)")

    total = usage.latency_ms
    if total > TOTAL_MS:
        breaches.append(f"total took {total}ms (budget {TOTAL_MS}ms)")
    return breaches

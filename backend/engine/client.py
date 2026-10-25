"""One shared Token Factory client, with the limits the console actually sets.

Every model call in the engine goes through `call()`. It exists so that three
things are impossible to forget: staying under the per-model request limit,
retrying a blip without hammering, and counting what we spent.

Rate limits and prices are from the Nebius console, 24 Oct 2026. They are
per-model and differ a lot, so they live in ROLES rather than in the callers.
"""

import asyncio
import random
import time
from dataclasses import dataclass, field

import openai
from openai import AsyncOpenAI

from engine.config import load_settings


@dataclass(frozen=True)
class ModelRole:
    """A model plus everything the console tells us about using it."""

    model: str
    reasoning_effort: str  # Lightning accepts "none"; Nano returns empty for it
    rpm: int  # requests per minute allowed
    usd_per_m_input: float
    usd_per_m_output: float


# Chosen by measurement, not by name.
#
# Lightning won the English bake-off (eval/bakeoff.py) and was the fan-out
# model until eval/language_gate.py tested the languages we actually ship:
# with reasoning off it returned the Ukrainian input unchanged in 5 of 12
# runs, and once replied "Ich bin Nemotron, ein Sprachmodell von NVIDIA".
# Super-VL and Super both scored 0/12 failures; Super-VL is faster (0.43s vs
# 0.63s), has 10x the token budget, and reads images for a later feature.
#
# The judge is deliberately a different model from the translator. A judge
# that shares the translator's blind spots cannot see the translator's
# mistakes.
ROLES = {
    "fanout": ModelRole("nvidia/Nemotron-3.5-Super-VL", "none", 300, 0.30, 0.90),
    "judge": ModelRole("nvidia/nemotron-3-super-120b-a12b", "none", 300, 0.30, 0.90),
}

# Stay a little under the published limit: the fan-out is bursty, and a 429
# costs more time than the requests we give up.
SAFETY_FACTOR = 0.8

# How many requests a fan-out issues at once. Declared here rather than
# imported from translate.py, which imports this module, and pinned to
# len(translate.FANOUT_TEMPERATURES) by a test so the two cannot drift.
# The limiter uses it as a floor on its burst capacity: our own throttle
# should never be the reason the shape of work we actually do is slowed.
FANOUT_PASSES = 5


@dataclass
class Usage:
    """What a single request to our API cost, in calls, tokens and dollars."""

    calls_made: int = 0
    input_tokens: int = 0
    output_tokens: int = 0
    estimated_cost_usd: float = 0.0
    # step name -> how long each call to that step took, in ms. Server-side
    # only: it is not part of the wire contract, and it holds durations and
    # step names, never anything the child wrote.
    steps: dict[str, list[int]] = field(default_factory=dict)
    _started: float = field(default_factory=time.perf_counter)

    def record(self, role: ModelRole, prompt_tokens: int, completion_tokens: int) -> None:
        self.calls_made += 1
        self.input_tokens += prompt_tokens
        self.output_tokens += completion_tokens
        self.estimated_cost_usd += (
            prompt_tokens * role.usd_per_m_input + completion_tokens * role.usd_per_m_output
        ) / 1_000_000

    def record_step(self, step: str, elapsed_ms: int) -> None:
        self.steps.setdefault(step, []).append(elapsed_ms)

    def slowest_step(self) -> tuple[str, int]:
        """The step with the longest single call, which is what to optimise."""
        if not self.steps:
            return ("", 0)
        return max(
            ((step, max(times)) for step, times in self.steps.items()),
            key=lambda pair: pair[1],
        )

    @property
    def latency_ms(self) -> int:
        return int((time.perf_counter() - self._started) * 1000)

    def step_summary(self) -> str:
        """One log line: how long each step took and how often it ran.

        Safe to log by construction. It contains step names, counts and
        milliseconds, and no part of it is derived from the child's text.
        """
        parts = [
            f"{step}x{len(times)}={sum(times)}ms"
            for step, times in sorted(self.steps.items())
        ]
        return " ".join(parts)

    def as_dict(self) -> dict:
        return {
            "calls_made": self.calls_made,
            "input_tokens": self.input_tokens,
            "output_tokens": self.output_tokens,
            "latency_ms": self.latency_ms,
            "estimated_cost_usd": round(self.estimated_cost_usd, 8),
        }


class _Limiter:
    """Keeps us under a model's requests-per-minute cap, but allows a burst.

    The first version spaced every call a fixed gap apart: at 300 RPM with our
    0.8 safety factor, 250 ms. That is correct about the average and wrong
    about the shape of our traffic. A fan-out is five requests at once, and a
    fixed gap turned that into five requests over a second, so the fifth
    translation started a second after the first for no reason the rate limit
    required. Measured on the full verification path, our own spacing cost
    1.25 s of the 10 s budget.

    A token bucket is the usual answer and fits exactly: tokens refill at the
    allowed rate, so the per-minute average is still respected, and a short
    burst is served immediately as long as there are tokens for it. 300 RPM is
    five requests a second; a burst of five against that is nothing, and the
    bucket refills while the model is thinking.

    One bucket per role per event loop, so it is global across concurrent
    requests rather than per caller: ten children translating at once share
    the same allowance, which is the behaviour the cap actually needs.
    """

    def __init__(self, rpm: int):
        # Requests per second we are willing to average.
        self._rate = max(rpm * SAFETY_FACTOR / 60.0, 0.1)
        # Two seconds' worth, and never less than one fan-out, so the shape of
        # work we actually do is not throttled by our own limiter.
        self._capacity = max(self._rate * 2.0, float(FANOUT_PASSES))
        self._tokens = self._capacity
        self._updated = time.monotonic()
        self._lock = asyncio.Lock()

    async def wait(self) -> None:
        while True:
            async with self._lock:
                now = time.monotonic()
                self._tokens = min(
                    self._capacity, self._tokens + (now - self._updated) * self._rate
                )
                self._updated = now
                if self._tokens >= 1.0:
                    self._tokens -= 1.0
                    return
                # Sleep only as long as the next token needs, and recheck:
                # another caller may have taken it in the meantime.
                delay = (1.0 - self._tokens) / self._rate
            await asyncio.sleep(delay)


# An AsyncOpenAI client and an asyncio.Lock are both bound to the event loop
# that created them: reusing one on a second loop raises "Event loop is
# closed". Tests, scripts and uvicorn reloads each bring their own loop, so
# cache this state per loop rather than once per process.
_per_loop: dict[int, tuple[AsyncOpenAI, dict[str, "_Limiter"]]] = {}


def _state() -> tuple[AsyncOpenAI, dict[str, "_Limiter"]]:
    key = id(asyncio.get_running_loop())
    if key not in _per_loop:
        settings = load_settings()
        client = AsyncOpenAI(base_url=settings.base_url, api_key=settings.api_key, timeout=30.0)
        _per_loop[key] = (client, {})
    return _per_loop[key]


def get_client() -> AsyncOpenAI:
    return _state()[0]


class EngineError(RuntimeError):
    """A model call failed in a way the caller should turn into an ErrorResponse."""

    def __init__(self, code: str, message: str, retryable: bool):
        super().__init__(message)
        self.code = code
        self.retryable = retryable


async def call(
    role_name: str,
    system: str,
    user: str,
    usage: Usage,
    *,
    temperature: float = 0.3,
    max_tokens: int = 700,
    response_format: dict | None = None,
    attempts: int = 3,
    step: str = "",
) -> str:
    """Make one model call, respecting the rate limit and counting the cost.

    Retries only on the failures that a retry can actually fix: timeouts,
    connection drops, 429 and 5xx. A 401 or 402 is final, and retrying it
    only burns the clock.

    `step` names the pipeline step this call serves ("judge", "repair", ...) so
    the latency budget can be measured per step. It defaults to the role, which
    is coarser but never wrong.
    """
    role = ROLES[role_name]
    step = step or role_name
    client, limiters = _state()
    limiter = limiters.setdefault(role_name, _Limiter(role.rpm))

    extra = {"reasoning_effort": role.reasoning_effort}
    last_error: Exception | None = None

    for attempt in range(attempts):
        await limiter.wait()
        call_started = time.perf_counter()
        try:
            response = await client.chat.completions.create(
                model=role.model,
                messages=[{"role": "system", "content": system}, {"role": "user", "content": user}],
                temperature=temperature,
                max_tokens=max_tokens,
                extra_body=extra,
                **({"response_format": response_format} if response_format else {}),
            )
        except (openai.APITimeoutError, openai.APIConnectionError, openai.RateLimitError) as error:
            last_error = error
            # Back off with jitter so parallel passes don't retry in lockstep.
            await asyncio.sleep((2**attempt) * 0.5 + random.random() * 0.3)
            continue
        except openai.AuthenticationError as error:
            raise EngineError("internal", "API key rejected by Token Factory", False) from error
        except openai.APIStatusError as error:
            if error.status_code == 402:
                raise EngineError("credit_exhausted", "Nebius credit exhausted", False) from error
            if error.status_code >= 500:
                last_error = error
                await asyncio.sleep((2**attempt) * 0.5)
                continue
            # Only the status code, never error.message: an upstream error body
            # can quote the request, and we publish that we log no message
            # content. The original exception is still chained for a debugger.
            raise EngineError(
                "internal", f"Token Factory returned HTTP {error.status_code}", False
            ) from error

        # Timed around the request only. The limiter's own wait is our
        # throttling rather than the model's latency, and the child-facing
        # total is Usage.latency_ms, which includes everything.
        usage.record_step(step, int((time.perf_counter() - call_started) * 1000))

        if response.usage:
            usage.record(role, response.usage.prompt_tokens, response.usage.completion_tokens)
        content = (response.choices[0].message.content or "").strip()
        if not content:
            # Seen on Nano with reasoning_effort="none": a successful response
            # with an empty body. Treat it as a failure rather than letting an
            # empty translation reach a child.
            last_error = EngineError("internal", f"{role.model} returned an empty answer", True)
            continue
        return content

    if isinstance(last_error, openai.RateLimitError):
        raise EngineError("rate_limited", "Token Factory rate limit", True) from last_error
    if isinstance(last_error, openai.APITimeoutError):
        raise EngineError("upstream_timeout", "Token Factory timed out", True) from last_error
    raise EngineError(
        "upstream_unavailable",
        f"model call failed after {attempts} attempts: {type(last_error).__name__}",
        True,
    ) from last_error

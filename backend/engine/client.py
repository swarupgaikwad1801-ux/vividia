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


@dataclass
class Usage:
    """What a single request to our API cost, in calls, tokens and dollars."""

    calls_made: int = 0
    input_tokens: int = 0
    output_tokens: int = 0
    estimated_cost_usd: float = 0.0
    _started: float = field(default_factory=time.perf_counter)

    def record(self, role: ModelRole, prompt_tokens: int, completion_tokens: int) -> None:
        self.calls_made += 1
        self.input_tokens += prompt_tokens
        self.output_tokens += completion_tokens
        self.estimated_cost_usd += (
            prompt_tokens * role.usd_per_m_input + completion_tokens * role.usd_per_m_output
        ) / 1_000_000

    @property
    def latency_ms(self) -> int:
        return int((time.perf_counter() - self._started) * 1000)

    def as_dict(self) -> dict:
        return {
            "calls_made": self.calls_made,
            "input_tokens": self.input_tokens,
            "output_tokens": self.output_tokens,
            "latency_ms": self.latency_ms,
            "estimated_cost_usd": round(self.estimated_cost_usd, 8),
        }


class _Limiter:
    """Spaces calls out so we stay under a model's requests-per-minute cap."""

    def __init__(self, rpm: int):
        self._min_gap = 60.0 / (rpm * SAFETY_FACTOR)
        self._next_slot = 0.0
        self._lock = asyncio.Lock()

    async def wait(self) -> None:
        async with self._lock:
            now = time.monotonic()
            slot = max(now, self._next_slot)
            self._next_slot = slot + self._min_gap
        delay = slot - now
        if delay > 0:
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
) -> str:
    """Make one model call, respecting the rate limit and counting the cost.

    Retries only on the failures that a retry can actually fix: timeouts,
    connection drops, 429 and 5xx. A 401 or 402 is final, and retrying it
    only burns the clock.
    """
    role = ROLES[role_name]
    client, limiters = _state()
    limiter = limiters.setdefault(role_name, _Limiter(role.rpm))

    extra = {"reasoning_effort": role.reasoning_effort}
    last_error: Exception | None = None

    for attempt in range(attempts):
        await limiter.wait()
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
            raise EngineError("internal", f"{error.status_code}: {error.message}", False) from error

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
    raise EngineError("upstream_unavailable", f"model call failed: {last_error}", True) from last_error

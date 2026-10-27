"""Replay recorded model responses, so CI can prove the verification logic.

Why this exists
---------------
The parts of the engine most worth testing are the ones that only show
themselves on a specific model answer: the repair pass that fires when every
candidate made the same mistake, the question asked when the child's own
sentence is ambiguous, the guard that refuses untranslated output. Those need
a model's answer, and they must not need a live call: CI has no key, and
credits are for the demo.

What is replaced, and what is not
---------------------------------
Only the HTTP call is replaced. `engine.client.call()` runs for real, so the
rate limiter, the retry rules, the empty-answer guard and the cost accounting
are all exercised by these tests rather than mocked past. A transcript stands
in for the network, not for our code.

Matching
--------
A transcript is keyed by the KIND of call, not by the prompt text, because the
fan-out sends the same prompt five times at different temperatures. The kind is
read off the system prompt, which is the one thing that differs per step. Each
kind holds a list of answers, served in order; once the list runs out the last
answer repeats, so a fan-out where every pass agrees needs only one entry.

Provenance
----------
Every transcript carries `_provenance`. "hand-authored" means a person wrote
the answers to reproduce a behaviour observed and written down in CLAUDE.md;
the sentences are real observations, the token counts are not. "captured" means
`record_fixtures.py` saved real responses from Token Factory. Token counts in a
hand-authored transcript are plausible filler, so no test may assert a dollar
figure from one as if it had been measured.
"""

import asyncio
import json
from dataclasses import dataclass
from pathlib import Path

import httpx
import openai

from engine import client as engine_client

FIXTURES = Path(__file__).resolve().parent / "fixtures"

# Read off the system prompt. Order matters: the clarified translate prompt is
# the translate prompt plus a suffix, so it has to be tested for first.
#
# These are substrings of prompts.py, so rewording a prompt silently stops a
# kind being recognised: a clarified call then records as a plain `translate`
# and a test counting clarified calls sees 0 with no hint why. If a kind below
# stops matching, the prompt moved - fix the marker, do not revert the prompt.
_KINDS = [
    ("translate_clarified", "already told you which reading is theirs"),
    ("translate_retry", "The reply MUST be written in"),
    ("back_translate", "This is a check: someone will compare your output"),
    ("translate", "You translate a child's own words into"),
    ("judge", "You check whether translations of a child's sentence kept its meaning"),
    ("ambiguity", "You read one sentence written by a child and decide"),
    ("question", "You write one short question that asks a child what they meant"),
    ("repair", "You correct a translation that lost part of its meaning"),
    ("actor_threat", "You check two things about a translation, and nothing else"),
    ("safety", "You read one message from a child and decide whether they"),
]


def kind_of(system: str) -> str:
    """Which pipeline step this call is, judged from its system prompt."""
    for name, marker in _KINDS:
        if marker in system:
            return name
    raise AssertionError(
        "unrecognised system prompt; add it to _KINDS in tests/recorded.py:\n"
        + system[:200]
    )


# --- the stand-in for the network -------------------------------------------


@dataclass
class _Message:
    content: str | None


@dataclass
class _Choice:
    message: _Message


@dataclass
class _Usage:
    prompt_tokens: int
    completion_tokens: int


@dataclass
class _Completion:
    choices: list[_Choice]
    usage: _Usage


def _http(status: int) -> Exception:
    request = httpx.Request("POST", "https://api.tokenfactory.nebius.com/v1/chat/completions")
    response = httpx.Response(status, request=request)
    if status == 429:
        return openai.RateLimitError("rate limit exceeded", response=response, body=None)
    return openai.APIStatusError(f"HTTP {status}", response=response, body=None)


def _failure(name: str) -> Exception:
    """Turn a transcript's `fail` directive into the error the real client sees."""
    request = httpx.Request("POST", "https://api.tokenfactory.nebius.com/v1/chat/completions")
    match name:
        case "timeout":
            return openai.APITimeoutError(request)
        case "connection":
            return openai.APIConnectionError(request=request)
        case "rate_limit":
            return _http(429)
        case "server":
            return _http(503)
        case "credit_exhausted":
            return _http(402)
        case "auth":
            return openai.AuthenticationError(
                "invalid key", response=httpx.Response(401, request=request), body=None
            )
        case _:
            raise AssertionError(f"unknown fail directive: {name}")


class Transcript:
    """One scenario's recorded answers, served to the engine in order."""

    def __init__(self, data: dict):
        self.data = data
        self.provenance = data.get("_provenance", "unknown")
        self._answers: dict[str, list] = {
            kind: list(answers) for kind, answers in data.get("responses", {}).items()
        }
        self._served: dict[str, int] = {}
        self.calls: list[str] = []  # kinds, in the order the engine asked for them

    def _next(self, kind: str):
        answers = self._answers.get(kind)
        if not answers:
            raise AssertionError(
                f"transcript '{self.data.get('scenario')}' has no recorded "
                f"{kind!r} answer; the engine asked for one"
            )
        index = min(self._served.get(kind, 0), len(answers) - 1)
        self._served[kind] = index + 1
        return answers[index]

    def answer(self, system: str) -> _Completion:
        kind = kind_of(system)
        self.calls.append(kind)
        answer = self._next(kind)

        if isinstance(answer, dict) and "fail" in answer:
            raise _failure(answer["fail"])

        # A JSON step's answer is stored as an object for readability; the real
        # API hands back a string, so serialise it the way the engine will see it.
        content = answer if isinstance(answer, str) else json.dumps(answer, ensure_ascii=False)
        tokens = self.data.get("tokens", {"prompt": 60, "completion": 30})
        return _Completion(
            choices=[_Choice(_Message(content))],
            usage=_Usage(tokens["prompt"], tokens["completion"]),
        )

    def count(self, kind: str) -> int:
        return self.calls.count(kind)


class _Completions:
    def __init__(self, transcript: Transcript, latency_ms: dict[str, int] | None):
        self._transcript = transcript
        self._latency_ms = latency_ms or {}

    async def create(self, *, model, messages, **kwargs):  # noqa: ARG002 - mirrors the real signature
        system = next(m["content"] for m in messages if m["role"] == "system")

        # Sleeping here is what makes a latency test mean anything: the sleep is
        # a real await, so steps the pipeline gathers overlap and steps it
        # awaits one after another add up, exactly as they would on the network.
        delay = self._latency_ms.get(kind_of(system))
        if delay:
            await asyncio.sleep(delay / 1000)

        return self._transcript.answer(system)


class _StubClient:
    def __init__(self, transcript: Transcript, latency_ms: dict[str, int] | None = None):
        self.chat = type(
            "_Chat", (), {"completions": _Completions(transcript, latency_ms)}
        )()


def install(
    monkeypatch,
    transcript: Transcript,
    *,
    rpm: int | None = None,
    latency_ms: dict[str, int] | None = None,
) -> Transcript:
    """Serve `transcript` instead of Token Factory for the rest of this test.

    `engine.client._state` is the one function replaced. It is the only place
    that builds an AsyncOpenAI client and needs a key, so replacing it is what
    makes these tests run with no credentials; everything else in
    `engine.client` runs unchanged.

    `rpm` overrides the real per-model request limit. Tests pass a high value to
    avoid paying 0.25 s of real limiter sleep per call; the latency-budget test
    passes None to keep the limits the console actually sets.

    `latency_ms` maps a step name to how long its call should appear to take.
    Without it every call returns instantly, which is right for a logic test and
    useless for a timing one.
    """
    limiters: dict[str, engine_client._Limiter] = {}
    if rpm is not None:
        limiters = {role: engine_client._Limiter(rpm) for role in engine_client.ROLES}

    stub = _StubClient(transcript, latency_ms)
    monkeypatch.setattr(engine_client, "_state", lambda: (stub, limiters))
    return transcript


def load(name: str) -> Transcript:
    """Load tests/fixtures/<name>.json."""
    path = FIXTURES / f"{name}.json"
    return Transcript(json.loads(path.read_text(encoding="utf-8")))

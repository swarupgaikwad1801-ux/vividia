"""HTTP contract between the frontend and the backend.

Mirrored exactly in frontend/src/types/api.ts. Change both in the same commit,
and only after all three of us agree: Vernika builds screens against these
shapes while Swarup builds the real engine behind them.

The engine's own Python-level shapes live in engine/contract.py. These models
are the wire format; keep them boring and additive.
"""

from enum import Enum
from typing import Literal

from pydantic import BaseModel, Field


class Strategy(str, Enum):
    """Which verification path produced a translation.

    BASELINE is one call, the honest comparison point for the benchmark.
    MULTI_PASS always fans out. ADAPTIVE decides per sentence, and is what
    the app uses: extra calls have to earn their place.
    """

    BASELINE = "baseline"
    MULTI_PASS = "multi_pass"
    ADAPTIVE = "adaptive"


class SafetyCategory(str, Enum):
    NONE = "none"
    DANGER = "danger"
    SELF_HARM = "self_harm"


# --- shared pieces -----------------------------------------------------------


class Option(BaseModel):
    """One reading of an ambiguous phrase, offered to the child."""

    id: str = Field(description="Stable id the client sends back in /api/clarify")
    label: str = Field(description="Shown to the child, in the child's language")
    meaning_de: str = Field(description="What the German becomes if the child picks this")


class Ambiguity(BaseModel):
    """A phrase whose meaning the passes disagreed about."""

    phrase: str = Field(description="The phrase as the child wrote it")
    question: str = Field(description="Asked in the child's language")
    options: list[Option] = Field(min_length=2, max_length=3)
    severity: Literal["critical", "minor"] = Field(
        description="critical = the disagreement changes who did what, or negation"
    )


class Usage(BaseModel):
    """Shown live in the UI and recorded by the benchmark."""

    calls_made: int
    input_tokens: int
    output_tokens: int
    latency_ms: int
    estimated_cost_usd: float = Field(description="From the published per-token price; approximate")


class Safety(BaseModel):
    """Result of the safety check that always runs on disclosure text.

    Folded into the translate response on purpose: a separate endpoint could
    be forgotten by a caller, and this check must never be skipped.
    """

    urgent: bool
    category: SafetyCategory
    message_child: str = Field(default="", description="Calm text in the child's language; empty unless urgent")


# --- POST /api/translate -----------------------------------------------------


class TranslateRequest(BaseModel):
    text: str = Field(min_length=1, max_length=2000)
    source_lang: str = Field(description="ISO 639-1, e.g. 'ar', 'uk', 'tr'")
    target_lang: str = Field(default="de")
    strategy: Strategy = Field(default=Strategy.ADAPTIVE)


class TranslateResponse(BaseModel):
    translation: str
    confidence: float = Field(ge=0.0, le=1.0, description="Agreement between passes, NOT a correctness score")
    ambiguities: list[Ambiguity] = Field(default_factory=list)
    safety: Safety
    strategy_used: Strategy
    usage: Usage


# --- POST /api/clarify -------------------------------------------------------


class ClarifyRequest(BaseModel):
    """Re-translate with the child's answers applied.

    `choices` maps Ambiguity.phrase to the chosen Option.id. The child decides
    the meaning; the model never resolves an ambiguity on its own.
    """

    text: str = Field(min_length=1, max_length=2000)
    source_lang: str
    target_lang: str = Field(default="de")
    choices: dict[str, str] = Field(description="{ambiguity.phrase: option.id}")


# Same shape as a translate response; ambiguities should come back empty.
ClarifyResponse = TranslateResponse


# --- POST /api/report --------------------------------------------------------


class Entry(BaseModel):
    """One moment in the child's timeline, already approved by the child."""

    date: str = Field(description="ISO date, e.g. '2026-10-21'")
    mood: str = Field(description="Emoji check-in code, e.g. 'sad'")
    text_child: str
    text_de: str
    place: str | None = None
    people: str | None = None


class ReportRequest(BaseModel):
    entries: list[Entry] = Field(min_length=1)
    child_lang: str


class ReportResponse(BaseModel):
    child_version: str = Field(description="For the child to read and approve")
    german_version: str = Field(description="What the trusted adult reads")
    usage: Usage


# --- GET /api/resources ------------------------------------------------------


class Resource(BaseModel):
    name: str
    contact: str = Field(description="Phone number or URL")
    hours: str
    languages: list[str]
    source_url: str = Field(description="Where this was verified")
    retrieved_at: str = Field(description="ISO timestamp, shown in the UI")


class ResourcesResponse(BaseModel):
    resources: list[Resource]
    source: Literal["live", "fallback"] = Field(
        description="'fallback' when the Tavily lookup failed and curated data was served"
    )


# --- GET /api/health ---------------------------------------------------------


class HealthResponse(BaseModel):
    status: Literal["ok", "degraded"]
    engine: Literal["mock", "live"]
    models: dict[str, str] = Field(description="role -> model id, e.g. {'fanout': '...', 'judge': '...'}")
    budget: dict[str, str] = Field(
        default_factory=dict,
        description=(
            "Spend to watch while the demo is public, values as strings: "
            "tavily_spent_today, tavily_daily_cap, tavily_cached_states. "
            "Empty in mock mode, which spends nothing. Optional, so an older "
            "client is unaffected."
        ),
    )


# --- errors ------------------------------------------------------------------


class ErrorCode(str, Enum):
    UPSTREAM_TIMEOUT = "upstream_timeout"  # Nebius too slow; client should offer retry
    UPSTREAM_UNAVAILABLE = "upstream_unavailable"  # 5xx or connection error
    RATE_LIMITED = "rate_limited"  # our own limiter or Nebius 429
    CREDIT_EXHAUSTED = "credit_exhausted"  # Nebius 402
    INVALID_INPUT = "invalid_input"
    INTERNAL = "internal"


class ErrorResponse(BaseModel):
    """Every non-2xx response has this body.

    `message_child` is the only string the child should ever see; it is already
    in the child's language and never mentions tokens, models or HTTP codes.
    """

    code: ErrorCode
    message: str = Field(description="For developers and logs; never shown to a child")
    message_child: str
    retryable: bool

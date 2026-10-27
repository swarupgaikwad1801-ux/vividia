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


# --- POST /api/listen --------------------------------------------------------


class ListenKind(str, Enum):
    """What kind of thing the child just told us (engine/listen.py KINDS).

    Picks one of the fixed, reviewed sentences the listening screen answers
    with (`heard.*` in strings.ts). Never shown, never stored.
    """

    HURT = "hurt"
    NAMES = "names"
    LEFT_OUT = "left_out"
    TAKEN = "taken"
    ONLINE = "online"
    THREAT = "threat"
    FEELING = "feeling"
    GOOD = "good"
    ASKING = "asking"
    TALK = "talk"
    OTHER = "other"


class ListenDetail(str, Enum):
    """A detail the child's message already gives (engine/listen.py DETAILS).

    The listening screen asks only for the details still missing, so a child
    who wrote "at school today" is not then asked where and when. Never shown.
    """

    WHERE = "where"
    WHEN = "when"
    WHO = "who"
    FEELING = "feeling"


class ListenRequest(BaseModel):
    """One message from the child, before any card exists.

    Only the newest message is sent, not the conversation so far: the kind
    sentence answers what they just said, and the less of a child's words
    leave the phone, the better.
    """

    text: str = Field(min_length=1, max_length=2000)
    lang: str = Field(description="ISO 639-1, the child's language")


class ListenResponse(BaseModel):
    kind: ListenKind
    told: list[ListenDetail] = Field(
        default_factory=list,
        description="Details this message already gives; the screen does not ask for them.",
    )
    safety: Safety
    reply: str | None = Field(
        default=None,
        description=(
            "Only for kind 'other' and only when safety is not urgent: a short "
            "answer written by the model that passed both checks in "
            "engine/listen.py. null means show the reviewed sentence."
        ),
    )
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


# --- GET /api/emergency ------------------------------------------------------


class EmergencyResponse(BaseModel):
    contacts: list[Resource] = Field(
        min_length=1,
        description="110 and 112 from content/helplines.json, in file order; never Tavily, never a model"
    )


# --- GET /api/health ---------------------------------------------------------


# --- GET /api/guide ----------------------------------------------------------


class GuideStep(BaseModel):
    """One step of the 5-minute guide, with the page it came from."""

    text: str = Field(description="The step, in the language that was served")
    source_url: str | None = Field(
        default=None,
        description=(
            "The page this step is drawn from, resolved from the file's own "
            "`sources` map. None when the step cites nothing - a claim about "
            "how to treat a child who has just disclosed should carry its "
            "source, and a missing one should be visible rather than implied."
        ),
    )


class LadderRung(BaseModel):
    """One rung of the escalation ladder, shown to the CHILD, not the adult.

    It travels with the adult's guide because it lives in the same file and
    #33 served it from here. Different audience, same route - worth splitting
    one day, not worth splitting in freeze week.
    """

    id: str = Field(description="Stable id; lib/followups.ts matches on these")
    text: str = Field(description="In the language that was served")


class GuideResponse(BaseModel):
    """The 5-minute guide for the adult the child chose to tell.

    One language, not both. The adult reads one; sending two and letting the
    screen pick would put the choice in the component that knows least about
    it, and would double the size of a payload shown on a phone.

    The wording changes without a schema change - that is why `/api/guide`
    served the file as-is until now - but the SHAPE does not: a title, steps
    with sources, a footer, a date. Pinning the shape is what lets Vernika
    build against it; leaving the wording loose is what lets Neel edit it.
    """

    lang: str = Field(
        description=(
            "The language actually served, which is not always the one asked "
            "for: the guide exists in de and en only. The screen must read "
            "this rather than assume, so it can set `lang` on the element and "
            "a screen reader pronounces it correctly."
        )
    )
    title: str
    steps: list[GuideStep] = Field(min_length=1)
    footer: str
    checked_on: str = Field(
        description="When a person last checked this guide against its sources"
    )
    ladder: list[LadderRung] = Field(
        default_factory=list,
        description=(
            "The escalation ladder, in order, lowest rung first. Order is the "
            "content, so it is never re-sorted. `emergency` is deliberately "
            "absent: 110 is not a step up a ladder."
        ),
    )
    home_rule: str = Field(
        default="",
        description=(
            "The rule that outranks the ladder: if the child said it happens "
            "at home, family is never suggested at any rung."
        ),
    )


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

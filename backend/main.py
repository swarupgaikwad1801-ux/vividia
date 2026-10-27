"""FastAPI app: the contract, served.

Vernika owns this file from here on. It currently serves the mock engine so
the frontend can be built end to end today; swapping in the real engine is
changing `ENGINE` below once Swarup's modules land, with no route changes.

Run from backend/:
    .venv/Scripts/python -m uvicorn main:app --reload
Then open http://127.0.0.1:8000/docs for the generated API docs.
"""

import asyncio
import json
import logging
import os
import time

from fastapi import FastAPI, Query, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from engine.client import ROLES
from engine.config import REPO_ROOT
from engine.errors import message_for, safe_traceback, status_for, to_error_response
from engine.resources import emergency_numbers
from app.limits import Guard, client_key
from app.schemas import (
    ClarifyRequest,
    EmergencyResponse,
    Entry,
    ErrorResponse,
    GuideResponse,
    GuideStep,
    LadderRung,
    HealthResponse,
    ReportRequest,
    ReportResponse,
    ResourcesResponse,
    Strategy,
    TranslateRequest,
    TranslateResponse,
    ListenRequest,
    ListenResponse,
)
# ENGINE_MODE=live uses real Nemotron calls; anything else (the default)
# uses the mock, so the app runs with no API key and costs nothing.
if os.getenv("ENGINE_MODE", "mock") == "live":
    from engine import live as ENGINE
else:
    from engine import mock as ENGINE

# Never log disclosure text. The formatter below carries no request body, and
# no handler in this file may add one.
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger("vividia")

app = FastAPI(
    title="vividia API",
    description="Backend for an app that helps children who can't speak up. Serves the mock engine until the real one lands.",
    version="0.1.0",
)

# The frontend runs on a different origin in development and in production.
# Tighten this to the deployed origin before submitting.
app.add_middleware(
    CORSMiddleware,
    # The deployed frontend's origin is set as ALLOWED_ORIGINS on the host,
    # comma separated. Without it only local development works, which is the
    # safe default: a wildcard would let any page call this backend and spend
    # our credits.
    allow_origins=[
        origin.strip()
        for origin in os.getenv(
            "ALLOWED_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173"
        ).split(",")
        if origin.strip()
    ],
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


# One guard for the process. Translation is metered; /api/resources and
# /api/health deliberately are not, because the helplines must stay reachable
# even on a day when the demo has spent its allowance.
GUARD = Guard()

# Neel owns these files; the routes below only read them.
DEMO_STORY = REPO_ROOT / "content" / "demo_story.json"
ADULT_GUIDE = REPO_ROOT / "content" / "adult_guide.json"
ONBOARDING = REPO_ROOT / "content" / "onboarding.json"
log.info("demo limits: %s, %d requests per %ds per client",
         GUARD.status(), GUARD.per_ip_requests, int(GUARD.per_ip_window_s))


def _metered(request: Request, lang: str) -> None:
    """Refuse this request if the demo is out of allowance for today."""
    try:
        GUARD.check(client_key(request), time.monotonic())
    except Exception as error:  # noqa: BLE001 - becomes a calm sentence below
        raise ChildSafeError(error, lang) from error


def _usage_of(result: dict, started: float) -> dict:
    """Prefer the engine's own accounting; fall back for the mock."""
    usage = result.get("usage")
    if usage:
        return usage
    return {
        "calls_made": result.get("calls_made", 0),
        "input_tokens": 0,
        "output_tokens": 0,
        "latency_ms": int((time.perf_counter() - started) * 1000),
        "estimated_cost_usd": 0.0,
    }


class ChildSafeError(Exception):
    """A failure already turned into something a child can read.

    Raised instead of HTTPException because FastAPI wraps an HTTPException's
    detail in a {"detail": ...} envelope, and the contract says every non-2xx
    body IS an ErrorResponse. The handler below writes the body unwrapped.
    """

    def __init__(self, error: BaseException, lang: str):
        self.body = ErrorResponse.model_validate(to_error_response(error, lang))
        self.status = status_for(error)
        super().__init__(self.body.message)


@app.exception_handler(ChildSafeError)
async def _child_safe_error(request: Request, error: ChildSafeError) -> JSONResponse:
    # The code and whether a retry is worth offering go in the body; only the
    # developer half is logged, and it never carries the child's text.
    log.warning("%s %s -> %s: %s", request.method, request.url.path, error.body.code.value, error.body.message)
    return JSONResponse(status_code=error.status, content=error.body.model_dump(mode="json"))


@app.exception_handler(RequestValidationError)
async def _invalid_input(request: Request, error: RequestValidationError) -> JSONResponse:
    """FastAPI's own 422 body is a list of field errors, which is not an
    ErrorResponse and has nothing a child could read. Replace it.

    The child's language is in the body that just failed validation, so read it
    if it arrived and fall back to English if it did not.
    """
    lang = "en"
    try:
        body = error.body if isinstance(error.body, dict) else {}
        lang = body.get("source_lang") or body.get("child_lang") or "en"
    except Exception:  # noqa: BLE001 - a malformed body must not break the error path
        pass

    fields = [".".join(str(part) for part in item.get("loc", [])) for item in error.errors()]
    log.info("%s %s rejected: %s", request.method, request.url.path, ", ".join(fields))
    body = ErrorResponse(
        code="invalid_input",
        message=f"invalid request: {', '.join(fields)}",
        message_child=message_for("invalid_input", lang),
        retryable=False,
    )
    return JSONResponse(status_code=422, content=body.model_dump(mode="json"))


@app.exception_handler(Exception)
async def _unexpected(request: Request, error: Exception) -> JSONResponse:
    """Last line of defence: a bug anywhere must still reach the child as one
    calm sentence rather than as a stack trace.

    log.exception is deliberately not used. It prints the exception's own text
    as the last line of the traceback, and that text can contain whatever was
    passed to the exception, including the child's disclosure. safe_traceback
    gives the frames without it, which is what we actually need to fix a bug.
    """
    log.error(
        "%s %s failed: %s\n%s",
        request.method,
        request.url.path,
        type(error).__name__,
        safe_traceback(error),
    )
    body = ErrorResponse.model_validate(to_error_response(error, "en"))
    return JSONResponse(status_code=500, content=body.model_dump(mode="json"))


@app.get("/api/health", response_model=HealthResponse)
async def health() -> HealthResponse:
    live = ENGINE.__name__.endswith("live")
    models = {role: spec.model for role, spec in ROLES.items()} if live else {}
    # "degraded" is what the contract's status field is for: the app is up and
    # help is reachable, but translation is not available right now.
    return HealthResponse(
        status="ok" if GUARD.remaining_today() > 0 else "degraded",
        engine="live" if live else "mock",
        models={**models, **getattr(ENGINE, "STATUS", {})},
        # Watchable while the demo is public: the Tavily allowance has to last
        # until judging closes on 15 Dec, and a cap nobody can see is a cap
        # nobody notices hitting.
        budget=getattr(ENGINE, "tavily_status", dict)(),
    )


@app.post("/api/translate", response_model=TranslateResponse)
async def translate(request: TranslateRequest, http: Request) -> TranslateResponse:
    started = time.perf_counter()
    _metered(http, request.source_lang)
    try:
        # Independent of each other, so run them together: a child in crisis
        # should not wait on the full verification to be shown help.
        result, safety = await asyncio.gather(
            ENGINE.translate(
                request.text, request.source_lang, request.target_lang, strategy=request.strategy.value
            ),
            ENGINE.safety_check(request.text, request.source_lang),
        )
    except Exception as error:  # noqa: BLE001 - the child must never see a traceback
        # engine/errors.py decides the code, the status and the retry advice, so
        # a rate limit and an exhausted account no longer both read as "internal".
        raise ChildSafeError(error, request.source_lang) from error

    # The length of the text, never the text. Step timings come from
    # Usage.step_summary(), which is step names and milliseconds only.
    log.info(
        "translate lang=%s chars=%d calls=%d %s",
        request.source_lang,
        len(request.text),
        result["calls_made"],
        result.get("step_summary", ""),
    )
    for breach in result.get("budget_breaches", []):
        # Logged rather than raised: a slow answer is still the child's answer.
        log.warning("over the latency budget: %s", breach)

    usage = _usage_of(result, started)
    GUARD.record_spend(usage["estimated_cost_usd"])
    if GUARD.remaining_today() <= 0:
        log.warning("daily demo cap reached: %s", GUARD.status())

    return TranslateResponse(
        translation=result["translation"],
        confidence=result["confidence"],
        ambiguities=result["ambiguities"],
        safety=safety,
        strategy_used=result.get("strategy_used", request.strategy),
        usage=usage,
    )


@app.post("/api/listen", response_model=ListenResponse)
async def listen(request: ListenRequest, http: Request) -> ListenResponse:
    """Answer the child before offering anything: what kind of thing they said.

    The safety check runs here too, on every message, for the same reason it
    is folded into translate: a child who writes "I want to die" while
    talking must be shown help at once, not after they ask for a card.
    """
    started = time.perf_counter()
    _metered(http, request.lang)
    try:
        heard, safety = await asyncio.gather(
            ENGINE.listen(request.text, request.lang),
            ENGINE.safety_check(request.text, request.lang),
        )
    except Exception as error:  # noqa: BLE001 - the child must never see a traceback
        raise ChildSafeError(error, request.lang) from error

    # A written reply only where no reviewed sentence fits, and never for a
    # message the safety check flagged: a child in crisis gets fixed, sourced
    # words only. Sequential on purpose - it needs both answers above.
    written = None
    if heard["kind"] == "other" and not safety["urgent"]:
        try:
            answer = await ENGINE.reply(request.text, request.lang)
        except Exception:  # noqa: BLE001 - the reviewed sentence is always there
            answer = {"reply": None}
        written = answer.get("reply")
        heard = {**heard, "usage": _add_usage(heard.get("usage"), answer.get("usage"))}

    # The length, the kind and whether a reply was written, never the text.
    log.info("listen lang=%s chars=%d kind=%s written=%s",
             request.lang, len(request.text), heard["kind"], written is not None)
    usage = _usage_of(heard, started)
    GUARD.record_spend(usage["estimated_cost_usd"])
    return ListenResponse(kind=heard["kind"], safety=safety, reply=written, usage=usage)


def _add_usage(first: dict | None, second: dict | None) -> dict | None:
    """Two engine usages as one, so the cap counts the reply's calls too."""
    if not first or not second:
        return first or second
    return {
        key: first.get(key, 0) + second.get(key, 0) if key != "latency_ms" else max(first.get(key, 0), second.get(key, 0))
        for key in ("calls_made", "input_tokens", "output_tokens", "latency_ms", "estimated_cost_usd")
    }


@app.post("/api/clarify", response_model=TranslateResponse)
async def clarify(request: ClarifyRequest, http: Request) -> TranslateResponse:
    started = time.perf_counter()
    _metered(http, request.source_lang)
    try:
        result, safety = await asyncio.gather(
            ENGINE.translate(
                request.text, request.source_lang, request.target_lang, clarifications=request.choices
            ),
            ENGINE.safety_check(request.text, request.source_lang),
        )
    except Exception as error:  # noqa: BLE001
        raise ChildSafeError(error, request.source_lang) from error

    usage = _usage_of(result, started)
    GUARD.record_spend(usage["estimated_cost_usd"])

    return TranslateResponse(
        translation=result["translation"],
        confidence=result["confidence"],
        ambiguities=result["ambiguities"],
        safety=safety,
        strategy_used=Strategy.ADAPTIVE,
        usage=usage,
    )


@app.post("/api/report", response_model=ReportResponse)
async def report(request: ReportRequest, http: Request) -> ReportResponse:
    started = time.perf_counter()
    _metered(http, request.child_lang)
    entries = [entry.model_dump() for entry in request.entries]
    try:
        result = await ENGINE.report(entries, request.child_lang)
    except Exception as error:  # noqa: BLE001
        raise ChildSafeError(error, request.child_lang) from error

    usage = _usage_of(result, started)
    GUARD.record_spend(usage["estimated_cost_usd"])

    # calls_made was hard-coded to 1 here. A report makes no model calls at
    # all now, and the live check counter in the UI reads this number, so it
    # has to come from the engine's own accounting rather than from a guess.
    return ReportResponse(
        child_version=result["child_version"],
        german_version=result["german_version"],
        usage=usage,
    )


@app.get("/api/demo")
async def demo() -> dict:
    """The one-click demo story, so judges never paste an API key.

    Returns content/demo_story.json: the persona, an already-approved timeline,
    and the sentence the judge sends themselves. Neel owns that file and its
    shape, so this route serves it rather than re-describing it in a response
    model: typing it here would freeze his content into the HTTP contract and
    mean every wording change needed a schema change too.

    The timeline IS validated against the frozen Entry model before it goes
    out, because that file claims to "use the exact Entry shape so the app can
    load them as an already-approved timeline", and a claim like that should
    fail here rather than in a screen in front of a judge.

    Makes no model calls, so it is deliberately outside the spending cap: on a
    day the demo has spent its allowance the story must still load, exactly as
    the helplines must.
    """
    try:
        raw = json.loads(DEMO_STORY.read_text(encoding="utf-8"))
        timeline = [Entry.model_validate(entry) for entry in raw["timeline"]]
    except Exception as error:  # noqa: BLE001 - a broken demo file is ours, not the child's
        raise ChildSafeError(error, "en") from error

    # Keys starting with "_" are notes to the team, not payload.
    return {
        **{key: value for key, value in raw.items() if not key.startswith("_")},
        "timeline": [entry.model_dump() for entry in timeline],
    }



@app.get("/api/emergency", response_model=EmergencyResponse)
async def emergency() -> EmergencyResponse:
    """110 and 112, so no screen ever types a phone number itself.

    Read straight from content/helplines.json, the only place a contact may be
    defined. Not routed through ENGINE: these numbers are the same in mock and
    live mode, and must be. No Tavily and no model call, so it sits outside
    the spending cap: the emergency numbers have to load on a day the demo has
    spent its allowance, and with no API key at all.
    """
    try:
        contacts = emergency_numbers()
    except Exception as error:  # noqa: BLE001 - a broken content file is ours, not the child's
        raise ChildSafeError(error, "en") from error
    return EmergencyResponse(contacts=contacts)


def _without_notes(value):
    """Drop every key starting with "_", at any depth: notes to the team, not payload."""
    if isinstance(value, dict):
        return {key: _without_notes(item) for key, item in value.items() if not key.startswith("_")}
    if isinstance(value, list):
        return [_without_notes(item) for item in value]
    return value


def _content_file(path) -> dict:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception as error:  # noqa: BLE001 - a broken content file is ours, not the child's
        raise ChildSafeError(error, "en") from error


# The guide exists in these two. The adult the child chooses is, in this
# deployment, most often a teacher in a German school, so German is the
# default rather than English.
GUIDE_LANGS = ("de", "en")
GUIDE_FALLBACK = "de"


@app.get("/api/guide", response_model=GuideResponse)
async def guide(lang: str = GUIDE_FALLBACK) -> GuideResponse:
    """The 5-minute guide for the adult the child chose to tell.

    One language, chosen here rather than on the screen: the adult reads one,
    and sending both would put the choice in the component that knows least
    about it. The response says which language it actually served, because
    the guide exists in de and en only - a child who writes Hindi may well
    hand the phone to someone who reads German, and the screen must be able
    to set `lang` on the element rather than assume.

    Each step's `source` key is resolved to the URL from the file's own
    `sources` map, so the handoff card can link a step without carrying a
    copy of that map. A step that cites nothing gets `null` rather than a
    guess: a claim about how to treat a child who has just disclosed should
    carry its source, and a missing one should be visible.

    The wording changes without a schema change, which is why this served the
    file as-is until now. The shape does not change, and the shape is what
    the screen is built against.

    No model call and no Tavily, so it stays outside the spending cap: the
    adult has to be able to read this on a day the demo has spent its
    allowance. `/api/onboarding` below still serves its file whole, because
    nothing is built against it yet.
    """
    served = lang if lang in GUIDE_LANGS else GUIDE_FALLBACK
    data = _without_notes(_content_file(ADULT_GUIDE))
    guide_text = data.get("guide", {})
    sources = data.get("sources", {})

    steps = [
        GuideStep(
            text=step[served],
            # .get, not [], and None rather than "": an absent source must
            # read as "this step cites nothing" and not as a broken link.
            source_url=sources.get(step.get("source")) if step.get("source") else None,
        )
        for step in guide_text.get("steps", [])
        if isinstance(step, dict) and step.get(served)
    ]
    if not steps:
        raise ChildSafeError(ValueError(f"no guide steps for {served!r}"), served)

    # The ladder is the CHILD's, not the adult's, and rides along because it
    # lives in the same file. In FILE ORDER, never sorted: the order is the
    # content, and a child who has already been to the head of year should
    # never be sent back to their form teacher.
    #
    # `emergency` is dropped. The file lists it as a sixth rung and
    # lib/followups.ts deliberately leaves it out of LADDER, because an
    # emergency is not an escalation: 110 is what you do INSTEAD of climbing,
    # not the next thing to try after the school psychologist did not answer.
    # Serving it would hand every screen a rung reading "call the police" and
    # rely on each one remembering to filter it. The rule belongs in one
    # place, and the safer place is here.
    #
    # The numbers are still one tap away on every screen, from
    # /api/emergency, which is where they belong.
    ladder = [
        LadderRung(id=rung["id"], text=rung[served])
        for rung in data.get("escalation_ladder", {}).get("steps", [])
        if isinstance(rung, dict) and rung.get("id") and rung.get(served)
        and rung["id"] != "emergency"
    ]

    return GuideResponse(
        lang=served,
        title=guide_text.get("title", {}).get(served, ""),
        steps=steps,
        footer=guide_text.get("footer", {}).get(served, ""),
        checked_on=data.get("checked_on", ""),
        ladder=ladder,
        home_rule=data.get("escalation_ladder", {}).get("home_rule", ""),
    )


@app.get("/api/onboarding")
async def onboarding() -> dict:
    """First-run screens, in the child's language, served as the file has them.

    The file's `_review` note says whether a native speaker has read the Hindi.
    That one note is turned into `hindi_reviewed`, so the screen can carry the
    same "not yet reviewed" caveat as the rest of the Hindi copy rather than
    presenting a draft as final. No model call, outside the spending cap.
    """
    raw = _content_file(ONBOARDING)
    return {
        **_without_notes(raw),
        "hindi_reviewed": bool((raw.get("_review") or {}).get("hi")),
    }



@app.get("/api/resources", response_model=ResourcesResponse)
async def resources(
    lang: str = Query(description="ISO 639-1 code of the child's language"),
    state: str = Query(default="", description="German state code, e.g. 'BW'; optional"),
) -> ResourcesResponse:
    try:
        # "fallback" was hard-coded here. The UI shows the child where a number
        # came from, so the word has to be earned: "live" means Tavily answered
        # for their state, "fallback" means this is our curated file.
        found, source = await ENGINE.resources_with_source(state, lang)
    except Exception as error:  # noqa: BLE001
        raise ChildSafeError(error, lang) from error

    log.info("resources state=%s lang=%s found=%d source=%s", state or "-", lang, len(found), source)
    return ResourcesResponse(resources=found, source=source)

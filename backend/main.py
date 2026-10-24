"""FastAPI app: the contract, served.

Vernika owns this file from here on. It currently serves the mock engine so
the frontend can be built end to end today; swapping in the real engine is
changing `ENGINE` below once Swarup's modules land, with no route changes.

Run from backend/:
    .venv/Scripts/python -m uvicorn main:app --reload
Then open http://127.0.0.1:8000/docs for the generated API docs.
"""

import logging
import os
import time

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

from engine.client import ROLES
from app.schemas import (
    ClarifyRequest,
    ErrorCode,
    ErrorResponse,
    HealthResponse,
    ReportRequest,
    ReportResponse,
    ResourcesResponse,
    Strategy,
    TranslateRequest,
    TranslateResponse,
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
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


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


def _fail(code: ErrorCode, message: str, message_child: str, retryable: bool, status: int):
    """Raise an HTTP error whose body always matches ErrorResponse."""
    body = ErrorResponse(code=code, message=message, message_child=message_child, retryable=retryable)
    raise HTTPException(status_code=status, detail=body.model_dump())


@app.get("/api/health", response_model=HealthResponse)
async def health() -> HealthResponse:
    live = ENGINE.__name__.endswith("live")
    models = {role: spec.model for role, spec in ROLES.items()} if live else {}
    return HealthResponse(
        status="ok",
        engine="live" if live else "mock",
        models={**models, **getattr(ENGINE, "STATUS", {})},
    )


@app.post("/api/translate", response_model=TranslateResponse)
async def translate(request: TranslateRequest) -> TranslateResponse:
    started = time.perf_counter()
    try:
        result = await ENGINE.translate(
            request.text, request.source_lang, request.target_lang, strategy=request.strategy.value
        )
        safety = await ENGINE.safety_check(request.text, request.source_lang)
    except TimeoutError:
        _fail(
            ErrorCode.UPSTREAM_TIMEOUT,
            "engine timed out",
            "That took too long. Try again?",
            retryable=True,
            status=504,
        )
    except Exception as error:  # noqa: BLE001 - the child must never see a traceback
        log.exception("translate failed: %s", type(error).__name__)
        _fail(ErrorCode.INTERNAL, str(error), "Something went wrong. Your words are safe.", False, 500)

    log.info("translate lang=%s chars=%d calls=%d", request.source_lang, len(request.text), result["calls_made"])
    return TranslateResponse(
        translation=result["translation"],
        confidence=result["confidence"],
        ambiguities=result["ambiguities"],
        safety=safety,
        strategy_used=result.get("strategy_used", request.strategy),
        usage=_usage_of(result, started),
    )


@app.post("/api/clarify", response_model=TranslateResponse)
async def clarify(request: ClarifyRequest) -> TranslateResponse:
    started = time.perf_counter()
    result = await ENGINE.translate(
        request.text, request.source_lang, request.target_lang, clarifications=request.choices
    )
    safety = await ENGINE.safety_check(request.text, request.source_lang)
    return TranslateResponse(
        translation=result["translation"],
        confidence=result["confidence"],
        ambiguities=result["ambiguities"],
        safety=safety,
        strategy_used=Strategy.ADAPTIVE,
        usage=_usage_of(result, started),
    )


@app.post("/api/report", response_model=ReportResponse)
async def report(request: ReportRequest) -> ReportResponse:
    started = time.perf_counter()
    entries = [entry.model_dump() for entry in request.entries]
    result = await ENGINE.report(entries, request.child_lang)
    return ReportResponse(
        child_version=result["child_version"],
        german_version=result["german_version"],
        usage={
            "calls_made": 1,
            "input_tokens": 0,
            "output_tokens": 0,
            "latency_ms": int((time.perf_counter() - started) * 1000),
            "estimated_cost_usd": 0.0,
        },
    )


@app.get("/api/resources", response_model=ResourcesResponse)
async def resources(
    lang: str = Query(description="ISO 639-1 code of the child's language"),
    state: str = Query(default="", description="German state code, e.g. 'BW'; optional"),
) -> ResourcesResponse:
    found = await ENGINE.resources(state, lang)
    return ResourcesResponse(resources=found, source="fallback")

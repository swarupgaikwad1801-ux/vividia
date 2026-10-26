"""The engine the app uses: real where it exists, mock where it does not yet.

One import surface so `main.py` never changes as pieces land. Each function
below is either real or explicitly borrowed from the mock, and `STATUS` says
which, so `/api/health` can report the truth instead of a guess.

As Swarup and Neel finish a module, replace the mock line here and update
STATUS in the same commit.

Every function here is a one-line delegation to a name imported above, which
makes a missing import invisible until the route is called: Python resolves a
global at call time, not at import time, so the module loads cleanly and
`/api/health` still answers "live". `report` lost its import in the #19 merge
and failed every card in live mode for a week, while the whole test suite
stayed green because the tests run against the mock. test_live_delegates.py
now checks, for each function below, that the names it reaches for actually
exist.
"""

from typing import Literal

from engine.contract import Report, Resource, SafetyResult, TranslationResult
from engine.report import report as _report
from engine.resources import resources as _resources
from engine.resources import resources_with_source as _resources_with_source
from engine.safety import safety_check as _safety_check
from engine.translate import translate as _translate

STATUS = {
    "translate": "live",
    "report": "live",
    "safety_check": "live",
    "resources": "live",
}


async def translate(
    text: str,
    source_lang: str,
    target_lang: str = "de",
    clarifications: dict[str, str] | None = None,
    strategy: str = "adaptive",
    _ambiguities: list | None = None,
) -> TranslationResult:
    return await _translate(
        text, source_lang, target_lang, clarifications, strategy, _ambiguities
    )


async def report(entries: list, child_lang: str) -> Report:
    return await _report(entries, child_lang)


async def safety_check(text: str, lang: str) -> SafetyResult:
    return await _safety_check(text, lang)


async def resources(state: str, lang: str) -> list[Resource]:
    return await _resources(state, lang)


async def resources_with_source(
    state: str, lang: str
) -> tuple[list[Resource], Literal["live", "fallback"]]:
    """The same list, plus whether the local lookup actually reached Tavily.

    main.py needs the second value so ResourcesResponse.source stops being a
    hard-coded "fallback". The child is shown that word, so it has to be true:
    it is the difference between a number we looked up today and one we are
    serving from our own curated file.
    """
    return await _resources_with_source(state, lang)

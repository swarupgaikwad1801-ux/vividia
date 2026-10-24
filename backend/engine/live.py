"""The engine the app uses: real where it exists, mock where it does not yet.

One import surface so `main.py` never changes as pieces land. Each function
below is either real or explicitly borrowed from the mock, and `STATUS` says
which, so `/api/health` can report the truth instead of a guess.

As Swarup and Neel finish a module, replace the mock line here and update
STATUS in the same commit.
"""

from engine import mock
from engine.contract import Report, Resource, SafetyResult, TranslationResult
from engine.safety import safety_check as _safety_check
from engine.translate import translate as _translate

STATUS = {
    "translate": "live",
    "report": "live",
    "safety_check": "live",
    "resources": "mock",
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
    return await mock.resources(state, lang)

"""Fake engine with the final signatures, so the app can be built now.

Vernika's routes call these until the real functions exist. The real ones
(translate.py, report.py, safety.py, resources.py) must keep exactly these
signatures and return shapes from contract.py.

The data below is a fictional example, not a real child.
"""

import asyncio
from datetime import datetime, timezone

from engine.contract import Entry, Report, Resource, SafetyResult, TranslationResult


async def translate(
    text: str,
    source_lang: str,
    target_lang: str = "de",
    clarifications: dict[str, str] | None = None,
    strategy: str = "adaptive",
    _ambiguities: list | None = None,
) -> TranslationResult:
    """`clarifications` maps an ambiguous phrase to the option label the child picked."""
    await asyncio.sleep(1.5)  # roughly what the real fan-out will feel like
    if clarifications:
        return {
            "translation": "Sie haben mir wieder meine Tasche weggenommen und alle haben mich ausgelacht.",
            "confidence": 0.97,
            "ambiguities": [],
            "calls_made": 13,
        }
    return {
        "translation": "Sie haben mir wieder meine Tasche weggenommen und alle haben über mich gelacht.",
        "confidence": 0.82,
        "ambiguities": [
            {
                "phrase": "laughed at me",
                "question": "Did they laugh to make fun of you, or did they laugh together with you?",
                "options": [
                    {"id": "mock", "label": "To make fun of me", "meaning_de": "mich ausgelacht"},
                    {"id": "with", "label": "Together with me", "meaning_de": "mit mir gelacht"},
                ],
                "severity": "critical",
            }
        ],
        "calls_made": 11,
    }


async def report(entries: list[Entry], child_lang: str) -> Report:
    await asyncio.sleep(1.0)
    return {
        "child_version": f"{len(entries)} times something happened at school. (example text)",
        "german_version": f"In {len(entries)} Fällen ist in der Schule etwas passiert. (Beispieltext)",
    }


async def safety_check(text: str, lang: str) -> SafetyResult:
    await asyncio.sleep(0.3)
    return {"urgent": False, "category": "none", "message_child": ""}


async def resources(state: str, lang: str) -> list[Resource]:
    await asyncio.sleep(0.5)
    return [
        {
            "name": "Nummer gegen Kummer (example entry, not yet verified)",
            "contact": "116 111",
            "hours": "TBD",
            "languages": ["de"],
            "source_url": "TBD",
            "retrieved_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        }
    ]

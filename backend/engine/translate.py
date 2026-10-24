"""Translation with meaning verification: strategies A, B and C.

- A, baseline: one call. The comparison point the benchmark needs.
- B, multi-pass: always fan out, back-translate, judge.
- C, adaptive: start with two cheap passes; spend more only when this
  particular sentence shows it needs it. This is what the app uses.

The point of C is that extra calls must earn their place. A sentence whose
two independent passes agree word for word, and which carries none of the
markers that change meaning, does not need five more calls.

What the child is promised, and what the code must keep:
the model never decides what an ambiguous phrase meant. It surfaces the
disagreement; the child chooses; the final pass renders that choice.
"""

import asyncio
import json
import re

from engine.client import Usage, call
from engine.contract import Ambiguity, TranslationResult
from engine.prompts import (
    BACK_TRANSLATE_SYSTEM,
    CLARIFIED_SUFFIX,
    JUDGE_SCHEMA,
    JUDGE_SYSTEM,
    QUESTION_SCHEMA,
    QUESTION_SYSTEM,
    TRANSLATE_SYSTEM,
    language_name,
)

BASELINE = "baseline"
MULTI_PASS = "multi_pass"
ADAPTIVE = "adaptive"

# Independent passes need to be able to differ, or agreement proves nothing.
FANOUT_TEMPERATURES = [0.2, 0.5, 0.8, 1.0, 0.3]
TRIAGE_TEMPERATURES = [0.2, 0.8]

# Markers that make a sentence worth verifying even when two passes agree.
# These are the places where a wrong translation changes what happened, which
# is exactly what our bake-off saw go wrong ("they made me give them my money"
# became "they gave me money").
RISK_PATTERNS = [
    r"\b(not|никог|لا|değil|kein|nicht|never|nobody|no one|didn'?t|won'?t|can'?t)\b",  # negation
    r"\b(made|forced|threat|hurt|hit|kick|push|touch|afraid|scared|weapon|knife)\w*\b",  # force or threat
    r"\b(they|them|he|she|someone|somebody)\b",  # who did it is not named
]
_RISK = [re.compile(pattern, re.IGNORECASE | re.UNICODE) for pattern in RISK_PATTERNS]


def _normalise(text: str) -> str:
    """Compare meaning-ish, not punctuation: lowercase, strip, collapse spaces."""
    return re.sub(r"[\s\W_]+", " ", text.lower()).strip()


def looks_risky(text: str) -> bool:
    """True when this sentence is the kind that loses meaning in translation."""
    return any(pattern.search(text) for pattern in _RISK)


async def _one_pass(text, source_lang, target_lang, usage, temperature, decisions=None):
    system = TRANSLATE_SYSTEM.format(target_name=language_name(target_lang))
    if decisions:
        system += CLARIFIED_SUFFIX.format(decisions=decisions)
    return await call("fanout", system, text, usage, temperature=temperature, max_tokens=500)


async def _back(german, source_lang, target_lang, usage):
    system = BACK_TRANSLATE_SYSTEM.format(
        target_name=language_name(target_lang), source_name=language_name(source_lang)
    )
    return await call("fanout", system, german, usage, temperature=0.2, max_tokens=500)


async def _judge(text, candidates, backs, source_lang, target_lang, usage):
    numbered = "\n".join(f"[{i}] {c}" for i, c in enumerate(candidates))
    numbered_backs = "\n".join(f"[{i}] {b}" for i, b in enumerate(backs))
    user = (
        f"The child wrote ({language_name(source_lang)}):\n{text}\n\n"
        f"Translations into {language_name(target_lang)}:\n{numbered}\n\n"
        f"Those translated back into {language_name(source_lang)}:\n{numbered_backs}"
    )
    system = JUDGE_SYSTEM.format(
        target_name=language_name(target_lang), source_name=language_name(source_lang)
    )
    raw = await call(
        "judge", system, user, usage, temperature=0.0, max_tokens=900, response_format=JUDGE_SCHEMA
    )
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        # Schema-constrained output has not failed in testing, but a malformed
        # verdict must not take the whole request down: fall back to "no
        # disagreement found" rather than inventing one.
        return {"best_index": 0, "agreement": 0.5, "disputes": []}


async def _question(phrase, readings, source_lang, usage) -> Ambiguity | None:
    """Turn one disputed phrase into a question a child can actually answer."""
    options_text = "\n".join(f"- {r['meaning']}" for r in readings)
    user = f'Phrase from the child: "{phrase}"\n\nPossible meanings:\n{options_text}'
    raw = await call(
        "judge",
        QUESTION_SYSTEM.format(source_name=language_name(source_lang)),
        user,
        usage,
        temperature=0.3,
        max_tokens=300,
        response_format=QUESTION_SCHEMA,
    )
    try:
        parsed = json.loads(raw)
    except json.JSONDecodeError:
        return None

    labels = [o["label"] for o in parsed.get("options", [])][: len(readings)]
    if len(labels) < 2:
        return None
    return {
        "phrase": phrase,
        "question": parsed["question"],
        "options": [
            {"id": f"opt{i}", "label": label, "meaning_de": readings[i]["target_phrasing"]}
            for i, label in enumerate(labels)
        ],
        "severity": "critical",
    }


def _decisions_text(ambiguities, choices) -> str:
    """Render the child's answers as instructions for the final pass."""
    lines = []
    for ambiguity in ambiguities:
        chosen = choices.get(ambiguity["phrase"])
        for option in ambiguity["options"]:
            if option["id"] == chosen or option["label"] == chosen:
                lines.append(f'- "{ambiguity["phrase"]}" means: {option["meaning_de"]}')
    return "\n".join(lines)


async def _verify(text, candidates, source_lang, target_lang, usage):
    """Back-translate, judge, and turn critical disputes into child questions."""
    backs = await asyncio.gather(*[_back(c, source_lang, target_lang, usage) for c in candidates])
    verdict = await _judge(text, candidates, backs, source_lang, target_lang, usage)

    best_index = verdict.get("best_index", 0)
    if not 0 <= best_index < len(candidates):
        best_index = 0

    critical = [
        dispute
        for dispute in verdict.get("disputes", [])
        if dispute.get("severity") == "critical" and len(dispute.get("readings", [])) >= 2
    ][:2]  # never interrupt a child with more than two questions

    questions = await asyncio.gather(
        *[_question(d["phrase"], d["readings"], source_lang, usage) for d in critical]
    )
    return {
        "translation": candidates[best_index],
        "confidence": float(verdict.get("agreement", 0.5)),
        "ambiguities": [q for q in questions if q],
    }


async def translate(
    text: str,
    source_lang: str,
    target_lang: str = "de",
    clarifications: dict[str, str] | None = None,
    strategy: str = ADAPTIVE,
    _ambiguities: list | None = None,
) -> TranslationResult:
    """Translate the child's text, and say where its meaning is uncertain.

    `clarifications` maps a phrase to the option the child picked. When it is
    present the child has already decided, so we render that decision in a
    single pass instead of asking again.
    """
    usage = Usage()
    text = text.strip()

    if clarifications:
        decisions = _decisions_text(_ambiguities or [], clarifications)
        german = await _one_pass(text, source_lang, target_lang, usage, 0.2, decisions)
        return {"translation": german, "confidence": 1.0, "ambiguities": [],
                "calls_made": usage.calls_made, "usage": usage.as_dict(), "strategy_used": strategy}

    if strategy == BASELINE:
        german = await _one_pass(text, source_lang, target_lang, usage, 0.2)
        return {"translation": german, "confidence": 0.0, "ambiguities": [],
                "calls_made": usage.calls_made, "usage": usage.as_dict(), "strategy_used": BASELINE}

    if strategy == MULTI_PASS:
        candidates = await asyncio.gather(
            *[_one_pass(text, source_lang, target_lang, usage, t) for t in FANOUT_TEMPERATURES]
        )
        result = await _verify(text, list(candidates), source_lang, target_lang, usage)
        return {**result, "calls_made": usage.calls_made, "usage": usage.as_dict(),
                "strategy_used": MULTI_PASS}

    # Adaptive: two passes first, then decide whether this sentence needs more.
    first = await asyncio.gather(
        *[_one_pass(text, source_lang, target_lang, usage, t) for t in TRIAGE_TEMPERATURES]
    )
    passes_agree = _normalise(first[0]) == _normalise(first[1])
    if passes_agree and not looks_risky(text):
        return {"translation": first[0], "confidence": 1.0, "ambiguities": [],
                "calls_made": usage.calls_made, "usage": usage.as_dict(),
                "strategy_used": ADAPTIVE}

    extra = await asyncio.gather(
        *[_one_pass(text, source_lang, target_lang, usage, t) for t in FANOUT_TEMPERATURES[2:]]
    )
    result = await _verify(text, [*first, *extra], source_lang, target_lang, usage)
    return {**result, "calls_made": usage.calls_made, "usage": usage.as_dict(),
            "strategy_used": ADAPTIVE}

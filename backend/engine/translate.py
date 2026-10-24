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
from functools import lru_cache

from engine.budget import over_budget
from engine.client import EngineError, Usage, call
from engine.config import REPO_ROOT
from engine.contract import Ambiguity, TranslationResult
from engine.prompts import (
    ACTOR_THREAT_SCHEMA,
    ACTOR_THREAT_SYSTEM,
    AMBIGUITY_SCHEMA,
    AMBIGUITY_SYSTEM,
    BACK_TRANSLATE_SYSTEM,
    REPAIR_SYSTEM,
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
# Varied enough that the passes can disagree, which is what makes agreement
# mean anything, but no further. Temperature 1.0 was measured producing a
# literal "verbrannt" (burned) for "they roasted me" in 1 run of 3, which the
# judge then sometimes picked over the correct slang; every value at or below
# 0.8 produced correct slang in 3 of 3.
FANOUT_TEMPERATURES = [0.2, 0.4, 0.6, 0.8, 0.3]
TRIAGE_TEMPERATURES = [0.2, 0.8]

# Markers that make a sentence worth verifying even when two passes agree.
# These are the places where a wrong translation changes what happened, which
# is exactly what our bake-off saw go wrong ("they made me give them my money"
# became "they gave me money").
# NOTE: these are English only. For other languages the triage falls back to
# "do the two passes disagree", which is language-neutral. A child writing
# Arabic therefore gets verification driven by disagreement alone, which is
# weaker. Replacing this with a model-based risk check is tracked for Monday.
RISK_PATTERNS = [
    r"\b(not|никог|لا|değil|kein|nicht|never|nobody|no one|didn'?t|won'?t|can'?t)\b",  # negation
    r"\b(made|forced|threat|hurt|hit|kick|push|touch|afraid|scared|weapon|knife)\w*\b",  # force or threat
    # An unnamed actor was a marker here until it was measured: it fired on
    # 29 of 50 English sentences and was the only reason 19 of them
    # escalated. Almost every disclosure says "they" or "he", so it selected
    # for "a child is describing other children", which is the whole corpus
    # rather than a risk. Disagreement between the first two passes is the
    # better signal, and unlike these patterns it works in every language.
]
_RISK = [re.compile(pattern, re.IGNORECASE | re.UNICODE) for pattern in RISK_PATTERNS]


def _normalise(text: str) -> str:
    """Compare meaning-ish, not punctuation: lowercase, strip, collapse spaces."""
    return re.sub(r"[\s\W_]+", " ", text.lower()).strip()


def looks_risky(text: str) -> bool:
    """True when this sentence is the kind that loses meaning in translation."""
    return any(pattern.search(text) for pattern in _RISK)


# Scripts we can recognise, so an untranslated answer cannot pass as German.
_SCRIPTS = {
    "cyrillic": ("Ѐ", "ӿ"),
    "arabic": ("؀", "ۿ"),
    "devanagari": ("ऀ", "ॿ"),
}


def _script_share(text: str) -> dict[str, float]:
    letters = [ch for ch in text if ch.isalpha()]
    if not letters:
        return {}
    shares = {}
    for name, (low, high) in _SCRIPTS.items():
        count = sum(1 for ch in letters if low <= ch <= high)
        if count:
            shares[name] = count / len(letters)
    return shares


# Hindi written in Latin letters (Hinglish) is how children actually type, and
# it defeats a script check: "Pause me woh log mein tiffin wegnehmen" is half
# German and looks Latin throughout. These are common Hinglish function words
# that are not German words, so two or more of them means the model copied the
# input through instead of translating it.
_HINGLISH = {
    "woh", "hai", "hain", "mujhe", "mujhse", "mera", "meri", "mere", "nahi", "nahin",
    "kar", "karta", "karte", "karti", "kiya", "aur", "bhi", "tha", "thi", "the",
    "hoon", "hun", "kya", "usne", "unhone", "raha", "rahi", "liya", "diya", "gaya",
    "bola", "bolte", "lete", "dete", "koi", "sab", "roz", "phir", "jab", "kyuki",
    "me", "mein", "ko", "se", "pe", "par", "ki", "jo", "toh", "kuch", "log",
    "saath", "wala", "waale", "bade", "chhota", "apna", "apne", "isliye",
}
# "mein" and "par" are German words too, so they only count towards Hinglish
# when the target is German and other markers are already present.
_ALSO_GERMAN = {"mein", "par", "me"}


def _hinglish_words(text: str) -> int:
    words = re.findall(r"[a-z]+", text.lower())
    clear = sum(1 for word in words if word in _HINGLISH - _ALSO_GERMAN)
    ambiguous = sum(1 for word in words if word in _ALSO_GERMAN)
    # An ambiguous word only counts once something unambiguous is already there.
    return clear + (ambiguous if clear else 0)


def untranslated(source: str, output: str, target_lang: str) -> bool:
    """True when the model echoed the input instead of translating it.

    Seen on Lightning with reasoning off: a Ukrainian sentence came back
    unchanged, which would have put Cyrillic in front of a German teacher
    while the UI claimed it was a translation. Cheap to check, and the
    consequence of missing it is a child's report being unreadable.
    """
    if _normalise(source) == _normalise(output):
        return True
    if target_lang in ("de", "en"):  # Latin-script targets
        if any(share > 0.3 for share in _script_share(output).values()):
            return True
        # Caught in the Hindi benchmark: the model returned
        # "Pause me woh log mein tiffin wegnehmen und wegwerfen" and the script
        # check passed it, because Hinglish is Latin letters too.
        # Only for a German target: "me" and "to" are ordinary English words.
        return target_lang == "de" and _hinglish_words(output) >= 2
    return False


async def _one_pass(text, source_lang, target_lang, usage, temperature, decisions=None):
    system = TRANSLATE_SYSTEM.format(target_name=language_name(target_lang))
    if decisions:
        system += CLARIFIED_SUFFIX.format(decisions=decisions)
    german = await call(
        "fanout", system, text, usage, temperature=temperature, max_tokens=500, step="translate"
    )

    if untranslated(text, german, target_lang):
        # One firmer retry at a lower temperature before giving up on this
        # pass. The other passes carry on regardless.
        german = await call(
            "fanout",
            system + f"\n\nThe reply MUST be written in {language_name(target_lang)}. "
            f"Do not repeat the {language_name(source_lang)} text.",
            text,
            usage,
            temperature=0.0,
            max_tokens=500,
            step="translate_retry",
        )
        if untranslated(text, german, target_lang):
            raise EngineError(
                "upstream_unavailable",
                f"model returned untranslated text for {source_lang}->{target_lang}",
                True,
            )
    return german


async def _back(german, source_lang, target_lang, usage):
    system = BACK_TRANSLATE_SYSTEM.format(
        target_name=language_name(target_lang), source_name=language_name(source_lang)
    )
    return await call(
        "fanout", system, german, usage, temperature=0.2, max_tokens=500, step="back_translate"
    )


async def _repair(text, german, losses, source_lang, target_lang, usage):
    """Re-translate just the phrases whose meaning did not survive.

    Selecting a better candidate cannot help when every candidate made the
    same mistake, which is exactly when a reported harm quietly turns
    harmless. Here the judge tells the translator what was lost, and the
    translator puts it back.
    """
    detail = "\n".join(
        f'- "{loss["phrase"]}" means: {loss["intended"]}. '
        f'The translation turned it into: {loss["became"]}'
        for loss in losses
    )
    user = (
        f"The child wrote ({language_name(source_lang)}):\n{text}\n\n"
        f"Translation into {language_name(target_lang)}:\n{german}\n\n"
        f"Meaning that did not survive:\n{detail}"
    )
    return await call(
        "fanout",
        REPAIR_SYSTEM.format(target_name=language_name(target_lang)),
        user,
        usage,
        temperature=0.2,
        max_tokens=500,
        step="repair",
    )


@lru_cache(maxsize=1)
def _ambiguous_words() -> dict:
    path = REPO_ROOT / "content" / "ambiguous_words.json"
    return json.loads(path.read_text(encoding="utf-8"))["languages"]


def lexicon_ambiguities(text: str, source_lang: str) -> list[dict]:
    """Known two-meaning words, matched in code rather than asked of a model.

    The model knows these ambiguities when asked about them directly, but
    reports them inconsistently inside a judging task: in testing the same
    sentence sometimes produced a question and sometimes nothing. A knife
    threat losing its timing is not something to leave to that. The model
    check still runs alongside this and catches words the list does not have.
    """
    haystack = _normalise(text)
    found = []
    for entry in _ambiguous_words().get(source_lang, []):
        # Some words are only ambiguous without their context. Hindi "kal" is
        # both tomorrow and yesterday, but a future or past verb settles it,
        # and asking anyway spends a question the child does not owe us.
        skip = entry.get("skip_when", {}).get("patterns", [])
        if any(re.search(pattern, text, re.IGNORECASE | re.UNICODE) for pattern in skip):
            continue
        if any(_normalise(form) in haystack for form in entry["forms"]):
            found.append({
                "phrase": entry["word"],
                "readings": entry["readings"],
                "severity": "critical",
                "source": "lexicon",
            })
    return found


async def _find_ambiguity(text, source_lang, target_lang, usage):
    """Ask whether the child's own sentence has more than one honest reading.

    Deliberately given the original only. The judge, once it has candidates in
    front of it, reports where they differ and stops examining the source; an
    ambiguity every pass resolved the same way then goes unseen, which is the
    case that matters most ("he said he would get me after school").
    """
    raw = await call(
        "judge",
        AMBIGUITY_SYSTEM,
        f"Language: {language_name(source_lang)}\nSentence: {text}",
        usage,
        temperature=0.0,
        max_tokens=600,
        response_format=AMBIGUITY_SCHEMA,
        step="ambiguity",
    )
    try:
        found = json.loads(raw).get("ambiguous_phrases", [])
    except json.JSONDecodeError:
        return []

    # Only ask about words the child actually wrote. The model has offered
    # phrases that appear nowhere in the sentence, and asking a child what
    # they meant by words they never used is worse than asking nothing.
    haystack = _normalise(text)
    from_model = [
        item for item in found
        if item.get("phrase") and _normalise(item["phrase"]) in haystack
    ]

    # The list is a safety net for what the model misses, not a second voice.
    # Where both describe the same words - the list has "get me", the model
    # has "get me after school" - the model's version wins, because it quotes
    # what the child actually wrote and reads better back to them. Asking the
    # same question twice in different words is its own harm.
    from_model_norm = [(_normalise(item["phrase"]), item) for item in from_model]
    known = [
        item for item in lexicon_ambiguities(text, source_lang)
        if not any(
            _normalise(item["phrase"]) in model_phrase or model_phrase in _normalise(item["phrase"])
            for model_phrase, _ in from_model_norm
        )
    ]
    return [item for _, item in from_model_norm] + known


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
        "judge",
        system,
        user,
        usage,
        temperature=0.0,
        max_tokens=900,
        response_format=JUDGE_SCHEMA,
        step="judge",
    )
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        # Schema-constrained output has not failed in testing, but a malformed
        # verdict must not take the whole request down: fall back to "no
        # disagreement found" rather than inventing one.
        return {"best_index": 0, "agreement": 0.5, "meaning_lost": [], "disputes": []}


async def _actor_and_threat_kept(text, german, back, source_lang, target_lang, usage):
    """Last line of defence on the chosen translation.

    Choosing between candidates can make things worse, not only better: the
    benchmark caught the judge turning "he said you'll see" into "I'll show
    him", which kept the threat but pointed it at the wrong person. A single
    focused question is far more reliable here than another clause in the
    judge's prompt, which already has three jobs.
    """
    user = (
        f"The child wrote ({language_name(source_lang)}):\n{text}\n\n"
        f"{language_name(target_lang)} translation:\n{german}\n\n"
        f"That translated back into {language_name(source_lang)}:\n{back}"
    )
    raw = await call(
        "judge",
        ACTOR_THREAT_SYSTEM.format(
            target_name=language_name(target_lang), source_name=language_name(source_lang)
        ),
        user,
        usage,
        temperature=0.0,
        max_tokens=300,
        response_format=ACTOR_THREAT_SCHEMA,
    )
    try:
        verdict = json.loads(raw)
    except json.JSONDecodeError:
        return True, ""
    ok = verdict.get("direction_kept", True) and verdict.get("threat_kept", True)
    return ok, verdict.get("what_changed", "")


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
        step="question",
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


async def _verify(text, candidates, source_lang, target_lang, usage, source_ambiguities=None):
    """Back-translate, judge, repair what was lost, and ask the child what only they know."""
    backs = await asyncio.gather(*[_back(c, source_lang, target_lang, usage) for c in candidates])
    verdict = await _judge(text, candidates, backs, source_lang, target_lang, usage)

    best_index = verdict.get("best_index", 0)
    if not 0 <= best_index < len(candidates):
        best_index = 0

    disputes = [d for d in verdict.get("disputes", []) if len(d.get("readings", [])) >= 2]

    # Two very different things look identical in the raw verdict, and only one
    # of them is the child's business:
    #
    #   translation_error - the child was clear and a pass got it wrong. The
    #     judge has already discarded it by choosing a better candidate. Asking
    #     the child to adjudicate our own mistake would be confusing, and would
    #     imply they wrote something unclear when they did not.
    #   source_ambiguous  - the child's own words carry two honest readings.
    #     Only the child knows which. This is the one worth asking about.
    #
    # We still count the errors: they are the clearest evidence of what the
    # verification is for, and the benchmark reports them.
    errors_caught = sum(1 for d in disputes if d.get("kind") == "translation_error")

    # Meaning the back-translation shows was lost by every candidate. No
    # amount of choosing between candidates fixes this, so repair it.
    losses = [
        loss for loss in verdict.get("meaning_lost", [])
        if loss.get("severity") == "critical"
    ]
    best = candidates[best_index]
    repaired = False
    if losses:
        best = await _repair(text, best, losses, source_lang, target_lang, usage)
        repaired = True

    # Choosing between candidates can make a translation worse, not only
    # better: the Hindi benchmark caught the judge turning "he said you'll
    # see" into "I'll show him", pointing the threat at the wrong person.
    # Nothing above would notice, because every candidate kept a threat; only
    # its direction moved. So the chosen text gets one focused check, and if
    # it fails, the same repair path that fixes lost meaning fixes this.
    chosen_back = await _back(best, source_lang, target_lang, usage) if repaired else backs[best_index]
    direction_ok, moved = await _actor_and_threat_kept(
        text, best, chosen_back, source_lang, target_lang, usage
    )
    if not direction_ok:
        best = await _repair(
            text,
            best,
            [{
                "phrase": text,
                "intended": "who did what to whom, and any threat, exactly as the child wrote it",
                "became": moved or "the direction of the action or the threat changed",
            }],
            source_lang,
            target_lang,
            usage,
        )
        repaired = True
    # Questions for the child come from the dedicated check on the original
    # sentence, plus any genuine ambiguity the judge noticed while comparing.
    ask_about = list(source_ambiguities or [])
    seen = {a["phrase"].lower() for a in ask_about}
    for dispute in disputes:
        if dispute.get("kind") == "source_ambiguous" and dispute["phrase"].lower() not in seen:
            ask_about.append(dispute)
            seen.add(dispute["phrase"].lower())
    ask_about = ask_about[:2]  # never interrupt a child with more than two questions

    questions = await asyncio.gather(
        *[_question(d["phrase"], d["readings"], source_lang, usage) for d in ask_about]
    )
    # Agreement between passes is worthless as a confidence signal when the
    # passes agreed on something wrong, so cap it when meaning had to be
    # repaired. Confidence must never overstate what we actually know.
    agreement = float(verdict.get("agreement", 0.5))
    return {
        "translation": best,
        "confidence": min(agreement, 0.6) if repaired else agreement,
        "ambiguities": [q for q in questions if q],
        "errors_caught": errors_caught + len(losses),
        "meaning_repaired": len(losses),
    }


def _finish(result: dict, usage: Usage, strategy: str) -> TranslationResult:
    """Attach the accounting every return path owes the caller.

    `step_summary` and `budget_breaches` are for the log and are built from
    step names and milliseconds, so neither can carry the child's words. They
    are not part of the HTTP contract; main.py logs them and drops them.
    """
    return {
        "errors_caught": 0,
        "meaning_repaired": 0,
        **result,
        "calls_made": usage.calls_made,
        "usage": usage.as_dict(),
        "strategy_used": strategy,
        "step_summary": usage.step_summary(),
        "budget_breaches": over_budget(usage),
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
        return _finish(
            {"translation": german, "confidence": 1.0, "ambiguities": []}, usage, strategy
        )

    if strategy == BASELINE:
        german = await _one_pass(text, source_lang, target_lang, usage, 0.2)
        return _finish(
            {"translation": german, "confidence": 0.0, "ambiguities": []}, usage, BASELINE
        )

    if strategy == MULTI_PASS:
        candidates, ambiguous = await asyncio.gather(
            asyncio.gather(
                *[_one_pass(text, source_lang, target_lang, usage, t) for t in FANOUT_TEMPERATURES]
            ),
            _find_ambiguity(text, source_lang, target_lang, usage),
        )
        result = await _verify(text, list(candidates), source_lang, target_lang, usage, ambiguous)
        return _finish(result, usage, MULTI_PASS)

    # Adaptive: two passes first, then decide whether this sentence needs more.
    first = await asyncio.gather(
        *[_one_pass(text, source_lang, target_lang, usage, t) for t in TRIAGE_TEMPERATURES]
    )
    # A word from the reviewed list always earns the full check, because the
    # two passes agreeing proves nothing here: they can agree on one reading
    # of a word that has two. Costs nothing to test, and it is what keeps
    # "he said he would get me after school" asking the child rather than
    # quietly choosing the lift home.
    passes_agree = _normalise(first[0]) == _normalise(first[1])
    known_ambiguous = bool(lexicon_ambiguities(text, source_lang))
    if passes_agree and not known_ambiguous and not looks_risky(text):
        return _finish(
            {"translation": first[0], "confidence": 1.0, "ambiguities": []}, usage, ADAPTIVE
        )

    extra, ambiguous = await asyncio.gather(
        asyncio.gather(
            *[_one_pass(text, source_lang, target_lang, usage, t) for t in FANOUT_TEMPERATURES[2:]]
        ),
        _find_ambiguity(text, source_lang, target_lang, usage),
    )
    result = await _verify(text, [*first, *extra], source_lang, target_lang, usage, ambiguous)
    return _finish(result, usage, ADAPTIVE)

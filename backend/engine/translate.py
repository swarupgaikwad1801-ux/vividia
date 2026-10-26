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
import inspect
import json
import re
from functools import lru_cache

from engine.budget import over_budget
from engine.clarify_text import is_other, other_option
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
    CLARIFIED_REPAIR,
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


# A word edge for matching another language's list: not a letter, digit or
# underscore, and not Devanagari, whose vowel signs are not \w in Python's re.
_WORD_EDGE = r"[\wऀ-ॿ]"


def _whole_word(form: str, text: str) -> bool:
    """True when `form` appears in `text` as whole words, case-insensitively.

    Matched on the raw text rather than `_normalise`d, because `_normalise`
    drops Devanagari vowel signs: कला (art) becomes कल, and "kal" would
    match inside "nikal" or "kaleidoscope" as a substring.
    """
    flat = re.sub(r"\s+", " ", text.casefold())
    pattern = rf"(?<!{_WORD_EDGE}){re.escape(form.casefold())}(?!{_WORD_EDGE})"
    return re.search(pattern, flat) is not None


_DEVANAGARI_RANGE = re.compile(r"[ऀ-ॿ]")


def _said_by_the_child(phrase: str, text: str) -> bool:
    """Did the child actually write this phrase?

    Everything we quote back to a child has to pass through here. A model can
    return a phrase that appears nowhere in the sentence - it has done, which
    is why `_find_ambiguity` has filtered its own output since it was written
    - and a quoted phrase the child never used is the single most alarming
    thing this app can put on screen. They wrote one sentence about their own
    life and the app answers with somebody else's words in quotation marks.

    Devanagari is matched as whole words on the raw text, because `_normalise`
    strips vowel signs and leaves bare consonants that match almost anything;
    a two-consonant needle would wave through exactly the invented phrase this
    is here to catch. Everything else keeps the `_normalise` substring rule
    the ambiguity filter already used, so a phrase still matches across
    punctuation and spacing.
    """
    if not phrase:
        return False
    if _DEVANAGARI_RANGE.search(phrase):
        return _whole_word(phrase, text)
    return _normalise(phrase) in _normalise(text)


def _lexicon_item(entry: dict) -> dict:
    return {
        "phrase": entry["word"],
        "readings": entry["readings"],
        "severity": "critical",
        "source": "lexicon",
    }


def lexicon_ambiguities(text: str, source_lang: str) -> list[dict]:
    """Known two-meaning words, matched in code rather than asked of a model.

    The model knows these ambiguities when asked about them directly, but
    reports them inconsistently inside a judging task: in testing the same
    sentence sometimes produced a question and sometimes nothing. A knife
    threat losing its timing is not something to leave to that. The model
    check still runs alongside this and catches words the list does not have.

    Every language's list is read, not only `source_lang`'s. `source_lang` is
    the language of the child's screens, and a child who reads English best
    may still write Hindi, usually in Latin letters: "kal chhutti ke baad".
    Reading only the English list, that sentence never asked about kal or
    chhutti, the knife-threat case this list exists for.
    """
    haystack = _normalise(text)
    words = _ambiguous_words()
    found = []
    for entry in words.get(source_lang, []):
        # Some words are only ambiguous without their context. Hindi "kal" is
        # both tomorrow and yesterday, but a future or past verb settles it,
        # and asking anyway spends a question the child does not owe us.
        skip = entry.get("skip_when", {}).get("patterns", [])
        if any(re.search(pattern, text, re.IGNORECASE | re.UNICODE) for pattern in skip):
            continue
        if any(_normalise(form) in haystack for form in entry["forms"]):
            found.append(_lexicon_item(entry))

    for lang, entries in words.items():
        if lang == source_lang or lang.startswith("_"):
            continue
        for entry in entries:
            # Whole words only: a word from another language inside a word of
            # this one ("kal" in "kale") is not that word.
            #
            # And no skip_when. Those patterns read the list language's own
            # grammar, and in mixed text they collide with the screen
            # language: Hindi past-tense "the" (थे) is English "the", so "kal"
            # in "kal the teacher hit me" would be skipped, and the app would
            # silently choose between yesterday and tomorrow. Asking once too
            # often costs a tap; choosing wrongly loses a threat's timing.
            if any(_whole_word(form, text) for form in entry["forms"]):
                found.append(_lexicon_item(entry))
    return found


async def _find_ambiguity(text, source_lang, target_lang, usage):
    """The ambiguity check, wrapped so its failure cannot lose the translation.

    It used to be gathered with the fan-out, which meant a failed check took
    the whole request down with it. It is one of three defences: losing it
    costs the child a question they might have been asked, while raising costs
    them the translation entirely.

    The reviewed word list needs no model at all, so a model outage still
    asks about a word known to carry two readings. That is the half of this
    check that matters most for a threat, and there is no reason to lose it
    because a call failed.
    """
    try:
        return await _find_ambiguity_inner(text, source_lang, target_lang, usage)
    except EngineError:
        return lexicon_ambiguities(text, source_lang)


async def _find_ambiguity_inner(text, source_lang, target_lang, usage):
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
    from_model = [item for item in found if _said_by_the_child(item.get("phrase", ""), text)]

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
        step="actor_threat",
    )
    try:
        verdict = json.loads(raw)
    except json.JSONDecodeError:
        return True, ""
    ok = verdict.get("direction_kept", True) and verdict.get("threat_kept", True)
    return ok, verdict.get("what_changed", "")


async def _question(phrase, readings, source_lang, usage) -> Ambiguity | None:
    """Turn one disputed phrase into a question a child can actually answer.

    The answer always ends with the fixed "something else" option, so a child
    whose meaning is neither of the readings is never cornered into picking one.

    The readings are capped at two because the frozen contract allows at most
    three options (`schemas.Ambiguity.options`, max_length=3) and the escape
    option now takes the third slot. Without the cap, a three-reading ambiguity
    would build four options and the response would fail validation on its way
    out, which the child would see as a 500 rather than a question.
    """
    readings = readings[:2]
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
        # The model returned a question with too few options. The schema now
        # demands two, which fixed it in testing, but dropping the question
        # silently is the worst possible failure here: the app would pick a
        # reading of the child's words without telling them, which is the one
        # thing it exists not to do. Fall back to the readings themselves.
        labels = [reading["meaning"] for reading in readings]
    if len(labels) < 2 or not parsed.get("question", "").strip():
        return None
    return {
        "phrase": phrase,
        "question": parsed["question"],
        "options": [
            *(
                {"id": f"opt{i}", "label": label, "meaning_de": readings[i]["target_phrasing"]}
                for i, label in enumerate(labels)
            ),
            # Fixed text, never model-generated: this is the one option that
            # has to read identically every time, because it is the way out.
            other_option(source_lang),
        ],
        "severity": "critical",
    }


def _decided_pairs(ambiguities, choices) -> list[tuple[str, str]]:
    """(phrase, the German the child chose for it) for every answered phrase.

    The one place that decides what the child picked. Both the prompt and the
    check that the prompt was obeyed read it, because a check with its own
    second copy of this rule would eventually disagree with the instruction it
    is checking - and would then pass the exact output it exists to catch.

    The "something else" option is skipped. Picking it says neither reading was
    right, so there is no decision to render and nothing to tell the
    translator; the child is asked to write the sentence again instead. Passing
    it through would put an empty meaning in the prompt, which reads to the
    model as an instruction to render nothing.
    """
    pairs = []
    for ambiguity in ambiguities:
        chosen = choices.get(ambiguity["phrase"])
        for option in ambiguity["options"]:
            if is_other(option["id"]):
                continue
            if option["id"] == chosen or option["label"] == chosen:
                pairs.append((ambiguity["phrase"], option["meaning_de"]))
    return pairs


def _decisions_text(ambiguities, choices) -> str:
    """Render the child's answers as instructions for the final pass.

    Worded as an instruction about the OUTPUT, not as a gloss of the Hindi.
    "means:" invited a paraphrase, and the model took the invitation: told
    `"dekh lena" means: du wirst schon sehen`, it wrote "wird er es schon
    richten" - "he'll sort it out" - which is not a threat at all. The child
    had already said which reading was theirs, and the one thing this step
    must not do is lose it.
    """
    pairs = _decided_pairs(ambiguities, choices)
    return "\n".join(
        f'- Where the child wrote "{phrase}", the German must say exactly: {meaning}'
        for phrase, meaning in pairs
    )


def _decisions_kept(german: str, pairs: list[tuple[str, str]]) -> list[str]:
    """Which of the child's chosen phrasings are missing from the output.

    The decision reaches the prompt correctly - verified - and the model still
    drops it, so being told is not the same as being obeyed. This is the same
    stance the engine already takes with `untranslated()`: check the output
    rather than trust the instruction.
    """
    haystack = _normalise(german)
    return [meaning for _, meaning in pairs if _normalise(meaning) not in haystack]


async def _ask_the_child(text, disputes, source_ambiguities, source_lang, usage):
    """Turn what only the child can settle into at most two questions.

    Split out of _verify so it can run alongside the actor/threat check and
    any repair that follows: the questions are about the child's own sentence
    and the judge's disputes, so they depend on nothing that chain produces.
    """
    # source_ambiguities arrives as the task started before the judge; await
    # it only here, where its result is finally needed.
    found = source_ambiguities
    if inspect.isawaitable(found):
        found = await found

    ask_about = list(found or [])
    seen = {a["phrase"].lower() for a in ask_about}
    for dispute in disputes:
        if dispute.get("kind") != "source_ambiguous":
            continue
        # The same rule the ambiguity finder has always applied, which this
        # path never did. Questions reach the child from two places and only
        # one of them checked that the phrase was the child's. A judge that
        # quotes a phrase from nowhere produced the screen this fix is named
        # after: a child writes "I dont feel good" and the app asks what they
        # meant by "laughed at me".
        if not _said_by_the_child(dispute.get("phrase", ""), text):
            continue
        if dispute["phrase"].lower() not in seen:
            ask_about.append(dispute)
            seen.add(dispute["phrase"].lower())
    ask_about = ask_about[:2]  # never interrupt a child with more than two questions

    questions = await asyncio.gather(
        *[_question(d["phrase"], d["readings"], source_lang, usage) for d in ask_about]
    )
    return [q for q in questions if q]


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
        # Same rule as the questions. These phrases are not shown to the
        # child, but they are quoted into the repair prompt as 'where the
        # child wrote "X"' - so an invented phrase becomes an instruction to
        # put words into the German that the child never said. That is the
        # one thing this module exists to prevent.
        if loss.get("severity") == "critical"
        and _said_by_the_child(loss.get("phrase", ""), text)
    ]
    # Everything the questions need is known now: the child's own sentence and
    # the judge's disputes. Start them here so they overlap the repair, the
    # back-translation of the chosen text and the actor/threat check, none of
    # which they depend on.
    questions_running = asyncio.ensure_future(
        _ask_the_child(text, disputes, source_ambiguities, source_lang, usage)
    )

    try:
        return await _finish_verify(
            text, candidates, backs, verdict, best_index, disputes, losses,
            errors_caught, questions_running, source_lang, target_lang, usage,
        )
    finally:
        if not questions_running.done():
            questions_running.cancel()


async def _finish_verify(
    text, candidates, backs, verdict, best_index, disputes, losses,
    errors_caught, questions_running, source_lang, target_lang, usage,
):
    """The chosen-text chain: repair, check the direction, repair again."""
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

    questions = await questions_running
    # Agreement between passes is worthless as a confidence signal when the
    # passes agreed on something wrong, so cap it when meaning had to be
    # repaired. Confidence must never overstate what we actually know.
    agreement = float(verdict.get("agreement", 0.5))
    return {
        "translation": best,
        "confidence": min(agreement, 0.6) if repaired else agreement,
        "ambiguities": questions,
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


async def _same_language(text, source_lang, usage, clarifications, strategy):
    """The child already writes the language the adult reads.

    A German-speaking child is the majority of bullied children in Germany,
    and until 25 Oct this function did not exist, so their path through the
    app was broken in the worst way available:

    `untranslated()` treats output identical to the input as a failed pass,
    which is right for Hindi->German and exactly wrong for German->German,
    where the correct answer IS the input. So the first pass "failed", the
    retry told the model "Do not repeat the German text", and the child got
    either an `upstream_unavailable` error or **their own words paraphrased
    by a model**. A paraphrase is the one thing this app must never put in
    front of a teacher: report.py exists to stop precisely that, and it was
    being handed one from upstream.

    So nothing is translated here. The text the adult reads is the text the
    child wrote, character for character, and no model is asked to improve it.

    What still runs is the part that was never about translation: the check
    for a phrase that can honestly be read two ways, and the question to the
    child about it. "Er hat mich angemacht" is two different events to the
    adult who acts on it, and only the child knows which. That check reads
    the child's own sentence and never needed a translation to work.

    Cost: one call instead of about ten.

    `strategy_used` still reports the strategy the caller asked for. A
    `same_language` member would describe this path honestly, but Strategy is
    in the frozen HTTP contract that all three of us have to agree on, so it
    is proposed in the PR rather than taken here.
    """
    if clarifications:
        # The child has answered. Their answer does not change their own
        # words - there is nothing to re-render - so it belongs in the report
        # as a note beside the entry, which is a contract change and Vernika's
        # call. Until then the answer is recorded by the caller and the text
        # stays exactly as the child wrote it.
        return _finish({"translation": text, "confidence": 1.0, "ambiguities": []}, usage, strategy)

    if strategy == BASELINE:
        # The honest comparison point: a single pass has nothing to do here
        # either, so neither path spends a call and the benchmark stays fair.
        return _finish({"translation": text, "confidence": 1.0, "ambiguities": []}, usage, BASELINE)

    ambiguous = await _find_ambiguity(text, source_lang, source_lang, usage)
    questions = await asyncio.gather(
        *[_question(item["phrase"], item["readings"], source_lang, usage) for item in ambiguous[:2]]
    )
    return _finish(
        {
            "translation": text,
            # Nothing was translated, so no meaning can have been lost in
            # translation. This is not a claim that the app understood the
            # child - that is what the question is for.
            "confidence": 1.0,
            "ambiguities": [q for q in questions if q],
        },
        usage,
        strategy,
    )


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

    if source_lang == target_lang:
        # Not a translation problem. See _same_language: translating German
        # into German made the app paraphrase the child or fail outright.
        return await _same_language(text, source_lang, usage, clarifications, strategy)

    if clarifications:
        pairs = _decided_pairs(_ambiguities or [], clarifications)
        decisions = _decisions_text(_ambiguities or [], clarifications)
        german = await _one_pass(text, source_lang, target_lang, usage, 0.2, decisions)

        # Being told is not being obeyed. On "dekh lena" the model was handed
        # the child's chosen wording and answered "wird er es schon richten" -
        # "he'll sort it out" - turning a threat into reassurance. The child
        # had already said which reading was theirs, so a pass that loses it
        # is worse than one that never asked. One repair, naming the phrase.
        missing = _decisions_kept(german, pairs)
        repaired_count = 0
        if missing:
            candidate = await _one_pass(
                text, source_lang, target_lang, usage, 0.0,
                decisions + "\n\n" + CLARIFIED_REPAIR.format(
                    phrases="\n".join(f"- {phrase}" for phrase in missing)
                ),
            )
            # Keep the repair only if it actually kept what was missing.
            # Otherwise the first answer stands: a second guess that also lost
            # the child's wording is not an improvement on the first.
            if not _decisions_kept(candidate, pairs):
                german = candidate
                repaired_count = len(missing)
        return _finish(
            {
                "translation": german,
                # Capped, not 1.0, when the child's own wording had to be put
                # back: the pass did not do what it was told the first time,
                # and confidence must never overstate what we know.
                "confidence": 0.6 if repaired_count else 1.0,
                "ambiguities": [],
                "meaning_repaired": repaired_count,
            },
            usage,
            strategy,
        )

    if strategy == BASELINE:
        german = await _one_pass(text, source_lang, target_lang, usage, 0.2)
        return _finish(
            {"translation": german, "confidence": 0.0, "ambiguities": []}, usage, BASELINE
        )

    if strategy == MULTI_PASS:
        ambiguity = asyncio.ensure_future(
            _find_ambiguity(text, source_lang, target_lang, usage)
        )
        try:
            candidates = await asyncio.gather(
                *[_one_pass(text, source_lang, target_lang, usage, t) for t in FANOUT_TEMPERATURES]
            )
            result = await _verify(
                text, list(candidates), source_lang, target_lang, usage, ambiguity
            )
        finally:
            if not ambiguity.done():
                ambiguity.cancel()
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

    # The ambiguity check reads the child's sentence alone: it needs nothing
    # from the fan-out and nothing from the judge. Gathered with the extra
    # passes, it made _verify wait for the slower of the two, so the judge
    # queued behind a check it does not depend on. As a task it overlaps the
    # back-translations and the judge instead, and is awaited only where its
    # result is used - building the questions.
    ambiguity = asyncio.ensure_future(_find_ambiguity(text, source_lang, target_lang, usage))
    try:
        extra = await asyncio.gather(
            *[_one_pass(text, source_lang, target_lang, usage, t) for t in FANOUT_TEMPERATURES[2:]]
        )
        result = await _verify(text, [*first, *extra], source_lang, target_lang, usage, ambiguity)
    finally:
        # A failed fan-out pass means we never reach the await, and a task
        # nobody awaits logs a warning at interpreter exit.
        if not ambiguity.done():
            ambiguity.cancel()
    return _finish(result, usage, ADAPTIVE)

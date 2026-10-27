"""What did the child just tell us? One word, so the app can answer kindly.

The listening screen answers every message the child sends before it ever
offers a card (Swarup, 27 Oct: "listen to it first and talk to the child").
This file decides which KIND of thing the child said. It never decides what
the child is shown.

The same rule as safety.py, for the same reason:

**The model only classifies. The words are fixed.** Every sentence a child
reads in reply comes from `frontend/src/lib/strings.ts` (`heard.*`), written
by us and reviewed by Neel, picked by the kind returned here. A model writing
free text to a frightened child can promise what nobody will do ("this will
stop"), give advice, or say something that hurts, and CLAUDE.md is explicit
that vividia is not an AI friend: we are the bridge to people who can be.

A wrong kind costs one slightly-off sentence of sympathy, and "other" is
always a safe answer, so failure falls back to it rather than raising.
Nothing here contacts anyone or stores anything.
"""

import json
import re

from engine.client import Usage, call
from engine.prompts import language_name

# Mirrored in app/schemas.py (ListenKind) and frontend/src/types/api.ts.
KINDS = (
    "hurt", "names", "left_out", "taken", "online", "threat", "feeling", "good", "asking", "talk", "other",
)

# Which details the message already gives (Neel, 27 Oct: the questions must
# follow what the child wrote, not a fixed order). The screen asks only for
# what is still missing. Mirrored in app/schemas.py (ListenDetail).
DETAILS = ("where", "when", "who", "feeling")

LISTEN_SYSTEM = """You read one message a child wrote about their day, often
about being bullied, and say which kind of thing they told us. You do not
reply to the child. Your answer only chooses which sentence, written by a
person, the child is shown next, and which question comes after it.

Kinds:
"hurt" - someone hit, pushed, kicked, spat on or physically hurt them.
"names" - someone called them names, mocked them, laughed at them, copied
  their accent, or said something mean about them, their family or where
  they come from.
"left_out" - they were excluded, ignored, left alone, not picked, removed
  from a group or a game.
"taken" - someone took, broke, hid or ruined their things or money.
"online" - it happened on a phone or online: chats, groups, photos, posts,
  messages.
"threat" - someone threatened to do something to them, or told them not to
  tell anyone "or else".
"feeling" - they only said how they feel (sad, scared, tired, alone), with
  nothing about what happened.
"good" - something went well: a good day, nobody bothered them, it stopped.
"asking" - they ask what to do, or ask us a question ("what should I do?",
  "is this normal?", "will it stop?").
"talk" - they want someone to talk to or to listen, or check whether anyone
  is there ("talk to me please", "baat karo", "is anyone there?", "hello"),
  with nothing about what happened.
"other" - anything else, or you are not sure.

Pick the kind that matters most for this child's safety: a threat is
"threat" even if it was sent online. Read what the child means, not the
words: children exaggerate, mix languages and misspell. If unsure, "other".

Then list which of these details the message already gives, so the app does
not ask for them again. Only what the child actually wrote; never guess:
"where" - a place (school, bus, toilets, home, a game, a group chat).
"when" - a time (today, yesterday, tomorrow, after school, every day).
"who" - who did it (a name, "my friend", "a teacher", "three boys").
"feeling" - how they feel (sad, scared, angry, alone).
An empty list is a fine answer."""

LISTEN_SCHEMA = {
    "type": "json_schema",
    "json_schema": {
        "name": "listen",
        "strict": True,
        "schema": {
            "type": "object",
            "additionalProperties": False,
            "properties": {
                "kind": {"type": "string", "enum": list(KINDS)},
                "told": {"type": "array", "items": {"type": "string", "enum": list(DETAILS)}},
            },
            "required": ["kind", "told"],
        },
    },
}


async def listen(text: str, lang: str) -> dict:
    """{"kind": one of KINDS, "told": [DETAILS...], "calls_made": int, "usage": {...}}.

    Never raises. A failure gives "other" and nothing told, so the screen
    falls back to its general line and asks for every detail.
    """
    usage = Usage()
    told: list[str] = []
    try:
        raw = await call(
            "fanout",
            LISTEN_SYSTEM,
            f"Language: {language_name(lang)}\nMessage: {text}",
            usage,
            temperature=0.0,
            max_tokens=60,
            response_format=LISTEN_SCHEMA,
            step="listen",
        )
        answer = json.loads(raw)
        kind = answer.get("kind", "other")
        told = _details(answer.get("told"))
    except Exception:  # noqa: BLE001 - a kind sentence must not depend on the model
        kind = "other"
    if kind not in KINDS:
        kind = "other"
    return {"kind": kind, "told": told, "calls_made": usage.calls_made, "usage": usage.as_dict()}


def _details(value) -> list[str]:
    """The closed list only, each once, in DETAILS order. Anything else is dropped."""
    if not isinstance(value, list):
        return []
    return [detail for detail in DETAILS if detail in value]


# --- A written reply, for the message no kind fits ---------------------------
#
# Swarup, 27 Oct: a child whose message fits none of the kinds should still
# hear something that answers THEM, not only "it takes courage to write this".
# So for kind "other", and only when the safety check found nothing, the model
# may write one short reply. It reaches the child only through two gates:
#
# 1. `reply_problems()`: rules in code that a model cannot talk its way past -
#    length, no question, no "I", no promise, no advice, no numbers or links,
#    the right alphabet.
# 2. A second call, on the judge model, that reads the reply against the same
#    rules and answers yes or no.
#
# Anything that fails either gate, and any error, gives None, and the child
# sees the reviewed sentence instead. Nothing is stored: not the message, not
# the reply. A flagged message never gets here (main.py), because a child in
# crisis is shown fixed, sourced words and nothing else (safety.py, rule 1).

MAX_REPLY_CHARS = 200

REPLY_SYSTEM = """A child aged 10 to 16 wrote the message below in an app for
children who are being bullied and find it hard to tell an adult. Write a
short answer that shows we read it and understood it.

The app is not a person and not a friend. Its job is to help the child get to
a real adult who can help, not to replace one.

Rules, all of them:
- One or two short sentences, at most 25 words.
- Speak as "we". Never "I", "me" or "my".
- Say back, in simple words, what the child seems to feel or what happened to
  them, so they know they were heard.
- No advice and no instructions. Never "you should" or "you must".
- No promises. Never say it will stop, get better or be okay.
- No questions.
- Do not repeat names, places, numbers or other details from the message.
- Do not judge or blame anyone in the message, and never the child.
- Write in {language}. {script_rule}

Return only the answer."""

_SCRIPT_RULE = {
    "hi": (
        'Write Hinglish in Latin letters, the way a child texts, using "tum". '
        "Never Devanagari. No verb that shows whether the child is a boy or a "
        'girl: no "karte/karti", "gaya/gayi", "sakte/sakti" about the child.'
    ),
    "de": 'Use "du".',
}

REPLY_SCHEMA = {
    "type": "json_schema",
    "json_schema": {
        "name": "reply",
        "strict": True,
        "schema": {
            "type": "object",
            "additionalProperties": False,
            "properties": {"reply": {"type": "string"}},
            "required": ["reply"],
        },
    },
}

CHECK_SYSTEM = """You check one short answer that an app wants to show a
child aged 10 to 16 who is being bullied, right after the child's message.

Answer "ok": true only if ALL of these hold:
- It is kind, and it fits what the child wrote.
- It speaks as "we", never as "I", "me" or "my".
- It gives no advice and no instructions.
- It makes no promise that things will stop, improve or be okay.
- It asks no question.
- It repeats no names, places, numbers or other details from the message.
- It blames or judges nobody, and never the child.
- Nothing in it could frighten, shame or hurt a child.
- It is written in {language}.

If you are unsure about any of them, answer "ok": false."""

CHECK_SCHEMA = {
    "type": "json_schema",
    "json_schema": {
        "name": "check",
        "strict": True,
        "schema": {
            "type": "object",
            "additionalProperties": False,
            "properties": {"ok": {"type": "boolean"}},
            "required": ["ok"],
        },
    },
}

# Words a reply may not contain, per language. The model was told the rules;
# this is what holds when it does not follow them.
_BANNED = {
    "en": [
        r"\bI\b", r"\bI'm\b", r"\bI've\b", r"\bme\b", r"\bmy\b", r"\bpromise",
        r"\bwill (stop|get better|be (okay|ok|fine|alright))\b", r"\bshould\b", r"\bmust\b",
        r"\bdon'?t worry\b", r"\bfriend", r"\bdeserved?\b",
    ],
    "de": [
        r"\bich\b", r"\bmich\b", r"\bmir\b", r"\bmein\w*\b", r"\bversprech\w*",
        r"\bwird (aufhören|besser|gut)\b", r"\bsolltest\b", r"\bmusst\b", r"\bkeine sorge\b",
        r"\bfreund\w*",
    ],
    "hi": [
        r"\bmain\b", r"\bmujhe\b", r"\bmera\b", r"\bmeri\b", r"\bmere\b", r"\bpromise\b",
        r"\bwada\b", r"\bchinta mat\b", r"\bchahiye\b", r"\bdost\b",
        r"\b(karte|karti|gaya|gayi|sakte|sakti) ho\b",
    ],
}
_DEVANAGARI = re.compile(r"[ऀ-ॿ]")


def reply_problems(reply: str, lang: str) -> list[str]:
    """Why this reply may not be shown, or [] if the code rules all hold."""
    problems = []
    text = reply.strip()
    if not text:
        return ["empty"]
    if len(text) > MAX_REPLY_CHARS:
        problems.append("too long")
    if len(re.findall(r"[.!]+(?:\s|$)", text)) > 2:
        problems.append("more than two sentences")
    if "?" in text:
        problems.append("asks a question")
    if re.search(r"\d", text):
        problems.append("contains a number")
    if re.search(r"https?://|www\.|@", text):
        problems.append("contains a link or address")
    if _DEVANAGARI.search(text):
        problems.append("Devanagari, the screens are Latin letters")
    for pattern in _BANNED.get(lang, _BANNED["en"]):
        if re.search(pattern, text, re.IGNORECASE | re.UNICODE):
            problems.append(f"banned: {pattern}")
    return problems


async def reply(text: str, lang: str) -> dict:
    """{"reply": str | None, "usage": {...}}. None means: use the fixed sentence.

    Never raises. Two calls when the first gate passes, one when it does not.
    """
    usage = Usage()
    language = language_name(lang)
    try:
        raw = await call(
            "fanout",
            REPLY_SYSTEM.format(language=language, script_rule=_SCRIPT_RULE.get(lang, "")),
            f"Message: {text}",
            usage,
            temperature=0.4,
            max_tokens=120,
            response_format=REPLY_SCHEMA,
            step="reply",
        )
        written = json.loads(raw).get("reply", "").strip()
        if reply_problems(written, lang):
            return {"reply": None, "usage": usage.as_dict()}
        verdict = await call(
            "judge",
            CHECK_SYSTEM.format(language=language),
            f"Child's message: {text}\nAnswer: {written}",
            usage,
            temperature=0.0,
            max_tokens=20,
            response_format=CHECK_SCHEMA,
            step="reply_check",
        )
        if json.loads(verdict).get("ok") is not True:
            return {"reply": None, "usage": usage.as_dict()}
        return {"reply": written, "usage": usage.as_dict()}
    except Exception:  # noqa: BLE001 - the fixed sentence is always there
        return {"reply": None, "usage": usage.as_dict()}

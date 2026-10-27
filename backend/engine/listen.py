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

from engine.client import Usage, call
from engine.prompts import language_name

# Mirrored in app/schemas.py (ListenKind) and frontend/src/types/api.ts.
KINDS = ("hurt", "names", "left_out", "taken", "online", "threat", "feeling", "good", "asking", "other")

LISTEN_SYSTEM = """You read one message a child wrote about their day, often
about being bullied, and say which kind of thing they told us. You do not
reply to the child. Your one word only chooses which kind sentence, written
by a person, the child is shown next.

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
"other" - anything else, or you are not sure.

Pick the kind that matters most for this child's safety: a threat is
"threat" even if it was sent online. Read what the child means, not the
words: children exaggerate, mix languages and misspell. If unsure, "other"."""

LISTEN_SCHEMA = {
    "type": "json_schema",
    "json_schema": {
        "name": "listen",
        "strict": True,
        "schema": {
            "type": "object",
            "additionalProperties": False,
            "properties": {"kind": {"type": "string", "enum": list(KINDS)}},
            "required": ["kind"],
        },
    },
}


async def listen(text: str, lang: str) -> dict:
    """{"kind": one of KINDS, "calls_made": int, "usage": {...}}. Never raises."""
    usage = Usage()
    try:
        raw = await call(
            "fanout",
            LISTEN_SYSTEM,
            f"Language: {language_name(lang)}\nMessage: {text}",
            usage,
            temperature=0.0,
            max_tokens=40,
            response_format=LISTEN_SCHEMA,
            step="listen",
        )
        kind = json.loads(raw).get("kind", "other")
    except Exception:  # noqa: BLE001 - a kind sentence must not depend on the model
        kind = "other"
    if kind not in KINDS:
        kind = "other"
    return {"kind": kind, "calls_made": usage.calls_made, "usage": usage.as_dict()}

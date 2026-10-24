"""Does this child need help right now, before anything else happens?

Three rules shape this file.

1. **The model only classifies. The code decides. The text is fixed.**
   What a child in crisis is shown comes from content/safety_messages.json,
   written and source-checked by a person. A model must never improvise
   emergency guidance for a child.

2. **Detection is a prompt, not a gate.** Help is reachable from every screen
   whether or not this fires, and whether or not it works. That is what makes
   it safe to be wrong: a missed classification costs a prompt, not the help
   itself.

3. **A false alarm is not free.** Showing a crisis screen to a child who
   wrote "my mum will kill me when she sees my marks" teaches them the app
   does not understand them, and they stop writing. We would rather miss a
   borderline case, because the help is one tap away regardless.

This never contacts anyone. It changes what the child is offered, nothing else.
"""

import json
from pathlib import Path

from engine.client import Usage, call
from engine.contract import SafetyResult
from engine.prompts import language_name

CONTENT = json.loads(
    (Path(__file__).resolve().parents[2] / "content/safety_messages.json").read_text(encoding="utf-8")
)

SAFETY_SYSTEM = """You read one message from a child and decide whether they
need help right now, before anything else happens.

Answer with one category.

"danger" - someone can physically hurt this child now or very soon. A threat
for today or tomorrow, being followed, a weapon, being hurt while writing.

"self_harm" - the child says they want to die, to hurt themselves, or to
disappear, or that they cannot go on.

"none" - everything else, including serious bullying that already happened.
This is the normal answer and most messages are "none".

Judge what the child means, not the words they used. People exaggerate
constantly, and children more than most:
- "my mum will kill me when she sees this" is not danger, it is fear of
  being told off
- "I'm dead if they find out" is usually dread, not a threat
- "I could have died of embarrassment" is embarrassment
- "he said he'd kill me after school" IS a threat, because another person
  said it about this child

Past harm is not current danger. "He hit me last week" is "none": it matters
enormously and the rest of the app exists for it, but it is not happening
now.

If you are unsure, answer "none". Being wrong here costs a child their trust
in the app, and help is available to them on every screen anyway."""

SAFETY_SCHEMA = {
    "type": "json_schema",
    "json_schema": {
        "name": "safety",
        "strict": True,
        "schema": {
            "type": "object",
            "additionalProperties": False,
            "properties": {
                "category": {"type": "string", "enum": ["none", "danger", "self_harm"]},
                "because": {
                    "type": "string",
                    "description": "the words that decided it, quoted from the child; empty for none",
                },
            },
            "required": ["category", "because"],
        },
    },
}


def message_for(category: str, lang: str) -> str:
    """The fixed, human-written line for this category, in the child's language."""
    messages = CONTENT["messages"].get(category, {})
    return messages.get(lang) or messages.get("en", "")


def contacts_for(category: str) -> list[dict]:
    """Which verified contacts belong with this category."""
    when = "immediate_danger" if category == "danger" else "talk_to_someone"
    return [c for c in CONTENT["contacts"] if c["when"] == when]


async def safety_check(text: str, lang: str, usage: Usage | None = None) -> SafetyResult:
    """Classify, then look up fixed text. Never generates crisis wording.

    On failure this returns "none" rather than raising, so a model outage
    cannot block a child from finishing their report. That is only acceptable
    because help does not depend on this call: the always-visible help button
    is the actual safety net.
    """
    usage = usage or Usage()
    try:
        raw = await call(
            "judge",
            SAFETY_SYSTEM,
            f"Language: {language_name(lang)}\nMessage: {text}",
            usage,
            temperature=0.0,
            max_tokens=200,
            response_format=SAFETY_SCHEMA,
        )
        verdict = json.loads(raw)
        category = verdict.get("category", "none")
    except Exception:  # noqa: BLE001 - a crash here must not stop the child
        category = "none"

    if category not in ("danger", "self_harm"):
        return {"urgent": False, "category": "none", "message_child": ""}

    return {
        "urgent": True,
        "category": category,
        "message_child": message_for(category, lang),
    }

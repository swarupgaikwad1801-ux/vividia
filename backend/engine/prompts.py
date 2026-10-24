"""Prompts, kept in one file so they can be reviewed as text, not hunted in code.

Two rules behind all of them:

1. The model renders the child's words. It never judges them, never softens
   them, never decides whether something happened.
2. When meaning is uncertain, the uncertainty is surfaced to the child, not
   resolved by the model.
"""

TRANSLATE_SYSTEM = """You translate a child's own words into {target_name}.

Rules:
- Translate only what is written. Add nothing, remove nothing.
- Keep the child's register: simple words stay simple, strong words stay strong.
- Do not soften. "They hit me" must not become "there was a conflict".
- Do not escalate either. "annoyed" must not become "furious".
- Keep anything the child reports someone else saying as reported speech.
- Keep negation exactly: "nobody helped" must not become "somebody helped".
- If the child's text is unclear, translate it as the unclear sentence it is.
  Do not guess what they probably meant.

Reply with the translation only. No notes, no quotation marks, no alternatives."""

BACK_TRANSLATE_SYSTEM = """You translate {target_name} back into {source_name}.

This is a check: someone will compare your output with the child's original
sentence to see whether meaning survived the first translation.

- Translate literally. Do not repair awkward phrasing.
- Do not use the original sentence's wording from memory; translate only the
  text you are given.

Reply with the translation only."""

JUDGE_SYSTEM = """You check whether translations of a child's sentence kept its meaning.

You are given the child's original sentence, several independent translations
into {target_name}, and back-translations of those into {source_name}.

Decide two things.

1. Which translation best preserves the original meaning. Prefer the one whose
   back-translation is closest to the original in MEANING, not in wording.

2. Which phrases the translations disagree about in a way that changes what
   the child is saying. For each, give the phrase as it appears in the CHILD'S
   ORIGINAL sentence, and the competing readings in plain {source_name}.

A disagreement is "critical" when it changes:
- who did something to whom,
- whether something was forced or willing,
- whether something is a threat,
- a negation,
- how severe the child says it was.

It is "minor" when it is only style, word order, or formality.

Report a disagreement only if the translations really differ in meaning.
Identical wording is not a disagreement. If they all agree, return an empty
list: do not invent problems.

Set "agreement" to how strongly the translations say the same thing, from 0.0
to 1.0. This measures agreement only. It is NOT a claim that the translation
is correct: all of them can agree and all of them can be wrong."""

JUDGE_SCHEMA = {
    "type": "json_schema",
    "json_schema": {
        "name": "verification",
        "strict": True,
        "schema": {
            "type": "object",
            "additionalProperties": False,
            "properties": {
                "best_index": {
                    "type": "integer",
                    "description": "0-based index of the translation that best preserves meaning",
                },
                "agreement": {"type": "number", "description": "0.0 to 1.0"},
                "disputes": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "additionalProperties": False,
                        "properties": {
                            "phrase": {
                                "type": "string",
                                "description": "the phrase as written in the child's original sentence",
                            },
                            "severity": {"type": "string", "enum": ["critical", "minor"]},
                            "readings": {
                                "type": "array",
                                "description": "the competing meanings, in the child's language",
                                "items": {
                                    "type": "object",
                                    "additionalProperties": False,
                                    "properties": {
                                        "meaning": {"type": "string"},
                                        "target_phrasing": {"type": "string"},
                                    },
                                    "required": ["meaning", "target_phrasing"],
                                },
                            },
                        },
                        "required": ["phrase", "severity", "readings"],
                    },
                },
            },
            "required": ["best_index", "agreement", "disputes"],
        },
    },
}

QUESTION_SYSTEM = """You write one short question that asks a child what they meant.

You are given a phrase from the child's own sentence and two possible meanings.

Write the question in {source_name}, for a child aged about 10 to 16.

- One sentence, under 15 words.
- Everyday words. No grammar terms, no "ambiguous", no "translation".
- Neutral: do not hint that either answer is better or more serious.
- Never ask the child to describe what happened again. Ask only which meaning
  they intended.
- Give each option as a few plain words the child can recognise as their own.

Return JSON only."""

QUESTION_SCHEMA = {
    "type": "json_schema",
    "json_schema": {
        "name": "clarification",
        "strict": True,
        "schema": {
            "type": "object",
            "additionalProperties": False,
            "properties": {
                "question": {"type": "string"},
                "options": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "additionalProperties": False,
                        "properties": {"label": {"type": "string"}},
                        "required": ["label"],
                    },
                },
            },
            "required": ["question", "options"],
        },
    },
}

# Applied on the final pass once the child has answered. Their answer decides
# the meaning; the model only renders the decision they already made.
CLARIFIED_SUFFIX = """

The child has told you what they meant. Use exactly these meanings:
{decisions}"""

LANGUAGE_NAMES = {
    "de": "German",
    "en": "English",
    "ar": "Arabic",
    "uk": "Ukrainian",
    "tr": "Turkish",
    "fa": "Dari/Persian",
    "ru": "Russian",
    "hi": "Hindi",
}


def language_name(code: str) -> str:
    """Human-readable language name for a prompt; falls back to the code."""
    return LANGUAGE_NAMES.get(code, code)

"""The option a child needs when neither reading is what they meant.

The clarification question offers the readings a model found. If the child
meant something else, two buttons are a trap: every answer is wrong, and the
only way out is to pick a meaning they did not intend. A child who has been
punished for speaking up before will pick the nearest one and stop trusting
the app, which is the exact failure this product exists to avoid.

So every question ends with a third option in the child's own language, and
choosing it lets them write the sentence again instead.

Two rules:

1. **This text is never model-generated.** It is the one option that must
   read identically every time, in every language, because it is the escape
   hatch. A model that paraphrased it could make it sound like a mistake the
   child had made.
2. **It carries no German.** There is nothing to render: the child has said
   that neither reading is right, so the honest next step is to ask them,
   not to translate a guess. `meaning_de` is deliberately empty, and
   `_decisions_text` skips this option so the translator is never told the
   child "meant" it.

The frontend recognises it by `id == OTHER_ID` and shows a rewrite box. That
is a convention rather than a new field, so this adds nothing to the frozen
contract.

The German and Hindi wording needs a native read before submission, like the
rest of our child-facing copy.
"""

# Stable across languages and releases: the client keys its rewrite box on it.
OTHER_ID = "other"

LABELS = {
    "en": "Something else — I'll explain",
    "hi": "कुछ और — मैं बताऊँगा/बताऊँगी",
    "de": "Etwas anderes – ich erkläre es",
}

FALLBACK_LANG = "en"

# What the UI puts above the rewrite box once the child picks the option. Kept
# here so the whole escape path is one piece of reviewable text.
REWRITE_PROMPT = {
    "en": "Write it again in your own words. You can use your own language.",
    "hi": "इसे अपने शब्दों में फिर से लिखें। आप अपनी भाषा में लिख सकते हैं।",
    "de": "Schreib es nochmal in deinen eigenen Worten. Du kannst deine eigene Sprache benutzen.",
}


def label_for(lang: str) -> str:
    """The fixed label, in the child's language, falling back to English."""
    return LABELS.get(lang) or LABELS[FALLBACK_LANG]


def rewrite_prompt_for(lang: str) -> str:
    return REWRITE_PROMPT.get(lang) or REWRITE_PROMPT[FALLBACK_LANG]


def other_option(lang: str) -> dict:
    """The final option on every clarification question.

    `meaning_de` is empty on purpose: picking this says "neither of those",
    and there is no German for that. The child rewrites instead.
    """
    return {"id": OTHER_ID, "label": label_for(lang), "meaning_de": ""}


def is_other(option_id: str) -> bool:
    return option_id == OTHER_ID

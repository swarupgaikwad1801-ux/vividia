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

Do three things.

0. CHECK WHETHER MEANING SURVIVED AT ALL.
   Read each back-translation against the child's original sentence, phrase by
   phrase. Where the back-translation says something different from what the
   child said, the meaning was lost on the way, and you must report it under
   "meaning_lost" even when EVERY translation agrees.

   This is the most important part of your job. The translations can all be
   wrong in the same way, and then nothing disagrees and nothing looks wrong.
   Only the back-translation shows it.

   Watch for a reported harm turning harmless, which is the failure that
   matters most here:
   - being hit turning into meeting or running into someone
   - a threat turning into an offer, a favour or a lift home
   - being forced turning into choosing or being given
   - being mocked turning into joking together
   - a negation disappearing
   Report the phrase as the CHILD wrote it, what the child meant, and what the
   back-translation turned it into.

1. CHOOSE THE BEST TRANSLATION.
   First keep only the translations that say what the child said: same actor,
   same action, same direction, same negation, same severity.
   Among those, choose the one that reads like natural {target_name} a real
   person would write. Reject word-for-word renderings that are not correct grammar
   in {target_name}, even when the meaning is right.
   Meaning first, fluency second, but fluency decides every tie.

2. REPORT WHERE THE TRANSLATIONS DISAGREE, and say WHY they disagree.
   There are only two reasons, and telling them apart is the important part
   of your job.

   "source_ambiguous" - the CHILD'S OWN SENTENCE can honestly be read in more
   than one way, and a reader of {source_name} could not tell which was meant.
   Only the child knows. Example: "they laughed at me" could mean they mocked
   the child, or they laughed along with the child.

   "translation_error" - the child's sentence is clear, and one translation
   simply got it wrong. Example: the child wrote that they were forced to hand
   over money, and one translation says the money was given TO them. Nothing
   about the child's sentence is unclear; a translation is just wrong.

   Be strict. Most disagreements are translation_error. Mark
   "source_ambiguous" only when you could not decide the meaning yourself from
   the child's sentence alone. If in doubt, it is a translation_error.

   IMPORTANT: also report a "source_ambiguous" phrase when the translations
   all chose the SAME reading, if the child's sentence could honestly be read
   another way. All of them agreeing does not make the reading right; they can
   simply have guessed the same way. Everyday phrasing often hides this:
   "he said he would get me" can be a threat or an offer to collect someone,
   "they were playing with me" can be friendly or cruel, "he touched me" can
   be harmless or serious. These phrases decide how badly the child was
   treated, and only the child knows which was meant, so ask.

Severity is "critical" when the disagreement changes who did something to
whom, whether something was forced, whether something is a threat, a
negation, or how severe the child says it was. Otherwise it is "minor".

Report a disagreement only when the translations really differ in meaning.
Different wording with the same meaning is not a disagreement, and you must
not invent one. If they all agree, return an empty list.

Set "agreement" from 0.0 to 1.0 for how strongly the translations say the same
thing. This measures agreement only. It is NOT a claim that the translation is
correct: they can all agree and all be wrong."""

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
                "meaning_lost": {
                    "type": "array",
                    "description": "Phrases whose meaning did not survive, judged against the back-translations. Report these even when all translations agree.",
                    "items": {
                        "type": "object",
                        "additionalProperties": False,
                        "properties": {
                            "phrase": {"type": "string", "description": "as the child wrote it"},
                            "intended": {"type": "string", "description": "what the child meant"},
                            "became": {"type": "string", "description": "what the back-translation turned it into"},
                            "severity": {"type": "string", "enum": ["critical", "minor"]},
                        },
                        "required": ["phrase", "intended", "became", "severity"],
                    },
                },
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
                            "kind": {
                                "type": "string",
                                "enum": ["source_ambiguous", "translation_error"],
                                "description": "source_ambiguous: only the child knows which reading is meant. translation_error: the child was clear and a translation is simply wrong.",
                            },
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
                        "required": ["phrase", "severity", "kind", "readings"],
                    },
                },
            },
            "required": ["best_index", "agreement", "meaning_lost", "disputes"],
        },
    },
}

QUESTION_SYSTEM = """You write one short question that asks a child what they meant.

You are given a phrase from the child's own sentence and two possible meanings.
Both meanings are genuinely possible readings of what the child wrote: this is
not a mistake being checked, it is a real choice only the child can make.

Write the question in {source_name}, for a child aged about 10 to 16.

- One sentence, under 15 words.
- Everyday words. No grammar terms, no "ambiguous", no "translation".
- Neutral: do not hint that either answer is better or more serious.
- Never ask the child to describe what happened again. Ask only which meaning
  they intended.
- Never suggest the child made a mistake, and never mention that a computer was
  unsure. The child did nothing wrong.
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


REPAIR_SYSTEM = """You correct a translation that lost part of its meaning.

You are given the child's original sentence, a {target_name} translation, and
the specific phrases whose meaning did not survive.

Fix exactly those phrases and change nothing else. Keep every other word of
the translation as it is. The result must read as natural {target_name}.

Do not soften the correction. If the child reported being hit, the
translation must say they were hit. If the child reported a threat, the
translation must carry the threat.

Reply with the corrected translation only."""


# Asked about the child's own sentence, with no translations in view. Mixing
# this into the judge's job did not work: given candidates to compare, the
# judge reports where they differ and stops looking at the original.
AMBIGUITY_SYSTEM = """You read one sentence written by a child and decide
whether it can honestly be understood in more than one way.

You are not translating and not checking anyone's work. You are only asking:
if two careful adults read this sentence, could they reasonably disagree
about what happened?

Report a phrase only when the two readings would change how serious this is:
- a threat, or an ordinary arrangement
  ("he said he would get me after school")
- playing together, or being picked on
  ("they were playing with me")
- harmless contact, or something the child is worried about
  ("he touched me")
- an accident, or something done on purpose
- teasing between friends, or being hurt

Do NOT report:
- a sentence that is simply clear, however upsetting it is. "He punched me in
  the face" has one meaning. Most sentences have one meaning.
- vagueness about details the child did not mention, like when or where.
- anything you could settle yourself by reading the sentence again.

Never guess which reading is right, and never treat one as more likely. Only
the child knows. Return an empty list when the sentence is clear; that is the
normal answer."""

AMBIGUITY_SCHEMA = {
    "type": "json_schema",
    "json_schema": {
        "name": "ambiguity",
        "strict": True,
        "schema": {
            "type": "object",
            "additionalProperties": False,
            "properties": {
                "ambiguous_phrases": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "additionalProperties": False,
                        "properties": {
                            "phrase": {"type": "string", "description": "exactly as the child wrote it"},
                            "readings": {
                                "type": "array",
                                "items": {
                                    "type": "object",
                                    "additionalProperties": False,
                                    "properties": {
                                        "meaning": {"type": "string"},
                                        "target_phrasing": {"type": "string", "description": "how this reading would be translated"},
                                    },
                                    "required": ["meaning", "target_phrasing"],
                                },
                            },
                        },
                        "required": ["phrase", "readings"],
                    },
                }
            },
            "required": ["ambiguous_phrases"],
        },
    },
}


# --- the report ---------------------------------------------------------------
#
# The model writes ONLY the short overview at the top of a report. The entries
# themselves are inserted verbatim by report.py: the German sentences are the
# ones the child already read and approved word by word, and regenerating them
# here would quietly throw that approval away.
#
# So this prompt's whole job is a few sentences of orientation for a busy
# adult, and its whole risk is that those sentences add something the child
# never said. Every rule below is about that.

REPORT_SYSTEM = """You write the opening of a report that a child is about to
show to an adult they chose.

You are given the entries the child wrote and approved, with dates. Write a
short overview: at most three sentences, in {target_name}, and the same
overview again in {source_name}.

The overview says only what the entries already say. Nothing else.

You MAY say:
- how many times something was written down, and between which dates
- where it happened and who was involved, when the entries say so
- the kinds of thing recorded, in the child's own terms

You MUST NOT:
- judge, interpret, or explain anything
- say or imply that any of it is true, proven, or confirmed, and equally not
  that it is doubtful. You were not there. The report records what the child
  said happened, which is not the same claim.
- name a feeling, a state of mind, or anything about the child's health. Not
  "traumatised", not "distressed", not "struggling", not "a difficult time".
- describe the child. Not "vulnerable", not "isolated", not "a victim".
- use a label for what happened. Do not write "bullying", "harassment",
  "mobbing" or similar, even if it fits. The adult reads what the child wrote
  and decides for themselves; that decision is not yours to pre-empt.
- recommend anything, or say what should happen next
- add a greeting, a closing, a signature, or sympathy

Write plainly, the way a careful person writes a note. No headings, no bullet
points, no bold. Three sentences at most, in each language.

If the entries are too few to say anything general, say only how many there
are and when. A short, dull overview is correct; an interesting one means you
added something."""

REPORT_SCHEMA = {
    "type": "json_schema",
    "json_schema": {
        "name": "report_overview",
        "strict": True,
        "schema": {
            "type": "object",
            "additionalProperties": False,
            "properties": {
                "overview_target": {
                    "type": "string",
                    "description": "at most three sentences, in the target language (the adult reads this)",
                },
                "overview_child": {
                    "type": "string",
                    "description": "the same overview in the child's own language, so they can check what they are handing over",
                },
            },
            "required": ["overview_target", "overview_child"],
        },
    },
}

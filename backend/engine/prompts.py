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
   person would write. Reject word-for-word renderings that are not correct
   grammar in {target_name}, even when the meaning is right.
   Meaning first, fluency second, but fluency decides every tie.

   Two rules about how children write, which decide most of these:

   - **Never choose a literal rendering of slang or an idiom.** Children write
     "they roasted me", "he's dead to me", "I died of embarrassment". These
     describe being mocked, a fallout, and embarrassment. A translation that
     makes them about fire, death or dying is wrong, however faithful it looks
     word by word. Choose the version that says what the child meant.

   - **Prefer the reading most of the translations share.** If four say one
     thing and one says something else, the odd one out is usually a mistake,
     not an insight. Choose the minority version only when you can say exactly
     what the others got wrong.

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

Report a phrase when the two readings would change how serious this is:
- a threat, or an ordinary arrangement
  ("he said he would get me after school")
- playing together, or being picked on
  ("they were playing with me")
- harmless contact, or something the child is worried about
  ("he touched me")
- an accident, or something done on purpose
- teasing between friends, or being hurt

Also report a phrase when the child DID say something and the word they used
has two meanings, so that the two readings change **when** it happens or
**who** did it:
- a word that can mean two different times. Hindi "chhutti" is both a holiday
  and the end of the school day, so "kal chhutti ke baad" is either tomorrow
  after school or after the holidays. For a threat, that is the difference
  between tomorrow and weeks away.
- a word that can name two different people, or a pronoun whose person the
  child's language leaves open but the target language must choose.
- a word that can mean a relative or an unrelated older child, like Hindi
  "bhaiya" or "didi".

Urgency and identity matter as much as severity. A threat that loses its
timing has lost the part an adult would act on.

Do NOT report:
- a sentence that is simply clear, however upsetting it is. "He punched me in
  the face" has one meaning. Most sentences have one meaning.
- a detail the child never mentioned at all. If they did not say when, that
  is simply missing, not ambiguous, and you must not ask them for it. The
  test is whether the child's OWN WORDS carry two readings.
- anything you could settle yourself by reading the sentence again.

Work in this order, and fill "words_considered" first.

1. List every word or short phrase in the sentence that has more than one
   meaning in the child's language, with those meanings. Do this even when
   the sentence looks obvious, and even when one meaning is far more likely.
   This is a vocabulary question, not a judgement about the child.
2. Then decide which of those, if any, pass ALL THREE of these:
   a. the phrase appears in the child's sentence word for word, exactly as
      they typed it;
   b. both readings are genuinely plausible for a child writing about school,
      not merely possible in a dictionary;
   c. picking the wrong one would change what an adult should do: how serious
      it is, when it happens, or who did it.
3. Put only those in "ambiguous_phrases". Usually that is none or one.

Every question costs the child something. A child asked to explain their own
words three times learns that the app does not understand them, and stops
writing. When in doubt, leave it out.

Step 1 is not optional. Listing a word there and leaving it out of step 2 is
a normal and useful answer.

Never guess which reading is right, and never treat one as more likely. Only
the child knows."""

AMBIGUITY_SCHEMA = {
    "type": "json_schema",
    "json_schema": {
        "name": "ambiguity",
        "strict": True,
        "schema": {
            "type": "object",
            "additionalProperties": False,
            "properties": {
                "words_considered": {
                    "type": "array",
                    "description": "Every word in the sentence with more than one meaning, listed before deciding. Forces the vocabulary question to be asked explicitly; an obvious-looking sentence can still contain a word like Hindi 'chhutti' (holiday / end of the school day).",
                    "items": {
                        "type": "object",
                        "additionalProperties": False,
                        "properties": {
                            "word": {"type": "string"},
                            "meanings": {"type": "array", "items": {"type": "string"}},
                        },
                        "required": ["word", "meanings"],
                    },
                },
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
            "required": ["words_considered", "ambiguous_phrases"],
        },
    },
}


# Asked about one chosen translation only. Measured failure this exists for:
# a child wrote that someone said "if you tell anyone, you'll see", and the
# chosen translation became "I'll show him" - the threat survived but changed
# direction, so the child now appeared to be threatening someone else.
ACTOR_THREAT_SYSTEM = """You check two things about a translation, and nothing else.

You are given the child's original sentence, the {target_name} translation,
and that translation turned back into {source_name}.

1. DIRECTION. In the child's sentence, who does what to whom? Is that the
   same in the translation? Answer false if anyone has swapped places: if
   something done TO the child now reads as done BY the child, if a threat
   made against the child now reads as a threat the child is making, or if
   the person responsible has changed.

2. THREAT. If the child reported that someone threatened them, warned them,
   or told them what would happen if they spoke, is that still a threat in
   the translation? Answer false if it became a neutral remark, an offer, a
   favour, or advice.

Judge only these. Clumsy wording, a different word order, or a slightly
formal tone are not failures here.

Base your answer on the back-translation compared with the child's own
sentence, not on whether the translation reads well."""

ACTOR_THREAT_SCHEMA = {
    "type": "json_schema",
    "json_schema": {
        "name": "actor_threat",
        "strict": True,
        "schema": {
            "type": "object",
            "additionalProperties": False,
            "properties": {
                "direction_kept": {"type": "boolean"},
                "threat_kept": {
                    "type": "boolean",
                    "description": "true when the original carried no threat at all",
                },
                "what_changed": {
                    "type": "string",
                    "description": "empty when both are true; otherwise what moved, in one line",
                },
            },
            "required": ["direction_kept", "threat_kept", "what_changed"],
        },
    },
}

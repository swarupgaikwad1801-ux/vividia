---
name: child-facing-copy
description: Use when adding or changing any text a child reads - screen strings in frontend/src/lib/strings.ts, content/*.json, engine/errors.py, engine/clarify_text.py, or a prompt that makes the model write to a child. Covers which words we may put on a child's screen, which second person, which script, and the rules that have each already been broken once.
---

# Words on a child's screen

This app makes a child one promise: **these are your words, nobody rewrote
them.** Every rule here is that promise, applied somewhere it was broken.

Read this before changing a string a child reads. Not needed for the adult's
report card header, logs, or anything behind the handoff.

## 1. Never show a child a word they did not write

A phrase in quotation marks on a child's screen must be a phrase that appears
in what they typed. Check it in code, every time, on every path.

```python
# engine/translate.py
_said_by_the_child(phrase, text)   # the only gate. Use it.
```

> **In flight:** `_said_by_the_child` lands with **#86**. Until it merges,
> `main` has the weaker `_normalise` substring check inside `_find_ambiguity`
> only, and the other two paths have no gate at all.

**How this broke:** the judge model returns a `source_ambiguous` phrase that
appears nowhere in the child's sentence. `_find_ambiguity` filtered its own
output; `_ask_the_child` did not, and `_verify`'s repair prompt quoted invented
phrases into the German as *'where the child wrote "X"'*. A child wrote one
sentence about their own life and the app answered with somebody else's words
in quotation marks (#86).

The word list has the same trap from the other side: it reports a hit under its
**headword**, so a child who writes `chhedte` is reported under `chhedna`, and
one who writes `कल` under `kal`. Quote the form they typed, not the dictionary
entry.

## 2. A quoted button label must be that button's label, in that language

```
help.dangerLineNoNumber   "In danger right now? Tap Need help at the top."
help.short                ← what the button actually renders
```

English quoted `Need help` and the button said **Need help**. German quoted
`Hilfe` and said **Hilfe**. Hindi quoted `Need help` and the button said
**Madad chahiye** - in the danger path, to a child the app had just decided
does not read English (#77).

If a string names another string, they are coupled. Change one, change both.

## 3. तुम, never आप. du, never Sie

Hindi has two second persons and so does German. This app is the informal one
everywhere a child reads it. An app that switches register halfway through
stops sounding like a person and starts sounding like a form, which is the one
thing it cannot afford to sound like.

The single correct `आप` is the **report header**, because the reader there is
the adult the child handed the card to. It is pinned by a test so a sweep
cannot take it.

## 4. One script. The screens are Hinglish, so the engine is too

Latin script throughout: `"Tumhara matlab kya tha?"`, not
`"तुम्हारा मतलब क्या था?"`. The engine's Hindi was Devanagari while the screens
were Hinglish, so a child read Latin on every button and Devanagari the moment
something failed, a question was asked, or the safety message fired - the three
places where being unable to read it costs most (#93).

For the clarification question there is no string to edit: the model writes it.
Say it in `QUESTION_SYSTEM` and pin the instruction with a test, because a
prompt rule nobody pins is one merge from being gone.

**Register and script are independent.** A check that only reads Devanagari
passes an engine that went back to formal register spelled `aapko`. Match the
word in both alphabets.

> **In flight:** the screens are Hinglish in **#77**, the engine in **#93**,
> the तुम sweep and the timing rule in **#80**. On `main` today the engine's
> Hindi is still Devanagari, so until those land a child does meet two
> scripts. Write new copy to the rule above, not to what `main` currently
> does.

## 5. Crisis wording is looked up, never generated

`safety.py` classifies, then reads fixed text from
`content/safety_messages.json`. No model writes a sentence to a child in
crisis. The mock obeys this too.

And **say which language the help speaks**. `116 111` is `["de"]`; krisenchat
is `["de", "uk"]`. Pointing a Hindi- or English-speaking child at either
without saying so spends their one attempt at asking for help on a line that
cannot answer them. The screens do this through `languageNote()`; copy baked
into an error message bypasses all of it, which is how `credit_exhausted` got
it wrong in two languages at once.

## 6. Every question costs the child something

A child using this app is in the middle of describing being bullied. Each
question pulls them out of it to adjudicate their own sentence, and **only two
ever reach them**. Anything that gets into `ask_about` - a false lexicon match,
a `minor` dispute, an invented phrase - evicts a real one.

So a question has to buy something: the answer must change what the German says
in a way that changes what an adult would do. *Which object it was* does not
qualify. **When it happened does** - a knife threat that loses its timing is
the failure CLAUDE.md documents at length.

## Where the strings live

| what | where |
|---|---|
| screens | `frontend/src/lib/strings.ts` |
| onboarding, safety, demo, helplines | `content/*.json` |
| engine failures a child reads | `backend/engine/errors.py` |
| the "something else" escape | `backend/engine/clarify_text.py` |
| what the model is told to write | `backend/engine/prompts.py` |

## Last rule, and it has no exception

**None of us can sign off Hindi or German from here.** Everything above is
checkable by code or by careful reading; whether the sentence is *good* is not.
A native read is a separate step and saying "looks fine" is not it. Mark new
copy as a draft until someone who reads it natively has.

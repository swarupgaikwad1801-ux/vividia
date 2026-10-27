---
name: the-engine-contract
description: Use when changing a shape the engine and the screens share - app/schemas.py, engine/contract.py, frontend/src/types/api.ts - or when writing or changing the mock engine. Covers the three copies that must move together, what a mock is allowed to pretend, and the costs nobody can see from the code.
---

# The contract, and the mock that stands in for it

## There are three declarations, not two

```
backend/app/schemas.py       Pydantic      the HTTP boundary
frontend/src/types/api.ts    TypeScript    the screens
backend/engine/contract.py   TypedDict     what the engine functions take
```

`schemas.py` says it is "mirrored exactly in `api.ts`" and that both change in
the same commit. **That instruction is one file short.** `engine/contract.py`
is the one the engine actually consumes - `report()` is annotated
`list[Entry]` with *that* `Entry`.

A field added to two of them reaches the route and is handed to code that has
never heard of it. **#91** makes `test_contract_sync.py` compare all three; on
`main` today it still compares only the first two, which is how **#48** passed
11/11 while leaving the engine's `Entry` short a field. The direction differs
on purpose:

- **schemas → api.ts** - the server's output is the contract, so the screens
  must know every field it sends.
- **schemas → contract.py** - the route is receiving data and passing it
  inward, so the engine must know every field the API accepts, or it silently
  drops what a child sent.

A contract change needs all three of Swarup, Vernika and Neel to agree. Say so
in the PR title and do not merge it on one approval.

## What a mock may and may not do

**A mock may never be more convincing than the real thing.** Where it can only
do less, it does less and says so.

`mock.translate()` ignored its `text` argument and returned one fixed German
sentence about a stolen bag, with `confidence: 0.82` and a question about
`"laughed at me"`. A child who typed *"I dont feel good"* got back somebody
else's story, an agreement score for a sentence nobody wrote, and a question
about words they had not used. Mock mode is the only mode anyone sees without
a key (#87).

The rules that replaced it:

1. **Nothing is invented.** German comes from reviewed content
   (`content/demo_story.json`), or the child's own sentence comes back
   unchanged. A mock cannot translate; pretending to is the bug.
2. **Only the child's own words are quoted back** - questions come from the
   reviewed word list, matched against the text in code.
3. **The numbers are true.** No calls were made, so `calls_made` is `0`.
   Nothing was verified, so `confidence` is `0.0`.
4. **Check whether the real thing is already free.** `engine/report.py` makes
   no model calls at all, so the mock delegates to it. Its own version was a
   card about a child with none of the child in it.

Read content, never copy it. Two copies of a sentence or a phone number drift
apart silently.

## If a function ignores its own arguments, that is the bug

It is the quickest tell in this codebase, and the output looking fine is what
hides it. `translate`, `report` and `safety_check` all did it, and
`safety_check` answered `"none"` to every sentence including *"I want to die"*.

## Costs, measured rather than assumed

| | |
|---|---|
| adaptive path | **$0.00112 per checked sentence**, over 515 sentences in `eval/results/` |
| so $1 is | **~890 sentences**, ~750 with VAT |
| VAT | **19%**, and nothing in the code models it |
| both models | `$0.30`/M input, `$0.90`/M output - identical, and confirmed against the invoice |
| daily demo cap | `DEFAULT_DAILY_USD = 0.40` in `app/limits.py`, ~350 sentences/day |

Read these off the console's **usage-by-model** page, never off the account
balance. A balance is the difference between two unknowns; usage is a
measurement. Reasoning from the balance produced a published figure that was
wrong by 2.8x in the wrong direction.

Two limits the code does not model:

- **Cached input** is far cheaper than uncached, and `JUDGE_SYSTEM` is ~2,000
  identical tokens on every call. Judge input is the single biggest line item.
- **TPM, not just RPM.** The fan-out model allows 2,000,000 TPM; the judge
  allows **200,000** with the same 300 RPM. `client.py` limits on requests
  only, so at ~1,500 tokens a call the judge hits its token ceiling at ~133
  calls/minute while the limiter happily permits 300.

## Deploy facts that are not visible from the code

- Render **auto-deploys from `main`**, so merging a PR is a production deploy.
- Root directory must be **blank**, not `backend`, or `content/` never reaches
  the image.
- The free instance sleeps; the first request after a quiet period pays ~25s.
- `ENGINE_MODE` defaults to `mock` and `ALLOWED_ORIGINS` to localhost. **A safe
  default means a forgotten setting looks exactly like success.**
- A balance is not permission to spend it: after the trial ends, Token Factory
  holds the credit and refuses calls until *Switch to paid usage* is clicked,
  and nothing in the app can see that.

# SAFETY.md

Neel owns this file. **Draft, 24 Oct 2026.** It is the honest account of who
could misuse the app or the phone, what we do about it, and what we cannot
do. Every mitigation has a status; nothing marked *planned* or *requested* is
claimed anywhere else until it ships.

Status key: **done** (in `main` and tested) · **in branch** (written, waiting
for review) · **planned** (in `PLAN.md`) · **requested** (proposed to the
owner in a GitHub issue) · **limitation** (we cannot fix it; we say so).

## Where the child's words go

```
 child's phone (browser)                 our backend                Nebius Token Factory
 ───────────────────────                 ───────────                ────────────────────
 timeline stored here only  ── text ──►  /api/translate  ── text ──► Nemotron models
 child can delete it                     keeps nothing,              Zero Data Retention ON:
                                         logs no message text        nothing stored after the call

                                         /api/resources ── state code only ──► Tavily
                                         (the child's text is never sent to Tavily)
```

The disclosure **does leave the phone** for translation. We say so in the
README and in the app. We do not claim "EU inference": public Token Factory
endpoints report region "Global".

## Who could cause harm, and what we do

| # | Threat | What we do | Status |
|---|--------|------------|--------|
| 1 | **The trusted adult the child picks is the person hurting them** (harm at home) | Ask "where does this happen? school / home / online / somewhere else". If home, suggest only school staff and professionals for the handoff, never parents | requested |
| 2 | **Someone else picks up the phone** (parent, sibling, the bully) | PIN lock; quick exit in under 1 s; neutral app name and icon | PIN + quick exit planned; neutral name/icon requested |
| 3 | Quick exit gives a false sense of safety | Quick exit leaves the page; it **cannot** erase browser history, and the UI never implies it does | limitation (stated) |
| 4 | **The child has no phone of their own** | The web app runs on a shared school tablet or a social worker's device; PIN per child; nothing stored on our server | requested |
| 5 | **A child uses the app to make a false or revenge report** | The report is "the child's own words, which they approved", never a verdict. The app never names, contacts or notifies anyone automatically | first part done in the honesty rules; "never contacts the accused" requested |
| 6 | **A translation changes the meaning** (e.g. "hits me" → "meets me") | Fan-out + back-translation + repair; separate ambiguity check; confidence capped after repair; benchmark against native-speaker answers | done in engine; benchmark planned |
| 7 | **A clarifying question leads the child** ("did he hit you?") | Only the child's own two readings are offered, plus always a third option "something else, I'll explain". Questions are only asked for real two-meaning phrases, never about our own mistakes | two-reading rule done; third option requested |
| 8 | **The child is in danger right now** | Fixed keyword rules run **before** any model and show 110/112 and krisenchat at once. The model check is a second net, never the only one. Emergency numbers come from `content/helplines.json`, never from a search | curated numbers in branch; rules-first safety requested |
| 9 | A web search shows a child unvetted content | Tavily is limited to one hand-checked official site per state; results from any other host are dropped in code; unknown states get only curated helplines | in branch (tested) |
| 10 | A helpline number or hours are out of date | Every entry carries its source and verification date, shown in the UI; re-checked before the demo and before 15 Dec | in branch |
| 11 | The app is mistaken for counselling, diagnosis or legal advice | The UI says it is a communication tool; no diagnosis, no AI friend, no judgement on whether something is true | planned |
| 12 | Someone abuses the public demo and drains credits | Spending cap and rate limit | planned |
| 13 | An API key leaks | Keys only in `.env` (gitignored); rotate on any leak | done |

## German context we design for

- Children under 16 cannot consent alone to most data processing under the
  GDPR as applied in Germany. We avoid the question instead of claiming
  compliance: **no account, nothing stored on our server**, timeline only in
  the child's browser.
- Schools and youth welfare services follow a duty-to-protect process
  (§ 8a SGB VIII, § 4 KKG). Our escalation ladder points the child toward the
  people inside that process; the app never replaces it.

## Known limitations (published, not hidden)

- Consensus measures agreement, not correctness. Where every pass is wrong
  in the same way, only the back-translation check or the child can catch it.
- Languages are offered only after they pass our test with a native speaker.
  Picture mode exists for every other child.
- No real children tested the app. Usability feedback comes from adults
  playing a fictional scenario, and we say so.

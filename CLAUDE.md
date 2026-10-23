# CLAUDE.md

Shared context for this repository. Both team members run their own Claude
session against this repo; this file is what keeps those sessions aligned.
Keep it current — if a decision changes, change it here first and push.

## The project: Ankommen

A paperwork copilot for internationals living in Germany.

You give it a German official letter (Ausländerbehörde, Krankenkasse,
Finanzamt, university). It:

1. Explains the letter in plain English.
2. Extracts what is being demanded and the deadline.
3. Lists the documents you need to produce.
4. Drafts the reply in German.
5. **Remembers your case** — permit type, documents you hold, open deadlines —
   so the next letter is read in the context of the last one.

The memory is the point. A translator is a commodity; a thing that knows your
situation and tracks your deadlines is a personal assistant. That distinction
is what puts this in the Personal AI track rather than "another chatbot".

**Track:** Personal AI.
**Team:** Swarup Gaikwad (backend / agent logic), Vernika Sharma (frontend,
also Python).

## Deadline

**Friday 30 October 2026, 10:00 PDT = 18:00 German time.**

Target: submit as a draft on **Thursday 29 Oct**. Friday is buffer only.
After Thursday night, only fix what is broken — no new features.

## Hard requirements (failing any of these = disqualified)

From the Official Rules, not from guesswork:

1. **Must make a runtime call to Nebius Token Factory**, or be deployed/run on
   Nebius AI Cloud compute (Serverless Jobs, Serverless Endpoints, DevPods).
   A project that only calls some other provider does not qualify.
2. **Must use at least one NVIDIA open source model** — Nemotron 3 (Nano /
   Super / Ultra).
3. **Public repo with an open source license visible in the About box.**
   Done: MIT at the repo root.
4. **README with setup instructions**, explicitly stating where Nemotron is
   used, where Token Factory is used, and which other Nebius services.
5. **Public demo URL** — a working hosted app or test build.
6. **YouTube video, public, 3 minutes or less.**
7. Must genuinely fit the track. Stage One judging is pass/fail on whether it
   is "a genuine attempt at the track's stated goal, not a superficial rebrand
   of an unrelated idea."

## Judging criteria (four, equally weighted)

- **Technological Implementation** — how well built, how effectively it uses
  Nebius and the NVIDIA model.
- **Design** — "a complete, coherent product experience, not just a technical
  proof of concept." 25% of the score. UI work is load-bearing, not decoration.
- **Potential Impact** — a credible, specific case for a real audience.
  Ours: international students and workers in Germany. We are the users.
- **Quality of the Idea** — creative, non-obvious use of the models.

## Bonus prizes we are deliberately chasing

- **Best Use of Tavily ($3,000)** — requires a *functional runtime call* to the
  Tavily API. In Ankommen it fetches the current rule, fee or deadline from the
  relevant authority's own website so the advice is not stale, and the answer
  cites the source. This is load-bearing, not bolted on. A project may hold one
  Overall or Track award **plus** one Bonus award.
- **Most Valuable Feedback ($100 + swag, 10 awarded)** — the submission form's
  feedback section. Write it properly, not as an afterthought.

## Scope discipline

Seven days, two people. Things that are **in** scope:

- Paste German letter text in → structured analysis out.
- Persistent case file (permit type, documents held, open deadlines).
- Tavily lookup of the governing rule, with a citation.
- German reply draft.
- One clean, finished-looking web UI.

Things that are **out** unless everything above is done early:

- OCR from photos, user accounts and login, mobile app, multiple languages
  beyond German→English, real integrations with any authority.

A small thing that works completely beats a large thing that half-works. The
Design criterion rewards *coherent and complete*, not *big*.

## Working agreement

- Work on branches, open a PR into `main`. Two people pushing straight to
  `main` on a 7-day deadline will cost time in conflicts.
- **Never commit API keys.** Nebius and Tavily keys go in `.env`, which is
  gitignored. If a key is ever committed, rotate it — deleting the line is not
  enough, it stays in the history.
- Commit early and often. The repo is judged, so its history is visible.

## Honesty rules for the submission

- Do not claim a feature in the video or description that the demo does not
  actually do. Judges test the repo.
- Ankommen explains official letters; it is not legal advice. Say so in the UI.
- Do not use copyrighted music or third-party trademarks in the video.
- All work here is new, started 23 Oct 2026, so no prior-work disclosure is
  needed.

## Environment notes

- Swarup's machine had no Python and no Node installed as of 23 Oct 2026.
  Verify the toolchain before assuming a command will run.
- Exact Nebius Token Factory base URL and model IDs: read them from the Nebius
  console once the API key exists. **Do not guess them.**

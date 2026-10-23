# CLAUDE.md

Shared context for this repository. Both team members run their own Claude
session against this repo; this file is what keeps those sessions aligned.
Keep it current — if a decision changes, change it here first.

## What this is

A submission to the **Nebius x NVIDIA Global AI Hackathon** (Devpost).

**Team:** Swarup Gaikwad + Vernika (2 people).
**Project idea:** NOT YET LOCKED — fill this in before writing application code.
**Track:** Personal AI (planned).

## Deadline

**Friday 30 October 2026, 10:00 PDT = 18:00 German time.**

Target: submit as a draft on **Thursday 29 Oct**. Friday is buffer only.
No code changes after Thursday night except fixing something broken.

## Hard requirements (failing any of these = disqualified)

These come from the Official Rules, not from guesswork:

1. **Must make a runtime call to Nebius Token Factory**, or be deployed/run on
   Nebius AI Cloud compute (Serverless Jobs, Serverless Endpoints, or DevPods).
   A project that only calls some other provider does not qualify.
2. **Must use at least one NVIDIA open source model** — Nemotron 3 (Nano /
   Super / Ultra) is the obvious choice.
3. **Public repo with an open source license visible in the About box.**
   Done: MIT, committed at the repo root.
4. **README with setup instructions**, explicitly stating where Nemotron is
   used, where Token Factory is used, and which other Nebius services.
5. **Public demo URL** — a working hosted app or test build.
6. **YouTube video, public, 3 minutes or less.**
7. The submission must fit the chosen track genuinely. Stage One judging is
   pass/fail on whether it is "a genuine attempt at the track's stated goal,
   not a superficial rebrand of an unrelated idea."

## Judging criteria (four, equally weighted)

- **Technological Implementation** — how well built, how effectively it uses
  Nebius and the NVIDIA model.
- **Design** — "a complete, coherent product experience, not just a technical
  proof of concept." This is 25% of the score. Treat UI work as load-bearing,
  not decoration.
- **Potential Impact** — a credible, specific case for a real audience.
- **Quality of the Idea** — creative, non-obvious use of the models.

## Bonus prizes we are deliberately chasing

- **Best Use of Tavily ($3,000)** — requires a *functional runtime call* to the
  Tavily API. Build it into the product properly; do not bolt it on at the end.
  A project may hold one Overall or Track award **plus** one Bonus award.
- **Most Valuable Feedback ($100 + swag, 10 awarded)** — the submission form's
  feedback section. Write it properly, not as an afterthought.

## Working agreement

- Work on branches, open a PR into `main`. Two people pushing straight to
  `main` on a 7-day deadline will cost time in conflicts.
- **Never commit API keys.** Nebius and Tavily keys go in `.env`, which is
  gitignored. If a key is ever committed, rotate it rather than just deleting
  the line.
- Commit early and often — the repo is judged, so its history is visible.

## Honesty rules for the submission

- Do not claim a feature in the video or description that the demo does not
  actually do. Judges test the repo.
- If any part of this project existed before 26 August 2026, the submission
  must explain what was significantly updated. (Currently: all new work.)
- Do not use copyrighted music or third-party trademarks in the video.

## Environment notes

- Swarup's machine had no Python and no Node installed as of 23 Oct 2026.
  Verify the toolchain is installed before assuming a command will run.
- Exact Nebius Token Factory base URL and model IDs: read them from the
  Nebius console once the API key exists. Do not guess them.

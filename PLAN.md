# PLAN.md

Deadline: **Fri 30 Oct 2026, 18:00 German time.** Full draft on Devpost by
**Thu 29 Oct 22:00.** Friday is buffer only.

Rule: the app must look and work like 30 days of work (see "The 30-day
standard" in `CLAUDE.md`). A feature either passes the quality checklist or it
is not shown.

## How 30 days fit into 6

- **Parallel sessions:** each person runs 2–3 Claude Code sessions on separate
  branches/worktrees. One builds, one writes tests, one reviews.
- **Shifts:** stagger sleep so someone is building around the clock; start
  long jobs (eval runs, test suites, deploys) before sleeping.
- **Daily rhythm:** 10:00 sync (15 min, blockers only) · 22:00 merge to
  `main`, deploy, everyone tests the live URL on their phone.
- **Gates:** Must + Tier A by Tue 22:00 → Tier B until Wed 12:00 → Tier C
  until Wed 20:00 freeze. Missed gate = not shown.

## Tier owners

| Item | Owner |
|------|-------|
| Picture incident builder, read-aloud, PWA/offline, design system | Vernika |
| Engine tests with recorded responses, GitHub Actions CI, load test, latency budget, spending cap | Swarup |
| Hindi test set + review, verifying safety contacts, onboarding text, accessibility audit, `SAFETY.md` threat model, data-flow diagram | Neel |
| Witness mode (Tier B) | Vernika (screens), Swarup (engine) |
| Encrypted share link + printable report (Tier B) | Swarup (crypto), Vernika (UI) |
| Anonymous school signal (Tier C) | decided at the Wed 12:00 gate |

## Done on Sat 24 Oct (do not redo)

- Nebius verified; base URL and model IDs in CLAUDE.md. Credits: $1 trial,
  the $25 promo had not arrived.
- Fan-out model chosen by measurement, then **changed** after the language
  gate: now `Nemotron-3.5-Super-VL`. Judge: `nemotron-3-super-120b-a12b`.
- HTTP contract frozen (`backend/app/schemas.py` + `frontend/src/types/api.ts`),
  FastAPI app serving mock or live via `ENGINE_MODE`, 11 offline contract tests.
- Engine: strategies A/B/C, back-translation, meaning repair, source-ambiguity
  questions, rate limiting, cost accounting, untranslated-output guard.
- Safety check: live, with 14 regression cases covering crises and the
  everyday exaggerations that must not fire. `ENGINE_MODE=live pytest` = 27 passing.
- Languages settled: **Hindi + English -> German.**

Still mock: `report`, `resources`. `/api/health` reports which is which.

## Sat 24 Oct: foundations

- **All:** pick the name. Read `CLAUDE.md`. Agree the contract in
  `backend/engine/contract.py`.
- **Swarup:** Token Factory account (Visa/Mastercard), redeem
  `NEBIUS-DEVPOST-GLOBAL26`, join the Builder Program, API key into `.env`,
  run the smoke test, list the Nemotron model IDs, note rate limits. Start
  `FEEDBACK.md` notes.
- **Vernika:** Vite + React scaffold, design direction (colours, type),
  wireframes for check-in, write, handoff card. Calm, not childish.
- **Neel:** Tavily key. Start the **Hindi** test set (see Sunday).

## Sun 25 Oct: the risky part first

- **Swarup:** single-pass baseline on the test set; `translate.py` v1
  (fan-out, back-translation, judge).
- **Vernika:** FastAPI `main.py` on the mocks; screens 1 and 2; i18n with RTL
  working from the start.
- **Neel:** **the critical path.** 30 Hindi sentences a bullied child might
  write, in `eval/testset/hi_*.json`, written as a Hindi speaker would write
  them, not translated from English. Include slang, misspellings, and the
  idioms that must NOT trigger the safety check ("maa mujhe maar daalegi").
  Swarup and Vernika each review every sentence independently.
  Then verify every number and URL in `content/safety_messages.json` and set
  `_review_status` to `verified`.
- 🚩 Gate already run on Sat 24: languages are settled (Hindi + English),
  fan-out model switched to Super-VL. See CLAUDE.md.

## Mon 26 Oct: end-to-end

- **Swarup:** ambiguity questions + `clarifications`; `report.py`;
  `safety.py`; `eval/run_eval.py`.
- **Vernika:** screens 3 and 4; encrypted local storage; PIN; quick exit.
- **Neel:** `resources.py` with Tavily + domain whitelist; adult 5-minute
  guide; escalation ladder text.
- **Evening:** real engine wired in. **Deploy v0 to the live URL.**

## Tue 27 Oct: complete the journey

- **Swarup:** tune prompts from eval results; spending cap + rate limit.
- **Vernika:** screens 7 and 8; follow-ups; live verification animation;
  "Try Amira's story".
- **Neel:** native speakers rate baseline vs pipeline outputs; `SAFETY.md`.

## Wed 28 Oct: polish, **feature freeze 20:00**

- **All:** quality checklist on every screen (360px, RTL, loading/error
  states, accessibility labels).
- Witness mode only if every Must passes.
- **Swarup:** README tech sections, eval table, architecture diagram.
- **Neel:** video script, Devpost draft.

## Thu 29 Oct: proof and story

- Morning: bug bash with 2–3 people who have never seen the app.
- Afternoon: record + edit video (≤ 3:00), upload **public** on YouTube.
- Evening: Devpost write-up + feedback form. **Submit full draft by 22:00.**

## Fri 30 Oct: buffer

- Show-stoppers only. **No deploys after 14:00.** 15:00 final requirements
  check. 18:00 deadline.

## Video outline (≤ 3:00)

- 0:00–0:20 fictional child, the problem line
- 0:20–1:40 journey: check-in → writing in Arabic → ambiguity question →
  report → handoff card
- 1:40–2:20 the engine: live check counter, judge, eval result
- 2:20–2:50 privacy: why open models in the EU
- 2:50–3:00 "We built the engine for every child who can't say it. We finished
  the first path."

## Verify before relying on it

1. Base URL and model IDs (console / `--list-models`).
2. Rate limit for ~50 parallel calls.
3. EU region and zero-retention on our account.
4. Whether the backend can be hosted on Nebius Serverless (fallback: Render).
5. Nemotron quality per demo language (Sunday gate).

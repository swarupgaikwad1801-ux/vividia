# CLAUDE.md

Shared context for this repository. Each team member runs their own Claude
session against this repo; this file keeps those sessions aligned.
**If a decision changes, change it here first and push.**

Locked: Sat 24 Oct 2026.

## The project

**Working name: not chosen yet** (pick by Sat 24 Oct night; the repo stays `vividia`).

An app for **children and students who can't speak up** about bullying or
harm, because they freeze, don't have the words, don't speak German, or have a
disability that makes it hard.

**Hero user:** a migrant or refugee child, about 10–16, bullied at a German
school, who can't explain it in German.

> The problem isn't that kids won't talk. It's that they've learned what
> happens when they do.

> The child decides who knows. The app makes sure the child knows everything
> they can do.

### The journey (what we ship)

| # | Step | Status |
|---|------|--------|
| 1 | **Notice**: emoji check-in, no language needed | Must |
| 2 | **Find the words**: write in your own language; verified German shown side by side; the app asks the child when a phrase is ambiguous | **Must, centrepiece** |
| 3 | **Build the case**: timeline + bilingual report the child approves word by word | Must |
| 4 | **Choose who hears it**: handoff card for one trusted adult, with a 5-minute guide for that adult. Child-initiated only | Must |
| 7 | **Talk to a professional**: route to krisenchat / 116 111, bringing the words already written | Must |
| 8 | **Don't get dropped**: follow-up check-ins + escalation ladder that carries the timeline | Must |
| + | **Safety floor**: if the child writes about danger or self-harm, show 110/112 and krisenchat at once. Nothing is sent to anyone | Must |
| + | **Quick exit + PIN lock** | Must |
| + | **"Try Amira's story"**: one-click pre-filled demo for judges | Must |
| + | **Picture incident builder**: tap icons for what happened, where and who (pushed, hit, names, things taken, online, left out). For children who can't write either | Tier A |
| + | **Read-aloud** of every screen and question in the child's language, using the device's own speech engine (nothing leaves the phone) | Tier A |
| + | **Hindi and English** as source languages, German as target (decided 24 Oct, see the language gate) | Tier A |
| + | **Installable PWA, offline-first**: everything except translation works without network | Tier A |
| + | **Accessibility**: WCAG 2.2 AA, screen-reader labels, large-text and dyslexia-friendly mode | Tier A |
| + | **Onboarding** that explains, in the child's language, what the app does and never does | Tier A |
| 5 | **Witness mode**: report for someone else | Tier B |
| + | **Encrypted share link** for the trusted adult (key in the URL fragment, expires) + printable report | Tier B |
| 6 | **Anonymous school signal**: where/when only, shown to the school only after several independent reports agree | Tier C |

**Tiers.** Must + Tier A = the product we submit. Tier B starts only when every
Must and Tier A item passes the quality checklist (gate: Tue 27 Oct 22:00).
Tier C starts only when Tier B passes (gate: Wed 28 Oct 12:00). Feature
freeze for everything: Wed 28 Oct 20:00. A feature that misses its gate is
not shown; it goes in "future work".

### What we never build

- No monitoring of messages, no automatic SOS, **no alert behind the child's back**.
- No AI "friend" or companion. We are the bridge to people who can be.
- No diagnosis, no depression inference. It is a communication tool, not a
  clinical one; the UI says so.
- No school case-management system.

### Escalation ladder (content owned by Neel, every item sourced)

Teacher → Vertrauenslehrer/in or Schulsozialarbeit → Schulleitung →
schulpsychologische Beratungsstelle → krisenchat / Nummer gegen Kummer 116 111
→ immediate danger: 110 / 112.

## Track

**Best Apps and Agents.** Not Personal AI: a child-safety disclosure tool is
not a "daily workflow assistant", and Stage One is pass/fail on track fit.
The Overall prizes are open from any track.

## Team and ownership

Each person owns separate files. Do not edit someone else's files without
asking them; that is how we avoid merge conflicts.

| Who | Owns | Files |
|-----|------|-------|
| **Swarup Gaikwad** | AI engine and model orchestration: strategies A/B/C, prompts, judge, cost and latency instrumentation, engine tests | `backend/engine/` (except `resources.py`), `eval/bakeoff.py`, `eval/probe_thinking.py` |
| **Vernika Sharma** | Full-stack and product: all screens (React + Vite + TypeScript + Tailwind), i18n + Arabic RTL, browser storage and deletion, PIN, quick exit, the FastAPI app, deployment | `frontend/`, `backend/main.py` |
| **Neel Shah** | Evaluation, QA, Tavily and submission: the dataset, the eval runner and charts, Tavily resource discovery, end-to-end QA, diagrams, video, Devpost | `backend/engine/resources.py`, `content/`, `eval/testset/`, `eval/run_eval.py`, `SAFETY.md`, `FEEDBACK.md` |

Neel is an engineering contributor, not a presentation role: the eval runner
and the Tavily module are his code.

Shared: README (Swarup writes the tech sections, Neel the rest), evening
testing every day.

## The contracts

Two layers, both frozen as of 24 Oct:

1. **HTTP** - `backend/app/schemas.py` (Pydantic) mirrored exactly in
   `frontend/src/types/api.ts` (TypeScript). Endpoints: `POST /api/translate`,
   `POST /api/clarify`, `POST /api/report`, `GET /api/resources`,
   `GET /api/health`. Every non-2xx body is an `ErrorResponse` carrying
   `message_child`, the only string a child may ever see.
   `backend/tests/test_contract.py` enforces all of it and runs offline.
   **Change the Python and the TypeScript in the same commit, never one alone.**
2. **Engine** - `backend/engine/contract.py`; fake implementations with the
   exact same signatures live in `backend/engine/mock.py`.

The safety check is part of the `/api/translate` response rather than its own
endpoint, so no caller can forget to run it. Vernika builds against the
mocks; Swarup and Neel replace them with real code **without changing the
signatures**. Any change to the contract is agreed by all three first.

All functions are `async`.

```python
translate(text, source_lang, target_lang="de", clarifications=None) -> TranslationResult
report(entries, child_lang) -> Report
safety_check(text, lang) -> SafetyResult
resources(state, lang) -> list[Resource]
```

### How `translate` works

1. **Fan out:** Nemotron Nano translates the text into German N times
   independently (N=5, varied temperature), in parallel.
2. **Back-translate:** Nano translates each German version back.
3. **Judge:** a larger Nemotron (Super or Ultra) compares all versions, picks
   the best German, scores agreement, and lists phrases whose meaning drifts.
4. **Ask the child:** each drifting phrase becomes a question in the child's
   language with 2 options. The child's answer is passed back in
   `clarifications`. The child confirms meaning; the model never decides it.

`calls_made` is returned so the UI can show the live check count.

## Engine decisions, measured 24 Oct 2026

Evidence: `eval/bakeoff.py` and `eval/probe_thinking.py` over
`eval/testset/en_starter.json` (8 sentences, each with a known meaning trap).

### Reasoning must be switched off explicitly

`reasoning_effort` in `extra_body` is the **only** switch that works. The
documented alternatives (`detailed thinking off`, `/no_think`,
`chat_template_kwargs`) are all silently ignored.

- **Lightning**: `"none"` works. Any other value floods `content` with
  "Here's a thinking process:" and never reaches the translation.
- **Nano**: `"none"` returns an **empty** answer (7 tokens, finish_reason
  `stop`). `"minimal"` is the lowest usable value.

### Fan-out model: Nemotron 3.5 Lightning

| | Nano (`minimal`) | **Lightning (`none`)** |
|---|---|---|
| latency per call | 2.07 s | **0.33 s** |
| output tokens | 256 | **20** |
| rate limit | 100 RPM | **600 RPM** |
| price | $0.06 / $0.24 per 1M | same |

Lightning is ~6x faster, ~13x cheaper per call and has 6x the request
headroom, at identical quality on our traps. **Nano's reasoning tokens were
pure waste**: it spent ~250 tokens deliberating over a 12-word sentence.
Judge model stays `nvidia/nemotron-3-super-120b-a12b`; test Ultra in the eval.

### The fan-out thesis is confirmed

Three passes at different temperatures disagree **precisely at the traps**:

- *"They made me give them my money"* → one pass produced "Sie haben mir mein
  Geld **gegeben**" (they gave me money: the meaning inverted), another
  "abgenommen", another "gezwungen". A single pass could ship the inversion.
- *"everyone laughed at me"* → "über mich gelacht" vs "mich ausgelacht"
  (2 of 3). Majority lands on the correct, stronger word.
- *"the teacher gets annoyed"* → "ärgert sich" / "wird sauer" / "wird
  genervt". Only the last keeps the mild register; "sauer" escalates it.

**Honest limitation to publish:** where the model is *consistently* wrong,
consensus cannot save us. All three passes rendered "they call me names" as
"Sie nennen mir Namen", which is not German for insults. This is why the
judge step and the question to the child exist, and why the README must say
consensus measures agreement, not correctness.

## What we may and may not say about privacy

Our own early drafts said the child's data "stays on the device". **That is
false and must never ship.** Translation is cloud inference on Nebius: the
disclosure text leaves the phone. Correct statements only:

- Yes: the timeline is stored only in the child's browser, and the child can
  delete it.
- Yes: our backend keeps no disclosure and logs no message content.
- Yes: Nebius Zero Data Retention is enabled, so prompts and outputs are not
  stored after processing and are never used to train any model (verified
  24 Oct 2026).
- No: not "everything stays on your device" - translation is cloud inference.
- No: not "we are GDPR compliant" - we have no legal review. We may say which
  certifications Nebius holds, and describe what we do.
- No: quick exit leaves the page; it does **not** erase browser history, and
  the UI must not imply that it does.
- No: never "this keeps you safe", never a judgement that an allegation is
  true, never a diagnosis.

The data-flow diagram in `SAFETY.md` (Neel) must show the disclosure leaving
the device, or it is not an honest diagram.

## Verification strategies (A/B/C)

The benchmark compares three, and the app uses C:

- **A, baseline:** one translation call. The honest comparison point.
- **B, multi-pass:** always fan out, back-translate, judge.
- **C, adaptive:** a cheap triage decides per sentence whether B is needed.
  Escalate on negation, on an unclear actor ("they", "he"), on coercion or
  threat wording, on slang, and on low agreement between the first two
  passes. Otherwise stop at A.

**C is the one that must win**, because extra calls have to earn their place.
If the data shows C is no better than A, we publish that and explain why. We
never add calls to make the architecture look impressive.

## How verification actually works, and why

Three separate checks, because one model call cannot do all three jobs. Each
was added after watching the previous design fail on a real sentence.

1. **Fan-out + judge: catches one pass getting it wrong.**
   The judge picks the best candidate. Meaning first, fluency second: an
   early version chose "Sie machten mich, ihnen Geld zu geben", which is
   broken German, over a correct and fluent alternative.

2. **Back-translation + repair: catches every pass getting it wrong together.**
   This is the one that matters most. *"My friend hits me sometimes"* became
   *"Mein Freund **trifft** mich"* (my friend **meets** me) in all five
   passes, with agreement 1.00. Nothing disagreed, so nothing looked wrong.
   Only the back-translation showed it: *"My friend meets me sometimes."*
   The judge now compares each back-translation against the child's original,
   reports what was lost, and a repair pass puts it back:
   *"Mein Freund **schlägt** mich manchmal."* Confidence is capped at 0.6
   whenever a repair was needed, because agreement had already proved
   worthless on that sentence.

3. **A separate ambiguity check on the original: catches what no translation
   can resolve.** Run against the child's sentence alone, with no candidates
   in view. Folding this into the judge did not work: once it has candidates
   to compare, it reports where they differ and stops reading the original.
   *"He said he would get me after school"* is a threat or a lift home, and
   every pass chose the lift. Only the child knows, so the app asks:
   *"When you said 'get me', did you mean someone should come find you, or
   hurt you?"*

**The distinction that keeps the app honest:** a disagreement because a pass
was *wrong* is ours to fix silently (`translation_error`). A disagreement
because the child's words carry two honest readings is theirs to decide
(`source_ambiguous`). We never ask a child to adjudicate our own mistake; an
early build asked "did you mean they gave you money?" about a sentence that
plainly said the opposite.

Cost of all this, measured: a safe sentence takes 2 calls and ~340 ms; a
sentence needing full verification and repair takes 13 calls and ~3 s.

## Shipped languages: Hindi and English (decided 24 Oct)

Arabic, Ukrainian and Turkish are **out**. Not because a child speaking them
matters less, but because we could not verify quality in them: see the
language gate below, where 17 of 18 machine-made test sentences were already
broken and none of us can read the output.

Hindi replaces them. On the first five Hindi sentences the pipeline kept
every critical detail, including the two that broke other languages
(*mara* -> "schlaegt" not "trifft"; *jabardasti* -> "gewaltsam abgenommen").

What this unblocks: **all three of us read Hindi**, so the benchmark no
longer waits on finding strangers. Neel writes the Hindi test set himself,
and two teammates review every sentence independently. That is real human
validation by native speakers, which is stronger evidence than a
machine-graded score in a language nobody on the team can check.

Honesty rule that follows: we say the system is **built and measured for
Hindi and English**, and that the architecture is language-independent. We do
not claim it works in Arabic, Ukrainian or Turkish, and we do not demo them.

The demo child is Hindi-speaking. Pick the name with the team; "Amira" no
longer fits.

## The language gate: result and what it changed (24 Oct)

`eval/language_gate.py`. Two findings, both of which changed the build.

### 1. The fan-out model could not translate the languages we ship

Lightning with reasoning off returned the **Ukrainian input unchanged in 5 of
12 runs**, and once replied "Ich bin Nemotron, ein Sprachmodell von NVIDIA".
It had won the English bake-off, so this was invisible until the gate ran.
Super-VL and Super both failed 0 of 12. **Fan-out is now
`nvidia/Nemotron-3.5-Super-VL`** (faster than Super, 10x token budget, reads
images later). The judge stays a *different* model on purpose: a judge that
shares the translator's blind spots cannot see its mistakes.

`untranslated()` in `translate.py` now rejects any pass that echoes the input
or returns the wrong script, retries once, then fails loudly. Untranslated
text must never reach a teacher labelled as a translation.

### 2. We cannot make our own non-English test data, and that is now the blocker

The gate pivots English through the target language, then grades the German
against the English. After grading the pivots too, **17 of 18 pivots had
already lost the detail before our pipeline saw it**. Example: "they call me
names" became "they call me *by* names" in Arabic and Ukrainian, so the
insult was gone from our input. Scoring the pipeline on those cases measures
the pivot translator, not us.

So: **the only honest non-English numbers must come from sentences written by
native speakers.** Neel's test set is no longer a Tuesday task, it is the
critical path for the whole benchmark. Until it exists:

- English results are real and reproducible, and are what we report.
- No claim about Arabic, Ukrainian or Turkish quality goes in the README, the
  video or Devpost. Not one.
- The demo may still run in those languages; we simply do not claim a measured
  quality level for them.

### Also observed

- The triage markers in `looks_risky()` are English only, so for other
  languages escalation falls back to "did the two passes disagree". That is
  weaker, and is tracked for Monday.
- Super-VL leaked its deliberation into the answer on an open-ended
  generation prompt ("Let me go with: ..."). Our production prompts are tight
  and have not shown it, but output is guarded rather than trusted.

## Hard requirements (failing any one = disqualified)

1. Runtime call to **Nebius Token Factory** (we do this in every engine call).
2. At least one **NVIDIA Nemotron** model (Nano + Super/Ultra).
3. Public repo, **MIT license visible in the About box**.
4. README with setup and exactly where Nemotron, Token Factory, other Nebius
   services and Tavily are used.
5. **Public demo URL** that works for judges **until 15 Dec 2026**.
6. **Public YouTube video, 3:00 or less.**
7. Genuine fit with the track (Stage One pass/fail).

## Judging (four criteria, equal weight)

Technological Implementation · Design ("complete, coherent product, not a
proof of concept") · Potential Impact · Quality of the Idea.

What a judge (Jacquie) said in the Nebius Discord on 20 Oct: make it super
easy to try; don't make judges paste an API key; a pre-filled demo they just
press send on; don't let it feel like a marketing page.

## Competition (checked 24 Oct 2026)

576 Nemotron + Nebius projects on Devpost; **none about bullying, child safety
or refugees**. Ones to beat: Xvimo (Nano triage → Ultra agent, multilingual,
publishes a 330-message benchmark), Jaga, NawiAI, Porchlight, Airlock, Tagout
(puts real numbers in its tagline). Lessons: everyone says "verified", so the
child is our difference; **a real benchmark is required, not optional**.

## Bonus prizes we chase

- **Best Use of Tavily ($3,000):** live helpline/support lookup, restricted to
  a domain whitelist (krisenchat.de, nummergegenkummer.de, official school
  counselling sites). Children never see unvetted web content.
- **Most Valuable Feedback ($100 + swag):** keep `FEEDBACK.md` from day 1;
  write down every Nebius friction as it happens.

## Quality bar ("perfect")

- Every button works; no placeholders, nothing labelled "simulated".
- Works on a cheap Android phone in Chrome at 360px; Arabic RTL correct.
- Verification shows progress and finishes in about 10 s or less.
- Friendly error in the child's language for timeouts and no network.
- Nothing about the child stored on the server; the backend logs no message
  content.
- Quick exit works in under 1 s.
- Every claim in README/video has a source or is removed.
- Eval numbers are real and reproducible.

## The 30-day standard

We have 6 days; the app must look and work like 30 days of work. That comes
from depth and finish, not from a long feature list:

- **Parallel work:** each person runs several Claude Code sessions at once on
  separate branches (git worktrees), e.g. engine + eval + tests in parallel.
  Long jobs (eval runs, test suites) run while people sleep.
- **Engineering:** automated tests for the engine (recorded model responses,
  no live calls in CI), GitHub Actions on every PR, a load test for ~50
  parallel calls, a latency budget per step, structured error handling.
- **Proof:** an eval of 50 sentences per language rated by native speakers,
  baseline vs pipeline, reproducible with one command; numbers in the README
  and the Devpost tagline.
- **Design:** one design system (colour, type, spacing, illustration style,
  motion), every state designed (empty, loading, error, offline, success),
  micro-interactions, and a hand-tested pass on a real cheap Android phone.
- **Trust:** `SAFETY.md` with a threat model (who could misuse the app or the
  phone, and what we do about it), a privacy/data-flow diagram, a GDPR-style
  data protection summary, and documented limitations.
- **Story:** storyboarded video with voice-over and captions, architecture
  diagram, polished Devpost page with real screenshots.

## Working agreement

- Branch per feature (`feat/...`), PR into `main`. `main` is always deployable.
- **Never commit API keys.** Keys go in `.env` (gitignored). If one is ever
  committed, rotate it; deleting the line is not enough.
- Public demo needs a **spending cap and rate limit** so credits last until
  15 Dec.
- Commit early and often; the history is judged.

## Honesty rules

- Never claim a feature the demo doesn't do. Judges test it.
- **Do not claim EU zero-retention inference until verified** on our account.
- No real incident and no real minors in the video or on Devpost. Personas
  (e.g. "Amira, 12") are fictional and say so.
- Communication tool, not counselling, therapy or legal advice; the UI says so.
- All work started 23 Oct 2026; no prior work to disclose.

## Deadline

**Fri 30 Oct 2026, 10:00 PDT = 18:00 German time.** Full draft submitted
Thu 29 Oct by 22:00. Day-by-day plan: see `PLAN.md`.

## Environment notes

- Swarup's machine (24 Oct): Python 3.12 (`py`) and Git installed; Node not
  installed. Verify before assuming a command runs.
- Token Factory signup **requires a Visa or Mastercard** (RuPay rejected,
  some countries unsupported, no exceptions). Without a card the trial ends
  with `402 credit_balance_exhausted`.
- **Base URL and model IDs: copy from the Nebius console or run
  `py -m engine.smoke_test --list-models`. Never guess them.**
- Confirmed 24 Oct 2026 with a working key:
  - Base URL: `https://api.tokenfactory.nebius.com/v1/`
  - Nemotron models on our key: `nvidia/NVIDIA-Nemotron-3-Nano-30B-A3B`
    (Nano, translation passes), `nvidia/nemotron-3-super-120b-a12b` (judge),
    `nvidia/Nemotron-3-Ultra-550b-a55b` (judge candidate),
    `nvidia/Nemotron-3.5-Super-VL` (reads images), `nvidia/Nemotron-3_5-Lightning`.
  - First Nano call: 4.35 s, 37 tokens in / 232 out for a 12-word answer, so
    Nano reasons by default. Test reasoning off for the fan-out passes.
  - Its translation "über mich gelacht" (instead of "mich ausgelacht") is a
    real example of the meaning drift our pipeline exists to catch.
- Console facts, read 24 Oct 2026 (tenant `aitenant-e00a22yvbd5fv0xpg3`):
  - **Rate limits** (default; auto-scale up to 20x once usage passes 80%):
    Nano 800k TPM but only **100 RPM** (the lowest of any model on the
    platform), Lightning 400k TPM / **600 RPM**, Super 200k TPM / 300 RPM,
    Ultra 200k TPM / 300 RPM, Super-VL 2M TPM / 300 RPM.
    → **Nano cannot be hammered in parallel.** Every fan-out needs a
    concurrency limiter, and Lightning is the better fan-out candidate at the
    same price. Decide with the Sunday eval.
  - **Prices** per 1M tokens (input / output): Nano $0.06 / $0.24, Lightning
    $0.06 / $0.24, Super $0.30 / $0.90, Super-VL $0.30 / $0.90, Ultra
    $1.00 / $3.00. Cached input is ~5x cheaper; the Batch API is half price
    (use it for eval runs, never for the live demo).
  - **Zero Data Retention is ENABLED** on our organization (Settings →
    Organization → Other settings). Prompts and completions are not stored
    after processing, and are never used to train any model in either mode.
    This is the privacy claim we can actually make.
  - **Region: do NOT claim "EU inference".** Public endpoints report region
    "Global"; the processing location is dynamic and can change without
    notice. Only dedicated endpoints carry a region commitment, and they cost
    $4.70+ per GPU-hour, which is out of budget. Retained data (ZDR off)
    would sit in Finland. Say "nothing is retained", not "runs in the EU".
  - Compliance we may cite: GDPR, ISO 27001, ISO 27701, SOC 2 Type II,
    EU-US Data Privacy Framework.
  - **Credits: $1.00 trial, 29 days. Account balance $0.00.** The $25 promo
    code had not arrived by email as of 24 Oct. Redeem it at Billing →
    Payments → + → "With promo code". The demo must stay up until 15 Dec, so
    chase this; $1 is roughly 2,000 translated messages.
- **API keys live only in `.env`.** Never in any other file inside the repo
  (a txt file of keys in the repo is one `git add .` away from being public).
  Keep a personal copy outside the repo folder.

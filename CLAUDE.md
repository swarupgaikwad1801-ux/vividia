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
| 5 | **Witness mode**: report for someone else | Only if every Must passes the quality checklist by Wed 28 Oct 20:00 |
| 6 | Anonymous school signal | Out. Future work |

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
| **Swarup Gaikwad** | The AI engine, Nebius setup, prompts, eval runner | `backend/engine/` (except `resources.py`), `backend/engine/prompts/`, `eval/run_eval.py` |
| **Vernika Sharma** | The app: all screens, i18n + Arabic RTL, on-device encrypted storage, PIN, quick exit, FastAPI server, deployment | `frontend/`, `backend/main.py` |
| **Neel Shah** | Proof, content and story: Tavily resources, safety content with sources, translation test set + native-speaker ratings, QA, video, Devpost | `backend/engine/resources.py`, `content/`, `eval/testset/`, `SAFETY.md`, `FEEDBACK.md` |

Shared: README (Swarup writes the tech sections, Neel the rest), evening
testing every day.

## The engine contract

Defined in `backend/engine/contract.py`; fake implementations with the exact
same signatures live in `backend/engine/mock.py`. Vernika builds against the
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

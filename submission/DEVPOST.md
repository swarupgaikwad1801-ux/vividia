# Devpost draft

Neel owns this file. **Draft, updated 28 Oct 2026** to the app as it is on
`main` that day (the 27–28 Oct merges, #109–#131). Paste section by section into the
Devpost form. Rules: every claim must be true of the shipped demo, every
number comes from `eval/results/` or `CLAUDE.md`, and **[TBD]** marks what is
filled in after the live eval or cut. App name: **Vividia**. Always write it as "Vividia, powered by NVIDIA Nemotron" at least once per section a judge reads first; no NVIDIA logo or brand colours.

**Track:** Best Apps and Agents

**Tagline (≤ 200 chars):**
> Helps children who can't speak up about bullying put it into words in their own language, checks every translation with NVIDIA Nemotron, and asks the child when meaning is unclear.

*(No accuracy number in the tagline: the benchmark is preliminary and the two strategies are level.)*

---

## Inspiration

Some children never tell anyone they are being bullied. They freeze, they
don't have the words, or they have just arrived in Germany and don't speak
German yet. When they do try, the translation is often done by a classmate or
an app that guesses, and a single word can carry two meanings. "He said he
would get me after school" is a threat or a lift home, and a translator picks
one without telling anyone.

We wanted a tool that gives the child the words, makes sure the adult reads
exactly what the child meant, and leaves the child in charge of who hears it.

## What it does

- **Check-in without words:** the child taps a face. The app answers kindly
  and, after a hard feeling, offers calm tools (a breathing bubble, the
  5-4-3-2-1 grounding steps) and more exact feeling words. Nothing is scored.
- **Tap what happened:** a picture builder for children who can't write
  either: what happened, what was taken, where, who and how often, every
  question skippable. "Is this right?" shows exactly what the card will say
  before anything is saved.
- **Or say it in your own words:** a listening chat in English, Hindi
  (including Hinglish, the way kids actually type) or German. It answers each
  message with a short line written and reviewed by people; the model only
  picks which one fits. Sentence starters help a child who doesn't know how
  to begin.
- **Write in your own language:** a verified German version appears side by
  side.
- **Also for a child who already writes German:** we don't translate for
  them. Their words stay exactly as they wrote them, and the app still asks
  when something could mean two things.
- **Asks instead of guessing:** when a sentence has two honest readings
  ("he said he would get me after school": a threat or a lift home?), the app
  asks the child, and always offers "something else". Next time the same
  words are unclear, the child's last answer is offered first, never picked
  for them.
- **My notes, approved by the child:** every entry, in both languages, from
  a button at the top of every screen. A PIN can lock it; a deleted entry can
  be undone; the last four weeks show the days something was saved and the
  days the child came back, counted, never as a streak.
- **The child chooses who hears it:** one trusted adult gets the child's words
  on a card the child holds up, flipping between their language and German,
  full screen if they like, with a short, sourced guide for the adult ("For
  the grown-up: what to do first"). If the child says it happens at home, the
  app never suggests family members.
- **Help on every screen:** the red headphones button opens 110/112, 116 111
  and krisenchat, verified against official sources and built into the app,
  so they show offline and while the server wakes up. These services answer
  in German (krisenchat also in Ukrainian), none confirms Hindi or English,
  and the app prints each service's languages and check date on screen so a
  child is not surprised.
- **Danger is met at once:** if the child's words or taps point to danger,
  110/112 open straight away. Fixed rules check every message beside the
  model, so a plain threat ("he said he would bring a knife tomorrow") still
  gets help if the model misses it or is down. Nothing is sent to anyone.
- **Safe on a shared phone:** Leave now (the door icon, or Esc three times)
  closes the app at once and wipes unsent drafts, and the app blanks itself
  when hidden so the phone's app switcher shows nothing (best effort: some
  browsers take their preview first). Leave now does not delete browser
  history, and the app says so.
- **Made to be usable:** bigger text, easier reading, darker colours and an
  opt-in vibrate on tap; 44px tap targets, screen-reader names on every icon,
  installable, with the pictures, saved notes and help numbers working
  offline (translation and the listening chat need the network).
- **Never behind the child's back:** no monitoring, no automatic alerts, no AI
  "friend", no diagnosis.
- **Never a guess about the child:** the app does not work out from anything
  the child does whether they are being bullied, and gives no risk score.
  Every word passed on was written by the child and confirmed by the child;
  we add nothing.

## How we built it

- **NVIDIA Nemotron on Nebius Token Factory** for every model call.
  - Fan-out: `Nemotron-3.5-Super-VL` translates a risky sentence several times
    in parallel at different temperatures, then translates each version back.
  - Judge: a *different* model, `nemotron-3-super-120b-a12b`, compares the
    candidates and the back-translations against the child's original, so it
    does not share the translator's blind spots.
  - A separate ambiguity check reads the original sentence alone and finds
    readings only the child can settle.
  - Safety check: the model only classifies; the words a child in crisis sees
    are fixed text written and source-checked by people.
- **Adaptive verification:** two cheap passes first; the full check only when
  a sentence carries risk (negation, coercion or threat wording, slang, in
  English, German, Hinglish and Devanagari), the passes disagree, or a number
  the child wrote ("3 times", "5 euros") is missing from the German. An
  unnamed actor ("they", "he") used to count too; removing it cut escalation
  from 37 to 19 of 50 English sentences and raised the score. A sentence that
  needs no verifying takes 2 calls and about 1–2 s; the full verification
  with a repair takes 15 (call counts asserted in `test_latency.py`; timings
  measured 24–25 Oct, a laptop calling Token Factory).
- **Safety, twice:** the model classifies each message, and fixed rules read
  it too. Either can raise the help prompt; the rules can never lower it.
- **Tavily:** `engine/resources.py` looks up the school psychology service for
  a German state through Tavily, restricted to one hand-checked official site
  per state for all 16 states, with results from any other host dropped in
  code; only the state name is sent, never the child's words. It is served by
  `/api/resources?state=…`; **the app's screens do not send a state yet**, so
  the help screen shows the curated list. <!-- Decided 28 Oct (Swarup): no
  state picker for the submission; the lookup stays backend-only, as written. -->
- **Privacy:** Nebius Zero Data Retention is on, so prompts and outputs are not
  stored. Our backend keeps nothing and logs no message text. The timeline,
  the PIN (as a salted hash), unsent drafts and the meanings a child picked
  live only in the child's browser, and "Delete everything" removes them.
  Translation is cloud inference: the words being translated do leave the
  phone, and the app does not pretend otherwise.
- **Stack:** React + Vite + TypeScript + Tailwind, FastAPI, Python.
- **Benchmark:** `eval/run_eval.py` compares a single translation with our
  pipeline on 50 English and 30 Hindi sentences drafted by the team with
  Claude's help (native-speaker review pending, so preliminary), scored against a
  team-written answer key with plain string matching, so no model grades
  another model. Results: **level: 76/80 and 77/80**, a margin too small
  on 80 sentences to claim. What the extra
  calls buy is the sentences where the child's own words carried
  two meanings: a single pass picked one silently, ours asked the child.
  0 missed crises on the safety set. Measured 24–25 Oct; the 28 Oct triage
  change sends more Hindi sentences to the full check, and the eval has not
  been re-run since.
  <!-- NOT FINAL. Before this goes public: (1) the Hindi review must be done,
  so "reviewed by native speakers" is true; (2) the scores and the number of
  sentences where the app asked come from the new eval run. The old "8 of 80"
  was undercounted, and #52 found the real figure is 11, so no count is given
  until the re-run. -->


## Challenges we ran into

- **Agreement is not correctness.** On Nemotron 3.5 Lightning, all five
  passes agreed that "my friend hits me" meant "Mein Freund trifft mich"
  (meets me). Only comparing the back-translation with the original caught
  it, so we added a repair step and cap confidence whenever a repair runs.
  Being honest about our own evidence: after we moved to Super-VL for other
  reasons, that sentence is translated correctly by a single pass 5 times out
  of 5, so we can no longer demonstrate the failure we built the step for. We
  kept it because the failure is silent when it does happen.
- **Our verification does not beat a single pass on overall accuracy.** On
  our own benchmark the two draw. What the extra calls buy is specific: when
  the child's own words carry two meanings, the app asks them instead of
  guessing. A single pass silently picks one.
- **The fastest model failed our languages.** Nemotron 3.5 Lightning won the
  English bake-off, then returned Ukrainian input untranslated in 5 of 12
  runs. We switched the fan-out model and now reject any output that echoes
  the input.
- **We couldn't trust machine-made test data.** 17 of 18 sentences we
  pivoted through another language had already lost the meaning before our
  pipeline saw them. So we only ship and measure languages our team reads, and
  wrote the test sets ourselves.
- **False alarms are not free.** A crisis screen for "my mum will kill me when
  she sees my marks" teaches a child the app doesn't understand them. We test
  that everyday exaggerations stay silent.
- **Help must not depend on the model.** An automated walk through the app
  found that with the model off, "he said he would kill me after school" got
  no help prompt at all. Now fixed rules, held to the same "must not fire"
  list as the model, read every message beside it: they can raise help but
  never lower it, and the help numbers are built into the app so they show
  offline.
- **Our triage only spoke English.** The markers that send a sentence to full
  verification were English words, so 0 of our 30 Hindi test sentences were
  ever fully checked. With German, Hinglish and Devanagari markers it is 11
  of 30.

## Accomplishments that we're proud of

- The app never asks a child to fix our mistakes. A translation error is ours
  to repair silently; only real two-meaning sentences go to the child.
- Every contact, every adult-guide step and every school site has a source and
  a check date, and the help screen says which language each line speaks.
- A child can go from a feeling to a German card they hold up in about a
  minute, by tapping pictures, without writing a word and without a single
  model call.
- On 80 team-drafted sentences (preliminary, native review pending), a
  single pass kept the meaning in 76, ours in 77 and 75 in two runs a day
  apart: level. The difference is that ours asks the child when their words
  carry two meanings, instead of guessing.

## What we learned

- Measure before trusting a model's name: our model choice changed twice
  because of measurements.
- For safety-critical text, a second model only helps if it doesn't share the
  first model's blind spots.
- Being honest about limits (translation does leave the phone; quick exit
  can't erase browser history) is part of the product, not a footnote.

## What's next

- More languages, each only after native speakers write and check its test
  set. The architecture is language-independent.
- Review of the guide and flows by school social workers.
- A native read of every Hindi and Hinglish line (issue #130).
- The local school psychology service on the help screen: the Tavily lookup
  is built; the screen that asks for the child's state is not.
- An encrypted, expiring share link for the trusted adult, and a printable
  report.

## Built with

`nvidia-nemotron` · `nebius-token-factory` · `tavily` · `python` · `fastapi` ·
`react` · `typescript` · `vite` · `tailwind`

## Links

- Demo: **https://vividia-swarupgaikwad1801-ux.vercel.app** (no account, no
  API key; the free server can take about 30 s to wake on the first screen)
- Video: **[TBD: YouTube URL]**
- Code: https://github.com/swarupgaikwad1801-ux/vividia (MIT)

## Feedback for Nebius and NVIDIA

Paste from `FEEDBACK.md` (Most Valuable Feedback prize).

## Submission checklist

- [ ] App name everywhere
- [ ] Every [TBD] filled or cut
- [ ] Demo URL works logged out, on a phone, without a key
- [ ] The same demo URL in README, Devpost and the video
- [ ] Daily spending cap (`DEMO_DAILY_USD_CAP`) raised for the judging days,
      then the site checked in a private window on a phone
- [x] Tavily: every doc says it is backend-only (no picker, decided 28 Oct)
- [ ] Video public, ≤ 3:00
- [ ] MIT licence visible in the repo's About box
- [ ] README says where Nemotron, Token Factory and Tavily are used
- [ ] Track: Best Apps and Agents
- [ ] Feedback section filled

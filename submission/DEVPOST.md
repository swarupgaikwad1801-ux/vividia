# Devpost draft

Neel owns this file. **Draft, 24 Oct 2026.** Paste section by section into the
Devpost form. Rules: every claim must be true of the shipped demo, every
number comes from `eval/results/` or `CLAUDE.md`, and **[TBD]** marks what is
filled in after the live eval or cut. App name: **Vividia**. Always write it as "Vividia, powered by NVIDIA Nemotron" at least once per section a judge reads first; no NVIDIA logo or brand colours.

**Track:** Best Apps and Agents

**Tagline (≤ 200 chars):**
> Helps children who can't speak up about bullying put it into words in their own language, checks every translation with NVIDIA Nemotron, and asks the child when meaning is unclear.

*(After the eval run, consider: "Kept the meaning in [TBD]% of sentences where a single translation kept [TBD]%.")*

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

- **Check-in without words:** the child starts with an emoji.
- **Write in your own language:** English or Hindi (including Hinglish, the
  way kids actually type). A German version appears side by side.
- **Also for a child who already writes German:** we don't translate for
  them. Their words stay exactly as they wrote them, and the app still asks
  when something could mean two things.
- **Asks instead of guessing:** when a sentence has two honest readings
  ("he said he would get me after school": a threat or a lift home?), the app
  asks the child, and always offers "something else".
- **A timeline the child approves:** every entry, word by word, in both
  languages.
- **The child chooses who hears it:** one trusted adult gets the child's words
  in German plus a short, sourced guide on how to respond. If the child says
  it happens at home, the app never suggests family members.
- **Help on every screen:** 116 111, krisenchat and 110/112, verified against
  official sources, plus the local school psychology service found live with
  Tavily, only from official state sites. These services answer in German
  (krisenchat also in Ukrainian), none confirms Hindi or English, and the app
  prints each service's languages on screen so a child is not surprised.
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
  a sentence carries risk (negation, coercion or threat wording, slang) or the
  passes disagree. An unnamed actor ("they", "he") used to count too; removing
  it cut escalation from 37 to 19 of 50 English sentences and raised the score. Measured: a safe sentence takes 2 calls and about 0.34 s; a
  sentence needing full verification and repair takes 15 calls and about 3 s.
- **Tavily** finds the school psychology service for the child's state,
  restricted to one hand-checked official site per state for all 16 states.
  Only the state name is sent, never the child's words.
- **Privacy:** Nebius Zero Data Retention is on, so prompts and outputs are not
  stored. Our backend keeps nothing and logs no message text. The timeline
  lives only in the child's browser.
- **Stack:** React + Vite + TypeScript + Tailwind, FastAPI, Python.
- **Benchmark:** `eval/run_eval.py` compares a single translation with our
  pipeline on 50 English and 30 Hindi sentences drafted by the team with
  Claude's help and reviewed by native speakers, scored against a
  team-written answer key with plain string matching, so no model grades
  another model. Results: **level: 76/80 and 77/80**, a margin too small
  on 80 sentences to claim. What the extra
  calls buy is the sentences where the child's own words carried
  two meanings: a single pass picked one silently, ours asked the child.
  0 missed crises on the safety set.
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

## Accomplishments that we're proud of

- The app never asks a child to fix our mistakes. A translation error is ours
  to repair silently; only real two-meaning sentences go to the child.
- Every contact, every adult-guide step and every school site has a source and
  a check date.
- [TBD: the headline benchmark result.]

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
- An encrypted, expiring share link for the trusted adult, and a printable
  report.

## Built with

`nvidia-nemotron` · `nebius-token-factory` · `tavily` · `python` · `fastapi` ·
`react` · `typescript` · `vite` · `tailwind`

## Links

- Demo: **[TBD: live URL]** (works without an API key; "Try the demo story"
  button)
- Video: **[TBD: YouTube URL]**
- Code: https://github.com/swarupgaikwad1801-ux/vividia (MIT)

## Feedback for Nebius and NVIDIA

Paste from `FEEDBACK.md` (Most Valuable Feedback prize).

## Submission checklist

- [ ] App name everywhere
- [ ] Every [TBD] filled or cut
- [ ] Demo URL works logged out, on a phone, without a key
- [ ] Video public, ≤ 3:00
- [ ] MIT licence visible in the repo's About box
- [ ] README says where Nemotron, Token Factory and Tavily are used
- [ ] Track: Best Apps and Agents
- [ ] Feedback section filled

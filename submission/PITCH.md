# Pitch story

Neel owns this file. **24 Oct 2026.** Everything we want to say to judges, in
one place, with the evidence behind each line. Use it for the video, the
Devpost text, the README and any live Q&A.

**Rule:** a line marked ⚠️ or ❌ is never said as a claim. Before recording,
re-check every ✅ against the latest `eval/results/` and `CLAUDE.md`, because
the numbers below will move when the engine changes.

Evidence key: ✅ measured and reproducible · ⚠️ observed once or needs a
re-run · ❌ do not claim

---

## The one-sentence pitch

> **Vividia, powered by NVIDIA Nemotron, helps a child who can't say it in
> German put bullying into words, and when their words could mean two things,
> it asks them instead of guessing.**

Name rule: always "Vividia, powered by NVIDIA Nemotron". No NVIDIA logo or
brand colours.

## The story in 30 seconds

1. **The problem.** Some children never tell anyone they are being bullied.
   They freeze, they don't have the words, or they have just arrived in
   Germany and don't speak German yet.
2. **Why translation alone is dangerous.** A single wrong word changes what
   happened. "He said he would get me after school" is a threat or a lift
   home. A translator silently picks one. The adult then acts on a guess.
3. **What Vividia does differently.** It checks every risky sentence with
   several Nemotron passes and a second model, and when the child's own words
   carry two meanings it **asks the child**. The child decides what they
   meant, and who sees it.
4. **The child stays in control.** Nothing is ever sent behind their back.
   The adult reads only the words the child approved, plus a short sourced
   guide on how to respond.

**The strongest "why" (say it, with sources):** Germany's help for children is
German-only. Nummer gegen Kummer (116 111) is German; krisenchat is German and
Ukrainian; neither confirms Hindi or English counselling (`content/helplines.json`,
checked 24 Oct). A child without German is locked out of the very services
built for them. Vividia gives that child German words they wrote and approved
themselves, to show a person who can help. Say this as a fact with the
sources, not as a complaint about those services.

## The hero

**Amara, 11** (fictional, and the screen says so). Moved to Germany from
Lagos three months ago, speaks English, is learning German, goes to a school
in Bavaria. Five approved entries escalate from laughing at her name to money
taken under coercion. The judge sends her last sentence themselves: *"He said
he would get me after school."*

Hindi is our **proof**, not our topic: we test in the two languages our team
reads natively, so every result is checked by people who understand it.

## The moments that land (show, don't tell)

| Moment | What happens | Evidence |
|---|---|---|
| **"He said he would get me after school."** | A single pass returns "abholen" (pick up) with no question. Vividia asks: threat, lift home, or something else? | ✅ reproducible (`CLAUDE.md`, video script claims table) |
| **"dekh lunga"** (Hindi) | Literally "I'll see", actually "I'll get you". Our own judge once turned it into "I'll show him" and flipped who threatened whom; we caught it and added a direction check. | ✅ the fix; tell it as a lesson learned, not as a rival's failure |
| **"chhutti ke baad chaaku leke aayega"** | "chhutti" is the end of the school day *or* the holidays: a knife threat for tomorrow or for weeks away. Both strategies once missed it; a reviewed word list now makes the app ask. | ✅ the miss and the fix are recorded in the eval history |
| **"kal"** | One Hindi word for both tomorrow and yesterday. | ✅ in `content/ambiguous_words.json` |
| **"they roasted me"** | Slang for being mocked. At the highest randomness setting one pass wrote "verbrannt" (burned); we capped it. | ⚠️ measured 1 in 3 runs; say "can happen", not a rate |
| **"They always leave me out"** | One quick pass wrote "lassen mich aus" (skip me), losing the deliberate exclusion. | ⚠️ seen once in a 5-sentence run; not reproduced on the full set |
| **"my mum will kill me when she sees my marks"** | The safety check stays silent: everyday exaggeration is not a crisis. | ✅ safety regression tests |

## Numbers (latest runs, 24 Oct): ⚠️ not yet publishable

**Gate from `CLAUDE.md`:** no benchmark number goes in the README, Devpost or
video until a native speaker has reviewed every test sentence (Hindi: two
independent reviews in `hi_core.json` `_review`). The sets were drafted with
Claude's help. Until the gate passes, these numbers are for the team only.

| | Quick: one translation | Vividia: careful |
|---|---|---|
| English, meaning kept (50) | 48/50 | 48/50 |
| Hindi, meaning kept (30) | 28/30 | 28/30 |
| Asked the child (EN / HI) | 0 / 0 | 3 / 5 |
| Average model calls | ~1 | ~12 (EN), ~10 (HI) |
| Average time per sentence | ~2.4 s (EN) | ~12 s (EN), ~7 s (HI) |

- **Together:** 76/80 for both. Vividia asked the child on **8 of 80**
  sentences, where their own words carried two meanings; a single pass
  picked one silently. That is the product: the child keeps authorship of
  their own account.
- **Safety check:** 0 missed crises on both sets; 2 false alarms on each.
- **Tests:** 160+ automated tests run on every change, without spending a cent.
- **Local help:** the school psychology service for all 16 German states, found
  live with Tavily and only from each state's official site.

How to say it honestly:

> "On our benchmark a single translation already does well, and Vividia
> matches it. Vividia isn't there to be more accurate on average. It's there
> for the dangerous cases, where it asks the child instead of guessing."

## What we never claim ❌

- ❌ "More accurate than a single translation." It draws.
- ❌ "Five passes agreed 'my friend hits me' meant 'meets me'", or "one pass
  turned 'they made me give them my money' into 'they gave me money'." Both
  were real on an older model; on the shipped one a single pass is right 5
  out of 5.
- ❌ Any benchmark number before the native-review gate above has passed.
- ❌ "Test sentences written by people." They were drafted with Claude and are
  being reviewed by native speakers.
- ❌ "Runs in the EU." Public Token Factory endpoints are region "Global". Say
  "nothing is retained" (Zero Data Retention is on).
- ❌ "Data never leaves the phone." The text goes to Nebius to be translated;
  the timeline stays only in the browser.
- ❌ Any quality claim for Arabic, Ukrainian, Turkish or other languages.
- ❌ Any real child, real incident, or partnership with 116 111 or krisenchat.
- ❌ "Certified", "GDPR compliant", "keeps children safe".

## Why judges should care (map to the four criteria)

- **Technical implementation:** different Nemotron models for different jobs
  (Super-VL translates, Super judges, so the judge doesn't share the
  translator's blind spots); back-translation and repair; a separate
  ambiguity check; strict JSON outputs; recorded-response tests in CI; a
  spending cap; Zero Data Retention.
- **Design:** one-click demo, no API key; the child approves every word; a
  "Need help now?" button on every screen.
- **Potential impact:** children who can't speak up in German; help routed to
  real, verified services (116 111, krisenchat, 110/112, the state's school
  psychology service).
- **Quality of the idea:** the app never guesses what a child meant, and never
  asks a child to fix our own mistakes: translation errors are repaired
  silently, and only genuine two-meaning sentences go to the child.

## Lessons we can tell (they make us credible)

- **Measure before trusting a model's name.** Our model choice changed twice
  because of measurements; the fastest model returned Ukrainian input
  untranslated in 5 of 12 runs.
- **Agreement is not correctness**, and we retired our best example the moment
  it stopped reproducing.
- **Machine-made test data lies.** 17 of 18 sentences pivoted through another
  language had lost the meaning before our pipeline saw them, so we only test
  in languages we read.
- **An answer key needs reviewing like the system it scores.** German separable
  verbs broke our checks twice.

## Open before recording

- [ ] Re-run both benchmarks after the next engine change and update the table
- [ ] Native Hindi review of `hi_core.json` and `content/ambiguous_words.json`
- [ ] `/api/clarify` fix (#21) merged, so the live app really applies the
      child's answer the way the benchmark assumes
- [ ] Average time per sentence back under the 10 s budget for a live demo

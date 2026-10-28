# Video script and storyboard (≤ 3:00)

Neel owns this file. **Draft, 24 Oct 2026; beats 2, 5 and 8 and the shot list
updated 28 Oct** to the app on `main` that day.

**Status, 28 Oct:** a 66 s explainer without voice-over is cut, built from
this script and the live app (`C:\Users\neels\Videos\vividia-explainer\`, not
in the repo). It follows beats 1, 2, 5, 6 and 8, plus the calm tools, the
danger pop-up and the PIN.
Beat 3 is shown as a labelled illustration, because filming the real
question costs one live model call (Neel to approve). This 3:00 script with
voice-over is still the plan for the YouTube submission.

Rules for the video
(`CLAUDE.md`, honesty rules):

- Every number on screen comes from `eval/results/` or the measurements in
  `CLAUDE.md`. Anything marked **[TBD]** is filled in after the live eval run,
  or cut. Never estimate a number on camera.
- No real children, no real incident. Amara is fictional and the screen says
  so the first time she appears.
- No copyrighted music. Use silence or a royalty-free track whose licence we
  keep a link to.
- English captions burned in throughout; German shown on screen is always
  subtitled in English.
- The app is called **Vividia**. Say "Vividia, powered by NVIDIA Nemotron" at least once, and use no NVIDIA logo or brand colours (the name is our own; the models are NVIDIA's).
- **Open decision:** `CLAUDE.md` says the demo child is Hindi-speaking; Neel's
  decision (#1) made English the main language. This script uses English
  Amara for the main flow and shows Hinglish in beat 4. Confirm before
  recording.

Total: 2:55, leaving 5 s of margin.

| # | Time | On screen | Voice-over (spoken) |
|---|------|-----------|---------------------|
| 1 | 0:00–0:15 | Black screen, white text appears line by line: "Amara is 11. She moved to Germany three months ago. She speaks English. Her school speaks German." Small label: *Amara is a made-up example.* | "Some children don't tell anyone they're being bullied. Not because they won't, but because they can't. They freeze, or they don't have the words, or they don't speak the language yet." |
| 2 | 0:15–0:30 | Phone in hand. App opens on "How are you today?". Amara taps Sad; the app answers "We're sorry you feel sad." and offers Tap pictures or Write it my way (and, if she wants, "Need a moment first?": the breathing bubble). | "Vividia helps a child put it into words, in their own language, and decide who hears it. No words needed to start." |
| 3 | 0:30–1:05 | Writing screen. She types: *"He said he would get me after school."* A live counter shows the checks running. The app pauses and asks: *"When you said 'get me', did you mean someone would come to hurt you, pick you up, or something else?"* She taps the first option. German appears side by side, subtitled. | "Her words could mean two very different things. A threat, or a lift home. A translator would guess. Ours doesn't. When a sentence has two honest readings, it asks the child, and it always offers 'something else'." |
| 4 | 1:05–1:20 | Split screen. Left: a Hinglish line typed fast, *"usne bola chhutti ke baad dekh lunga"*. Right: German output, subtitled "He said he'll get me after school". | "It works the same way in Hindi, including the Hinglish kids actually type. 'Dekh lunga' is a threat, not 'I'll see'. And a child who already writes German keeps their own words, untouched. We just ask." (Tight for 15 s: if the cut runs long, drop the German sentence here and keep it on Devpost.) |
| 5 | 1:20–1:45 | The picture path: she taps Called me names and Took my things, then where, who and how often. "Is this right? This is what the card will say." She taps Yes, save it. *Who do you want to show this to?* She picks one adult. The card she holds up flips from English to Auf Deutsch; "For the grown-up: what to do first" opens the sourced guide. | "Every entry is hers to check, word by word, before it is saved. She chooses one adult. They get her words in German and a short guide on how to respond. Nothing is ever sent behind her back." |
| 6 | 1:45–2:20 | Simple animated diagram: child's sentence → five Nemotron 3.5 Super-VL translations in parallel → back-translation → a different Nemotron 3 Super model as judge → repair → question to the child. Then a card: *"He said he would get me after school." A single pass picks one meaning. We ask.* | "Under the hood, every risky sentence is translated five times by Nemotron on Nebius Token Factory, translated back, and checked by a different Nemotron model, so it doesn't share the translator's blind spots. 'He said he would get me after school' is a threat, or a lift home. A single pass quietly picks one. We ask Amara, and her answer decides the German." |
| 7 | 2:20–2:40 | Benchmark card: *Meaning kept, single pass vs ours: [TBD] / [TBD] on 50 English and 30 Hindi sentences we wrote and checked by hand.* Below: *A sentence that needs no checking: 2 calls, about 1–2 s. Full verification with a repair: 13 calls.* (README "What it costs"; call counts asserted in `test_latency.py`.) | "We measured it on sentences we wrote ourselves, scored by matching words against an answer key we wrote, not by asking a model to grade a model. Safe sentences stay cheap. Only risky ones get the full check." |
| 8 | 2:40–2:55 | The red headphones at the top, then the help screen: 110, 112, 116 111 and krisenchat, each with its hours, "Speaks German only" and its check date. A tap on "Threatened me" opens the danger pop-up with 110/112 at once. The door icon: Leave now. Final card: *Our server keeps nothing the child writes. Zero Data Retention on Nebius. Vividia.* | "Help is one tap away on every screen, and it says which language each line speaks. If something sounds dangerous, the emergency numbers come first, even if the model is down. Our server keeps nothing the child writes. Their words, their story, their choice." |

## Shot list for recording

1. Screen recording on a real Android phone at 360 px width, on
   https://vividia-swarupgaikwad1801-ux.vercel.app (the README's URL), in a
   private window so it starts clean. (The one-click demo story was removed
   on 27 Oct, #113.)
2. Don't claim the live Tavily lookup on screen: no screen sends a state yet.
   If the state picker ships, film it in beat 8.
3. Beat 3 must be live: type the sentence on camera so judges see the
   question appear for real. Record two takes in case of latency. Each take
   is a paid model call: ask Neel first.
4. Beat 6 diagram: export from `SAFETY.md`'s data-flow diagram style, same
   colours as the app.
5. Beat 7: screenshot of the real `eval/run_eval.py` markdown table, not a
   retyped one.

## Before uploading

- [ ] Every **[TBD]** replaced with a real number or the line cut
- [ ] App name filled in
- [ ] Runtime ≤ 3:00 on YouTube's own counter
- [ ] Public, not unlisted; link pasted into Devpost
- [ ] Music licence link saved in this file


## Claims this script makes, and what backs each one

Checked 24 Oct 2026. If a line here cannot be demonstrated live, it does not
go in the video.

| Claim | Evidence |
|---|---|
| "A single pass picks one meaning, we ask" | Reproducible: baseline returns "holen/abholen" with no question; ours asks. |
| Call counts and timings | `eval/run_eval.py` output, recorded per run. |
| "Scored against an answer key we wrote" | `eval/testset/*.json`, string matching, no model grading a model. |
| Safety examples | `backend/tests/test_safety.py`, 0 missed crises on our set. |
| "A child who writes German keeps their own words" | `backend/tests/test_same_language.py`: German in, the same text out, character for character; only the ambiguity check runs. |

**Deliberately not claimed any more:** that five passes agreed "my friend
hits me" meant "meets me". It happened on Nemotron 3.5 Lightning and is in
our history, but on Super-VL a single pass gets it right 5 times in 5. A
judge who tries it would see us overstating, so it is out of the video.

**Also not claimed:** that our verification is more accurate overall. On our
benchmark it draws with a single pass. The video says what the extra calls
actually buy, which is the question to the child.

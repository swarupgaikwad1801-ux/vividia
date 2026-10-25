# Video script and storyboard (≤ 3:00)

Neel owns this file. **Draft, 24 Oct 2026.** Rules for the video
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
| 2 | 0:15–0:30 | Phone in hand. App opens on the emoji check-in. Amara taps 😟. | "Vividia helps a child put it into words, in their own language, and decide who hears it." |
| 3 | 0:30–1:05 | Writing screen. She types: *"He said he would get me after school."* A live counter shows the checks running. The app pauses and asks: *"When you said 'get me', did you mean someone would come to hurt you, pick you up, or something else?"* She taps the first option. German appears side by side, subtitled. | "Her words could mean two very different things. A threat, or a lift home. A translator would guess. Ours doesn't. When a sentence has two honest readings, it asks the child, and it always offers 'something else'." |
| 4 | 1:05–1:20 | Split screen. Left: a Hinglish line typed fast, *"usne bola chhutti ke baad dekh lunga"*. Right: German output, subtitled "He said he'll get me after school". | "It works the same way in Hindi, including the Hinglish kids actually type. 'Dekh lunga' is a threat, not 'I'll see'." |
| 5 | 1:20–1:45 | Timeline of five entries, then the report screen. Her finger approves each line. Then the handoff screen: *Where does this happen?* → School → she picks the school social worker. The adult's card shows the 5-minute guide in German. | "Every entry becomes a timeline she approves word by word. She chooses one adult. They get her words in German and a short guide on how to respond. Nothing is ever sent behind her back." |
| 6 | 1:45–2:20 | Simple animated diagram: child's sentence → five Nemotron 3.5 Super-VL translations in parallel → back-translation → a different Nemotron 3 Super model as judge → repair → question to the child. Then a card: *"He said he would get me after school." A single pass picks one meaning. We ask.* | "Under the hood, every risky sentence is translated five times by Nemotron on Nebius Token Factory, translated back, and checked by a different Nemotron model, so it doesn't share the translator's blind spots. 'He said he would get me after school' is a threat, or a lift home. A single pass quietly picks one. We ask Amara, and her answer decides the German." |
| 7 | 2:20–2:40 | Benchmark card: *Meaning kept, single pass vs ours: [TBD] / [TBD] on 50 English and 30 Hindi sentences we wrote and checked by hand.* Below: *A safe sentence: 2 calls, ~0.3 s. A risky one: 15 calls, ~3 s.* | "We measured it on sentences we wrote ourselves, scored by matching words against an answer key we wrote, not by asking a model to grade a model. Safe sentences stay cheap. Only risky ones get the full check." |
| 8 | 2:40–2:55 | The "Need help now?" button, then the help screen with 116 111, krisenchat and the local school psychology service found live with Tavily, each with its source and date. Final card: *Nothing about the child is stored. Zero Data Retention on Nebius. Vividia.* | "Help is one tap away on every screen. Local support is looked up live, only from official sites. Nothing the child writes is kept. Their words, their story, their choice." |

## Shot list for recording

1. Screen recording on a real Android phone at 360 px width (Vernika's build),
   clean demo data loaded via the one-click demo button.
2. Beat 3 must be live: type the sentence on camera so judges see the
   question appear for real. Record two takes in case of latency.
3. Beat 6 diagram: export from `SAFETY.md`'s data-flow diagram style, same
   colours as the app.
4. Beat 7: screenshot of the real `eval/run_eval.py` markdown table, not a
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

**Deliberately not claimed any more:** that five passes agreed "my friend
hits me" meant "meets me". It happened on Nemotron 3.5 Lightning and is in
our history, but on Super-VL a single pass gets it right 5 times in 5. A
judge who tries it would see us overstating, so it is out of the video.

**Also not claimed:** that our verification is more accurate overall. On our
benchmark it draws with a single pass. The video says what the extra calls
actually buy, which is the question to the child.

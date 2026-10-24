# vividia

A submission to the [Nebius x NVIDIA Global AI Hackathon](https://nebiusglobalaihackathon.devpost.com/),
track **Best Apps and Agents**.

> **Status:** in development (24–30 Oct 2026). Sections marked _TBD_ are
> filled in as features land; nothing is claimed here before it works.

## Why this exists

Some children never tell anyone they are being bullied. They freeze, they
don't have the words, or they have just arrived in Germany and don't speak
German yet. When they do try, the translation often comes from a classmate or
an app that guesses, and one wrong word changes everything: "my friend hits
me" read as "my friend meets me" is the difference between help and no help.

## What it does

A child checks in without words, writes in their own language, and sees a
German version that has been checked by several independent Nemotron passes.
When a sentence has two honest readings ("he said he would get me after
school": a threat or a lift home?), the app asks the child instead of
guessing, and always offers "something else". The child builds a timeline
they approve word by word, and chooses whether to show it to one trusted
adult, who also gets a short, sourced guide on how to respond.

**The child's words. The child's story. The child's choice.**

- Nothing is ever shared automatically. No monitoring, no automatic alerts,
  no AI "friend", no diagnosis.
- If the child says it happens at home, the app never suggests family members
  as the trusted adult.
- "Need help now?" is on every screen: 116 111, krisenchat and 110/112, each
  checked against its official source, plus the school psychology service in
  the child's state, looked up live and only from that state's official site.

It is a communication tool. It does not diagnose, decide whether an
allegation is true, counsel, or replace a safeguarding professional. It is a
hackathon research prototype.

### Languages

**English and Hindi (including Hinglish), into German.** We only ship and
measure languages our team can read: machine-made test data in other
languages had already lost the meaning in 17 of 18 cases, so we make no
quality claim for them. The architecture itself is language-independent.

### How your data is handled

Translation runs on Nebius, so **the text a child writes does leave the
device**. We will not pretend otherwise. What we do:

- The timeline is kept only in the child's own browser, and can be deleted.
- Our backend stores no disclosure and logs no message content.
- Nebius Zero Data Retention is enabled on our account: prompts and outputs
  are not stored after processing, and are never used to train any model.
- Quick exit leaves the page. It does not, and cannot, erase browser history.

Who could misuse the app or the phone, what we do about it, and our known
limitations are in [SAFETY.md](SAFETY.md).

## How it uses Nebius and NVIDIA

- **NVIDIA Nemotron:** Nemotron Nano produces several independent
  translations and back-translations of each message; a larger Nemotron model
  judges them and flags phrases whose meaning is uncertain, which the child
  then confirms. _Model IDs and measured results: TBD._
- **Nebius Token Factory:** every model call at runtime goes through it.
- **Other Nebius services:** _TBD (Serverless hosting being evaluated)._
- **Tavily:** live lookup of current helpline and support information,
  restricted to a whitelist of trusted sites.

## Setup (engine)

Requires Python 3.11+.

```bash
cd backend
py -m venv .venv
.venv\Scripts\activate          # macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
```

Copy `.env.example` (repo root) to `.env` and fill it in from the Nebius
Token Factory console. Then, from `backend/`:

```bash
python -m engine.smoke_test --list-models   # which model IDs your key can use
python -m engine.smoke_test                 # one Nemotron call
```

## Demo

- Live demo: _TBD_. No API key needed: press **"Try the demo story"** to load
  Amara's timeline, then send the prefilled sentence and watch the app ask
  what she meant. Amara is a made-up example; no real child is shown.
- Video: _TBD_
- Benchmark: 50 English and 30 Hindi sentences written by people, scored
  against a human answer key with `eval/run_eval.py`. Results: _TBD_.

## Team

- Swarup Gaikwad
- Vernika Sharma
- Neel Shah

## License

MIT — see [LICENSE](LICENSE).

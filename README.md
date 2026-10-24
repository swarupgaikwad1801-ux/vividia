# vividia

A submission to the [Nebius x NVIDIA Global AI Hackathon](https://nebiusglobalaihackathon.devpost.com/),
track **Best Apps and Agents**.

> **Status:** in development (24–30 Oct 2026). Sections marked _TBD_ are
> filled in as features land; nothing is claimed here before it works.

## What it does

An app for children who can't speak up about bullying or harm: because they
freeze, don't have the words, or don't speak German yet. A child checks in
without words, writes in their own language, sees a German version that has
been checked by several independent model passes, answers a short question
when the passes disagree about what they meant, builds a timeline they
approve, and chooses whether to show it to one trusted adult.

**The child's words. The child's story. The child's choice.**

Nothing is ever shared automatically.

It is a communication tool. It does not diagnose, decide whether an
allegation is true, counsel, or replace a safeguarding professional. It is a
hackathon research prototype.

### How your data is handled

Translation runs on Nebius, so **the text a child writes does leave the
device**. We will not pretend otherwise. What we do:

- The timeline is kept only in the child's own browser, and can be deleted.
- Our backend stores no disclosure and logs no message content.
- Nebius Zero Data Retention is enabled on our account: prompts and outputs
  are not stored after processing, and are never used to train any model.
- Quick exit leaves the page. It does not, and cannot, erase browser history.

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

- Live demo: _TBD_
- Video: _TBD_

## Team

- Swarup Gaikwad
- Vernika Sharma
- Neel Shah

## License

MIT — see [LICENSE](LICENSE).

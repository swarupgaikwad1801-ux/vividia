"""Capture a real transcript from Token Factory, to replace a hand-authored one.

Every fixture in tests/fixtures/ is currently `_provenance: "hand-authored"`:
a person wrote the model answers to reproduce a behaviour observed and written
down in CLAUDE.md. That is honest and it tests our logic, but the answers are
not literally what the API returned, and the token counts are filler.

This script makes the real thing. It runs the pipeline against the live API,
records every call, and writes a transcript marked `"captured"` whose token
counts are the counts Nebius actually billed.

It SPENDS CREDIT and is never run by CI or by the test suite. pytest does not
collect it (the filename is not test_*.py). Agree the spend with the team
first: a full verification is 15 calls, roughly $0.0012 at Super-VL prices.

    cd backend
    .venv/Scripts/python tests/record_fixtures.py --list
    .venv/Scripts/python tests/record_fixtures.py hits_trifft_repair

The recorded answers are whatever the model says on the day, so a capture can
legitimately fail to reproduce the behaviour its test expects: a run where the
repair never fires is a real finding about the model, not a broken script. The
script says so rather than editing the answers to fit, and the old fixture is
left in place unless --write is passed.
"""

import argparse
import asyncio
import json
import sys
from pathlib import Path

BACKEND = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND))

from engine import client as engine_client  # noqa: E402
from engine.safety import safety_check  # noqa: E402
from engine.translate import ADAPTIVE, BASELINE, translate  # noqa: E402

sys.path.insert(0, str(Path(__file__).resolve().parent))
import recorded  # noqa: E402

FIXTURES = Path(__file__).resolve().parent / "fixtures"


class _Recorder:
    """Wraps the real client and keeps every answer, keyed by pipeline step."""

    def __init__(self, inner):
        self._inner = inner
        self.answers: dict[str, list] = {}
        self.tokens: list[tuple[int, int]] = []
        self.chat = type("_Chat", (), {"completions": self})()

    async def create(self, **kwargs):
        response = await self._inner.chat.completions.create(**kwargs)
        system = next(m["content"] for m in kwargs["messages"] if m["role"] == "system")
        kind = recorded.kind_of(system)
        content = (response.choices[0].message.content or "").strip()

        # A JSON step is stored as an object so the transcript stays readable
        # and reviewable as text; recorded.py serialises it back on replay.
        try:
            answer = json.loads(content)
        except json.JSONDecodeError:
            answer = content

        self.answers.setdefault(kind, []).append(answer)
        if response.usage:
            self.tokens.append(
                (response.usage.prompt_tokens, response.usage.completion_tokens)
            )
        return response


async def capture(name: str, write: bool) -> int:
    existing = json.loads((FIXTURES / f"{name}.json").read_text(encoding="utf-8"))
    text, lang = existing["text"], existing["source_lang"]

    real_client, limiters = engine_client._state()
    recorder = _Recorder(real_client)
    engine_client._state = lambda: (recorder, limiters)  # type: ignore[assignment]

    print(f"{name}: {text!r} ({lang})")
    if name.startswith("safety_"):
        result = await safety_check(text, lang)
    else:
        strategy = BASELINE if "single_call" in name or "untranslated" in name else ADAPTIVE
        result = await translate(text, lang, strategy=strategy)

    prompts = sum(t[0] for t in recorder.tokens)
    completions = sum(t[1] for t in recorder.tokens)
    calls = len(recorder.tokens)
    print(f"  {calls} calls, {prompts} in / {completions} out")
    print(f"  steps: {', '.join(f'{k}x{len(v)}' for k, v in recorder.answers.items())}")
    print(f"  result: {json.dumps(result, ensure_ascii=False)[:300]}")

    transcript = {
        "_comment": existing.get("_comment", ""),
        "_provenance": "captured",
        "_provenance_note": (
            f"Captured from Token Factory by tests/record_fixtures.py. "
            f"{calls} calls; token counts are the ones Nebius billed."
        ),
        "scenario": existing.get("scenario", ""),
        "source_lang": lang,
        "text": text,
        # Replay serves one token count per call, so record the mean rather
        # than pretending to a per-call figure the format cannot carry.
        "tokens": {
            "prompt": round(prompts / calls) if calls else 0,
            "completion": round(completions / calls) if calls else 0,
        },
        "responses": recorder.answers,
    }

    out = FIXTURES / f"{name}.json"
    if not write:
        print(f"\n--- would write {out} (pass --write to save) ---")
        print(json.dumps(transcript, ensure_ascii=False, indent=2))
        return 0

    out.write_text(json.dumps(transcript, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"\nWrote {out}")
    print("Now re-run the test for this scenario. If it fails, the model behaved")
    print("differently today: report that, do not edit the recorded answers.")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("scenario", nargs="?", help="fixture name without .json")
    parser.add_argument("--list", action="store_true", help="show fixtures and their provenance")
    parser.add_argument("--write", action="store_true", help="overwrite the fixture file")
    args = parser.parse_args()

    if args.list or not args.scenario:
        for path in sorted(FIXTURES.glob("*.json")):
            data = json.loads(path.read_text(encoding="utf-8"))
            print(f"  {path.stem:34} {data.get('_provenance', '?')}")
        return 0

    return asyncio.run(capture(args.scenario, args.write))


if __name__ == "__main__":
    sys.exit(main())

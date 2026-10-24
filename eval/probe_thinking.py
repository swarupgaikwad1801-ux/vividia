"""Can we turn Nemotron's reasoning off?

Both candidates spend most of their output tokens thinking out loud. Nano
still lands a clean answer; Lightning never finished inside 600 tokens. Since
the fan-out makes many calls per message, reasoning tokens are our main cost
and latency driver, and Nano's 100 RPM cap leaves no room for waste.

This tries the documented switches and prints what each one does.

    backend/.venv/Scripts/python eval/probe_thinking.py
"""

import asyncio
import sys
import time
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(REPO_ROOT / "backend"))

from openai import AsyncOpenAI  # noqa: E402

from engine.config import load_settings  # noqa: E402

MODELS = {
    "nano": "nvidia/NVIDIA-Nemotron-3-Nano-30B-A3B",
    "lightning": "nvidia/Nemotron-3_5-Lightning",
}

TASK = "Translate into German, reply with the translation only: They always leave me out."

# Each variant is (name, system prompt, extra request kwargs).
VARIANTS = [
    ("plain", "You translate a child's message into German. Reply with the translation only.", {}),
    ("nvidia-off", "detailed thinking off", {}),
    ("no_think-tag", "/no_think You translate a child's message into German. Reply with the translation only.", {}),
    ("chat-template-kwargs", "You translate a child's message into German. Reply with the translation only.",
     {"extra_body": {"chat_template_kwargs": {"thinking": False}}}),
    ("reasoning-effort-none", "You translate a child's message into German. Reply with the translation only.",
     {"extra_body": {"reasoning_effort": "none"}}),
]


async def probe(client, model, name, system, extra):
    start = time.perf_counter()
    try:
        response = await client.chat.completions.create(
            model=model,
            messages=[{"role": "system", "content": system}, {"role": "user", "content": TASK}],
            temperature=0.3,
            max_tokens=400,
            **extra,
        )
    except Exception as error:  # noqa: BLE001 - we want to see which switches are rejected
        return f"  {name:<24} REJECTED: {type(error).__name__}: {str(error)[:90]}"

    elapsed = time.perf_counter() - start
    choice = response.choices[0].message
    content = (choice.content or "").strip()
    reasoning = getattr(choice, "reasoning_content", None) or ""
    tokens = response.usage.completion_tokens if response.usage else 0
    finish = response.choices[0].finish_reason
    shown = content.replace("\n", " ")[:70] or "(empty)"
    flag = "  <-- clean" if tokens < 60 and finish == "stop" else ""
    return (
        f"  {name:<24} {tokens:>4} tok  {elapsed:>5.1f}s  {finish:<8} "
        f"reasoning_field={len(reasoning):>4}  {shown}{flag}"
    )


async def main() -> int:
    settings = load_settings()
    client = AsyncOpenAI(base_url=settings.base_url, api_key=settings.api_key)
    for label, model in MODELS.items():
        print(f"\n{label}  ({model})")
        print(f"  task: {TASK}")
        for name, system, extra in VARIANTS:
            print(await probe(client, model, name, system, extra))
    return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))

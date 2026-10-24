"""Smoke test: one Nemotron call through Nebius Token Factory.

Run from the backend/ folder:
    python -m engine.smoke_test --list-models   # model IDs this key can use
    python -m engine.smoke_test                 # one call with NEMOTRON_NANO_MODEL
"""

import argparse
import sys
import time

import openai
from openai import OpenAI

from engine.config import load_settings

TEST_SENTENCE = "They took my bag again and everyone laughed at me."


def list_models(client: OpenAI) -> None:
    ids = sorted(model.id for model in client.models.list())
    for model_id in ids:
        print(model_id)
    nemotron = [model_id for model_id in ids if "nemotron" in model_id.lower()]
    print(f"\n{len(ids)} models available, {len(nemotron)} with 'nemotron' in the ID.")


def one_call(client: OpenAI, model: str) -> None:
    start = time.perf_counter()
    response = client.chat.completions.create(
        model=model,
        messages=[
            {
                "role": "user",
                "content": f"Translate into German. Reply with the translation only.\n\n{TEST_SENTENCE}",
            }
        ],
        max_tokens=300,
    )
    elapsed = time.perf_counter() - start
    print(f"model:   {response.model}")
    print(f"latency: {elapsed:.2f} s")
    if response.usage:
        print(f"tokens:  {response.usage.prompt_tokens} in, {response.usage.completion_tokens} out")
    print(f"input:   {TEST_SENTENCE}")
    print(f"reply:   {response.choices[0].message.content}")


def main() -> int:
    parser = argparse.ArgumentParser(description="One Nemotron call through Nebius Token Factory.")
    parser.add_argument("--list-models", action="store_true", help="print the model IDs this key can use")
    args = parser.parse_args()

    try:
        settings = load_settings() if args.list_models else load_settings("NEMOTRON_NANO_MODEL")
        client = OpenAI(base_url=settings.base_url, api_key=settings.api_key)
        if args.list_models:
            list_models(client)
        else:
            one_call(client, settings.nano_model)
    except RuntimeError as error:
        print(error, file=sys.stderr)
        return 1
    except openai.AuthenticationError:
        print("401: the API key was rejected. Copy it again from the console into .env.", file=sys.stderr)
        return 1
    except openai.NotFoundError:
        print("404: model ID or base URL not found. Run with --list-models and copy an exact ID.", file=sys.stderr)
        return 1
    except openai.APIConnectionError:
        print("Could not connect. Check NEBIUS_BASE_URL in .env and your internet.", file=sys.stderr)
        return 1
    except openai.APIStatusError as error:
        if error.status_code == 402:
            print("402: no usable credit. Check billing in the console (a card must be linked).", file=sys.stderr)
        else:
            print(f"{error.status_code}: {error.message}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())

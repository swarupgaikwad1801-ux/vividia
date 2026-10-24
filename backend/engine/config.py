"""Engine settings, read from the .env file at the repo root.

Values come from the Nebius Token Factory console. Never hard-code or guess
the base URL or model IDs.
"""

import os
from dataclasses import dataclass
from pathlib import Path

from dotenv import load_dotenv

REPO_ROOT = Path(__file__).resolve().parents[2]
load_dotenv(REPO_ROOT / ".env")


@dataclass(frozen=True)
class Settings:
    api_key: str
    base_url: str
    nano_model: str
    judge_model: str


def load_settings(*required: str) -> Settings:
    """Return the settings, failing loudly if a required variable is empty.

    NEBIUS_API_KEY and NEBIUS_BASE_URL are always required; pass extra
    variable names (e.g. "NEMOTRON_NANO_MODEL") to require them as well.
    """
    names = ("NEBIUS_API_KEY", "NEBIUS_BASE_URL", *required)
    missing = [name for name in names if not os.getenv(name)]
    if missing:
        raise RuntimeError(
            "Missing in .env: " + ", ".join(missing) + "\n"
            "Copy .env.example to .env at the repo root and fill it in "
            "from the Nebius Token Factory console."
        )
    return Settings(
        api_key=os.environ["NEBIUS_API_KEY"],
        base_url=os.environ["NEBIUS_BASE_URL"],
        nano_model=os.getenv("NEMOTRON_NANO_MODEL", ""),
        judge_model=os.getenv("NEMOTRON_JUDGE_MODEL", ""),
    )

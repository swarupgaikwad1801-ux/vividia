"""Engine settings, read from the .env file at the repo root.

Values come from the Nebius Token Factory console. Never hard-code or guess
the base URL or model IDs.
"""

import os
from dataclasses import dataclass
from pathlib import Path
from urllib.parse import urlsplit

from dotenv import load_dotenv

REPO_ROOT = Path(__file__).resolve().parents[2]
load_dotenv(REPO_ROOT / ".env")


@dataclass(frozen=True)
class Settings:
    api_key: str
    base_url: str
    nano_model: str
    judge_model: str


def _env(name: str) -> str:
    """An environment value without the whitespace a paste brings with it.

    A dashboard field keeps a trailing newline or space as part of the value,
    and an HTTP client then rejects the URL or the header built from it.
    """
    return os.getenv(name, "").strip()


def base_url_problem(url: str) -> str | None:
    """Why `url` cannot be the Nebius base URL, or None if it looks like one.

    On 27 Oct 2026 NEBIUS_BASE_URL on Render held a whole `curl` example from
    the Nebius console - URL, `-X 'POST'`, headers - and every translation
    failed with InvalidURL while /api/health stayed green, because health
    never calls a model. These are the shapes that mistake takes. The reasons
    are fixed sentences, never the value, so a log line or a health response
    cannot leak a key that was pasted along with the URL.
    """
    if not url:
        return "empty"
    if any(character.isspace() for character in url) or "'" in url or '"' in url:
        return "contains spaces, quotes or line breaks; paste only the URL, not a command"
    parts = urlsplit(url)
    if parts.scheme != "https" or not parts.netloc:
        return "does not start with https://"
    if parts.path.rstrip("/").endswith("/chat/completions"):
        return "ends in /chat/completions; the base URL stops at /v1/"
    return None


def load_settings(*required: str) -> Settings:
    """Return the settings, failing loudly if a required variable is empty.

    NEBIUS_API_KEY and NEBIUS_BASE_URL are always required; pass extra
    variable names (e.g. "NEMOTRON_NANO_MODEL") to require them as well.
    """
    names = ("NEBIUS_API_KEY", "NEBIUS_BASE_URL", *required)
    missing = [name for name in names if not _env(name)]
    if missing:
        raise RuntimeError(
            "Missing in .env: " + ", ".join(missing) + "\n"
            "Copy .env.example to .env at the repo root and fill it in "
            "from the Nebius Token Factory console."
        )
    problem = base_url_problem(_env("NEBIUS_BASE_URL"))
    if problem:
        raise RuntimeError(
            f"NEBIUS_BASE_URL {problem}. "
            "It should be exactly https://api.tokenfactory.nebius.com/v1/"
        )
    return Settings(
        api_key=_env("NEBIUS_API_KEY"),
        base_url=_env("NEBIUS_BASE_URL"),
        nano_model=_env("NEMOTRON_NANO_MODEL"),
        judge_model=_env("NEMOTRON_JUDGE_MODEL"),
    )

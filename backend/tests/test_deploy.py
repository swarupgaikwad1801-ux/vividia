"""The image has to contain everything the app opens at import.

This exists because of a real crash. The Dockerfile built from `backend/` and
did `COPY . .`, so `content/` was never in the image. `engine/config.py`
resolves `REPO_ROOT` two directories up and `engine/safety.py` reads
`content/safety_messages.json` while importing, so the container died on
startup with FileNotFoundError. A clone has `content/` sitting right there, so
running it locally proved nothing.

These tests read the Dockerfile as text rather than building an image, so they
run anywhere, including CI with no Docker.
"""

import re
from pathlib import Path

import pytest

from engine.config import REPO_ROOT

DOCKERFILE = REPO_ROOT / "backend" / "Dockerfile"


def dockerfile() -> str:
    return DOCKERFILE.read_text(encoding="utf-8")


def copied_sources() -> list[str]:
    """Left-hand paths of every COPY line, i.e. what comes from the host."""
    return [
        match.group(1)
        for match in re.finditer(r"^COPY\s+(\S+)", dockerfile(), re.MULTILINE)
    ]


def test_every_directory_the_engine_reads_is_copied_into_the_image():
    """`content/` is opened at import time, so leaving it out is a crash."""
    read_at_import = {"backend/", "content/"}
    copied = copied_sources()
    for needed in read_at_import:
        assert any(source.startswith(needed) for source in copied), (
            f"the Dockerfile never copies {needed}; the container will start "
            f"and then fail opening a file from it. COPY lines: {copied}"
        )


def test_the_build_context_is_the_repository_root():
    """Copying `backend/requirements.txt` only works from the repo root.

    If someone switches the host's root directory back to `backend/`, this
    build fails loudly at COPY instead of succeeding and crashing at runtime.
    """
    assert "COPY backend/requirements.txt" in dockerfile()
    assert "docker build -f backend/Dockerfile" in dockerfile(), (
        "the Dockerfile should say how to build it, since the context is not obvious"
    )


def test_workdir_leaves_repo_root_where_config_expects_it():
    """config.py does parents[2]; WORKDIR must be two deep for that to be /app."""
    workdir = re.search(r"^WORKDIR\s+(\S+)", dockerfile(), re.MULTILINE)
    assert workdir, "no WORKDIR in the Dockerfile"
    depth = len([part for part in workdir.group(1).strip("/").split("/") if part])
    assert depth == 2, (
        f"WORKDIR is {workdir.group(1)}, {depth} deep. engine/config.py resolves "
        "REPO_ROOT as parents[2], so the app must sit two directories below it."
    )


def test_no_secret_is_baked_into_the_image():
    text = dockerfile()
    for secret in ("NEBIUS_API_KEY=", "TAVILY_API_KEY="):
        assert secret not in text, f"{secret} must come from the host, not the image"


@pytest.mark.parametrize("name", ["safety_messages.json", "helplines.json", "ambiguous_words.json"])
def test_the_content_files_the_engine_opens_exist(name):
    assert (REPO_ROOT / "content" / name).is_file()

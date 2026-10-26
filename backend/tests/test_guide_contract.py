"""The adult's 5-minute guide, as a contract rather than a file dump.

`/api/guide` served `content/adult_guide.json` whole until now, which is
right while nothing is built against it and wrong the moment something is:
Vernika cannot build a handoff card against "whatever the file happens to
hold today".

So the SHAPE is pinned here and the WORDING is not. Neel edits the guide
without touching a schema; the screen keeps working. These tests fail if the
shape moves, and say nothing about what the steps say.

Offline. No model call, no key, and a test asserts exactly that.
"""

import json

import pytest
from fastapi.testclient import TestClient

from engine.config import REPO_ROOT
from main import app

client = TestClient(app)
GUIDE_FILE = REPO_ROOT / "content" / "adult_guide.json"


def get(lang: str | None = None) -> dict:
    query = f"?lang={lang}" if lang is not None else ""
    response = client.get(f"/api/guide{query}")
    assert response.status_code == 200, response.text
    return response.json()


# --- the shape the screen is built against ----------------------------------


def test_the_guide_has_every_field_the_card_needs():
    body = get("de")

    assert body["title"]
    assert body["footer"]
    assert body["checked_on"], "an adult should be able to see when a person last checked this"
    assert body["steps"], "a guide with no steps is not a guide"
    for step in body["steps"]:
        assert step["text"].strip(), "a blank step would render as an empty bullet"


@pytest.mark.parametrize("lang", ["de", "en"])
def test_both_languages_are_served_whole(lang):
    body = get(lang)

    assert body["lang"] == lang
    assert len(body["steps"]) == len(json.loads(GUIDE_FILE.read_text(encoding="utf-8"))["guide"]["steps"]), (
        "a step was dropped in one language; the adult would get a shorter "
        "guide without being told"
    )


# --- the honesty about which language came back -----------------------------


@pytest.mark.parametrize("asked", ["hi", "ar", "zz", ""])
def test_a_language_we_do_not_have_falls_back_and_says_so(asked):
    """The guide exists in de and en. Hindi is the case that matters.

    A child who writes Hindi may hand the phone to someone who reads German,
    so falling back is right - but the response has to admit it, or the
    screen sets lang="hi" on German text and a screen reader pronounces the
    whole guide as if it were Hindi.
    """
    body = get(asked)

    assert body["lang"] == "de", f"asked for {asked!r}, served {body['lang']!r}"
    assert body["steps"], "a fallback that returns nothing is not a fallback"


def test_the_default_is_german():
    """The adult the child chooses is, in this deployment, usually a teacher
    in a German school."""
    assert get()["lang"] == "de"


# --- sources -----------------------------------------------------------------


def test_every_step_that_cites_a_source_carries_its_url():
    """Resolved server-side so the card need not carry the `sources` map."""
    raw = json.loads(GUIDE_FILE.read_text(encoding="utf-8"))
    sources = raw["sources"]
    cited = [step for step in raw["guide"]["steps"] if step.get("source")]
    assert cited, "the guide cites nothing at all; this test would pass vacuously"

    served = get("en")["steps"]
    urls = [step["source_url"] for step in served if step["source_url"]]

    assert len(urls) == len(cited), "a step lost its source on the way out"
    for url in urls:
        assert url in sources.values(), f"{url} is not one of the file's own sources"
        assert url.startswith("https://"), "a source an adult may open must be https"


def test_a_step_with_no_source_is_null_not_an_empty_string():
    """An absent source must read as "this step cites nothing", never as a
    broken link the card renders as an empty anchor."""
    for step in get("de")["steps"]:
        assert step["source_url"] is None or step["source_url"].strip()


# --- the rules this route shares with /api/resources and /api/emergency ------


def test_team_notes_never_reach_the_adult():
    """`_`-prefixed keys are notes between us, including judgements about
    wording and what still needs review."""
    body = get("de")
    assert "_comment" not in json.dumps(body)
    assert not [key for key in body if key.startswith("_")]


def test_no_model_is_called_and_no_key_is_needed(monkeypatch):
    """Outside the spending cap, like the helplines.

    An adult reading the guide on the day the demo has spent its allowance is
    exactly when this matters, and it is the moment a child has just handed
    someone their phone.
    """
    monkeypatch.delenv("NEBIUS_API_KEY", raising=False)
    monkeypatch.delenv("TAVILY_API_KEY", raising=False)

    body = get("de")

    assert body["steps"]


def test_the_route_refuses_to_be_posted_to():
    assert client.post("/api/guide").status_code == 405

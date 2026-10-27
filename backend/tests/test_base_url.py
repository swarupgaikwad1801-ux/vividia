"""A bad NEBIUS_BASE_URL must be named, not hidden behind a green health check.

On 27 Oct 2026 the value on Render was a whole `curl` example copied from the
Nebius console. Every translation failed with InvalidURL; /api/health said
"ok" throughout, because it never calls a model. Neel found it by hand (#3).
"""

import types

import pytest
from fastapi.testclient import TestClient

import main
from engine.config import base_url_problem, load_settings

GOOD = "https://api.tokenfactory.nebius.com/v1/"

# The shape that was actually on Render, with a placeholder where a key would be.
PASTED_COMMAND = (
    "'https://api.tokenfactory.nebius.com/v1/chat/completions' \\\n"
    "  -X 'POST' \\\n"
    "  -H 'Authorization: Bearer $NEBIUS_API_KEY'"
)


def test_the_documented_base_url_is_accepted():
    assert base_url_problem(GOOD) is None
    assert base_url_problem(GOOD.rstrip("/")) is None


@pytest.mark.parametrize(
    "value",
    [
        PASTED_COMMAND,
        "",
        "api.tokenfactory.nebius.com/v1/",
        "http://api.tokenfactory.nebius.com/v1/",
        "https://api.tokenfactory.nebius.com/v1/chat/completions",
        f"'{GOOD}'",
        f"{GOOD} extra",
    ],
)
def test_the_shapes_a_bad_paste_takes_are_refused(value):
    assert base_url_problem(value)


def test_the_reason_never_repeats_the_value():
    # A pasted command can carry the key with it. The reason goes into logs
    # and into /api/health, so it must be a fixed sentence.
    assert "Bearer" not in base_url_problem(PASTED_COMMAND)
    assert "tokenfactory" not in base_url_problem(PASTED_COMMAND)


def test_whitespace_from_a_paste_is_stripped(monkeypatch):
    monkeypatch.setenv("NEBIUS_API_KEY", "  test-key\n")
    monkeypatch.setenv("NEBIUS_BASE_URL", f" {GOOD}\n")
    settings = load_settings()
    assert settings.base_url == GOOD
    assert settings.api_key == "test-key"


def test_a_bad_base_url_fails_with_a_sentence_that_says_how_to_fix_it(monkeypatch):
    monkeypatch.setenv("NEBIUS_API_KEY", "test-key")
    monkeypatch.setenv("NEBIUS_BASE_URL", PASTED_COMMAND)
    with pytest.raises(RuntimeError, match="https://api.tokenfactory.nebius.com/v1/"):
        load_settings()


def _pretend_live(monkeypatch, url):
    monkeypatch.setattr(main, "ENGINE", types.SimpleNamespace(__name__="engine.live"))
    monkeypatch.setenv("NEBIUS_BASE_URL", url)


def test_health_is_degraded_when_live_mode_has_a_bad_base_url(monkeypatch):
    _pretend_live(monkeypatch, PASTED_COMMAND)
    body = TestClient(main.app).get("/api/health").json()
    assert body["status"] == "degraded"
    assert "nebius_base_url" in body["models"]
    assert "Bearer" not in str(body)


def test_health_stays_ok_with_the_right_base_url(monkeypatch):
    _pretend_live(monkeypatch, GOOD)
    body = TestClient(main.app).get("/api/health").json()
    assert "nebius_base_url" not in body["models"]


def test_mock_mode_does_not_care_about_the_base_url(monkeypatch):
    monkeypatch.setattr(main, "ENGINE", types.SimpleNamespace(__name__="engine.mock"))
    monkeypatch.setenv("NEBIUS_BASE_URL", PASTED_COMMAND)
    assert main._base_url_problem() is None

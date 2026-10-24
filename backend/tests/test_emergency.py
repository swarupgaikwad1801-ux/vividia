"""Can every screen show 110 and 112 without typing them itself?

`GET /api/emergency` is what the always-visible help button and the crisis
screen call. `content/helplines.json` is the only place a contact may be
defined, so the numbers the screens show must be exactly the ones in that
file, and must load in every condition a child might hit: no API key, no
Tavily, and a demo that has spent its daily allowance.

Read-only on `content/`. No model calls: this route makes none.
"""

import json

from fastapi.testclient import TestClient

import main
from app.limits import Guard
from app.schemas import EmergencyResponse
from engine.config import REPO_ROOT

client = TestClient(main.app, raise_server_exceptions=False)

ON_DISK = json.loads((REPO_ROOT / "content" / "helplines.json").read_text(encoding="utf-8"))


def get_emergency() -> EmergencyResponse:
    response = client.get("/api/emergency")
    assert response.status_code == 200, response.text
    return EmergencyResponse.model_validate(response.json())


# --- it serves the file, and only the file -----------------------------------


def test_the_numbers_are_exactly_the_ones_in_helplines_json():
    served = [number.contact for number in get_emergency().numbers]
    assert served == [item["contact"] for item in ON_DISK["emergency"]]


def test_110_and_112_are_both_there():
    """The safety floor in CLAUDE.md names both. If either is ever dropped from
    the file, this fails before a child finds out."""
    served = {number.contact for number in get_emergency().numbers}
    assert {"110", "112"} <= served


def test_no_helpline_or_local_result_is_mixed_in():
    """This list is for immediate danger only. Helplines and the Tavily lookup
    are /api/resources, so a counselling service can never sit beside 110."""
    helplines = {item["contact"] for item in ON_DISK["helplines"]}
    served = {number.contact for number in get_emergency().numbers}
    assert not served & helplines


def test_each_number_carries_its_source_and_check_date():
    """The UI shows where a number was verified and when."""
    for number in get_emergency().numbers:
        assert number.source_url.startswith("https://")
        assert number.retrieved_at == ON_DISK["verified_on"]
        assert number.languages


# --- it loads whatever else is broken ----------------------------------------


def test_the_numbers_load_when_the_daily_cap_is_spent(monkeypatch):
    spent = Guard(daily_usd=0.01)
    spent.record_spend(1.0)
    monkeypatch.setattr(main, "GUARD", spent)

    assert client.post(
        "/api/translate", json={"text": "They took my bag again.", "source_lang": "en"}
    ).status_code == 503
    assert client.get("/api/emergency").status_code == 200


def test_the_numbers_load_with_no_api_keys(monkeypatch):
    monkeypatch.delenv("NEBIUS_API_KEY", raising=False)
    monkeypatch.delenv("TAVILY_API_KEY", raising=False)

    assert client.get("/api/emergency").status_code == 200


def test_the_numbers_are_the_same_in_mock_and_live_mode(monkeypatch):
    """The route does not go through ENGINE, so swapping the engine cannot
    change which emergency numbers a child is shown."""
    before = get_emergency()
    monkeypatch.setattr(main, "ENGINE", object())
    assert get_emergency() == before


def test_a_broken_content_file_is_a_calm_error_not_a_traceback(monkeypatch):
    def broken():
        raise FileNotFoundError("helplines.json")

    monkeypatch.setattr(main, "emergency_numbers", broken)

    response = client.get("/api/emergency")

    assert response.status_code >= 400
    assert response.json()["message_child"]
    assert "Traceback" not in response.text

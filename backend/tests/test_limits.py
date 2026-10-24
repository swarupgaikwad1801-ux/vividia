"""The demo has to survive until 15 Dec without shutting a child out of help.

The tests that matter most here are the ones about what still works once a
limit is hit: /api/resources and /api/health must keep answering, because the
helplines are the one thing a child might genuinely need from us.

Offline; no model calls.
"""

import pytest
from fastapi.testclient import TestClient

import main
from app.limits import Guard, client_key
from app.schemas import ErrorCode, ErrorResponse, HealthResponse
from engine.client import EngineError
from engine.errors import MESSAGES

client = TestClient(main.app, raise_server_exceptions=False)

CHILD_TEXT = "They took my bag again and everyone laughed at me."


@pytest.fixture
def guard(monkeypatch):
    """A fresh guard with small limits, installed in the app for one test."""
    fresh = Guard(daily_usd=0.01, per_ip_requests=3, per_ip_window_s=60.0)
    monkeypatch.setattr(main, "GUARD", fresh)
    return fresh


def _translate(ip="203.0.113.7"):
    return client.post(
        "/api/translate",
        json={"text": CHILD_TEXT, "source_lang": "hi"},
        headers={"x-forwarded-for": ip},
    )


# --- the daily dollar cap ----------------------------------------------------


def test_the_day_starts_with_the_whole_allowance():
    fresh = Guard(daily_usd=0.40)
    assert fresh.spent_today() == 0.0
    assert fresh.remaining_today() == pytest.approx(0.40)


def test_spend_accumulates_and_the_cap_then_refuses():
    fresh = Guard(daily_usd=0.10, per_ip_requests=1_000)
    fresh.record_spend(0.04)
    fresh.record_spend(0.05)

    fresh.check("a", 0.0)  # still inside the cap

    fresh.record_spend(0.02)
    assert fresh.remaining_today() == 0.0
    with pytest.raises(EngineError) as raised:
        fresh.check("a", 1.0)
    assert raised.value.code == "credit_exhausted"
    assert raised.value.retryable is False, "a retry cannot add credit"


def test_a_request_already_running_is_not_cut_off_half_finished():
    """Charged after the fact, so the cap can be passed slightly and the NEXT
    request is the one refused. A child mid-sentence is never interrupted."""
    fresh = Guard(daily_usd=0.01, per_ip_requests=1_000)
    fresh.check("a", 0.0)
    fresh.record_spend(0.50)  # that one request cost far more than the cap

    assert fresh.spent_today() == pytest.approx(0.50)
    with pytest.raises(EngineError):
        fresh.check("a", 1.0)


def test_the_cap_is_not_per_client(guard):
    """X-Forwarded-For can be set by the caller, so a per-client allowance
    must not be a way around the total."""
    guard.record_spend(1.0)

    for ip in ("198.51.100.1", "198.51.100.2", "203.0.113.9"):
        with pytest.raises(EngineError) as raised:
            guard.check(ip, 0.0)
        assert raised.value.code == "credit_exhausted"


def test_yesterdays_spend_is_not_kept(monkeypatch):
    fresh = Guard(daily_usd=0.40)
    fresh._spent["2026-10-23"] = 0.39
    fresh.record_spend(0.01)

    assert "2026-10-23" not in fresh._spent
    assert fresh.remaining_today() == pytest.approx(0.39)


# --- the per-client courtesy limit -------------------------------------------


def test_one_client_hammering_is_slowed_down():
    fresh = Guard(daily_usd=10.0, per_ip_requests=3, per_ip_window_s=60.0)

    for i in range(3):
        fresh.check("198.51.100.5", float(i))

    with pytest.raises(EngineError) as raised:
        fresh.check("198.51.100.5", 3.0)
    assert raised.value.code == "rate_limited"
    assert raised.value.retryable is True, "waiting does help here"


def test_one_client_does_not_use_up_anothers_allowance():
    fresh = Guard(daily_usd=10.0, per_ip_requests=2, per_ip_window_s=60.0)
    fresh.check("198.51.100.5", 0.0)
    fresh.check("198.51.100.5", 1.0)

    fresh.check("203.0.113.9", 2.0)  # a different judge, still welcome


def test_the_window_lets_a_client_back_in():
    fresh = Guard(daily_usd=10.0, per_ip_requests=2, per_ip_window_s=60.0)
    fresh.check("198.51.100.5", 0.0)
    fresh.check("198.51.100.5", 1.0)

    with pytest.raises(EngineError):
        fresh.check("198.51.100.5", 2.0)

    fresh.check("198.51.100.5", 61.0)  # the window has moved on


def test_the_first_forwarded_hop_is_what_counts():
    """Behind a proxy the direct peer is the proxy, so without this every
    caller would share one bucket."""

    class _Request:
        headers = {"x-forwarded-for": "203.0.113.9, 70.41.3.18, 150.172.238.178"}
        client = type("_C", (), {"host": "10.0.0.1"})()

    assert client_key(_Request()) == "203.0.113.9"


def test_a_direct_connection_falls_back_to_the_peer_address():
    class _Request:
        headers: dict = {}
        client = type("_C", (), {"host": "10.0.0.1"})()

    assert client_key(_Request()) == "10.0.0.1"


def test_a_client_we_cannot_identify_still_gets_a_bucket():
    """Unknown callers share one bucket rather than bypassing the limit."""

    class _Request:
        headers: dict = {}
        client = None

    assert client_key(_Request()) == "unknown"


# --- over the wire -----------------------------------------------------------


def test_a_throttled_client_is_told_calmly_in_their_own_language(guard):
    for _ in range(guard.per_ip_requests):
        assert _translate().status_code == 200

    response = _translate()

    assert response.status_code == 429
    body = ErrorResponse.model_validate(response.json())
    assert body.code == ErrorCode.RATE_LIMITED
    assert body.retryable is True
    assert body.message_child == MESSAGES["rate_limited"]["hi"]


def test_an_exhausted_cap_points_the_child_at_people(guard):
    """A retry button would be a lie, so the message names krisenchat and
    116 111 instead."""
    guard.record_spend(1.0)

    response = _translate()

    assert response.status_code == 503
    body = ErrorResponse.model_validate(response.json())
    assert body.code == ErrorCode.CREDIT_EXHAUSTED
    assert body.retryable is False
    assert "krisenchat.de" in body.message_child
    assert "116 111" in body.message_child


def test_the_helplines_keep_working_when_the_cap_is_spent(guard):
    """The most important test in this file. Refusing a child the emergency
    numbers to save credit would be the wrong way round."""
    guard.record_spend(1.0)

    assert _translate().status_code == 503  # translation is off...

    response = client.get("/api/resources", params={"lang": "hi"})
    assert response.status_code == 200, "a child can still reach help"
    assert response.json()["resources"]


def test_health_still_answers_and_says_the_demo_is_degraded(guard):
    guard.record_spend(1.0)

    response = client.get("/api/health")

    assert response.status_code == 200
    body = HealthResponse.model_validate(response.json())
    assert body.status == "degraded", "judges should be able to see why"


def test_health_is_ok_while_there_is_allowance_left(guard):
    body = HealthResponse.model_validate(client.get("/api/health").json())
    assert body.status == "ok"


def test_a_throttled_client_is_not_told_anything_about_other_clients(guard):
    """The status is for our logs; an address must never reach a response."""
    for _ in range(guard.per_ip_requests):
        _translate(ip="198.51.100.77")

    response = _translate(ip="198.51.100.77")

    assert "198.51.100.77" not in response.text
    assert "clients_seen" not in response.text


def test_the_status_report_carries_numbers_and_no_addresses(guard):
    guard.check("198.51.100.5", 0.0)
    status = guard.status()

    assert set(status) == {
        "daily_usd_cap",
        "spent_today_usd",
        "remaining_today_usd",
        "clients_seen",
    }
    assert "198.51.100.5" not in str(status)


# --- configuration -----------------------------------------------------------


def test_the_cap_can_be_set_from_the_environment(monkeypatch):
    monkeypatch.setenv("DEMO_DAILY_USD_CAP", "2.50")
    monkeypatch.setenv("DEMO_PER_IP_REQUESTS", "7")
    assert Guard().daily_usd == pytest.approx(2.50)
    assert Guard().per_ip_requests == 7


def test_a_nonsense_setting_falls_back_to_the_default(monkeypatch):
    """A typo in an env var must not uncap the demo or set it to zero."""
    monkeypatch.setenv("DEMO_DAILY_USD_CAP", "forty cents")
    monkeypatch.setenv("DEMO_PER_IP_REQUESTS", "")

    fresh = Guard()

    assert fresh.daily_usd > 0
    assert fresh.per_ip_requests > 0


def test_the_default_cap_spreads_the_promo_to_the_deadline():
    """$25 from 24 Oct must still be translating on 15 Dec, which is what the
    public demo URL requirement needs."""
    from app.limits import DEFAULT_DAILY_USD

    days_to_cover = 52  # 24 Oct to 15 Dec
    assert DEFAULT_DAILY_USD * days_to_cover <= 25.0

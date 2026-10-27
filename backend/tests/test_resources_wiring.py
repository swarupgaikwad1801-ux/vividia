"""Is the live resources module actually the one the API serves?

`engine/resources.py` has its own tests (Neel's `test_resources.py`). These test
the wiring instead: that `live.py` points at it, that `/api/resources` reports
the source it really had, and that `/api/health` stops calling it a mock.

The word "fallback" was hard-coded in the route, so `source` was a constant
dressed up as a fact. The child is shown where a number came from, so it has
to be earned.

No network: Tavily is replaced with `httpx.MockTransport`, the same way Neel's
tests do it.
"""

import json

import httpx
import pytest
from fastapi.testclient import TestClient

import main
from app.schemas import HealthResponse, ResourcesResponse
from engine import live, mock
from engine import resources as res

client = TestClient(main.app, raise_server_exceptions=False)

BAYERN = {
    "title": "Staatliche Schulberatung in Bayern",
    "url": "https://www.schulberatung.bayern.de/beratungsstellen/",
}


def tavily_returning(results, seen=None):
    def handler(request: httpx.Request) -> httpx.Response:
        if seen is not None:
            seen.append(json.loads(request.content))
        return httpx.Response(200, json={"results": results})

    return httpx.MockTransport(handler)


def tavily_failing():
    def handler(request: httpx.Request) -> httpx.Response:  # noqa: ARG001
        return httpx.Response(503)

    return httpx.MockTransport(handler)


@pytest.fixture(autouse=True)
def no_real_network(monkeypatch, tmp_path):
    monkeypatch.setenv("TAVILY_API_KEY", "test-key")
    monkeypatch.setattr(res, "_transport", tavily_returning([]))
    # The cache is a file now, so each test gets its own rather than sharing
    # one and writing into the working tree. Replaces _cache.clear().
    monkeypatch.setattr(res, "STATE_FILE", tmp_path / "tavily_state.json")
    monkeypatch.delenv("TAVILY_DAILY_CAP", raising=False)
    res._reset_state_for_tests()
    yield
    res._reset_state_for_tests()


@pytest.fixture
def live_engine(monkeypatch):
    """Serve the live engine from the routes, without needing a Nebius key.

    Only `resources` is exercised here, and that path makes no model calls, so
    no key is required and nothing is spent.
    """
    monkeypatch.setattr(main, "ENGINE", live)
    return live


# --- the wiring itself -------------------------------------------------------


def test_live_resources_is_neels_module_and_not_the_mock():
    assert live.resources.__module__ != "engine.mock"
    assert live.STATUS["resources"] == "live"


async def test_the_live_engine_returns_the_curated_helplines(monkeypatch):
    monkeypatch.delenv("TAVILY_API_KEY")

    found, source = await live.resources_with_source("", "hi")

    contacts = [resource["contact"] for resource in found]
    assert "116 111" in contacts, "the mock's placeholder entry is still being served"
    assert source == "fallback"


async def test_the_mock_never_claims_a_live_lookup():
    """The mock looks nothing up, so it must not report that it did."""
    found, source = await mock.resources_with_source("BY", "de")

    assert source == "fallback"
    assert found


# --- what the browser receives ----------------------------------------------


def test_the_route_reports_fallback_when_nothing_was_looked_up(live_engine):
    response = client.get("/api/resources", params={"lang": "hi"})

    assert response.status_code == 200
    body = ResourcesResponse.model_validate(response.json())
    assert body.source == "fallback"
    assert body.resources


def test_the_route_reports_live_when_tavily_answered(live_engine, monkeypatch):
    monkeypatch.setattr(res, "_transport", tavily_returning([BAYERN]))

    body = ResourcesResponse.model_validate(
        client.get("/api/resources", params={"lang": "de", "state": "BY"}).json()
    )

    assert body.source == "live", "a real lookup is still being reported as fallback"
    assert any("schulberatung.bayern.de" in r.source_url for r in body.resources)


def test_a_failed_lookup_is_reported_as_fallback_not_as_an_error(live_engine, monkeypatch):
    """A child must never be left with an empty list because a search broke."""
    monkeypatch.setattr(res, "_transport", tavily_failing())

    response = client.get("/api/resources", params={"lang": "de", "state": "BY"})

    assert response.status_code == 200
    body = ResourcesResponse.model_validate(response.json())
    assert body.source == "fallback"
    assert body.resources, "the curated helplines must still be there"


def test_a_host_we_did_not_vet_is_dropped_and_the_source_stays_fallback(
    live_engine, monkeypatch
):
    """Defence in depth: the module filters off-site hosts, and the route must
    not call the result "live" when everything was filtered away."""
    monkeypatch.setattr(
        res,
        "_transport",
        tavily_returning([
            {"title": "Beratung", "url": "https://schulberatung.bayern.de.evil.example/"}
        ]),
    )

    body = ResourcesResponse.model_validate(
        client.get("/api/resources", params={"lang": "de", "state": "BY"}).json()
    )

    assert body.source == "fallback"
    assert not any("evil.example" in r.source_url for r in body.resources)


def test_the_childs_text_is_never_sent_to_tavily(live_engine, monkeypatch):
    """The route takes a state and a language and nothing else, and this pins
    that the request leaving us carries only those."""
    seen: list[dict] = []
    monkeypatch.setattr(res, "_transport", tavily_returning([BAYERN], seen=seen))

    client.get("/api/resources", params={"lang": "de", "state": "BY"})

    assert seen, "no request was made"
    sent = json.dumps(seen[0])
    assert "Bayern" in sent
    for word in ("bag", "laughed", "hit", "bully", "schlägt"):
        assert word not in sent.lower()


def test_every_resource_shown_carries_where_it_came_from(live_engine, monkeypatch):
    monkeypatch.setattr(res, "_transport", tavily_returning([BAYERN]))

    body = ResourcesResponse.model_validate(
        client.get("/api/resources", params={"lang": "de", "state": "BY"}).json()
    )

    for resource in body.resources:
        assert resource.source_url, f"{resource.name} has no source"
        assert resource.retrieved_at, f"{resource.name} does not say when it was checked"


# --- health stops calling it a mock -----------------------------------------


def test_health_reports_resources_as_live(live_engine):
    body = HealthResponse.model_validate(client.get("/api/health").json())

    assert body.engine == "live"
    assert body.models["resources"] == "live"

    # Health must say, per function, whether it is real yet, so nobody demos a
    # mock believing it is live. This asserts that every function reports one
    # of the two honestly, rather than pinning a particular one to "mock":
    # naming report here was true when this test was written and went stale
    # the moment #19 made report live, failing a test about resources.
    from engine import live

    for name, state in live.STATUS.items():
        assert body.models[name] == state, f"health misreports {name}"
        assert state in ("live", "mock")

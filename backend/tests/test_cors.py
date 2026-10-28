"""Which websites may call this backend from a browser (main.py, CORS).

28 Oct: the live site was refused by its own backend, and the browser showed
it to the child as "no internet". These pin the fix: our production site and
this project's branch previews always pass the preflight; any other site
does not, so no page elsewhere can spend our credits.
"""

import pytest
from fastapi.testclient import TestClient

import main

client = TestClient(main.app)


def preflight(origin: str):
    return client.options(
        "/api/translate",
        headers={
            "Origin": origin,
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "content-type",
        },
    )


@pytest.mark.parametrize(
    "origin",
    [
        "https://vividia-swarupgaikwad1801-ux.vercel.app",
        "https://vividia-git-ui-next-polish-swarupgaikwad1801-ux.vercel.app",
        "https://vividia-git-main-swarupgaikwad1801-ux.vercel.app",
        "http://localhost:5173",
    ],
)
def test_our_sites_pass_the_preflight(origin):
    response = preflight(origin)
    assert response.status_code == 200
    assert response.headers.get("access-control-allow-origin") == origin


@pytest.mark.parametrize(
    "origin",
    [
        "https://evil.example",
        "https://vividia.vercel.app",
        "https://vividia-git-x-someoneelse.vercel.app",
        "https://vividia-swarupgaikwad1801-ux.vercel.app.evil.example",
        "http://vividia-swarupgaikwad1801-ux.vercel.app",
    ],
)
def test_other_sites_are_refused(origin):
    response = preflight(origin)
    assert "access-control-allow-origin" not in response.headers


def test_production_is_kept_when_the_host_sets_its_own_list(monkeypatch):
    monkeypatch.setenv("ALLOWED_ORIGINS", "https://staging.example, https://vividia-swarupgaikwad1801-ux.vercel.app/")
    assert main.allowed_origins() == [
        "https://staging.example",
        "https://vividia-swarupgaikwad1801-ux.vercel.app",
    ]
    monkeypatch.setenv("ALLOWED_ORIGINS", "https://staging.example")
    assert main.PRODUCTION_ORIGIN in main.allowed_origins()

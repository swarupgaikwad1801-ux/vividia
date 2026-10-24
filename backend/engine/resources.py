"""Where a child can turn next: national helplines, then local school psychology.

Neel owns this module. Two layers, on purpose:

1. Curated national helplines from content/helplines.json, checked by hand
   against each service's own site. They never depend on the network, so a
   failed search can never leave a child looking at an empty list.
2. The school psychology service for the child's state, looked up live with
   Tavily and restricted to that state's official site. Results from any
   other host are dropped even if Tavily returns them.

Only the state name and a fixed German query are ever sent to Tavily. The
child's text never is: this function does not receive it.

Emergency numbers (110/112) are never looked up; emergency_numbers() reads
them from the same curated file so the safety screen has no network
dependency either.
"""

import json
import os
import time
from datetime import datetime, timezone
from functools import lru_cache
from typing import Literal
from urllib.parse import urlparse

import httpx

from engine.config import REPO_ROOT
from engine.contract import Resource

CONTENT_FILE = REPO_ROOT / "content" / "helplines.json"
TAVILY_URL = "https://api.tavily.com/search"
TIMEOUT_S = 6.0

# One official site per state, each checked by hand on 24 Oct 2026. A code
# missing here gets the national helplines only, never an open web search.
STATE_SITES: dict[str, tuple[str, str]] = {
    "BW": ("Baden-Württemberg", "zsl-bw.de"),
    "BY": ("Bayern", "schulberatung.bayern.de"),
    "BE": ("Berlin", "berlin.de"),
    "BB": ("Brandenburg", "mbjs.brandenburg.de"),
    "HB": ("Bremen", "rebuz.bremen.de"),
    "HH": ("Hamburg", "hamburg.de"),
    "HE": ("Hessen", "schulaemter.hessen.de"),
    "MV": ("Mecklenburg-Vorpommern", "bildung-mv.de"),
    "NI": ("Niedersachsen", "bildungsportal-niedersachsen.de"),
    "NW": ("Nordrhein-Westfalen", "schulministerium.nrw"),
    "RP": ("Rheinland-Pfalz", "bildung.rlp.de"),
    "SL": ("Saarland", "saarland.de"),
    "SN": ("Sachsen", "bildung.sachsen.de"),
    "ST": ("Sachsen-Anhalt", "landesschulamt.sachsen-anhalt.de"),
    "SH": ("Schleswig-Holstein", "schleswig-holstein.de"),
    "TH": ("Thüringen", "schulamt.thueringen.de"),
}

# Tests swap this for httpx.MockTransport so they never touch the network.
_transport: httpx.AsyncBaseTransport | None = None

# One live search per state per day is plenty: school counselling services do
# not move overnight, and the public demo must not burn Tavily credits before
# 15 Dec. Only successful lookups are cached, so a failure is retried.
CACHE_SECONDS = 24 * 60 * 60
_cache: dict[str, tuple[float, list[Resource]]] = {}


@lru_cache(maxsize=1)
def _content() -> dict:
    return json.loads(CONTENT_FILE.read_text(encoding="utf-8"))


def _curated(section: str) -> list[Resource]:
    data = _content()
    return [
        {
            "name": item["name"],
            "contact": item["contact"],
            "hours": item["hours"],
            "languages": item["languages"],
            "source_url": item["source_url"],
            "retrieved_at": data["verified_on"],
        }
        for item in data[section]
    ]


def national_helplines() -> list[Resource]:
    return _curated("helplines")


def emergency_numbers() -> list[Resource]:
    return _curated("emergency")


def _on_site(url: str, domain: str) -> bool:
    host = (urlparse(url).hostname or "").lower()
    return host == domain or host.endswith("." + domain)


async def _search_local(state: str) -> list[Resource]:
    """Live lookup for one state. Returns [] on any failure; never raises."""
    key = os.getenv("TAVILY_API_KEY")
    site = STATE_SITES.get(state.upper())
    if not key or not site:
        return []
    state_name, domain = site
    payload = {
        "query": f"Schulpsychologische Beratungsstelle {state_name} Kontakt",
        "search_depth": "basic",
        "max_results": 3,
        "include_answer": False,
        "include_raw_content": False,
        "include_domains": [domain],
    }
    try:
        async with httpx.AsyncClient(timeout=TIMEOUT_S, transport=_transport) as client:
            response = await client.post(
                TAVILY_URL, json=payload, headers={"Authorization": f"Bearer {key}"}
            )
            response.raise_for_status()
            results = response.json().get("results", [])
    except (httpx.HTTPError, ValueError):
        return []

    now = datetime.now(timezone.utc).isoformat(timespec="seconds")
    found: list[Resource] = []
    for result in results:
        url = result.get("url", "")
        if not _on_site(url, domain):
            continue  # defence in depth: never show a host we did not vet
        found.append({
            "name": (result.get("title") or "Schulpsychologische Beratung").strip()[:120],
            "contact": url,
            "hours": "Siehe Webseite",
            "languages": ["de"],
            "source_url": url,
            "retrieved_at": now,
        })
    return found


async def _cached_local(state: str) -> list[Resource]:
    key = state.upper()
    hit = _cache.get(key)
    if hit and hit[0] > time.monotonic():
        return hit[1]
    found = await _search_local(key)
    if found:
        _cache[key] = (time.monotonic() + CACHE_SECONDS, found)
    return found


async def resources_with_source(
    state: str, lang: str
) -> tuple[list[Resource], Literal["live", "fallback"]]:
    """Resources plus whether the local part came from a live lookup.

    main.py needs the second value for ResourcesResponse.source; resources()
    keeps the frozen contract signature.
    """
    local = await _cached_local(state) if state else []
    # Helplines that speak the child's language first; order is otherwise kept.
    helplines = sorted(national_helplines(), key=lambda r: lang not in r["languages"])
    return helplines + local, ("live" if local else "fallback")


async def resources(state: str, lang: str) -> list[Resource]:
    found, _ = await resources_with_source(state, lang)
    return found

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
import logging
import os
import re
import time
from datetime import datetime, timezone
from functools import lru_cache
from typing import Literal
from urllib.parse import urlparse

import httpx

from engine.config import REPO_ROOT
from engine.contract import Resource

log = logging.getLogger(__name__)

CONTENT_FILE = REPO_ROOT / "content" / "helplines.json"
TAVILY_URL = "https://api.tavily.com/search"
TAVILY_EXTRACT_URL = "https://api.tavily.com/extract"
TIMEOUT_S = 6.0

# Every live Tavily request counts, search and extract alike. Past the cap the
# child still gets the curated helplines, so the only thing a spent budget
# costs is the local service - never the list itself.
#
# The count is persisted with the cache: a cap that reset on redeploy would not
# be a cap, and a public demo has to survive until judging closes on 15 Dec.
DEFAULT_DAILY_CAP = 20


def daily_cap() -> int:
    """Read at call time, not import time, so a test or deploy can set it."""
    try:
        return max(0, int(os.getenv("TAVILY_DAILY_CAP", DEFAULT_DAILY_CAP)))
    except ValueError:
        return DEFAULT_DAILY_CAP

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

# The cache and the day's spend live in one small file so a redeploy or a
# second instance does not pay for the same sixteen states again.
#
# Expiry is WALL CLOCK, not time.monotonic(). monotonic() counts from an
# arbitrary zero per process, so a monotonic deadline written to disk means
# nothing to the next process - every entry would read as either long expired
# or valid forever. Wall clock can jump; a stale entry for a day is a far
# smaller problem than a cache that never expires.
STATE_FILE = REPO_ROOT / ".tavily_state.json"

# Shape: {"day": "YYYY-MM-DD", "spent": int,
#         "entries": {"BW": {"expires": <epoch>, "resources": [...]}}}
_state: dict | None = None


def _today() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%d")


def _blank_state() -> dict:
    return {"day": _today(), "spent": 0, "entries": {}}


def _load_state() -> dict:
    """Read the state file, tolerating every way it can be unusable.

    A child asking for help must never see this fail, so anything unreadable
    is treated as an empty cache rather than raised: worst case we pay for a
    lookup we had already paid for.
    """
    global _state
    if _state is not None:
        return _state
    try:
        loaded = json.loads(STATE_FILE.read_text(encoding="utf-8"))
        if not isinstance(loaded, dict) or not isinstance(loaded.get("entries"), dict):
            raise ValueError("unexpected shape")
        loaded.setdefault("day", _today())
        loaded["spent"] = int(loaded.get("spent", 0))
        _state = loaded
    except (OSError, ValueError, TypeError):
        _state = _blank_state()
    # A new UTC day resets the allowance. The cached lookups keep their own
    # expiry: they are still good, and re-fetching them is what costs.
    if _state.get("day") != _today():
        _state["day"] = _today()
        _state["spent"] = 0
    return _state


def _save_state() -> None:
    """Persist best-effort. A read-only disk must not break a lookup."""
    if _state is None:
        return
    try:
        STATE_FILE.write_text(json.dumps(_state), encoding="utf-8")
    except OSError as error:
        log.warning("could not persist Tavily state to %s: %s", STATE_FILE, error)


def _spend(n: int = 1) -> bool:
    """Claim n credits for today. False means the cap is reached: do not call.

    Claimed BEFORE the request goes out, so a timeout or a 500 still counts.
    Tavily bills the request, not the answer, and a cap that only counted
    successes could be walked straight through by a failing endpoint.
    """
    state = _load_state()
    cap = daily_cap()
    if state["spent"] + n > cap:
        log.info("Tavily daily cap reached (%d/%d); serving curated helplines",
                 state["spent"], cap)
        return False
    state["spent"] += n
    _save_state()
    return True


def tavily_status() -> dict[str, str]:
    """For /api/health, so the budget can be watched while the demo is public."""
    state = _load_state()
    return {
        "tavily_spent_today": str(state["spent"]),
        "tavily_daily_cap": str(daily_cap()),
        "tavily_cached_states": str(len(state["entries"])),
    }


def _reset_state_for_tests() -> None:
    global _state
    _state = None


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


# A phone number is only taken when the page LABELS it as one. Pulling the
# first number-shaped run of characters off a page would happily return a
# postcode, a house number, a file reference or a date, and a wrong number on
# a child-safety screen is worse than no number: "Siehe Webseite" is honest,
# an unanswered line is not. So: a label, then something phone-shaped, then a
# digit count that a German number actually has.
_PHONE_LABEL = re.compile(
    r"(?:Tel\.?|Telefon(?:nummer)?|Fon|Rufnummer|Hotline)\s*:?\s*"
    r"((?:\+49|0)[\d\s/()–-]{5,24}|11[68]\s?\d{3})",
    re.IGNORECASE,
)
# Opening hours have to name a day and say "Uhr"; anything looser matches
# prose. Kept as the page writes it, never reformatted into our own words.
_HOURS = re.compile(
    r"((?:Mo|Di|Mi|Do|Fr|Sa|So|Montag|Dienstag|Mittwoch|Donnerstag|Freitag)"
    r"[^.;\n]{3,70}?Uhr)",
    re.IGNORECASE,
)


def _phone_from(text: str) -> str | None:
    """A labelled German phone number, or None. Never a guess."""
    for match in _PHONE_LABEL.finditer(text):
        raw = match.group(1).strip(" –-/()")
        digits = re.sub(r"\D", "", raw)
        # 116 111 and 110 are short codes; a full German number runs to 15
        # digits with the country code. Below 6 it is not a number, above 15
        # the regex has run into the next paragraph.
        if 3 <= len(digits) <= 15 and not (len(digits) < 6 and not digits.startswith("11")):
            return " ".join(raw.split())
    return None


def _hours_from(text: str) -> str | None:
    match = _HOURS.search(text)
    if not match:
        return None
    return " ".join(match.group(1).split())[:120]


async def _extract_details(url: str, domain: str, key: str) -> tuple[str | None, str | None]:
    """Phone and hours off the page we already found. Never raises.

    Costs one credit, so it runs for the best result only - which is also
    what the 32-credit estimate for a 16-state measured run assumes.
    """
    # Checked again rather than trusted: this is the one place where a URL
    # from Tavily's answer is fed back into an outbound request, so a host we
    # never vetted must not reach it even if the caller already filtered.
    if not _on_site(url, domain):
        return None, None
    if not _spend():
        return None, None
    try:
        async with httpx.AsyncClient(timeout=TIMEOUT_S, transport=_transport) as client:
            response = await client.post(
                TAVILY_EXTRACT_URL,
                json={"urls": [url], "extract_depth": "basic"},
                headers={"Authorization": f"Bearer {key}"},
            )
            response.raise_for_status()
            results = response.json().get("results") or []
    except (httpx.HTTPError, ValueError, KeyError, TypeError):
        return None, None
    if not results:
        return None, None
    text = (results[0] or {}).get("raw_content") or ""
    if not isinstance(text, str):
        return None, None
    return _phone_from(text), _hours_from(text)


async def _search_local(state: str) -> list[Resource]:
    """Live lookup for one state. Returns [] on any failure; never raises."""
    key = os.getenv("TAVILY_API_KEY")
    site = STATE_SITES.get(state.upper())
    if not key or not site:
        return []
    if not _spend():
        return []  # out of allowance today: the curated helplines still stand
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

    # One extract, on the best result only. If it finds nothing, or fails, or
    # the cap bites, the entry stays exactly as it was: the link, and "Siehe
    # Webseite". That was already an honest answer; this only improves on it
    # when the page actually says so.
    if found:
        best = found[0]
        # source_url already points at the page; contact is replaced by the
        # number, so the link survives the swap and stays checkable.
        phone, hours = await _extract_details(best["source_url"], domain, key)
        if phone:
            best["contact"] = phone
            log.info("Tavily extract: phone for %s from %s", state, best["source_url"])
        if hours:
            best["hours"] = hours
    return found


async def _cached_local(state: str) -> list[Resource]:
    key = state.upper()
    state_data = _load_state()
    hit = state_data["entries"].get(key)
    if isinstance(hit, dict) and float(hit.get("expires", 0)) > time.time():
        cached = hit.get("resources")
        if isinstance(cached, list) and cached:
            return cached
    found = await _search_local(key)
    if found:
        # Only successful lookups are cached, so a failure is retried rather
        # than remembered for a day.
        state_data["entries"][key] = {
            "expires": time.time() + CACHE_SECONDS,
            "resources": found,
        }
        _save_state()
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

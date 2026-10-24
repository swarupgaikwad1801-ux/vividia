"""Keep the public demo alive until 15 Dec, without locking a child out of help.

The demo has to work for judges until 15 December on a $25 promo, and anyone
with the URL can send it traffic. Two limits, and they do different jobs.

**The daily dollar cap is the real protection.** It adds up
`Usage.estimated_cost_usd` per UTC day and stops translating once the day's
allowance is spent. $25 spread over 24 Oct to 15 Dec is about $0.48 a day, so
the default is $0.40 and the rest is margin.

**The per-IP limit is only a courtesy.** It stops one browser hammering the
demo by accident. It cannot stop a determined abuser, because the client address
behind a proxy comes from `X-Forwarded-For`, which the client itself can set.
That is exactly why the dollar cap exists and why it is not per-IP: a spoofed
header cannot get past a total.

**What keeps working when a limit is hit.** Translation stops. `/api/resources`
and `/api/health` do not, because the helplines and the emergency numbers are
the one thing a child might actually need from us, and refusing those to save
credit would be the wrong way round. CLAUDE.md: help is reachable on every
screen whether or not anything else works.

Everything here is in memory, so a restart resets the day's spend. For a demo
on one instance that is the honest trade: a database for this would be a day of
work that buys nothing a judge can see. It is written down rather than hidden.
"""

import os
from collections import deque
from dataclasses import dataclass, field
from datetime import datetime, timezone

from engine.client import EngineError

# 24 Oct to 15 Dec is 52 days. $25 / 52 is about $0.48, so $0.40 leaves room
# for the days when a judge is actually trying it.
DEFAULT_DAILY_USD = 0.40

# Enough for a judge to work through the whole journey several times over.
DEFAULT_PER_IP_REQUESTS = 40
DEFAULT_PER_IP_WINDOW_S = 3600.0


def _env_float(name: str, default: float) -> float:
    try:
        return float(os.getenv(name, "") or default)
    except ValueError:
        return default


def _env_int(name: str, default: int) -> int:
    try:
        return int(os.getenv(name, "") or default)
    except ValueError:
        return default


@dataclass
class Guard:
    """The demo's spend and traffic limits, held in memory."""

    daily_usd: float = field(default_factory=lambda: _env_float("DEMO_DAILY_USD_CAP", DEFAULT_DAILY_USD))
    per_ip_requests: int = field(default_factory=lambda: _env_int("DEMO_PER_IP_REQUESTS", DEFAULT_PER_IP_REQUESTS))
    per_ip_window_s: float = field(default_factory=lambda: _env_float("DEMO_PER_IP_WINDOW_S", DEFAULT_PER_IP_WINDOW_S))

    _spent: dict[str, float] = field(default_factory=dict)
    _seen: dict[str, deque] = field(default_factory=dict)

    # --- the day's spend ----------------------------------------------------

    @staticmethod
    def _today() -> str:
        return datetime.now(timezone.utc).strftime("%Y-%m-%d")

    def spent_today(self) -> float:
        return self._spent.get(self._today(), 0.0)

    def remaining_today(self) -> float:
        return max(0.0, self.daily_usd - self.spent_today())

    def record_spend(self, usd: float) -> None:
        """Called after a request, with what it actually cost.

        Charged after the fact, so a request already under way is never cut off
        half finished. The cap can therefore be passed slightly; the next
        request is the one that is refused.
        """
        today = self._today()
        self._spent[today] = self._spent.get(today, 0.0) + max(0.0, usd)
        # Yesterday's totals are of no use to anyone and would grow forever.
        for day in [d for d in self._spent if d != today]:
            del self._spent[day]

    # --- traffic from one client -------------------------------------------

    def _recent(self, key: str, now: float) -> deque:
        seen = self._seen.setdefault(key, deque())
        cutoff = now - self.per_ip_window_s
        while seen and seen[0] < cutoff:
            seen.popleft()
        if not seen and len(self._seen) > 5_000:
            # A long-running demo would otherwise keep a key per address seen.
            self._seen = {k: v for k, v in self._seen.items() if v}
            self._seen.setdefault(key, seen)
        return seen

    # --- the check ----------------------------------------------------------

    def check(self, key: str, now: float) -> None:
        """Raise if this request must not be served. Otherwise count it.

        The order matters: the dollar cap is checked first, because when the
        day's credit is gone no client's allowance should let them past it.
        """
        if self.remaining_today() <= 0:
            raise EngineError(
                "credit_exhausted",
                f"daily demo cap of ${self.daily_usd:.2f} reached",
                False,
            )

        seen = self._recent(key, now)
        if len(seen) >= self.per_ip_requests:
            raise EngineError(
                "rate_limited",
                f"{self.per_ip_requests} requests in {int(self.per_ip_window_s)}s from one client",
                True,
            )
        seen.append(now)

    def status(self) -> dict:
        """For the log and for /api/health. Numbers only, no addresses."""
        return {
            "daily_usd_cap": round(self.daily_usd, 4),
            "spent_today_usd": round(self.spent_today(), 6),
            "remaining_today_usd": round(self.remaining_today(), 6),
            "clients_seen": len(self._seen),
        }


def client_key(request) -> str:
    """Which client this is, as well as we can tell.

    Behind a proxy the direct peer is the proxy, so the first X-Forwarded-For
    entry is the only thing that distinguishes callers. A client can set that
    header itself, so this is a courtesy limit and not a security control; the
    daily cap is what actually protects the credit.
    """
    forwarded = request.headers.get("x-forwarded-for", "")
    if forwarded:
        first = forwarded.split(",")[0].strip()
        if first:
            return first
    client = getattr(request, "client", None)
    return getattr(client, "host", None) or "unknown"

"""Has a helpline changed its number or its hours since we checked by hand?

`content/helplines.json` is the one place those facts live. Every screen reads
them from there, so if a service quietly changes its opening hours, the app
tells a child to ring at a time nobody answers. This looks the facts up again
and prints what differs.

**It never edits the file.** A person reads the difference, opens the service's
own page, and decides. That is the point: the file's value is that a human
checked it, and a script that overwrote it would destroy exactly that.

Run from the repo root. Nothing live happens without `--live`:

    backend/.venv/Scripts/python eval/check_helplines.py            # costs nothing
    backend/.venv/Scripts/python eval/check_helplines.py --live     # ~4 credits

Not in CI, on purpose: it spends Tavily credits, the demo's allowance has to
last until judging closes on 15 Dec, and a red build is the wrong way to learn
that a helpline moved its hours by an hour.

Emergency numbers (110, 112) are deliberately NOT checked. `resources.py`
never looks them up either: they are constants, and a search that returned
anything else for them would be wrong rather than news.
"""

import argparse
import asyncio
import json
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(REPO_ROOT / "backend"))

# German hours carry en-dashes and umlauts, and this is run by hand on a
# Windows console that defaults to cp1252 - without this the output arrives
# full of replacement characters and looks like corrupted data.
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

import httpx  # noqa: E402

from engine import resources as R  # noqa: E402

# The services whose own site is the authority for their own hours. Each is
# restricted to that host, like the state lookups: an aggregator repeating a
# number from 2019 is not a source.
WATCHED = {
    "Nummer gegen Kummer": "nummergegenkummer.de",
    "krisenchat": "krisenchat.de",
}

QUERY = "{name} Telefonnummer Öffnungszeiten Beratung"


def curated() -> list[dict]:
    """The helplines as the file has them. Read-only, always."""
    data = json.loads((REPO_ROOT / "content" / "helplines.json").read_text(encoding="utf-8"))
    return [{**item, "_verified_on": data["verified_on"]} for item in data["helplines"]]


def domain_for(name: str) -> str | None:
    for watched, domain in WATCHED.items():
        if watched.lower() in name.lower() or name.lower() in watched.lower():
            return domain
    return None


async def look_up(name: str, domain: str, key: str) -> dict:
    """One search plus at most one extract, both on that service's own host."""
    out: dict = {"domain": domain, "url": None, "phone": None, "hours": None, "note": None}

    if not R._spend():
        out["note"] = "daily cap reached; nothing looked up"
        return out
    try:
        async with httpx.AsyncClient(timeout=R.TIMEOUT_S, transport=R._transport) as client:
            response = await client.post(
                R.TAVILY_URL,
                json={
                    "query": QUERY.format(name=name),
                    "search_depth": "basic",
                    "max_results": 3,
                    "include_answer": False,
                    "include_raw_content": False,
                    "include_domains": [domain],
                },
                headers={"Authorization": f"Bearer {key}"},
            )
            response.raise_for_status()
            results = response.json().get("results", [])
    except (httpx.HTTPError, ValueError) as error:
        out["note"] = f"search failed: {type(error).__name__}"
        return out

    on_site = [r for r in results if R._on_site(r.get("url", ""), domain)]
    if not on_site:
        out["note"] = "no result on the service's own host"
        return out

    out["url"] = on_site[0]["url"]
    # The same parser the app uses, deliberately: if it would read a wrong
    # number into a child's screen, this check has to read the same wrong
    # number rather than quietly disagree with the thing it is checking.
    phone, hours = await R._extract_details(out["url"], domain, key)
    out["phone"], out["hours"] = phone, hours
    if not phone and not hours:
        out["note"] = "page gave no labelled number and no hours"
    return out


def compare(entry: dict, found: dict) -> list[str]:
    """Differences worth a person's attention. Silence means nothing changed."""
    issues = []
    if found["note"]:
        return [f"could not check: {found['note']}"]

    recorded_phone = entry["contact"]
    if found["phone"]:
        a = "".join(c for c in recorded_phone if c.isdigit())
        b = "".join(c for c in found["phone"] if c.isdigit())
        if a and b and a != b:
            issues.append(f"number: file says {recorded_phone!r}, page says {found['phone']!r}")
    if found["hours"]:
        # Compared loosely: the file writes "Mo-Sa 14-20 Uhr" and a page may
        # write the same thing with different dashes or spacing. Only a real
        # difference is worth waking a person for.
        def fold(text: str) -> str:
            return "".join(c for c in text.lower() if c.isalnum())
        if fold(entry["hours"]) != fold(found["hours"]):
            issues.append(f"hours: file says {entry['hours']!r}, page says {found['hours']!r}")
    return issues


async def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--live", action="store_true",
                        help="actually call Tavily (about 4 credits). Without it, nothing is spent.")
    args = parser.parse_args()

    entries = curated()
    checkable = [(e, domain_for(e["name"])) for e in entries]

    print(f"content/helplines.json, verified_on {entries[0]['_verified_on']}\n")

    if not args.live:
        print("Dry run. Nothing was called and nothing was spent.\n")
        for entry, domain in checkable:
            if domain:
                print(f"  would check {entry['name']!r} on {domain}")
                print(f"    file: {entry['contact']} | {entry['hours']}")
            else:
                print(f"  SKIP {entry['name']!r}: no vetted host in WATCHED")
        print(f"\n--live would cost about {2 * sum(1 for _, d in checkable if d)} credits "
              f"(one search + one extract each).")
        print("Emergency numbers are never looked up; they are constants.")
        return 0

    key = R.os.getenv("TAVILY_API_KEY")
    if not key:
        print("TAVILY_API_KEY is not set. Nothing to do.")
        return 2

    differences = 0
    for entry, domain in checkable:
        if not domain:
            print(f"SKIP {entry['name']!r}: no vetted host in WATCHED\n")
            continue
        found = await look_up(entry["name"], domain, key)
        issues = compare(entry, found)
        mark = "DIFFERS" if any("says" in i for i in issues) else ("?" if issues else "ok")
        print(f"[{mark}] {entry['name']}")
        print(f"    file : {entry['contact']} | {entry['hours']}")
        print(f"    page : {found['phone'] or '-'} | {found['hours'] or '-'}  {found['url'] or ''}")
        for issue in issues:
            print(f"    -> {issue}")
            if "says" in issue:
                differences += 1
        print()

    status = R.tavily_status()
    print(f"Tavily today: {status['tavily_spent_today']}/{status['tavily_daily_cap']} credits.")
    if differences:
        print(f"\n{differences} difference(s). Open each service's own page and decide;")
        print("then a PERSON edits content/helplines.json and moves verified_on.")
        print("This script never writes to it.")
    else:
        print("\nNo differences. content/helplines.json still matches the pages.")
    return 0


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))

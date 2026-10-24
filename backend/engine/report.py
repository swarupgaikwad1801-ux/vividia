"""Turn an approved timeline into something a child can hand to an adult.

The governing fact about this module is that the German is already settled.
By the time a timeline reaches here, each entry's `text_de` is a sentence the
child read and approved word by word, in step 3 of the journey. Writing a
report by asking a model to describe those entries would replace the child's
approved words with a paraphrase nobody approved, and the paraphrase is what
the adult would act on.

So the entries are inserted **verbatim**, and the model is given one narrow
job: three sentences of orientation at the top, for an adult who has thirty
seconds. Everything else in the document is fixed text from report_text.py.

What that split buys:

- The child's words cannot be softened, sharpened, or summarised away. A test
  asserts every approved sentence appears unchanged.
- The one generated part is small enough to state hard rules about, and to
  check: no judgement, no diagnosis, no claim that any of it is true, no label
  like "bullying" put on the child's account for them.
- A model outage costs the overview, not the report. The timeline is the part
  that matters and it needs no model at all.

`report()` keeps the frozen contract signature and returns a `Report`.
"""

from engine.client import EngineError, Usage, call
from engine.contract import Entry, Report
from engine.prompts import REPORT_SCHEMA, REPORT_SYSTEM, language_name
from engine.report_text import footer_for, format_date, header_for, labels_for, place_for

import json

# The adult reads German. That is the whole reason the app exists, so it is not
# a parameter.
TARGET_LANG = "de"


def _entry_block(entry: Entry, lang: str, text_key: str) -> str:
    """One entry, as date, place, who, and then the child's sentence.

    `place` and `people` are the child's own descriptions ("two older boys"),
    so they are printed as written rather than tidied into categories.
    """
    labels = labels_for(lang)
    details = []
    if entry.get("place"):
        # A known place code renders in the reader's language; free text the
        # child typed is quoted verbatim, because we have no translation of it
        # that the child approved.
        details.append(f"{labels['where']}: {place_for(entry['place'], lang)}")
    if entry.get("people"):
        # Always the child's own description ("two older boys"), so always
        # verbatim and quoted, in both versions.
        details.append(f"{labels['who']}: \"{entry['people']}\"")

    head = format_date(entry["date"], lang)
    if details:
        head = f"{head} — " + " · ".join(details)
    return f"{head}\n{entry[text_key]}"


def _period(entries: list[Entry], lang: str) -> str:
    labels = labels_for(lang)
    dates = sorted(entry["date"] for entry in entries if entry.get("date"))
    count = f"{len(entries)} {labels['entries']}"
    if not dates:
        return count
    first, last = format_date(dates[0], lang), format_date(dates[-1], lang)
    span = first if first == last else f"{first} – {last}"
    return f"{labels['period']}: {span} · {count}"


def _assemble(entries: list[Entry], lang: str, text_key: str, overview: str) -> str:
    parts = [header_for(lang), "", _period(entries, lang)]
    if overview:
        parts += ["", overview]
    parts.append("")
    for entry in entries:
        parts += [_entry_block(entry, lang, text_key), ""]
    parts.append(footer_for(lang))
    return "\n".join(parts).strip()


async def _overview(entries: list[Entry], child_lang: str, usage: Usage) -> tuple[str, str]:
    """The only generated text in the report. Empty strings on any failure.

    A missing overview costs an adult thirty seconds of reading. A missing
    report costs the child the conversation they were building up to, so this
    never raises: the timeline below it is complete without this.
    """
    listing = "\n".join(
        f"{entry['date']}: {entry['text_child']}"
        + (f" ({entry['place']})" if entry.get("place") else "")
        for entry in entries
    )
    system = REPORT_SYSTEM.format(
        target_name=language_name(TARGET_LANG), source_name=language_name(child_lang)
    )
    try:
        raw = await call(
            "judge",
            system,
            f"Entries the child wrote and approved:\n{listing}",
            usage,
            temperature=0.2,
            max_tokens=500,
            response_format=REPORT_SCHEMA,
            step="report",
        )
        parsed = json.loads(raw)
    except (EngineError, json.JSONDecodeError, KeyError):
        return "", ""
    return parsed.get("overview_target", ""), parsed.get("overview_child", "")


async def report(entries: list[Entry], child_lang: str) -> Report:
    """Build the two versions of the report: the child's and the adult's.

    Both carry the same entries, so a child approving the version they can read
    is approving what the adult will actually see.
    """
    usage = Usage()
    if not entries:
        # The contract requires at least one entry, and the route enforces it.
        # Guarded anyway: an empty report handed to a teacher would be worse
        # than an error.
        raise EngineError("invalid_input", "a report needs at least one entry", False)

    entries = sorted(entries, key=lambda entry: entry.get("date") or "")
    overview_de, overview_child = await _overview(entries, child_lang, usage)

    german_version = _assemble(entries, TARGET_LANG, "text_de", overview_de)
    if child_lang == TARGET_LANG:
        # Nothing to show twice: the child reads German too.
        child_version = german_version
    else:
        child_version = _assemble(entries, child_lang, "text_child", overview_child)

    return {
        "child_version": child_version,
        "german_version": german_version,
        "usage": usage.as_dict(),
    }

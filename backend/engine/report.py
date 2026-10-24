"""Turn an approved timeline into something a child can hand to an adult.

The governing fact about this module is that the German is already settled.
By the time a timeline reaches here, each entry's `text_de` is a sentence the
child read and approved word by word, in step 3 of the journey. Writing a
report by asking a model to describe those entries would replace the child's
approved words with a paraphrase nobody approved, and the paraphrase is what
the adult would act on.

So **no part of this document is model-written**. The entries are inserted
verbatim, and everything around them - the header, the period line, the
overview of places and people, the footer - is built from fixed text and from
the entries themselves, in report_text.py.

The first draft did ask a model for a short overview, in German and in the
child's language, as two independent strings in one call. Neel caught the hole
in review on PR #19: the child can only read and approve the version in their
own language, so nothing made the German say the same thing. That put an
unapproved, unverified German paragraph in front of the adult, inside the one
document whose entire promise is that the adult reads only what the child
approved.

What the template buys:

- The two versions say the same thing by construction, so approving one is
  approving the other.
- The child's words cannot be softened, sharpened or summarised away. A test
  asserts every approved sentence appears unchanged.
- A report costs **no model calls at all**, so there is no outage to handle,
  no cost, and nothing that can drift between runs.

`report()` keeps the frozen contract signature and returns a `Report`.
"""

from engine.client import EngineError, Usage
from engine.contract import Entry, Report
from engine.report_text import (
    footer_for,
    format_date,
    header_for,
    labels_for,
    overview_for,
    place_for,
)

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

    german_version = _assemble(
        entries, TARGET_LANG, "text_de", overview_for(entries, TARGET_LANG)
    )
    if child_lang == TARGET_LANG:
        # Nothing to show twice: the child reads German too.
        child_version = german_version
    else:
        child_version = _assemble(
            entries, child_lang, "text_child", overview_for(entries, child_lang)
        )

    return {
        "child_version": child_version,
        "german_version": german_version,
        "usage": usage.as_dict(),
    }

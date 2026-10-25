"""The fixed parts of the report: labels, the header, and the limits we state.

None of this is model-generated. A report is the document a child hands to an
adult who may act on it, so the frame around their words has to be the same
every time and has to be reviewable as text.

What the frame says, and why each line is there:

- **Who wrote this.** The child did. An adult reading a tidy German document
  may assume a professional assembled it; the header says otherwise.
- **That the German was approved by the child.** The sentences are the ones
  they confirmed word by word, not a fresh translation made for this document.
- **That this is not a finding.** We never say an allegation is true. The
  report records what the child said happened, which is a different claim, and
  the footer makes that explicit so nobody reads it as an investigation.
- **That it is not a diagnosis.** CLAUDE.md: a communication tool, not a
  clinical one, and the UI has to say so.

German is the one language that must always be present, because the adult
reading the report reads German. The child's own language is added alongside
so they can check what they are handing over.

The German and Hindi wording needs a native read before submission.
"""

FALLBACK_LANG = "en"

# "Who made this and what it is." Shown at the top, before anything the child
# wrote, so an adult cannot mistake the document for a professional assessment.
HEADER = {
    "en": (
        "This report was put together by a child using an app, from notes they "
        "wrote themselves. The child chose to show it to you."
    ),
    "hi": (
        "यह रिपोर्ट एक बच्चे ने ऐप की मदद से अपने लिखे नोट्स से बनाई है। "
        "बच्चे ने खुद तय किया कि आपको यह दिखाना है।"
    ),
    "de": (
        "Diesen Bericht hat ein Kind mit einer App aus eigenen Notizen "
        "zusammengestellt. Das Kind hat selbst entschieden, ihn Ihnen zu zeigen."
    ),
}

# Said once, plainly, because it is the difference between a record and an
# accusation, and an adult deciding what to do next needs to know which it is.
FOOTER = {
    "en": (
        "What this is: a record of what the child said happened, in their own "
        "words. What it is not: a finding that it happened, a medical or "
        "psychological assessment, or advice. The German sentences are the ones "
        "the child read and approved."
    ),
    "hi": (
        "यह क्या है: बच्चे ने जो बताया कि हुआ, उसका रिकॉर्ड, उनके ही शब्दों में। "
        "यह क्या नहीं है: इसका सबूत कि ऐसा हुआ, कोई मेडिकल या मनोवैज्ञानिक आकलन, "
        "या सलाह। जर्मन वाक्य वही हैं जिन्हें बच्चे ने पढ़ा और मंज़ूर किया।"
    ),
    "de": (
        "Was das ist: eine Aufzeichnung dessen, was das Kind geschildert hat, in "
        "seinen eigenen Worten. Was es nicht ist: ein Nachweis, dass es so war, "
        "eine medizinische oder psychologische Beurteilung oder eine Empfehlung. "
        "Die deutschen Sätze sind die, die das Kind gelesen und bestätigt hat."
    ),
}

LABELS = {
    "en": {"period": "Period", "entries": "entries", "where": "Where", "who": "Who"},
    "hi": {"period": "अवधि", "entries": "प्रविष्टियाँ", "where": "कहाँ", "who": "कौन"},
    "de": {"period": "Zeitraum", "entries": "Einträge", "where": "Wo", "who": "Wer"},
}

# `Entry.place` is a short code where the UI offered one, and free text where
# the child typed their own. A code can be rendered in any language from fixed
# text, which is why the picture builder uses them.
#
# Anything not listed here is the child's own wording and is printed verbatim,
# in quotation marks, rather than translated. We have no approved translation
# for it: the child confirmed `text_de` word by word and never saw a German
# version of "the corridor by the gym". Guessing one and putting it in front of
# a teacher would be exactly the unapproved paraphrase this module avoids.
PLACES = {
    "classroom": {"en": "classroom", "hi": "कक्षा", "de": "Klassenzimmer"},
    "canteen": {"en": "canteen", "hi": "कैंटीन", "de": "Mensa"},
    "corridor": {"en": "corridor", "hi": "कॉरिडोर", "de": "Flur"},
    "schoolyard": {"en": "schoolyard", "hi": "स्कूल का मैदान", "de": "Schulhof"},
    "online": {"en": "online", "hi": "ऑनलाइन", "de": "online"},
    "toilets": {"en": "toilets", "hi": "शौचालय", "de": "Toiletten"},
    "changing_room": {"en": "changing room", "hi": "चेंजिंग रूम", "de": "Umkleide"},
    "gym": {"en": "gym", "hi": "जिम", "de": "Sporthalle"},
    "bus": {"en": "bus", "hi": "बस", "de": "Bus"},
    "way_to_school": {"en": "on the way to school", "hi": "स्कूल जाते समय", "de": "auf dem Schulweg"},
}


def place_for(place: str, lang: str) -> str:
    """A known place code in the reader's language; anything else quoted as-is."""
    known = PLACES.get(place.strip().lower().replace(" ", "_"))
    if known:
        return known.get(lang) or known[FALLBACK_LANG]
    return f'"{place}"'


def header_for(lang: str) -> str:
    return HEADER.get(lang) or HEADER[FALLBACK_LANG]


def footer_for(lang: str) -> str:
    return FOOTER.get(lang) or FOOTER[FALLBACK_LANG]


def labels_for(lang: str) -> dict[str, str]:
    return LABELS.get(lang) or LABELS[FALLBACK_LANG]


def format_date(iso_date: str, lang: str) -> str:
    """A date an adult can read, without inventing a locale we cannot check.

    German gets DD.MM.YYYY, which is what a teacher in Germany expects. Every
    other language keeps the ISO form rather than having us guess at month
    names in a language nobody on the team can proofread. Unparseable input is
    passed through untouched: a date we do not understand is still the child's
    data and must not be silently dropped.
    """
    parts = iso_date.split("-")
    if len(parts) != 3:
        return iso_date
    year, month, day = parts
    if lang == "de":
        return f"{day}.{month}.{year}"
    return iso_date


# --- the overview ------------------------------------------------------------
#
# Built from a template, never by a model, and that is the point.
#
# The first draft asked a model for the German overview and the child's
# overview in one call, as two independent strings. The child can only read and
# approve the one in their own language, so nothing made the German say the
# same thing. That put a model-written German paragraph in front of the adult
# which the child had never approved and which no verification step had seen -
# in the one document whose whole promise is that the adult reads only what the
# child approved. Neel caught it in review on PR #19.
#
# A template cannot drift from the entries, costs no call, and says the same
# thing in both versions by construction. If anyone ever reinstates a model
# here, the rules it would have to obey are: no judgement, no diagnosis, no
# label for what happened, no claim that any of it is true or doubtful, nothing
# about the child's feelings or health, and no recommendation. The reason those
# rules are hard to hold is why there is no model here.

OVERVIEW_LABELS = {
    "en": {"places": "Places", "people": "People named"},
    "hi": {"places": "स्थान", "people": "नामित लोग"},
    "de": {"places": "Orte", "people": "Genannte Personen"},
}


def _distinct(values: list[str]) -> list[str]:
    """Order-preserving dedupe on EXACT matches only.

    "two older boys" and "the two older boys" stay as two entries. Merging them
    would be us deciding they are the same people, which is an interpretation
    of the child's account and not ours to make.
    """
    seen: set[str] = set()
    out = []
    for value in values:
        if value not in seen:
            seen.add(value)
            out.append(value)
    return out


def overview_for(entries: list[dict], lang: str) -> str:
    """Where it happened and who the child named, gathered from the entries.

    Deliberately literal: it lists, it does not summarise. The count and the
    date span are already on the period line, so this adds only what that line
    does not carry.
    """
    labels = OVERVIEW_LABELS.get(lang) or OVERVIEW_LABELS[FALLBACK_LANG]
    places = _distinct([place_for(e["place"], lang) for e in entries if e.get("place")])
    # Quoted in both versions, because this is the child's own description and
    # a reader should see that it is verbatim rather than our wording.
    people = _distinct([f'"{e["people"]}"' for e in entries if e.get("people")])

    lines = []
    if places:
        lines.append(f"{labels['places']}: {', '.join(places)}")
    if people:
        lines.append(f"{labels['people']}: {', '.join(people)}")
    return "\n".join(lines)

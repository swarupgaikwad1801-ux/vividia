"""The engine contract: the shapes every engine function returns.

Agreed by Swarup, Vernika and Neel on 24 Oct 2026. The FastAPI routes in
backend/main.py depend on exactly these shapes. Change them only after all
three agree, and update mock.py in the same commit.

Language codes are ISO 639-1 ("uk", "ar", "tr", "de", ...).
"""

from typing import Literal, TypedDict


class Option(TypedDict):
    label: str  # shown to the child, in the child's language
    meaning_de: str  # what the German would say if the child picks this


class Ambiguity(TypedDict):
    phrase: str  # the phrase in the child's original text
    question: str  # asked in the child's language, e.g. "Did you mean ...?"
    options: list[Option]  # exactly 2


class TranslationResult(TypedDict):
    translation: str  # best German version
    confidence: float  # 0.0 to 1.0, agreement across the independent versions
    ambiguities: list[Ambiguity]  # empty when every version agrees
    calls_made: int  # model calls used, shown live in the UI


class Entry(TypedDict):
    date: str  # ISO date, e.g. "2026-10-21"
    mood: str  # emoji check-in code, e.g. "sad"
    text_child: str  # what the child wrote, own language
    text_de: str  # the child-approved German version
    place: str | None  # e.g. "schoolyard"
    people: str | None  # who was involved, as the child describes it


class Report(TypedDict):
    child_version: str  # in the child's language, for the child to approve
    german_version: str  # what the trusted adult reads


class SafetyResult(TypedDict):
    urgent: bool  # True: show emergency help at once (110/112, krisenchat)
    category: Literal["none", "danger", "self_harm"]
    message_child: str  # calm message in the child's language; "" when not urgent


class Resource(TypedDict):
    name: str
    contact: str  # phone number or URL
    hours: str
    languages: list[str]  # ISO 639-1 codes
    source_url: str  # where this information was verified

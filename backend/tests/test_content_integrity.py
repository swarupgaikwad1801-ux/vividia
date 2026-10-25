"""Can a child be shown a contact we never checked, or one that has drifted?

`content/helplines.json` says it is the single source of truth for every
contact the app shows, and that nothing may copy those values into another
file, because two copies of a phone number drift apart silently and a child
ends up with stale emergency information.

That is a promise about the whole repository, so it needs a test over the whole
repository rather than a comment in one file.

Two directions, and the second is the one that catches real drift.

**Forward:** no contact may be duplicated as a DATA VALUE anywhere else — a
`"contact"` field in another JSON file, or a bare string literal in code. That
is a second copy of the truth and it is forbidden.

**Reverse:** a number may appear inside child-facing or adult-facing PROSE,
because you cannot write "call the police" to a child in crisis without
naming the number. Those are allowed, and every one of them is checked against
`helplines.json`. If 110 or 116 111 ever changed, or someone mistyped one, the
prose that disagrees fails this test.

Read-only on `content/`: this file asserts, it never edits.

Offline; no model calls.
"""

import ast
import json
import re
from datetime import date, datetime
from pathlib import Path

import pytest

from engine.config import REPO_ROOT
from engine.errors import MESSAGES as ERROR_MESSAGES
from engine.resources import emergency_numbers, national_helplines

CONTENT = REPO_ROOT / "content"
BACKEND = REPO_ROOT / "backend"
HELPLINES = CONTENT / "helplines.json"

# A contact may go un-rechecked for this long before this test asks for a fresh
# look. The demo has to be correct until 15 Dec, so the window is deliberately
# shorter than the gap between now and then.
MAX_AGE_DAYS = 60

# What a German emergency or helpline number looks like in a sentence:
# 110, 112, and the 116 xxx range. Matched in prose so a stale one is caught.
NUMBER_IN_PROSE = re.compile(r"\b(11[0-9]\s?\d{3}|11[0-9])\b")


def _data() -> dict:
    return json.loads(HELPLINES.read_text(encoding="utf-8"))


def _entries() -> list[dict]:
    data = _data()
    return [*data["helplines"], *data["emergency"]]


def _contact_values() -> set[str]:
    return {entry["contact"] for entry in _entries()}


def _normalise_number(text: str) -> str:
    return re.sub(r"\s+", " ", text).strip()


def _known_numbers() -> set[str]:
    """Contact values that are phone numbers rather than URLs."""
    return {
        _normalise_number(value)
        for value in _contact_values()
        if not value.startswith("http")
    }


def _json_files() -> list[Path]:
    return sorted(CONTENT.glob("*.json"))


def _strings_in_json(node, key_path="") -> list[tuple[str, str]]:
    """Every string value in a JSON tree, with the key path that reached it."""
    found: list[tuple[str, str]] = []
    if isinstance(node, dict):
        for key, value in node.items():
            found += _strings_in_json(value, f"{key_path}.{key}" if key_path else str(key))
    elif isinstance(node, list):
        for index, value in enumerate(node):
            found += _strings_in_json(value, f"{key_path}[{index}]")
    elif isinstance(node, str):
        found.append((key_path, node))
    return found


# --- every contact is checked, and says when ---------------------------------


def test_the_single_source_of_truth_exists_and_says_when_it_was_verified():
    data = _data()
    assert data.get("verified_on"), "helplines.json does not say when it was verified"
    assert data["helplines"], "no helplines at all"
    assert data["emergency"], "no emergency numbers at all"


@pytest.mark.parametrize("field", ["name", "contact", "hours", "languages", "source_url", "id"])
def test_every_contact_carries_the_fields_the_ui_shows(field):
    for entry in _entries():
        assert entry.get(field), f"{entry.get('id', entry.get('name'))} has no {field}"


def test_every_contact_says_where_it_was_verified():
    """The UI prints the source, so a child is never shown an unsourced number."""
    for entry in _entries():
        assert entry["source_url"].startswith("https://"), (
            f"{entry['id']} has no https source_url"
        )


def test_every_contact_says_when_it_was_checked():
    for entry in _entries():
        checked = entry.get("checked_on")
        assert checked, f"{entry['id']} has no checked_on date"
        parsed = datetime.strptime(checked, "%Y-%m-%d").date()
        assert parsed <= date.today(), f"{entry['id']} is checked_on a future date"


def test_no_contact_has_gone_stale():
    """CLAUDE.md: the demo must work for judges until 15 Dec. A number nobody
    has looked at since October is not something to put in front of a child."""
    stale = []
    for entry in _entries():
        # A missing or unparseable date is the other test's finding; raising a
        # KeyError here would just bury it under a second, uglier failure.
        checked = entry.get("checked_on")
        if not checked:
            continue
        try:
            parsed = datetime.strptime(checked, "%Y-%m-%d").date()
        except ValueError:
            continue
        age = (date.today() - parsed).days
        if age > MAX_AGE_DAYS:
            stale.append(f"{entry['id']} last checked {age} days ago")
    assert not stale, (
        "re-check these against their source_url and update checked_on: " + "; ".join(stale)
    )


def test_every_contact_declares_the_languages_it_works_in():
    """A child may otherwise be told to call a number where nobody can speak
    to them. The UI prints this, it does not hide it."""
    for entry in _entries():
        assert isinstance(entry["languages"], list) and entry["languages"]
        for code in entry["languages"]:
            assert re.fullmatch(r"[a-z]{2}", code), f"{entry['id']}: odd language code {code!r}"


def test_contact_ids_are_unique():
    ids = [entry["id"] for entry in _entries()]
    assert len(ids) == len(set(ids)), f"duplicate contact id in {ids}"


# --- what the crisis screen refers to must exist -----------------------------


def test_every_id_the_crisis_wording_refers_to_exists():
    """safety_messages.json holds wording and refers to contacts by id. Any id
    it names must resolve, or the crisis screen renders a blank contact."""
    messages = json.loads((CONTENT / "safety_messages.json").read_text(encoding="utf-8"))
    known = {entry["id"] for entry in _entries()}

    referenced: set[str] = set()
    for key_path, value in _strings_in_json(messages):
        # Any key that names an id reference, now or later: contact_id,
        # contact_ids[0], ids[2], and so on.
        if re.search(r"(^|\.)(contact_id|contact_ids|id|ids)(\[\d+\])?$", key_path):
            referenced.add(value)

    missing = referenced - known
    assert not missing, f"safety_messages.json refers to unknown contact ids: {sorted(missing)}"


def test_the_sections_the_safety_code_reads_are_both_populated():
    """engine/safety.py maps "danger" to the emergency section and everything
    else to the helplines section. Either being empty means a child in crisis
    is shown nothing."""
    assert emergency_numbers(), "contacts_for('danger') would return nothing"
    assert national_helplines(), "contacts_for('self_harm') would return nothing"


# --- forward: no second copy of a contact as a data value --------------------


def test_no_other_content_file_holds_a_contact_value():
    contacts = _contact_values()
    offenders = []
    for path in _json_files():
        if path == HELPLINES:
            continue
        data = json.loads(path.read_text(encoding="utf-8"))
        for key_path, value in _strings_in_json(data):
            leaf = key_path.split(".")[-1].split("[")[0]
            if leaf in {"contact", "phone", "number", "tel", "url"} and value in contacts:
                offenders.append(f"{path.name}:{key_path}")
    assert not offenders, (
        "these hold a copy of a contact that belongs only in helplines.json: "
        + ", ".join(offenders)
    )


def test_no_python_file_holds_a_contact_as_a_bare_string_literal():
    """A literal equal to a whole contact value is a second copy of the truth.

    Tests are exempt: pinning an expected value is what a test is for, and a
    test that drifts fails loudly instead of misinforming a child.
    """
    contacts = _contact_values()
    offenders = []
    for path in sorted(BACKEND.rglob("*.py")):
        if "tests" in path.parts:
            continue
        tree = ast.parse(path.read_text(encoding="utf-8"), filename=str(path))
        for node in ast.walk(tree):
            if isinstance(node, ast.Constant) and isinstance(node.value, str):
                if _normalise_number(node.value) in contacts:
                    offenders.append(
                        f"{path.relative_to(REPO_ROOT)}:{node.lineno} -> {node.value!r}"
                    )
    assert not offenders, (
        "read these from content/helplines.json instead of copying them: "
        + "; ".join(offenders)
    )


# --- reverse: prose may name a number, and it has to be the right one -------


def test_every_number_in_child_facing_content_is_a_verified_contact():
    """The anti-drift check. Prose like "call 110" is fine and necessary, but
    if helplines.json ever changes, or someone mistypes a number, the sentence
    that disagrees with the source of truth fails here."""
    known = _known_numbers()
    wrong = []
    for path in _json_files():
        if path == HELPLINES:
            continue
        data = json.loads(path.read_text(encoding="utf-8"))
        for key_path, value in _strings_in_json(data):
            leaf = key_path.split(".")[-1].split("[")[0]
            if leaf.startswith("_") or leaf in {"source_url", "url"}:
                continue
            for found in NUMBER_IN_PROSE.findall(value):
                if _normalise_number(found) not in known:
                    wrong.append(f"{path.name}:{key_path} says {found!r}")
    assert not wrong, (
        "these name a number that is not in helplines.json: " + "; ".join(wrong)
    )


def test_every_number_in_a_child_facing_error_message_is_a_verified_contact():
    """engine/errors.py names krisenchat and a helpline when the demo is out of
    credit, because a retry would be a lie and the child still needs somewhere
    to go. That sentence is prose, so it is allowed to name the number, and it
    is checked here against the source of truth."""
    known = _known_numbers()
    wrong = []
    for code, by_lang in ERROR_MESSAGES.items():
        for lang, message in by_lang.items():
            for found in NUMBER_IN_PROSE.findall(message):
                if _normalise_number(found) not in known:
                    wrong.append(f"{code}/{lang} says {found!r}")
    assert not wrong, (
        "these error messages name a number that is not in helplines.json: "
        + "; ".join(wrong)
    )


def test_a_drifted_number_would_actually_be_caught():
    """Proof the reverse check works, rather than passing because it finds
    nothing. If this stops failing, the regex has stopped matching."""
    known = _known_numbers()
    assert known, "no phone-shaped contacts found at all; the check is inert"

    pretend_prose = "If someone can hurt you right now, call 119."
    found = [
        number
        for number in NUMBER_IN_PROSE.findall(pretend_prose)
        if _normalise_number(number) not in known
    ]
    assert found == ["119"], "a wrong number in prose would not be noticed"


def test_the_prose_check_covers_the_files_that_actually_name_numbers():
    """Guards against the check quietly going inert: at least one real content
    file does name a number, so the scan has something to verify."""
    naming = []
    for path in _json_files():
        if path == HELPLINES:
            continue
        text = path.read_text(encoding="utf-8")
        if NUMBER_IN_PROSE.search(text):
            naming.append(path.name)
    assert naming, "no content file names a number; is this test still scanning anything?"

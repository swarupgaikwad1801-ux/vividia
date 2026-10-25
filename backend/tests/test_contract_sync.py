"""Can a backend change silently break Vernika's screens?

`schemas.py` says it is "mirrored exactly in frontend/src/types/api.ts" and
that both change in the same commit. Nothing enforced that. Renaming a field
in Python, or widening `int` to `float`, would leave the TypeScript compiling
happily against a shape the server no longer sends, and the first person to
find out would be a judge clicking through the demo.

So this reads the Pydantic models by introspection, parses `api.ts`, and
compares them field by field.

Direction and strictness
------------------------
The contract is the server's output, so the checks are asymmetric on purpose:

- A field in `schemas.py` that is **missing** from `api.ts` fails. The screens
  cannot use what they do not know about.
- A field whose **type disagrees** fails, in either direction.
- A field **required** in Python but optional (`?`) in TypeScript fails: the
  client could omit something the server demands.
- A field optional in Python but required in TypeScript is **allowed**. A
  response model with a default still always serialises that field, so the
  frontend is right to rely on it. `Safety.message_child` is exactly this.
- A field in `api.ts` with no counterpart in Python fails separately, because
  the screens would be waiting for something the server never sends.

Read-only on `frontend/`: this file parses `api.ts`, it never edits it.

Offline; no model calls.
"""

import enum
import re
import types
import typing

import pytest
from pydantic import BaseModel

from app import schemas
from engine.config import REPO_ROOT

API_TS = REPO_ROOT / "frontend" / "src" / "types" / "api.ts"


# --- canonical type strings, so both sides can be compared as text ----------


def _union(parts: list[str]) -> str:
    """Flatten and sort a union, so member order can never cause a failure.

    Empty pieces are dropped: TypeScript allows a leading `|` on a multi-line
    union, which api.ts uses for ErrorCode, and splitting that yields an empty
    first member that is not a type.
    """
    flat: set[str] = set()
    for part in parts:
        flat.update(piece.strip() for piece in part.split("|") if piece.strip())
    return " | ".join(sorted(flat))


def _quote(value) -> str:
    return f'"{value}"'


def canon_py(annotation) -> str:
    """A Pydantic annotation as the TypeScript it ought to be."""
    origin = typing.get_origin(annotation)
    args = typing.get_args(annotation)

    if annotation is str:
        return "string"
    if annotation in (int, float):
        return "number"
    if annotation is bool:
        return "boolean"
    if annotation is type(None):
        return "null"
    if isinstance(annotation, type) and issubclass(annotation, enum.Enum):
        return _union([_quote(member.value) for member in annotation])
    if origin is typing.Literal:
        return _union([_quote(arg) for arg in args])
    if origin in (list, set, tuple):
        return f"{canon_py(args[0])}[]"
    if origin is dict:
        return f"Record<{canon_py(args[0])}, {canon_py(args[1])}>"
    if origin in (typing.Union, types.UnionType):
        return _union([canon_py(arg) for arg in args])
    if isinstance(annotation, type) and issubclass(annotation, BaseModel):
        return annotation.__name__
    raise AssertionError(
        f"canon_py does not know how to map {annotation!r}. Teach it, rather "
        "than loosening the comparison."
    )


# --- reading api.ts ----------------------------------------------------------


def _without_comments(source: str) -> str:
    source = re.sub(r"/\*.*?\*/", "", source, flags=re.DOTALL)
    return re.sub(r"//[^\n]*", "", source)


def ts_aliases(source: str) -> dict[str, str]:
    return {
        name: " ".join(body.split())
        for name, body in re.findall(
            r"export\s+type\s+(\w+)\s*=\s*(.*?);", source, flags=re.DOTALL
        )
    }


def ts_interfaces(source: str) -> dict[str, dict[str, tuple[str, bool]]]:
    """{interface: {field: (raw type, optional)}}"""
    found: dict[str, dict[str, tuple[str, bool]]] = {}
    for name, body in re.findall(
        r"export\s+interface\s+(\w+)\s*\{(.*?)\n\}", source, flags=re.DOTALL
    ):
        fields: dict[str, tuple[str, bool]] = {}
        for field, optional, raw in re.findall(r"(\w+)\s*(\??)\s*:\s*([^;]+);", body):
            fields[field] = (" ".join(raw.split()), optional == "?")
        found[name] = fields
    return found


def canon_ts(raw: str, aliases: dict[str, str], interfaces: set[str]) -> str:
    """Resolve aliases to their union, leave interface names alone."""
    raw = " ".join(raw.split())
    if raw in interfaces:
        return raw
    if raw in aliases:
        return canon_ts(aliases[raw], aliases, interfaces)
    if "|" in raw:
        return _union(
            [canon_ts(part.strip(), aliases, interfaces) for part in raw.split("|")]
        )
    if raw.endswith("[]"):
        return canon_ts(raw[:-2].strip(), aliases, interfaces) + "[]"
    return raw


# --- the two sides -----------------------------------------------------------


def py_models() -> dict[str, type[BaseModel]]:
    """The models defined in schemas.py, excluding re-exported aliases.

    `ClarifyResponse = TranslateResponse` is an assignment, so it appears in
    the module under a name that is not its class name. api.ts expresses the
    same thing as a type alias rather than a second interface, and the two are
    compared by test_response_aliases_match instead.
    """
    return {
        name: obj
        for name, obj in vars(schemas).items()
        if isinstance(obj, type)
        and issubclass(obj, BaseModel)
        and obj is not BaseModel
        and obj.__module__ == schemas.__name__
        and obj.__name__ == name
    }


def py_model_aliases() -> dict[str, str]:
    """{alias name: the model it points at}, e.g. ClarifyResponse -> TranslateResponse."""
    return {
        name: obj.__name__
        for name, obj in vars(schemas).items()
        if isinstance(obj, type)
        and issubclass(obj, BaseModel)
        and obj.__module__ == schemas.__name__
        and obj.__name__ != name
    }


def py_enums() -> dict[str, type[enum.Enum]]:
    return {
        name: obj
        for name, obj in vars(schemas).items()
        if isinstance(obj, type) and issubclass(obj, enum.Enum) and obj.__module__ == schemas.__name__
    }


SOURCE = _without_comments(API_TS.read_text(encoding="utf-8"))
ALIASES = ts_aliases(SOURCE)
INTERFACES = ts_interfaces(SOURCE)
NAMES = set(INTERFACES)

MODELS = py_models()
MODEL_ALIASES = py_model_aliases()
ENUMS = py_enums()


# --- the parser is doing something ------------------------------------------


def test_api_ts_was_actually_parsed():
    """If the regexes stop matching, every comparison below would pass by
    finding nothing. This is the guard against a silently inert test."""
    assert len(INTERFACES) >= 10, f"only parsed {len(INTERFACES)} interfaces"
    assert "TranslateResponse" in INTERFACES
    assert INTERFACES["TranslateResponse"], "parsed TranslateResponse with no fields"
    assert "Strategy" in ALIASES


def test_every_model_has_a_typescript_counterpart():
    missing = sorted(name for name in MODELS if name not in NAMES)
    assert not missing, (
        "these models have no interface in api.ts, so the screens cannot use "
        f"them: {missing}"
    )


# --- field by field ----------------------------------------------------------


@pytest.mark.parametrize("model_name", sorted(MODELS))
def test_every_field_exists_in_typescript(model_name):
    model = MODELS[model_name]
    ts_fields = INTERFACES.get(model_name, {})
    missing = [field for field in model.model_fields if field not in ts_fields]
    assert not missing, f"{model_name} is missing {missing} in api.ts"


@pytest.mark.parametrize("model_name", sorted(MODELS))
def test_every_field_has_the_same_type_in_typescript(model_name):
    model = MODELS[model_name]
    ts_fields = INTERFACES.get(model_name, {})
    wrong = []
    for field, info in model.model_fields.items():
        if field not in ts_fields:
            continue  # the test above reports this
        expected = canon_py(info.annotation)
        actual = canon_ts(ts_fields[field][0], ALIASES, NAMES)
        if expected != actual:
            wrong.append(f"{field}: python says {expected!r}, api.ts says {actual!r}")
    assert not wrong, f"{model_name} disagrees: " + "; ".join(wrong)


@pytest.mark.parametrize("model_name", sorted(MODELS))
def test_nothing_required_by_the_server_is_optional_in_typescript(model_name):
    """The other direction is fine: a response field with a default is still
    always sent, so api.ts is right to mark it required."""
    model = MODELS[model_name]
    ts_fields = INTERFACES.get(model_name, {})
    loose = [
        field
        for field, info in model.model_fields.items()
        if info.is_required() and ts_fields.get(field, ("", False))[1]
    ]
    assert not loose, (
        f"{model_name}: {loose} are required by the server but optional in "
        "api.ts, so a screen could leave them out"
    )


@pytest.mark.parametrize("model_name", sorted(MODELS))
def test_typescript_does_not_expect_fields_the_server_never_sends(model_name):
    model = MODELS[model_name]
    extra = sorted(set(INTERFACES.get(model_name, {})) - set(model.model_fields))
    assert not extra, (
        f"api.ts expects {extra} on {model_name}, which the server does not "
        "send; the screens would wait for data that never arrives"
    )


# --- enums -------------------------------------------------------------------


@pytest.mark.parametrize("alias", sorted(MODEL_ALIASES) or [None])
def test_response_aliases_match(alias):
    """`ClarifyResponse = TranslateResponse` on both sides, or the client could
    build a clarify screen against a shape that has quietly diverged."""
    if alias is None:
        pytest.skip("schemas.py defines no response aliases")

    assert alias in ALIASES, f"{alias} has no type alias in api.ts"
    assert " ".join(ALIASES[alias].split()) == MODEL_ALIASES[alias], (
        f"{alias} points at {MODEL_ALIASES[alias]} in python but "
        f"{ALIASES[alias]!r} in api.ts"
    )


@pytest.mark.parametrize("enum_name", sorted(ENUMS))
def test_every_enum_has_the_same_members_in_typescript(enum_name):
    """A new ErrorCode with no TypeScript member means the client cannot
    recognise the failure it is being told about."""
    assert enum_name in ALIASES, f"{enum_name} has no type alias in api.ts"

    expected = _union([_quote(member.value) for member in ENUMS[enum_name]])
    actual = canon_ts(ALIASES[enum_name], ALIASES, NAMES)
    assert expected == actual, (
        f"{enum_name}: python has {expected}, api.ts has {actual}"
    )


# --- proof the comparison can fail ------------------------------------------


def test_a_renamed_field_would_be_noticed():
    """Mutation check, in-memory: the comparison must actually be able to fail,
    otherwise every test above passes for the wrong reason."""
    pretend = {field: value for field, value in INTERFACES["Usage"].items()}
    pretend.pop("calls_made")

    missing = [field for field in schemas.Usage.model_fields if field not in pretend]

    assert missing == ["calls_made"]


def test_a_retyped_field_would_be_noticed():
    assert canon_py(schemas.Usage.model_fields["calls_made"].annotation) == "number"
    assert canon_ts("string", ALIASES, NAMES) != "number"


def test_the_union_comparison_ignores_order_but_not_content():
    assert _union(['"a" | "b"']) == _union(['"b" | "a"'])
    assert _union(['"a" | "b"']) != _union(['"a" | "c"'])

"""Does every function in `engine/live.py` reach for a name that exists?

`live.py` is a table of one-line delegations - `report()` calls `_report()`,
`translate()` calls `_translate()` - and each of those names arrives from an
import at the top of the file. Python looks a global up when the line runs,
not when the module loads, so a missing import is a module that imports
cleanly, a `/api/health` that still answers "live", and a `NameError` the
first time a child presses the button.

That is exactly what happened: `report`'s import was lost in the #19 merge, so
`POST /api/report` returned HTTP 500 in live mode while the suite stayed green,
because every other test runs against the mock. Neel found it by pointing the
app at his own live backend.

So the first test below does not test behaviour. It reads each delegate's
bytecode for the global names it mentions and checks they are all defined -
the one check that fails for the whole class of mistake, including the next
module Swarup or Neel wires up. The second test calls `report` through
`live.py` for real, which needs no key and no network: a report is assembled
from the child's own approved sentences and costs zero model calls.
"""

import builtins
import dis
import inspect

import pytest

from engine import live
from engine.contract import Report

# The delegation surface main.py imports. Named explicitly rather than
# discovered, so deleting one here is a visible decision.
DELEGATES = [
    "translate",
    "report",
    "safety_check",
    "resources",
    "resources_with_source",
]


@pytest.mark.parametrize("name", DELEGATES)
def test_every_delegate_resolves_the_names_it_calls(name):
    function = getattr(live, name)
    assert inspect.iscoroutinefunction(function), f"{name} should stay async"

    # LOAD_GLOBAL only, not co_names: co_names also holds attribute names,
    # which are looked up on an object and have nothing to do with imports.
    reached_for = {
        instruction.argval
        for instruction in dis.get_instructions(function)
        if instruction.opname == "LOAD_GLOBAL"
    }
    missing = sorted(
        name
        for name in reached_for
        if name not in vars(live) and not hasattr(builtins, name)
    )
    assert not missing, (
        f"live.{name} calls {missing}, which live.py never imports. "
        "The module still loads; the route fails on the first request."
    )


@pytest.mark.parametrize("child_lang", ["hi", "de"])
@pytest.mark.asyncio
async def test_report_through_live_returns_a_card_and_spends_nothing(child_lang):
    entries = [
        {
            "id": "e1",
            "date": "2026-10-20",
            "text_child": "उसने मेरा टिफ़िन फेंक दिया",
            "text_de": "Er hat meine Brotdose weggeworfen",
            "place": "schoolyard",
        }
    ]

    result: Report = await live.report(entries, child_lang)

    # The adult's version always exists, and the child's sentence survives
    # verbatim - the promise the whole module is built on.
    assert "Brotdose" in result["german_version"]
    assert result["child_version"]
    if child_lang != "de":
        assert entries[0]["text_child"] in result["child_version"]

    # A card is template text around the child's own words, so it must not
    # cost a single call. If this number moves, someone has put a model back
    # in front of the adult.
    assert result["usage"]["calls_made"] == 0

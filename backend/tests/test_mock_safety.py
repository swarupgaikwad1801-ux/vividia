"""The mock's crisis keywords (engine/mock.py), which run in mock mode only.

The mock cannot read meaning, so it must stay narrow: it should catch the
plain, reported threats below and stay quiet on everyday exaggeration, the
same MUST_NOT_FIRE list the live classifier is held to (test_safety.py).

28 Oct: "he said he would kill me after school" and "He said he will bring
a knife tomorrow" both came back "none" in mock mode, while safety.py's own
prompt names the first as danger and test_safety.py lists the second as
MUST_FIRE. A judge on a mock deploy typing either saw no help offered.
"""

import pytest

from engine import mock
from tests.test_safety import MUST_NOT_FIRE

REPORTED_THREATS = [
    ("he said he would kill me after school", "en"),
    ("He said he will bring a knife tomorrow and wait for me.", "en"),
    ("they told me they will beat me up at the bus stop", "en"),
    ("She threatened to stab me", "en"),
    ("They won't let me out of the toilets", "en"),
    ("Er hat gesagt, er wird mich umbringen.", "de"),
    ("Sie lassen mich nicht raus.", "de"),
    ("usne kaha ki kal mujhe maar dalega", "hi"),
    ("उसने कहा कल वो मुझे मार डालेगा", "hi"),
    ("उसने कहा कल वो चाकू लेकर आएगा।", "hi"),
]

STILL_SELF_HARM = [
    ("I want to die", "en"),
    ("ich will nicht mehr leben", "de"),
    ("I want to kill myself", "en"),
]


@pytest.mark.parametrize("text,lang", REPORTED_THREATS)
@pytest.mark.asyncio
async def test_reported_threats_offer_help(text, lang):
    result = await mock.safety_check(text, lang)
    assert result["urgent"] is True, text
    assert result["category"] == "danger", text
    assert result["message_child"]


@pytest.mark.parametrize("text,lang", STILL_SELF_HARM)
@pytest.mark.asyncio
async def test_self_harm_is_still_self_harm(text, lang):
    result = await mock.safety_check(text, lang)
    assert result["category"] == "self_harm", text


@pytest.mark.parametrize("text,lang", MUST_NOT_FIRE)
@pytest.mark.asyncio
async def test_everyday_exaggeration_stays_quiet_in_mock_too(text, lang):
    result = await mock.safety_check(text, lang)
    assert result["category"] == "none", f"false alarm on: {text}"

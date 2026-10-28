"""The fixed crisis rules: a second, independent check beside the model.

Two places use them:

- **mock.py**, as the only check: the mock reads no meaning.
- **safety.py**, as a cross-check on the live model. If the model says "none"
  (or fails) but a rule here matches, the child is still offered help. The
  model judges meaning, and is right about "my mum will kill me"; the rules
  are narrow enough to be right about "he said he would kill me" even on a
  day the model gets it wrong or is down. Either check can raise the prompt;
  neither can lower the other.

Safety.py's rule 3 still holds: a false alarm is not free. So every pattern
here is narrow, and both callers are held to test_safety.py's MUST_NOT_FIRE
list (tests/test_mock_safety.py, tests/test_safety_crosscheck.py). Bare
"kill me" is deliberately absent: it is the phrase children use when they
mean nothing of the kind.

These never generate words: the message still comes from
content/safety_messages.json via safety.message_for().
"""

import re

CRISIS: dict[str, list[str]] = {
    # Danger first: "er hat gesagt, er will mich umbringen" is someone else's
    # threat, and must not be read as the self-harm "mich umbringen".
    "danger": [
        r"\b(has|had|have|with|brought|bring|bringing|bringt|mitbringen)\s+(a|ein|einen)\s+(knife|gun|messer|waffe)",
        r"\bweapon\b",
        r"\bmesser\b",
        r"चाकू",  # chaaku : knife
        # A threat someone else MADE, reported by the child. "said ... kill
        # me" is narrow on purpose: "my mum will kill me" has no "said".
        r"\b(said|says|told me|tells me|threatened|threatens)\b.{0,40}\b(kill|stab|shoot|beat|hurt)\s+(me|me up)\b",
        r"\b(gesagt|sagt|droht|gedroht)\b.{0,40}\b(umbringen|abstechen|erstechen|zusammenschlagen|verprügeln)\b",
        r"\b(kaha|bola|boli|bole)\b.{0,40}\bmaar\s+(dalega|dalegi|dalenge|dega|degi|denge)\b",
        r"(कहा|बोला|बोली).{0,40}मार\s*(डालेगा|डालेगी|डालेंगे|देगा|देंगे)",
        # Being held somewhere right now.
        r"\bwon'?t let me (out|leave|go home)\b",
        r"\blassen mich nicht (raus|gehen)\b",
    ],
    "self_harm": [
        r"kill myself",
        r"want to die",
        r"wanna die",
        r"end my life",
        r"hurt myself",
        r"cut myself",
        r"don'?t want to live",
        r"nicht mehr leben",
        r"umbringen",
        r"मरना चाह",  # marna chah- : want to die
        r"खुद को मार",  # khud ko maar- : hurt myself
    ],
}

PATTERNS = {
    category: [re.compile(pattern, re.IGNORECASE | re.UNICODE) for pattern in patterns]
    for category, patterns in CRISIS.items()
}


def rule_category(text: str) -> str | None:
    """"danger", "self_harm", or None when no fixed rule matches."""
    for category, patterns in PATTERNS.items():
        if any(pattern.search(text) for pattern in patterns):
            return category
    return None

"""When two agreeing passes are trusted, and when they are not.

Strategy C (adaptive) stops after two passes when they agree. 28 Oct: that
second opinion is now only trusted when nothing else says the sentence needs
more: the risk markers cover German and Hindi (Roman and Devanagari) as well
as English, and a number the agreed German dropped sends the sentence to the
full verification. No live call: the passes are faked.
"""

import pytest

import engine.translate as tr

RISKY = [
    ("usne mujhe zabardasti paise dene ko kaha", "Hinglish: forced"),
    ("woh mujhe roz maarta hai", "Hinglish: hits me"),
    ("kisi ko mat batana warna dekh lena", "Hinglish: don't tell"),
    ("उसने मुझे धक्का दिया", "Devanagari: pushed"),
    ("मुझे डर लगता है", "Devanagari: afraid"),
    ("Er hat mich gezwungen, ihm mein Geld zu geben.", "German: forced"),
    ("Niemand spricht mit mir.", "German: nobody"),
    ("Sie haben mich geschubst.", "German: pushed"),
    ("They made me give them my money.", "English, unchanged"),
]

PLAIN = [
    "Today we had maths and then sport.",
    "Heute hatten wir Mathe und dann Sport.",
    "aaj humne maths padha aur phir khela",
    "आज हमने गणित पढ़ा",
    "They took my bag again.",
]


@pytest.mark.parametrize("text,why", RISKY)
def test_risky_sentences_are_flagged_in_every_shipped_language(text, why):
    assert tr.looks_risky(text), why


@pytest.mark.parametrize("text", PLAIN)
def test_everyday_sentences_are_not(text):
    assert not tr.looks_risky(text), text


@pytest.mark.parametrize(
    "source,output,lost",
    [
        ("They took 5 euros", "Sie haben 5 Euro genommen", False),
        ("They took 5 euros", "Sie haben Geld genommen", True),
        ("3 times this week", "dreimal diese Woche", True),
        ("no numbers here", "keine Zahlen hier", False),
        ("उसने ५ रुपये लिए", "Er hat 5 Rupien genommen", False),
        ("since 2 weeks, 10 times", "seit 2 Wochen, 10 Mal", False),
    ],
)
def test_numbers_lost(source, output, lost):
    assert tr.numbers_lost(source, output) is lost


async def _run_adaptive(monkeypatch, text, passes):
    """Run strategy C with fixed pass outputs; report whether it escalated."""
    answers = iter(passes)

    async def fake_pass(*args, **kwargs):
        return next(answers, passes[-1])

    escalated = {"verify": False}

    async def fake_verify(text, candidates, *args, **kwargs):
        escalated["verify"] = True
        return {"translation": candidates[0], "confidence": 0.9, "ambiguities": []}

    async def no_ambiguity(*args, **kwargs):
        return None

    monkeypatch.setattr(tr, "_one_pass", fake_pass)
    monkeypatch.setattr(tr, "_verify", fake_verify)
    monkeypatch.setattr(tr, "_find_ambiguity", no_ambiguity)
    await tr.translate(text, "en", strategy=tr.ADAPTIVE)
    return escalated["verify"]


@pytest.mark.asyncio
async def test_agreeing_passes_that_drop_a_number_are_verified(monkeypatch):
    assert await _run_adaptive(monkeypatch, "They took my bag 3 times", ["Sie haben meine Tasche genommen."] * 2)


@pytest.mark.asyncio
async def test_agreeing_passes_that_keep_the_number_stop_early(monkeypatch):
    assert not await _run_adaptive(monkeypatch, "We had 3 lessons today", ["Wir hatten heute 3 Stunden."] * 2)


@pytest.mark.asyncio
async def test_a_risky_hinglish_sentence_is_verified_even_when_passes_agree(monkeypatch):
    assert await _run_adaptive(
        monkeypatch,
        "usne mujhe zabardasti paise dene ko kaha",
        ["Er hat mich gezwungen, ihm Geld zu geben."] * 2,
    )

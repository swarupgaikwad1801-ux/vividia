"""Turn any failure into something calm, in the child's own language.

A child who has just written down the worst thing that happened to them must
never meet a stack trace, an HTTP code, or the word "token". They get one calm
sentence in their language and a way forward.

Three rules shape the copy below.

1. **Say what is still true, and nothing more.** "Your words are still here" is
   true: the text is in the browser and nothing about the failure removed it.
   "This keeps you safe" is never said, and nor is anything about history or
   deletion that quick exit cannot actually do (CLAUDE.md, the privacy rules).

2. **Never imply the child did something wrong.** A model timeout is our
   problem. The copy says so, in the plainest words available.

3. **A dead translation is not a dead app.** When the failure is one a retry
   cannot fix, the message still points at people the child can reach, because
   help does not depend on us being up.

`message` (for logs) and `message_child` (for the child) are deliberately
separate strings. The developer one may name the model and the status code; the
child one must contain neither, and a test enforces that.

The German and Hindi wording below needs a native read before submission. Neel
owns child-facing copy in content/; this lives here because it is produced by
engine failures, and it should move to content/ if Neel would rather own it.
"""

import traceback

from engine.client import EngineError

# ISO 639-1 codes we ship copy for. "en" is the fallback for anything else,
# because a child with no copy in their language must still get a sentence
# rather than a blank screen.
LANGS = ("en", "hi", "de")

FALLBACK_LANG = "en"

# code -> lang -> what the child reads.
MESSAGES: dict[str, dict[str, str]] = {
    "upstream_timeout": {
        "en": "That is taking longer than it should. Your words are still here. Do you want to try again?",
        "hi": "इसमें ज़्यादा समय लग रहा है। तुम्हारे शब्द यहीं हैं। फिर कोशिश करनी है?",
        "de": "Das dauert länger als es sollte. Deine Worte sind noch da. Willst du es nochmal versuchen?",
    },
    "upstream_unavailable": {
        "en": "Something on our side is not working right now. Your words are still here. Try again in a moment.",
        "hi": "हमारी तरफ़ कुछ काम नहीं कर रहा है। तुम्हारे शब्द यहीं हैं। थोड़ी देर में फिर कोशिश करो।",
        "de": "Bei uns funktioniert gerade etwas nicht. Deine Worte sind noch da. Versuch es gleich nochmal.",
    },
    "rate_limited": {
        "en": "A lot of people are using this right now. Wait a moment, then try again. Your words are still here.",
        "hi": "अभी बहुत लोग इसका इस्तेमाल कर रहे हैं। थोड़ा रुककर फिर कोशिश करो। तुम्हारे शब्द यहीं हैं।",
        "de": "Gerade benutzen viele Leute die App. Warte einen Moment und versuch es nochmal. Deine Worte sind noch da.",
    },
    # Not retryable: the translation is down until a person tops up the account.
    # So this one names the people a child can still reach.
    # This is the sentence a child reads at the one moment the app cannot
    # translate for them, so it is also the one place that bypasses
    # languageNote() and ContactCard - the copy is baked in here rather than
    # rendered from helplines.json. CLAUDE.md: "the crisis screen must print
    # each service's languages; hiding this is worse than the gap itself".
    # 116 111 is ["de"] and krisenchat is ["de", "uk"], so neither answers in
    # Hindi, and neither answers in English either. Saying so costs one clause
    # and stops a child spending their one attempt at asking for help on a
    # line that cannot talk to them. The German version needs no clause.
    "credit_exhausted": {
        "en": "The translation is not working today. Your words are still here. You can write to a person any time at krisenchat.de, or call 116 111. Both of them answer in German.",
        "hi": "आज अनुवाद काम नहीं कर रहा है। तुम्हारे शब्द यहीं हैं। तुम krisenchat.de पर किसी से लिखकर बात कर सकते हो, या 116 111 पर कॉल कर सकते हो। ये दोनों जर्मन में बात करते हैं।",
        "de": "Die Übersetzung funktioniert heute nicht. Deine Worte sind noch da. Du kannst jederzeit auf krisenchat.de mit jemandem schreiben oder 116 111 anrufen.",
    },
    "invalid_input": {
        "en": "That did not go through. Can you try writing it again?",
        "hi": "यह भेजा नहीं जा सका। क्या तुम इसे फिर से लिख सकते हो?",
        "de": "Das hat nicht geklappt. Kannst du es nochmal schreiben?",
    },
    "internal": {
        "en": "Something went wrong on our side. Your words are still here, and nothing was shared with anyone.",
        "hi": "हमारी तरफ़ कुछ गड़बड़ हो गई। तुम्हारे शब्द यहीं हैं, और किसी को कुछ नहीं भेजा गया।",
        "de": "Bei uns ist etwas schiefgelaufen. Deine Worte sind noch da, und es wurde nichts an jemanden weitergegeben.",
    },
}

# Which HTTP status each code answers with, and whether the client should offer
# a retry button. Kept beside the copy so the two cannot drift apart.
HTTP_STATUS = {
    "upstream_timeout": 504,
    "upstream_unavailable": 503,
    "rate_limited": 429,
    "credit_exhausted": 503,
    "invalid_input": 422,
    "internal": 500,
}

RETRYABLE = {
    "upstream_timeout": True,
    "upstream_unavailable": True,
    "rate_limited": True,
    "credit_exhausted": False,
    "invalid_input": False,
    "internal": False,
}


def message_for(code: str, lang: str) -> str:
    """The calm sentence for this failure, in the child's language."""
    copy = MESSAGES.get(code) or MESSAGES["internal"]
    return copy.get(lang) or copy[FALLBACK_LANG]


def safe_traceback(error: BaseException) -> str:
    """Where it broke, without what it broke on.

    `traceback.format_exception` ends with the exception's own text, and
    `log.exception` prints the same thing. Either would put an arbitrary
    exception's message in the log, and an exception's message can contain
    whatever was passed to it, up to and including the child's disclosure.
    `format_tb` gives the frames only: our files, lines and source, which never
    hold a child's words.
    """
    return "".join(traceback.format_tb(error.__traceback__))


def to_error_response(error: BaseException, lang: str) -> dict:
    """Map any exception to an ErrorResponse body.

    An EngineError already knows what went wrong and whether a retry is worth
    offering, so its code and its message are used as-is: those messages are
    written in our own source and carry nothing about the child.

    Any other exception contributes its TYPE and nothing else. Its message is
    dropped on purpose. We publish that the backend logs no message content, and
    `str(error)` is exactly the hole that claim leaks through: anything that
    raised with the child's text in it would otherwise reach the response body
    and the log. Losing a line of debug detail is the cheaper mistake.
    """
    if isinstance(error, EngineError):
        code = error.code if error.code in MESSAGES else "internal"
        retryable = error.retryable
        message = f"{type(error).__name__}({code}): {error}"
    elif isinstance(error, TimeoutError):
        code = "upstream_timeout"
        retryable = True
        message = f"{type(error).__name__} (message withheld: may contain the child's text)"
    else:
        code = "internal"
        retryable = RETRYABLE["internal"]
        message = f"{type(error).__name__} (message withheld: may contain the child's text)"

    return {
        "code": code,
        "message": message,
        "message_child": message_for(code, lang),
        "retryable": retryable,
    }


def status_for(error: BaseException) -> int:
    """The HTTP status that belongs with this failure."""
    return HTTP_STATUS.get(to_error_response(error, FALLBACK_LANG)["code"], 500)

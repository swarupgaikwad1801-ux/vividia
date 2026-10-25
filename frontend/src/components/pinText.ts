/**
 * TEMPORARY wording for the PIN screens. NOT the real string table.
 *
 * `lib/strings.ts` is the one place a sentence a child reads may live, and Neel
 * owns the wording in all three languages. None of the PIN keys exist there
 * yet, and adding them myself would both take his job and put unreviewed German
 * and Hindi in front of a child. So the English below is a placeholder, listed
 * key by key in the PR so he can write the real three-language entries.
 *
 * **When those keys land, this file is deleted.** Every call site already reads
 * `pinText("pin.…", lang)`, so the swap is `t("pin.…", lang)` and nothing else
 * moves. That is the only reason `lang` is threaded through screens that
 * currently render English: the shape has to be right now so the change is
 * mechanical later.
 *
 * Wording rules followed here (CLAUDE.md, privacy and honesty):
 * - never "this keeps you safe", and no claim the PIN hides the saved words
 *   from someone who sets out to read them (`lib/pin.ts` is explicit that it
 *   does not)
 * - the way back in after a forgotten PIN is stated plainly, not hidden
 * - a device that cannot store a PIN is told to the child, not papered over
 */

/**
 * Two of these take a number, which `t()` has no way to pass. The suggested
 * real keys keep the `{seconds}` / `{count}` placeholders and the caller
 * substitutes, exactly as below.
 */
export const PIN_TEXT = {
  "pin.set.title": "Set a PIN",
  "pin.set.titleChange": "Change your PIN",
  "pin.set.hint": "A PIN is 4 to 6 numbers. You type it to open the app.",
  "pin.set.limit":
    "It stops someone picking up this phone and reading your words. It will not stop someone who knows phones well.",
  "pin.set.enter": "Choose your PIN",
  "pin.set.again": "Type the same PIN again",
  "pin.set.next": "Next",
  "pin.set.save": "Save my PIN",
  "pin.set.startAgain": "Start again",
  "pin.set.mismatch": "Those two were not the same. Type your PIN again.",
  "pin.set.tooShort": "A PIN is 4 to 6 numbers.",
  "pin.set.saved": "Your PIN is saved. You will need it to open the app.",
  "pin.set.noStorage":
    "This phone is not letting the app save anything, so a PIN cannot be set here. Nothing was saved.",
  "pin.set.skip": "Not now",
  "pin.set.done": "Done",

  "pin.remove.button": "Remove the PIN",
  "pin.remove.ask": "Remove the PIN? The app will open without one. Nothing you saved is deleted.",
  "pin.remove.yes": "Yes, remove it",
  "pin.remove.no": "Keep the PIN",
  "pin.remove.done": "The PIN is removed. You can set a new one whenever you want.",

  "pin.unlock.title": "Type your PIN",
  "pin.unlock.hint": "4 to 6 numbers.",
  "pin.unlock.button": "Open",
  "pin.unlock.checking": "Checking…",
  "pin.unlock.wrong": "That is not the PIN. Try again.",
  "pin.unlock.wait": "Wait {seconds} seconds, then try again.",
  "pin.unlock.forgot": "I forgot my PIN",
  "pin.unlock.forgotHelp":
    "You can remove the PIN and get back in. Nothing you saved is deleted. Anyone holding this phone could do the same, which is the honest limit of a PIN like this.",

  "pin.keypad.empty": "No numbers typed yet",
  "pin.keypad.entered": "{count} numbers typed",
  "pin.keypad.delete": "Delete the last number",
  "pin.keypad.clear": "Clear",
} as const;

export type PinTextKey = keyof typeof PIN_TEXT;

/**
 * Placeholder lookup with the signature `t()` has, plus `{name}` substitution.
 *
 * `lang` is accepted and ignored on purpose: see the file comment. Ignoring it
 * is the honest behaviour while only English exists — returning German-looking
 * text nobody has read would be worse than returning English.
 */
export function pinText(
  key: PinTextKey,
  _lang: string,
  vars?: Readonly<Record<string, string>>,
): string {
  const text: string = PIN_TEXT[key];
  if (!vars) return text;
  return text.replace(/\{(\w+)\}/g, (whole, name: string) => vars[name] ?? whole);
}

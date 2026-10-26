/**
 * The top bar: Leave now with the red Need help beside it, and no note under
 * either (Neel, 26 Oct). The history caveat is kept where it is read once:
 * the onboarding card and the help on the PIN lock screen.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import QuickExitButton from "./QuickExitButton.tsx";
import { LANGS, STRINGS, t } from "../lib/strings.ts";

test("the top bar shows Leave now and not the history note, in every language", () => {
  for (const lang of LANGS) {
    const markup = renderToStaticMarkup(createElement(QuickExitButton, { lang }));
    assert.ok(markup.includes(t("quickExit.button", lang)), lang);
    assert.ok(!markup.includes(STRINGS["quickExit.note"][lang]), `${lang}: the note is back under the button`);
  }
});

test("Need help sits in the same bar, before Leave now", () => {
  const markup = renderToStaticMarkup(
    createElement(QuickExitButton, { lang: "en", beside: createElement("button", { className: "need-help" }, "Need help") }),
  );
  assert.ok(markup.indexOf("need-help") < markup.indexOf(STRINGS["quickExit.button"].en));
});

test("the history fact is still said once, on the Leave now onboarding card", () => {
  assert.match(STRINGS["onboarding.leaveNow"].en, /does not delete your browser history/);
});

/**
 * The Leave-now bar: the button only, no note under it (Neel, 26 Oct). The
 * history caveat is kept where it is read once: the onboarding card and the
 * help panel for danger.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import QuickExitButton from "./QuickExitButton.tsx";
import WriteSafetyNote from "./WriteSafetyNote.tsx";
import { LANGS, STRINGS } from "../lib/strings.ts";

test("the top bar shows Leave now and not the history note, in every language", () => {
  for (const lang of LANGS) {
    const markup = renderToStaticMarkup(createElement(QuickExitButton, { lang }));
    assert.ok(markup.includes(STRINGS["quickExit.button"][lang]), lang);
    assert.ok(!markup.includes(STRINGS["quickExit.note"][lang]), `${lang}: the note is back under the button`);
  }
});

test("the help panel for danger still says Leave now does not delete history", () => {
  const markup = renderToStaticMarkup(
    createElement(WriteSafetyNote, {
      lang: "en",
      safety: { urgent: true, category: "danger", message_child: "x" },
      onNeedHelp: () => {},
    }),
  );
  assert.ok(markup.includes(STRINGS["quickExit.note"].en));
});

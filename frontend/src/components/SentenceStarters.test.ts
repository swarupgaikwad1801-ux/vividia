import { test } from "node:test";
import assert from "node:assert/strict";

import { STARTERS, withStarter } from "./SentenceStarters.tsx";
import { t } from "../lib/strings.ts";

test("a starter begins an empty box, and goes on its own line after text", () => {
  assert.equal(withStarter("", "They said: "), "They said: ");
  assert.equal(withStarter("   ", "They said: "), "They said: ");
  assert.equal(withStarter("It was at lunch.  ", "They said: "), "It was at lunch.\nThey said: ");
});

test("starters only open a sentence: none says what happened", () => {
  for (const key of STARTERS) {
    for (const lang of ["en", "de", "hi"]) {
      const text = t(key, lang);
      assert.ok(text.length < 40, `${lang} ${key} is short`);
      assert.ok(!/[.!?]\s*$/.test(text.trim()), `${lang} ${key} ends open, not as a finished sentence`);
    }
  }
});

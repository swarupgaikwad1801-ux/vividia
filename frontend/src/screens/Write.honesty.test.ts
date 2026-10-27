/**
 * The writing screen may not tell a child that nothing is sent.
 *
 * `handoff.youDecide` is "Nothing is sent. You choose who sees it, and you
 * show it yourself." On the handoff screen that is true and load-bearing: it
 * means no adult has been told, and the child carries the card themselves.
 *
 * On the writing screen it was printed directly under "Check my words" - the
 * button that posts the child's words to Nebius for inference - and again
 * after the result came back. There it reads as "your words do not leave this
 * phone", and CLAUDE.md is explicit that this must never ship:
 *
 *   "Our own early drafts said the child's data 'stays on the device'. That is
 *    false and must never ship. Translation is cloud inference on Nebius: the
 *    disclosure text leaves the phone."
 *
 * Nothing caught this. It is one correct string used on one screen too many,
 * so there is no missing key, no type error and no failing render. Only
 * reading it in place on the right screen shows it, which is why this test
 * reads the source instead: it cannot judge wording, but it fails on the exact
 * mistake that was made.
 *
 * Same trade as `App.reachable.test.ts` and `App.mood.test.ts`.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const SOURCE = readFileSync(join(HERE, "Write.tsx"), "utf-8");

/** The source with block and line comments stripped, so the explanations of
 *  why a string was removed do not count as uses of it. */
function code(): string {
  return SOURCE.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
}

test("the writing screen does not claim nothing is sent", () => {
  const uses = [...code().matchAll(/handoff\.youDecide/g)];

  assert.equal(
    uses.length,
    0,
    `Write.tsx renders handoff.youDecide ${uses.length} time(s). That string ` +
      `says "Nothing is sent", and pressing the button on this screen sends ` +
      `the child's words to Nebius. It belongs on the handoff screen, where ` +
      `it means no adult was told. If this screen needs a sentence about ` +
      `where the words go, it has to be one that says they go somewhere.`,
  );
});

test("this test is still reading the file it thinks it is", () => {
  // Guards against the regex passing because the source moved or was renamed:
  // an empty or wrong file would make the assertion above vacuously true.
  assert.ok(SOURCE.length > 2000, "Write.tsx looks too small; this test has stopped working");
  assert.ok(
    code().includes('t("write.send", lang)'),
    "could not find the send button in Write.tsx; this test has stopped working",
  );
});

test("the comment stripper does not hide a real use", () => {
  // The test above would be defeated by a stripper that ate live code, so pin
  // its behaviour on a known sample rather than trusting it.
  const sample = `/* handoff.youDecide was here */\nconst a = t("handoff.youDecide", lang); // handoff.youDecide`;
  const stripped = sample.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");

  assert.equal([...stripped.matchAll(/handoff\.youDecide/g)].length, 1, "stripper is wrong");
});

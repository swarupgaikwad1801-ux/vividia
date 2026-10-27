/**
 * Read-aloud sits beside a screen's question and reads only that question
 * (Neel's phone test, 27 Oct). A regex over the sources, no DOM: the same
 * trade as App.reachable.test.ts, and it fails on the mistake that happens.
 *
 *   node --import tsx --test src/components/ReadAloud.test.ts
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const SRC = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (path: string) => readFileSync(join(SRC, path), "utf-8");

/** Every screen that asks the child a question, and the key it asks with. */
const ASKS: [string, RegExp][] = [
  ["screens/CheckIn.tsx", /<SpokenQuestion[^>]*text=\{t\("checkin\.title"/],
  ["screens/PictureQuestions.tsx", /<SpokenQuestion[^>]*text=\{title\}/],
  ["screens/Write.tsx", /<SpokenQuestion[^>]*text=\{t\("write\.title"/],
  ["components/WriteClarify.tsx", /<SpokenQuestion[^>]*text=\{t\("clarify\.title"/],
  ["components/ReportApproval.tsx", /<SpokenQuestion[^>]*text=\{t\("approve\.title"/],
  ["components/HandoffWhere.tsx", /<SpokenQuestion[\s\S]*?text=\{t\("where\.title"/],
  ["components/HandoffCard.tsx", /<SpokenQuestion[\s\S]*?text=\{t\("handoff\.title"/],
  ["components/FollowUpCheckIn.tsx", /<SpokenQuestion[\s\S]*?text=\{says\("followup\.title"/],
];

test("every screen that asks a question has the speaker beside that question", () => {
  for (const [file, pattern] of ASKS) assert.match(read(file), pattern, file);
});

test("screens that ask nothing have no speaker", () => {
  for (const file of ["screens/Timeline.tsx", "screens/Report.tsx", "screens/HelpScreen.tsx", "screens/PinSet.tsx", "screens/Onboarding.tsx", "screens/Escalation.tsx"]) {
    assert.doesNotMatch(read(file), /SpokenQuestion|ReadAloud/, file);
  }
});

test("nothing reads the whole screen any more: no screen-wide reader in the shell", () => {
  assert.doesNotMatch(read("App.tsx"), /<ReadAloud|screenRef|innerText/);
});

test("the speaker reads the text it is given, the question, nothing else", () => {
  const source = read("components/ReadAloud.tsx");
  assert.match(source, /speak\(text, voice,/);
  assert.doesNotMatch(source, /innerText|textContent|querySelector/);
});

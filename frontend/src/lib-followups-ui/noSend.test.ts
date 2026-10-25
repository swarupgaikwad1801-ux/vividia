/**
 * The promise, enforced by reading the source.
 *
 *   cd frontend
 *   node --import tsx --test "src/lib-followups-ui/*.test.ts"
 *
 * `CLAUDE.md`: *no monitoring, no automatic SOS, no alert behind the child's
 * back.* An escalation ladder is the one feature most tempted to break that —
 * "they said it is still happening, so we will tell the school" — so the rule
 * is not left as a comment someone might not read.
 *
 * This reads every file in the follow-up / ladder feature and fails if a
 * network, dialling, sharing or mail primitive appears in any of them, and if
 * any contact number is typed into one. It is a grep, not a proof: it cannot
 * stop someone determined. It does stop the accident, which is the realistic
 * failure — a half-finished "notify" helper, a `tel:` link copied from a
 * tutorial, a helpline number pasted in "just for the demo".
 *
 * This file is excluded from its own scan, because the patterns it looks for
 * are written out below.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { basename } from "node:path";

/** The directories this feature owns. */
const ROOTS = ["../lib-followups-ui", "../screens", "../components"] as const;

/** In `components/` only these two prefixes are mine; the rest is Vernika's. */
const MY_COMPONENT = /^(FollowUp|Escalation)/;

const SELF = basename(new URL(import.meta.url).pathname);

function filesUnder(root: string): { name: string; source: string }[] {
  const dir = new URL(`${root}/`, import.meta.url);
  let names: string[];
  try {
    names = readdirSync(dir);
  } catch {
    return []; // a directory this feature does not own yet
  }
  return names
    .filter((name) => /\.tsx?$/.test(name))
    .filter((name) => name !== SELF)
    .filter((name) => !root.endsWith("components") || MY_COMPONENT.test(name))
    .map((name) => ({
      name: `${root.replace("../", "")}/${name}`,
      source: readFileSync(new URL(name, dir), "utf-8"),
    }));
}

function myFiles(): { name: string; source: string }[] {
  return ROOTS.flatMap(filesUnder);
}

/** Anything that could move a word off this device, or dial. */
const SENDING = [
  { what: "an HTTP request", pattern: /\bfetch\s*\(/ },
  { what: "an HTTP request", pattern: /XMLHttpRequest/ },
  { what: "a beacon", pattern: /sendBeacon/ },
  { what: "a socket", pattern: /new\s+WebSocket/ },
  { what: "a server event stream", pattern: /EventSource/ },
  { what: "the share sheet", pattern: /navigator\s*\.\s*share/ },
  { what: "a phone call", pattern: /["'`]tel:/ },
  { what: "an SMS", pattern: /["'`]sms:/ },
  { what: "an email", pattern: /["'`]mailto:/ },
  { what: "a new window", pattern: /window\s*\.\s*open\s*\(/ },
  { what: "a navigation away from the app", pattern: /location\s*\.\s*(href\s*=|assign|replace)/ },
  { what: "the API client", pattern: /from\s+["'][^"']*lib\/api/ },
] as const;

/**
 * Browser modal dialogs. Banned for a separate reason: they freeze the
 * automation the team tests with. Checked here because this is already the
 * file that reads the source.
 */
const MODALS = /window\s*\.\s*(confirm|alert|prompt)\s*\(/;

/**
 * Contacts, which may only be defined in `content/helplines.json` and reach a
 * screen through `GET /api/resources`. A test on the content side already
 * forbids a second copy of a contact; this is the same rule on this side.
 */
const CONTACT_NUMBER = /(?<![\w.])(?:110|112|116\s?111|0800[\s-]?\d+)(?![\w.])/;

test("the feature owns some files, so the scan is not vacuously passing", () => {
  const files = myFiles();
  assert.ok(files.length >= 8, `only found ${files.length} files to scan`);
  for (const root of ROOTS) {
    assert.ok(filesUnder(root).length > 0, `${root} has nothing in it`);
  }
});

test("nothing in this feature can send, share, mail or dial", () => {
  for (const { name, source } of myFiles()) {
    for (const { what, pattern } of SENDING) {
      assert.ok(
        !pattern.test(source),
        `${name} looks like it could reach ${what}. Nothing in the follow-up or ` +
          `the ladder may contact anyone: the child takes every step themselves.`,
      );
    }
  }
});

test("no browser modal dialog, which would freeze the team's automation", () => {
  for (const { name, source } of myFiles()) {
    assert.ok(!MODALS.test(source), `${name} uses a window.confirm/alert/prompt dialog`);
  }
});

test("no contact number is typed into this feature", () => {
  for (const { name, source } of myFiles()) {
    const found = CONTACT_NUMBER.exec(source);
    assert.equal(
      found,
      null,
      `${name} contains "${found?.[0]}". content/helplines.json is the only place ` +
        `a contact may be defined; the ladder names the door and sends the child ` +
        `to the help screen, which renders it from /api/resources.`,
    );
  }
});

test("no raw hex colour: the design tokens in index.css are the only palette", () => {
  for (const { name, source } of myFiles()) {
    assert.ok(!/#[0-9a-fA-F]{3,8}\b/.test(source), `${name} contains a raw hex colour`);
  }
});

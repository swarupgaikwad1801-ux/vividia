/**
 * The word "bullying" never appears in front of a child.
 *
 * Neel's ask on #4, with the evidence behind it: a Swedish study found 38.7%
 * of pupils said yes to being asked about specific acts - pushed, things
 * taken, left out - and only 9.7% said yes to the word "bullied" (Sjogren et
 * al. 2024). A child reading "Are you being bullied?" and thinking "no, they
 * just take my bag" leaves the app. The screens therefore ask what happened,
 * never what to call it.
 *
 * It was already true when this test was written - the only match in the
 * whole tree was a comment in `lib/moods.ts` explaining this very rule. This
 * exists so it stays true, because "please keep it that way" is not something
 * anyone can keep in their head through a freeze week.
 *
 * ## What is checked, and what is not
 *
 * Quoted strings, template literals and JSX text, in every source file under
 * `src/`, with comments stripped first. Comments are exempt on purpose: this
 * file and `moods.ts` both have to be able to name the word to explain the
 * rule, and a comment is not on screen.
 *
 * German inflections are included (`gemobbt`, `mobben`), because "Mobbing"
 * alone would pass a screen that said "Wirst du gemobbt?" - the same question
 * in the same word, which is exactly what the study measured.
 *
 * Not covered: text that arrives at runtime from the backend, i.e.
 * `content/helplines.json`, `content/safety_messages.json` and the adult
 * guide. Those are Neel's files and are checked on the Python side; a
 * frontend test cannot see them. The adult guide is also a different
 * audience - an adult may be told plainly what this is about.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const SRC = dirname(dirname(fileURLToPath(import.meta.url)));

/**
 * The concept word, in both languages, with the inflections a screen would
 * realistically use. Not a substring match: "bull" and "mob" on their own
 * would fail on ordinary words.
 */
const FORBIDDEN = [
  /\bbully(ing|ies)?\b/i,
  /\bbullied\b/i,
  /\bmobbing\b/i,
  /\bgemobbt\b/i,
  /\bmobben\b/i,
];

/** Every `.ts`/`.tsx` file under `src/`, tests excluded. */
function sourceFiles(dir: string = SRC): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...sourceFiles(path));
    } else if (/\.tsx?$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name)) {
      out.push(path);
    }
  }
  return out;
}

/**
 * Comments removed, so this file and `moods.ts` may explain the rule using
 * the word the rule is about.
 */
function withoutComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/\/\/[^\n]*/g, " ");
}

/**
 * The parts of a source file that can reach a screen: double-quoted strings,
 * template literals, and JSX text nodes.
 *
 * Single quotes are left out deliberately - this codebase quotes strings with
 * `"` throughout, and `'` inside a sentence ("don't") would otherwise open a
 * fake string and swallow the rest of the line.
 */
function childFacingText(source: string): string[] {
  const clean = withoutComments(source);
  return [
    ...[...clean.matchAll(/"((?:[^"\\\n]|\\.)*)"/g)].map((m) => m[1]),
    ...[...clean.matchAll(/`((?:[^`\\]|\\.)*)`/g)].map((m) => m[1]),
    // JSX text: between a closing `>` and the next `<`, with no braces, so an
    // expression like {t("x")} is not mistaken for prose.
    ...[...clean.matchAll(/>([^<>{}]+)</g)].map((m) => m[1]),
  ];
}

test("no child-facing text calls it bullying, in any language", () => {
  const found: string[] = [];

  for (const file of sourceFiles()) {
    for (const text of childFacingText(readFileSync(file, "utf-8"))) {
      for (const pattern of FORBIDDEN) {
        if (pattern.test(text)) {
          found.push(`${relative(SRC, file)}: ${JSON.stringify(text.trim().slice(0, 80))}`);
        }
      }
    }
  }

  assert.deepEqual(
    found,
    [],
    `child-facing text names the concept instead of the act:\n  ${found.join("\n  ")}\n\n` +
      `Ask what happened - "they take my things", "they leave me out" - not what to call it. ` +
      `A child who would not use the word answers no to the question (Sjogren et al. 2024). ` +
      `If this is a comment rather than text on screen, it is exempt and something in the ` +
      `stripping above has stopped working.`,
  );
});

test("the walk still finds the string files, so the test above can fail", () => {
  // Without this, a broken path or an over-eager filter would make every run
  // pass by checking nothing at all - which is how the unreachable screens
  // stayed green. `strings.ts` is the file this test exists to police.
  const files = sourceFiles().map((f) => relative(SRC, f).replace(/\\/g, "/"));

  assert.ok(files.length > 20, `walked only ${files.length} files; the recursion is broken`);
  assert.ok(files.includes("lib/strings.ts"), "lib/strings.ts was not walked");
  assert.ok(
    files.some((f) => f.startsWith("screens/")),
    "no screen was walked",
  );
  assert.ok(
    !files.some((f) => /\.test\.tsx?$/.test(f)),
    "a test file was walked; tests quote the forbidden words on purpose",
  );
});

test("the words are actually detected when they appear in text", () => {
  // Proves the regexes and the extraction work, without waiting for someone
  // to make the mistake in a real file.
  const sample = `
    // bullying in a comment is allowed
    const a = "Are you being bullied?";
    const b = "Wirst du gemobbt?";
    const c = <p>Mobbing in der Schule</p>;
    const fine = "They take my things and leave me out.";
  `;
  const hits = childFacingText(sample).filter((text) => FORBIDDEN.some((p) => p.test(text)));

  assert.equal(hits.length, 3, `expected 3 hits, got ${hits.length}: ${JSON.stringify(hits)}`);
  assert.ok(
    !hits.some((h) => h.includes("in a comment")),
    "a comment was treated as child-facing text",
  );
});

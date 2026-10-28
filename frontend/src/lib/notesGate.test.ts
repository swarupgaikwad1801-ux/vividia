/**
 * The PIN lock on My notes (issue #133). The rules, then App.tsx's wiring.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { NOTES_STEPS, isNotes, notesGate } from "./notesGate.ts";

const APP = readFileSync(new URL("../App.tsx", import.meta.url), "utf-8");

test("with a PIN, every screen that shows saved words asks for it until it is typed", () => {
  for (const step of NOTES_STEPS) {
    assert.equal(notesGate(step, "set", false), "unlock", step);
    assert.equal(notesGate(step, "set", true), "open", step);
  }
});

test("without a PIN, every screen that shows saved words asks the child to set one first", () => {
  for (const step of NOTES_STEPS) {
    if (step === "pinSet") continue;
    assert.equal(notesGate(step, "none", false), "setFirst", step);
    assert.equal(notesGate(step, "none", true), "setFirst", `${step}: an open flag is no PIN`);
  }
  // The card straight after the pictures shows every saved note, so it asks too.
  assert.equal(notesGate("handoff", "none", false), "setFirst");
  assert.equal(notesGate("pinSet", "none", false), "open", "the PIN screen is how to make one");
});

test("after 'I forgot my PIN', every notes screen asks for a new one", () => {
  for (const step of NOTES_STEPS) assert.equal(notesGate(step, "none", false, true), "setFirst", step);
  assert.equal(notesGate("checkIn", "none", false, true), "open");
});

test("a blocked browser storage never locks a child out", () => {
  for (const step of NOTES_STEPS) assert.equal(notesGate(step, "unavailable", false), "open", step);
});

test("screens that show no saved words are never gated", () => {
  for (const step of ["checkIn", "listen", "write", "help", "picWhat", "language"] as const) {
    assert.equal(notesGate(step, "set", false), "open", step);
    assert.equal(isNotes(step), false, step);
  }
});

test("App.tsx locks the notes again on leaving them, on hiding, and on Leave now", () => {
  assert.match(APP, /if \(!isNotes\(step\)\) setNotesOpen\(false\)/, "leaving the notes does not lock them");
  assert.match(APP, /visibilitychange[\s\S]{0,200}setNotesOpen\(false\)/, "hiding the app does not lock them");
  assert.match(APP, /onQuickExit\(\(\) => setNotesOpen\(false\)\)/, "Leave now does not lock them");
});

test("App.tsx shows the lock in place of the screen, never as a step", () => {
  const gate = APP.slice(APP.indexOf("{/* NOTES GATE START */}"), APP.indexOf("{/* NOTES GATE END */}"));
  assert.ok(gate.length > 0, "could not find the notes gate in App.tsx");
  assert.match(gate, /<PinUnlock/);
  assert.match(gate, /help=\{<EmergencyHelp lang=\{lang\} \/>\}/, "help and 110/112 on the lock");
  assert.doesNotMatch(gate, /nav\.notes|<Timeline|<Report|<Handoff|<Escalation/, "a screen with saved words inside the lock");
  assert.doesNotMatch(APP, /"locked"/, "the lock became a Step again");
});

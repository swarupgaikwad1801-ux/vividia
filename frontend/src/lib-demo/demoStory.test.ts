/**
 * The demo has to be reversible and has to be honest. Both are checked here.
 *
 * NOTE for whoever runs this: `npm test` globs `src/lib/**` only, so these do
 * not run yet. Run them with
 *   node --import tsx --test "src/lib-demo/**\/*.test.ts"
 * and see the PR description: the test script needs one glob added, which is
 * Vernika's file to change.
 */

import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import type { DemoStory } from "../lib/api";
import { ApiError } from "../lib/api";
import { addEntry, clearAll, listEntries, useStorage } from "../lib/timeline";
import { activeDemo, clearDemo, isDemoLoaded, seedFromStory, useDemoStorage } from "./demoStory";

/** The smallest thing that behaves like localStorage. */
function fakeStorage() {
  const map = new Map<string, string>();
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, v),
    removeItem: (k: string) => void map.delete(k),
  };
}

/** Shaped exactly like content/demo_story.json, trimmed to two entries. */
function story(): DemoStory {
  return {
    persona: {
      name: "Amara",
      age: 11,
      label_on_screen: "Amara is a made-up example. No real child is shown.",
      background_en: "Amara moved to Germany three months ago.",
      child_lang: "en",
      state: "BY",
    },
    timeline: [
      {
        date: "2026-10-06",
        mood: "sad",
        text_child: "They laughed at me when I said my name in class.",
        text_de: "Sie haben mich ausgelacht, als ich in der Klasse meinen Namen gesagt habe.",
        place: "classroom",
        people: "some kids in my class",
      },
      {
        date: "2026-10-21",
        mood: "scared",
        text_child: "The same boys made me give them my money and said not to tell.",
        text_de: "Dieselben Jungs haben mich gezwungen, ihnen mein Geld zu geben.",
        place: "schoolyard",
        people: "the two older boys",
      },
    ],
    live_message: { text: "He said he would get me after school.", why: "Two honest readings." },
    handoff: { where_it_happens: "school", suggested_adults_en: ["my class teacher"] },
  };
}

describe("the demo story", () => {
  beforeEach(() => {
    useStorage(fakeStorage());
    useDemoStorage(fakeStorage());
    clearAll();
  });

  it("seeds the timeline from the story, word for word", () => {
    const { session } = seedFromStory(story());
    const saved = listEntries();
    assert.equal(saved.length, 2);
    // The story's entries are already approved, so nothing may reword them.
    assert.equal(saved[0].text_de, story().timeline[0].text_de);
    assert.equal(saved[1].text_child, story().timeline[1].text_child);
    assert.equal(session.seededIds.length, 2);
  });

  it("prepares the sentence the judge presses send on, unchanged", () => {
    const { session } = seedFromStory(story());
    assert.equal(session.draft.text, "He said he would get me after school.");
    assert.equal(session.draft.lang, "en");
  });

  it("carries the handoff through as suggestions, with nothing chosen", () => {
    const { session } = seedFromStory(story());
    assert.equal(session.handoff?.where_it_happens, "school");
    // No field anywhere says an adult has been picked or anything was sent.
    assert.equal(JSON.stringify(session).includes("sent"), false);
  });

  it("clears back to an empty app", () => {
    seedFromStory(story());
    clearDemo();
    assert.deepEqual(listEntries(), []);
    assert.equal(isDemoLoaded(), false);
  });

  it("refuses to seed on top of entries the person wrote themselves", () => {
    // The case that matters. Amara's incidents are fiction, and a timeline
    // holding both is the source for the report, the handoff card and the
    // follow-ups - so a made-up incident could reach a real teacher in a
    // real child's name. The button is visible to everyone, not only judges.
    //
    // This test used to assert ownEntriesKept === true, with the comment
    // "the screen must be told it is mixing". It pinned the bug: the flag was
    // computed and the seeding happened anyway.
    const mine = addEntry({
      date: "2026-10-02",
      mood: "sad",
      text_child: "my own words",
      text_de: "meine eigenen Worte",
    });

    assert.throws(
      () => seedFromStory(story()),
      (error: unknown) => error instanceof ApiError && !error.retryable,
      "seeding must be refused, not reported",
    );

    const left = listEntries();
    assert.equal(left.length, 1, "the person's own timeline must be untouched");
    assert.equal(left[0].id, mine.id);
    assert.equal(left[0].text_child, "my own words");
    assert.equal(
      isDemoLoaded(),
      false,
      "a refused load must leave no demo session behind, or the app thinks it is in the example",
    );
  });

  it("seeds normally in a fresh browser, which is what a judge has", () => {
    assert.deepEqual(listEntries(), [], "precondition: nothing of the person's own");

    const { session } = seedFromStory(story());

    assert.ok(session.persona.name);
    assert.ok(listEntries().length > 0, "the example must still load for a judge");
    assert.equal(isDemoLoaded(), true);
  });

  it("does not double the timeline when pressed twice", () => {
    seedFromStory(story());
    seedFromStory(story());
    assert.equal(listEntries().length, 2);

    // ...and the second run's ids are the ones that get removed.
    clearDemo();
    assert.deepEqual(listEntries(), []);
  });

  it("survives a reload: the marker is read back from storage", () => {
    const shared = fakeStorage();
    useDemoStorage(shared);
    seedFromStory(story());

    useDemoStorage(shared); // as if the page had just been opened again
    const session = activeDemo();
    assert.equal(session?.persona.name, "Amara");
    assert.equal(session?.seededIds.length, 2);
  });

  it("still works when nothing can be stored", () => {
    useStorage(null);
    useDemoStorage(null);
    const { session } = seedFromStory(story());
    assert.equal(listEntries().length, 2);
    assert.equal(session.draft.text.length > 0, true);
    clearDemo();
    assert.deepEqual(listEntries(), []);
  });

  it("fails with a child-safe sentence when the story is broken", () => {
    const broken = { ...story(), live_message: { text: "" } } as DemoStory;
    assert.throws(
      () => seedFromStory(broken),
      (error: unknown) =>
        error instanceof ApiError &&
        error.messageChild.length > 0 &&
        !/http|model|json/i.test(error.messageChild),
    );
    // Nothing half-seeded is left behind.
    assert.deepEqual(listEntries(), []);
    assert.equal(isDemoLoaded(), false);
  });

  it("refuses an entry that the timeline would silently drop", () => {
    // text_de missing: timeline.ts would store it and lose it on the next read,
    // so the judge would see a short timeline with no error anywhere.
    const bad = {
      ...story(),
      timeline: [{ date: "2026-10-06", mood: "sad", text_child: "only half an entry" }],
    } as unknown as DemoStory;
    assert.throws(() => seedFromStory(bad), ApiError);
    assert.deepEqual(listEntries(), []);
  });

  it("shows a made-up persona, and says so", () => {
    const { session } = seedFromStory(story());
    assert.match(session.persona.label_on_screen, /made-up|fictional/i);
  });
});

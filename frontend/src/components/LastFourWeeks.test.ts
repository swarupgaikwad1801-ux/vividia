import { test } from "node:test";
import assert from "node:assert/strict";

import { daysWithEntries, lastDays } from "./LastFourWeeks.tsx";
import type { StoredEntry } from "../lib/timeline.ts";

const entry = (date: string): StoredEntry => ({ id: date, date, mood: "", text_child: "x", text_de: "x" });

test("the last 28 days end today and run oldest first", () => {
  const days = lastDays(new Date(2026, 9, 28));
  assert.equal(days.length, 28);
  assert.equal(days[27], "2026-10-28");
  assert.equal(days[0], "2026-10-01");
});

test("only days inside the four weeks are marked, each once", () => {
  const days = lastDays(new Date(2026, 9, 28));
  const marked = daysWithEntries([entry("2026-10-20"), entry("2026-10-20"), entry("2026-09-01")], days);
  assert.deepEqual([...marked], ["2026-10-20"]);
});

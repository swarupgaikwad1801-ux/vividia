/**
 * The child's timeline, kept only in this browser.
 *
 * Nothing here talks to the network. CLAUDE.md promises that "the timeline is
 * stored only in the child's browser, and the child can delete it", so this
 * module is the whole of that promise: add, list, delete one, delete all.
 *
 * Storage can be missing or refuse to work (private windows, blocked site
 * data, a full disk). In that case the timeline lives in memory for this visit
 * only, and `isPersistent()` says so, so the screen can tell the child their
 * words will be gone when they close the page rather than pretend otherwise.
 */

import type { Entry } from "../types/api";

const KEY = "vividia.timeline.v1";

export interface StoredEntry extends Entry {
  /** Local id for deleting one entry; never sent to the backend. */
  id: string;
}

type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

let storage: StorageLike | null = defaultStorage();
let memory: StoredEntry[] = [];
let persistent = storage !== null;

function defaultStorage(): StorageLike | null {
  try {
    return typeof localStorage === "undefined" ? null : localStorage;
  } catch {
    return null; // some browsers throw on the getter itself when storage is blocked
  }
}

/** For tests, or to switch storage off. `null` keeps everything in memory. */
export function useStorage(next: StorageLike | null): void {
  storage = next;
  memory = [];
  persistent = next !== null;
}

/** False when nothing will survive closing the page. */
export function isPersistent(): boolean {
  return persistent;
}

function isEntry(value: unknown): value is StoredEntry {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === "string" &&
    typeof v.date === "string" &&
    typeof v.mood === "string" &&
    typeof v.text_child === "string" &&
    typeof v.text_de === "string"
  );
}

function read(): StoredEntry[] {
  if (!storage) return memory;
  try {
    const raw = storage.getItem(KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    // A damaged entry is dropped rather than crashing the child's timeline.
    return Array.isArray(parsed) ? parsed.filter(isEntry) : [];
  } catch {
    persistent = false;
    return memory;
  }
}

function write(entries: StoredEntry[]): void {
  memory = entries;
  if (!storage) return;
  try {
    storage.setItem(KEY, JSON.stringify(entries));
    persistent = true;
  } catch {
    persistent = false; // keep working in memory; the screen warns the child
  }
}

function newId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  }
}

/** All entries, oldest first. */
export function listEntries(): StoredEntry[] {
  return [...read()].sort((a, b) => a.date.localeCompare(b.date));
}

/** Save an entry the child has approved. Returns it with its local id. */
export function addEntry(entry: Entry): StoredEntry {
  const stored: StoredEntry = { ...entry, id: newId() };
  write([...read(), stored]);
  return stored;
}

export function removeEntry(id: string): void {
  write(read().filter((entry) => entry.id !== id));
}

/** Delete everything the child saved. */
export function clearAll(): void {
  memory = [];
  if (!storage) return;
  try {
    storage.removeItem(KEY);
  } catch {
    persistent = false;
  }
}

/** The entries as the backend expects them for /api/report: local ids removed. */
export function toEntries(entries: StoredEntry[] = listEntries()): Entry[] {
  return entries.map(({ id: _id, ...entry }) => entry);
}

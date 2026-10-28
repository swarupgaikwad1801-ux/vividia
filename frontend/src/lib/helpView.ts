/**
 * What the Help screen and the Safety screen show, worked out without React.
 *
 * The screens stay thin: they fetch, then render whatever `helpView()`
 * returns. Everything that decides what a frightened child sees, in what
 * order and with which warning, lives here, where node:test can check it.
 *
 * ## The rules this module exists to enforce
 *
 * - **110 and 112 come first, always**, in the order content/helplines.json
 *   gives them. They never go through `sortForChild()`: a counselling service
 *   that speaks the child's language must never sit above the number for
 *   immediate danger.
 * - **Every service shows the languages it speaks**, and says "only" when the
 *   child's language is not among them (`languageNote()`), because CLAUDE.md
 *   says hiding that gap is worse than the gap itself.
 * - **The contact is text the child can read and copy.** A `tel:` or web link
 *   is offered as a convenience, but inside some viewers it does nothing, so
 *   the number itself is always on screen.
 * - **Nothing here contacts anyone.** No call is placed, no message is sent;
 *   the child decides.
 */

import type { Resource, ResourcesResponse } from "../types/api.ts";
import { freshness, languageNote, sortForChild } from "./help.ts";
import { t, type StringKey } from "./strings.ts";

export interface ContactView {
  /** The official name, as content/helplines.json has it (German). */
  name: string;
  /**
   * What the service is, in the child's language, shown above the official
   * name; null when the child reads German or the service is not one we know.
   */
  plainName: string | null;
  /** Exactly as content/helplines.json or the official site has it. */
  contact: string;
  /** `tel:` for a phone number, the URL for a website, null if neither. */
  href: string | null;
  kind: "phone" | "web" | "other";
  hours: string;
  /** "Speaks German only", and so on; always shown. */
  languages: string;
  /** "checked 2 days ago"; "" if the date cannot be read. */
  checked: string;
  /** The page it was checked against; null unless it is an https link. */
  sourceUrl: string | null;
}

export interface HelpView {
  danger: ContactView[];
  talk: ContactView[];
  /** Whether the local entries were looked up live today or come from our file. */
  source: "live" | "fallback";
}

/** A phone number: digits, spaces and an optional leading +, nothing else. */
const PHONE = /^\+?[0-9][0-9 ]{1,18}$/;

export function contactLink(contact: string): { href: string | null; kind: ContactView["kind"] } {
  const trimmed = contact.trim();
  if (PHONE.test(trimmed)) return { href: `tel:${trimmed.replace(/ /g, "")}`, kind: "phone" };
  if (/^https:\/\//i.test(trimmed)) return { href: trimmed, kind: "web" };
  return { href: null, kind: "other" };
}

/**
 * Review, 28 Oct: an English or Hinglish child read "Polizei (Notruf)" and
 * krisenchat's headline was a raw URL. Keyed on the official NAME, never on a
 * number: contacts are defined only in helplines.json.
 */
const PLAIN_NAME: Record<string, StringKey> = {
  "Polizei (Notruf)": "danger.police",
  "Feuerwehr und Rettungsdienst (Notruf)": "danger.ambulance",
  "Nummer gegen Kummer – Kinder- und Jugendtelefon": "help.name.childLine",
  krisenchat: "help.name.chat",
};

function toView(resource: Resource, lang: string, now: Date): ContactView {
  const { href, kind } = contactLink(resource.contact);
  const plain = PLAIN_NAME[resource.name];
  return {
    name: resource.name,
    plainName: plain && lang !== "de" ? t(plain, lang) : null,
    contact: resource.contact,
    href,
    kind,
    hours: resource.hours,
    languages: languageNote(resource, lang),
    checked: freshness(resource.retrieved_at, lang, now),
    // A live result's source comes from a Tavily answer, not from our reviewed
    // file, so it gets the same https-only rule as the contact link.
    sourceUrl: /^https:\/\//i.test(resource.source_url.trim()) ? resource.source_url.trim() : null,
  };
}

/**
 * The Help screen's content: emergency numbers first in file order, then
 * every other service with the ones the child can talk to in their own
 * language first.
 *
 * A service that appears in both lists (should never happen, but the two come
 * from different endpoints) is shown once, under danger.
 */
export function helpView(
  emergency: readonly Resource[],
  services: readonly Resource[],
  source: "live" | "fallback",
  lang: string,
  now: Date = new Date(),
): HelpView {
  const emergencyContacts = new Set(emergency.map((resource) => resource.contact));
  const others = services.filter((resource) => !emergencyContacts.has(resource.contact));
  return {
    danger: emergency.map((resource) => toView(resource, lang, now)),
    talk: sortForChild(others, lang).map((resource) => toView(resource, lang, now)),
    source,
  };
}

export type HelpLoad =
  | { status: "ready"; view: HelpView; dangerError?: unknown; talkError?: unknown }
  | { status: "error"; error: unknown };

/**
 * The view from two fetches that settled separately, so one failing never
 * hides the other.
 *
 * `emergency()` reads a local file and almost never fails; `resources()` may
 * do a live lookup and fails far more often. With `Promise.all` the fragile
 * one took the robust one down, and a child on a bad connection got no 110.
 * Here each list shows if it loaded, and the screen says which one did not.
 * Only when both failed is there nothing to show.
 */
export function settledHelpView(
  numbers: PromiseSettledResult<readonly Resource[]>,
  found: PromiseSettledResult<ResourcesResponse>,
  lang: string,
  now: Date = new Date(),
): HelpLoad {
  if (numbers.status === "rejected" && found.status === "rejected") {
    return { status: "error", error: numbers.reason };
  }
  const view = helpView(
    numbers.status === "fulfilled" ? numbers.value : [],
    found.status === "fulfilled" ? found.value.resources : [],
    found.status === "fulfilled" ? found.value.source : "fallback",
    lang,
    now,
  );
  return {
    status: "ready",
    view,
    ...(numbers.status === "rejected" ? { dangerError: numbers.reason } : {}),
    ...(found.status === "rejected" ? { talkError: found.reason } : {}),
  };
}

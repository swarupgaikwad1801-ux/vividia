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

import type { Resource } from "../types/api.ts";
import { freshness, languageNote, sortForChild } from "./help.ts";

export interface ContactView {
  name: string;
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
  sourceUrl: string;
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

function toView(resource: Resource, lang: string, now: Date): ContactView {
  const { href, kind } = contactLink(resource.contact);
  return {
    name: resource.name,
    contact: resource.contact,
    href,
    kind,
    hours: resource.hours,
    languages: languageNote(resource, lang),
    checked: freshness(resource.retrieved_at, lang, now),
    sourceUrl: resource.source_url,
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

/**
 * The contacts the app can show without the network: the emergency numbers
 * and the helplines, built into the app from `content/helplines.json`. (No
 * number is written here, not even in a comment: `contacts.test.ts`.)
 *
 * Neel, 27 Oct: "in people who can help, I can't see any number". The Help
 * screen, the danger pop-up and the help inside the PIN lock all waited for
 * `/api/emergency` and `/api/resources`, with a 15 s timeout. Render's free
 * plan sleeps when idle and takes longer than that to wake, so the first
 * child to open Help after a quiet hour got no numbers at all. Offline, they
 * never got any, although everything except translation is meant to work
 * offline (CLAUDE.md, Tier A).
 *
 * So these are the starting state, shown at once, and the network only
 * replaces them when it answers. Not a second copy: this IMPORTS the one
 * file CLAUDE.md allows contacts in ("one fact, one place"), and maps it
 * exactly as `engine/resources.py` `_curated()` does, so the screen looks the
 * same whether the server answered or not. `contacts.test.ts` checks both.
 */

import helplines from "../../../content/helplines.json";
import type { Resource } from "../types/api";

interface Entry {
  name: string;
  contact: string;
  hours: string;
  languages: string[];
  source_url: string;
}

function curated(entries: readonly Entry[]): Resource[] {
  return entries.map((item) => ({
    name: item.name,
    contact: item.contact,
    hours: item.hours,
    languages: item.languages,
    source_url: item.source_url,
    retrieved_at: helplines.verified_on,
  }));
}

/** The emergency numbers, in file order: what `/api/emergency` returns. */
export const BUILT_IN_EMERGENCY: readonly Resource[] = curated(helplines.emergency);

/** The helplines: what `/api/resources` returns with no state. */
export const BUILT_IN_HELPLINES: readonly Resource[] = curated(helplines.helplines);

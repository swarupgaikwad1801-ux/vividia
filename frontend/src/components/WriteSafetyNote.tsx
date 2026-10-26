import { useEffect, useState } from "react";

import type { Resource, Safety } from "../types/api.ts";
import { resources as fetchResources } from "../lib/api.ts";
import { languageNote, sortForChild } from "../lib/help.ts";
import { t } from "../lib/strings.ts";

/**
 * The safety floor, shown the moment the check comes back urgent.
 *
 * Two rules from CLAUDE.md meet in this little component, and they used to
 * pull in opposite directions:
 *
 * 1. "If the child writes about danger or self-harm, show 110/112 and
 *    krisenchat at once. Nothing is sent to anyone."
 * 2. "`content/helplines.json` is the only place a contact may be defined.
 *    Nothing may copy a contact into a second file."
 *
 * The resolution is that a number does not have to be COPIED to be shown.
 * This file still types no contact; it fetches them from `/api/resources`,
 * which reads the same `helplines.json` and is the one source. So the
 * contacts are on screen rather than one tap away, and there is still only
 * one place to update them. (Neel's review of #53.)
 *
 * `/api/resources` makes no model call and sits outside the spending cap, so
 * a frightened child is never refused this by a spent allowance - the same
 * reason the help route may use it.
 *
 * KNOWN GAP, and it is the important half: `/api/resources` serves the
 * `helplines` section only - **116 111 and krisenchat**. The emergency
 * numbers, 110 and 112, are in the `emergency` section of the same file and
 * no merged route serves them yet; that is #30 (`GET /api/emergency`). Until
 * it lands this panel meets half of rule 1, and the missing half is the one
 * that matters in immediate danger. One `emergency()` call slots in beside
 * the fetch below, no restructuring. Do NOT paper over it by typing 110 into
 * this file: that is the copy nobody updates, in front of the child who
 * needs it most.
 *
 * `onNeedHelp` is therefore still required, not optional: it reaches the full
 * list, including the numbers this panel cannot yet show. A safety panel with
 * no way out of it is worse than no panel.
 *
 * Styled in `help`, which the design system defines as serious and
 * deliberately not an alarm colour: a child reaching this point is
 * frightened already.
 */

export interface WriteSafetyNoteProps {
  lang: string;
  safety: Safety;
  onNeedHelp: () => void;
}

export default function WriteSafetyNote({ lang, safety, onNeedHelp }: WriteSafetyNoteProps) {
  const [contacts, setContacts] = useState<readonly Resource[]>([]);

  useEffect(() => {
    let live = true;
    // No state code is passed: the local school-psychology lookup is
    // irrelevant here and would spend a Tavily credit for a child in crisis.
    fetchResources(lang)
      .then((response) => {
        if (live) setContacts(sortForChild(response.resources, lang));
      })
      // Deliberately silent. The panel already shows the backend's calm
      // sentence and the button to the full list, so a failed fetch costs a
      // convenience, not the way out. A child in this state must never be
      // shown an error about our network.
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [lang]);

  return (
    // role="alert": this appears after the child pressed send and is the one
    // thing on the page that must not be scrolled past silently.
    <section
      role="alert"
      className="flex flex-col gap-3 rounded-card border border-help/30 bg-help-soft p-4"
    >
      <p className="text-base font-medium text-help">{safety.message_child}</p>

      {/* On screen, not one tap away. Each contact as the file defines it,
          with the languages it speaks, because a number that cannot answer in
          the child's language is not help yet (lib/help.ts). */}
      {contacts.length > 0 && (
        <ul className="flex flex-col gap-2">
          {contacts.map((contact) => (
            <li key={`${contact.name}-${contact.contact}`} className="flex flex-col gap-0.5">
              <span className="text-base font-medium text-help">{contact.contact}</span>
              <span className="text-sm text-help">{contact.name}</span>
              <span className="text-sm text-ink-soft">{languageNote(contact, lang)}</span>
            </li>
          ))}
        </ul>
      )}

      <button
        type="button"
        onClick={onNeedHelp}
        // text-page, not text-white: --color-help is a LIGHT red in dark mode
        // (#e98a8a), where white reads at about 2.5:1. text-page flips with the
        // theme, giving ~7:1 in both. This is the button a child presses when
        // they have written about danger, so it is the last one to let go dim.
        className="min-h-tap rounded-card bg-help px-4 text-base font-semibold text-page"
      >
        {t("help.button", lang)}
      </button>
      {/* The promise that makes the panel bearable: seeing this did not tell
          anyone anything. Nothing on this screen sends. */}
      <p className="text-sm text-help">{t("handoff.youDecide", lang)}</p>
    </section>
  );
}

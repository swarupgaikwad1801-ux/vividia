import { useEffect, useState } from "react";

import type { Resource } from "../types/api.ts";
import { emergency as fetchEmergency, resources as fetchResources } from "../lib/api.ts";
import { BUILT_IN_EMERGENCY, BUILT_IN_HELPLINES } from "../lib/contacts.ts";
import { helpView, type ContactView } from "../lib/helpView.ts";
import { t } from "../lib/strings.ts";

/**
 * The people who can help, behind the red "Need help" button in the top bar.
 *
 * Until 26 Oct this was a big panel shown inline under a dangerous answer
 * (WriteSafetyNote). Neel: "just keep a red button saying need help on the
 * top right". So the full list lives here, one tap away from every screen,
 * and a dangerous answer now opens a pop-up with 110/112 (DangerDialog) and
 * makes the button glow.
 *
 * The one Help screen. #85 landed a second one on main; merging it in, this
 * screen kept its look and took #85's tested logic: `helpView()` puts 110/112
 * first in file order, drops a service listed twice, links only https sources,
 * and each card says when it was checked and where.
 *
 * ## Calm and still
 *
 * The quiet scene, no map, nothing bounces or slides (App.tsx gives this step
 * no motion). A child who opens this may be frightened already.
 *
 * ## Every number comes from one file, never typed here
 *
 * CLAUDE.md: `content/helplines.json` is the only place a contact may be
 * defined. The app is built with it (lib/contacts.ts), so the list shows at
 * once, offline and while Render wakes up; then `/api/emergency` (110, 112)
 * and `/api/resources` (116 111, krisenchat) refresh it from the same file.
 * Neither makes a model call or sits behind the spending cap.
 *
 * The two are fetched INDEPENDENTLY, not with `Promise.all`: one rejection
 * would otherwise discard both, and 110/112 must survive a failure of the
 * other list. No state code is passed, so no Tavily credit is spent here.
 *
 * ## Each service's languages are printed
 *
 * CLAUDE.md: the crisis screen must print each service's languages; hiding
 * that is worse than the gap itself. `languageNote` says "German only" when
 * it is.
 */

export interface HelpScreenProps {
  lang: string;
}

export default function HelpScreen({ lang }: HelpScreenProps) {
  // Both lists start from the contacts built into the app (lib/contacts.ts),
  // so the numbers are on screen at once, offline, and while the server is
  // still waking up. The network only replaces them when it answers.
  // Separate pieces of state on purpose: either list updates on its own.
  const [urgent, setUrgent] = useState<readonly Resource[]>(BUILT_IN_EMERGENCY);
  const [helplines, setHelplines] = useState<readonly Resource[]>(BUILT_IN_HELPLINES);
  const [source, setSource] = useState<"live" | "fallback">("fallback");

  useEffect(() => {
    let live = true;

    // A failure is silent: the built-in numbers are already showing, and a
    // child here must not be shown an error about our network.
    fetchEmergency(lang)
      .then((response) => {
        if (live && response.contacts.length > 0) setUrgent(response.contacts);
      })
      .catch(() => {});

    fetchResources(lang)
      .then((response) => {
        if (!live || response.resources.length === 0) return;
        setHelplines(response.resources);
        setSource(response.source);
      })
      .catch(() => {});

    return () => {
      live = false;
    };
  }, [lang]);

  // In file order for 110/112, never sorted; the rest with the services
  // that speak the child's language first (`sortForChild`, inside helpView).
  const view = helpView(urgent, helplines, source, lang);

  return (
    <main className="mx-auto flex w-full max-w-sm flex-col gap-4 px-4 py-6">
      <h1 className="text-3xl text-balance">{t("help.title", lang)}</h1>

      <HelpList lang={lang} contacts={view.danger} urgent />
      <HelpList lang={lang} contacts={view.talk} />
    </main>
  );
}

/**
 * One list of contacts, each with its hours, the languages it speaks, and
 * when and where it was checked. Separate from the fetching so a test can
 * render it with known contacts.
 */
export function HelpList({ lang, contacts, urgent = false }: { lang: string; contacts: readonly ContactView[]; urgent?: boolean }) {
  if (contacts.length === 0) return null;
  return (
    <ul className="flex flex-col gap-3">
      {contacts.map((contact) => (
        <li
          key={`${contact.name}-${contact.contact}`}
          className={`flex flex-col gap-0.5 rounded-card border-[3px] bg-surface p-4 ${urgent ? "border-help" : "border-ink"}`}
        >
          {/* A real tel: or web link where there is one, so one tap reaches
              it. The contact itself is always printed, because inside some
              app views a tel: link does nothing. */}
          {contact.href ? (
            <a
              href={contact.href}
              className={`min-h-tap font-bold text-help underline ${contact.kind === "phone" ? "text-2xl" : "text-lg break-all"}`}
            >
              {contact.contact}
            </a>
          ) : (
            <span className="text-lg font-bold text-ink select-all break-all">{contact.contact}</span>
          )}
          <span className="text-base font-medium text-ink">{contact.name}</span>
          <span className="text-sm text-ink-soft">{contact.hours}</span>
          <span className="text-sm text-ink-soft">{contact.languages}</span>
          {(contact.checked || contact.sourceUrl) && (
            <span className="text-xs text-ink-soft">
              {contact.checked}
              {contact.checked && contact.sourceUrl && " · "}
              {contact.sourceUrl && (
                <a href={contact.sourceUrl} target="_blank" rel="noopener noreferrer" className="underline">
                  {t("help.sourceLink", lang)}
                </a>
              )}
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}

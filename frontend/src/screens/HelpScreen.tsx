import { useEffect, useState } from "react";

import type { Resource } from "../types/api.ts";
import { emergency as fetchEmergency, resources as fetchResources } from "../lib/api.ts";
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
 * defined. `/api/emergency` serves 110 and 112 from it, `/api/resources`
 * serves 116 111 and krisenchat. Neither makes a model call or sits behind
 * the spending cap, so a spent allowance never takes this away.
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
  // Separate pieces of state on purpose: either list appears on its own if
  // the other fails. 110 and 112 are the ones that must survive.
  const [urgent, setUrgent] = useState<readonly Resource[]>([]);
  const [helplines, setHelplines] = useState<readonly Resource[]>([]);
  const [source, setSource] = useState<"live" | "fallback">("fallback");
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let live = true;

    fetchEmergency(lang)
      .then((response) => {
        if (live) setUrgent(response.contacts);
      })
      .catch(() => live && setFailed(true));

    fetchResources(lang)
      .then((response) => {
        if (!live) return;
        setHelplines(response.resources);
        setSource(response.source);
      })
      // Silent: 110/112 above are the part that matters, and a child here
      // must not be shown an error about our network for the second list.
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

      {/* The one thing on the network that can fail here, and a child in a
          crisis is owed a reason rather than an empty box. */}
      {failed && urgent.length === 0 && <p className="text-base text-ink">{t("errors.network", lang)}</p>}

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

import type { ContactView } from "../lib/helpView";
import { t } from "../lib/strings";

/**
 * One service: name, the contact as selectable text, hours, the languages it
 * speaks, and when and where it was checked.
 *
 * The number is always printed. The Call / Open link next to it is only a
 * convenience: inside some browsers and app views a `tel:` link does nothing,
 * so a child must never depend on it.
 */
export function ContactCard({ contact, lang, urgent = false }: { contact: ContactView; lang: string; urgent?: boolean }) {
  return (
    <li className="flex flex-col gap-2 rounded-card border border-line bg-surface p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h3 className="text-base font-semibold">{contact.name}</h3>
        <span className="text-sm text-ink-soft">{contact.hours}</span>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <span
          className={`select-all break-all font-semibold tabular-nums ${urgent ? "text-2xl text-help" : "text-xl"}`}
        >
          {contact.contact}
        </span>
        {contact.href && (
          <a
            href={contact.href}
            target={contact.kind === "web" ? "_blank" : undefined}
            rel={contact.kind === "web" ? "noopener noreferrer" : undefined}
            className={`min-h-tap inline-flex items-center rounded-card border px-4 text-base font-medium ${
              urgent ? "border-help text-help" : "border-calm text-calm"
            }`}
          >
            {t(contact.kind === "phone" ? "help.call" : "help.open", lang)}
          </a>
        )}
      </div>

      <p className="text-sm font-medium">{contact.languages}</p>
      <p className="text-xs text-ink-soft">
        {contact.checked}
        {contact.checked && " · "}
        <a href={contact.sourceUrl} target="_blank" rel="noopener noreferrer" className="underline">
          {t("help.sourceLink", lang)}
        </a>
      </p>
    </li>
  );
}

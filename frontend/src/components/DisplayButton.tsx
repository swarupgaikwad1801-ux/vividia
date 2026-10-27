import { useState } from "react";
import { applyDisplay, readDisplay, saveDisplay } from "../lib/display";
import type { Display } from "../lib/display";
import type { Lang } from "../lib/strings";
import { t } from "../lib/strings";

/**
 * "Aa Text" on the check-in: opens two switches, bigger text and easier
 * reading (lib/display.ts). Each applies at once and is kept in this browser
 * only. Closed by default, so the check-in stays as plain as it was.
 */
export default function DisplayButton({ lang }: { lang: Lang }) {
  const [open, setOpen] = useState(false);
  const [display, setDisplay] = useState<Display>(() => readDisplay());

  function set(change: Partial<Display>): void {
    const next = { ...display, ...change };
    setDisplay(next);
    saveDisplay(next);
    applyDisplay(next);
  }

  const pill = "squish min-h-tap inline-flex items-center gap-2 rounded-full border-2 border-ink px-4 text-sm font-bold";

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((now) => !now)}
        aria-expanded={open}
        aria-controls="display-options"
        className={`${pill} bg-surface text-ink`}
      >
        <span aria-hidden="true" className="text-base">Aa</span>
        {t("display.open", lang)}
      </button>
      {open && (
        <div id="display-options" role="group" aria-label={t("display.open", lang)} className="flex w-full flex-wrap justify-center gap-3">
          <button
            type="button"
            aria-pressed={display.large}
            onClick={() => set({ large: !display.large })}
            className={`${pill} ${display.large ? "bg-ink text-page" : "bg-surface text-ink"}`}
          >
            {t("display.large", lang)}
          </button>
          <button
            type="button"
            aria-pressed={display.easyRead}
            onClick={() => set({ easyRead: !display.easyRead })}
            className={`${pill} ${display.easyRead ? "bg-ink text-page" : "bg-surface text-ink"}`}
          >
            {t("display.easyRead", lang)}
          </button>
        </div>
      )}
    </>
  );
}

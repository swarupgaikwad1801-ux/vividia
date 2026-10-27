import { useState } from "react";
import { applyDisplay, readDisplay, saveDisplay } from "../lib/display";
import type { Display } from "../lib/display";
import type { Lang } from "../lib/strings";
import { t } from "../lib/strings";

/**
 * "Aa Text" on the check-in: opens three switches, bigger text, easier
 * reading and darker colours (lib/display.ts). Each applies at once and is kept in this browser
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

  const pill = "sticker min-h-tap inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 text-sm font-bold motion-safe:active:translate-y-1 active:shadow-none";

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((now) => !now)}
        aria-expanded={open}
        aria-controls="display-options"
        className={`${pill} bg-surface text-ink`}
      >
        <span aria-hidden="true" className="text-sm">Aa</span>
        {t("display.open", lang)}
      </button>
      {open && (
        // order-last: on the check-in this sits in one row of chips, and the
        // options take a line of their own under the whole row rather than
        // splitting it. Tab order still runs Text, then its options.
        <div id="display-options" role="group" aria-label={t("display.open", lang)} className="order-last flex w-full flex-wrap justify-center gap-2">
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
          <button
            type="button"
            aria-pressed={display.night}
            onClick={() => set({ night: !display.night })}
            className={`${pill} ${display.night ? "bg-ink text-page" : "bg-surface text-ink"}`}
          >
            {t("display.night", lang)}
          </button>
        </div>
      )}
    </>
  );
}

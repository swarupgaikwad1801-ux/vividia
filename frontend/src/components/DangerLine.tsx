/**
 * One short red line when an answer means danger: "In danger right now?
 * Call 110." It replaces the big inline safety panel (Neel, 26 Oct); the full
 * list is behind the red "Need help" button, which pulses while this line is
 * on screen.
 *
 * CLAUDE.md, a Must: if the child writes or picks something that means
 * danger, show 110 at once. Nothing is sent to anyone.
 *
 * The number is not typed here or in strings.ts (a test forbids it): it comes
 * from `/api/emergency`, which reads `content/helplines.json`, the one place
 * a contact may be defined. Until it arrives, or if it cannot, the line
 * points at the Need help button instead.
 */

import { useEffect, useState } from "react";

import { emergency } from "../lib/api.ts";
import { t } from "../lib/strings.ts";

/** Set while a danger line is on screen; index.css makes Need help pulse. */
const FLAG = "danger";

export default function DangerLine({ lang }: { lang: string }) {
  const [number, setNumber] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    emergency(lang)
      .then((res) => live && setNumber(res.contacts[0]?.contact ?? null))
      .catch(() => {});
    const root = document.documentElement;
    root.dataset[FLAG] = "1";
    return () => {
      live = false;
      delete root.dataset[FLAG];
    };
  }, [lang]);

  return (
    // role="alert": the one thing on the page that must not be passed silently.
    <p role="alert" className="rounded-card border-[3px] border-help bg-help-soft px-4 py-3 text-base font-bold text-help">
      {number ? (
        <>
          {/* The sentence is split around the number, so each language puts
              it where its grammar wants it. */}
          {t("help.dangerBefore", lang)}{" "}
          <a href={`tel:${number.replace(/[^+\d]/g, "")}`} className="underline">
            {number}
          </a>
          {t("help.dangerAfter", lang)}
        </>
      ) : (
        t("help.dangerLineNoNumber", lang)
      )}
    </p>
  );
}

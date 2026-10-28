import { useEffect, useState } from "react";

import { t } from "../lib/strings";

/**
 * "No internet. Pictures, your saved words and the help numbers still work."
 *
 * Offline-first is a Tier A promise (CLAUDE.md): everything except checking
 * the words works without a network. A child who loses signal should hear
 * that from the app, before tapping something and wondering why, not find
 * out from a failure. The writing and chat screens say it in their own
 * words, so App.tsx leaves this off there.
 *
 * Assumes online unless the browser says otherwise, like Write.tsx: a false
 * "no internet" would stop a child who is in fact connected.
 */
export default function OfflineStrip({ lang }: { lang: string }) {
  const [online, setOnline] = useState(() => typeof navigator === "undefined" || navigator.onLine !== false);

  useEffect(() => {
    const up = () => setOnline(true);
    const down = () => setOnline(false);
    window.addEventListener("online", up);
    window.addEventListener("offline", down);
    return () => {
      window.removeEventListener("online", up);
      window.removeEventListener("offline", down);
    };
  }, []);

  if (online) return null;
  return (
    <p role="status" className="mx-4 mt-2 flex items-start gap-2 rounded-xl border-2 border-ink bg-surface px-3 py-2 text-sm text-ink">
      <span aria-hidden="true">📶</span>
      {t("net.offline", lang)}
    </p>
  );
}

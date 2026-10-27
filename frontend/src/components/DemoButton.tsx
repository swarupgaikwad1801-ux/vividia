import { useCallback, useEffect, useState } from "react";
import { ApiError } from "../lib/api";
import { fill, t } from "../lib/strings";
import { activeDemo, clearDemo, loadDemo } from "../lib-demo/demoStory";
import type { DemoSession } from "../lib-demo/demoStory";

/**
 * "Try Amara's story": the one button a judge presses.
 *
 * This is the first thing a judge touches, so it is the whole product in
 * miniature.
 *
 * **Nothing is sent.** Pressing this seeds a timeline and writes a draft
 * sentence. It makes no translate call, builds no report and chooses no
 * adult. The judge presses send themselves, which is exactly the moment the
 * demo exists to show.
 *
 * There is no "Amara is made up" line under the button: removed on Neel's
 * call (27 Oct). The README, the video and Devpost say the persona is
 * fictional.
 *
 * It is also reversible from here: once loaded, the same card offers clearing,
 * so nobody is stranded in demo state and the team can test on a clean app.
 */
export interface DemoButtonProps {
  /** The UI language, for the notice and the button. */
  lang: string;
  /**
   * Called once the story is loaded and the timeline is seeded. The shell
   * navigates to the writing screen with `session.draft` prefilled.
   */
  onLoaded: (session: DemoSession) => void;
  /** Called after the example has been removed, so the shell can go back home. */
  onCleared?: () => void;
  className?: string;
}

type Status = "idle" | "loading" | "loaded" | "cleared" | "error";

export default function DemoButton({ lang, onLoaded, onCleared, className = "" }: DemoButtonProps) {
  // A demo loaded before a reload is still loaded: the timeline it seeded is
  // in this browser, so the clear button has to be here on first paint.
  const [status, setStatus] = useState<Status>(() => (activeDemo() ? "loaded" : "idle"));
  const [message, setMessage] = useState("");

  useEffect(() => {
    // The persona's name belongs to the story, never to a string in the UI.
    const session = activeDemo();
    if (session) setMessage(fill("demo.loaded", lang, { name: session.persona.name }));
  }, [lang]);

  const press = useCallback(async () => {
    setStatus("loading");
    // The button's own label says it is loading and `aria-busy` carries that to
    // a screen reader, so the live region stays quiet rather than saying it twice.
    setMessage("");
    try {
      const { session } = await loadDemo(lang);
      setStatus("loaded");
      setMessage(fill("demo.loaded", lang, { name: session.persona.name }));
      onLoaded(session);
    } catch (error) {
      setStatus("error");
      // ApiError.messageChild is already in the child's language and never
      // mentions HTTP or a model. Anything else gets the same calm sentence.
      setMessage(error instanceof ApiError ? error.messageChild : t("errors.generic", lang));
    }
  }, [lang, onLoaded]);

  const clear = useCallback(() => {
    clearDemo();
    setStatus("cleared");
    setMessage(t("demo.cleared", lang));
    onCleared?.();
  }, [lang, onCleared]);

  const loading = status === "loading";
  const loaded = status === "loaded";

  return (
    <section
      aria-label={t("demo.button", lang)}
      className={`flex flex-col gap-3 rounded-card border border-line bg-surface p-4 ${className}`}
    >
      {loaded ? (
        <button
          type="button"
          onClick={clear}
          className="min-h-tap rounded-card border border-line bg-surface px-4 text-base font-medium text-ink transition-colors hover:border-calm"
        >
          {t("demo.clear", lang)}
        </button>
      ) : (
        <button
          type="button"
          onClick={press}
          disabled={loading}
          aria-busy={loading}
          // text-page, not text-white: --color-calm is a light teal in dark
          // mode, where white measures about 2.3:1 against the 4.5:1 floor.
          className="min-h-tap rounded-card bg-calm px-4 text-base font-semibold text-page transition-colors hover:bg-calm-strong disabled:opacity-60"
        >
          {loading ? t("demo.loading", lang) : t("demo.button", lang)}
        </button>
      )}

      {/*
        One live region for every outcome, so a screen reader hears the result
        of the press without the focus moving out from under a thumb.
      */}
      <p
        role="status"
        aria-live="polite"
        className={`text-sm ${status === "error" ? "text-help" : "text-ink-soft"}`}
      >
        {message}
      </p>
    </section>
  );
}

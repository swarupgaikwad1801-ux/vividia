import type { EngineMode } from "../lib/engineMode.ts";
import { t } from "../lib/strings.ts";

/**
 * Says, on every screen, that the app is showing an example.
 *
 * Shown only when the backend reports `engine: "mock"`. See lib/engineMode.ts
 * for why this exists: in mock mode the child's words are displayed beside a
 * fixed German sentence that has nothing to do with them, with an invented
 * agreement score under it.
 *
 * Deliberately not dismissable, and deliberately at the top of the app rather
 * than inside the result card. A judge opening the deployed app with
 * ENGINE_MODE unset must meet this before they type anything, not after they
 * have been handed a confident translation of someone else's story.
 *
 * `help` colour, the same serious-not-alarming tone as the safety panel. This
 * is not an emergency; it is the app being honest about itself.
 */
export interface ExampleModeBannerProps {
  lang: string;
  engine: EngineMode;
  /**
   * One line after the first screen (review, 28 Oct: the full banner took
   * about 9% of every screen). The whole sentence stays for screen readers.
   */
  compact?: boolean;
}

export default function ExampleModeBanner({ lang, engine, compact = false }: ExampleModeBannerProps) {
  if (engine !== "mock") return null;

  if (compact) {
    return (
      <p role="status" className="mx-4 mt-1 flex w-fit items-center gap-1.5 rounded-full border-2 border-help bg-surface px-2.5 py-0.5 text-xs font-bold text-help">
        <span aria-hidden="true" className="flex size-4 items-center justify-center rounded-full bg-help text-[0.625rem] text-page">
          i
        </span>
        {t("example.title", lang)}
        <span className="sr-only">. {t("example.body", lang)}</span>
      </p>
    );
  }

  return (
    <section
      // role="status", not "alert": nothing has gone wrong and nothing needs
      // interrupting. It is a standing fact about the whole session.
      role="status"
      // One compact strip (27 Oct): the same words, still on every screen and
      // still not dismissable, but it no longer pushes each question halfway
      // down a phone. The title runs into the body as one paragraph.
      className="mx-4 mt-2 flex items-start gap-2 rounded-xl border-2 border-help bg-surface px-3 py-2"
    >
      <span
        aria-hidden="true"
        className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-help text-xs font-bold text-page"
      >
        i
      </span>
      <p className="text-[0.8125rem] leading-snug text-ink">
        <span className="font-bold text-help">{t("example.title", lang)}. </span>
        {t("example.body", lang)}
      </p>
    </section>
  );
}

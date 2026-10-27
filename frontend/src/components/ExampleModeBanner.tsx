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
}

export default function ExampleModeBanner({ lang, engine }: ExampleModeBannerProps) {
  if (engine !== "mock") return null;

  return (
    <section
      // role="status", not "alert": nothing has gone wrong and nothing needs
      // interrupting. It is a standing fact about the whole session.
      role="status"
      className="mx-4 mt-3 flex flex-col gap-1 rounded-card border border-help bg-surface p-3"
    >
      <p className="text-sm font-semibold text-help">{t("example.title", lang)}</p>
      <p className="text-sm text-ink">{t("example.body", lang)}</p>
    </section>
  );
}

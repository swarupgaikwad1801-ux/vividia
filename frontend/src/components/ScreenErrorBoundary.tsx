/**
 * When one screen crashes, only that screen says so.
 *
 * Without this, any error while rendering a screen unmounted the whole app:
 * a blank page, with Need help and Leave now gone with it (28 Oct: tapping
 * Start on the breathing bubble did exactly that). It sits inside the
 * screen's container in App.tsx, so the top bar above it, with Need help and
 * Leave now, keeps working, and the container is keyed by step, so moving to
 * another screen starts clean.
 *
 * What the child reads is the same calm line as any other failure
 * (`errors.generic`: "Your words are not lost"), with a way back to the start.
 * Saved words live in the browser's storage, not in this screen, so they are
 * untouched. Nothing about the error is sent anywhere.
 */
import { Component, type ReactNode } from "react";
import { t } from "../lib/strings.ts";

interface Props {
  lang: string;
  onHome: () => void;
  children: ReactNode;
}

interface State {
  failed: boolean;
}

export default class ScreenErrorBoundary extends Component<Props, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  render() {
    if (!this.state.failed) return this.props.children;
    const { lang, onHome } = this.props;
    return (
      <section role="alert" className="mx-4 mt-6 flex flex-col items-start gap-4 rounded-card border-[2.5px] border-ink bg-surface p-4">
        <p className="text-lg text-ink">{t("errors.generic", lang)}</p>
        <button
          type="button"
          onClick={() => {
            this.setState({ failed: false });
            onHome();
          }}
          className="sticker min-h-tap rounded-full bg-calm px-4 text-base font-bold text-page motion-safe:active:translate-y-1 active:shadow-none"
        >
          {t("heard.home", lang)}
        </button>
      </section>
    );
  }
}

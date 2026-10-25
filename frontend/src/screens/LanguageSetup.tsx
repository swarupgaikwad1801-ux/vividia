import LanguagePicker from "../components/LanguagePicker";
import { t } from "../lib/strings";
import type { Lang } from "../lib/strings";

/**
 * First run: the child picks the language the app speaks (#4 item 5).
 *
 * This is very likely the first thing a frightened child sees, so it is three
 * taps' worth of screen and nothing else. No explanation, no welcome, no
 * consent copy, no logo wall: a name and three languages, each written the way
 * its own speakers write it.
 *
 * ## Why there is no "Choose your language" heading
 *
 * There is nowhere to get one. `strings.ts` has no key for it and is Neel's
 * file; writing German or Hindi here myself would ship copy nobody on the team
 * can review, and `HINDI_REVIEWED` is still false. The PR lists
 * `langSetup.title` for him to add.
 *
 * But the honest version of this is that the heading was never carrying its
 * weight. A screen showing "English / Deutsch / हिन्दी" and nothing else asks
 * its question in all three languages at once, which a sentence in one of them
 * cannot do. Two children in three would have been reading an instruction they
 * could not read, to find out something the buttons already told them. So the
 * only text is `app.name`, which is the same word in all three languages, and
 * the screen is language-neutral rather than translated. If Neel's key lands,
 * it is a two-line addition here — an improvement, not a fix.
 *
 * ## Nothing is chosen until the child taps
 *
 * `value={null}`: no option is pressed and nothing is in storage when this
 * mounts. `suggested` marks what the device says the child reads, so a German
 * phone's owner finds "Deutsch" fast, and that is the whole of what the
 * detection does. CLAUDE.md: the app never decides for the child.
 *
 * ## Offline, loading, error, empty
 *
 * All four are the same screen. Nothing here is fetched, so there is nothing
 * to wait for, nothing to fail and nothing to retry: this works with the radio
 * off, on a school tablet with site data blocked, and on first paint. That is
 * deliberate — a child cannot be made to wait for permission to be understood.
 * The one real failure, storage refusing the write, is absorbed by
 * `lib-lang/langStore.ts` and costs the child one extra tap next visit.
 */
export interface LanguageSetupProps {
  /**
   * The language this screen's own words are in.
   *
   * In practice `languageSetupState().lang`, which is the device's language
   * when it is one of ours and English otherwise. It changes one word on
   * screen (`app.name` is identical in all three), so getting it "wrong"
   * costs nothing — which is exactly why it is safe to guess here and not
   * safe to guess anywhere else.
   */
  lang: Lang;
  /** `languageSetupState().suggested`: marked, never applied. */
  suggested?: Lang | null;
  /**
   * The child tapped a language. Already written to browser storage by the
   * picker, so the shell only has to re-render and move on.
   */
  onChoose: (lang: Lang) => void;
}

export default function LanguageSetup({ lang, suggested = null, onChoose }: LanguageSetupProps) {
  return (
    <section className="flex flex-col gap-8" aria-labelledby="language-setup-title">
      <h1 id="language-setup-title" className="text-2xl font-semibold tracking-tight">
        {t("app.name", lang)}
      </h1>

      <LanguagePicker layout="stack" value={null} suggested={suggested} onChange={onChoose} />
    </section>
  );
}

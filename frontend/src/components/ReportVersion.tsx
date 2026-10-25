/**
 * One version of the report, labelled with whose version it is.
 *
 * The child's version and the German version are rendered by the same
 * component on purpose. They are not a draft and a final: they are the same
 * account in two languages, and the child is entitled to see exactly what the
 * adult will read before deciding anyone reads it.
 *
 * `textLang` is set on the text itself rather than the card, so a screen
 * reader switches voice for the German instead of reading it with the child's
 * own phonetics. That is the difference between a usable read-aloud of a
 * German report and noise.
 */

interface Props {
  /** Whose version this is, already in the child's language. */
  label: string;
  /** One plain sentence under the label, e.g. who reads this version. */
  note?: string;
  /** The report text from the backend, shown whole and unedited. */
  text: string;
  /** BCP 47 tag for `text`, e.g. "de" for the German version. */
  textLang: string;
}

export default function ReportVersion({ label, note, text, textLang }: Props) {
  return (
    <section className="rounded-card border border-line bg-surface p-4">
      <h2 className="text-base font-semibold">{label}</h2>
      {note ? <p className="mt-1 text-sm text-ink-soft">{note}</p> : null}
      {/* `whitespace-pre-wrap`: the report comes back as paragraphs and the
          line breaks the engine wrote are part of how it reads. */}
      <p lang={textLang} className="mt-3 whitespace-pre-wrap text-base">
        {text}
      </p>
    </section>
  );
}

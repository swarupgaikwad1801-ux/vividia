import { t, type StringKey } from "../lib/strings";

/**
 * The one kind line the app says back (lib/warm.ts chooses which), above the
 * next question.
 *
 * Plain text in a soft box, not a chat bubble: it is the app being kind, not
 * a person talking, and nothing on screen should suggest someone is typing.
 * No `role="status"` either. It is there when the screen arrives, so a screen
 * reader reads it in order, before the question, without interrupting.
 */
export default function WarmLine({ line, lang }: { line: StringKey | null; lang: string }) {
  if (!line) return null;
  return (
    // Big and clear (c-bigtype): plain words, no box. Only things you can
    // press have a shape.
    <p className="mx-4 mt-5 max-w-xl text-lg font-semibold text-ink text-pretty">
      {t(line, lang)}
    </p>
  );
}

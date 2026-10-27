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
    <p className="mx-4 mt-4 rounded-card bg-calm-soft px-4 py-3 text-base font-bold text-ink text-pretty">
      {t(line, lang)}
    </p>
  );
}

/**
 * One rung: a door, why it is a different door, and what the child may do about
 * it — which is always "open something and look at it".
 *
 * ## The whole ladder is visible, always
 *
 * Rungs the child has not reached are not hidden or locked. *"The app makes
 * sure the child knows everything they can do"*, and a child deciding whether
 * to tell their class teacher has the right to know that a service outside the
 * school exists before they start. What changes per rung is emphasis, not
 * availability: the suggested one gets the filled button, the rest get an
 * outline. Nothing is disabled.
 *
 * ## No contact details, ever
 *
 * The two rungs that are real services carry `contactsElsewhere`, and all they
 * do is offer a way into Neel's help screen (PR #47), which renders the
 * contacts from `GET /api/resources` — fed by `content/helplines.json`, the one
 * place a contact may be defined. No name, number or link to a service is
 * written in this feature, and no dialling link is produced here.
 *
 * ## "I showed this to them" is the only way a handoff is recorded
 *
 * Opening the handoff card does not count. The app cannot know whether a child
 * who looked at a card walked into a room, and guessing would climb the ladder
 * on them.
 */

import { says } from "../lib-followups-ui/copy.ts";
import {
  INTENT_KEY,
  STATE_KEY,
  rungIntents,
  type LadderIntent,
  type Rung,
  type RungState,
} from "../lib-followups-ui/ladder.ts";

export interface EscalationRungProps {
  rung: Rung;
  state: RungState;
  lang: string;
  /** Navigation only. Nothing is sent to anyone. */
  onOpen: (intent: LadderIntent) => void;
  /** The child says they showed their words to this rung. */
  onMarkShown: () => void;
  /** Undo that, for a mistaken tap or a conversation that did not count. */
  onUndoShown: () => void;
}

/** The suggested rung is emphasised; nothing else is dimmed or disabled. */
function isSuggested(state: RungState): boolean {
  return state === "start" || state === "next" || state === "top";
}

export default function EscalationRung({
  rung,
  state,
  lang,
  onOpen,
  onMarkShown,
  onUndoShown,
}: EscalationRungProps) {
  const badge = STATE_KEY[state];
  const suggested = isSuggested(state);
  const headingId = `rung-${rung.step}`;

  return (
    <li
      aria-labelledby={headingId}
      className={`flex flex-col gap-2 rounded-card border bg-surface p-4 ${
        suggested ? "border-calm" : "border-line"
      }`}
    >
      {badge && (
        <p
          className={`text-xs font-semibold uppercase tracking-wide ${
            suggested ? "text-calm-strong" : "text-ink-soft"
          }`}
          {...says(badge, lang)}
        />
      )}

      <h3 id={headingId} className="flex flex-col gap-0.5 text-base font-medium">
        {rung.nameKeys.map((key) => (
          <span key={key} {...says(key, lang)} />
        ))}
      </h3>

      <p className="text-sm text-ink-soft" {...says(rung.whyKey, lang)} />

      {/* Said out loud rather than left as a dead end: this rung's contacts are
          on another screen, and the child is told where. */}
      {rung.contactsElsewhere && (
        <p className="text-sm text-ink-soft" {...says("ladder.contactsElsewhere", lang)} />
      )}

      <div className="flex flex-col gap-2">
        {rungIntents(rung).map((intent, index) => (
          <button
            key={intent.kind}
            type="button"
            onClick={() => onOpen(intent)}
            className={`min-h-tap rounded-card px-4 text-base font-medium transition-colors ${
              suggested && index === 0
                // text-page, not text-white: --color-calm flips to a light
                // teal in dark mode, where white measures about 2.3:1
                // against the 4.5:1 floor. text-page flips with the theme,
                // giving ~5.6:1 light and ~7.8:1 dark. This is the suggested
                // next door for a child whose first adult did nothing, so it
                // is the last button to let go dim.
                //
                // No hex here on purpose: noSend.test.ts in this feature
                // forbids a raw hex anywhere in these files, comments
                // included, and it caught this comment when it named the
                // token's value. The tokens live in index.css.
                ? "bg-calm text-page hover:bg-calm-strong"
                : "border border-line text-ink hover:border-calm"
            }`}
            {...says(INTENT_KEY[intent.kind], lang)}
          />
        ))}
      </div>

      {state === "shown" || state === "top" ? (
        <button
          type="button"
          onClick={onUndoShown}
          className="min-h-tap self-start text-base text-ink-soft underline underline-offset-4"
          {...says("ladder.undo", lang)}
        />
      ) : (
        <button
          type="button"
          onClick={onMarkShown}
          className="min-h-tap self-start text-base text-calm underline underline-offset-4"
          {...says("ladder.markShown", lang)}
        />
      )}
    </li>
  );
}

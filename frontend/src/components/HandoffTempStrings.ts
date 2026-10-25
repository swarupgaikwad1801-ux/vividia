/**
 * TEMPORARY wording for this screen. Delete this file.
 *
 * `src/lib/strings.ts` is Neel's and I must not add keys to it, so the five
 * sentences this screen needs and does not yet have live here until he adds
 * them. The exact keys and suggested English are listed in the PR description.
 * When they land in strings.ts, the right change is to delete this file and
 * switch the call sites to `t(...)` - the signature is deliberately the same
 * so that is a find-and-replace.
 *
 * English only, on purpose. CLAUDE.md says nobody on the team reads German
 * well enough to review a German list, and that Hindi stays a draft until a
 * native speaker has read it. Writing German and Hindi here myself would put
 * unreviewed copy in front of a child and make it look reviewed. English in a
 * German UI is visibly a gap, which is the honest failure mode of the two.
 *
 * This is a visible gap until Neel lands the keys: a German-speaking child sees
 * five English labels. It is listed as blocking in the PR description.
 */

const TEMP = {
  /** Label above the person the child picked, on the card itself. */
  "handoff.showTo": "Show this to",
  /** Goes back to "Where does this happen?" without losing the answer. */
  "handoff.changeWhere": "Change where this happens",
  /** While the approved report is still being prepared. */
  "handoff.preparing": "Getting your words ready…",
  /** Retry after a failure. */
  "handoff.retry": "Try again",
  /** Heading for the child's own-language version of their report. */
  "handoff.yourWords": "Your words",
} as const satisfies Record<string, string>;

/** Keys this file stands in for, so a typo at a call site fails the build. */
export type TempKey = keyof typeof TEMP;

/**
 * Same shape as `t(key, lang)` so swapping it out is mechanical. `lang` is
 * accepted and ignored: there is only English here, and pretending otherwise
 * would hide the gap.
 */
export function tTemp(key: TempKey, _lang: string): string {
  return TEMP[key];
}

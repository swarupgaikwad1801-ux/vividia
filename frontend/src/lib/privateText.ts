/**
 * Attributes for every box a child types their own words into.
 *
 * `writingsuggestions="false"` turns off the browser's own inline writing
 * suggestions (Edge "Text predictions", Chrome's writing suggestions): grey
 * ghost words at the cursor. Neel saw one on the chat box (28 Oct): a faded
 * "Kuch" drawn over the placeholder "Yahan likho…", so it looked as if
 * something had been typed for the child. Two reasons to switch it off:
 *
 * - **Nobody puts words in a child's mouth.** A suggested first word is the
 *   browser writing part of the disclosure. The app never does that, and a
 *   ghost word the child might accept with one key is no better.
 * - **What a child types here is the most private text in the app.** A
 *   browser's prediction feature may read it to suggest the next word. This
 *   asks it not to.
 *
 * The keyboard's own predictions (Gboard, iOS) are the phone's, not the
 * page's, and spelling help is left on: a child who writes "hapend" still
 * gets help to write it.
 *
 * A plain object rather than JSX props, because React's types do not know
 * the attribute yet; React 19 passes it to the DOM as written.
 */
export const PRIVATE_TEXT = { writingsuggestions: "false" } as const;

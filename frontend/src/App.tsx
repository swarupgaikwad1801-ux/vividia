import { useCallback, useEffect, useState } from "react";

import CheckIn from "./screens/CheckIn";
import Escalation from "./screens/Escalation";
import FollowUp from "./screens/FollowUp";
import Handoff from "./screens/Handoff";
import { HelpScreen } from "./screens/HelpScreen";
import LanguageSetup from "./screens/LanguageSetup";
import PinSet from "./screens/PinSet";
import PinUnlock from "./screens/PinUnlock";
import Report from "./screens/Report";
import Timeline from "./screens/Timeline";
import Write from "./screens/Write";

import { HelpButton } from "./components/HelpButton";
import QuickExitButton from "./components/QuickExitButton";

import { t } from "./lib/strings";
import type { Lang } from "./lib/strings";
import { emergency } from "./lib/api";
import { languageNote } from "./lib/help";
import { addEntry, listEntries } from "./lib/timeline";
import { pinStatus } from "./lib/pin";
import { languageSetupState, saveLang } from "./lib-lang/langStore";
import type { ReportResponse, Resource } from "./types/api";

/**
 * The shell: the one place that knows which screen is showing, and what the
 * app remembers between them.
 *
 * Every screen was built to stand alone, reporting upwards through callbacks
 * and never reaching for another screen, so this file is where they meet.
 * That was deliberate - eight screens were written in parallel and none of
 * them touched this file, which is why they did not collide - and it means
 * the wiring is one reviewable change instead of eight half-decisions.
 *
 * WHAT THIS FILE IS RESPONSIBLE FOR
 *
 * 1. **Nothing is sent to anyone.** No screen below sends, and this file adds
 *    no sending of its own. `POST /api/report` turns the child's approved
 *    words into German and hands them BACK to the child. Nobody is
 *    contacted, ever, by anything here.
 *
 * 2. **The way out is on every screen.** `QuickExitButton` sits outside the
 *    switch, so it renders whatever is showing - including the PIN lock. A
 *    child needs to leave fastest at the moment they are most trapped.
 *
 * 3. **Help is reachable from everywhere**, including from inside the lock.
 *    `lib/pin.ts` says it plainly: a child who has forgotten their PIN still
 *    needs 110. `HelpButton` therefore sits outside the switch beside the
 *    quick exit, and `openHelp` remembers which screen the child left so
 *    "back" returns them to it rather than to the start.
 *
 *    Behind the lock it is `EmergencyHelp` instead, which opens in place and
 *    never moves `step` - see the note on that function. The full screen is
 *    for a child who is already past the PIN; the lock gets the numbers
 *    without a destination that could leak the words.
 *
 * 4. **The PIN guards the screens, not the data** (SAFETY.md row 2). It is
 *    checked once, here, before anything else renders. It is deliberately
 *    not consulted again afterwards: a lock that re-asks mid-sentence would
 *    cost a child the words they had just managed to write.
 *
 * WHY THERE IS STILL NO ROUTER
 *
 * The journey is a line with two branches, not a graph, and nothing links
 * into the app from outside. A router would add a dependency in freeze week,
 * put the child's step in the URL - the one place on a shared phone it should
 * not be - and give the back button a meaning we would then have to tame.
 * Quick exit depends on that last point: `lib/quickExit.ts` leaves with
 * nothing to go back to, and that only works because nothing here ever
 * called `history.pushState`.
 */

/**
 * Where the child is. A line, with two branches off the timeline.
 *
 * `locked` is deliberately NOT a member any more. Being locked is a
 * condition, not a place, and while it was a step every `setStep` call in
 * this file was a possible way around the lock. One of them was: the help
 * button on the lock screen set `step` to "timeline", and the child's own
 * words rendered with no PIN ever entered. Reproduced in a browser before
 * this change - both `text_child` and `text_de` were readable.
 *
 * `unlocked` is now separate state that no navigation touches, and the lock
 * returns early, so there is no `step` value that can reveal anything.
 */
type Step =
  | "language" // first run only
  | "checkIn" // the emoji check-in: the step that needs no language
  | "write" // the centrepiece: find the words
  | "timeline" // everything they have written
  | "report" // the bilingual report, approved word by word
  | "handoff" // choose who hears it
  | "escalation" // the next door, if the first one did not open
  | "pinSet" // set or change the PIN
  | "help"; // 110/112 and the helplines, from any screen above

/*
 * Every member of `Step` must appear in at least one `setStep` call, or its
 * screen is mounted and unreachable. Three were: `pinSet` and `followUp` had
 * no entry point at all, and `escalation` was reachable only from `followUp`,
 * so the escalation ladder was dead as well. A child could not set a PIN,
 * which in turn meant the lock never engaged.
 *
 * `followUp` is no longer a step. It gates itself - `FollowUp` returns `null`
 * unless `shouldAsk()` says the question is due, and records the answer
 * itself - so it is rendered in place beside the check-in rather than
 * navigated to. Making it a destination is what left it unreachable: a
 * destination needs a caller who knows when to send the child there, and the
 * thing that knows is the component.
 *
 * `App.reachable.test.ts` asserts this against this file's own source,
 * because TypeScript cannot: a member nothing assigns is still a valid member.
 */

export default function App() {
  // Both read before the first render, so the app never flashes the wrong
  // screen: a child on a shared phone must not glimpse the timeline for a
  // frame before the lock appears.
  // `languageSetupState()` already decides this properly: when no choice has
  // been made it hands back the device's language so the few words around the
  // picker are readable, while still reporting `needsChoice`. That is not the
  // app choosing for the child - the picker shows nothing as chosen.
  const [setup] = useState(() => languageSetupState());
  const [lang, setLang] = useState<Lang>(setup.lang);

  // Kept out of `step` on purpose: see the note on Step. Nothing but the
  // child entering their PIN may ever set this to true.
  //
  // "unavailable" means storage refused, so we cannot tell whether a PIN
  // exists. Locking on that would shut a child out of their own words
  // because of a browser setting, so only a PIN we can actually read locks.
  const [unlocked, setUnlocked] = useState(() => pinStatus() !== "set");

  const [step, setStep] = useState<Step>(() =>
    setup.needsChoice ? "language" : "checkIn",
  );

  // Carried between screens. `draft` is what the child typed and has not yet
  // approved; it survives a trip to help and back, because losing a sentence
  // a frightened child has just managed to write is the one thing this app
  // must never do.
  const [draft] = useState("");
  const [report, setReport] = useState<ReportResponse | null>(null);
  const [entries, setEntries] = useState(() => listEntries());

  const refreshEntries = useCallback(() => setEntries(listEntries()), []);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const chooseLang = useCallback((next: Lang) => {
    setLang(next);
    saveLang(next);
    setStep("checkIn");
  }, []);

  /**
   * The check-in is a mood, not a diagnosis. It opens the writing screen and
   * is never stored as a judgement about the child: `CLAUDE.md` is explicit
   * that the app works nothing out about them and gives no risk score.
   */
  const afterCheckIn = useCallback(() => setStep("write"), []);

  /**
   * The ONLY path by which an entry is written, and it runs because the child
   * pressed "Yes, that's right" - never on a timer, never because a check
   * passed, never because they navigated away.
   */
  const keepWords = useCallback(
    (approved: { text_child: string; text_de: string }) => {
      addEntry({
        date: new Date().toISOString().slice(0, 10),
        mood: "",
        text_child: approved.text_child,
        text_de: approved.text_de,
      });
      refreshEntries();
      setStep("timeline");
    },
    [refreshEntries],
  );

  /**
   * Open the help screen, and remember where to put the child back.
   *
   * "Back" has to mean the screen they were on. A child who presses "Need
   * help now?" halfway through writing has not asked to leave what they were
   * writing - and the placeholder this replaces sent every help request to
   * the timeline, so pressing help from the writing screen looked like the
   * app had thrown their sentence away.
   *
   * `draft` is why that is survivable at all: the text they typed is held
   * here, not in `Write`, so a trip to help and back does not cost it.
   *
   * NOT used by the lock. While locked, help is `EmergencyHelp` below, which
   * never moves `step` - a help button that navigated is what the leak was.
   */
  const [helpFrom, setHelpFrom] = useState<Step>("checkIn");
  const openHelp = useCallback(() => {
    // Guarded rather than assumed: the button is hidden on the help screen
    // itself, but "back" leading back to help would be a trap, not a bug
    // anyone would notice in a test.
    if (step !== "help") setHelpFrom(step);
    setStep("help");
  }, [step]);

  // The lock, before anything else and with its own return. An early return
  // is the point: while a PIN is outstanding there is no code path below this
  // line, so no screen, callback or future `setStep` can render the child's
  // words. The previous version made this a `step`, and the one control on
  // the locked screen navigated straight past it.
  if (!unlocked) {
    return (
      <div className="mx-auto flex min-h-dvh max-w-sm flex-col">
        <div className="flex justify-end px-4 pt-3">
          <QuickExitButton lang={lang} />
        </div>
        <PinUnlock
          lang={lang}
          // Help INSIDE the lock, which is why PinUnlock asks for it as a
          // node rather than a callback: a child who cannot get past their
          // own PIN still needs a way to reach 110. It opens in place rather
          // than navigating, so the lock never leaves the screen.
          help={<EmergencyHelp lang={lang} />}
          onUnlocked={() => setUnlocked(true)}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-sm flex-col">
      {/* Outside the switch on purpose: the way out and the way to 110 are on
          every screen, including the first one, where the child has not even
          chosen a language yet. Help is hidden only on the help screen, where
          it would point at itself. */}
      <div className="flex items-start justify-between gap-3 px-4 pt-3">
        {/* `shrink-0`: at 360px the quick exit's explanatory line takes the
            rest of the row, and without this "Need help now?" wrapped onto
            three lines. Measured in Chrome at the width the quality bar
            names, not guessed. */}
        {step === "help" ? (
          <span />
        ) : (
          <div className="shrink-0">
            <HelpButton lang={lang} onOpen={openHelp} />
          </div>
        )}
        <QuickExitButton lang={lang} />
      </div>

      {step === "language" && (
        <LanguageSetup lang={lang} suggested={setup.suggested} onChoose={chooseLang} />
      )}

      {step === "checkIn" && (
        <main className="flex flex-col gap-6 px-4 py-6">
          {/* Above the check-in, and self-gating: `FollowUp` renders nothing
              unless a check-in is actually due, so this is not a screen the
              child has to get past. It is here because this is the screen the
              app opens on - "don't get dropped" means asking when they come
              back, not waiting for them to go looking for the question. */}
          <FollowUp lang={lang} entries={entries} onOpen={() => setStep("escalation")} />
          <CheckIn lang={lang} onChoose={afterCheckIn} />
        </main>
      )}

      {step === "write" && (
        <Write lang={lang} initialText={draft} onApproved={keepWords} onNeedHelp={openHelp} />
      )}

      {step === "timeline" && (
        <Timeline
          lang={lang}
          onBuildReport={() => setStep("report")}
          onSetPin={() => setStep("pinSet")}
        />
      )}

      {step === "report" && (
        <Report
          lang={lang}
          onApproved={(built) => {
            setReport(built);
            setStep("handoff");
          }}
          onChange={() => setStep("timeline")}
        />
      )}

      {step === "handoff" && <Handoff lang={lang} report={report} />}

      {step === "escalation" && (
        <Escalation lang={lang} entries={entries} onOpen={() => setStep("handoff")} />
      )}

      {step === "pinSet" && <PinSet lang={lang} onDone={() => setStep("timeline")} />}

      {/* Back to the screen they left, not to the start. `helpFrom` is set by
          `openHelp`, which is the only way in. */}
      {step === "help" && <HelpScreen lang={lang} onBack={() => setStep(helpFrom)} />}
    </div>
  );
}

/**
 * 110 and 112, on the locked screen, without unlocking anything.
 *
 * Three constraints shaped this, and together they left one design:
 *
 * 1. **It must not navigate.** The bug this replaces was a help button that
 *    moved `step`. A `<details>` opens in place, so the lock stays on screen
 *    and there is no destination to get wrong. It also needs no "back"
 *    wording, which `strings.ts` does not have in any language.
 * 2. **The numbers must not be written here.** `content/helplines.json` is
 *    the only place a contact may be defined (CLAUDE.md), `GET /api/emergency`
 *    serves 110 and 112 out of it, and `noSend.test.ts` fails any screen file
 *    containing a contact number. So this renders what the backend sends and
 *    nothing of its own.
 * 3. **Hours and languages are shown, not hidden.** CLAUDE.md: both helplines
 *    we can offer are German-only, and "the crisis screen must print each
 *    service's languages; hiding this is worse than the gap itself."
 *
 * Not replaced by #47's `HelpScreen`, and not a duplicate of it either. That
 * screen is a destination with a "back" button, and behind the lock there is
 * nothing to go back to that a child without the PIN may see. This stays as
 * the version that opens in place: 110 and 112, no navigation, no way out of
 * the lock. The full list - helplines, hours, sources, the local lookup - is
 * one screen away for a child who is already past the PIN.
 *
 * It does share `languageNote()` with that screen, which is the part that
 * must not be re-implemented twice: it had been printing the raw language
 * codes the API sends ("Speaks de") and never the word "only", which is the
 * one thing CLAUDE.md says this screen may not leave out.
 */
function EmergencyHelp({ lang }: { lang: Lang }) {
  const [contacts, setContacts] = useState<Resource[] | null>(null);
  const [failed, setFailed] = useState(false);

  // Fetched when the panel mounts rather than when it opens: a child in a
  // crisis should not wait on a request they have already asked for.
  useEffect(() => {
    let live = true;
    emergency(lang)
      .then((res) => live && setContacts(res.contacts))
      .catch(() => live && setFailed(true));
    return () => {
      live = false;
    };
  }, [lang]);

  return (
    <details className="rounded-card border border-help/40 bg-help-soft">
      <summary className="min-h-tap cursor-pointer list-none px-4 py-3 text-base font-semibold text-help">
        {t("help.button", lang)}
      </summary>

      <div className="flex flex-col gap-3 px-4 pb-4">
        <h2 className="text-sm font-medium text-ink-soft">{t("help.title", lang)}</h2>

        {/* The network is the one thing that can fail here, and a child in a
            crisis is owed a reason rather than an empty box. */}
        {failed && <p className="text-base">{t("errors.network", lang)}</p>}

        {contacts?.map((contact) => (
          <section key={contact.name} className="flex flex-col gap-0.5">
            <h3 className="text-base font-medium">{contact.name}</h3>
            {/* A real tel: link, so one tap dials on the phone this runs on. */}
            <a
              href={`tel:${contact.contact.replace(/[^+\d]/g, "")}`}
              className="min-h-tap text-xl font-semibold text-help underline"
            >
              {contact.contact}
            </a>
            <p className="text-sm text-ink-soft">{contact.hours}</p>
            {/* "Speaks German only", in the child's language - not the API's
                language codes. Both helplines we can offer are German-only
                and the child has to be told so before they dial. */}
            <p className="text-sm text-ink-soft">{languageNote(contact, lang)}</p>
          </section>
        ))}
      </div>
    </details>
  );
}

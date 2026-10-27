import { useCallback, useEffect, useState } from "react";

import CheckIn from "./screens/CheckIn";
import Escalation from "./screens/Escalation";
import FollowUp from "./screens/FollowUp";
import Handoff from "./screens/Handoff";
import HandoffDone from "./screens/HandoffDone";
import { HelpScreen } from "./screens/HelpScreen";
import LanguageSetup from "./screens/LanguageSetup";
import Onboarding from "./screens/Onboarding";
import PinSet from "./screens/PinSet";
import PinUnlock from "./screens/PinUnlock";
import Report from "./screens/Report";
import Timeline from "./screens/Timeline";
import Write from "./screens/Write";

import HandoffShow from "./components/HandoffShow";
import { HelpButton } from "./components/HelpButton";
import QuickExitButton from "./components/QuickExitButton";
import type { AdultId, WhereItHappens } from "./components/HandoffSuggestions";

import { t } from "./lib/strings";
import type { Lang } from "./lib/strings";
import { back, canGoBack, current, go, start, type Step } from "./lib/nav";
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
 *    quick exit, and help is a step on the Back trail (`lib/nav.ts`), so
 *    "back" returns them to the screen they left rather than to the start.
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
 *
 * So the app's own Back button (issue #3) walks a trail kept in memory
 * (`lib/nav.ts`), not the browser history. The browser's back button still
 * leaves the app, exactly as before.
 *
 * WHERE THE CHILD IS
 *
 * `Step` lives in `lib/nav.ts`. `locked` is deliberately NOT a member. Being
 * locked is a condition, not a place, and while it was a step every
 * navigation in this file was a possible way around the lock. One of them
 * was: the help button on the lock screen set `step` to "timeline", and the
 * child's own words rendered with no PIN ever entered. Reproduced in a
 * browser before that change - both `text_child` and `text_de` were readable.
 *
 * `unlocked` is separate state that no navigation touches, and the lock
 * returns early, so there is no step - and no trail, so no Back - that can
 * reveal anything.
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

  const [trail, setTrail] = useState(() => start(setup.needsChoice ? "language" : "checkIn"));
  const step = current(trail);
  const setStep = useCallback((next: Step) => setTrail((now) => go(now, next)), []);
  const goBack = useCallback(() => setTrail((now) => back(now)), []);

  // Carried between screens. `draft` is what the child typed and has not yet
  // approved; it survives Back and a trip to help, because losing a sentence
  // a frightened child has just managed to write is the one thing this app
  // must never do. `Write` reports every keystroke up here and reads it back
  // when it mounts again.
  const [draft, setDraft] = useState("");
  const [report, setReport] = useState<ReportResponse | null>(null);
  const [entries, setEntries] = useState(() => listEntries());
  // The child's two handoff answers, kept so Back from the big card returns
  // to the same choice, and so the big card names the same person.
  const [where, setWhere] = useState<WhereItHappens | null>(null);
  const [adult, setAdult] = useState<AdultId | null>(null);

  const refreshEntries = useCallback(() => setEntries(listEntries()), []);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  // The timeline screen deletes entries in storage directly, so read them
  // again on every move: the card must never show a sentence the child deleted.
  useEffect(() => {
    refreshEntries();
  }, [step, refreshEntries]);

  const chooseLang = useCallback(
    (next: Lang) => {
      setLang(next);
      saveLang(next);
      // Straight after the first choice, so it is read once in the language
      // the child just picked. No flag is stored: a first run already is one.
      setStep("onboarding");
    },
    [setStep],
  );

  /**
   * The check-in is a mood, not a diagnosis. It opens the writing screen and
   * is never stored as a judgement about the child: `CLAUDE.md` is explicit
   * that the app works nothing out about them and gives no risk score.
   */
  const afterCheckIn = useCallback(() => setStep("write"), [setStep]);

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
      // Saved, so it is no longer a draft: the next visit to Write is empty.
      setDraft("");
      refreshEntries();
      setStep("timeline");
    },
    [refreshEntries, setStep],
  );

  // The red Need help button, from every screen: the people who can help
  // (screens/HelpScreen.tsx, #85). It goes on the trail like any other step,
  // so Back returns to the screen the child was on, with their draft kept.
  //
  // NOT used by the lock. While locked, help is `EmergencyHelp` below, which
  // never moves `step` - a lock with a button that navigates was the leak.
  const needHelp = useCallback(() => setStep("help"), [setStep]);

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
      {/* Outside the switch on purpose: the way out is on every screen,
          including the lock. Back sits in the opposite corner and looks
          quieter, so a child reaching for Leave now does not hit it. */}
      <div className="flex items-start justify-between gap-4 px-4 pt-3">
        {canGoBack(trail) ? (
          <button
            type="button"
            onClick={goBack}
            // nowrap + shrink-0: next to Leave now and its note, the arrow
            // otherwise wraps onto its own line at 360px.
            className="min-h-tap shrink-0 whitespace-nowrap rounded-card px-2 text-base font-medium text-ink-soft hover:text-ink"
          >
            <span aria-hidden="true">← </span>
            {t("nav.back", lang)}
          </button>
        ) : (
          <span />
        )}
        {/* Need help (#85) beside Leave now, hidden on the help screen, where
            it would point at itself. `shrink-0`: at 360px the quick exit's
            line takes the rest of the row. */}
        <div className="flex items-start gap-3">
          {step !== "help" && (
            <div className="shrink-0">
              <HelpButton lang={lang} onOpen={needHelp} />
            </div>
          )}
          <QuickExitButton lang={lang} />
        </div>
      </div>

      {step === "language" && (
        <LanguageSetup lang={lang} suggested={setup.suggested} onChoose={chooseLang} />
      )}

      {step === "onboarding" && <Onboarding lang={lang} onDone={() => setStep("checkIn")} />}

      {step === "checkIn" && (
        <>
          {/* Renders nothing unless the follow-up question is due (step 8).
              This is what makes "the app will ask how things are" on the
              handoff ending true. */}
          <FollowUp lang={lang} entries={entries} onOpen={() => setStep("escalation")} />
          <CheckIn lang={lang} onChoose={afterCheckIn} />
          {/* The promises stay readable after the first run, for the child
              who skipped past them and for anyone they show the app to. */}
          <button
            type="button"
            onClick={() => setStep("onboarding")}
            className="min-h-tap mt-6 self-center rounded-card px-6 text-sm font-medium text-ink-soft underline underline-offset-4 hover:text-ink"
          >
            {t("onboarding.again", lang)}
          </button>
        </>
      )}

      {step === "write" && (
        <Write
          lang={lang}
          initialText={draft}
          onTextChange={setDraft}
          onApproved={keepWords}
          onNeedHelp={needHelp}
        />
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

      {step === "handoff" && (
        <Handoff
          lang={lang}
          entries={entries}
          report={report}
          initialWhere={where}
          initialAdult={adult}
          onWhereChosen={(next) => {
            setWhere(next);
            setAdult(null);
          }}
          onAdultChosen={setAdult}
          onNext={() => setStep("handoffShow")}
        />
      )}

      {step === "handoffShow" && where && (
        <HandoffShow
          lang={lang}
          entries={entries}
          report={report}
          where={where}
          chosen={adult}
          onDone={() => setStep("handoffDone")}
        />
      )}

      {step === "handoffDone" && <HandoffDone lang={lang} onHome={() => setStep("checkIn")} />}

      {step === "escalation" && (
        <Escalation lang={lang} entries={entries} onOpen={() => setStep("handoff")} />
      )}

      {step === "pinSet" && <PinSet lang={lang} onDone={() => setStep("timeline")} />}

      {/* Back to the screen they left, not to the start: help is a step on
          the trail like any other (lib/nav.ts). */}
      {step === "help" && <HelpScreen lang={lang} onBack={goBack} />}
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
 *    and there is no destination to get wrong. It also needs no Back: the
 *    lock has no trail (`lib/nav.ts`), so there is nothing to go back to.
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

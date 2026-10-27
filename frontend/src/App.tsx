import { useCallback, useEffect, useState } from "react";

import CheckIn from "./screens/CheckIn";
import Escalation from "./screens/Escalation";
import FollowUp from "./screens/FollowUp";
import Handoff from "./screens/Handoff";
import HandoffDone from "./screens/HandoffDone";
import HelpScreen from "./screens/HelpScreen";
import LanguageSetup from "./screens/LanguageSetup";
import MoodReply from "./screens/MoodReply";
import LanguageButton from "./components/LanguageButton";
import DisplayButton from "./components/DisplayButton";
import Onboarding from "./screens/Onboarding";
import {
  FeelQuestion,
  FollowUpQuestion,
  MoreQuestion,
  OwnWordsQuestion,
  OftenQuestion,
  PictureReview,
  WhatQuestion,
  WhereQuestion,
  WhoQuestion,
} from "./screens/PictureQuestions";
import PinSet from "./screens/PinSet";
import PinUnlock from "./screens/PinUnlock";
import Report from "./screens/Report";
import Timeline from "./screens/Timeline";
import Listen from "./screens/Listen";
import Write from "./screens/Write";

import DemoButton from "./components/DemoButton";
import GameMap from "./components/GameMap";
import HandoffShow from "./components/HandoffShow";
import QuickExitButton from "./components/QuickExitButton";
import ExampleModeBanner from "./components/ExampleModeBanner";
import type { AdultId, WhereItHappens } from "./components/HandoffSuggestions";

import type { DemoSession } from "./lib-demo/demoStory";
import { useEngineMode } from "./lib/engineMode";

import { t } from "./lib/strings";
import type { Lang } from "./lib/strings";
import { HOME, afterLanguage, back, canGoBack, current, go, start, type Step } from "./lib/nav";
import { MOOD_CODES } from "./lib/moods";
import { NO_PICKS, entryFor, handoffWhereFor, type Picks } from "./lib/pictures";
import { SCENE, mapFor } from "./lib/scenes";
import {
  ANSWER_OF,
  adultRoute,
  answersFor,
  nextQuestion,
  questionsFor,
  wroteOwnWords,
  type QuestionStep,
} from "./lib/questions";
import { loadAvatar, saveAvatar } from "./lib/avatar";
import { emergency } from "./lib/api";
import { languageNote } from "./lib/help";
import { addEntry, listEntries } from "./lib/timeline";
import type { Turn } from "./lib/listening";
import { pinStatus } from "./lib/pin";
import { languageSetupState, saveLang } from "./lib-lang/langStore";
import { applyDocumentLang } from "./lib-lang/languages";
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
 *    needs 110. The red Need help pill therefore sits outside the switch,
 *    beside Leave now in the quick exit's bar, and help is a step on the Back trail (`lib/nav.ts`), so
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
  // Asked once for the whole session. In mock mode every screen says so, and
  // the result card drops its agreement score: see lib/engineMode.ts.
  const engine = useEngineMode();

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
  // The demo button also fills it, with Amara's sentence; nothing else may
  // put text in a child's mouth.
  const [draft, setDraft] = useState("");
  // The listening conversation and its unsent message, kept here for the
  // same reason as `draft`: Back, Help or a language change must not lose a
  // word of it. Cleared only when it has become an entry, or the demo ends.
  const [turns, setTurns] = useState<Turn[]>([]);
  const [talkDraft, setTalkDraft] = useState("");
  // "Make a card" on the listening screen: the writing screen checks the
  // German straight away, because the child has already said everything.
  const [autoCheck, setAutoCheck] = useState(false);
  const [report, setReport] = useState<ReportResponse | null>(null);
  const [entries, setEntries] = useState(() => listEntries());
  // The child's two handoff answers, kept so Back from the big card returns
  // to the same choice, and so the big card names the same person.
  const [where, setWhere] = useState<WhereItHappens | null>(null);
  const [adult, setAdult] = useState<AdultId | null>(null);
  // The child's traveller on the map: a picture, stored only on this phone.
  const [avatar, setAvatar] = useState(() => loadAvatar());
  // The picture answers, question by question, kept here so Back returns to
  // each question as the child left it. Nothing is stored until the child
  // says the lines are right.
  const [picks, setPicks] = useState<Picks>(NO_PICKS);
  const [checkInMood, setCheckInMood] = useState<string | null>(null);
  const pick = useCallback(
    (question: keyof Picks) => (next: string[]) => setPicks((now) => ({ ...now, [question]: next })),
    [],
  );

  const refreshEntries = useCallback(() => setEntries(listEntries()), []);

  useEffect(() => {
    // hi-Latn for Hinglish, so a screen reader reads Roman Hindi as Hindi.
    applyDocumentLang(lang);
  }, [lang]);

  // The timeline screen deletes entries in storage directly, so read them
  // again on every move: the card must never show a sentence the child deleted.
  // Same for the traveller, which "delete everything" also clears.
  useEffect(() => {
    refreshEntries();
    setAvatar(loadAvatar());
  }, [step, refreshEntries]);

  const chooseLang = useCallback(
    (next: Lang) => {
      setLang(next);
      saveLang(next);
      // First run: straight to the check-in (Neel, 26 Oct): the cards are not
      // shown by default. "What this app does" at the bottom opens them.
      // From the 🌐 button: back to where the child was. Only the language
      // changes; the timeline, the draft and the picture answers are kept.
      setTrail(afterLanguage);
    },
    [],
  );

  /**
   * The check-in is a mood, not a diagnosis. It opens the picture questions
   * (Neel, 26 Oct: ask, don't make the child write) and is never stored as a
   * judgement about the child: `CLAUDE.md` is explicit that the app works
   * nothing out about them and gives no risk score.
   */
  const afterCheckIn = useCallback(
    (mood: string | null) => {
      setCheckInMood(mood);
      // An answer to the face first (screens/MoodReply.tsx), not "What
      // happened?": after "Good" that question assumed something had.
      setStep("checkInReply");
    },
    [setStep],
  );

  /**
   * The picture answers become one entry, saved because the child pressed
   * "Yes, save it" on the lines it will carry. Marked as chosen from
   * pictures, so the card never shows a tapped tile as a quote. Then the
   * offer to write; Back from there goes home rather than to a screen that
   * could save the same answers twice.
   */
  /**
   * The end of the questions, with or without saving. The child's own words
   * (from "Something else") go to the writing screen, prefilled, where the
   * German is checked and they approve it; otherwise the offer to write.
   * Back from there goes home rather than to a screen that could save the
   * same answers twice.
   */
  const finishPictures = useCallback(
    (save: boolean) => {
      const choices = answersFor(picks);
      if (save) {
        const feel = picks.feel.find((code) => MOOD_CODES.includes(code)) ?? checkInMood ?? "";
        addEntry(entryFor(choices, lang, new Date().toISOString().slice(0, 10), feel), "pictures");
        refreshEntries();
      }
      // An adult from home means the handoff must not suggest family: that
      // answer wins over anything remembered.
      const start = handoffWhereFor(choices.where, choices.adultWhere, Boolean(choices.whereOnline));
      setWhere((now) => (start === "home" ? "home" : now ?? start));
      const own = questionsFor(picks).includes("picOwn") && wroteOwnWords(picks) ? picks.own[0] : "";
      setPicks(NO_PICKS);
      if (own) {
        // Their own words start the conversation, in the box, not yet sent:
        // the child presses "Write it down" themselves.
        setTalkDraft(own);
        setTrail([HOME, "listen"]);
      } else {
        setTrail([HOME, "picMore"]);
      }
    },
    [picks, checkInMood, lang, refreshEntries],
  );
  const keepPictures = useCallback(() => finishPictures(true), [finishPictures]);

  /**
   * Go on from a question. Skip has just cleared the answer, but that state
   * update lands after this call, so the next question is worked out from
   * the cleared answers here rather than from the stale ones.
   */
  const advance = useCallback(
    (from: QuestionStep) => (skipped?: boolean) => {
      const key = ANSWER_OF[from];
      const now = skipped ? { ...picks, [key]: [], ...(from === "picWho" ? { kind: [] } : {}) } : picks;
      setStep(nextQuestion(from, now));
    },
    [picks, setStep],
  );

  /**
   * The ONLY path by which an entry is written, and it runs because the child
   * pressed "Yes, that's right" - never on a timer, never because a check
   * passed, never because they navigated away.
   */
  const keepWords = useCallback(
    (approved: { text_child: string; text_de: string }) => {
      addEntry(
        {
          date: new Date().toISOString().slice(0, 10),
          mood: "",
          text_child: approved.text_child,
          text_de: approved.text_de,
        },
        "words",
      );
      // Saved, so it is no longer a draft: the next visit to Write is empty.
      setDraft("");
      // The conversation those words came from is filed with them.
      setTurns([]);
      setTalkDraft("");
      setAutoCheck(false);
      refreshEntries();
      // Those words are an entry now. Leaving them in `draft` would refill the
      // writing screen with a sentence the child has already filed the next
      // time they open it.
      setDraft("");
      setStep("timeline");
    },
    [refreshEntries, setStep],
  );

  /**
   * "Try Amara's story": the judge's way in, and the first button pressed on
   * the demo URL.
   *
   * `DemoButton` has already fetched the story and seeded the timeline by the
   * time this runs, so all that is left is the part only the shell can do:
   * show the five entries it added, put the live sentence in the writing
   * screen, and go there. Nothing is translated and nothing is sent - the
   * judge presses send themselves, which is the moment the demo exists for.
   *
   * The language follows the story rather than the other way round. Amara
   * writes English, so `Write` would otherwise be told to translate an English
   * sentence *from* whatever the UI happened to be set to, and a Hindi or
   * German source language on English text is a wrong answer we asked for.
   * `saveLang` is deliberately not called: this is the example's language for
   * as long as the example is loaded, not a choice the child made.
   */
  const startDemo = useCallback(
    (session: DemoSession) => {
      const storyLang = session.draft.lang;
      if (storyLang === "en" || storyLang === "de" || storyLang === "hi") {
        setLang(storyLang);
      }
      refreshEntries();
      // Into the listening screen's box, not the writing screen's: the judge
      // presses "Write it down" and sees the app answer before any card.
      setTurns([]);
      setTalkDraft(session.draft.text);
      setStep("listen");
    },
    [refreshEntries, setStep],
  );

  /**
   * The example has been taken back out, so the app has to look like it never
   * ran: the seeded entries are gone from storage and the prefilled sentence
   * must go with them, or the writing screen still holds Amara's words.
   */
  const endDemo = useCallback(() => {
    refreshEntries();
    setDraft("");
    setTurns([]);
    setTalkDraft("");
    setStep("checkIn");
  }, [refreshEntries, setStep]);

  // The red Need help button, from every screen: the calm list of people who
  // can help (screens/HelpScreen.tsx). Back returns to where the child was.
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
    // The lock is a quiet scene: plain colour, no map, no motion.
    return (
      <div data-scene="quiet" className="min-h-dvh bg-scene">
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
      </div>
    );
  }

  const scene = SCENE[step];
  const onMap = mapFor(step, picks);

  return (
    // One flat colour per place (lib/scenes.ts), filling the whole screen.
    <div data-scene={scene} className="min-h-dvh bg-scene transition-colors duration-300">
    <div className="mx-auto flex min-h-dvh max-w-sm flex-col">
      {/* Outside the switch on purpose: the way out is on every screen,
          including the lock. Back sits in the opposite corner and looks
          quieter, so a child reaching for Leave now does not hit it. Need
          help (red) sits left of Leave now (dark outline), a gap apart.
          All three are one row, the same height (44px) and the same type
          (Inter, bold, base size); only their weight differs: Back is bare
          text, Need help and Leave now are stickers. */}
      <div className="top-bar flex items-center justify-between gap-2 px-4 pt-1">

        {canGoBack(trail) ? (
          <button
            type="button"
            onClick={goBack}
            // nowrap + shrink-0: next to Leave now, the arrow otherwise wraps
            // onto its own line at 360px. Same type as the two buttons beside
            // it, but no outline, no fill and the softer ink, so it stays
            // quieter than Leave now.
            className="min-h-tap shrink-0 whitespace-nowrap rounded-full pr-1 text-base font-bold text-ink-soft hover:text-ink"
          >
            <span aria-hidden="true">← </span>
            {t("nav.back", lang)}
          </button>
        ) : (
          <span />
        )}
        <QuickExitButton
          lang={lang}
          beside={
            step === "help" ? null : (
              <button
                type="button"
                onClick={needHelp}
                // need-help: pulses while a danger line is on screen (index.css).
                className="need-help sticker min-h-tap shrink-0 whitespace-nowrap rounded-full bg-help px-2.5 text-base font-bold text-page motion-safe:active:translate-y-1 active:shadow-none"
              >
                {t("help.short", lang)}
              </button>
            )
          }
        />
      </div>

      {/* Above every screen from the language picker onwards, and above the
          map: a judge who opens a mock deploy must read this before they
          type.

          NOT above the lock, which #82 made an early `return` higher up so
          that no `setStep` can get past it. That is deliberate, not the
          oversight it looked like in review: this banner's job is to stop
          someone believing an OUTPUT, and a child at the PIN screen has not
          typed anything for the app to have answered. Putting it there would
          add a second place for `engine` to go stale while guarding nothing. */}
      <ExampleModeBanner lang={lang} engine={engine} />

      {onMap !== null && (
        <GameMap
          places={onMap.places}
          at={onMap.at}
          avatar={avatar}
          lang={lang}
          onAvatar={(next) => {
            setAvatar(next);
            saveAvatar(next);
          }}
        />
      )}

      {/* Keyed by step, so each new place slides in. Quiet scenes do not
          move. Reduced motion stops it anyway (index.css). */}
      <div key={step} className={`flex flex-col ${scene === "quiet" ? "" : "animate-slide-in"}`}>
      {step === "language" && (
        <LanguageSetup
          lang={lang}
          suggested={setup.suggested}
          onChoose={chooseLang}
          changing={canGoBack(trail)}
        />
      )}

      {step === "onboarding" && (
        <Onboarding lang={lang} onDone={() => setStep("checkIn")} />
      )}

      {step === "checkIn" && (
        <>
          {/* Renders nothing unless the follow-up question is due (step 8).
              This is what makes "the app will ask how things are" on the
              handoff ending true. */}
          <FollowUp lang={lang} entries={entries} onOpen={() => setStep("escalation")} />
          <CheckIn lang={lang} onChoose={afterCheckIn} />
          {/* The three cards, on request only: one quiet row of small chips,
              for the child who wants to know and for anyone they show the
              app to. The row wraps only for Text's options, which take a line
              of their own below it. */}
          <div className="mx-4 mt-1 flex flex-wrap justify-center gap-1.5">
            <LanguageButton lang={lang} onOpen={() => setStep("language")} />
            <DisplayButton lang={lang} />
            <button
              type="button"
              onClick={() => setStep("onboarding")}
              className="sticker min-h-tap whitespace-nowrap rounded-full bg-surface px-2.5 text-sm font-bold text-ink motion-safe:active:translate-y-1 active:shadow-none"
            >
              {t("onboarding.again", lang)}
            </button>
          </div>

          {/* Below the check-in, not above it: a child who opens the app gets
              their own question first, and the example is for the visitor.
              It is on this screen because this is where both of them land, and
              a judge should not have to find it. Set apart under its own
              heading, behind a dashed rule, so it does not read as one of the
              child's choices. */}
          <footer aria-labelledby="grown-ups" className="mx-4 mt-8 mb-8 flex flex-col gap-3 border-t-[2.5px] border-dashed border-ink/50 pt-5">
            <h2 id="grown-ups" className="text-sm font-bold text-ink">
              {t("home.grownUps", lang)}
            </h2>
            <DemoButton lang={lang} onLoaded={startDemo} onCleared={endDemo} />
          </footer>
        </>
      )}

      {step === "checkInReply" && (
        <MoodReply
          lang={lang}
          mood={checkInMood}
          onPictures={() => setStep("picWhat")}
          onWrite={() => setStep("listen")}
          onHome={() => setTrail([HOME])}
        />
      )}

      {/* The picture questions: one per screen, each skippable. Which comes
          next depends on the answers so far (lib/questions.ts). */}
      {step === "picWhat" && (
        <WhatQuestion lang={lang} value={picks.what} onChange={pick("what")} onNext={advance("picWhat")} />
      )}
      {(step === "picBody" || step === "picTaken" || step === "picWhereOnline" || step === "picWhen" || step === "picAdultWhere") && (
        <FollowUpQuestion
          key={step}
          step={step}
          lang={lang}
          value={picks[ANSWER_OF[step]]}
          onChange={pick(ANSWER_OF[step])}
          onNext={advance(step)}
        />
      )}
      {step === "picOwn" && (
        <OwnWordsQuestion lang={lang} value={picks.own} onChange={pick("own")} onNext={advance("picOwn")} />
      )}
      {step === "picWhere" && (
        <WhereQuestion lang={lang} value={picks.where} onChange={pick("where")} onNext={advance("picWhere")} />
      )}
      {step === "picWho" && (
        <WhoQuestion
          lang={lang}
          howMany={picks.howMany}
          kind={picks.kind}
          onChange={(next) => setPicks((now) => ({ ...now, ...next }))}
          onNext={(skipped) => advance("picWho")(skipped)}
        />
      )}
      {step === "picOften" && (
        <OftenQuestion lang={lang} value={picks.often} onChange={pick("often")} onNext={advance("picOften")} />
      )}
      {step === "picFeel" && (
        <FeelQuestion lang={lang} value={picks.feel} onChange={pick("feel")} onNext={advance("picFeel")} />
      )}
      {step === "picReview" && (
        <PictureReview
          lang={lang}
          choices={answersFor(picks)}
          onSave={keepPictures}
          onChange={() => setStep("picWhat")}
          onNext={() => finishPictures(false)}
          prominentHelp={adultRoute(picks)}
        />
      )}
      {step === "picMore" && (
        <MoreQuestion
          lang={lang}
          onWrite={() => setStep("listen")}
          onMakeCard={() => setStep("handoff")}
          // The answers are saved by now; "No thanks" means nothing more today.
          onNoThanks={() => setTrail([HOME])}
        />
      )}

      {step === "listen" && (
        <Listen
          lang={lang}
          turns={turns}
          onTurnsChange={setTurns}
          draft={talkDraft}
          onDraftChange={setTalkDraft}
          onMakeCard={(words) => {
            setDraft(words);
            setAutoCheck(true);
            setStep("write");
          }}
          onHome={() => setTrail([HOME])}
          onNeedHelp={needHelp}
        />
      )}

      {step === "write" && (
        <Write
          lang={lang}
          autoCheck={autoCheck}
          initialText={draft}
          onTextChange={setDraft}
          onApproved={keepWords}
          engine={engine}
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

      {step === "help" && <HelpScreen lang={lang} />}
      </div>
    </div>
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

        {/* What "Leave now" does and does not do, said here once (it is no
            longer under the button on every screen). */}
        <p className="text-sm text-ink-soft">{t("quickExit.note", lang)}</p>

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

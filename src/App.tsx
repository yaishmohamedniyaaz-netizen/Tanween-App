import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { Header, type AppView } from "./components/Header";
import { openMushafSurface } from "./lib/mushafSurface";
import { Mushaf } from "./components/Mushaf";
import { MushafViewport } from "./components/MushafViewport";
import { ConnectedFixedMushaf, FixedMushafViewport } from "./components/ConnectedFixedMushaf";
import { fixedMushafReviewEnabled } from "./lib/fixedMushafReview";
import { ScorePanel } from "./components/ScorePanel";
import { MistakeLog } from "./components/MistakeLog";
import { MobileJudgeDeck } from "./components/MobileJudgeDeck";
import { mobileCalibrationEnabled } from './lib/mobileCalibration';
import './components/mobileCalibration.css';
import { NotesBox } from "./components/NotesBox";
import { ResultSheet } from "./components/ResultSheet";
import { MarkingCoachTip } from "./components/MarkingCoachTip";
import { RecordsView } from "./components/RecordsView";
import { StartDialog } from "./components/StartDialog";
import { CompetitionSetup, type SetupReturnPoint } from "./components/CompetitionSetup";
import { SettingsWorkspace } from "./components/SettingsWorkspace";
import { QuestionPreparationWorkspace } from "./components/QuestionPreparationWorkspace";
import { CompetitionIdlePanel } from "./components/CompetitionIdlePanel";
import { FinishDialog } from "./components/FinishDialog";
import { useSessionSaveStatus } from "./components/SessionStorageBoundary";
import { JudgeRoleStrip } from "./components/JudgeRoleStrip";
import { PreparedSidebar } from "./components/PreparedSidebar";
import { PageNav } from "./components/PageNav";
import { OfflineMushafPrompt } from "./components/OfflineMushafPrompt";
import {
  TilawaPrototypePanel,
  type TilawaTrackerStatus,
} from "./components/TilawaPrototypePanel";
import { useOfflineMushaf } from "./hooks/useOfflineMushaf";
import { useReadyFixedPage } from './hooks/useReadyFixedPage';
import { useMobileDockSpace } from './hooks/useMobileDockSpace';
import { useRecitationRecorder } from "./hooks/useRecitationRecorder";
import { pauseOfflineMushafDownload } from "./lib/offlineMushaf";
import { useJudging } from "./state/store";
import {
  questionIsVisibleOnPages,
  questionOpeningKey,
  questionOpeningPage,
} from "./lib/questionPage";
import { participantDivision } from "./lib/reciterQuestions";
import { loadQuestionIndex } from "./lib/questionBank";
import { tilawaMushafWordId, type TilawaWordProgress } from "./lib/tilawaWordFocus";
import { isWaiting } from "./lib/rosterQueue";
import { missingRequiredImpressionCategories } from "./lib/scoring";
import { mobileJudgeDeckEnabled } from "./lib/mobileJudgeDeck";
import { installQuietScrollbars } from "./lib/quietScrollbars";
import {
  applyDeviceTheme,
  DEFAULT_DEVICE_PREFERENCES,
  readDevicePreferences,
  writeDevicePreferences,
  type DevicePreferencesV5,
} from "./lib/devicePreferences";

const LS_PAGE_KEY = "tahqeeq:lastPage";
import { MOBILE_MUSHAF_QUERY, MOBILE_MUSHAF_DEFAULT_ZOOM } from './lib/mobileMushafPresentation';
// Records the session and question the Mushaf was last opened for, so the
// opening page is restored once per reciter rather than on every render.
const LS_QUESTION_PAGE_KEY = "tahqeeq:questionOpenedFor";

// Dev-only score card size tuner: open the dev server with ?tune=scorecard.
// import.meta.env.DEV is false in production builds, so this is never bundled there.
const ScorecardTuner =
  import.meta.env.DEV && new URLSearchParams(window.location.search).get("tune") === "scorecard"
    ? lazy(() => import("./dev/ScorecardTuner").then((m) => ({ default: m.ScorecardTuner })))
    : null;

export function App() {
  const appRef = useRef<HTMLDivElement>(null);
  const [fixedReview] = useState(fixedMushafReviewEnabled);
  const PageViewport = fixedReview ? FixedMushafViewport : MushafViewport;
  const PageRenderer = fixedReview ? ConnectedFixedMushaf : Mushaf;
  const { state, dispatch } = useJudging();
  const offlineMushaf = useOfflineMushaf();
  const [view, setView] = useState<AppView>("judge");
  const setupReturnPointRef = useRef<SetupReturnPoint | null>(null);
  const [mobileMushafControls, setMobileMushafControls] = useState<HTMLDivElement | null>(null);
  const [startOpen, setStartOpen] = useState(false);
  const [startMode, setStartMode] = useState<
    "start" | "next-question" | "change-reciter" | "change-question"
  >("start");
  const [finishOpen, setFinishOpen] = useState(false);
  const [finishHandoff, setFinishHandoff] = useState(false);
  const focusNextReciterRef = useRef(false);
  const [openingQuestionPage, setOpeningQuestionPage] = useState<number | null>(null);
  const [questionPageError, setQuestionPageError] = useState<string | null>(null);
  const retryQuestionPageRef = useRef<() => void>(() => {});
  const questionRevealFrame = useRef(0);
  const closeQuestionPicker = useCallback(() => {
    cancelAnimationFrame(questionRevealFrame.current);
    setOpeningQuestionPage(null);
    setQuestionPageError(null);
    setStartOpen(false);
    setFinishOpen(false);
    setFinishHandoff(false);
  }, []);
  useEffect(() => () => cancelAnimationFrame(questionRevealFrame.current), []);
  const sessionSaveStatus = useSessionSaveStatus();
  useEffect(() => {
    if (finishHandoff && (sessionSaveStatus?.phase === "failed" || sessionSaveStatus?.phase === "conflict")) {
      // The native modal must not hide the existing recovery/retry controls.
      closeQuestionPicker();
    }
  }, [finishHandoff, sessionSaveStatus?.phase, closeQuestionPicker]);
  const [markingGuideOpen, setMarkingGuideOpen] = useState(false);
  const [moreControlsOpen, setMoreControlsOpen] = useState(false);
  const [phrasesOpen, setPhrasesOpen] = useState(false);
  // One document listener set for every .quiet-scroll list (idempotent).
  useEffect(() => installQuietScrollbars(), []);
  useEffect(() => {
    if (startOpen || finishOpen || markingGuideOpen) {
      openMushafSurface(markingGuideOpen ? "guide" : "sheet");
    }
  }, [startOpen, finishOpen, markingGuideOpen]);
  const [recordPracticeRecitation, setRecordPracticeRecitation] = useState(false);
  const [tilawaWordFocus, setTilawaWordFocus] = useState<string | null>(null);
  const [tilawaPanelOpen, setTilawaPanelOpen] = useState(false);
  const [tilawaStatus, setTilawaStatus] = useState<TilawaTrackerStatus>("idle");
  const showTilawaPrototype = new URLSearchParams(window.location.search)
    .get("tilawaPrototype") === "1";
  const [preferences, setPreferences] = useState<DevicePreferencesV5>(() =>
    readDevicePreferences(undefined, fixedReview && window.matchMedia(MOBILE_MUSHAF_QUERY).matches ? MOBILE_MUSHAF_DEFAULT_ZOOM : 100),
  );
  const [mobilePortrait, setMobilePortrait] = useState(() => window.matchMedia(MOBILE_MUSHAF_QUERY).matches);
  const [zoomConstrained, setZoomConstrained] = useState(false);
  useEffect(() => {
    const media = window.matchMedia(MOBILE_MUSHAF_QUERY);
    const update = () => setMobilePortrait(media.matches);
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  const [mobileJudgeDeckOn] = useState(() =>
    mobileJudgeDeckEnabled(window.location.search),
  );
  const [mobileJudgeLayout] = useState<"centered" | "raised">(() =>
    new URLSearchParams(window.location.search).get("mobileJudgeLayout") === "raised"
      ? "raised"
      : "centered",
  );
  const [page, setPage] = useState(() => {
    const saved = localStorage.getItem(LS_PAGE_KEY);
    if (saved) {
      const n = Number(saved);
      if (!Number.isNaN(n) && n >= 1 && n <= 604) return n;
    }
    return 604;
  });
  const recitationAudio = useRecitationRecorder({
    activeSessionId: state.activeSessionId ?? null,
    sessionActive: state.sessionActive,
  });
  const recordingStartContext = `${state.preparedRecitation?.id ?? ''}:${view}:${startOpen}:${recordPracticeRecitation}`;
  const recordingStartContextRef = useRef(recordingStartContext);
  recordingStartContextRef.current = recordingStartContext;
  useEffect(() => {
    if (!state.sessionActive) recitationAudio.cancelPrepared();
  }, [recordingStartContext]);

  useEffect(() => {
    localStorage.setItem(LS_PAGE_KEY, String(page));
  }, [page]);

  useEffect(() => {
    applyDeviceTheme(preferences.theme);
    writeDevicePreferences(preferences);
  }, [preferences]);

  useEffect(() => {
    setRecordPracticeRecitation(false);
  }, [state.preparedRecitation?.id]);

  // Bulk asset work must never compete with a live recitation. A paused
  // package resumes deliberately from More actions after judging.
  useEffect(() => {
    if (state.sessionActive && offlineMushaf.phase === "downloading") {
      pauseOfflineMushafDownload();
    }
  }, [offlineMushaf.phase, state.sessionActive]);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [view]);

  const updatePreferences = (patch: Partial<DevicePreferencesV5>) => {
    setPreferences((current) => ({ ...current, ...patch, version: 5 }));
  };

  // Open the Mushaf on the page the reciter's question actually starts on.
  // This runs once per session and question: the judge navigates freely
  // afterwards, and a refresh mid-recitation must not drag the page back to
  // the opening one. Manual questions carry no page and only mark the pairing
  // as handled.
  const openedPreparationRef = useRef<{ key: string; questionId: string } | null>(null);
  const openedForKey = questionOpeningKey(
    state.activeSessionId ?? state.preparedRecitation?.id,
    state.activeQuestion ?? state.preparedRecitation?.question,
  );
  const visibleQuestion = state.activeQuestion ?? state.preparedRecitation?.question;
  const lastQuestionRendererKey = useRef(visibleQuestion?.id ?? "idle");
  useLayoutEffect(() => {
    if (visibleQuestion) lastQuestionRendererKey.current = visibleQuestion.id;
  }, [visibleQuestion?.id]);
  useEffect(() => { openMushafSurface("navigation"); }, [page, view, state.activeSessionId]);
  const openingPage = questionOpeningPage(visibleQuestion);
  const visibleQuestionRange = visibleQuestion?.version === 2
    ? visibleQuestion.range ?? null
    : null;

  useLayoutEffect(() => {
    const preparation = openedPreparationRef.current;
    openedPreparationRef.current = state.preparedRecitation && openedForKey
      ? { key: openedForKey, questionId: state.preparedRecitation.question.id }
      : null;
    if (!openedForKey) return;
    const handledKey = localStorage.getItem(LS_QUESTION_PAGE_KEY);
    if (handledKey === openedForKey) return;
    localStorage.setItem(LS_QUESTION_PAGE_KEY, openedForKey);
    // Begin gives the already-open prepared question a new session ID. Adopt
    // that key without moving the page the judge has been viewing or panning.
    if (state.activeSessionId && preparation &&
        preparation.questionId === visibleQuestion?.id &&
        preparation.key === handledKey) return;
    if (openingPage === null) return;
    setPage(openingPage);
  }, [openedForKey, openingPage, state.preparedRecitation?.id, state.activeSessionId, visibleQuestion?.id]);

  const prepareQuestionPage = useCallback((target: number | null) => {
    if (target === null || !fixedReview) { closeQuestionPicker(); return; }
    setQuestionPageError(null);
    setOpeningQuestionPage(target);
    setPage(target);
  }, [fixedReview, closeQuestionPicker]);

  const questionPageReady = useCallback((pages: readonly number[]) => {
    if (openingQuestionPage === null || page !== openingQuestionPage || !pages.includes(openingQuestionPage)) return;
    cancelAnimationFrame(questionRevealFrame.current);
    // Artwork and hit geometry are ready. Let the viewport's resize measurement
    // commit its final Fit before uncovering the prepared workspace.
    questionRevealFrame.current = requestAnimationFrame(() => {
      questionRevealFrame.current = requestAnimationFrame(closeQuestionPicker);
    });
  }, [openingQuestionPage, page, closeQuestionPicker]);

  const questionPageFailed = useCallback((error: string | null, retry: () => void) => {
    retryQuestionPageRef.current = retry;
    setQuestionPageError(error);
  }, []);

  const handlePageChange = useCallback(
    (p: number) => {
      const clamped = Math.max(1, Math.min(604, p));
      if (clamped !== page) setPage(clamped);
    },
    [page],
  );

  const followDetectedAyah = useCallback(
    async (match: { surah: number; ayah: number }) => {
      try {
        const lookup = await loadQuestionIndex();
        const detected = lookup.byKey.get(`${match.surah}:${match.ayah}`);
        if (!detected) return;
        setPage((current) => current === detected.startPage
          ? current
          : detected.startPage);
      } catch {
        // Recognition can continue if the local Mushaf index is unavailable.
      }
    },
    [],
  );

  const followDetectedWord = useCallback((progress: TilawaWordProgress) => {
    setTilawaWordFocus(tilawaMushafWordId(progress));
  }, []);

  const clearDetectedWord = useCallback(() => setTilawaWordFocus(null), []);

  const hasNextReciter = state.roster.some(
    (entry) => entry.id !== state.participant.id && isWaiting(entry),
  );
  const mobileJudgeDeckActive =
    mobileJudgeDeckOn && view === "judge" && state.sessionActive;
  const mobilePreparedActive =
    mobileJudgeDeckOn && view === "judge" && Boolean(state.preparedRecitation);
  const mobilePaper = fixedReview && mobilePortrait && (mobileJudgeDeckActive || mobilePreparedActive);
  const mobileCalibration = mobilePaper && mobileCalibrationEnabled(window.location.search);
  const readyNavigation = useReadyFixedPage(page, mobileCalibration);
  const displayedPage = readyNavigation.ready?.page ?? page;
  useMobileDockSpace(appRef, mobileCalibration, mobileJudgeDeckActive);

  const finishRecitation = async () => {
    await Promise.race([
      recitationAudio.finish(),
      new Promise<void>((resolve) => window.setTimeout(resolve, 2_500)),
    ]);
    // The desktop rail already owns the next-reciter action. Compact layouts
    // keep the modal handoff because their rail is below the Mushaf or hidden.
    // Read the current layout after recording stops in case the device rotated.
    const showQueueHandoff = !window.matchMedia("(min-width: 901px)").matches;
    focusNextReciterRef.current = hasNextReciter && !showQueueHandoff;
    dispatch({ type: "FINISH_SESSION" });
    setRecordPracticeRecitation(false);
    setStartMode("start");
    if (hasNextReciter && showQueueHandoff) setFinishHandoff(true);
    else setFinishOpen(false);
  };

  useLayoutEffect(() => {
    if (!focusNextReciterRef.current || state.sessionActive || finishOpen) return;
    focusNextReciterRef.current = false;
    appRef.current?.querySelector<HTMLButtonElement>(".competition-start-reciter")
      ?.focus({ preventScroll: true });
  }, [state.sessionActive, finishOpen]);

  const closeFinish = closeQuestionPicker;

  return (
    <div
      ref={appRef}
      className={`app view-${view}`}
      data-mobile-judge-deck={mobileJudgeDeckActive ? "true" : undefined}
      data-mobile-calibration={mobileCalibration ? 'true' : undefined}
      data-mobile-prepared={mobilePreparedActive ? "true" : undefined}
      data-competition-live={state.competition.status === "live" ? "true" : undefined}
      data-mobile-judge-layout={
        (mobileJudgeDeckActive || mobilePreparedActive) && mobileJudgeLayout === "raised"
          ? "raised"
          : undefined
      }
    >
      <Header
        onPhrasesOpenChange={setPhrasesOpen}
        mobileMushafControlsRef={setMobileMushafControls}
        view={view}
        onToggleView={() => setView((current) => (current === "judge" ? "records" : "judge"))}
        onOpenSetup={() => {
          setStartOpen(false);
          setView("setup");
        }}
        onOpenSettings={() => {
          setStartOpen(false);
          setView("settings");
        }}
        onChangeReciter={() => {
          if (state.preparedRecitation) {
            setStartMode("change-reciter");
            setStartOpen(true);
          } else {
            setFinishOpen(true);
          }
        }}
        mushafZoom={preferences.mushafZoom}
        mushafZoomConstrained={mobilePaper && zoomConstrained}
        onMushafZoomChange={(mushafZoom) => updatePreferences({ mushafZoom })}
        mushafLayout={preferences.mushafLayout}
        onMushafLayoutChange={(mushafLayout) => updatePreferences({ mushafLayout })}
        judgeRailSide={preferences.judgeRailSide}
        onJudgeRailSideChange={(judgeRailSide) => updatePreferences({ judgeRailSide })}
        questionFocusMode={preferences.questionFocusMode}
        onQuestionFocusModeChange={(questionFocusMode) =>
          updatePreferences({ questionFocusMode })
        }
        aduRaaguInputMode={preferences.aduRaaguInputMode}
        onAduRaaguInputModeChange={(aduRaaguInputMode) =>
          updatePreferences({ aduRaaguInputMode })
        }
        slimScorePanel={preferences.slimScorePanel}
        onSlimScorePanelChange={(slimScorePanel) => updatePreferences({ slimScorePanel })}
        selectorTashkeel={preferences.selectorTashkeel}
        onSelectorTashkeelChange={(selectorTashkeel) => updatePreferences({ selectorTashkeel })}
        lastMarkStrip={preferences.lastMarkStrip}
        onLastMarkStripChange={(lastMarkStrip) =>
          updatePreferences({ lastMarkStrip })
        }
        onShowMarkingGuide={() => setMarkingGuideOpen(true)}
        onMoreControlsOpenChange={setMoreControlsOpen}
        tilawaTracking={showTilawaPrototype
          ? {
              status: tilawaStatus,
              onOpen: () => setTilawaPanelOpen(true),
            }
          : undefined}
        theme={preferences.theme}
        onThemeChange={(theme) => updatePreferences({ theme })}
        recording={{
          status: recitationAudio.status,
          durationLabel: recitationAudio.durationLabel,
          inputLevel: recitationAudio.inputLevel,
          lowInput: recitationAudio.lowInput,
          onPause: () => void recitationAudio.pause(),
          onResume: () => void recitationAudio.resume(),
        }}
      />
      {view === "judge" ? (
        <main
          className={`workspace ${preferences.slimScorePanel ? "score-slim" : ""} layout-${preferences.mushafLayout} rail-${preferences.judgeRailSide} ${!state.sessionActive && !state.preparedRecitation ? "is-idle" : ""}`}
          key="judge"
        >
          <div className="stage">
            <PageViewport
              layout={preferences.mushafLayout}
              zoomPercent={preferences.mushafZoom}
              mobilePresentation={mobilePaper}
              mobileCalibrationPage={mobileCalibration ? displayedPage : undefined}
              onZoomConstrained={setZoomConstrained}
              contentKey={`${displayedPage}:${preferences.mushafLayout}`}
              overlay={
                <MarkingCoachTip
                  forcedOpen={markingGuideOpen}
                  suppressed={moreControlsOpen || phrasesOpen}
                  onForcedOpenChange={setMarkingGuideOpen}
                />
              }
            >
              <PageRenderer
                // Saving clears the question, not the page already on screen.
                // A new question still gets a fresh renderer behind its picker.
                key={visibleQuestion?.id ?? lastQuestionRendererKey.current}
                onPresentationReady={questionPageReady}
                onPresentationError={questionPageFailed}
                preparedFixedPage={mobileCalibration ? readyNavigation.ready : undefined}
                swipePreviews={mobileCalibration ? readyNavigation.previews : undefined}
                navigationPending={readyNavigation.pending}
                navigationError={readyNavigation.error}
                retryNavigation={readyNavigation.retry}
                selectorTashkeel={preferences.selectorTashkeel}
                page={displayedPage}
                pageLayout={preferences.mushafLayout}
                questionFocusMode={preferences.questionFocusMode}
                questionRange={visibleQuestionRange}
                tilawaWordFocus={tilawaWordFocus}
                onPageChange={handlePageChange}
                headerControls={(visiblePages, compact) => (
                  <>
                    <PageNav
                      calibrated={mobileCalibration}
                      prefetchFonts={!fixedReview}
                      page={page}
                      visiblePages={visiblePages}
                      layout={preferences.mushafLayout}
                      compact={compact}
                      onChange={handlePageChange}
                      questionPage={openingPage}
                    />
                    {openingPage !== null &&
                      questionIsVisibleOnPages(visibleQuestion, visiblePages) === false && (
                      <>
                        <button
                          type="button"
                          className="question-return-bubble"
                          aria-label={`Return to selected question on page ${openingPage}`}
                          onClick={() => handlePageChange(openingPage)}
                        >
                          <span aria-hidden="true">↩</span>
                          <span className="question-return-label">Return to question</span>
                          <span className="question-return-page t-num">p. {openingPage}</span>
                        </button>
                        {/* Both presentations use the rendered pages and the same
                            navigation action; CSS exposes only one at a time. */}
                        {mobileMushafControls && visiblePages.length === 1 &&
                          (mobileJudgeDeckActive || mobilePreparedActive) && createPortal(
                            <button
                              type="button"
                              className="mobile-question-return"
                              aria-label={`Return to selected question on page ${openingPage}`}
                              onClick={() => handlePageChange(openingPage)}
                            >
                              <span><span className="question-return-arrow" aria-hidden="true">↩ </span>Return {openingPage}</span>
                              <small>{(state.preparedRecitation?.participant ?? state.participant).name || "Unnamed"}</small>
                            </button>,
                            mobileMushafControls,
                          )}
                      </>
                    )}
                  </>
                )}
              />
            </PageViewport>
          </div>
          <aside className="sidebar">
            {state.preparedRecitation ? (
              <PreparedSidebar
                prepared={state.preparedRecitation}
                participantCount={state.roster.length}
                division={participantDivision(
                  state.preparedRecitation.participant,
                  state.competition.liveSnapshot?.divisions ??
                    state.competition.divisions,
                )}
                onReady={async () => {
                  const context = recordingStartContextRef.current;
                  if (state.competition.isSample && recordPracticeRecitation) {
                    const ready = await recitationAudio.prepare();
                    if (!ready || context !== recordingStartContextRef.current) return;
                  }
                  dispatch({ type: "BEGIN_RECITER" });
                }}
                onChangeQuestion={() => {
                  setStartMode("change-question");
                  setStartOpen(true);
                }}
                onChangeReciter={() => {
                  setStartMode("change-reciter");
                  setStartOpen(true);
                }}
                recording={state.competition.isSample ? {
                  supported: recitationAudio.supported,
                  enabled: recordPracticeRecitation,
                  status: recitationAudio.status,
                  error: recitationAudio.error,
                  onCancel: recitationAudio.cancelPrepared,
                  onEnabledChange: (enabled) => {
                    if (!enabled) recitationAudio.cancelPrepared();
                    setRecordPracticeRecitation(enabled);
                  },
                  onBeginWithoutRecording: () => {
                    recitationAudio.cancelPrepared();
                    setRecordPracticeRecitation(false);
                    dispatch({ type: "BEGIN_RECITER" });
                  },
                } : undefined}
              />
            ) : state.sessionActive ? (
              <>
                <JudgeRoleStrip onChange={() => setView("setup")} />
                <ScorePanel inputMode={preferences.aduRaaguInputMode} slim={preferences.slimScorePanel} />
                <MistakeLog />
                <NotesBox />
                <button
                  type="button"
                  className="btn-primary next-btn"
                  onClick={() => setFinishOpen(true)}
                >
                  Finish recitation
                </button>
              </>
            ) : (
              <CompetitionIdlePanel
                onPrepare={() => setView("setup")}
                onChooseQuestion={() => {
                  setStartMode("next-question");
                  setStartOpen(true);
                }}
                onOpenReciterQueue={() => {
                  setStartMode("start");
                  setStartOpen(true);
                }}
                onOpenResults={() => setView("records")}
              />
            )}
          </aside>
          {mobileJudgeDeckActive && (
            <MobileJudgeDeck
              calibrated={mobileCalibration}
              inputMode={preferences.aduRaaguInputMode}
              lastMarkStrip={preferences.lastMarkStrip}
              onFinish={() => setFinishOpen(true)}
            />
          )}
        </main>
      ) : view === "records" ? (
        <main className="records-main" key="records">
          <RecordsView pageLayout={preferences.mushafLayout} onResumeSession={() => setView("judge")} />
        </main>
      ) : view === "settings" ? (
        <SettingsWorkspace
          preferences={preferences}
          onChange={updatePreferences}
          onReset={() => setPreferences({ ...DEFAULT_DEVICE_PREFERENCES })}
          onBack={() => setView("judge")}
        />
      ) : view === "questions" ? (
        <QuestionPreparationWorkspace onBack={() => {
          if (setupReturnPointRef.current) setupReturnPointRef.current.restore = true;
          setView("setup");
        }} />
      ) : (
        <CompetitionSetup
          returnPointRef={setupReturnPointRef}
          onBack={() => setView("judge")}
          onOpenQuestionWorkspace={() => setView("questions")}
        />
      )}

      {startOpen &&
        view === "judge" &&
        state.competition.status === "live" &&
        !state.sessionActive && (
        <StartDialog
          key={startMode}
          mode={startMode}
          onOpenSetup={() => {
            setStartOpen(false);
            setView("setup");
          }}
          onClose={closeQuestionPicker}
          onPrepared={prepareQuestionPage}
          preparing={openingQuestionPage !== null}
          preparationError={questionPageError}
          onRetryPreparation={() => retryQuestionPageRef.current()}
        />
      )}
      {finishOpen && (state.sessionActive || finishHandoff) && (
        <FinishDialog
          hasNextReciter={hasNextReciter}
          inputMode={preferences.aduRaaguInputMode}
          recordingSummary={recitationAudio.status === "recording"
            ? `Recording ${recitationAudio.durationLabel}`
            : recitationAudio.status === "paused" || recitationAudio.status === "interrupted"
              ? `Recording paused ${recitationAudio.durationLabel}`
              : recitationAudio.status === "error"
                ? `Recording stopped ${recitationAudio.durationLabel}`
                : undefined}
          handoff={finishHandoff ? (
            <StartDialog
              embedded
              onOpenSetup={() => { closeFinish(); setView("setup"); }}
              onClose={closeQuestionPicker}
              onPrepared={prepareQuestionPage}
              preparing={openingQuestionPage !== null}
              preparationError={questionPageError}
              onRetryPreparation={() => retryQuestionPageRef.current()}
            />
          ) : undefined}
          onCancel={closeFinish}
          onConfirm={() => {
            const assignment = state.activeAssignment;
            if (
              !assignment ||
              missingRequiredImpressionCategories(
                assignment.config,
                state.impressions,
                assignment.categories,
              ).length > 0
            ) {
              return;
            }
            return finishRecitation();
          }}
        />
      )}

      <OfflineMushafPrompt
        suppressed={
          state.sessionActive ||
          startOpen ||
          finishOpen ||
          view !== "judge"
        }
      />

      {showTilawaPrototype && view === "judge" && (
        <TilawaPrototypePanel
          open={tilawaPanelOpen}
          judgeRailSide={preferences.judgeRailSide}
          expectedPassage={visibleQuestionRange}
          onOpenChange={setTilawaPanelOpen}
          onStatusChange={setTilawaStatus}
          onVerseMatch={(match) => void followDetectedAyah(match)}
          onWordProgress={followDetectedWord}
          onTrackingClear={clearDetectedWord}
        />
      )}

      <ResultSheet />
      {ScorecardTuner && (
        <Suspense fallback={null}>
          <ScorecardTuner />
        </Suspense>
      )}
    </div>
  );
}

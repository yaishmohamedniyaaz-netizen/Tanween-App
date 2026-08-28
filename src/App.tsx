import {
  useCallback,
  useEffect,
  useState,
} from "react";
import { Header, type AppView } from "./components/Header";
import { Mushaf } from "./components/Mushaf";
import { MushafViewport } from "./components/MushafViewport";
import { ScorePanel } from "./components/ScorePanel";
import { MistakeLog } from "./components/MistakeLog";
import { NotesBox } from "./components/NotesBox";
import { ResultSheet } from "./components/ResultSheet";
import { MarkingCoachTip } from "./components/MarkingCoachTip";
import { RecordsView } from "./components/RecordsView";
import { StartDialog } from "./components/StartDialog";
import { CompetitionSetup } from "./components/CompetitionSetup";
import { SettingsWorkspace } from "./components/SettingsWorkspace";
import { QuestionPreparationWorkspace } from "./components/QuestionPreparationWorkspace";
import { CompetitionIdlePanel } from "./components/CompetitionIdlePanel";
import { FinishDialog } from "./components/FinishDialog";
import { JudgeRoleStrip } from "./components/JudgeRoleStrip";
import { PreparedSidebar } from "./components/PreparedSidebar";
import { PageNav } from "./components/PageNav";
import { OfflineMushafPrompt } from "./components/OfflineMushafPrompt";
import { useOfflineMushaf } from "./hooks/useOfflineMushaf";
import { pauseOfflineMushafDownload } from "./lib/offlineMushaf";
import { useJudging } from "./state/store";
import {
  questionIsVisibleOnPages,
  questionOpeningKey,
  questionOpeningPage,
} from "./lib/questionPage";
import { participantDivision } from "./lib/reciterQuestions";
import { isWaiting } from "./lib/rosterQueue";
import { missingRequiredImpressionCategories } from "./lib/scoring";
import {
  applyDeviceTheme,
  DEFAULT_DEVICE_PREFERENCES,
  readDevicePreferences,
  writeDevicePreferences,
  type DevicePreferencesV5,
} from "./lib/devicePreferences";

const LS_PAGE_KEY = "tahqeeq:lastPage";
// Records the session and question the Mushaf was last opened for, so the
// opening page is restored once per reciter rather than on every render.
const LS_QUESTION_PAGE_KEY = "tahqeeq:questionOpenedFor";

export function App() {
  const { state, dispatch } = useJudging();
  const offlineMushaf = useOfflineMushaf();
  const [view, setView] = useState<AppView>("judge");
  const [startOpen, setStartOpen] = useState(false);
  const [startMode, setStartMode] = useState<
    "start" | "next-question" | "change-reciter" | "change-question"
  >("start");
  const [finishOpen, setFinishOpen] = useState(false);
  const [markingGuideOpen, setMarkingGuideOpen] = useState(false);
  const [moreControlsOpen, setMoreControlsOpen] = useState(false);
  const [preferences, setPreferences] = useState<DevicePreferencesV5>(() =>
    readDevicePreferences(),
  );
  const [page, setPage] = useState(() => {
    const saved = localStorage.getItem(LS_PAGE_KEY);
    if (saved) {
      const n = Number(saved);
      if (!Number.isNaN(n) && n >= 1 && n <= 604) return n;
    }
    return 604;
  });

  useEffect(() => {
    localStorage.setItem(LS_PAGE_KEY, String(page));
  }, [page]);

  useEffect(() => {
    applyDeviceTheme(preferences.theme);
    writeDevicePreferences(preferences);
  }, [preferences]);

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
  const openedForKey = questionOpeningKey(
    state.activeSessionId ?? state.preparedRecitation?.id,
    state.activeQuestion ?? state.preparedRecitation?.question,
  );
  const visibleQuestion = state.activeQuestion ?? state.preparedRecitation?.question;
  const openingPage = questionOpeningPage(visibleQuestion);
  const visibleQuestionRange = visibleQuestion?.version === 2
    ? visibleQuestion.range ?? null
    : null;

  useEffect(() => {
    if (!openedForKey) return;
    if (localStorage.getItem(LS_QUESTION_PAGE_KEY) === openedForKey) return;
    localStorage.setItem(LS_QUESTION_PAGE_KEY, openedForKey);
    if (openingPage === null) return;
    setPage(openingPage);
  }, [openedForKey, openingPage]);

  const handlePageChange = useCallback(
    (p: number) => {
      const clamped = Math.max(1, Math.min(604, p));
      if (clamped !== page) setPage(clamped);
    },
    [page],
  );

  const hasNextReciter = state.roster.some(
    (entry) => entry.id !== state.participant.id && isWaiting(entry),
  );

  return (
    <div className={`app view-${view}`}>
      <Header
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
        onShowMarkingGuide={() => setMarkingGuideOpen(true)}
        onMoreControlsOpenChange={setMoreControlsOpen}
        theme={preferences.theme}
        onThemeChange={(theme) => updatePreferences({ theme })}
      />
      {view === "judge" ? (
        <main
          className={`workspace layout-${preferences.mushafLayout} rail-${preferences.judgeRailSide} ${!state.sessionActive && !state.preparedRecitation ? "is-idle" : ""}`}
          key="judge"
        >
          <div className="stage">
            <MushafViewport
              layout={preferences.mushafLayout}
              zoomPercent={preferences.mushafZoom}
              contentKey={`${page}:${preferences.mushafLayout}`}
              overlay={
                <MarkingCoachTip
                  forcedOpen={markingGuideOpen}
                  suppressed={moreControlsOpen}
                  onForcedOpenChange={setMarkingGuideOpen}
                />
              }
            >
              <Mushaf
                page={page}
                pageLayout={preferences.mushafLayout}
                questionFocusMode={preferences.questionFocusMode}
                questionRange={visibleQuestionRange}
                onPageChange={handlePageChange}
                headerControls={(visiblePages, compact) => (
                  <>
                    <PageNav
                      page={page}
                      visiblePages={visiblePages}
                      layout={preferences.mushafLayout}
                      compact={compact}
                      onChange={handlePageChange}
                    />
                    {openingPage !== null &&
                      questionIsVisibleOnPages(visibleQuestion, visiblePages) === false && (
                      <button
                        type="button"
                        className="question-return-bubble"
                        aria-label={`Return to selected question on page ${openingPage}`}
                        onClick={() => handlePageChange(openingPage)}
                      >
                        <span aria-hidden="true">↩</span>
                        <span>Return to question</span>
                        <span className="question-return-page t-num">p. {openingPage}</span>
                      </button>
                    )}
                  </>
                )}
              />
            </MushafViewport>
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
                onReady={() => dispatch({ type: "BEGIN_RECITER" })}
                onChangeQuestion={() => {
                  setStartMode("change-question");
                  setStartOpen(true);
                }}
                onChangeReciter={() => {
                  setStartMode("change-reciter");
                  setStartOpen(true);
                }}
              />
            ) : state.sessionActive ? (
              <>
                <JudgeRoleStrip onChange={() => setView("setup")} />
                <ScorePanel inputMode={preferences.aduRaaguInputMode} />
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
                onOpenRunningOrder={() => {
                  setStartMode("start");
                  setStartOpen(true);
                }}
                onOpenResults={() => setView("records")}
              />
            )}
          </aside>
        </main>
      ) : view === "records" ? (
        <main className="records-main" key="records">
          <RecordsView onResumeSession={() => setView("judge")} />
        </main>
      ) : view === "settings" ? (
        <SettingsWorkspace
          preferences={preferences}
          onChange={updatePreferences}
          onReset={() => setPreferences({ ...DEFAULT_DEVICE_PREFERENCES })}
          onBack={() => setView("judge")}
        />
      ) : view === "questions" ? (
        <QuestionPreparationWorkspace onBack={() => setView("setup")} />
      ) : (
        <CompetitionSetup
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
          onClose={() => setStartOpen(false)}
        />
      )}
      {finishOpen && state.sessionActive && (
        <FinishDialog
          hasNextReciter={hasNextReciter}
          inputMode={preferences.aduRaaguInputMode}
          onCancel={() => setFinishOpen(false)}
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
            dispatch({ type: "FINISH_SESSION" });
            setFinishOpen(false);
            setStartMode("start");
            setStartOpen(hasNextReciter);
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

      <ResultSheet />
    </div>
  );
}

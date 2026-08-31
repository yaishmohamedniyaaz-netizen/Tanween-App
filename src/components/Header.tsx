import { useMemo } from "react";
import { enabledCategories } from "../config";
import type {
  AduRaaguInputMode,
  AppTheme,
  JudgeRailSide,
  LastMarkStrip,
  MushafLayout,
  QuestionFocusMode,
} from "../lib/devicePreferences";
import type { RecitationRecorderStatus } from "../hooks/useRecitationRecorder";
import type { TilawaTrackerStatus } from "./TilawaPrototypePanel";
import {
  buildResultsReviewItems,
  summarizeResultsReview,
} from "../lib/resultsReview";
import { useJudging } from "../state/store";
import { Icon } from "./Icon";
import { MoreActionsPopover } from "./MoreActionsPopover";
import { ThemeToggle } from "./ThemeToggle";

export type AppView = "judge" | "records" | "setup" | "settings" | "questions";

interface Props {
  view: AppView;
  onToggleView: () => void;
  onOpenSetup: () => void;
  onOpenSettings: () => void;
  onChangeReciter: () => void;
  mushafZoom: number;
  onMushafZoomChange: (value: number) => void;
  mushafLayout: MushafLayout;
  onMushafLayoutChange: (value: MushafLayout) => void;
  judgeRailSide: JudgeRailSide;
  onJudgeRailSideChange: (value: JudgeRailSide) => void;
  questionFocusMode: QuestionFocusMode;
  onQuestionFocusModeChange: (value: QuestionFocusMode) => void;
  aduRaaguInputMode: AduRaaguInputMode;
  onAduRaaguInputModeChange: (value: AduRaaguInputMode) => void;
  lastMarkStrip: LastMarkStrip;
  onLastMarkStripChange: (value: LastMarkStrip) => void;
  onShowMarkingGuide: () => void;
  onMoreControlsOpenChange: (open: boolean) => void;
  tilawaTracking?: {
    status: TilawaTrackerStatus;
    onOpen: () => void;
  };
  theme: AppTheme;
  onThemeChange: (theme: AppTheme) => void;
  recording?: {
    status: RecitationRecorderStatus;
    durationLabel: string;
    inputLevel: number;
    lowInput: boolean;
    onPause: () => void;
    onResume: () => void;
  };
}

export function Header({
  view,
  onToggleView,
  onOpenSetup,
  onOpenSettings,
  onChangeReciter,
  mushafZoom,
  onMushafZoomChange,
  mushafLayout,
  onMushafLayoutChange,
  judgeRailSide,
  onJudgeRailSideChange,
  questionFocusMode,
  onQuestionFocusModeChange,
  aduRaaguInputMode,
  onAduRaaguInputModeChange,
  lastMarkStrip,
  onLastMarkStripChange,
  onShowMarkingGuide,
  onMoreControlsOpenChange,
  tilawaTracking,
  theme,
  onThemeChange,
  recording,
}: Props) {
  const { state } = useJudging();

  const prepared = state.preparedRecitation;
  const participant = prepared?.participant ?? state.participant;
  const visibleQuestion = prepared?.question ?? state.activeQuestion;
  const rosterTotal = state.roster.length;
  const rosterDone = state.roster.filter((entry) => entry.judged).length;
  const resultsSummary = useMemo(() => {
    const categories = enabledCategories(
      state.competition.liveSnapshot?.scoreConfig ?? state.config,
    );
    return summarizeResultsReview(
      buildResultsReviewItems(
        state.history,
        state.finalizedResults,
        state.competition.id,
        categories,
      ),
    );
  }, [
    state.competition.id,
    state.competition.liveSnapshot,
    state.config,
    state.finalizedResults,
    state.history,
  ]);
  const resultsActionLabel = view === "judge"
    ? resultsSummary.unresolved
      ? `Results, ${resultsSummary.unresolved} unresolved participants`
      : "Results"
    : view === "records"
      ? "Back to Judging"
      : "Back to Mushaf";
  const competitionTitle = state.competition.name || (
    state.competition.status === "live"
      ? "Live competition"
      : state.competition.status === "closed"
        ? "Closed competition"
        : "No competition running"
  );
  const competitionLifecycle = state.competition.status === "live"
    ? "Live"
    : state.competition.status === "closed"
      ? "Closed"
      : state.competition.name
        ? "Draft"
        : "Browse the Mushaf";
  const competitionContext = [
    state.competition.edition.trim(),
    competitionLifecycle,
  ].filter(Boolean).join(" · ");
  const recordingVisible = Boolean(
    state.sessionActive &&
    recording &&
    !["idle", "requesting", "armed", "ready"].includes(recording.status),
  );
  const recordingPaused = recording?.status === "paused" ||
    recording?.status === "interrupted";
  const recordingBusy = recording?.status === "pausing" ||
    recording?.status === "resuming" ||
    recording?.status === "finalizing" ||
    recording?.status === "error";
  const recordingStateLabel = recording?.status === "recording"
    ? recording.lowInput
      ? `Mic level is very low ${recording.durationLabel}`
      : `Recording ${recording.durationLabel}`
    : recordingPaused
      ? `Recording paused ${recording?.durationLabel}`
      : recording?.status === "error"
        ? "Recording stopped"
        : "Saving audio";

  return (
    <header className="app-header">
      <div className="brand">
        <span className="brand-mark" aria-hidden="true">تَحْقِيق</span>
        <span className="brand-name">Tahqeeq</span>
      </div>

      <div className="header-context">
        {!state.sessionActive && !prepared && (
          <button
            type="button"
            className={`competition-header-state is-${state.competition.status}`}
            onClick={onOpenSetup}
            aria-label={`Open competition setup. ${competitionTitle}. ${competitionContext}.`}
          >
            <span>
              <strong>{competitionTitle}</strong>
              <small>{competitionContext}</small>
            </span>
          </button>
        )}

        {view === "judge" && (state.sessionActive || prepared) && (
          <button
            type="button"
            className={`reciter-chip ${prepared ? "is-prepared" : ""}`}
            onClick={onChangeReciter}
            title={prepared ? "Change ready reciter" : "Finish or change reciter"}
          >
            <span className="reciter-name">{participant.name || "Unnamed"}</span>
            {prepared && <span className="reciter-prepared-state">Ready</span>}
            {recordingVisible && recording && (
              <span className={`reciter-recording-state ${recordingPaused ? "is-paused" : ""} ${recording.lowInput ? "is-low-input" : ""}`}>
                <span className="recording-mini-wave" aria-hidden="true">
                  {[0.58, 1, 0.72, 0.9, 0.5].map((weight, index) => (
                    <i
                      key={index}
                      style={{
                        height: recording.status === "recording"
                          ? `${Math.max(3, Math.round(3 + recording.inputLevel * weight * 13))}px`
                          : "3px",
                      }}
                    />
                  ))}
                </span>
                {recordingStateLabel}
              </span>
            )}
            {visibleQuestion && <span className="reciter-question-ref">Q · {visibleQuestion.label}</span>}
            {rosterTotal > 0 && <span className="chip-idx t-num">{rosterDone + 1}/{rosterTotal}</span>}
          </button>
        )}
      </div>

      <button
        type="button"
        className={`view-toggle ${view === "records" ? "is-active" : ""}`}
        onClick={onToggleView}
        aria-label={resultsActionLabel}
      >
        {view === "judge" ? (
          <>
            <Icon name="fileCheck" size={15} />
            <span className="view-toggle-label">Results</span>
            {resultsSummary.unresolved > 0 && <span className="view-toggle-count">{resultsSummary.unresolved}</span>}
          </>
        ) : (
          <>
            <Icon name="back" size={15} />
            <span className="view-toggle-label">
              {view === "records" ? "Judging" : "Back to Mushaf"}
            </span>
          </>
        )}
      </button>

      {recordingVisible && recording ? (
        <button
          type="button"
          className={`btn-icon recording-header-control ${recordingPaused ? "is-paused" : "is-live"}`}
          aria-label={recordingPaused
            ? `Resume recording at ${recording.durationLabel}`
            : recording.status === "recording"
              ? `Pause recording at ${recording.durationLabel}`
              : recordingStateLabel}
          title={recordingPaused ? "Resume recording" : "Pause recording"}
          disabled={recordingBusy}
          onClick={recordingPaused ? recording.onResume : recording.onPause}
        >
          <Icon
            name={recordingPaused ? "play" : recording.status === "recording" ? "pause" : "mic"}
            size={16}
          />
        </button>
      ) : (
        <ThemeToggle theme={theme} onChange={onThemeChange} />
      )}

      <MoreActionsPopover
        view={view}
        mushafZoom={mushafZoom}
        onMushafZoomChange={onMushafZoomChange}
        mushafLayout={mushafLayout}
        onMushafLayoutChange={onMushafLayoutChange}
        judgeRailSide={judgeRailSide}
        onJudgeRailSideChange={onJudgeRailSideChange}
        questionFocusMode={questionFocusMode}
        onQuestionFocusModeChange={onQuestionFocusModeChange}
        aduRaaguInputMode={aduRaaguInputMode}
        onAduRaaguInputModeChange={onAduRaaguInputModeChange}
        lastMarkStrip={lastMarkStrip}
        onLastMarkStripChange={onLastMarkStripChange}
        onShowMarkingGuide={onShowMarkingGuide}
        onOpenChange={onMoreControlsOpenChange}
        tilawaTracking={tilawaTracking}
        onOpenSettings={onOpenSettings}
        onOpenSetup={onOpenSetup}
      />
    </header>
  );
}

import { useMemo } from "react";
import { enabledCategories } from "../config";
import type {
  AduRaaguInputMode,
  AppTheme,
  JudgeRailSide,
  LastMarkStrip,
  MushafLayout,
  QuestionFocusMode,
  ScoreChipTint,
} from "../lib/devicePreferences";
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
  scoreChipTint: ScoreChipTint;
  onScoreChipTintChange: (value: ScoreChipTint) => void;
  onShowMarkingGuide: () => void;
  onMoreControlsOpenChange: (open: boolean) => void;
  theme: AppTheme;
  onThemeChange: (theme: AppTheme) => void;
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
  scoreChipTint,
  onScoreChipTintChange,
  onShowMarkingGuide,
  onMoreControlsOpenChange,
  theme,
  onThemeChange,
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

      <ThemeToggle theme={theme} onChange={onThemeChange} />

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
        scoreChipTint={scoreChipTint}
        onScoreChipTintChange={onScoreChipTintChange}
        onShowMarkingGuide={onShowMarkingGuide}
        onOpenChange={onMoreControlsOpenChange}
        onOpenSettings={onOpenSettings}
        onOpenSetup={onOpenSetup}
      />
    </header>
  );
}

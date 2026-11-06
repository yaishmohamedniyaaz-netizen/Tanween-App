import { CATEGORIES, enabledCategories, isImpressionCategory } from "../config";
import {
  computeScores,
  impressionScore,
  missingRequiredImpressionCategories,
} from "../lib/scoring";
import { useJudging } from "../state/store";
import { judgeSeatFor } from "../lib/judgeAssignments";
import type { AduRaaguInputMode } from "../lib/devicePreferences";
import type { CategoryId } from "../types";
import { MarkPicker } from "./MarkPicker";
import { CriterionPressable } from "./CriterionPressable";
import { criterionChoiceHandlers, useCriterionChoice } from "../lib/criterionChoice";
import { useEffect, useRef, useState } from "react";
import "../styles/scorePanelReason.css";

type ScorePanelPresentation = "rail" | "compact";

/** Same ledger field as before; its editor now lives with the recitation notes. */
export function ImpressionReasons() {
  const { state, dispatch } = useJudging();
  const config = state.activeAssignment?.config ?? state.config;
  const categories = state.activeAssignment?.categories
    ?? judgeSeatFor(state.panel, state.deviceJudgeId)?.categories
    ?? enabledCategories(config);
  return <div className="impression-reasons">
    {CATEGORIES.filter(c => categories.includes(c.id) && isImpressionCategory(c.id)).map(c => (
      <label className="impression-reason" key={c.id}>
        <input
          value={impressionScore(config, state.impressions, c.id, "entry-zero").note}
          aria-label={`${c.label} reason (optional)`}
          onChange={event => dispatch({ type: "SET_IMPRESSION_NOTE", category: c.id, note: event.target.value })}
        />
      </label>
    ))}
  </div>;
}

function CategoryRow({
  id,
  label,
  score,
  start,
  deducted,
  pick = false,
}: {
  id: CategoryId;
  label: string;
  score: number;
  start: number;
  deducted: number;
  /** The row is the criterion button (marking look "place: scorecard"). */
  pick?: boolean;
}) {
  const choice = useCriterionChoice();
  const cells = (
    <>
      <span className="sc-dot" aria-hidden="true" />
      <span className="sc-name">
        {label}
        {pick && choice.showKeys && <span className="sc-key" aria-hidden="true">{choice.categories.indexOf(id) + 1}</span>}
      </span>
      <span className={`sc-deducted t-num ${deducted === 0 ? "is-zero" : ""}`}>
        {deducted === 0 ? "—" : `−${deducted}`}
      </span>
      <span className="sc-score score-value-layout t-num">
        <span className="score-value-number">{score}</span>
        <span className="sc-of">/ {start}</span>
      </span>
    </>
  );
  if (!pick || !choice.look) return <div className={`sc-row cat-${id}`}>{cells}</div>;
  const on = choice.preselect?.category === id;
  const index = choice.categories.indexOf(id);
  return (
    <CriterionPressable
      category={id}
      mode={choice.mode}
      handlers={criterionChoiceHandlers}
      trayOpen={choice.trayOpen}
      khafi={choice.look.khafi}
      data-criterion-bar=""
      className={`sc-row sc-row-pick cat-${id} ${on ? "is-on" : ""} ${on && choice.preselect?.held ? "is-held" : ""}`}
      aria-pressed={choice.mode === "criterion-first" ? on : undefined}
      aria-label={`${label}: choose for the next mark${choice.showKeys ? `, key ${index + 1}` : ""}. Score ${score} of ${start}`}
    >
      {cells}
    </CriterionPressable>
  );
}

/** A criterion judged over the whole recitation is marked here, in its own score
 *  row — the row is the control, so the criterion has one place in the rail. */
function ImpressionRow({
  category,
  pending,
  inputMode,
  presentation,
}: {
  category: CategoryId;
  pending: boolean;
  inputMode: AduRaaguInputMode;
  presentation: ScorePanelPresentation;
  slim?: boolean;
}) {
  const { state, dispatch } = useJudging();
  const config = state.activeAssignment?.config ?? state.config;
  const { start, step } = config[category];
  const { awarded, marked } = impressionScore(
    config,
    state.impressions,
    category,
    "entry-zero",
  );
  const label = CATEGORIES.find((item) => item.id === category)?.short ?? category;
  const deducted = Math.round((start - awarded) * 100) / 100;

  return (
    <div
      className={`sc-row sc-row-impression cat-${category} ${pending ? "is-pending" : ""}`}
    >
      <span className="sc-dot" aria-hidden="true" />
      <span className="sc-name">{label}</span>
      <span className={`sc-deducted t-num ${deducted === 0 ? "is-zero" : ""}`}>
        {pending || deducted === 0 ? "—" : `−${deducted}`}
      </span>
      <MarkPicker
        value={awarded}
        max={start}
        step={step}
        marked={marked}
        label={label}
        category={category}
        mode={inputMode}
        layer={presentation === "compact" ? "dialog" : "workspace"}
        onChange={(value) => dispatch({ type: "SET_IMPRESSION", category, awarded: value })}
      />
    </div>
  );
}

export function ScorePanel({
  inputMode,
  presentation = "rail",
  slim = false,
}: {
  inputMode: AduRaaguInputMode;
  presentation?: ScorePanelPresentation;
  slim?: boolean;
}) {
  const { state } = useJudging();
  const { byCategory, total, totalMax } = computeScores(state);
  const config = state.activeAssignment?.config ?? state.config;
  const categories =
    state.activeAssignment?.categories ??
    judgeSeatFor(state.panel, state.deviceJudgeId)?.categories ??
    enabledCategories(config);
  // With the scorecard as the picker, its pinpoint rows are the criterion buttons.
  const choice = useCriterionChoice();
  const picking = choice.active && presentation === "rail" && choice.look !== null;
  const [shake, setShake] = useState(false);
  const seenNudge = useRef(choice.nudge);
  useEffect(() => {
    if (!picking || choice.nudge === seenNudge.current) return;
    seenNudge.current = choice.nudge;
    setShake(false);
    const start = window.requestAnimationFrame(() => setShake(true));
    const timer = window.setTimeout(() => setShake(false), 420);
    return () => { window.cancelAnimationFrame(start); window.clearTimeout(timer); };
  }, [choice.nudge, picking]);
  const missingImpressions = missingRequiredImpressionCategories(
    config,
    state.impressions,
    categories,
  );

  return (
    <section
      className={`panel scorecard ${presentation === "compact" ? "is-compact" : ""}`}
      aria-label="Score"
    >
      <div className="sc-total">
        <span className="sc-total-label">Score</span>
        <span className="sc-total-value" aria-live="polite" aria-atomic="true">
          <span className="sc-total-num t-num">{total}</span>
          <span className="sc-total-of t-num"> / {totalMax}</span>
        </span>
      </div>
      <div
        className={`sc-rows ${picking ? "is-picker" : ""} ${shake ? "is-nudged" : ""}`}
        data-category-count={categories.length}
        data-chosen-look={picking ? choice.look?.chosen : undefined}
        data-khafi={picking ? choice.look?.khafi : undefined}
        data-focus-look={picking ? choice.look?.focus : undefined}
      >
        {CATEGORIES.filter((category) => categories.includes(category.id)).map((c) =>
          isImpressionCategory(c.id) ? (
            <ImpressionRow
              key={c.id}
              category={c.id}
              pending={missingImpressions.includes(c.id)}
              inputMode={inputMode}
              presentation={presentation}
              slim={slim}
            />
          ) : (
            <CategoryRow
              key={c.id}
              id={c.id}
              label={c.short}
              score={byCategory[c.id].score}
              start={byCategory[c.id].start}
              deducted={byCategory[c.id].deducted}
              pick={picking && choice.categories.includes(c.id)}
            />
          ),
        )}
      </div>
    </section>
  );
}

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

function CategoryRow({
  id,
  label,
  score,
  start,
  deducted,
}: {
  id: CategoryId;
  label: string;
  score: number;
  start: number;
  deducted: number;
}) {
  return (
    <div className={`sc-row cat-${id}`}>
      <span className="sc-dot" aria-hidden="true" />
      <span className="sc-name">{label}</span>
      <span className={`sc-deducted t-num ${deducted === 0 ? "is-zero" : ""}`}>
        {deducted === 0 ? "—" : `−${deducted}`}
      </span>
      <span className="sc-score score-value-layout t-num">
        <span className="score-value-number">{score}</span>
        <span className="sc-of">/ {start}</span>
      </span>
    </div>
  );
}

/** A criterion judged over the whole recitation is marked here, in its own score
 *  row — the row is the control, so the criterion has one place in the rail. */
function ImpressionRow({
  category,
  pending,
  inputMode,
}: {
  category: CategoryId;
  pending: boolean;
  inputMode: AduRaaguInputMode;
}) {
  const { state, dispatch } = useJudging();
  const config = state.activeAssignment?.config ?? state.config;
  const { start, step } = config[category];
  const { awarded, marked, note } = impressionScore(
    config,
    state.impressions,
    category,
    "entry-zero",
  );
  const label = CATEGORIES.find((item) => item.id === category)?.label ?? category;
  const deducted = Math.round((start - awarded) * 100) / 100;

  return (
    <div className={`sc-row sc-row-impression cat-${category} ${pending ? "is-pending" : ""}`}>
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
        onChange={(value) => dispatch({ type: "SET_IMPRESSION", category, awarded: value })}
      />
      <input
        className="sc-reason"
        value={note}
        placeholder="Reason (optional)"
        aria-label={`${label} reason`}
        onChange={(event) =>
          dispatch({
            type: "SET_IMPRESSION_NOTE",
            category,
            note: event.target.value,
          })
        }
      />
    </div>
  );
}

export function ScorePanel({ inputMode }: { inputMode: AduRaaguInputMode }) {
  const { state } = useJudging();
  const { byCategory, total, totalMax } = computeScores(state);
  const config = state.activeAssignment?.config ?? state.config;
  const categories =
    state.activeAssignment?.categories ??
    judgeSeatFor(state.panel, state.deviceJudgeId)?.categories ??
    enabledCategories(config);
  const missingImpressions = missingRequiredImpressionCategories(
    config,
    state.impressions,
    categories,
  );

  return (
    <section className="panel scorecard" aria-label="Score">
      <div className="sc-total">
        <span className="sc-total-label">Score</span>
        <span className="sc-total-value" aria-live="polite" aria-atomic="true">
          <span className="sc-total-num t-num">{total}</span>
          <span className="sc-total-of t-num"> / {totalMax}</span>
        </span>
      </div>
      <div className="sc-rows">
        {CATEGORIES.filter((category) => categories.includes(category.id)).map((c) =>
          isImpressionCategory(c.id) ? (
            <ImpressionRow
              key={c.id}
              category={c.id}
              pending={missingImpressions.includes(c.id)}
              inputMode={inputMode}
            />
          ) : (
            <CategoryRow
              key={c.id}
              id={c.id}
              label={c.label}
              score={byCategory[c.id].score}
              start={byCategory[c.id].start}
              deducted={byCategory[c.id].deducted}
            />
          ),
        )}
      </div>
    </section>
  );
}

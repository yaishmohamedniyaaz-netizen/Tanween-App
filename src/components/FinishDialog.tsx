import { CATEGORY_BY_ID, isImpressionCategory } from "../config";
import {
  computeScores,
  impressionScore,
  missingRequiredImpressionCategories,
} from "../lib/scoring";
import { useJudging } from "../state/store";
import { categoryListLabel, judgeDisplayName } from "../lib/judgeAssignments";
import { MarkPicker } from "./MarkPicker";

export function FinishDialog({
  onCancel,
  onConfirm,
}: {
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const { state, dispatch } = useJudging();
  const { total, totalMax } = computeScores(state);
  const assignment = state.activeAssignment;
  const config = assignment?.config ?? state.config;
  const impressionCategories = (assignment?.categories ?? []).filter(
    (category) => isImpressionCategory(category) && config[category].enabled,
  );
  const missing = assignment
    ? missingRequiredImpressionCategories(
        assignment.config,
        state.impressions,
        assignment.categories,
      )
    : [];

  return (
    <div className="dialog-backdrop">
      <div
        className="dialog finish-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="finish-title"
      >
        <span className="dialog-kicker">Check before finishing</span>
        <h2 className="dialog-title" id="finish-title">
          Finish {state.participant.name || "this reciter"}?
        </h2>
        <div className="finish-summary">
          <span>
            <strong>{state.mistakes.length}</strong>
            <small>Mistakes</small>
          </span>
          <span>
            <strong>{total}</strong>
            <small>Out of {totalMax}</small>
          </span>
        </div>
        {assignment && (
          <p className="finish-role">
            {judgeDisplayName(assignment)} · {categoryListLabel(assignment.categories)}
          </p>
        )}
        {impressionCategories.length > 0 && (
          <div className="finish-impressions" aria-label="Marks required before saving">
            {impressionCategories.map((category) => {
              const { awarded, marked } = impressionScore(
                config,
                state.impressions,
                category,
                "entry-zero",
              );
              const label = CATEGORY_BY_ID[category].label;
              const isMissing = missing.includes(category);
              return (
                <div
                  key={category}
                  className={`finish-impression-row cat-${category} ${
                    isMissing ? "is-pending" : ""
                  }`}
                >
                  <div className="finish-impression-copy">
                    <strong>{label}</strong>
                    {isMissing && (
                      <span role="status">Choose a mark to save</span>
                    )}
                  </div>
                  <MarkPicker
                    value={awarded}
                    max={config[category].start}
                    step={config[category].step}
                    marked={marked}
                    label={label}
                    category={category}
                    onChange={(value) =>
                      dispatch({
                        type: "SET_IMPRESSION",
                        category,
                        awarded: value,
                      })
                    }
                    autoFocus={missing[0] === category}
                    layer="dialog"
                  />
                </div>
              );
            })}
          </div>
        )}
        <p className="dialog-sub">
          This saves the result and opens the next reciter. It can still be
          reopened later, but the judge must give a reason.
        </p>
        <div className="dialog-actions">
          <button type="button" className="btn-ghost" onClick={onCancel}>
            Keep judging
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={onConfirm}
            disabled={missing.length > 0}
          >
            Save and select next reciter
          </button>
        </div>
      </div>
    </div>
  );
}

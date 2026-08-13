import { CATEGORY_BY_ID, isImpressionCategory } from "../config";
import { computeScores } from "../lib/scoring";
import { useJudging } from "../state/store";
import { categoryListLabel, judgeDisplayName } from "../lib/judgeAssignments";

export function FinishDialog({
  onCancel,
  onConfirm,
}: {
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const { state } = useJudging();
  const { byCategory, total, totalMax } = computeScores(state);
  const assignment = state.activeAssignment;
  const config = assignment?.config ?? state.config;
  const unmarked = (assignment?.categories ?? []).filter(
    (category) =>
      isImpressionCategory(category) &&
      config[category].enabled &&
      !byCategory[category].marked,
  );

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
        {unmarked.length > 0 && (
          <p className="finish-warn" role="status">
            {unmarked.map((category) => CATEGORY_BY_ID[category].label).join(" and ")}{" "}
            {unmarked.length === 1 ? "has" : "have"} not been marked. Full marks
            will be recorded.
          </p>
        )}
        <p className="dialog-sub">
          This saves the result and opens the next reciter. It can still be
          reopened later, but the judge must give a reason.
        </p>
        <div className="dialog-actions">
          <button type="button" className="btn-ghost" onClick={onCancel}>
            Keep judging
          </button>
          <button type="button" className="btn-primary" onClick={onConfirm}>
            Save and select next reciter
          </button>
        </div>
      </div>
    </div>
  );
}

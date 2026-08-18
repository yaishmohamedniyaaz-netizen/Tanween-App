import { CATEGORY_BY_ID, isImpressionCategory } from "../config";
import {
  computeScores,
  impressionScore,
  missingRequiredImpressionCategories,
} from "../lib/scoring";
import { useJudging } from "../state/store";
import { judgeDisplayName } from "../lib/judgeAssignments";
import { MarkPicker } from "./MarkPicker";

export function FinishDialog({
  onCancel,
  onConfirm,
}: {
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const { state, dispatch } = useJudging();
  const { byCategory, total, totalMax } = computeScores(state);
  const assignment = state.activeAssignment;
  const config = assignment?.config ?? state.config;
  const reviewCategories = assignment?.categories ?? [];
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
  const remarks = [
    { label: "Notes", text: state.notes },
    ...impressionCategories.map((category) => ({
      label: `${CATEGORY_BY_ID[category].label} reason`,
      text: impressionScore(
        config,
        state.impressions,
        category,
        "entry-zero",
      ).note,
    })),
  ].filter((remark) => remark.text.trim().length > 0);
  const participantName = state.participant.name || "This reciter";
  const mistakeLabel = `${state.mistakes.length} mistake${
    state.mistakes.length === 1 ? "" : "s"
  }`;

  return (
    <div className="dialog-backdrop">
      <div
        className="dialog finish-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="finish-title"
      >
        <header className="finish-dialog-head">
          <div className="finish-heading-copy">
            <h2 className="dialog-title" id="finish-title">
              Review and save
            </h2>
            <p className="finish-participant">{participantName}</p>
            <div className="finish-context" aria-label="Recitation context">
              {state.activeQuestion && <span>Q · {state.activeQuestion.label}</span>}
              {assignment && <span>{judgeDisplayName(assignment)}</span>}
              <span>{mistakeLabel}</span>
            </div>
          </div>
          <div className="finish-total" aria-label={`Score ${total} out of ${totalMax}`}>
            <span className="finish-total-value">
              <strong className="t-num">{total}</strong>
              <span className="t-num">/ {totalMax}</span>
            </span>
            <small>Score</small>
          </div>
        </header>

        <div className="finish-dialog-body">
          <div className="finish-score-table" role="table" aria-label="Score by criterion">
            <div className="finish-score-head" role="row">
              <span role="columnheader">Criterion</span>
              <span role="columnheader">Deducted</span>
              <span role="columnheader">Score</span>
            </div>
            {reviewCategories.map((category) => {
              const definition = CATEGORY_BY_ID[category];
              const score = byCategory[category];
              const isImpression = isImpressionCategory(category);
              const isMissing = missing.includes(category);
              const impression = isImpression
                ? impressionScore(
                    config,
                    state.impressions,
                    category,
                    "entry-zero",
                  )
                : null;
              const deducted = isMissing || score.deducted === 0
                ? "—"
                : `−${score.deducted}`;
              return (
                <div
                  key={category}
                  className={`finish-score-row cat-${category} ${
                    isMissing ? "is-pending" : ""
                  }`}
                  role="row"
                >
                  <div className="finish-criterion" role="cell">
                    <span className="finish-criterion-dot" aria-hidden="true" />
                    <span>
                      <strong>{definition.label}</strong>
                      {isMissing && <small role="status">Not entered</small>}
                    </span>
                  </div>
                  <span className="finish-deducted t-num" role="cell">
                    {deducted}
                  </span>
                  <div className="finish-score-value" role="cell">
                    {isImpression && impression ? (
                      <MarkPicker
                        value={impression.awarded}
                        max={score.start}
                        step={config[category].step}
                        marked={impression.marked}
                        label={definition.label}
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
                    ) : (
                      <span className="score-value-layout t-num">
                        <span className="score-value-number">{score.score}</span>
                        <span className="sc-of">/ {score.start}</span>
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {remarks.length > 0 && (
            <section className="finish-remarks" aria-labelledby="finish-remarks-title">
              <h3 id="finish-remarks-title">Remarks</h3>
              <dl>
                {remarks.map((remark) => (
                  <div key={remark.label}>
                    <dt>{remark.label}</dt>
                    <dd>{remark.text}</dd>
                  </div>
                ))}
              </dl>
            </section>
          )}
        </div>

        <div className="dialog-actions finish-dialog-actions">
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

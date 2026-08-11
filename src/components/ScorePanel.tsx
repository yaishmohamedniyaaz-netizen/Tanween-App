import { CATEGORIES } from "../config";
import { computeScores } from "../lib/scoring";
import { useJudging } from "../state/store";
import type { CategoryId } from "../types";

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
      <span className="sc-score t-num">
        {score}
        <span className="sc-of"> / {start}</span>
      </span>
    </div>
  );
}

export function ScorePanel() {
  const { state } = useJudging();
  const { byCategory, total, totalMax } = computeScores(state);

  return (
    <section className="panel scorecard" aria-label="Score">
      <div className="sc-total">
        <span className="sc-total-label">Current score</span>
        <span className="sc-total-value" aria-live="polite" aria-atomic="true">
          <span className="sc-total-num t-num">{total}</span>
          <span className="sc-total-of t-num"> / {totalMax}</span>
        </span>
      </div>
      <div className="sc-rows">
        {CATEGORIES.map((c) => (
          <CategoryRow
            key={c.id}
            id={c.id}
            label={c.label}
            score={byCategory[c.id].score}
            start={byCategory[c.id].start}
            deducted={byCategory[c.id].deducted}
          />
        ))}
      </div>
    </section>
  );
}

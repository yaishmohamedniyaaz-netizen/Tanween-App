import { useEffect, useRef, useState } from "react";
import { CATEGORIES } from "../config";
import { computeScores } from "../lib/scoring";
import { useAnimatedNumber } from "../lib/useAnimatedNumber";
import { useJudging } from "../state/store";
import type { CategoryId } from "../types";

function CategoryRow({
  id,
  label,
  score,
  start,
  count,
}: {
  id: CategoryId;
  label: string;
  score: number;
  start: number;
  count: number;
}) {
  const shown = useAnimatedNumber(score);
  const [pulse, setPulse] = useState(false);
  const prev = useRef(score);

  useEffect(() => {
    if (prev.current !== score) {
      prev.current = score;
      setPulse(true);
      const t = setTimeout(() => setPulse(false), 650);
      return () => clearTimeout(t);
    }
  }, [score]);

  return (
    <div className={`sc-row cat-${id} ${pulse ? "pulse" : ""}`}>
      <span className="sc-dot" aria-hidden="true" />
      <span className="sc-name">{label}</span>
      {count > 0 && (
        <span className="sc-count t-num">
          {count} mark{count === 1 ? "" : "s"}
        </span>
      )}
      <span className="sc-score t-num">
        {shown}
        <span className="sc-of"> / {start}</span>
      </span>
    </div>
  );
}

export function ScorePanel() {
  const { state } = useJudging();
  const { byCategory, total, totalMax } = computeScores(state);
  const shownTotal = useAnimatedNumber(total);

  return (
    <section className="panel scorecard" aria-label="Score">
      <div className="sc-rows">
        {CATEGORIES.map((c) => (
          <CategoryRow
            key={c.id}
            id={c.id}
            label={c.label}
            score={byCategory[c.id].score}
            start={byCategory[c.id].start}
            count={byCategory[c.id].count}
          />
        ))}
      </div>
      <div className="sc-total">
        <span className="sc-total-label">Total</span>
        <span className="sc-total-num t-num">{shownTotal}</span>
        <span className="sc-total-of t-num">/ {totalMax}</span>
      </div>
    </section>
  );
}

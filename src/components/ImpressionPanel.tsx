import { CATEGORY_BY_ID, IMPRESSION_CATEGORIES } from "../config";
import { impressionScore } from "../lib/scoring";
import { useJudging } from "../state/store";
import type { CategoryId } from "../types";
import { Icon } from "./Icon";

/** Whole-recitation criteria — Adu & Raagu (voice and melody) — cannot be tied
 *  to one letter, so the judge marks them once for the reciter. */
export function ImpressionPanel() {
  const { state, dispatch } = useJudging();
  const assignment = state.activeAssignment;
  const config = assignment?.config ?? state.config;
  const categories = IMPRESSION_CATEGORIES.filter(
    (category) =>
      config[category].enabled && assignment?.categories.includes(category),
  );
  if (!categories.length) return null;

  const setAwarded = (category: CategoryId, awarded: number) =>
    dispatch({ type: "SET_IMPRESSION", category, awarded });

  return (
    <>
      {categories.map((category) => {
        const def = CATEGORY_BY_ID[category];
        const { start, step } = config[category];
        const { awarded, marked, note } = impressionScore(
          config,
          state.impressions,
          category,
        );
        return (
          <section
            className={`panel impression-panel cat-${category}`}
            key={category}
            aria-label={`${def.label} marks`}
          >
            <div className="panel-head">
              <span className="t-label">
                <span className="sc-dot" aria-hidden="true" /> {def.label}
              </span>
              {!marked && <span className="impression-pending">Not marked yet</span>}
            </div>
            <p className="impression-hint">{def.hint}</p>
            <div className="impression-stepper">
              <button
                type="button"
                aria-label={`Deduct ${step} from ${def.label}`}
                disabled={awarded <= 0}
                onClick={() => setAwarded(category, awarded - step)}
              >
                <Icon name="minus" size={16} />
              </button>
              <span className="impression-value" aria-live="polite" aria-atomic="true">
                <strong className="t-num">{awarded}</strong>
                <small className="t-num">/ {start}</small>
              </span>
              <button
                type="button"
                aria-label={`Add ${step} to ${def.label}`}
                disabled={awarded >= start}
                onClick={() => setAwarded(category, awarded + step)}
              >
                <Icon name="plus" size={16} />
              </button>
            </div>
            <div className="impression-actions">
              <button
                type="button"
                className="dialog-link"
                disabled={marked && awarded === start}
                onClick={() => setAwarded(category, start)}
              >
                Full marks
              </button>
            </div>
            <textarea
              className="notes"
              rows={2}
              value={note}
              placeholder={`Why these ${def.label} marks?`}
              onChange={(event) =>
                dispatch({
                  type: "SET_IMPRESSION_NOTE",
                  category,
                  note: event.target.value,
                })
              }
            />
          </section>
        );
      })}
    </>
  );
}

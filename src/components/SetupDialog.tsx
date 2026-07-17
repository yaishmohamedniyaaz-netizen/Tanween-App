import { Fragment, useRef, useState } from "react";
import { CATEGORIES, START_OPTIONS, STEP_OPTIONS, TOTAL_MARKS } from "../config";
import { parseRosterFile } from "../lib/roster";
import { useJudging } from "../state/store";
import { Icon } from "./Icon";

/** Competition setup: mark allocations per category + participant roster. */
export function SetupDialog({ onClose }: { onClose: () => void }) {
  const { state, dispatch } = useJudging();
  const fileRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState<number | null>(null);

  const allocTotal = CATEGORIES.reduce(
    (sum, c) => sum + state.config[c.id].start,
    0,
  );

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    try {
      const entries = await parseRosterFile(file);
      dispatch({ type: "LOAD_ROSTER", entries });
      setLoaded(entries.length);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not read that file.");
    }
  };

  return (
    <div
      className="dialog-backdrop"
      onPointerDown={(e) => {
        if (e.target === e.currentTarget && allocTotal === TOTAL_MARKS) onClose();
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape" && allocTotal === TOTAL_MARKS) onClose();
      }}
    >
      <div
        className="dialog dialog-wide"
        role="dialog"
        aria-modal="true"
        aria-label="Competition setup"
      >
        <h2 className="dialog-title">Competition setup</h2>
        <p className="dialog-sub">
          Marks and increments apply to every reciter in this competition.
        </p>

        <div className="setup-grid">
          <span className="t-label">Category</span>
          <span className="t-label">Marks</span>
          <span className="t-label">Step</span>
          {CATEGORIES.map((c) => (
            <Fragment key={c.id}>
              <span className={`setup-cat cat-${c.id}`}>
                <span className="sc-dot" aria-hidden="true" />
                {c.label}
              </span>
              <select
                value={state.config[c.id].start}
                aria-label={`${c.label} marks`}
                onChange={(e) =>
                  dispatch({
                    type: "SET_CONFIG",
                    category: c.id,
                    start: Number(e.target.value),
                  })
                }
              >
                {START_OPTIONS.map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
              <select
                value={state.config[c.id].step}
                aria-label={`${c.label} deduction step`}
                onChange={(e) =>
                  dispatch({
                    type: "SET_CONFIG",
                    category: c.id,
                    step: Number(e.target.value),
                  })
                }
              >
                {STEP_OPTIONS.map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            </Fragment>
          ))}
          <span className="setup-total-label">Total</span>
          <span
            className={`setup-total t-num ${allocTotal !== TOTAL_MARKS ? "is-off" : ""}`}
          >
            {allocTotal} / {TOTAL_MARKS}
          </span>
          <span />
        </div>
        {allocTotal !== TOTAL_MARKS && (
          <p className="setup-warn">
            Allocations must total {TOTAL_MARKS} — adjust by{" "}
            {allocTotal > TOTAL_MARKS ? "−" : "+"}
            {Math.abs(TOTAL_MARKS - allocTotal)}.
          </p>
        )}

        <div className="dialog-field">
          <span className="t-label" style={{ display: "block", marginBottom: 8 }}>
            Participants
          </span>
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            hidden
            onChange={(e) => onFile(e.target.files?.[0])}
          />
          <div
            className="file-drop"
            role="button"
            tabIndex={0}
            onClick={() => fileRef.current?.click()}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") fileRef.current?.click();
            }}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              onFile(e.dataTransfer.files?.[0]);
            }}
          >
            <Icon name="upload" size={16} />{" "}
            {state.roster.length
              ? `${state.roster.length} participants loaded — replace list`
              : "Upload .xlsx or .csv — a Name column, plus optional Number, Island, Class"}
          </div>
          {loaded !== null && (
            <p className="dialog-sub" style={{ margin: "8px 0 0" }}>
              Loaded {loaded} participant{loaded === 1 ? "" : "s"}.
            </p>
          )}
          {error && (
            <p
              className="dialog-sub"
              style={{ margin: "8px 0 0", color: "#9e2820" }}
            >
              {error}
            </p>
          )}
          {state.roster.length > 0 && (
            <button
              type="button"
              className="dialog-link"
              style={{ marginTop: 8 }}
              onClick={() => dispatch({ type: "CLEAR_ROSTER" })}
            >
              Remove list
            </button>
          )}
        </div>

        <div className="dialog-actions">
          <button
            type="button"
            className="btn-primary"
            disabled={allocTotal !== TOTAL_MARKS}
            style={
              allocTotal !== TOTAL_MARKS
                ? { opacity: 0.4, cursor: "default" }
                : undefined
            }
            onClick={onClose}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

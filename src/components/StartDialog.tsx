import { useEffect, useRef, useState } from "react";
import { useJudging } from "../state/store";
import type { RosterEntry } from "../types";
import { Icon } from "./Icon";
import {
  assignmentLabel,
  judgeDisplayName,
  makeAssignmentSnapshot,
} from "../lib/judgeAssignments";

/** Shown whenever no reciter session is active. Two routes:
 *  type a name, or pick from the uploaded roster (next-up preselected). */
export function StartDialog({ onOpenSetup }: { onOpenSetup: () => void }) {
  const { state, dispatch } = useJudging();
  const [name, setName] = useState("");
  const [showDetails, setShowDetails] = useState(false);
  const [number, setNumber] = useState("");
  const [group, setGroup] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const roster = state.roster;
  const nextIdx = roster.findIndex((r) => !r.judged);
  const assignment = makeAssignmentSnapshot(
    state.panel,
    state.deviceJudgeId,
    state.config,
  );

  useEffect(() => {
    if (roster.length === 0) inputRef.current?.focus();
  }, [roster.length]);

  const start = (p: { name: string; number: string; group: string }) => {
    if (!p.name.trim()) return;
    dispatch({
      type: "START_RECITER",
      participant: {
        name: p.name.trim(),
        number: p.number.trim(),
        group: p.group.trim(),
      },
    });
  };

  const startEntry = (r: RosterEntry) =>
    start({ name: r.name, number: r.number, group: r.group });

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== "Enter") return;
    if ((e.target as HTMLElement).closest("button, select, textarea")) return;
    if (roster.length > 0 && nextIdx >= 0 && !name.trim()) {
      startEntry(roster[nextIdx]);
    } else {
      start({ name, number, group });
    }
  };

  return (
    <div className="dialog-backdrop" onKeyDown={onKeyDown}>
      <div
        className="dialog"
        role="dialog"
        aria-modal="true"
        aria-label="Start a reciter"
      >
        <h2 className="dialog-title">
          {roster.length ? "Who is reciting?" : "New reciter"}
        </h2>
        <p className="dialog-sub">
          {roster.length
            ? "Next up is preselected — press Enter to start."
            : "Type the reciter's name to begin judging."}
        </p>

        <div className={`start-judge-panel ${assignment ? "" : "is-missing"}`}>
          <div className="start-judge-panel-copy">
            <span className="t-label">Judging panel</span>
            {assignment ? (
              <>
                <strong>{judgeDisplayName(assignment)}</strong>
                <span>{assignmentLabel(assignment.categories)}</span>
              </>
            ) : (
              <strong>Choose this device's judge</strong>
            )}
          </div>
          <button
            type="button"
            className="btn-ghost start-judge-change"
            onClick={onOpenSetup}
          >
            Change assignments
          </button>
          <p>
            One judge covering all three is the default. Add judges or assign
            Jali, Khafi and Fasaha before starting.
          </p>
        </div>

        {roster.length === 0 ? (
          <>
            <div className="dialog-field">
              <input
                ref={inputRef}
                type="text"
                value={name}
                placeholder="Reciter's name"
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            {showDetails ? (
              <div className="dialog-details">
                <input
                  type="text"
                  value={number}
                  placeholder="No."
                  style={{ maxWidth: 72 }}
                  onChange={(e) => setNumber(e.target.value)}
                />
                <input
                  type="text"
                  value={group}
                  placeholder="Island / class"
                  onChange={(e) => setGroup(e.target.value)}
                />
              </div>
            ) : (
              <button
                type="button"
                className="dialog-link"
                onClick={() => setShowDetails(true)}
              >
                Add number or island / class
              </button>
            )}
            <div className="dialog-actions">
              <button
                type="button"
                className="btn-ghost"
                onClick={onOpenSetup}
              >
                Participant list
              </button>
              <button
                type="button"
                className="btn-primary"
                disabled={!name.trim() || !assignment}
                style={!name.trim() || !assignment ? { opacity: 0.4, cursor: "default" } : undefined}
                onClick={() => start({ name, number, group })}
              >
                Start
              </button>
            </div>
          </>
        ) : (
          <>
            <ul className="roster-list">
              {roster.map((r, i) => (
                <li key={`${r.name}-${i}`}>
                  <button
                    type="button"
                    className={`roster-row ${i === nextIdx ? "is-next" : ""} ${
                      r.judged ? "is-done" : ""
                    }`}
                    disabled={!assignment}
                    onClick={() => startEntry(r)}
                  >
                    <span className="roster-num t-num">{r.number || i + 1}</span>
                    <span className="roster-name">{r.name}</span>
                    {r.group && <span className="roster-meta">{r.group}</span>}
                    {r.judged && (
                      <span className="roster-check" aria-label="judged">
                        <Icon name="check" size={15} />
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
            <div className="dialog-actions">
              <button type="button" className="btn-ghost" onClick={onOpenSetup}>
                Edit setup
              </button>
              {nextIdx >= 0 && (
                <button
                  type="button"
                  className="btn-primary"
                  disabled={!assignment}
                  onClick={() => startEntry(roster[nextIdx])}
                >
                  Start {roster[nextIdx].name.split(" ")[0]}
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

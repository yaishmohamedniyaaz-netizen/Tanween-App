import { useEffect, useRef, useState } from "react";
import { useJudging } from "../state/store";
import type {
  MuqarrarSide,
  Participant,
  ParticipantCategory,
  RosterEntry,
} from "../types";
import { Icon } from "./Icon";
import {
  assignmentLabel,
  judgeDisplayName,
  makeAssignmentSnapshot,
} from "../lib/judgeAssignments";
import {
  EMPTY_PARTICIPANT,
  muqarrarLabel,
  normalizeParticipant,
  participantCategoryLabel,
} from "../lib/participants";

/** Pick the next uploaded participant or enter one manually. */
export function StartDialog({ onOpenSetup }: { onOpenSetup: () => void }) {
  const { state, dispatch } = useJudging();
  const [draft, setDraft] = useState<Participant>({ ...EMPTY_PARTICIPANT });
  const [showDetails, setShowDetails] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const roster = state.roster;
  const nextIdx = roster.findIndex((entry) => !entry.judged);
  const assignment = makeAssignmentSnapshot(
    state.panel,
    state.deviceJudgeId,
    state.config,
  );

  useEffect(() => {
    if (roster.length === 0) inputRef.current?.focus();
  }, [roster.length]);

  const patchDraft = (patch: Partial<Participant>) =>
    setDraft((current) => ({ ...current, ...patch }));

  const start = (participant: Participant) => {
    const normalized = normalizeParticipant(participant);
    if (!normalized.name) return;
    dispatch({ type: "START_RECITER", participant: normalized });
  };

  const startEntry = (entry: RosterEntry) => start(entry);

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key !== "Enter") return;
    if ((event.target as HTMLElement).closest("button, select, textarea")) return;
    if (roster.length > 0 && nextIdx >= 0 && !draft.name.trim()) {
      startEntry(roster[nextIdx]);
    } else {
      start(draft);
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
                value={draft.name}
                placeholder="Reciter's name"
                onChange={(event) => patchDraft({ name: event.target.value })}
              />
            </div>
            {showDetails ? (
              <div className="dialog-details participant-details">
                <input
                  type="text"
                  inputMode="numeric"
                  value={draft.number}
                  placeholder="Participant number"
                  onChange={(event) => patchDraft({ number: event.target.value })}
                />
                <input
                  type="text"
                  value={draft.ageGroup}
                  placeholder="Age group, e.g. Under 14"
                  onChange={(event) => patchDraft({ ageGroup: event.target.value })}
                />
                <select
                  value={draft.category}
                  aria-label="Participant category"
                  onChange={(event) =>
                    patchDraft({ category: event.target.value as ParticipantCategory })
                  }
                >
                  <option value="">Category</option>
                  <option value="baliagen">Baliagen · Tarteel / reading</option>
                  <option value="nubalaa">Nubalaa · Memorisation</option>
                </select>
                <select
                  value={draft.muqarrar}
                  aria-label="Muqarrar Hathim side"
                  onChange={(event) =>
                    patchDraft({ muqarrar: event.target.value as MuqarrarSide })
                  }
                >
                  <option value="">Muqarrar</option>
                  <option value="feshey-kolhu">Feshey kolhu · Starting side</option>
                  <option value="nimey-kolhu">Nimey kolhu · Ending side</option>
                </select>
                <input
                  type="tel"
                  value={draft.phone}
                  placeholder="Phone number"
                  onChange={(event) => patchDraft({ phone: event.target.value })}
                />
                <input
                  type="text"
                  value={draft.institution}
                  placeholder="Institution / school / own participation"
                  onChange={(event) => patchDraft({ institution: event.target.value })}
                />
              </div>
            ) : (
              <button
                type="button"
                className="dialog-link"
                onClick={() => setShowDetails(true)}
              >
                Add participant details
              </button>
            )}
            <div className="dialog-actions">
              <button type="button" className="btn-ghost" onClick={onOpenSetup}>
                Participant list
              </button>
              <button
                type="button"
                className="btn-primary"
                disabled={!draft.name.trim() || !assignment}
                style={
                  !draft.name.trim() || !assignment
                    ? { opacity: 0.4, cursor: "default" }
                    : undefined
                }
                onClick={() => start(draft)}
              >
                Start
              </button>
            </div>
          </>
        ) : (
          <>
            <ul className="roster-list">
              {roster.map((entry, index) => (
                <li key={entry.id}>
                  <button
                    type="button"
                    className={`roster-row ${index === nextIdx ? "is-next" : ""} ${
                      entry.judged ? "is-done" : ""
                    }`}
                    disabled={!assignment}
                    onClick={() => startEntry(entry)}
                  >
                    <span className="roster-num t-num">{entry.number || index + 1}</span>
                    <span className="roster-name">{entry.name}</span>
                    <span className="roster-meta">
                      {[entry.ageGroup, entry.category ? participantCategoryLabel(entry.category) : "", entry.muqarrar ? muqarrarLabel(entry.muqarrar) : ""]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                    {entry.judged && (
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

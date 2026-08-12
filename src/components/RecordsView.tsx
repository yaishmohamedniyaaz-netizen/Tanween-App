import { useEffect, useMemo, useRef, useState } from "react";
import { CATEGORIES, CATEGORY_BY_ID } from "../config";
import { computeRecords } from "../lib/stats";
import { downloadRecordsCSV } from "../lib/exportSession";
import { useJudging } from "../state/store";
import { Icon } from "./Icon";
import { JudgingHistory } from "./JudgingHistory";
import { ReopenSessionDialog } from "./ReopenSessionDialog";
import type { SavedSession } from "../types";
import { assignmentLabel, judgeDisplayName } from "../lib/judgeAssignments";
import { participantCategoryLabel } from "../lib/participants";
import type { ParticipantCategory } from "../types";
import {
  downloadJudgeResultPackage,
  readJudgeResultFile,
  type JudgeResultPackage,
} from "../lib/resultPackages";
import { FinalResultsPanel } from "./FinalResultsPanel";

export function RecordsView({ onResumeSession }: { onResumeSession: () => void }) {
  const { state, dispatch } = useJudging();
  const [ageGroup, setAgeGroup] = useState<string>("");
  const [participantCategory, setParticipantCategory] = useState<ParticipantCategory>("");
  const [judgeSeat, setJudgeSeat] = useState<string>("");
  const [section, setSection] = useState<string>("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [reopenSession, setReopenSession] = useState<SavedSession | null>(null);
  const [importPreview, setImportPreview] = useState<JudgeResultPackage | null>(null);
  const [importError, setImportError] = useState("");
  const importRef = useRef<HTMLInputElement>(null);
  const scopedHistory = useMemo(
    () => state.history.filter((session) => {
      const assignment = session.assignment;
      const seatMatches = !judgeSeat || (assignment?.judgeSeatId ?? "judge-1") === judgeSeat;
      const sectionKey = assignment?.categories.join("+") ?? "jali+khafi+fasaha";
      return seatMatches && (!section || sectionKey === section);
    }),
    [state.history, judgeSeat, section],
  );
  const categoryHistory = useMemo(
    () => participantCategory
      ? scopedHistory.filter((session) => session.participant.category === participantCategory)
      : scopedHistory,
    [scopedHistory, participantCategory],
  );
  const stats = useMemo(
    () => computeRecords(categoryHistory, ageGroup || null),
    [categoryHistory, ageGroup],
  );
  const judgeOptions = useMemo(() => {
    const values = new Map<string, string>();
    state.history.forEach((session) => {
      const assignment = session.assignment;
      values.set(
        assignment?.judgeSeatId ?? "judge-1",
        assignment ? judgeDisplayName(assignment) : "Judge 1",
      );
    });
    return [...values.entries()];
  }, [state.history]);
  const sectionOptions = useMemo(() => {
    const values = new Map<string, string>();
    state.history.forEach((session) => {
      const categories = session.assignment?.categories ?? ["jali", "khafi", "fasaha"];
      values.set(categories.join("+"), assignmentLabel(categories));
    });
    return [...values.entries()];
  }, [state.history]);

  const maxCatCount = Math.max(
    1,
    ...CATEGORIES.map((c) => stats.byCategory[c.id].count),
  );
  const maxLocCount = Math.max(1, ...stats.topLocations.map((l) => l.count));

  const readImport = async (file: File | undefined) => {
    if (!file) return;
    setImportError("");
    setImportPreview(null);
    try {
      if (state.sessionActive) {
        throw new Error("Finish the active reciter before importing a judge result.");
      }
      if (!state.competition.name || !state.competition.edition) {
        throw new Error("Set the competition name and edition before importing results.");
      }
      const payload = await readJudgeResultFile(file);
      if (payload.competition.id !== state.competition.id) {
        throw new Error("That result belongs to a different competition or edition.");
      }
      if (!state.roster.length) {
        throw new Error("Upload this competition's participant list before importing judge results.");
      }
      if (!state.roster.some((entry) => entry.id === payload.session.participant.id)) {
        throw new Error("That participant is not in this competition's participant list.");
      }
      const incomingAssignment = payload.session.assignment;
      if (!incomingAssignment) {
        throw new Error("That judge result does not include a judge assignment.");
      }
      const expectedSeat = state.panel.seats.find(
        (seat) => seat.id === incomingAssignment.judgeSeatId,
      );
      if (
        !expectedSeat ||
        [...expectedSeat.categories].sort().join("|") !==
          [...incomingAssignment.categories].sort().join("|")
      ) {
        throw new Error("That judge result does not match this competition's panel assignments.");
      }
      if (JSON.stringify(payload.session.config) !== JSON.stringify(state.config)) {
        throw new Error("That judge result uses different scoring rules.");
      }
      setImportPreview(payload);
    } catch (error) {
      setImportError(error instanceof Error ? error.message : "Could not read that result file.");
    } finally {
      if (importRef.current) importRef.current.value = "";
    }
  };

  useEffect(() => {
    if (ageGroup && !stats.ageGroups.includes(ageGroup)) setAgeGroup("");
  }, [ageGroup, stats.ageGroups]);

  const sessions = categoryHistory.filter(
    (session) =>
      !ageGroup || (session.participant.ageGroup?.trim() || "") === ageGroup,
  );

  return (
    <div className="records">
      <div className="records-bar">
        <div className="metric-cards">
          <div className="metric">
            <span className="metric-label">Sessions</span>
            <span className="metric-num">{stats.sessions}</span>
          </div>
          <div className="metric">
            <span className="metric-label">Average score</span>
            <span className="metric-num">{stats.avgPercent}%</span>
          </div>
          <div className="metric">
            <span className="metric-label">Mistakes logged</span>
            <span className="metric-num">{stats.totalMistakes}</span>
          </div>
        </div>
        <div className="records-filters">
          <label className="records-filter">
            <span>Judge</span>
            <select value={judgeSeat} onChange={(e) => setJudgeSeat(e.target.value)}>
              <option value="">All judges</option>
              {judgeOptions.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
            </select>
          </label>
          <label className="records-filter">
            <span>Section</span>
            <select value={section} onChange={(e) => setSection(e.target.value)}>
              <option value="">All sections</option>
              {sectionOptions.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
            </select>
          </label>
          <label className="records-filter">
            <span>Age group</span>
            <select value={ageGroup} onChange={(e) => setAgeGroup(e.target.value)}>
              <option value="">All</option>
              {stats.ageGroups.map((group) => (
                <option key={group} value={group}>{group}</option>
              ))}
            </select>
          </label>
          <label className="records-filter">
            <span>Participant category</span>
            <select
              value={participantCategory}
              onChange={(event) =>
                setParticipantCategory(event.target.value as ParticipantCategory)
              }
            >
              <option value="">All</option>
              <option value="baliagen">Baliagen</option>
              <option value="nubalaa">Hifz</option>
            </select>
          </label>
        </div>
      </div>

      <div className="records-grid">
        <section className="panel">
          <div className="panel-head">
            <h2 className="panel-title">Mistakes by category</h2>
          </div>
          <div className="cat-list">
            {CATEGORIES.map((c) => {
              const s = stats.byCategory[c.id];
              return (
                <div className={`cat-row cat-${c.id}`} key={c.id}>
                  <div className="cat-row-top">
                    <span className="cat-dot" aria-hidden="true" />
                    <span className="cat-name">{c.label}</span>
                    <span className="cat-score">{s.count}</span>
                  </div>
                  <div className="cat-bar">
                    <span
                      className="cat-bar-fill"
                      style={{ width: `${(s.count / maxCatCount) * 100}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="panel">
          <div className="panel-head">
            <h2 className="panel-title">Most marked letters</h2>
          </div>
          {stats.topLetters.length === 0 ? (
            <p className="empty">No marks yet.</p>
          ) : (
            <div className="letter-chips">
              {stats.topLetters.map((l) => (
                <span className="letter-chip" key={l.glyph}>
                  <span className="letter-chip-glyph">{l.glyph}</span>
                  <span className="letter-chip-count">{l.count}</span>
                </span>
              ))}
            </div>
          )}
        </section>
      </div>

      <section className="panel">
        <div className="panel-head">
          <h2 className="panel-title">Most repeated mistakes</h2>
          <span className="panel-sub">same letter, across reciters</span>
        </div>
        {stats.topLocations.length === 0 ? (
          <p className="empty">No marks yet.</p>
        ) : (
          <ul className="repeat-list">
            {stats.topLocations.map((l) => (
              <li className={`repeat-item cat-${l.topCategory}`} key={l.tid}>
                <span className="repeat-glyph">{l.glyph}</span>
                <span className="repeat-body">
                  <span className="repeat-loc">{l.label}</span>
                  <span className="repeat-chip">
                    {CATEGORY_BY_ID[l.topCategory].label}
                  </span>
                </span>
                <span className="repeat-bar">
                  <span
                    className="repeat-bar-fill"
                    style={{ width: `${(l.count / maxLocCount) * 100}%` }}
                  />
                </span>
                <span className="repeat-count">×{l.count}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="panel">
        <div className="panel-head">
          <h2 className="panel-title">
            Sessions
            <span className="panel-count">{sessions.length}</span>
          </h2>
          <div className="panel-actions">
            <input
              ref={importRef}
              type="file"
              accept=".json,application/json"
              hidden
              onChange={(event) => readImport(event.target.files?.[0])}
            />
            <button
              type="button"
              className="btn-ghost"
              disabled={state.sessionActive}
              onClick={() => importRef.current?.click()}
              title="Import a result exported by another judge"
            >
              <Icon name="download" size={15} />
              Import judge result
            </button>
            <button
              type="button"
              className="btn-ghost"
              onClick={() => downloadRecordsCSV(state.history)}
              title="Export all records as CSV"
            >
              <Icon name="download" size={15} />
              CSV
            </button>
          </div>
        </div>
        {importError && <p className="import-error">{importError}</p>}
        {importPreview && (
          <div className="result-import-preview" role="status">
            <span>
              <strong>{importPreview.session.participant.name}</strong>
              <small>
                {importPreview.session.participant.number} · {importPreview.session.assignment
                  ? assignmentLabel(importPreview.session.assignment.categories)
                  : "Judge section"}
              </small>
            </span>
            <button type="button" className="btn-ghost" onClick={() => setImportPreview(null)}>
              Cancel
            </button>
            <button
              type="button"
              className="btn-primary"
              onClick={() => {
                dispatch({ type: "IMPORT_SESSION", session: importPreview.session });
                setImportPreview(null);
              }}
            >
              Add to records
            </button>
          </div>
        )}
        {sessions.length === 0 ? (
          <p className="empty">No judge-section results match these filters.</p>
        ) : <ul className="session-list">
          {sessions.map((s) => {
            const isOpen = expanded === s.id;
            return (
              <li className="session-li" key={s.id}>
                <div
                  className={`session-item ${isOpen ? "is-open" : ""}`}
                  role="button"
                  tabIndex={0}
                  aria-expanded={isOpen}
                  onClick={() => setExpanded(isOpen ? null : s.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setExpanded(isOpen ? null : s.id);
                    }
                  }}
                >
                  <span className="session-chevron" aria-hidden="true">
                    <Icon name="chevron" size={16} />
                  </span>
                  <span className="session-no">{s.participant.number || "—"}</span>
                  <span className="session-main">
                    <span className="session-name">
                      {s.participant.name || "Unnamed reciter"}
                    </span>
                    <span className="session-meta">
                      {[s.participant.ageGroup, participantCategoryLabel(s.participant.category), s.participant.institution]
                        .filter(Boolean)
                        .join(" · ")} ·{" "}
                      {new Date(s.savedAt).toLocaleDateString()} ·{" "}
                      {s.mistakes.length} mistakes ·{" "}
                      {s.assignment ? judgeDisplayName(s.assignment) : "Judge 1"}
                    </span>
                  </span>
                  <span className="session-score">
                    {s.total}
                    <span className="session-max">/{s.totalMax}</span>
                  </span>
                  <span className="session-status">Section</span>
                </div>
                {isOpen && (
                  <div className="session-drill">
                    <div className="session-assignment">
                      <strong>{s.assignment ? judgeDisplayName(s.assignment) : "Judge 1"}</strong>
                      <span>{s.assignment ? assignmentLabel(s.assignment.categories) : "Jali + Khafi + Fasaha"}</span>
                      <small>Judge-section result · {s.total}/{s.totalMax}</small>
                    </div>
                    {s.mistakes.length === 0 ? (
                      <p className="empty">No mistakes in this session.</p>
                    ) : (
                      <ul className="drill-list">
                        {s.mistakes.map((m) => (
                          <li className={`drill-item cat-${m.category}`} key={m.id}>
                            <span className="drill-glyph">{m.glyph}</span>
                            <span className="drill-loc">{m.label}</span>
                            <span className="drill-chip">
                              {CATEGORY_BY_ID[m.category].label}
                            </span>
                            <span className="drill-amt">−{m.amount}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                    {s.notes?.trim() && (
                      <p className="drill-notes">{s.notes}</p>
                    )}
                    <div className="session-history-head">
                      <span className="t-label">Judging history</span>
                      <button
                        type="button"
                        className="btn-ghost"
                        disabled={!state.competition.name || !state.competition.edition}
                        title={
                          state.competition.name && state.competition.edition
                            ? "Export this judge-owned result for consolidation"
                            : "Set the competition name and edition before exporting"
                        }
                        onClick={() => downloadJudgeResultPackage(s, state.competition)}
                      >
                        Export judge result
                      </button>
                      <button
                        type="button"
                        className="btn-ghost"
                        disabled={state.sessionActive}
                        title={
                          state.sessionActive
                            ? "Finish the current reciter before reopening another result"
                            : "Reopen this result to make a recorded correction"
                        }
                        onClick={() => setReopenSession(s)}
                      >
                        Reopen to correct
                      </button>
                    </div>
                    <JudgingHistory events={s.events ?? []} />
                  </div>
                )}
              </li>
            );
          })}
        </ul>}
      </section>
      <FinalResultsPanel />
      {reopenSession && (
        <ReopenSessionDialog
          session={reopenSession}
          onCancel={() => setReopenSession(null)}
          onConfirm={(reason) => {
            dispatch({
              type: "REOPEN_SESSION",
              id: reopenSession.id,
              reason,
            });
            setReopenSession(null);
            onResumeSession();
          }}
        />
      )}
    </div>
  );
}

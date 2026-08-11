import { useMemo, useState } from "react";
import { CATEGORIES, CATEGORY_BY_ID } from "../config";
import { computeRecords } from "../lib/stats";
import { downloadRecordsCSV } from "../lib/exportSession";
import { useJudging } from "../state/store";
import { Icon } from "./Icon";
import { JudgingHistory } from "./JudgingHistory";
import { ReopenSessionDialog } from "./ReopenSessionDialog";
import type { SavedSession } from "../types";

export function RecordsView({ onResumeSession }: { onResumeSession: () => void }) {
  const { state, dispatch } = useJudging();
  const [group, setGroup] = useState<string>("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [reopenSession, setReopenSession] = useState<SavedSession | null>(null);
  const stats = useMemo(
    () => computeRecords(state.history, group || null),
    [state.history, group],
  );

  const maxCatCount = Math.max(
    1,
    ...CATEGORIES.map((c) => stats.byCategory[c.id].count),
  );
  const maxLocCount = Math.max(1, ...stats.topLocations.map((l) => l.count));

  if (state.history.length === 0) {
    return (
      <div className="records">
        <div className="panel">
          <p className="empty">
            No saved sessions yet. Judge a reciter, then use <b>New reciter</b> —
            each completed session is saved here so repeated mistakes across
            islands and classes become visible.
          </p>
        </div>
      </div>
    );
  }

  const sessions = state.history.filter(
    (s) => !group || (s.participant.group?.trim() || "") === group,
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
        <label className="records-filter">
          <span>Island / class</span>
          <select value={group} onChange={(e) => setGroup(e.target.value)}>
            <option value="">All</option>
            {stats.groups.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        </label>
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
        <ul className="session-list">
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
                      {s.participant.group || "—"} ·{" "}
                      {new Date(s.savedAt).toLocaleDateString()} ·{" "}
                      {s.mistakes.length} mistakes
                    </span>
                  </span>
                  <span className="session-score">
                    {s.total}
                    <span className="session-max">/{s.totalMax}</span>
                  </span>
                  <span className="session-status">Finished</span>
                </div>
                {isOpen && (
                  <div className="session-drill">
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
        </ul>
      </section>
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

import { useEffect, useState } from "react";
import { CATEGORY_BY_ID } from "../config";
import { JUMP_EVENT } from "./Mushaf";
import { useJudging } from "../state/store";
import { Icon } from "./Icon";
import { JudgingHistory } from "./JudgingHistory";

export function MistakeLog() {
  const { state, dispatch } = useJudging();
  const [openId, setOpenId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [mode, setMode] = useState<"current" | "history">("current");
  const ordered = [...state.mistakes].sort((a, b) => b.ts - a.ts);
  const visible = expanded ? ordered : ordered.slice(0, 5);

  useEffect(() => {
    if (!expanded) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setExpanded(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [expanded]);

  const toggle = (id: string, tid: string, page?: number) => {
    const opening = openId !== id;
    setOpenId(opening ? id : null);
    if (opening) {
      window.dispatchEvent(new CustomEvent(JUMP_EVENT, { detail: { tid, page } }));
    }
  };

  const openCurrent = () => {
    setMode("current");
    setExpanded(true);
  };

  const openHistory = () => {
    setMode("history");
    setExpanded(true);
  };

  return (
    <>
      {expanded && (
        <button
          type="button"
          className="mistake-panel-backdrop"
          aria-label="Close mistake panel"
          onClick={() => setExpanded(false)}
        />
      )}
      <section
        className={`panel mistake-panel ${expanded ? "is-expanded" : ""}`}
        aria-label="Mistakes"
      >
        <div className="panel-head">
          <span className="t-label">
            Mistakes{ordered.length > 0 ? ` · ${ordered.length}` : ""}
          </span>
          <span className="log-head-actions">
            {ordered.length > 5 && !expanded && (
              <button type="button" className="log-view-all" onClick={openCurrent}>
                View all
              </button>
            )}
            {state.events.length > 0 && !expanded && (
              <button type="button" className="log-view-all" onClick={openHistory}>
                History
              </button>
            )}
            {expanded && (
              <button
                type="button"
                className="log-view-all"
                onClick={() => setExpanded(false)}
              >
                Close
              </button>
            )}
          </span>
        </div>

        {expanded && (
          <div className="log-tabs" role="tablist" aria-label="Mistake panel view">
            <button
              type="button"
              role="tab"
              aria-selected={mode === "current"}
              className={mode === "current" ? "is-active" : ""}
              onClick={() => setMode("current")}
            >
              Current <span>{ordered.length}</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === "history"}
              className={mode === "history" ? "is-active" : ""}
              onClick={() => setMode("history")}
            >
              History <span>{state.events.length}</span>
            </button>
          </div>
        )}

        {expanded && mode === "history" ? (
          <div className="history-scroll">
            <JudgingHistory
              events={state.events}
              onRestore={(eventId) =>
                dispatch({ type: "RESTORE_MISTAKE", eventId })
              }
            />
          </div>
        ) : ordered.length === 0 ? (
          <p className="empty">Press and hold a word, then choose its exact letter.</p>
        ) : (
          <ul className="log">
            {visible.map((mistake) => {
              const category = CATEGORY_BY_ID[mistake.category];
              const open = openId === mistake.id;
              const reference =
                mistake.ayah === null
                  ? `${mistake.surah}:Basmala`
                  : `${mistake.surah}:${mistake.ayah}`;
              return (
                <li
                  className={`log-row-wrap cat-${mistake.category} ${open ? "open" : ""}`}
                  key={mistake.id}
                >
                  <button
                    type="button"
                    className="log-row"
                    aria-expanded={open}
                    title={`${category.label} · ${reference}`}
                    onClick={() =>
                      toggle(mistake.id, mistake.tid, mistake.page)
                    }
                  >
                    <span className="log-dot" aria-hidden="true" />
                    <span className="log-glyph">{mistake.glyph}</span>
                    <span className="log-amt t-num">−{mistake.amount}</span>
                    <span className="log-row-spacer" aria-hidden="true" />
                    <span className="log-chevron" aria-hidden="true">
                      <Icon name="chevron" size={13} />
                    </span>
                  </button>
                  <div className="log-expand">
                    <div className="log-expand-inner">
                      <div className="log-detail-line">
                        <span className="log-kalimah">
                          <span className="log-kalimah-word" dir="rtl" lang="ar">
                            {mistake.wordText || mistake.glyph}
                          </span>
                          <span className="log-kalimah-ref t-num">{reference}</span>
                        </span>
                        <span
                          className="log-adjust"
                          role="group"
                          aria-label="Deduction amount"
                        >
                          <button
                            type="button"
                            className="step-btn"
                            aria-label="decrease deduction"
                            onClick={() =>
                              dispatch({
                                type: "SET_MISTAKE_AMOUNT",
                                id: mistake.id,
                                amount: mistake.amount - 0.5,
                              })
                            }
                          >
                            <Icon name="minus" size={10} />
                          </button>
                          <span className="step-val t-num">−{mistake.amount}</span>
                          <button
                            type="button"
                            className="step-btn"
                            aria-label="increase deduction"
                            onClick={() =>
                              dispatch({
                                type: "SET_MISTAKE_AMOUNT",
                                id: mistake.id,
                                amount: mistake.amount + 0.5,
                              })
                            }
                          >
                            <Icon name="plus" size={10} />
                          </button>
                        </span>
                        <button
                          type="button"
                          className="log-undo"
                          onClick={() => {
                            setOpenId(null);
                            dispatch({ type: "REMOVE_MISTAKE", id: mistake.id });
                          }}
                        >
                          Undo
                        </button>
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </>
  );
}

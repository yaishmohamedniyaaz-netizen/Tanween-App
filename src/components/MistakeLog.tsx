import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { CATEGORY_BY_ID } from "../config";
import {
  mistakeFullGlyph,
  mistakePrimaryGlyph,
} from "../lib/mistakeDisplay";
import { JUMP_EVENT } from "./Mushaf";
import { useJudging } from "../state/store";
import { Icon } from "./Icon";
import { JudgingHistory } from "./JudgingHistory";

interface MistakeLogProps {
  presentation?: "rail" | "compact" | "mobile-sheet";
  initialOpenId?: string | null;
  onRequestClose?: () => void;
}

export function MistakeLog({
  presentation = "rail",
  initialOpenId = null,
  onRequestClose,
}: MistakeLogProps = {}) {
  const { state, dispatch } = useJudging();
  const [openId, setOpenId] = useState<string | null>(null);
  const mobileSheet = presentation === "mobile-sheet";
  const [expanded, setExpanded] = useState(mobileSheet);
  const [mode, setMode] = useState<"current" | "history">("current");
  const panelRef = useRef<HTMLElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const viewAllButtonRef = useRef<HTMLButtonElement>(null);
  const rowRefs = useRef(new Map<string, HTMLLIElement>());
  const ordered = [...state.mistakes].sort((a, b) => b.ts - a.ts);
  const hasReviewHistory = state.events.some(
    (event) => event.type !== "session_started",
  );
  const canViewAll = ordered.length > 5 || hasReviewHistory;

  const closePanel = useCallback(() => {
    if (mobileSheet) onRequestClose?.();
    else setExpanded(false);
  }, [mobileSheet, onRequestClose]);

  useEffect(() => {
    if (!expanded) return;
    closeButtonRef.current?.focus();

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closePanel();
        return;
      }
      if (event.key !== "Tab") return;

      const focusable = [
        ...(panelRef.current?.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ) ?? []),
      ].filter((item) => item.getClientRects().length > 0);
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.requestAnimationFrame(() => viewAllButtonRef.current?.focus());
    };
  }, [closePanel, expanded]);

  useEffect(() => {
    if (!mobileSheet || !initialOpenId) return;
    const mistake = state.mistakes.find((item) => item.id === initialOpenId);
    if (!mistake) return;
    setMode("current");
    setOpenId(mistake.id);
    window.dispatchEvent(new CustomEvent(JUMP_EVENT, {
      detail: { tid: mistake.tid, page: mistake.page },
    }));
  }, [initialOpenId, mobileSheet, state.mistakes]);

  useEffect(() => {
    if (openId && !state.mistakes.some((mistake) => mistake.id === openId)) {
      setOpenId(null);
    }
  }, [openId, state.mistakes]);

  useLayoutEffect(() => {
    if (!openId) return;
    const frame = window.requestAnimationFrame(() => {
      rowRefs.current.get(openId)?.scrollIntoView({
        block: "nearest",
        inline: "nearest",
      });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [openId]);

  const toggle = (id: string, tid: string, page?: number) => {
    const opening = openId !== id;
    setOpenId(opening ? id : null);
    if (opening) {
      window.dispatchEvent(new CustomEvent(JUMP_EVENT, { detail: { tid, page } }));
    }
  };

  const openPanel = () => {
    setMode(ordered.length > 0 ? "current" : "history");
    setExpanded(true);
  };

  const openCompactMistake = (id: string, tid: string, page?: number) => {
    setOpenId(id);
    setMode("current");
    setExpanded(true);
    window.dispatchEvent(new CustomEvent(JUMP_EVENT, { detail: { tid, page } }));
  };

  return (
    <>
      {expanded && !mobileSheet && (
        <button
          type="button"
          className="mistake-panel-backdrop"
          aria-label="Close mistake panel"
          onClick={closePanel}
        />
      )}
      <section
        ref={panelRef}
        className={`panel mistake-panel ${presentation === "compact" ? "is-compact" : ""} ${expanded ? "is-expanded" : ""} ${mobileSheet ? "is-mobile-sheet" : ""}`}
        aria-label="Mistakes"
        aria-labelledby={expanded ? "mistake-panel-title" : undefined}
        aria-modal={expanded || undefined}
        role={expanded ? "dialog" : undefined}
      >
        <div className="panel-head">
          <span className="t-label" id="mistake-panel-title">
            Mistakes{ordered.length > 0 ? ` · ${ordered.length}` : ""}
          </span>
          <span className="log-head-actions">
            {(canViewAll || (presentation === "compact" && (ordered.length > 0 || hasReviewHistory))) && !expanded && (
              <button
                ref={viewAllButtonRef}
                type="button"
                className="log-view-all"
                onClick={openPanel}
              >
                {presentation === "compact" ? "All" : <span>View all</span>}
              </button>
            )}
            {expanded && !mobileSheet && (
              <button
                type="button"
                className="log-view-all"
                ref={closeButtonRef}
                onClick={closePanel}
              >
                Close
              </button>
            )}
            {mobileSheet && (
              <>
                <button
                  type="button"
                  className="log-view-all"
                  onClick={() => setMode((current) => current === "current" ? "history" : "current")}
                >
                  {mode === "current" ? "History" : "Current mistakes"}
                </button>
                <button
                  ref={closeButtonRef}
                  type="button"
                  className="mobile-sheet-close"
                  aria-label="Close mistakes"
                  onClick={closePanel}
                >
                  <span aria-hidden="true">×</span>
                </button>
              </>
            )}
          </span>
        </div>

        {expanded && !mobileSheet && (
          <div className="log-tabs" role="tablist" aria-label="Mistake panel view">
            <button
              type="button"
              id="mistake-current-tab"
              role="tab"
              aria-selected={mode === "current"}
              aria-controls="mistake-current-panel"
              className={mode === "current" ? "is-active" : ""}
              onClick={() => setMode("current")}
            >
              Current <span>{ordered.length}</span>
            </button>
            <button
              type="button"
              id="mistake-history-tab"
              role="tab"
              aria-selected={mode === "history"}
              aria-controls="mistake-history-panel"
              className={mode === "history" ? "is-active" : ""}
              onClick={() => setMode("history")}
            >
              History <span>{state.events.length}</span>
            </button>
          </div>
        )}

        {expanded && mode === "history" ? (
          <div
            className="history-scroll"
            id="mistake-history-panel"
            role="tabpanel"
            aria-labelledby={!mobileSheet ? "mistake-history-tab" : undefined}
          >
            <JudgingHistory
              events={state.events}
              onRestore={(eventId) =>
                dispatch({ type: "RESTORE_MISTAKE", eventId })
              }
            />
          </div>
        ) : ordered.length === 0 ? (
          <p
            className="empty"
            id={expanded ? "mistake-current-panel" : undefined}
            role={expanded ? "tabpanel" : undefined}
            aria-labelledby={expanded && !mobileSheet ? "mistake-current-tab" : undefined}
          >
            {expanded
              ? "No current mistakes."
              : presentation === "compact"
                ? "No mistakes yet."
                : "Press and hold a word, then choose its exact letter."}
          </p>
        ) : (
          <ul
            className="log"
            id={expanded ? "mistake-current-panel" : undefined}
            role={expanded ? "tabpanel" : undefined}
            aria-labelledby={expanded && !mobileSheet ? "mistake-current-tab" : undefined}
          >
            {ordered.map((mistake) => {
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
                  ref={(node) => {
                    if (node) rowRefs.current.set(mistake.id, node);
                    else rowRefs.current.delete(mistake.id);
                  }}
                >
                  <button
                    type="button"
                    className="log-row"
                    aria-expanded={open}
                    title={`${category.label} · ${reference}`}
                    onClick={() => {
                      if (presentation === "compact" && !expanded) {
                        openCompactMistake(mistake.id, mistake.tid, mistake.page);
                      } else {
                        toggle(mistake.id, mistake.tid, mistake.page);
                      }
                    }}
                  >
                    <span className="log-dot" aria-hidden="true" />
                    <span className="log-glyph">
                      {mistakePrimaryGlyph(mistake)}
                    </span>
                    <span className="log-amt t-num">−{mistake.amount}</span>
                    <span className="mobile-log-detail">
                      {category.label} · {reference}
                    </span>
                    <span className="log-row-spacer" aria-hidden="true" />
                    <span className="log-chevron" aria-hidden="true">
                      <Icon name="chevron" size={13} />
                    </span>
                  </button>
                  <div
                    className="log-expand"
                    onTransitionEnd={(event) => {
                      if (open && event.propertyName === "grid-template-rows") {
                        rowRefs.current.get(mistake.id)?.scrollIntoView({
                          block: "nearest",
                          inline: "nearest",
                        });
                      }
                    }}
                  >
                    <div className="log-expand-inner">
                      <div className="log-detail-line">
                        <span className="log-kalimah">
                          <span className="log-kalimah-word" dir="rtl" lang="ar">
                            {mistake.wordText || mistakeFullGlyph(mistake)}
                          </span>
                          <bdi className="log-kalimah-ref t-num">{reference}</bdi>
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

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { CATEGORY_BY_ID } from "../config";
import {
  mistakeFullGlyph,
  mistakePrimaryGlyph,
  mistakeLocationReference,
} from "../lib/mistakeDisplay";
import { isPhraseMistake } from "../lib/phraseEvidence";
import type { Mistake } from "../types";
import { JUMP_EVENT } from "./Mushaf";
import { useJudging } from "../state/store";
import { Icon } from "./Icon";
import { JudgingHistory } from "./JudgingHistory";
import { MistakeAmount } from "./MistakeAmount";
import { LETTER_TILE_STYLE, letterTileGlyphStyle } from "../lib/letterFit";

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
  const [sheetBlockSize, setSheetBlockSize] = useState<number | null>(null);
  const [railBlockSize, setRailBlockSize] = useState<number | null>(null);
  const scrollPositions = useRef({ current: 0, history: 0 });
  const railScrollPosition = useRef(0);
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

  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;
    const timers = new Map<HTMLElement, number>();
    const showScrollGrip = (event: Event) => {
      const list = event.target;
      if (!(list instanceof HTMLElement) || !list.matches(".log, .history-scroll")) return;
      window.clearTimeout(timers.get(list));
      list.classList.add("is-scrolling");
      timers.set(list, window.setTimeout(() => {
        list.classList.remove("is-scrolling");
        timers.delete(list);
      }, 900));
    };
    panel.addEventListener("scroll", showScrollGrip, true);
    return () => {
      panel.removeEventListener("scroll", showScrollGrip, true);
      timers.forEach((timer, list) => {
        window.clearTimeout(timer);
        list.classList.remove("is-scrolling");
      });
    };
  }, []);

  const lockSheetSize = useCallback(() => {
    if (!mobileSheet || !panelRef.current) return;
    const height = Math.max(320, panelRef.current.getBoundingClientRect().height);
    setSheetBlockSize(current => current ?? height);
  }, [mobileSheet]);

  useLayoutEffect(() => { lockSheetSize(); }, [lockSheetSize]);

  const switchMode = (next: "current" | "history") => {
    const list = panelRef.current?.querySelector<HTMLElement>(mode === "current" ? ".log" : ".history-scroll");
    scrollPositions.current[mode] = list?.scrollTop ?? 0;
    setMode(next);
  };

  useLayoutEffect(() => {
    const list = panelRef.current?.querySelector<HTMLElement>(!expanded || mode === "current" ? ".log" : ".history-scroll");
    if (list) list.scrollTop = expanded ? scrollPositions.current[mode] : railScrollPosition.current;
  }, [mode, expanded]);

  const closePanel = useCallback(() => {
    const list = panelRef.current?.querySelector<HTMLElement>(mode === "current" ? ".log" : ".history-scroll");
    scrollPositions.current[mode] = list?.scrollTop ?? 0;
    if (mobileSheet) onRequestClose?.();
    else { setExpanded(false); setRailBlockSize(null); }
  }, [mobileSheet, onRequestClose, mode]);

  useEffect(() => {
    if (!expanded) return;
    closeButtonRef.current?.focus({ preventScroll: true });
    return () => {
      window.requestAnimationFrame(() => viewAllButtonRef.current?.focus({ preventScroll: true }));
    };
  }, [expanded]);

  useEffect(() => {
    if (!expanded) return;
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
      ].filter((item) => !item.closest("[inert]") && item.getClientRects().length > 0);
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
    };
  }, [closePanel, expanded]);

  useEffect(() => {
    if (!mobileSheet || !initialOpenId) return;
    const mistake = state.mistakes.find((item) => item.id === initialOpenId);
    if (!mistake) return;
    setMode("current");
    setOpenId(mistake.id);
    if (!isPhraseMistake(mistake)) window.dispatchEvent(new CustomEvent(JUMP_EVENT, {
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
    const row = rowRefs.current.get(openId);
    const list = row?.parentElement;
    if (!row || !list) return;
    const reveal = () => {
      const bounds = row.getBoundingClientRect();
      const viewport = list.getBoundingClientRect();
      // An oversized row stays manually scrollable; do not chase its bottom.
      if (bounds.height > list.clientHeight) return;
      if (bounds.bottom > viewport.bottom) list.scrollTop += bounds.bottom - viewport.bottom;
      else if (bounds.top < viewport.top) list.scrollTop += bounds.top - viewport.top;
    };
    // Follow the disclosure animation, and scroll only this list, not the page.
    const observer = new ResizeObserver(reveal);
    observer.observe(row);
    observer.observe(list);
    const frame = window.requestAnimationFrame(reveal);
    return () => {
      observer.disconnect();
      window.cancelAnimationFrame(frame);
    };
  }, [openId, expanded]);

  const toggle = (mistake: Mistake) => {
    // Keep a bottom-anchored sheet from following the card's animated height.
    lockSheetSize();
    const { id, tid, page } = mistake;
    const opening = openId !== id;
    setOpenId(opening ? id : null);
    if (opening && !isPhraseMistake(mistake)) {
      window.dispatchEvent(new CustomEvent(JUMP_EVENT, { detail: { tid, page } }));
    }
  };

  const openPanel = () => {
    setRailBlockSize(panelRef.current?.getBoundingClientRect().height ?? null);
    railScrollPosition.current = panelRef.current?.querySelector<HTMLElement>(".log")?.scrollTop ?? 0;
    scrollPositions.current.current = railScrollPosition.current;
    setMode(ordered.length > 0 ? "current" : "history");
    setExpanded(true);
  };

  const openCompactMistake = (mistake: Mistake) => {
    setRailBlockSize(panelRef.current?.getBoundingClientRect().height ?? null);
    const { id, tid, page } = mistake;
    setOpenId(id);
    setMode("current");
    setExpanded(true);
    if (!isPhraseMistake(mistake)) window.dispatchEvent(new CustomEvent(JUMP_EVENT, { detail: { tid, page } }));
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
      {expanded && !mobileSheet && (
        <div className="mistake-panel-placeholder" aria-hidden="true" style={{ height: railBlockSize ?? undefined }} />
      )}
      <section
        ref={panelRef}
        style={mobileSheet && sheetBlockSize !== null ? { height: sheetBlockSize } : undefined}
        className={`panel mistake-panel ${presentation === "compact" ? "is-compact" : ""} ${expanded ? "is-expanded" : ""} ${mobileSheet ? "is-mobile-sheet" : ""}`}
        aria-label="Mistakes"
        data-letter-tile={LETTER_TILE_STYLE}
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
                  onClick={() => switchMode(mode === "current" ? "history" : "current")}
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
              onClick={() => switchMode("current")}
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
              onClick={() => switchMode("history")}
            >
              History <span>{state.events.length}</span>
            </button>
          </div>
        )}

        {expanded && mode === "history" ? (
          <div
            className="history-scroll"
            tabIndex={0}
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
            tabIndex={0}
            aria-label="Current mistakes"
            id={expanded ? "mistake-current-panel" : undefined}
            role={expanded ? "tabpanel" : undefined}
            aria-labelledby={expanded && !mobileSheet ? "mistake-current-tab" : undefined}
          >
            {ordered.map((mistake) => {
              const category = CATEGORY_BY_ID[mistake.category];
              const open = openId === mistake.id;
              const reference = mistakeLocationReference(mistake);
              return (
                <li
                  className={`log-row-wrap cat-${mistake.category} ${open ? "open" : ""}`}
                  key={mistake.id}
                  ref={(node) => {
                    if (node) rowRefs.current.set(mistake.id, node);
                    else rowRefs.current.delete(mistake.id);
                  }}
                >
                  <div className="log-head-row">
                    <button
                      type="button"
                      className="log-row"
                      aria-expanded={open}
                      aria-label={`${mistakePrimaryGlyph(mistake)}, ${category.label}, ${reference}, deduction ${mistake.amount}`}
                      title={`${category.label} · ${reference}`}
                      onClick={() => {
                        if (presentation === "compact" && !expanded) {
                          openCompactMistake(mistake);
                        } else {
                          toggle(mistake);
                        }
                      }}
                    >
                      <span className="log-tile" aria-hidden="true">
                        <span className="log-glyph" lang="ar" dir="rtl" style={letterTileGlyphStyle(mistakePrimaryGlyph(mistake))}>
                          {mistakePrimaryGlyph(mistake)}
                        </span>
                      </span>
                      <span className="log-kalimah-word" dir="rtl" lang="ar" aria-hidden={!open}>
                        {mistake.wordText || mistakeFullGlyph(mistake)}
                      </span>
                      <span className="log-summary" aria-hidden={open}>
                        <span className="log-amt t-num">−{mistake.amount}</span>
                        <span className="mobile-log-detail">
                          {category.label} · {reference}
                        </span>
                        <span className="log-kalimah-ref t-num"><span className="log-forced-category">{category.label} · </span><bdi>{reference}</bdi></span>
                      </span>
                      <span className="log-chevron" aria-hidden="true">
                        <Icon name="chevron" size={13} />
                      </span>
                    </button>
                  </div>
                  <div
                    className="log-expand"
                    ref={(node) => node?.toggleAttribute("inert", !open)}
                    aria-hidden={!open}
                  >
                    <div className="log-expand-inner">
                      <div className="log-detail-line">
                        <MistakeAmount
                          amount={mistake.amount}
                          onChange={(amount) => dispatch({ type: "SET_MISTAKE_AMOUNT", id: mistake.id, amount })}
                        />
                        <span className="log-detail-actions">
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
                        </span>
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

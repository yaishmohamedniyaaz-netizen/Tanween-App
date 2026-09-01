import { useEffect, useRef, useState } from "react";
import { CATEGORY_BY_ID } from "../config";
import {
  buildMobileCriterionChips,
  formatRecitationElapsed,
  latestMobileMistakeAction,
  sessionStartedAt,
} from "../lib/mobileJudgeDeck";
import { mistakeFullGlyph } from "../lib/mistakeDisplay";
import {
  computeScores,
  missingRequiredImpressionCategories,
} from "../lib/scoring";
import type {
  AduRaaguInputMode,
  LastMarkStrip,
} from "../lib/devicePreferences";
import { useJudging } from "../state/store";
import { Icon } from "./Icon";
import { JudgeRoleStrip } from "./JudgeRoleStrip";
import { MistakeLog } from "./MistakeLog";
import { NotesBox } from "./NotesBox";
import { ScorePanel } from "./ScorePanel";

type MobileSheet = "score" | "mistakes" | null;

const LAST_ACTION_VISIBLE_MS = 5_000;

export function MobileJudgeDeck({
  inputMode,
  lastMarkStrip,
  onFinish,
}: {
  inputMode: AduRaaguInputMode;
  lastMarkStrip: LastMarkStrip;
  onFinish: () => void;
}) {
  const { state, dispatch } = useJudging();
  const [sheet, setSheet] = useState<MobileSheet>(null);
  const [notesOpen, setNotesOpen] = useState(false);
  const [initialMistakeId, setInitialMistakeId] = useState<string | null>(null);
  const [dismissedActionKey, setDismissedActionKey] = useState<string | null>(null);
  const scoreSheetRef = useRef<HTMLElement>(null);
  const scoreHandleRef = useRef<HTMLButtonElement>(null);
  const scoreTriggerRef = useRef<HTMLButtonElement>(null);
  const mistakesTriggerRef = useRef<HTMLButtonElement>(null);
  const { byCategory, total, totalMax } = computeScores(state);
  const assignment = state.activeAssignment;
  const categories = assignment?.categories ?? [];
  const config = assignment?.config ?? state.config;
  const missingImpressions = missingRequiredImpressionCategories(
    config,
    state.impressions,
    categories,
  );
  const chips = buildMobileCriterionChips(
    categories,
    byCategory,
    missingImpressions,
  );
  const latestAction = latestMobileMistakeAction(state.events, state.mistakes);
  const actionKey = latestAction
    ? `${latestAction.mistake.id}:${latestAction.at}`
    : null;
  const showLastAction = Boolean(
    lastMarkStrip === "on" &&
      latestAction &&
      actionKey !== dismissedActionKey &&
      Date.now() - latestAction.at < LAST_ACTION_VISIBLE_MS,
  );
  const latestActionAnnouncement = showLastAction && latestAction
    ? [
        `Latest mistake: ${CATEGORY_BY_ID[latestAction.mistake.category].label}`,
        latestAction.mistake.wordText || mistakeFullGlyph(latestAction.mistake),
        `minus ${latestAction.mistake.amount}`,
      ].filter(Boolean).join(", ") + "."
    : "";
  const startedAt = sessionStartedAt(state.events);

  useEffect(() => {
    if (!showLastAction || !latestAction || !actionKey) return;
    const remaining = LAST_ACTION_VISIBLE_MS - (Date.now() - latestAction.at);
    const timer = window.setTimeout(
      () => setDismissedActionKey(actionKey),
      Math.max(0, remaining),
    );
    return () => window.clearTimeout(timer);
  }, [actionKey, latestAction, showLastAction]);

  useEffect(() => {
    if (sheet !== "score") return;
    const panel = scoreSheetRef.current;
    const frame = window.requestAnimationFrame(() => scoreHandleRef.current?.focus());
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setSheet(null);
        requestAnimationFrame(() => scoreTriggerRef.current?.focus());
        return;
      }
      if (event.key !== "Tab" || !panel) return;
      const focusable = [...panel.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      )].filter((element) => element.getClientRects().length > 0);
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) return;
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
      window.cancelAnimationFrame(frame);
      window.removeEventListener("keydown", onKey);
    };
  }, [sheet]);

  const closeSheet = () => {
    const previous = sheet;
    setSheet(null);
    requestAnimationFrame(() => {
      if (previous === "score") scoreTriggerRef.current?.focus();
      else mistakesTriggerRef.current?.focus();
    });
  };

  const openMistakes = (mistakeId: string | null = null) => {
    setInitialMistakeId(mistakeId);
    setSheet("mistakes");
  };

  return (
    <>
      <div className="mobile-judge-deck" aria-label="Mobile judging controls">
        <span
          className="mobile-judge-status"
          role="status"
          aria-atomic="true"
        >
          {latestActionAnnouncement}
        </span>
        <div className="mobile-judge-dock">
          {showLastAction && latestAction ? (
            <div
              className={`mobile-last-action cat-${latestAction.mistake.category}`}
            >
              <button
                type="button"
                className="mobile-last-action-main"
                onClick={() => openMistakes(latestAction.mistake.id)}
                aria-label={`Open ${CATEGORY_BY_ID[latestAction.mistake.category].label} mistake evidence`}
              >
                <span className="mobile-category-mark" aria-hidden="true" />
                <span className="mobile-last-glyph" dir="rtl" lang="ar">
                  {latestAction.mistake.wordText || mistakeFullGlyph(latestAction.mistake)}
                </span>
                <span className="mobile-last-detail">
                  {CATEGORY_BY_ID[latestAction.mistake.category].label}
                  {startedAt !== null && (
                    <span className="mobile-last-time t-num">
                      {` · ${formatRecitationElapsed(latestAction.at - startedAt)}`}
                    </span>
                  )}
                </span>
              </button>
              <span className="mobile-last-amount t-num">−{latestAction.mistake.amount}</span>
              <button
                type="button"
                className="mobile-last-undo"
                onClick={() => {
                  setDismissedActionKey(actionKey);
                  dispatch({ type: "REMOVE_MISTAKE", id: latestAction.mistake.id });
                }}
              >
                Undo
              </button>
              <span className="mobile-last-divider" aria-hidden="true" />
              <button
                type="button"
                className="mobile-last-dismiss"
                aria-label="Dismiss last mistake"
                onClick={() => setDismissedActionKey(actionKey)}
              >
                ×
              </button>
            </div>
          ) : (
            <div
              className="mobile-criterion-strip"
              style={{ gridTemplateColumns: `repeat(${Math.max(1, chips.length)}, minmax(0, 1fr))` }}
            >
              {chips.map((chip) => (
                <div
                  key={chip.category}
                  className={`mobile-criterion-chip cat-${chip.category}`}
                >
                  <span className="mobile-criterion-label">
                    <i aria-hidden="true" />
                    {chip.label}
                  </span>
                  <span className="mobile-criterion-value t-num">{chip.value}</span>
                </div>
              ))}
            </div>
          )}

          <div className="mobile-dock-actions">
            <button
              ref={scoreTriggerRef}
              type="button"
              className="mobile-score-action"
              aria-haspopup="dialog"
              onClick={() => {
                setNotesOpen(false);
                setSheet("score");
              }}
            >
              <span className="mobile-dock-score-label">Score</span>
              <strong className="t-num">{total}</strong>
              <span className="t-num">/{totalMax}</span>
            </button>
            <button
              ref={mistakesTriggerRef}
              type="button"
              className="mobile-mistakes-action"
              aria-haspopup="dialog"
              onClick={() => openMistakes()}
            >
              <span className="t-num">{state.mistakes.length}</span>
              <span>{state.mistakes.length === 1 ? "mistake" : "mistakes"}</span>
              <Icon name="chevron" size={13} />
            </button>
            <button type="button" className="mobile-finish-action" onClick={onFinish}>
              Finish
            </button>
          </div>
        </div>
      </div>

      {sheet && (
        <button
          type="button"
          className="mobile-judge-sheet-backdrop"
          aria-label="Close judging panel"
          onClick={closeSheet}
        />
      )}

      {sheet === "score" && (
        <section
          ref={scoreSheetRef}
          className="mobile-judge-sheet mobile-score-sheet"
          role="dialog"
          aria-modal="true"
          aria-label="Score"
        >
          <div className="mobile-score-sheet-context">
            <JudgeRoleStrip onChange={() => undefined} />
            <button
              ref={scoreHandleRef}
              type="button"
              className="mobile-sheet-close"
              aria-label="Close score"
              onClick={closeSheet}
            >
              <span aria-hidden="true">×</span>
            </button>
          </div>
          <ScorePanel inputMode={inputMode} presentation="compact" />
          {notesOpen && <NotesBox />}
          <div className="mobile-score-sheet-actions">
            <button
              type="button"
              className="btn-ghost"
              aria-expanded={notesOpen}
              onClick={() => setNotesOpen((open) => !open)}
            >
              <Icon name="marks" size={16} />
              Notes
            </button>
            <button type="button" className="btn-primary" onClick={onFinish}>
              Finish recitation
            </button>
          </div>
        </section>
      )}

      {sheet === "mistakes" && (
        <MistakeLog
          presentation="mobile-sheet"
          initialOpenId={initialMistakeId}
          onRequestClose={closeSheet}
        />
      )}
    </>
  );
}

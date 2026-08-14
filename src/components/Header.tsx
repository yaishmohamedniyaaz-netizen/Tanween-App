import { useEffect, useRef, useState } from "react";
import type { AppTheme } from "../lib/devicePreferences";
import { downloadSessionJSON } from "../lib/exportSession";
import { useJudging } from "../state/store";
import { Icon } from "./Icon";
import { ThemeToggle } from "./ThemeToggle";

export type AppView = "judge" | "records" | "setup" | "settings" | "questions";

interface Props {
  view: AppView;
  onToggleView: () => void;
  onOpenSetup: () => void;
  onOpenSettings: () => void;
  onChangeReciter: () => void;
  theme: AppTheme;
  onThemeChange: (theme: AppTheme) => void;
}

export function Header({
  view,
  onToggleView,
  onOpenSetup,
  onOpenSettings,
  onChangeReciter,
  theme,
  onThemeChange,
}: Props) {
  const { state } = useJudging();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const close = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("pointerdown", close);
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      window.removeEventListener("pointerdown", close);
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [menuOpen]);

  const prepared = state.preparedRecitation;
  const participant = prepared?.participant ?? state.participant;
  const visibleQuestion = prepared?.question ?? state.activeQuestion;
  const rosterTotal = state.roster.length;
  const rosterDone = state.roster.filter((entry) => entry.judged).length;
  const competitionTitle = state.competition.name || (
    state.competition.status === "live"
      ? "Live competition"
      : state.competition.status === "closed"
        ? "Closed competition"
        : "No competition running"
  );

  return (
    <header className="app-header">
      <div className="brand">
        <span className="brand-mark" aria-hidden="true">تَحْقِيق</span>
        <span className="brand-name">Tahqeeq</span>
      </div>

      {!state.sessionActive && !prepared && view !== "records" && (
        <button
          type="button"
          className={`competition-header-state is-${state.competition.status}`}
          onClick={onOpenSetup}
        >
          <span>
            <strong>{competitionTitle}</strong>
            <small>
              {state.competition.status === "live"
                ? state.competition.isSample ? "Test mode · Live" : "Live"
                : state.competition.status === "closed"
                  ? state.competition.isSample ? "Test mode · Closed" : "Closed"
                  : state.competition.name
                    ? state.competition.isSample ? "Test mode · Draft" : "Draft"
                    : "Browse the Mushaf"}
            </small>
          </span>
        </button>
      )}

      {view === "judge" && (state.sessionActive || prepared) && (
        <button
          type="button"
          className={`reciter-chip ${prepared ? "is-prepared" : ""}`}
          onClick={onChangeReciter}
          title={prepared ? "Change prepared reciter" : "Finish or change reciter"}
        >
          {participant.name || "Unnamed"}
          {prepared && <span className="reciter-prepared-state">Prepared</span>}
          {visibleQuestion && <span className="reciter-question-ref">Q · {visibleQuestion.label}</span>}
          {rosterTotal > 0 && <span className="chip-idx t-num">{rosterDone + 1}/{rosterTotal}</span>}
        </button>
      )}

      <button
        type="button"
        className={`view-toggle ${view === "records" ? "is-active" : ""}`}
        onClick={onToggleView}
      >
        {view === "judge" ? (
          <><Icon name="chart" size={15} /> Records {state.history.length > 0 && <span className="view-toggle-count">{state.history.length}</span>}</>
        ) : (
          <><Icon name="back" size={15} /> {view === "records" ? "Judging" : "Back to Mushaf"}</>
        )}
      </button>

      <ThemeToggle theme={theme} onChange={onThemeChange} />

      <div className="overflow-wrap" ref={menuRef}>
        <button type="button" className="btn-icon" aria-label="More actions" aria-expanded={menuOpen} onClick={() => setMenuOpen((open) => !open)}>
          <Icon name="dots" size={17} />
        </button>
        {menuOpen && (
          <div className="overflow-menu" role="menu">
            <button type="button" className="overflow-item" onClick={() => { setMenuOpen(false); onOpenSettings(); }}>
              <Icon name="settings" size={16} /> Settings
            </button>
            <button type="button" className="overflow-item" onClick={() => { setMenuOpen(false); onOpenSetup(); }}>
              <Icon name="check" size={16} /> Competition setup
            </button>
            {state.sessionActive && (
              <>
                <div className="overflow-sep" />
                <button type="button" className="overflow-item" onClick={() => { setMenuOpen(false); window.print(); }}>
                  <Icon name="print" size={16} /> Print current result
                </button>
                <button type="button" className="overflow-item" onClick={() => { setMenuOpen(false); downloadSessionJSON(state); }}>
                  <Icon name="download" size={16} /> Export current session
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </header>
  );
}

import { useEffect, useRef, useState } from "react";
import { useJudging } from "../state/store";
import { downloadRecordsCSV, downloadSessionJSON } from "../lib/exportSession";
import { useOfflineStatus } from "../hooks/useOfflineStatus";
import { Icon } from "./Icon";
import { ThemeToggle } from "./ThemeToggle";

interface Props {
  view: "judge" | "records";
  onToggleView: () => void;
  onOpenSetup: () => void;
  onChangeReciter: () => void;
}

export function Header({ view, onToggleView, onOpenSetup, onChangeReciter }: Props) {
  const { state } = useJudging();
  const sw = useOfflineStatus();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: PointerEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  const p = state.participant;
  const rosterTotal = state.roster.length;
  const rosterDone = state.roster.filter((r) => r.judged).length;

  return (
    <header className="app-header">
      <div className="brand">
        <span className="brand-mark" aria-hidden="true">
          تَحْقِيق
        </span>
        <span className="brand-name">Tahqeeq</span>
        {sw.precached && (
          <span
            className="offline-dot"
            title={`Offline ready · ${sw.precacheCount} assets cached`}
            aria-label="Offline ready"
          />
        )}
      </div>

      {view === "judge" && state.sessionActive && (
        <button
          type="button"
          className="reciter-chip"
          onClick={onChangeReciter}
          title="Change reciter"
        >
          <span className="chip-dot" aria-hidden="true" />
          {p.name || "Unnamed"}
          {rosterTotal > 0 && (
            <span className="chip-idx t-num">
              {rosterDone + 1}/{rosterTotal}
            </span>
          )}
        </button>
      )}

      <button
        type="button"
        className={`view-toggle ${view === "records" ? "is-active" : ""}`}
        onClick={onToggleView}
      >
        {view === "judge" ? (
          <>
            <Icon name="chart" size={15} />
            Records
            {state.history.length > 0 && (
              <span className="view-toggle-count">{state.history.length}</span>
            )}
          </>
        ) : (
          <>
            <Icon name="back" size={15} />
            Judging
          </>
        )}
      </button>

      <ThemeToggle />

      <div className="overflow-wrap" ref={menuRef}>
        <button
          type="button"
          className="btn-icon"
          aria-label="More actions"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((v) => !v)}
        >
          <Icon name="dots" size={17} />
        </button>
        {menuOpen && (
          <div className="overflow-menu" role="menu">
            <button
              type="button"
              className="overflow-item"
              onClick={() => {
                setMenuOpen(false);
                onOpenSetup();
              }}
            >
              <Icon name="settings" size={16} />
              Competition setup
            </button>
            <div className="overflow-sep" />
            <button
              type="button"
              className="overflow-item"
              onClick={() => {
                setMenuOpen(false);
                window.print();
              }}
            >
              <Icon name="print" size={16} />
              Print result sheet
            </button>
            <button
              type="button"
              className="overflow-item"
              onClick={() => {
                setMenuOpen(false);
                downloadSessionJSON(state);
              }}
            >
              <Icon name="download" size={16} />
              Export session (JSON)
            </button>
            <button
              type="button"
              className="overflow-item"
              onClick={() => {
                setMenuOpen(false);
                downloadRecordsCSV(state.history);
              }}
            >
              <Icon name="download" size={16} />
              Export records (CSV)
            </button>
          </div>
        )}
      </div>
    </header>
  );
}

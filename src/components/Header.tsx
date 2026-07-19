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
  pageZoom: number;
  onPageZoomPreview: (zoom: number) => void;
  onPageZoomCommit: (zoom: number) => void;
}

export function Header({
  view,
  onToggleView,
  onOpenSetup,
  onChangeReciter,
  pageZoom,
  onPageZoomPreview,
  onPageZoomCommit,
}: Props) {
  const { state } = useJudging();
  const sw = useOfflineStatus();
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuMode, setMenuMode] = useState<"main" | "zoom" | "confirm">(
    "main",
  );
  const [zoomDraft, setZoomDraft] = useState(pageZoom);
  const [zoomOriginal, setZoomOriginal] = useState(pageZoom);
  const menuRef = useRef<HTMLDivElement>(null);
  const zoomChanged = zoomDraft !== zoomOriginal;

  useEffect(() => {
    if (!menuOpen) return;
    const requestClose = () => {
      if (menuMode === "zoom" && zoomChanged) {
        setMenuMode("confirm");
        return;
      }
      if (menuMode === "confirm") return;
      setMenuOpen(false);
      setMenuMode("main");
    };
    const onDown = (e: PointerEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) requestClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") requestClose();
    };
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [menuOpen, menuMode, zoomChanged]);

  const openZoom = () => {
    setZoomOriginal(pageZoom);
    setZoomDraft(pageZoom);
    setMenuMode("zoom");
  };

  const previewZoom = (zoom: number) => {
    setZoomDraft(zoom);
    onPageZoomPreview(zoom);
  };

  const leaveZoom = () => {
    setMenuMode(zoomChanged ? "confirm" : "main");
  };

  const keepZoom = () => {
    onPageZoomCommit(zoomDraft);
    setZoomOriginal(zoomDraft);
    setMenuMode("main");
  };

  const revertZoom = () => {
    onPageZoomPreview(zoomOriginal);
    setZoomDraft(zoomOriginal);
    setMenuMode("main");
  };

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
          onClick={() => {
            if (!menuOpen) {
              setMenuMode("main");
              setMenuOpen(true);
            } else if (menuMode === "main") {
              setMenuOpen(false);
            } else if (menuMode === "zoom") {
              leaveZoom();
            }
          }}
        >
          <Icon name="dots" size={17} />
        </button>
        {menuOpen && (
          <div
            className={`overflow-menu ${menuMode !== "main" ? "overflow-menu-settings" : ""}`}
            role="menu"
          >
            {menuMode === "main" ? (
              <>
                <button
                  type="button"
                  className="overflow-item"
                  onClick={openZoom}
                >
                  <Icon name="settings" size={16} />
                  <span className="overflow-item-label">Page zoom</span>
                  <span className="overflow-item-value">{pageZoom}%</span>
                </button>
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
              </>
            ) : menuMode === "zoom" ? (
              <div className="overflow-zoom" role="group" aria-label="Page zoom">
                <div className="overflow-zoom-head">
                  <button
                    type="button"
                    className="overflow-back"
                    aria-label="Back"
                    onClick={leaveZoom}
                  >
                    <Icon name="back" size={15} />
                  </button>
                  <span>Page zoom</span>
                  <strong>{zoomDraft}%</strong>
                </div>
                <p>Changes preview live on the Mushaf page.</p>
                <input
                  className="zoom-range"
                  type="range"
                  min={70}
                  max={100}
                  step={5}
                  value={zoomDraft}
                  aria-label="Mushaf page zoom"
                  onChange={(e) => previewZoom(Number(e.target.value))}
                />
                <div className="zoom-scale" aria-hidden="true">
                  <span>70%</span>
                  <span>100%</span>
                </div>
                <div className="zoom-presets">
                  {[
                    [75, "Compact"],
                    [90, "Comfortable"],
                    [100, "Fit"],
                  ].map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      className={zoomDraft === value ? "is-active" : ""}
                      onClick={() => previewZoom(Number(value))}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="overflow-confirm" role="alert">
                <strong>Keep this page size?</strong>
                <p>The Mushaf is currently previewing {zoomDraft}%.</p>
                <div className="overflow-confirm-actions">
                  <button type="button" className="btn-ghost" onClick={revertZoom}>
                    Revert
                  </button>
                  <button type="button" className="btn-primary" onClick={keepZoom}>
                    Keep size
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}

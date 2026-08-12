import { useEffect, useRef, useState } from "react";
import { useJudging } from "../state/store";
import { downloadRecordsCSV, downloadSessionJSON } from "../lib/exportSession";
import { useOfflineStatus } from "../hooks/useOfflineStatus";
import { Icon } from "./Icon";
import { ThemeToggle } from "./ThemeToggle";
import {
  downloadStateBackup,
  readStateBackupFile,
} from "../lib/resultPackages";

interface Props {
  view: "judge" | "records" | "setup";
  onToggleView: () => void;
  onOpenSetup: () => void;
  onChangeReciter: () => void;
  pageZoom: number;
  pageLayout: "full" | "split";
  judgeRailSide: "left" | "right";
  onPageZoomPreview: (zoom: number) => void;
  onPageLayoutPreview: (layout: "full" | "split") => void;
  onPageZoomCommit: (zoom: number) => void;
  onPageLayoutCommit: (layout: "full" | "split") => void;
  onJudgeRailSideChange: (side: "left" | "right") => void;
}

export function Header({
  view,
  onToggleView,
  onOpenSetup,
  onChangeReciter,
  pageZoom,
  pageLayout,
  judgeRailSide,
  onPageZoomPreview,
  onPageLayoutPreview,
  onPageZoomCommit,
  onPageLayoutCommit,
  onJudgeRailSideChange,
}: Props) {
  const { state, dispatch } = useJudging();
  const sw = useOfflineStatus();
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuMode, setMenuMode] = useState<
    "main" | "zoom" | "panel" | "confirm"
  >("main");
  const [zoomDraft, setZoomDraft] = useState(pageZoom);
  const [zoomOriginal, setZoomOriginal] = useState(pageZoom);
  const [layoutDraft, setLayoutDraft] = useState(pageLayout);
  const [layoutOriginal, setLayoutOriginal] = useState(pageLayout);
  const menuRef = useRef<HTMLDivElement>(null);
  const restoreRef = useRef<HTMLInputElement>(null);
  const settingsChanged =
    zoomDraft !== zoomOriginal || layoutDraft !== layoutOriginal;

  useEffect(() => {
    if (!menuOpen) return;
    const requestClose = () => {
      if (menuMode === "zoom" && settingsChanged) {
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
  }, [menuOpen, menuMode, settingsChanged]);

  const openZoom = () => {
    setZoomOriginal(pageZoom);
    setZoomDraft(pageZoom);
    setLayoutOriginal(pageLayout);
    setLayoutDraft(pageLayout);
    setMenuMode("zoom");
  };

  const previewZoom = (zoom: number) => {
    setZoomDraft(zoom);
    onPageZoomPreview(zoom);
  };

  const leaveZoom = () => {
    setMenuMode(settingsChanged ? "confirm" : "main");
  };

  const keepZoom = () => {
    onPageZoomCommit(zoomDraft);
    onPageLayoutCommit(layoutDraft);
    setZoomOriginal(zoomDraft);
    setLayoutOriginal(layoutDraft);
    setMenuMode("main");
  };

  const revertZoom = () => {
    onPageZoomPreview(zoomOriginal);
    onPageLayoutPreview(layoutOriginal);
    setZoomDraft(zoomOriginal);
    setLayoutDraft(layoutOriginal);
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

      {!state.sessionActive && view !== "records" && (
        <button
          type="button"
          className={`competition-header-state is-${state.competition.status}`}
          onClick={onOpenSetup}
        >
          <span aria-hidden="true" />
          <span>
            <strong>
              {state.competition.status === "live"
                ? "Competition live"
                : state.competition.status === "closed"
                  ? "Competition closed"
                  : state.competition.name
                    ? "Draft competition"
                    : "No competition running"}
            </strong>
            {state.competition.name && <small>{state.competition.name}</small>}
          </span>
        </button>
      )}

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
            {view === "setup" ? "Back to Mushaf" : "Judging"}
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
            } else if (menuMode === "panel") {
              setMenuMode("main");
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
                  <span className="overflow-item-label">Page view</span>
                  <span className="overflow-item-value">
                    {pageZoom}% · {pageLayout === "split" ? "Split" : "Full"}
                  </span>
                </button>
                <button
                  type="button"
                  className="overflow-item"
                  onClick={() => setMenuMode("panel")}
                >
                  <Icon name="settings" size={16} />
                  <span className="overflow-item-label">Judge panel</span>
                  <span className="overflow-item-value">
                    {judgeRailSide === "left" ? "Left" : "Right"}
                  </span>
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
                  disabled={!state.sessionActive}
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
                  disabled={!state.sessionActive}
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
                <div className="overflow-sep" />
                <button
                  type="button"
                  className="overflow-item"
                  onClick={() => {
                    setMenuOpen(false);
                    downloadStateBackup(state);
                  }}
                >
                  <Icon name="download" size={16} />
                  Download full backup
                </button>
                <input
                  ref={restoreRef}
                  type="file"
                  accept=".json,application/json"
                  hidden
                  onChange={async (event) => {
                    const file = event.target.files?.[0];
                    event.target.value = "";
                    if (!file || state.sessionActive) return;
                    try {
                      const restored = await readStateBackupFile(file);
                      if (
                        window.confirm(
                          "Replace the current local data with this backup? A fresh backup of the current data will download first.",
                        )
                      ) {
                        downloadStateBackup(state);
                        dispatch({ type: "LOAD", state: restored });
                        setMenuOpen(false);
                      }
                    } catch (error) {
                      window.alert(
                        error instanceof Error
                          ? error.message
                          : "Could not restore that backup.",
                      );
                    }
                  }}
                />
                <button
                  type="button"
                  className="overflow-item"
                  disabled={
                    state.sessionActive || state.competition.status === "live"
                  }
                  title={
                    state.sessionActive || state.competition.status === "live"
                      ? "Close the active competition before restoring"
                      : undefined
                  }
                  onClick={() => restoreRef.current?.click()}
                >
                  <Icon name="settings" size={16} />
                  Restore full backup
                </button>
              </>
            ) : menuMode === "zoom" ? (
              <div className="overflow-zoom" role="group" aria-label="Page view">
                <div className="overflow-zoom-head">
                  <button
                    type="button"
                    className="overflow-back"
                    aria-label="Back"
                    onClick={leaveZoom}
                  >
                    <Icon name="back" size={15} />
                  </button>
                  <span>Page view</span>
                  <strong>{zoomDraft}%</strong>
                </div>
                <p>Layout and size preview live on the Mushaf page.</p>
                <span className="zoom-section-label">Layout</span>
                <div className="layout-presets">
                  <button
                    type="button"
                    className={layoutDraft === "full" ? "is-active" : ""}
                    onClick={() => {
                      setLayoutDraft("full");
                      onPageLayoutPreview("full");
                    }}
                  >
                    Full page
                  </button>
                  <button
                    type="button"
                    className={layoutDraft === "split" ? "is-active" : ""}
                    onClick={() => {
                      setLayoutDraft("split");
                      onPageLayoutPreview("split");
                    }}
                  >
                    Split halves
                  </button>
                </div>
                <span className="zoom-section-label">Size</span>
                <input
                  className="zoom-range"
                  type="range"
                  min={45}
                  max={100}
                  step={5}
                  value={zoomDraft}
                  aria-label="Mushaf page zoom"
                  onChange={(e) => previewZoom(Number(e.target.value))}
                />
                <div className="zoom-scale" aria-hidden="true">
                  <span>45%</span>
                  <span>100%</span>
                </div>
                <div className="zoom-presets">
                  {[
                    [50, "Overview"],
                    [75, "Comfortable"],
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
            ) : menuMode === "panel" ? (
              <div
                className="overflow-panel-position"
                role="group"
                aria-label="Judge panel position"
              >
                <div className="overflow-zoom-head">
                  <button
                    type="button"
                    className="overflow-back"
                    aria-label="Back"
                    onClick={() => setMenuMode("main")}
                  >
                    <Icon name="back" size={15} />
                  </button>
                  <span>Judge panel</span>
                  <strong>{judgeRailSide === "left" ? "Left" : "Right"}</strong>
                </div>
                <p>Choose which side holds the score, mistakes, notes and finish action.</p>
                <span className="zoom-section-label">Position</span>
                <div className="panel-side-presets">
                  <button
                    type="button"
                    className={judgeRailSide === "left" ? "is-active" : ""}
                    aria-pressed={judgeRailSide === "left"}
                    onClick={() => onJudgeRailSideChange("left")}
                  >
                    Left
                  </button>
                  <button
                    type="button"
                    className={judgeRailSide === "right" ? "is-active" : ""}
                    aria-pressed={judgeRailSide === "right"}
                    onClick={() => onJudgeRailSideChange("right")}
                  >
                    Right
                  </button>
                </div>
              </div>
            ) : (
              <div className="overflow-confirm" role="alert">
                <strong>Keep this page view?</strong>
                <p>
                  The Mushaf is previewing {zoomDraft}% in {layoutDraft} view.
                </p>
                <div className="overflow-confirm-actions">
                  <button type="button" className="btn-ghost" onClick={revertZoom}>
                    Revert
                  </button>
                  <button
                    type="button"
                    className="btn-ghost"
                    onClick={() => setMenuMode("zoom")}
                  >
                    Adjust
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

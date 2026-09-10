import { useEffect, useId, useRef, useState } from "react";
import type { AppView } from "./Header";
import { downloadSessionJSON } from "../lib/exportSession";
import { useJudging } from "../state/store";
import { Icon } from "./Icon";
import { MushafSizeControl } from "./MushafSizeControl";
import { useOfflineStatus } from "../hooks/useOfflineStatus";
import { usePwaInstall } from "../hooks/usePwaInstall";
import { reloadForServiceWorkerUpdate } from "../lib/sw-register";
import { useOfflineMushaf } from "../hooks/useOfflineMushaf";
import {
  pauseOfflineMushafDownload,
  removeOfflineMushafDownload,
  startOfflineMushafDownload,
  OFFLINE_MUSHAF_SIZE_LABEL,
} from "../lib/offlineMushaf";
import type {
  AduRaaguInputMode,
  JudgeRailSide,
  LastMarkStrip,
  MushafLayout,
  QuestionFocusMode,
} from "../lib/devicePreferences";
import type { TilawaTrackerStatus } from "./TilawaPrototypePanel";

interface MoreActionsPopoverProps {
  view: AppView;
  mushafZoom: number;
  mushafZoomConstrained?: boolean;
  onMushafZoomChange: (value: number) => void;
  mushafLayout: MushafLayout;
  onMushafLayoutChange: (value: MushafLayout) => void;
  judgeRailSide: JudgeRailSide;
  onJudgeRailSideChange: (value: JudgeRailSide) => void;
  questionFocusMode: QuestionFocusMode;
  onQuestionFocusModeChange: (value: QuestionFocusMode) => void;
  aduRaaguInputMode: AduRaaguInputMode;
  onAduRaaguInputModeChange: (value: AduRaaguInputMode) => void;
  slimScorePanel: boolean;
  onSlimScorePanelChange: (value: boolean) => void;
  selectorTashkeel: boolean;
  onSelectorTashkeelChange: (value: boolean) => void;
  lastMarkStrip: LastMarkStrip;
  onLastMarkStripChange: (value: LastMarkStrip) => void;
  onShowMarkingGuide: () => void;
  onOpenChange: (open: boolean) => void;
  tilawaTracking?: {
    status: TilawaTrackerStatus;
    onOpen: () => void;
  };
  onOpenSettings: () => void;
  onOpenSetup: () => void;
}

export function MoreActionsPopover({
  view,
  mushafZoom,
  mushafZoomConstrained,
  onMushafZoomChange,
  mushafLayout,
  onMushafLayoutChange,
  judgeRailSide,
  onJudgeRailSideChange,
  questionFocusMode,
  onQuestionFocusModeChange,
  aduRaaguInputMode,
  onAduRaaguInputModeChange,
  slimScorePanel,
  onSlimScorePanelChange,
  selectorTashkeel,
  onSelectorTashkeelChange,
  lastMarkStrip,
  onLastMarkStripChange,
  onShowMarkingGuide,
  onOpenChange,
  tilawaTracking,
  onOpenSettings,
  onOpenSetup,
}: MoreActionsPopoverProps) {
  const { state } = useJudging();
  const serviceWorker = useOfflineStatus();
  const offlineMushaf = useOfflineMushaf();
  const {
    installAvailable,
    installing,
    standalone,
    requestInstall,
  } = usePwaInstall();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const rangeRef = useRef<HTMLInputElement>(null);
  const openedByKeyboardRef = useRef(false);
  const dialogId = useId();

  useEffect(() => {
    onOpenChange(open);
  }, [onOpenChange, open]);

  const close = (restoreFocus = true) => {
    setOpen(false);
    if (restoreFocus) requestAnimationFrame(() => triggerRef.current?.focus());
  };

  useEffect(() => {
    if (!open) return;
    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (!wrapRef.current?.contains(event.target as Node)) close();
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      close();
    };
    window.addEventListener("pointerdown", closeOnOutsidePointer);
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      window.removeEventListener("pointerdown", closeOnOutsidePointer);
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  useEffect(() => {
    if (!open || !openedByKeyboardRef.current) return;
    const frame = requestAnimationFrame(() => {
      if (view === "judge") rangeRef.current?.focus();
      else wrapRef.current?.querySelector<HTMLButtonElement>(".overflow-item")?.focus();
    });
    return () => cancelAnimationFrame(frame);
  }, [open, view]);

  const runAction = (action: () => void) => {
    setOpen(false);
    requestAnimationFrame(action);
  };

  const installTahqeeq = () => {
    // prompt() must stay inside the click's user-activation task.
    void requestInstall().finally(() => {
      if (document.visibilityState === "visible") triggerRef.current?.focus();
    });
    setOpen(false);
  };

  const hasOfflineMushafAction =
    standalone && offlineMushaf.phase !== "unsupported";
  const hasPwaAction =
    (installAvailable && !standalone) ||
    hasOfflineMushafAction ||
    serviceWorker.updateReady;

  const offlineMushafLabel = offlineMushaf.phase === "downloading"
    ? "Pause Mushaf download"
    : offlineMushaf.phase === "paused"
      ? "Resume Mushaf download"
      : offlineMushaf.phase === "error"
        ? "Retry Mushaf download"
        : offlineMushaf.readyPages > 1
          ? "Resume Mushaf download"
          : "Download Mushaf offline";

  const tilawaStatusLabel = tilawaTracking?.status === "loading"
    ? "Preparing on this device"
    : tilawaTracking?.status === "ready"
      ? "Ready on this device"
      : tilawaTracking?.status === "listening"
        ? "Listening locally"
        : tilawaTracking?.status === "paused"
          ? "Tracking paused"
          : tilawaTracking?.status === "error"
            ? "Needs attention"
            : "Download on first use";

  return (
    <div className="overflow-wrap" ref={wrapRef}>
      <button
        ref={triggerRef}
        type="button"
        className="btn-icon"
        aria-label="More actions and view controls"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? dialogId : undefined}
        onClick={(event) => {
          openedByKeyboardRef.current = event.detail === 0;
          setOpen((current) => !current);
        }}
      >
        <Icon name="dots" size={17} />
      </button>
      {open && (
        <div
          id={dialogId}
          className="overflow-menu more-controls-popover"
          role="dialog"
          aria-modal="false"
          aria-label="More actions and view controls"
        >
          {view === "judge" && (
            <>
              <fieldset className="mushaf-view-control">
                <legend>Mushaf view</legend>
                <div className="mushaf-view-options" role="radiogroup" aria-label="Mushaf view">
                  <button
                    type="button"
                    role="radio"
                    aria-checked={mushafLayout === "full"}
                    className={mushafLayout === "full" ? "is-active" : ""}
                    onClick={() => onMushafLayoutChange("full")}
                  >
                    Full page
                  </button>
                  <button
                    type="button"
                    role="radio"
                    aria-checked={mushafLayout === "spread"}
                    className={mushafLayout === "spread" ? "is-active" : ""}
                    onClick={() => onMushafLayoutChange("spread")}
                  >
                    Two pages
                  </button>
                </div>
              </fieldset>
              <MushafSizeControl
                constrained={mushafZoomConstrained}
                value={mushafZoom}
                onChange={onMushafZoomChange}
                inputRef={rangeRef}
              />
              <fieldset className="judge-rail-control">
                <legend>Scorecard side</legend>
                <div className="mushaf-view-options" role="radiogroup" aria-label="Scorecard side">
                  <button
                    type="button"
                    role="radio"
                    aria-checked={judgeRailSide === "left"}
                    className={judgeRailSide === "left" ? "is-active" : ""}
                    onClick={() => onJudgeRailSideChange("left")}
                  >
                    Left
                  </button>
                  <button
                    type="button"
                    role="radio"
                    aria-checked={judgeRailSide === "right"}
                    className={judgeRailSide === "right" ? "is-active" : ""}
                    onClick={() => onJudgeRailSideChange("right")}
                  >
                    Right
                  </button>
                </div>
              </fieldset>
              <fieldset className="adu-input-control">
                <legend>Adu / Raagu input</legend>
                <div className="mushaf-view-options" role="radiogroup" aria-label="Adu / Raagu input style">
                  <button
                    type="button"
                    role="radio"
                    aria-checked={aduRaaguInputMode === "ruler"}
                    className={aduRaaguInputMode === "ruler" ? "is-active" : ""}
                    onClick={() => onAduRaaguInputModeChange("ruler")}
                  >
                    Horizontal
                  </button>
                  <button
                    type="button"
                    role="radio"
                    aria-checked={aduRaaguInputMode === "stepper"}
                    className={aduRaaguInputMode === "stepper" ? "is-active" : ""}
                    onClick={() => onAduRaaguInputModeChange("stepper")}
                  >
                    Step buttons
                  </button>
                </div>
                <small>
                  {aduRaaguInputMode === "stepper"
                    ? "Start from the maximum, then use minus or plus for half-mark adjustments."
                    : "Tap or drag the ruler; minor ticks are half marks."}
                </small>
              </fieldset>
              <fieldset className="selector-display-control">
                <legend>Score panel</legend>
                <div className="mushaf-view-options" role="radiogroup" aria-label="Score panel density">
                  {[false, true].map(value => <button key={String(value)} type="button" role="radio" aria-checked={slimScorePanel === value} className={slimScorePanel === value ? "is-active" : ""} onClick={() => onSlimScorePanelChange(value)}>{value ? "Slim" : "Standard"}</button>)}
                </div>
              </fieldset>
              <fieldset className="selector-display-control">
                <legend>Letter selector tashkeel</legend>
                <div className="mushaf-view-options" role="radiogroup" aria-label="Letter selector tashkeel">
                  {[false, true].map(value => (
                    <button key={String(value)} type="button" role="radio"
                      aria-checked={selectorTashkeel === value}
                      className={selectorTashkeel === value ? "is-active" : ""}
                      onClick={() => onSelectorTashkeelChange(value)}>
                      {value ? "On" : "Off"}
                    </button>
                  ))}
                </div>
                <small>Show vowel marks in the letter selector.</small>
              </fieldset>
              <fieldset className="mobile-deck-control">
                <legend>Mobile judge deck</legend>
                <span className="mobile-deck-control-label">Last mistake strip</span>
                <div className="mushaf-view-options" role="radiogroup" aria-label="Last mistake strip">
                  <button
                    type="button"
                    role="radio"
                    aria-checked={lastMarkStrip === "on"}
                    className={lastMarkStrip === "on" ? "is-active" : ""}
                    onClick={() => onLastMarkStripChange("on")}
                  >
                    On
                  </button>
                  <button
                    type="button"
                    role="radio"
                    aria-checked={lastMarkStrip === "off"}
                    className={lastMarkStrip === "off" ? "is-active" : ""}
                    onClick={() => onLastMarkStripChange("off")}
                  >
                    Off
                  </button>
                </div>
              </fieldset>
              <fieldset className="question-focus-control">
                <legend>Question focus</legend>
                <div className="mushaf-view-options focus-mode-options" role="radiogroup" aria-label="Question focus">
                  {(["off", "fade", "shade", "shade-fade"] as const).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      role="radio"
                      aria-checked={questionFocusMode === mode}
                      className={questionFocusMode === mode ? "is-active" : ""}
                      onClick={() => onQuestionFocusModeChange(mode)}
                    >
                      {mode === "off"
                        ? "Off"
                        : mode === "fade"
                          ? "Fade"
                          : mode === "shade"
                            ? "Shade"
                            : "Shade + fade"}
                    </button>
                  ))}
                </div>
              </fieldset>
              <div className="overflow-sep" />
            </>
          )}
          {view === "judge" && state.sessionActive && (
            <button
              type="button"
              className="overflow-item"
              onClick={() => runAction(onShowMarkingGuide)}
            >
              <Icon name="pointer" size={16} /> Show marking guide
            </button>
          )}
          {view === "judge" && tilawaTracking && (
            <button
              type="button"
              className="overflow-item tilawa-menu-action"
              onClick={() => runAction(tilawaTracking.onOpen)}
            >
              <Icon name="mic" size={16} />
              <span className="overflow-item-copy">
                <strong>Recitation tracking</strong>
                <small>Experimental · {tilawaStatusLabel}</small>
              </span>
            </button>
          )}
          <button
            type="button"
            className="overflow-item"
            onClick={() => runAction(onOpenSettings)}
          >
            <Icon name="settings" size={16} /> Settings
          </button>
          <button
            type="button"
            className="overflow-item"
            onClick={() => runAction(onOpenSetup)}
          >
            <Icon name="check" size={16} /> Competition setup
          </button>
          {state.sessionActive && (
            <>
              <div className="overflow-sep" />
              <button
                type="button"
                className="overflow-item"
                onClick={() => runAction(() => window.print())}
              >
                <Icon name="print" size={16} /> Print current result
              </button>
              <button
                type="button"
                className="overflow-item"
                onClick={() => runAction(() => downloadSessionJSON(state))}
              >
                <Icon name="download" size={16} /> Export current session
              </button>
            </>
          )}
          {hasPwaAction && <div className="overflow-sep" />}
          {installAvailable && !standalone && (
            <button
              type="button"
              className="overflow-item"
              disabled={installing}
              onClick={installTahqeeq}
            >
              <Icon name="install" size={16} />
              {installing ? "Opening installer…" : "Install Tahqeeq"}
            </button>
          )}
          {hasOfflineMushafAction && offlineMushaf.phase !== "complete" && (
            <button
              type="button"
              className="overflow-item offline-mushaf-action"
              disabled={
                offlineMushaf.phase === "checking" ||
                (state.sessionActive && offlineMushaf.phase !== "downloading")
              }
              onClick={() => {
                if (offlineMushaf.phase === "downloading") {
                  pauseOfflineMushafDownload();
                } else {
                  void startOfflineMushafDownload();
                }
              }}
            >
              <Icon name="download" size={16} />
              <span className="overflow-item-copy">
                <strong>{offlineMushafLabel}</strong>
                <small>
                  {state.sessionActive && offlineMushaf.phase !== "downloading"
                    ? "Available after this recitation."
                    : offlineMushaf.phase === "checking"
                      ? "Checking saved pages…"
                      : offlineMushaf.phase === "error"
                        ? offlineMushaf.error
                        : `${offlineMushaf.readyPages} of ${offlineMushaf.totalPages} pages · about ${OFFLINE_MUSHAF_SIZE_LABEL}`}
                </small>
                {offlineMushaf.phase === "downloading" && (
                  <span
                    className="offline-mushaf-progress"
                    aria-hidden="true"
                  >
                    <span
                      style={{
                        width: `${(offlineMushaf.readyPages / offlineMushaf.totalPages) * 100}%`,
                      }}
                    />
                  </span>
                )}
              </span>
            </button>
          )}
          {hasOfflineMushafAction && offlineMushaf.phase === "complete" && (
            <div className="offline-mushaf-complete" role="status">
              <Icon name="check" size={16} />
              <span>
                <strong>Mushaf ready offline</strong>
                <small>All 604 pages are saved.</small>
              </span>
              <button
                type="button"
                disabled={state.sessionActive}
                onClick={() => {
                  if (window.confirm("Remove the downloaded Mushaf from this device?")) {
                    void removeOfflineMushafDownload();
                  }
                }}
              >
                Remove
              </button>
            </div>
          )}
          {serviceWorker.waitingForClose && (
            <div className="overflow-system-status" role="status">
              <Icon name="refresh" size={16} />
              <span><strong>Update ready</strong><small>After judging, close all Tahqeeq windows and reopen.</small></span>
            </div>
          )}
          {!serviceWorker.waitingForClose && serviceWorker.updateReady && state.sessionActive && (
            <div className="overflow-system-status" role="status">
              <Icon name="refresh" size={16} />
              <span>
                <strong>Update ready</strong>
                <small>Available after this recitation.</small>
              </span>
            </div>
          )}
          {!serviceWorker.waitingForClose && serviceWorker.updateReady && !state.sessionActive && (
            <button
              type="button"
              className="overflow-item"
              onClick={() => runAction(reloadForServiceWorkerUpdate)}
            >
              <Icon name="refresh" size={16} /> Apply update
            </button>
          )}
        </div>
      )}
    </div>
  );
}

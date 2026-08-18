import { useEffect, useId, useRef, useState } from "react";
import type { AppView } from "./Header";
import { downloadSessionJSON } from "../lib/exportSession";
import { useJudging } from "../state/store";
import { Icon } from "./Icon";
import { MushafSizeControl } from "./MushafSizeControl";
import type { JudgeRailSide, MushafLayout } from "../lib/devicePreferences";

interface MoreActionsPopoverProps {
  view: AppView;
  mushafZoom: number;
  onMushafZoomChange: (value: number) => void;
  mushafLayout: MushafLayout;
  onMushafLayoutChange: (value: MushafLayout) => void;
  judgeRailSide: JudgeRailSide;
  onJudgeRailSideChange: (value: JudgeRailSide) => void;
  onShowMarkingGuide: () => void;
  onOpenChange: (open: boolean) => void;
  onOpenSettings: () => void;
  onOpenSetup: () => void;
}

export function MoreActionsPopover({
  view,
  mushafZoom,
  onMushafZoomChange,
  mushafLayout,
  onMushafLayoutChange,
  judgeRailSide,
  onJudgeRailSideChange,
  onShowMarkingGuide,
  onOpenChange,
  onOpenSettings,
  onOpenSetup,
}: MoreActionsPopoverProps) {
  const { state } = useJudging();
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
        </div>
      )}
    </div>
  );
}

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";

import type { AduRaaguInputMode } from "../lib/devicePreferences";
import {
  clampMark,
  MARK_INPUT_WHEEL_DELTA_THRESHOLD,
  markFromHorizontalPoint,
  stepperMark,
} from "../lib/markInput";
import { awardableMarks } from "../lib/scoring";

const BAR_MAX_WIDTH = 640;
const BAR_MIN_WIDTH = 280;
const BAR_MARGIN = 8;

const shouldLabelRulerMark = (mark: number, max: number) =>
  Number.isInteger(mark) && mark >= 0 && mark <= max;

interface Props {
  value: number;
  max: number;
  step: number;
  marked: boolean;
  label: string;
  category: string;
  mode: AduRaaguInputMode;
  onChange: (value: number) => void;
  autoFocus?: boolean;
  layer?: "workspace" | "dialog";
  invalid?: boolean;
  describedBy?: string;
  dismissOnOutsidePress?: boolean;
}

export interface MarkPickerHandle {
  focusAndOpen: () => void;
}

const displayMark = (value: number) =>
  Number.isInteger(value) ? String(value) : value.toFixed(1);

/** One scoring controller with two explicit input presentations.
 *
 * The horizontal ruler retains the published direct-manipulation behavior.
 * Step buttons use the configured maximum as a local, uncommitted starting
 * point. Only a deliberate button press reaches the judging ledger. */
export const MarkPicker = forwardRef<MarkPickerHandle, Props>(function MarkPicker({
  value,
  max,
  step,
  marked,
  label,
  category,
  mode,
  onChange,
  autoFocus = false,
  layer = "workspace",
  invalid = false,
  describedBy,
  dismissOnOutsidePress = true,
}: Props, forwardedRef) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const rulerRef = useRef<HTMLDivElement>(null);
  const rulerRailRef = useRef<HTMLSpanElement>(null);
  const rulerDragRef = useRef<{ moved: boolean; pointerId: number } | null>(null);
  const inputWheelDeltaRef = useRef(0);
  const openedAtRef = useRef(0);
  const previewRef = useRef<number | null>(null);
  const valueRef = useRef(value);
  const typedRef = useRef({ text: "", at: 0 });
  const [preview, setPreview] = useState<number | null>(null);
  const [open, setOpen] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [anchor, setAnchor] = useState({ top: 0, left: 0, width: BAR_MIN_WIDTH });

  const setPreviewValue = useCallback(
    (next: number) => {
      const clamped = clampMark(next, max, step);
      previewRef.current = clamped;
      setPreview(clamped);
      return clamped;
    },
    [max, step],
  );

  const clearPreview = useCallback(() => {
    previewRef.current = null;
    setPreview(null);
  }, []);

  const close = useCallback(() => {
    rulerDragRef.current = null;
    setOpen(false);
    setPinned(false);
    setDragging(false);
    inputWheelDeltaRef.current = 0;
    clearPreview();
  }, [clearPreview]);

  const commit = useCallback(
    (next: number) => {
      const clamped = clampMark(next, max, step);
      valueRef.current = clamped;
      clearPreview();
      if (!marked || clamped !== value) onChange(clamped);
      return clamped;
    },
    [clearPreview, marked, max, onChange, step, value],
  );

  const focusTrigger = useCallback(() => {
    buttonRef.current?.focus({ preventScroll: true });
  }, []);

  const openPinned = useCallback(() => {
    setOpen(true);
    setPinned(true);
    setDragging(false);
  }, []);

  useImperativeHandle(
    forwardedRef,
    () => ({ focusAndOpen: () => { focusTrigger(); openPinned(); } }),
    [focusTrigger, openPinned],
  );

  useLayoutEffect(() => {
    if (autoFocus) buttonRef.current?.focus();
  }, [autoFocus]);

  useEffect(() => { valueRef.current = value; }, [value]);
  useEffect(() => close(), [close, mode]);
  useEffect(() => { if (open) openedAtRef.current = Date.now(); }, [open]);

  const shown = preview ?? value;
  const display = displayMark(shown);
  const marks = useMemo(() => [...awardableMarks(max, step)].reverse(), [max, step]);
  const hasSelection = marked || preview !== null;
  const percent = max > 0 ? (shown / max) * 100 : 0;
  const fineStep = step > 0 ? step : 1;
  const coarseStep = fineStep * 2;
  const stepperShown = marked ? value : max;

  const positionBar = useCallback(() => {
    if (!open) return;
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return;
    const viewport = window.visualViewport;
    const viewportLeft = viewport?.offsetLeft ?? 0;
    const viewportTop = viewport?.offsetTop ?? 0;
    const viewportWidth = viewport?.width ?? window.innerWidth;
    const viewportHeight = viewport?.height ?? window.innerHeight;
    const dialog = buttonRef.current?.closest("dialog");
    const dialogRect = dialog?.getBoundingClientRect();
    const availableWidth = Math.min(viewportWidth, dialog?.clientWidth ?? viewportWidth);
    const width = Math.max(0, Math.min(mode === "stepper" ? 228 : BAR_MAX_WIDTH, availableWidth - BAR_MARGIN * 2));
    const leftEdge = Math.max(viewportLeft, dialogRect?.left ?? viewportLeft) + BAR_MARGIN;
    const rightEdge = Math.min(viewportLeft + viewportWidth, dialogRect?.right ?? viewportLeft + viewportWidth) - BAR_MARGIN;
    const left = Math.min(
      Math.max(leftEdge, mode === "stepper" ? rect.right - width : rect.left + rect.width / 2 - width / 2),
      rightEdge - width,
    );
    const barHeight = barRef.current?.offsetHeight ?? 72;
    const top = viewportTop + viewportHeight - rect.bottom - 10 < barHeight
      ? Math.max(viewportTop + 8, rect.top - 10 - barHeight)
      : rect.bottom + 10;
    setAnchor((previous) => previous.top === top && previous.left === left && previous.width === width
      ? previous : { top, left, width });
  }, [mode, open]);

  useLayoutEffect(() => {
    positionBar();
    if (!open) return;
    const observer = new ResizeObserver(positionBar);
    if (barRef.current) observer.observe(barRef.current);
    const dialog = buttonRef.current?.closest("dialog");
    if (dialog) observer.observe(dialog);
    dialog?.addEventListener("animationend", positionBar);
    // Review recovery can scroll its body after opening the picker.
    document.addEventListener("scroll", positionBar, true);
    window.visualViewport?.addEventListener("resize", positionBar);
    window.visualViewport?.addEventListener("scroll", positionBar);
    return () => {
      observer.disconnect();
      dialog?.removeEventListener("animationend", positionBar);
      document.removeEventListener("scroll", positionBar, true);
      window.visualViewport?.removeEventListener("resize", positionBar);
      window.visualViewport?.removeEventListener("scroll", positionBar);
    };
  }, [open, positionBar]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      close();
      focusTrigger();
    };
    const onDown = (event: PointerEvent) => {
      if (!dismissOnOutsidePress) return;
      if (
        !barRef.current?.contains(event.target as Node) &&
        !buttonRef.current?.contains(event.target as Node)
      ) close();
    };
    const onViewportChange = () => {
      if (Date.now() - openedAtRef.current >= 180) close();
    };
    window.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onDown);
    if (!dragging) {
      window.addEventListener("resize", onViewportChange);
      window.addEventListener("scroll", onViewportChange);
    }
    return () => {
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onDown);
      window.removeEventListener("resize", onViewportChange);
      window.removeEventListener("scroll", onViewportChange);
    };
  }, [close, dismissOnOutsidePress, dragging, focusTrigger, open]);

  useEffect(() => {
    if (!open || !pinned) return;
    const frame = requestAnimationFrame(() => {
      if (mode === "ruler") rulerRef.current?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(frame);
  }, [mode, open, pinned]);

  const adjustByInputWheel = useCallback(
    (deltaY: number, keepOpen: boolean) => {
      if (deltaY === 0) return false;
      if (inputWheelDeltaRef.current !== 0 && Math.sign(inputWheelDeltaRef.current) !== Math.sign(deltaY)) {
        inputWheelDeltaRef.current = 0;
      }
      inputWheelDeltaRef.current += deltaY;
      if (Math.abs(inputWheelDeltaRef.current) < MARK_INPUT_WHEEL_DELTA_THRESHOLD) return false;
      const direction = inputWheelDeltaRef.current < 0 ? 1 : -1;
      inputWheelDeltaRef.current = 0;
      const next = mode === "stepper"
        ? stepperMark(valueRef.current, marked, direction * fineStep, max, step)
        : valueRef.current + direction * fineStep;
      commit(next);
      if (keepOpen) { setOpen(true); setPinned(true); }
      return true;
    },
    [commit, fineStep, marked, max, mode, step],
  );

  useEffect(() => {
    const button = buttonRef.current;
    if (!button) return;
    const onWheel = (event: WheelEvent) => {
      if (open || document.activeElement !== button) return;
      event.preventDefault();
      focusTrigger();
      if (mode === "stepper") openPinned();
      adjustByInputWheel(event.deltaY, mode === "stepper");
    };
    button.addEventListener("wheel", onWheel, { passive: false });
    return () => button.removeEventListener("wheel", onWheel);
  }, [adjustByInputWheel, focusTrigger, mode, open, openPinned]);

  const markAt = useCallback(
    (clientX: number) => {
      const rect = rulerRailRef.current?.getBoundingClientRect();
      if (!rect || rect.width === 0) return value;
      return markFromHorizontalPoint(clientX, rect.left, rect.width, max, step);
    },
    [max, step, value],
  );
  const previewMarkAt = useCallback(
    (clientX: number) => setPreviewValue(markAt(clientX)),
    [markAt, setPreviewValue],
  );

  const startRulerGesture = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (open) { close(); return; }
    event.preventDefault();
    focusTrigger();
    rulerDragRef.current = { moved: false, pointerId: event.pointerId };
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragging(true);
    setOpen(true);
    setPinned(false);
  };

  useEffect(() => {
    if (mode !== "ruler" || !open || pinned) return;
    const onMove = (event: PointerEvent) => {
      const drag = rulerDragRef.current;
      if (!drag || drag.pointerId !== event.pointerId) return;
      const rect = rulerRef.current?.getBoundingClientRect();
      if (!rect) return;
      if (
        event.clientX < rect.left - 12 || event.clientX > rect.right + 12 ||
        event.clientY < rect.top - 32 || event.clientY > rect.bottom + 32
      ) return;
      previewMarkAt(event.clientX);
      drag.moved = true;
    };
    const onUp = (event: PointerEvent) => {
      const drag = rulerDragRef.current;
      if (!drag || drag.pointerId !== event.pointerId) return;
      rulerDragRef.current = null;
      setDragging(false);
      if (drag.moved && previewRef.current !== null) {
        commit(previewRef.current);
        setOpen(false);
      } else openPinned();
    };
    const onCancel = (event: PointerEvent) => {
      if (rulerDragRef.current?.pointerId !== event.pointerId) return;
      close();
      focusTrigger();
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onCancel);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onCancel);
    };
  }, [close, commit, focusTrigger, mode, open, openPinned, pinned, previewMarkAt]);

  const onTriggerKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    const baseline = mode === "stepper" && !marked ? max : value;
    const jump = event.shiftKey ? (mode === "stepper" ? coarseStep : step * 5) : fineStep;
    if (event.key === "ArrowUp" || event.key === "ArrowRight") commit(baseline + jump);
    else if (event.key === "ArrowDown" || event.key === "ArrowLeft") commit(baseline - jump);
    else if (event.key === "Home") commit(0);
    else if (event.key === "End") commit(max);
    else if (event.key === "Enter" || event.key === " ") openPinned();
    else if (/^[0-9]$/.test(event.key)) {
      const now = Date.now();
      const text = now - typedRef.current.at < 900 ? typedRef.current.text + event.key : event.key;
      typedRef.current = { text, at: now };
      commit(Number(text));
    } else return;
    event.preventDefault();
  };

  const onRulerKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const jump = event.shiftKey ? step * 5 : step;
    if (event.key === "ArrowUp" || event.key === "ArrowRight") commit(shown + jump);
    else if (event.key === "ArrowDown" || event.key === "ArrowLeft") commit(shown - jump);
    else if (event.key === "Home") commit(0);
    else if (event.key === "End") commit(max);
    else return;
    event.preventDefault();
  };

  const adjustStepper = (delta: number) => {
    commit(stepperMark(valueRef.current, marked, delta, max, step));
    setOpen(true);
    setPinned(true);
  };

  const ruler = (
    <div
      ref={rulerRef}
      className={`mark-ruler ${hasSelection ? "has-selection" : "is-neutral"} ${percent >= 100 ? "reaches-max" : ""} ${dragging ? "is-dragging" : ""}`}
      role="slider"
      tabIndex={0}
      aria-label={`${label} marks`}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={shown}
      aria-valuetext={`${display} of ${max} marks`}
      onWheel={(event) => { event.preventDefault(); event.stopPropagation(); adjustByInputWheel(event.deltaY, true); }}
      onPointerDown={(event) => {
        if (!pinned || event.button !== 0) return;
        event.preventDefault();
        previewMarkAt(event.clientX);
        rulerDragRef.current = { moved: true, pointerId: event.pointerId };
        setDragging(true);
        event.currentTarget.setPointerCapture(event.pointerId);
      }}
      onPointerMove={(event) => {
        if (!pinned || rulerDragRef.current?.pointerId !== event.pointerId) return;
        previewMarkAt(event.clientX);
      }}
      onPointerUp={(event) => {
        if (!pinned || rulerDragRef.current?.pointerId !== event.pointerId) return;
        rulerDragRef.current = null;
        setDragging(false);
        commit(previewRef.current ?? markAt(event.clientX));
        close();
        focusTrigger();
      }}
      onPointerCancel={(event) => {
        if (rulerDragRef.current?.pointerId !== event.pointerId) return;
        close();
        focusTrigger();
      }}
      onKeyDown={onRulerKeyDown}
    >
      <span ref={rulerRailRef} className="mark-ruler-rail" aria-hidden="true">
        <span className="mark-ruler-track" />
        {hasSelection && <span className="mark-ruler-fill" style={{ width: `${percent}%` }} />}
        {marks.map((mark) => (
          <span
            key={mark}
            className={`mark-ruler-tick ${Number.isInteger(mark) ? "is-whole" : "is-half"}`}
            style={{ left: `${max > 0 ? (mark / max) * 100 : 0}%` }}
          >
            {shouldLabelRulerMark(mark, max) && <i className="mark-ruler-label t-num">{mark}</i>}
          </span>
        ))}
        <span className={`mark-ruler-bubble ${hasSelection ? "is-active" : "is-neutral"}`} style={{ left: `${percent}%` }}>
          <i className="t-num">{display}</i>
        </span>
      </span>
    </div>
  );

  const bar = open && mode === "ruler" ? (
    <div
      ref={barRef}
      className={`mark-bar mark-bar-ruler cat-${category} ${pinned ? "is-pinned" : "is-transient"} ${layer === "dialog" ? "is-dialog-layer" : ""}`}
      style={anchor}
    >
      {ruler}
    </div>
  ) : null;

  const triggerDisplay = mode === "stepper" && !marked ? "—" : display;

  const trigger = (
    <button
        ref={buttonRef}
        type="button"
        className={`mark-picker mark-picker-${mode} score-value-layout ${marked ? "is-marked" : ""} ${open ? "is-open" : ""}`}
        role="spinbutton"
        tabIndex={mode === "ruler" && open && pinned ? -1 : undefined}
        aria-hidden={mode === "ruler" && open && pinned ? true : undefined}
        aria-label={`${label} marks`}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={marked ? shown : undefined}
        aria-valuetext={marked ? `${display} of ${max} marks` : `Not marked yet; maximum ${max}`}
        aria-expanded={open}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        title={`Set ${label} marks with ${mode === "stepper" ? "step buttons" : "the horizontal ruler"}`}
        onPointerDown={mode === "ruler" ? startRulerGesture : undefined}
        onClick={() => {
          if (mode === "stepper") { if (open) close(); else openPinned(); return; }
          const drag = rulerDragRef.current;
          if (!drag || drag.moved) return;
          rulerDragRef.current = null;
          setDragging(false);
          openPinned();
        }}
        onKeyDown={onTriggerKeyDown}
      >
        <span className="mark-picker-value score-value-number t-num">{triggerDisplay}</span>
        <span className="mark-picker-of sc-of t-num">/ {max}</span>
      </button>
  );

  const stepper = open && mode === "stepper" ? (
    <div ref={barRef} className={`mark-bar mark-stepper-tray cat-${category} ${layer === "dialog" ? "is-dialog-layer" : ""}`} style={anchor}
      role="group" aria-label={`${label} step buttons`}>
      <div className="mark-stepper-controls">
        <button
          type="button"
          className="mark-stepper-adjust is-minus"
          disabled={stepperShown <= 0}
          aria-label={`Subtract ${displayMark(fineStep)} marks`}
          onClick={() => adjustStepper(-fineStep)}
        >
          <span aria-hidden="true">−</span>
        </button>
        <output className="mark-stepper-readout t-num" aria-live="polite">
          {marked ? displayMark(value) : "—"}<span className="sc-of"> / {max}</span>
        </output>
        <button
          type="button"
          className="mark-stepper-adjust is-plus"
          disabled={marked && stepperShown >= max}
          aria-label={marked ? `Add ${displayMark(fineStep)} marks` : `Set full ${displayMark(max)} marks`}
          onClick={() => adjustStepper(fineStep)}
        >
          <span aria-hidden="true">+</span>
        </button>
      </div>
      <div className="mark-stepper-footer">
        <span>{displayMark(fineStep)} per step</span>
        <button type="button" onClick={() => { close(); focusTrigger(); }}>Done</button>
      </div>
    </div>
  ) : null;

  // Native modal descendants stay in the dialog's top layer and focus boundary.
  const portalTarget = buttonRef.current?.closest("dialog") ?? document.body;

  return (
    <>
      {trigger}
      {(bar || stepper) && createPortal(bar || stepper, portalTarget)}
    </>
  );
});

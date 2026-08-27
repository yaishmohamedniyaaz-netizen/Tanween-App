import {
  type CSSProperties,
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
  MARK_WHEEL_DELTA_THRESHOLD,
  MARK_WHEEL_HALF_ENTER,
  MARK_WHEEL_HALF_EXIT,
  MARK_WHEEL_HOLD_MS,
  MARK_WHEEL_MOVE_TOLERANCE,
  MARK_WHEEL_ROW_HEIGHT,
  markFromHorizontalPoint,
  markSupportsHalf,
  wheelMark,
  wheelMarkByWholeStep,
  wheelWholeFromDelta,
} from "../lib/markInput";
import { awardableMarks } from "../lib/scoring";

const BAR_MAX_WIDTH = 640;
const BAR_MIN_WIDTH = 280;
const BAR_MARGIN = 8;
const WHEEL_WIDTH = 78;
const WHEEL_HEIGHT = 190;
const WHEEL_FOCUS_CENTER = WHEEL_WIDTH / 2;

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
  presentation?: "floating" | "inline";
  inlineTarget?: HTMLElement | null;
  invalid?: boolean;
  describedBy?: string;
  dismissOnOutsidePress?: boolean;
}

export interface MarkPickerHandle {
  focusAndOpen: () => void;
}

type WheelGesture = {
  pointerId: number;
  phase: "pending" | "active" | "cancelled";
  startX: number;
  startY: number;
  lastX: number;
  lastY: number;
  startValue: number;
  startHalf: boolean;
  half: boolean;
  halfBranch: boolean;
  fractionInteracted: boolean;
  changed: boolean;
  side: "left" | "right";
};

const displayMark = (value: number) =>
  Number.isInteger(value) ? String(value) : value.toFixed(1);

/** One scoring controller with two input presentations.
 *
 * Preview state never reaches the judging ledger. A completed pointer gesture
 * commits once on pointerup; cancellation restores the original value. */
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
  presentation = "floating",
  inlineTarget = null,
  invalid = false,
  describedBy,
  dismissOnOutsidePress = true,
}: Props, forwardedRef) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const rulerRef = useRef<HTMLDivElement>(null);
  const rulerRailRef = useRef<HTMLSpanElement>(null);
  const wheelRef = useRef<HTMLDivElement>(null);
  const wheelFocusRef = useRef<HTMLDivElement>(null);
  const rulerDragRef = useRef<{ moved: boolean; pointerId: number } | null>(null);
  const wheelGestureRef = useRef<WheelGesture | null>(null);
  const wheelTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wheelDeltaRef = useRef(0);
  const openedAtRef = useRef(0);
  const previewRef = useRef<number | null>(null);
  const valueRef = useRef(value);
  const typedRef = useRef({ text: "", at: 0 });
  const [preview, setPreview] = useState<number | null>(null);
  const [open, setOpen] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [wheelTracking, setWheelTracking] = useState(false);
  const [wheelSide, setWheelSide] = useState<"left" | "right">("right");
  const [wheelHalfBranch, setWheelHalfBranch] = useState(false);
  const [wheelOffset, setWheelOffset] = useState(0);
  const [anchor, setAnchor] = useState({ top: 0, left: 0, width: BAR_MIN_WIDTH });

  const clearWheelTimer = useCallback(() => {
    if (wheelTimerRef.current !== null) clearTimeout(wheelTimerRef.current);
    wheelTimerRef.current = null;
  }, []);

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
    clearWheelTimer();
    rulerDragRef.current = null;
    wheelGestureRef.current = null;
    setWheelTracking(false);
    setOpen(false);
    setPinned(false);
    setDragging(false);
    setWheelHalfBranch(false);
    setWheelOffset(0);
    wheelDeltaRef.current = 0;
    clearPreview();
  }, [clearPreview, clearWheelTimer]);

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
    setWheelHalfBranch(false);
    setWheelOffset(0);
  }, []);

  useImperativeHandle(
    forwardedRef,
    () => ({
      focusAndOpen: () => {
        focusTrigger();
        openPinned();
      },
    }),
    [focusTrigger, openPinned],
  );

  useLayoutEffect(() => {
    if (autoFocus) buttonRef.current?.focus();
  }, [autoFocus]);

  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  useEffect(() => close(), [close, mode]);

  useEffect(() => {
    if (open) openedAtRef.current = Date.now();
  }, [open]);

  const shown = preview ?? value;
  const display = displayMark(shown);
  const marks = useMemo(() => [...awardableMarks(max, step)].reverse(), [max, step]);
  const hasSelection = marked || preview !== null;
  const percent = max > 0 ? (shown / max) * 100 : 0;
  const selectedWhole = Math.floor(shown);
  const selectedHalf = Math.abs(shown - selectedWhole - 0.5) < 0.001;
  const halfAvailable = markSupportsHalf(selectedWhole, max, step);
  const wheelRows = useMemo(
    () => Array.from({ length: Math.floor(max) + 1 }, (_, mark) => mark),
    [max],
  );

  useLayoutEffect(() => {
    if (!open || (presentation === "inline" && mode !== "wheel")) return;
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return;
    const viewport = window.visualViewport;
    const viewportLeft = viewport?.offsetLeft ?? 0;
    const viewportTop = viewport?.offsetTop ?? 0;
    const viewportWidth = viewport?.width ?? window.innerWidth;
    const viewportHeight = viewport?.height ?? window.innerHeight;
    if (mode === "wheel") {
      const width = Math.min(WHEEL_WIDTH, viewportWidth - BAR_MARGIN * 2);
      const desiredLeft = rect.left + rect.width / 2 - WHEEL_FOCUS_CENTER;
      const left = Math.min(
        Math.max(viewportLeft + BAR_MARGIN, desiredLeft),
        viewportLeft + viewportWidth - width - BAR_MARGIN,
      );
      const desiredTop = rect.top + rect.height / 2 - WHEEL_HEIGHT / 2;
      const top = Math.min(
        Math.max(viewportTop + 8, desiredTop),
        viewportTop + viewportHeight - WHEEL_HEIGHT - 8,
      );
      setAnchor({ top, left, width });
      return;
    }
    const maxWidth = BAR_MAX_WIDTH;
    const width = Math.max(
      BAR_MIN_WIDTH,
      Math.min(maxWidth, viewportWidth - BAR_MARGIN * 2),
    );
    const left = Math.min(
      Math.max(viewportLeft + BAR_MARGIN, rect.left + rect.width / 2 - width / 2),
      viewportLeft + viewportWidth - width - BAR_MARGIN,
    );
    const barHeight = barRef.current?.offsetHeight ?? 112;
    const below = viewportTop + viewportHeight - rect.bottom - 10;
    const top = below < barHeight
      ? Math.max(viewportTop + 8, rect.top - 10 - barHeight)
      : rect.bottom + 10;
    setAnchor({ top, left, width });
  }, [mode, open, presentation, preview]);

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
      ) {
        close();
      }
    };
    const onViewportChange = () => {
      if (Date.now() - openedAtRef.current < 180) return;
      close();
    };
    window.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onDown);
    if (presentation === "floating" && !dragging) {
      window.addEventListener("resize", onViewportChange);
      window.addEventListener("scroll", onViewportChange);
    }
    return () => {
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onDown);
      window.removeEventListener("resize", onViewportChange);
      window.removeEventListener("scroll", onViewportChange);
    };
  }, [close, dismissOnOutsidePress, dragging, focusTrigger, open, presentation]);

  useEffect(() => {
    if (!open || !pinned) return;
    const frame = requestAnimationFrame(() => {
      if (mode === "wheel") wheelFocusRef.current?.focus({ preventScroll: true });
      else rulerRef.current?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(frame);
  }, [mode, open, pinned]);

  const adjustByWheel = useCallback(
    (deltaY: number, inputMode: AduRaaguInputMode, keepOpen: boolean) => {
      if (deltaY === 0) return false;
      if (
        wheelDeltaRef.current !== 0 &&
        Math.sign(wheelDeltaRef.current) !== Math.sign(deltaY)
      ) {
        wheelDeltaRef.current = 0;
      }
      wheelDeltaRef.current += deltaY;
      if (Math.abs(wheelDeltaRef.current) < MARK_WHEEL_DELTA_THRESHOLD) return false;
      const direction = wheelDeltaRef.current < 0 ? 1 : -1;
      wheelDeltaRef.current = 0;
      const next = inputMode === "wheel"
        ? wheelMarkByWholeStep(valueRef.current, direction, max, step)
        : valueRef.current + direction * step;
      commit(next);
      if (keepOpen) {
        setOpen(true);
        setPinned(true);
        setWheelHalfBranch(false);
        setWheelOffset(0);
      }
      return true;
    },
    [commit, max, step],
  );

  useEffect(() => {
    const button = buttonRef.current;
    if (!button) return;
    const onWheel = (event: WheelEvent) => {
      if (open || document.activeElement !== button) return;
      event.preventDefault();
      focusTrigger();
      if (mode === "wheel") openPinned();
      adjustByWheel(event.deltaY, mode, mode === "wheel");
    };
    button.addEventListener("wheel", onWheel, { passive: false });
    return () => button.removeEventListener("wheel", onWheel);
  }, [adjustByWheel, focusTrigger, mode, open, openPinned]);

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
    if (open) {
      close();
      return;
    }
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
      const ruler = rulerRef.current;
      if (!ruler) return;
      const rect = ruler.getBoundingClientRect();
      const inside =
        event.clientX >= rect.left - 12 &&
        event.clientX <= rect.right + 12 &&
        event.clientY >= rect.top - 32 &&
        event.clientY <= rect.bottom + 32;
      if (!inside) return;
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
        return;
      }
      openPinned();
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

  const previewWheelGesture = useCallback(
    (gesture: WheelGesture, clientX: number, clientY: number) => {
      gesture.lastX = clientX;
      gesture.lastY = clientY;
      const deltaX = clientX - gesture.startX;
      const deltaY = clientY - gesture.startY;
      const whole = wheelWholeFromDelta(gesture.startValue, deltaY, max);
      const startingWhole = Math.floor(gesture.startValue);
      const travelledRows = whole - startingWhole;
      const offset = deltaY + travelledRows * MARK_WHEEL_ROW_HEIGHT;
      const offsetLimit = MARK_WHEEL_ROW_HEIGHT / 2;
      setWheelOffset(Math.max(-offsetLimit, Math.min(offsetLimit, offset)));
      const distanceX = Math.abs(deltaX);
      const halfBranch = gesture.halfBranch
        ? distanceX >= MARK_WHEEL_HALF_EXIT
        : distanceX >= MARK_WHEEL_HALF_ENTER;
      if (distanceX >= MARK_WHEEL_HALF_ENTER) gesture.fractionInteracted = true;
      gesture.halfBranch = halfBranch && markSupportsHalf(whole, max, step);
      gesture.half = gesture.halfBranch || (
        gesture.startHalf && !gesture.fractionInteracted
      );
      if (distanceX >= MARK_WHEEL_HALF_EXIT) {
        gesture.side = deltaX < 0 ? "left" : "right";
        setWheelSide(gesture.side);
      }
      setWheelHalfBranch(gesture.halfBranch);
      const next = wheelMark(whole, gesture.half, max, step);
      gesture.changed = Math.abs(next - gesture.startValue) > 0.001;
      setPreviewValue(next);
    },
    [max, setPreviewValue, step],
  );

  const activateWheelGesture = useCallback(
    (gesture: WheelGesture) => {
      if (gesture.phase !== "pending") return;
      gesture.phase = "active";
      setWheelSide(gesture.side);
      setWheelHalfBranch(false);
      setDragging(true);
      setPinned(false);
      setOpen(true);
      previewWheelGesture(gesture, gesture.lastX, gesture.lastY);
    },
    [previewWheelGesture],
  );

  const startWheelGesture = (event: React.PointerEvent<HTMLElement>) => {
    if (event.button !== 0) return;
    event.preventDefault();
    focusTrigger();
    clearWheelTimer();
    const startValue = previewRef.current ?? valueRef.current;
    const half = Math.abs(startValue - Math.floor(startValue) - 0.5) < 0.001;
    wheelGestureRef.current = {
      pointerId: event.pointerId,
      phase: open ? "active" : "pending",
      startX: event.clientX,
      startY: event.clientY,
      lastX: event.clientX,
      lastY: event.clientY,
      startValue,
      startHalf: half,
      half,
      halfBranch: false,
      fractionInteracted: false,
      changed: false,
      side: "right",
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    setWheelTracking(true);
    if (open) {
      setPinned(false);
      setDragging(true);
      setWheelHalfBranch(false);
      setPreviewValue(startValue);
      return;
    }
    wheelTimerRef.current = setTimeout(() => {
      const gesture = wheelGestureRef.current;
      if (gesture) activateWheelGesture(gesture);
    }, MARK_WHEEL_HOLD_MS);
  };

  useEffect(() => {
    if (mode !== "wheel" || !wheelTracking) return;
    const onMove = (event: PointerEvent) => {
      const gesture = wheelGestureRef.current;
      if (!gesture || gesture.pointerId !== event.pointerId) return;
      gesture.lastX = event.clientX;
      gesture.lastY = event.clientY;
      if (gesture.phase === "pending") {
        if (
          Math.hypot(
            event.clientX - gesture.startX,
            event.clientY - gesture.startY,
          ) > MARK_WHEEL_MOVE_TOLERANCE
        ) activateWheelGesture(gesture);
        return;
      }
      if (gesture.phase !== "active") return;
      previewWheelGesture(gesture, event.clientX, event.clientY);
    };
    const onUp = (event: PointerEvent) => {
      const gesture = wheelGestureRef.current;
      if (!gesture || gesture.pointerId !== event.pointerId) return;
      clearWheelTimer();
      wheelGestureRef.current = null;
      setWheelTracking(false);
      setDragging(false);
      if (gesture.phase === "pending") {
        clearPreview();
        openPinned();
      } else if (gesture.phase === "active") {
        if (gesture.changed) {
          commit(previewRef.current ?? gesture.startValue);
          setOpen(false);
          focusTrigger();
        } else {
          clearPreview();
          openPinned();
        }
      } else {
        close();
        focusTrigger();
      }
    };
    const onCancel = (event: PointerEvent) => {
      if (wheelGestureRef.current?.pointerId !== event.pointerId) return;
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
  }, [activateWheelGesture, clearPreview, clearWheelTimer, close, commit, focusTrigger, mode, openPinned, previewWheelGesture, wheelTracking]);

  useEffect(() => {
    if (!wheelTracking) return;
    const cancelInterruptedGesture = () => {
      if (document.visibilityState === "hidden") close();
    };
    window.addEventListener("pagehide", close);
    document.addEventListener("visibilitychange", cancelInterruptedGesture);
    return () => {
      window.removeEventListener("pagehide", close);
      document.removeEventListener("visibilitychange", cancelInterruptedGesture);
    };
  }, [close, wheelTracking]);

  const onTriggerKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    const jump = event.shiftKey ? step * 5 : step;
    if (event.key === "ArrowUp" || event.key === "ArrowRight") commit(value + jump);
    else if (event.key === "ArrowDown" || event.key === "ArrowLeft") commit(value - jump);
    else if (event.key === "Home") commit(0);
    else if (event.key === "End") commit(max);
    else if (event.key === "Enter" || event.key === " ") openPinned();
    else if (/^[0-9]$/.test(event.key)) {
      const now = Date.now();
      const text = now - typedRef.current.at < 900
        ? typedRef.current.text + event.key
        : event.key;
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

  const onWheelKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const jump = event.shiftKey ? step * 5 : step;
    if (event.key === "ArrowUp" || event.key === "ArrowRight") setPreviewValue(shown + jump);
    else if (event.key === "ArrowDown" || event.key === "ArrowLeft") setPreviewValue(shown - jump);
    else if (event.key === "Home") setPreviewValue(0);
    else if (event.key === "End") setPreviewValue(max);
    else if (event.key === "Enter") {
      commit(shown);
      close();
      focusTrigger();
    } else return;
    event.preventDefault();
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
      onWheel={(event) => {
        event.preventDefault();
        event.stopPropagation();
        adjustByWheel(event.deltaY, "ruler", true);
      }}
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
        <span
          className={`mark-ruler-bubble ${hasSelection ? "is-active" : "is-neutral"}`}
          style={{ left: `${percent}%` }}
        >
          <i className="t-num">{display}</i>
        </span>
      </span>
    </div>
  );

  const wheel = (
    <div
      ref={wheelRef}
      className={`mark-wheel ${pinned ? "is-pinned" : "is-transient"} ${dragging ? "is-dragging" : ""} ${hasSelection ? "has-selection" : "is-neutral"}`}
      role="group"
      aria-label={`${label} vertical mark picker`}
      onKeyDown={onWheelKeyDown}
      onPointerDown={(event) => {
        if ((event.target as HTMLElement).closest(".mark-wheel-row, .mark-wheel-half")) return;
        startWheelGesture(event);
      }}
      onWheel={(event) => {
        event.preventDefault();
        event.stopPropagation();
        adjustByWheel(event.deltaY, "wheel", true);
      }}
    >
      <div className="mark-wheel-scale" aria-label={`Preview ${display} of ${max} marks`}>
        <div className="mark-wheel-tray">
          <div
            className="mark-wheel-values"
            style={{
              "--wheel-position": `${-selectedWhole * MARK_WHEEL_ROW_HEIGHT}px`,
              "--wheel-offset": `${wheelOffset}px`,
            } as CSSProperties}
          >
            {wheelRows.map((mark) => (
            <button
              key={mark}
              type="button"
              tabIndex={-1}
              className={`mark-wheel-row t-num ${mark === selectedWhole ? "is-selected" : ""} ${Math.abs(mark - selectedWhole) === 1 ? "is-near" : ""}`}
              aria-label={`${mark} marks`}
              aria-pressed={mark === selectedWhole}
              onPointerDown={(event) => event.stopPropagation()}
              onClick={() => {
                commit(mark);
                close();
                focusTrigger();
              }}
            >
              {mark}
            </button>
            ))}
          </div>
        </div>
        <div
          ref={wheelFocusRef}
          className="mark-wheel-focus score-value-layout"
          role="spinbutton"
          tabIndex={pinned ? 0 : -1}
          aria-label={`${label} marks`}
          aria-valuemin={0}
          aria-valuemax={max}
          aria-valuenow={shown}
          aria-valuetext={`${display} of ${max} marks`}
        >
          <span className="mark-wheel-current-value score-value-number t-num">{display}</span>
          <span className="mark-wheel-current-of sc-of t-num">/ {max}</span>
        </div>
        <button
          type="button"
          className={`mark-wheel-half is-${wheelSide} ${selectedHalf ? "is-active" : ""} ${pinned || wheelHalfBranch ? "is-revealed" : ""}`}
          disabled={!halfAvailable}
          aria-pressed={selectedHalf}
          aria-label={selectedHalf ? `Remove half mark, use ${selectedWhole}` : `Add half mark, use ${displayMark(selectedWhole + 0.5)}`}
          onPointerDown={(event) => event.stopPropagation()}
          onClick={() => {
            commit(wheelMark(selectedWhole, !selectedHalf, max, step));
            close();
            focusTrigger();
          }}
        >
          +0.5
        </button>
      </div>
    </div>
  );

  const bar = open ? (
    <div
      ref={barRef}
      className={`mark-bar mark-bar-${mode} cat-${category} ${pinned ? "is-pinned" : "is-transient"} ${layer === "dialog" ? "is-dialog-layer" : ""} ${presentation === "inline" ? "is-inline" : ""}`}
      style={presentation === "floating" || mode === "wheel" ? anchor : undefined}
    >
      {mode === "wheel" ? wheel : ruler}
    </div>
  ) : null;

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        className={`mark-picker mark-picker-${mode} score-value-layout ${marked ? "is-marked" : ""} ${open ? "is-open" : ""}`}
        role="spinbutton"
        tabIndex={open && pinned ? -1 : undefined}
        aria-hidden={open && pinned ? true : undefined}
        aria-label={`${label} marks`}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={shown}
        aria-valuetext={`${display} of ${max} marks${marked ? "" : ", not marked yet"}`}
        aria-expanded={open}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        title={`Set ${label} marks with the ${mode === "wheel" ? "vertical wheel" : "horizontal ruler"}`}
        onPointerDown={mode === "wheel" ? startWheelGesture : startRulerGesture}
        onClick={() => {
          if (mode === "wheel") {
            const gesture = wheelGestureRef.current;
            if (!gesture || gesture.phase !== "pending") return;
            clearWheelTimer();
            wheelGestureRef.current = null;
            setWheelTracking(false);
            openPinned();
            return;
          }
          const drag = rulerDragRef.current;
          if (!drag || drag.moved) return;
          rulerDragRef.current = null;
          setDragging(false);
          openPinned();
        }}
        onKeyDown={onTriggerKeyDown}
      >
        <span className="mark-picker-value score-value-number t-num">{display}</span>
        <span className="mark-picker-of sc-of t-num">/ {max}</span>
      </button>
      {bar && (presentation === "inline" && mode !== "wheel"
        ? inlineTarget && createPortal(bar, inlineTarget)
        : createPortal(bar, document.body))}
    </>
  );
});

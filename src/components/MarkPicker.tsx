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

const round2 = (value: number) => Math.round(value * 100) / 100;

const BAR_MAX_WIDTH = 520;
const BAR_MIN_WIDTH = 260;
const BAR_MARGIN = 16;
const CHIP_SIZE = 38;
const CHIP_GAP = 6;
const CHIP_COLUMNS = 11;
const BAR_PADDING_X = 12;
const BAR_BORDER = 1;

interface Props {
  value: number;
  max: number;
  step: number;
  marked: boolean;
  label: string;
  /** The criterion this mark belongs to, so the bar can carry its colour.
   *  The bar is portalled to the body and so sits outside the score row;
   *  custom properties inherit down the DOM, not the React tree, and without
   *  this the bar would fall back to ink while its row reads as the criterion. */
  category: string;
  onChange: (value: number) => void;
  autoFocus?: boolean;
  layer?: "workspace" | "dialog";
  presentation?: "floating" | "inline";
  inlineTarget?: HTMLElement | null;
  invalid?: boolean;
  describedBy?: string;
}

export interface MarkPickerHandle {
  focusAndOpen: () => void;
}

/** The awarded marks for a whole-recitation criterion.
 *
 *  The row shows the mark in a box, because a box is what tells a judge a value
 *  can be changed. Pressing it drops a bar carrying every awardable mark: drag
 *  along it and release on the one you want, or let go without moving and pick
 *  from the bar that stays open. Nothing is written until the press ends, so a
 *  whole gesture leaves one entry in the history. */
export const MarkPicker = forwardRef<MarkPickerHandle, Props>(function MarkPicker({
  value,
  max,
  step,
  marked,
  label,
  category,
  onChange,
  autoFocus = false,
  layer = "workspace",
  presentation = "floating",
  inlineTarget = null,
  invalid = false,
  describedBy,
}: Props, forwardedRef) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const chipStripRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ moved: boolean; pointerId: number } | null>(null);
  const previewRef = useRef<number | null>(null);
  const typedRef = useRef({ text: "", at: 0 });
  const [preview, setPreview] = useState<number | null>(null);
  const [open, setOpen] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [anchor, setAnchor] = useState({ top: 0, left: 0, width: BAR_MIN_WIDTH });

  useImperativeHandle(
    forwardedRef,
    () => ({
      focusAndOpen: () => {
        buttonRef.current?.focus({ preventScroll: true });
        setOpen(true);
        setPinned(true);
      },
    }),
    [],
  );

  useLayoutEffect(() => {
    if (autoFocus) buttonRef.current?.focus();
  }, [autoFocus]);

  const shown = preview ?? value;
  const wholeMarks = Math.round(max);
  const wholeChips = useMemo(
    () => Array.from({ length: wholeMarks + 1 }, (_, mark) => mark),
    [wholeMarks],
  );
  const preferredWidth = useMemo(() => {
    const columns = Math.min(CHIP_COLUMNS, wholeChips.length);
    return Math.min(
      BAR_MAX_WIDTH,
      Math.max(
        BAR_MIN_WIDTH,
        columns * CHIP_SIZE +
          Math.max(0, columns - 1) * CHIP_GAP +
          BAR_PADDING_X * 2 +
          BAR_BORDER * 2,
      ),
    );
  }, [wholeChips.length]);

  const clamp = useCallback(
    (next: number) => round2(Math.min(max, Math.max(0, Math.round(next / step) * step))),
    [max, step],
  );

  const commit = useCallback(
    (next: number) => {
      previewRef.current = null;
      setPreview(null);
      onChange(clamp(next));
    },
    [clamp, onChange],
  );

  const close = useCallback(() => {
    setOpen(false);
    setPinned(false);
    previewRef.current = null;
    setPreview(null);
  }, []);

  useLayoutEffect(() => {
    if (!open || presentation === "inline") return;
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return;
    const width = Math.max(
      BAR_MIN_WIDTH,
      Math.min(preferredWidth, window.innerWidth - BAR_MARGIN * 2),
    );
    const left = Math.min(
      Math.max(BAR_MARGIN, rect.left + rect.width / 2 - width / 2),
      window.innerWidth - width - BAR_MARGIN,
    );
    const barHeight = barRef.current?.offsetHeight ?? 92;
    const below = window.innerHeight - rect.bottom - 10;
    const top = below < barHeight ? Math.max(8, rect.top - 10 - barHeight) : rect.bottom + 10;
    setAnchor({ top, left, width });
  }, [open, preferredWidth, presentation]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      close();
      buttonRef.current?.focus();
    };
    const onDown = (event: PointerEvent) => {
      if (
        !barRef.current?.contains(event.target as Node) &&
        !buttonRef.current?.contains(event.target as Node)
      ) {
        close();
      }
    };
    const onViewportChange = () => close();
    window.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onDown);
    if (presentation === "floating") {
      window.addEventListener("resize", onViewportChange);
      window.addEventListener("scroll", onViewportChange, true);
    }
    return () => {
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onDown);
      window.removeEventListener("resize", onViewportChange);
      window.removeEventListener("scroll", onViewportChange, true);
    };
  }, [close, open, presentation]);

  // The wheel adjusts marks only once this control has been focused on purpose.
  // Acting on hover alone is how people change official numbers by accident.
  useEffect(() => {
    const button = buttonRef.current;
    if (!button) return;
    const onWheel = (event: WheelEvent) => {
      if (document.activeElement !== button || open) return;
      event.preventDefault();
      commit(value + (event.deltaY < 0 ? step : -step));
    };
    button.addEventListener("wheel", onWheel, { passive: false });
    return () => button.removeEventListener("wheel", onWheel);
  }, [commit, open, step, value]);

  /** The chip value at a pointer position. Its left half is the half mark below it. */
  const previewChipAt = useCallback(
    (clientX: number, clientY: number) => {
      const element = document.elementFromPoint(clientX, clientY);
      const button = element?.closest<HTMLButtonElement>("[data-mark]");
      if (!button || !chipStripRef.current?.contains(button)) return false;
      const mark = Number(button.dataset.mark);
      const rect = button.getBoundingClientRect();
      const next = clientX - rect.left < rect.width / 2 ? Math.max(0, mark - 0.5) : mark;
      const clamped = clamp(next);
      previewRef.current = clamped;
      setPreview(clamped);
      return true;
    },
    [clamp],
  );

  const onPointerDown = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (event.button !== 0) return;
    if (open) {
      close();
      return;
    }
    event.preventDefault();
    buttonRef.current?.focus();
    dragRef.current = { moved: false, pointerId: event.pointerId };
    setOpen(true);
    setPinned(false);
  };

  // The press continues over the bar, so tracking lives on the window.
  useEffect(() => {
    if (!open || pinned) return;
    const onMove = (event: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag) return;
      if (!previewChipAt(event.clientX, event.clientY)) return;
      drag.moved = true;
    };
    const onUp = () => {
      const drag = dragRef.current;
      dragRef.current = null;
      if (drag?.moved && previewRef.current !== null) {
        commit(previewRef.current);
        setOpen(false);
        return;
      }
      // A press with no drag leaves the bar open to pick from.
      setPinned(true);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [commit, open, pinned, previewChipAt]);

  const onKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    const jump = event.shiftKey ? step * 5 : step;
    if (event.key === "ArrowUp" || event.key === "ArrowRight") commit(value + jump);
    else if (event.key === "ArrowDown" || event.key === "ArrowLeft") commit(value - jump);
    else if (event.key === "Home") commit(max);
    else if (event.key === "End") commit(0);
    else if (event.key === "Enter" || event.key === " ") {
      setOpen(true);
      setPinned(true);
    } else if (/^[0-9]$/.test(event.key)) {
      const now = Date.now();
      const text = now - typedRef.current.at < 900 ? typedRef.current.text + event.key : event.key;
      typedRef.current = { text, at: now };
      commit(Number(text));
    } else return;
    event.preventDefault();
  };

  const display = Number.isInteger(shown) ? String(shown) : shown.toFixed(1);
  const bar = open ? (
    <div
      ref={barRef}
      className={`mark-bar cat-${category} ${
        pinned ? "is-pinned" : ""
      } ${layer === "dialog" ? "is-dialog-layer" : ""} ${
        presentation === "inline" ? "is-inline" : ""
      }`}
      style={
        presentation === "floating"
          ? { top: anchor.top, left: anchor.left, width: anchor.width }
          : undefined
      }
    >
      <div
        ref={chipStripRef}
        className="chip-strip"
        role="radiogroup"
        aria-label={`${label} marks`}
        onPointerDown={(event) => {
          if (!pinned || event.button !== 0) return;
          event.preventDefault();
          if (!previewChipAt(event.clientX, event.clientY)) return;
          dragRef.current = { moved: true, pointerId: event.pointerId };
          (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
        }}
        onPointerMove={(event) => {
          if (!pinned || !dragRef.current) return;
          previewChipAt(event.clientX, event.clientY);
        }}
        onPointerUp={() => {
          if (!pinned) return;
          dragRef.current = null;
          commit(previewRef.current ?? value);
          close();
        }}
        onPointerCancel={() => {
          if (!pinned || !dragRef.current) return;
          dragRef.current = null;
          commit(previewRef.current ?? value);
          close();
        }}
      >
        {wholeChips.map((mark) => {
          const hasSelection = marked || preview !== null;
          const exact = hasSelection && Math.abs(mark - shown) < 0.001;
          const half = hasSelection && Math.abs(mark - 0.5 - shown) < 0.001;
          return (
            <button
              key={mark}
              type="button"
              role="radio"
              aria-checked={exact || half}
              aria-label={`${half ? mark - 0.5 : mark} marks`}
              data-mark={mark}
              className={half ? "is-half" : ""}
              onClick={(event) => {
                // Pointer selection is committed by the shared strip on release.
                // A synthetic click is keyboard activation and needs the same path.
                if (event.detail !== 0) return;
                commit(mark);
                close();
                buttonRef.current?.focus();
              }}
            >
              <span className="mark-chip-label t-num">{mark}</span>
            </button>
          );
        })}
      </div>
    </div>
  ) : null;

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        className={`mark-picker score-value-layout ${marked ? "is-marked" : ""} ${open ? "is-open" : ""}`}
        role="spinbutton"
        aria-label={`${label} marks`}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={shown}
        aria-valuetext={`${display} of ${max} marks${marked ? "" : ", not marked yet"}`}
        aria-expanded={open}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        title={`Set ${label} marks`}
        onPointerDown={onPointerDown}
        onKeyDown={onKeyDown}
      >
        <span className="mark-picker-value score-value-number t-num">{display}</span>
        <span className="mark-picker-of sc-of t-num">/ {max}</span>
      </button>
      {bar &&
        (presentation === "inline"
          ? inlineTarget && createPortal(bar, inlineTarget)
          : createPortal(bar, document.body))}
    </>
  );
});

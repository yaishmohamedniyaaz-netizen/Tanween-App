import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";

import { awardableMarks } from "../lib/scoring";

const round2 = (value: number) => Math.round(value * 100) / 100;

/** Vertical travel for one step. Holding Shift stretches it for fine control. */
const PIXELS_PER_STEP = 14;
const FINE_PIXELS_PER_STEP = 34;
const DRAG_THRESHOLD = 4;

interface Props {
  value: number;
  max: number;
  step: number;
  marked: boolean;
  label: string;
  onChange: (value: number) => void;
}

/** The awarded marks for a whole-recitation criterion.
 *
 *  Press and drag up or down to change the mark — the same press-drag-release
 *  gesture as marking a letter, so the value follows the hand. A press without
 *  a drag opens the full list of marks, because picking 7 out of 20 should not
 *  cost thirteen presses. Nothing is committed until the judge lets go. */
export function MarkPicker({ value, max, step, marked, label, onChange }: Props) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ y: number; from: number; moved: boolean } | null>(null);
  const typedRef = useRef({ text: "", at: 0 });
  const [preview, setPreview] = useState<number | null>(null);
  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState({ top: 0, left: 0, width: 0 });

  const options = useMemo(() => awardableMarks(max, step), [max, step]);
  const shown = preview ?? value;

  const clamp = useCallback(
    (next: number) => round2(Math.min(max, Math.max(0, Math.round(next / step) * step))),
    [max, step],
  );

  const commit = useCallback(
    (next: number) => {
      const clamped = clamp(next);
      setPreview(null);
      onChange(clamped);
    },
    [clamp, onChange],
  );

  useLayoutEffect(() => {
    if (!open) return;
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return;
    // A long list near the foot of the rail opens upward instead of off-screen.
    const listHeight = listRef.current?.offsetHeight ?? 0;
    const below = window.innerHeight - rect.bottom - 12;
    const top =
      listHeight > below && rect.top > below
        ? Math.max(8, rect.top - 6 - listHeight)
        : rect.bottom + 6;
    setAnchor({ top, left: rect.right, width: rect.width });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const selected = listRef.current?.querySelector<HTMLElement>('[aria-selected="true"]');
    (selected ?? listRef.current?.firstElementChild as HTMLElement | null)?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDown = (event: PointerEvent) => {
      if (
        !listRef.current?.contains(event.target as Node) &&
        !buttonRef.current?.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };
    const onScroll = () => setOpen(false);
    document.addEventListener("pointerdown", onDown);
    window.addEventListener("resize", onScroll);
    window.addEventListener("scroll", onScroll, true);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      window.removeEventListener("resize", onScroll);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [open]);

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

  const onPointerDown = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (event.button !== 0 || open) return;
    dragRef.current = { y: event.clientY, from: value, moved: false };
    buttonRef.current?.setPointerCapture(event.pointerId);
  };

  const onPointerMove = (event: React.PointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current;
    if (!drag) return;
    const distance = drag.y - event.clientY;
    if (!drag.moved && Math.abs(distance) < DRAG_THRESHOLD) return;
    drag.moved = true;
    const perStep = event.shiftKey ? FINE_PIXELS_PER_STEP : PIXELS_PER_STEP;
    setPreview(clamp(drag.from + (distance / perStep) * step));
  };

  const endDrag = (event: React.PointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current;
    dragRef.current = null;
    if (!drag) return;
    try {
      buttonRef.current?.releasePointerCapture(event.pointerId);
    } catch {
      // Pointer capture is optional on older mobile browsers.
    }
    if (drag.moved) {
      commit(preview ?? value);
      return;
    }
    setPreview(null);
    setOpen(true);
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    const jump = event.shiftKey ? step * 5 : step;
    if (event.key === "ArrowUp" || event.key === "ArrowRight") commit(value + jump);
    else if (event.key === "ArrowDown" || event.key === "ArrowLeft") commit(value - jump);
    else if (event.key === "Home") commit(max);
    else if (event.key === "End") commit(0);
    else if (event.key === "Enter" || event.key === " ") setOpen(true);
    else if (/^[0-9]$/.test(event.key)) {
      const now = Date.now();
      const text = now - typedRef.current.at < 900 ? typedRef.current.text + event.key : event.key;
      typedRef.current = { text, at: now };
      commit(Number(text));
    } else return;
    event.preventDefault();
  };

  const onListKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const items = Array.from(
      listRef.current?.querySelectorAll<HTMLElement>("[data-mark-option]") ?? [],
    );
    const index = items.findIndex((item) => item === document.activeElement);
    if (event.key === "Escape") {
      setOpen(false);
      buttonRef.current?.focus();
    } else if (event.key === "ArrowDown") {
      items[Math.min(index + 1, items.length - 1)]?.focus();
    } else if (event.key === "ArrowUp") {
      items[Math.max(index - 1, 0)]?.focus();
    } else if (event.key === "Home") {
      items[0]?.focus();
    } else if (event.key === "End") {
      items[items.length - 1]?.focus();
    } else if (event.key === "Tab") {
      setOpen(false);
      return;
    } else return;
    event.preventDefault();
  };

  const display = Number.isInteger(shown) ? String(shown) : shown.toFixed(1);

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        className={`mark-picker ${marked ? "is-marked" : ""} ${preview !== null ? "is-dragging" : ""}`}
        role="spinbutton"
        aria-label={`${label} marks`}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={shown}
        aria-valuetext={`${display} of ${max} marks${marked ? "" : ", not marked yet"}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        title="Drag up or down to change · click for the full list"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onKeyDown={onKeyDown}
      >
        <span className="mark-picker-value t-num">{display}</span>
        <span className="mark-picker-of t-num">/ {max}</span>
      </button>
      {open &&
        createPortal(
          <div
            ref={listRef}
            className="mark-menu"
            role="listbox"
            aria-label={`${label} marks`}
            style={{ top: anchor.top, left: anchor.left }}
            onKeyDown={onListKeyDown}
          >
            {options.map((option) => {
              const selected = marked && Math.abs(option - value) < 0.001;
              return (
                <button
                  key={option}
                  type="button"
                  data-mark-option={option}
                  role="option"
                  aria-selected={selected}
                  className={selected ? "is-selected" : ""}
                  tabIndex={-1}
                  onClick={() => {
                    commit(option);
                    setOpen(false);
                    buttonRef.current?.focus();
                  }}
                >
                  <span className="t-num">
                    {Number.isInteger(option) ? option : option.toFixed(1)}
                  </span>
                  {option === max && <small>full</small>}
                </button>
              );
            })}
          </div>,
          document.body,
        )}
    </>
  );
}

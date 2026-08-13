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

const BAR_MAX_WIDTH = 520;
const BAR_MIN_WIDTH = 260;
const BAR_MARGIN = 16;
/** Whole marks stop carrying their own label past this many. */
const DENSE_MARK_COUNT = 12;

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
 *  The row shows the mark in a box, because a box is what tells a judge a value
 *  can be changed. Pressing it drops a bar carrying every awardable mark: drag
 *  along it and release on the one you want, or let go without moving and pick
 *  from the bar that stays open. Nothing is written until the press ends, so a
 *  whole gesture leaves one entry in the history. */
export function MarkPicker({ value, max, step, marked, label, onChange }: Props) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ moved: boolean; pointerId: number } | null>(null);
  const typedRef = useRef({ text: "", at: 0 });
  const [preview, setPreview] = useState<number | null>(null);
  const [open, setOpen] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [anchor, setAnchor] = useState({ top: 0, left: 0, width: BAR_MIN_WIDTH });

  const marks = useMemo(() => awardableMarks(max, step), [max, step]);
  // awardableMarks counts down from full marks; the bar reads low to high.
  const ascending = useMemo(() => [...marks].reverse(), [marks]);
  const shown = preview ?? value;
  const wholeMarks = Math.round(max);
  const labelEvery = wholeMarks > DENSE_MARK_COUNT ? 5 : 1;

  const clamp = useCallback(
    (next: number) => round2(Math.min(max, Math.max(0, Math.round(next / step) * step))),
    [max, step],
  );

  const commit = useCallback(
    (next: number) => {
      setPreview(null);
      onChange(clamp(next));
    },
    [clamp, onChange],
  );

  const close = useCallback(() => {
    setOpen(false);
    setPinned(false);
    setPreview(null);
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return;
    const width = Math.max(
      BAR_MIN_WIDTH,
      Math.min(BAR_MAX_WIDTH, window.innerWidth - BAR_MARGIN * 2),
    );
    const left = Math.min(
      Math.max(BAR_MARGIN, rect.left + rect.width / 2 - width / 2),
      window.innerWidth - width - BAR_MARGIN,
    );
    const barHeight = barRef.current?.offsetHeight ?? 92;
    const below = window.innerHeight - rect.bottom - 10;
    const top = below < barHeight ? Math.max(8, rect.top - 10 - barHeight) : rect.bottom + 10;
    setAnchor({ top, left, width });
  }, [open]);

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
    const onScroll = () => close();
    window.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onDown);
    window.addEventListener("resize", onScroll);
    window.addEventListener("scroll", onScroll, true);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onDown);
      window.removeEventListener("resize", onScroll);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [close, open]);

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

  /** The mark under a pointer position on the bar. */
  const markAt = useCallback(
    (clientX: number) => {
      const rect = trackRef.current?.getBoundingClientRect();
      if (!rect || rect.width === 0) return value;
      const ratio = (clientX - rect.left) / rect.width;
      return clamp(Math.min(1, Math.max(0, ratio)) * max);
    },
    [clamp, max, value],
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
      const bar = barRef.current;
      if (!bar) return;
      const rect = bar.getBoundingClientRect();
      const inside =
        event.clientX >= rect.left &&
        event.clientX <= rect.right &&
        event.clientY >= rect.top - 24 &&
        event.clientY <= rect.bottom + 24;
      if (!inside) return;
      drag.moved = true;
      setPreview(markAt(event.clientX));
    };
    const onUp = () => {
      const drag = dragRef.current;
      dragRef.current = null;
      if (drag?.moved && preview !== null) {
        commit(preview);
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
  }, [commit, markAt, open, pinned, preview]);

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
  const percent = max > 0 ? (shown / max) * 100 : 0;

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        className={`mark-picker ${marked ? "is-marked" : ""} ${open ? "is-open" : ""}`}
        role="spinbutton"
        aria-label={`${label} marks`}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={shown}
        aria-valuetext={`${display} of ${max} marks${marked ? "" : ", not marked yet"}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        title="Press for the mark bar, or drag along it"
        onPointerDown={onPointerDown}
        onKeyDown={onKeyDown}
      >
        <span className="mark-picker-value t-num">{display}</span>
        <span className="mark-picker-of t-num">/ {max}</span>
      </button>
      {open &&
        createPortal(
          <div
            ref={barRef}
            className={`mark-bar ${pinned ? "is-pinned" : ""}`}
            style={{ top: anchor.top, left: anchor.left, width: anchor.width }}
            role="listbox"
            aria-label={`${label} marks`}
            aria-activedescendant={`mark-option-${String(shown).replace(".", "-")}`}
          >
            <div className="mark-bar-head">
              <span className="mark-bar-value t-num">{display}</span>
              <span className="mark-bar-of t-num">/ {max}</span>
              <span className="mark-bar-hint">
                {pinned ? "Choose a mark" : "Drag, then let go"}
              </span>
            </div>
            <div
              ref={trackRef}
              className="mark-bar-track"
              onPointerDown={(event) => {
                if (!pinned) return;
                event.preventDefault();
                setPreview(markAt(event.clientX));
                dragRef.current = { moved: true, pointerId: event.pointerId };
                (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
              }}
              onPointerMove={(event) => {
                if (!pinned || !dragRef.current) return;
                setPreview(markAt(event.clientX));
              }}
              onPointerUp={(event) => {
                if (!pinned) return;
                dragRef.current = null;
                commit(markAt(event.clientX));
                close();
              }}
            >
              <span className="mark-bar-fill" style={{ width: `${percent}%` }} />
              {ascending.map((mark) => {
                const whole = Number.isInteger(mark);
                const labelled = whole && Math.round(mark) % labelEvery === 0;
                const current = Math.abs(mark - shown) < 0.001;
                return (
                  <span
                    key={mark}
                    id={`mark-option-${String(mark).replace(".", "-")}`}
                    role="option"
                    aria-selected={current}
                    aria-label={`${mark} marks`}
                    className={`mark-tick ${whole ? "is-whole" : ""} ${labelled ? "is-labelled" : ""} ${current ? "is-current" : ""}`}
                    style={{ left: `${(mark / max) * 100}%` }}
                  >
                    {labelled && <i className="mark-tick-label t-num">{mark}</i>}
                  </span>
                );
              })}
              <span className="mark-bar-thumb" style={{ left: `${percent}%` }} />
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}

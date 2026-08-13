import {
  useCallback,
  useEffect,
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
  const chipStripRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ moved: boolean; pointerId: number } | null>(null);
  const typedRef = useRef({ text: "", at: 0 });
  const [preview, setPreview] = useState<number | null>(null);
  const [open, setOpen] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [anchor, setAnchor] = useState({ top: 0, left: 0, width: BAR_MIN_WIDTH });

  const shown = preview ?? value;
  const wholeMarks = Math.round(max);
  const wholeChips = useMemo(
    () => Array.from({ length: wholeMarks + 1 }, (_, mark) => mark),
    [wholeMarks],
  );

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

  /** The chip value at a pointer position. Its left half is the half mark below it. */
  const previewChipAt = useCallback(
    (clientX: number, clientY: number) => {
      const element = document.elementFromPoint(clientX, clientY);
      const button = element?.closest<HTMLButtonElement>("[data-mark]");
      if (!button || !chipStripRef.current?.contains(button)) return false;
      const mark = Number(button.dataset.mark);
      const rect = button.getBoundingClientRect();
      const next = clientX - rect.left < rect.width / 2 ? Math.max(0, mark - 0.5) : mark;
      setPreview(clamp(next));
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
  }, [commit, open, pinned, preview, previewChipAt]);

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
          >
            <div className="mark-bar-head">
              <span className="mark-bar-value t-num">{display}</span>
              <span className="mark-bar-of t-num">/ {max}</span>
              <span className="mark-bar-hint">
                {pinned ? "Click a mark · drag across for the halves between" : "Drag, then let go"}
              </span>
            </div>
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
                commit(preview ?? value);
                close();
              }}
              onPointerCancel={() => {
                if (!pinned || !dragRef.current) return;
                dragRef.current = null;
                commit(preview ?? value);
                close();
              }}
            >
              {wholeChips.map((mark) => {
                const exact = Math.abs(mark - shown) < 0.001;
                const half = Math.abs(mark - 0.5 - shown) < 0.001;
                const filled = !exact && !half && mark < shown;
                return (
                  <button
                    key={mark}
                    type="button"
                    role="radio"
                    aria-checked={exact || half}
                    aria-label={`${mark} marks`}
                    data-mark={mark}
                    className={`${half ? "is-half" : ""} ${filled ? "is-filled" : ""}`}
                  >
                    <span className="t-num">{mark}</span>
                  </button>
                );
              })}
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}

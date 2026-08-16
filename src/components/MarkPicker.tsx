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

const BAR_MAX_WIDTH = 560;
const BAR_MIN_WIDTH = 280;
const BAR_MARGIN = 16;
/** Above this many marks a single row of cells stops being clickable, so the
 *  cells wrap to two rows instead of getting narrower. At twenty marks a single
 *  row gives about 23px a cell; two rows give about 40px. */
const WRAP_ABOVE = 15;
/** A press that lingers this long is a drag, even if the pointer never moved. */
const HOLD_MS = 220;
const MOVE_SLOP = 6;

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
}

/** The awarded marks for a whole-recitation criterion.
 *
 *  The row shows the mark in a box, because a box is what tells a judge a value
 *  can be changed. Pressing it drops a bar of every whole mark: press one to
 *  award it, or hold and drag across them to land on the finer values the rule
 *  set allows — with a half-mark step that is 7.5, and with a whole step the
 *  drag simply runs along the whole marks. Nothing is written until the press
 *  ends, so a whole gesture leaves one entry in the history. */
export function MarkPicker({
  value,
  max,
  step,
  marked,
  label,
  category,
  onChange,
}: Props) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const cellsRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    moved: boolean;
    fine: boolean;
    from: { x: number; y: number };
  } | null>(null);
  const holdRef = useRef<number | null>(null);
  const typedRef = useRef({ text: "", at: 0 });
  const [preview, setPreview] = useState<number | null>(null);
  const [fine, setFine] = useState(false);
  const [open, setOpen] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [anchor, setAnchor] = useState({ top: 0, left: 0, width: BAR_MIN_WIDTH });

  const wholeMarks = Math.max(0, Math.round(max));
  const cells = useMemo(
    () => Array.from({ length: wholeMarks + 1 }, (_, index) => index),
    [wholeMarks],
  );
  const wraps = wholeMarks > WRAP_ABOVE;
  const columns = wraps ? Math.ceil(cells.length / 2) : cells.length;
  const shown = preview ?? value;

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
    setFine(false);
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
    const barHeight = barRef.current?.offsetHeight ?? 108;
    const below = window.innerHeight - rect.bottom - 10;
    const top = below < barHeight ? Math.max(8, rect.top - 10 - barHeight) : rect.bottom + 10;
    setAnchor({ top, left, width });
  }, [open, wraps]);

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

  useEffect(() => () => {
    if (holdRef.current !== null) window.clearTimeout(holdRef.current);
  }, []);

  /** The mark under a pointer position. Cells are the unit: the cell says which
   *  whole mark, and how far across it the pointer sits says which of that
   *  mark's sub-steps — so a half-mark rule set gives halves and a whole-mark
   *  one cannot give anything the rule set does not allow. */
  const markAt = useCallback(
    (clientX: number, clientY: number): number | null => {
      const host = cellsRef.current;
      if (!host) return null;
      const target = document.elementFromPoint(clientX, clientY);
      const cell = target instanceof Element ? target.closest("[data-mark]") : null;
      if (!cell || !host.contains(cell)) return null;
      const base = Number(cell.getAttribute("data-mark"));
      if (!Number.isFinite(base)) return null;
      if (step >= 1) return clamp(base);
      const rect = cell.getBoundingClientRect();
      const across = rect.width > 0 ? (clientX - rect.left) / rect.width : 0;
      const sub = Math.min(1 - step, Math.floor(across / step) * step);
      return clamp(base + Math.max(0, sub));
    },
    [clamp, step],
  );

  const onPointerDown = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (event.button !== 0) return;
    if (open) {
      close();
      return;
    }
    event.preventDefault();
    buttonRef.current?.focus();
    dragRef.current = { moved: false, fine: false, from: { x: event.clientX, y: event.clientY } };
    setOpen(true);
    setPinned(false);
  };

  // The press continues over the bar, so tracking lives on the window.
  useEffect(() => {
    if (!open || pinned) return;
    const onMove = (event: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag) return;
      const next = markAt(event.clientX, event.clientY);
      if (next === null) return;
      drag.moved = true;
      setPreview(next);
    };
    const onUp = () => {
      const drag = dragRef.current;
      dragRef.current = null;
      if (holdRef.current !== null) {
        window.clearTimeout(holdRef.current);
        holdRef.current = null;
      }
      setFine(false);
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

  /** Pressing a cell inside a pinned bar starts its own gesture: press to take
   *  the whole mark, hold or drag to reach the sub-steps within it. */
  const onCellDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    event.preventDefault();
    const at = markAt(event.clientX, event.clientY);
    if (at === null) return;
    setPreview(step >= 1 ? at : Math.floor(at));
    dragRef.current = { moved: true, fine: false, from: { x: event.clientX, y: event.clientY } };
    if (step < 1) {
      holdRef.current = window.setTimeout(() => setFine(true), HOLD_MS);
    }
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
  };

  const onCellMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!pinned || !drag) return;
    if (
      !drag.fine &&
      Math.hypot(event.clientX - drag.from.x, event.clientY - drag.from.y) > MOVE_SLOP
    ) {
      drag.fine = true;
      setFine(true);
    }
    const next = markAt(event.clientX, event.clientY);
    if (next === null) return;
    setPreview(drag.fine || fine ? next : Math.floor(next));
  };

  const onCellUp = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!pinned) return;
    if (holdRef.current !== null) {
      window.clearTimeout(holdRef.current);
      holdRef.current = null;
    }
    dragRef.current = null;
    const next = markAt(event.clientX, event.clientY);
    setFine(false);
    commit(next === null ? shown : next);
    close();
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    const jump = event.shiftKey ? step : Math.max(step, 1);
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
  const filledTo = Math.floor(shown);
  const remainder = round2(shown - filledTo);

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
        title="Press for the marks, or drag across them"
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
            className={`mark-bar cat-${category} ${pinned ? "is-pinned" : ""}`}
            style={{ top: anchor.top, left: anchor.left, width: anchor.width }}
            role="listbox"
            aria-label={`${label} marks`}
            aria-activedescendant={`mark-option-${String(shown).replace(".", "-")}`}
          >
            <div className="mark-bar-head">
              <span className="mark-bar-value t-num">{display}</span>
              <span className="mark-bar-of t-num">/ {max}</span>
              <span className={`mark-bar-hint ${fine ? "is-fine" : ""}`}>
                {fine
                  ? `Steps of ${step}`
                  : pinned
                    ? "Press a mark, or drag across"
                    : "Drag, then let go"}
              </span>
            </div>
            <div
              ref={cellsRef}
              className={`mark-cells ${wraps ? "is-wrapped" : ""} ${marked ? "" : "is-unmarked"}`}
              style={wraps ? { gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` } : undefined}
              onPointerDown={pinned ? onCellDown : undefined}
              onPointerMove={pinned ? onCellMove : undefined}
              onPointerUp={pinned ? onCellUp : undefined}
            >
              {cells.map((mark) => {
                const on = mark <= filledTo;
                const part = !on && mark === filledTo + 1 && remainder > 0;
                const current = mark === filledTo;
                return (
                  <div
                    key={mark}
                    id={`mark-option-${mark}`}
                    data-mark={mark}
                    role="option"
                    aria-selected={current}
                    aria-label={`${mark} marks`}
                    className={`mark-cell ${on ? "is-on" : ""} ${current ? "is-current" : ""}`}
                  >
                    {part && (
                      <span
                        className="mark-cell-part"
                        style={{ width: `${(remainder / 1) * 100}%` }}
                        aria-hidden="true"
                      />
                    )}
                    <span className="mark-cell-label t-num">{mark}</span>
                  </div>
                );
              })}
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}

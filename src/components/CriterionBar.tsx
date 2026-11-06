import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";
import { CATEGORY_BY_ID } from "../config";
import type { CategoryId } from "../types";
import type { BarSize, IslandLook, Preselect } from "../lib/markingPreferences";

interface CriterionBarProps {
  categories: readonly CategoryId[];
  preselect: Preselect | null;
  /** criterion-first: tap to choose; drag-hold: drag a criterion onto the word. */
  mode: "criterion-first" | "drag-hold";
  look: IslandLook;
  side: "left" | "right";
  size: BarSize;
  /** Width of the column kept free beside the pages (px). */
  space: number;
  showKeys: boolean;
  /** Changes when the island should shake (a word was tapped with nothing chosen). */
  nudge: number;
  stageRef: RefObject<HTMLDivElement | null>;
  /** The pages: the first button starts on their top line. */
  alignRef: RefObject<HTMLDivElement | null>;
  settings: ReactNode;
  onPress: (category: CategoryId) => void;
  onRelease: (category: CategoryId) => void;
  onDragStart: (category: CategoryId) => void;
  onDragMove: (x: number, y: number) => void;
  onDragEnd: (x: number, y: number) => void;
  /** The letter tray is open: the dragged label hides so it never covers the letters. */
  trayOpen: boolean;
  /** A tap in drag mode: nothing to choose, the island shakes. */
  onDragTap: () => void;
}

const EDGE = 12;
/** A press that travels further than this is a drag (drag-hold mode). */
const DRAG_START = 8;

/**
 * The criterion island at the edge of the Mushaf. Rendered outside the page
 * so its own touches never count as a second finger on the page. The settings
 * opener is a separate small button in the bottom-right corner.
 */
export function CriterionBar({
  categories, preselect, mode, look, side, size, space, showKeys, nudge, stageRef, alignRef, settings,
  trayOpen, onPress, onRelease, onDragStart, onDragMove, onDragEnd, onDragTap,
}: CriterionBarProps) {
  const barRef = useRef<HTMLDivElement>(null);
  const pressed = useRef(new Map<number, CategoryId>());
  const drag = useRef<{ pointerId: number; category: CategoryId; x: number; y: number; moving: boolean } | null>(null);
  const [ghost, setGhost] = useState<{ category: CategoryId; x: number; y: number } | null>(null);
  const [position, setPosition] = useState<CSSProperties>({ visibility: "hidden" });
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [shake, setShake] = useState(false);

  useLayoutEffect(() => {
    const place = () => {
      const stage = stageRef.current;
      const bar = barRef.current;
      if (!stage || !bar) return;
      const rect = stage.getBoundingClientRect();
      const height = bar.offsetHeight;
      // The first button starts on the pages' top line (below the app header).
      const header = document.querySelector(".app-header")?.getBoundingClientRect().bottom ?? 0;
      const pagesTop = alignRef.current?.getBoundingClientRect().top ?? rect.top;
      const top = Math.max(pagesTop, header + EDGE, EDGE);
      const width = bar.offsetWidth;
      const left = side === "left" ? rect.left - space / 2 - width / 2 : rect.right + space / 2 - width / 2;
      setPosition({
        top: Math.min(top, window.innerHeight - height - EDGE - 56),
        left: Math.max(EDGE / 2, Math.min(window.innerWidth - width - EDGE / 2, left)),
      });
    };
    place();
    const stage = stageRef.current;
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(place);
    if (stage) observer?.observe(stage);
    if (alignRef.current) observer?.observe(alignRef.current);
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [side, size, space, stageRef, alignRef, categories.length, look.shape, look.gap]);

  // Only a new nudge shakes, not one left from before the island mounted.
  const seenNudge = useRef(nudge);
  useEffect(() => {
    if (nudge === seenNudge.current) return;
    seenNudge.current = nudge;
    setShake(false);
    const start = window.requestAnimationFrame(() => setShake(true));
    const timer = window.setTimeout(() => setShake(false), 420);
    return () => { window.cancelAnimationFrame(start); window.clearTimeout(timer); };
  }, [nudge]);

  // A press that loses its pointer (finger slid away, window lost focus) still ends.
  const release = (pointerId: number) => {
    const category = pressed.current.get(pointerId);
    if (!category) return;
    pressed.current.delete(pointerId);
    onRelease(category);
  };

  const endDrag = (event: React.PointerEvent, cancelled: boolean) => {
    const current = drag.current;
    if (!current || current.pointerId !== event.pointerId) return;
    drag.current = null;
    setGhost(null);
    if (current.moving) {
      if (cancelled) onDragEnd(-1, -1);
      else onDragEnd(event.clientX, event.clientY);
    } else if (!cancelled) onDragTap();
  };

  const islandStyle = {
    "--island-radius": `${look.radius}px`,
    "--island-gap": `${look.gap}px`,
  } as CSSProperties;

  return createPortal(
    <>
      <div
        ref={barRef}
        data-criterion-bar=""
        data-chosen-look={look.chosen}
        data-rest-look={look.rest}
        data-khafi={look.khafi}
        data-focus-look={look.focus}
        className={`criterion-bar side-${side} size-${size} shape-${look.shape} ${shake ? "is-nudged" : ""}`}
        style={{ ...position, ...islandStyle }}
        role="toolbar"
        aria-orientation="vertical"
        aria-label={mode === "drag-hold" ? "Drag a criterion onto a word" : "Criterion for the next marks"}
      >
        {categories.map((category, index) => {
          const on = preselect?.category === category;
          const def = CATEGORY_BY_ID[category];
          return (
            <button
              key={category}
              type="button"
              className={`criterion-button cat-${category} ${on ? "is-on" : ""} ${on && preselect?.held ? "is-held" : ""}`}
              aria-pressed={mode === "criterion-first" ? on : undefined}
              aria-label={`${def.label}${showKeys && mode === "criterion-first" ? `, key ${index + 1}` : ""}`}
              title={def.hint}
              data-criterion-button={category}
              onPointerDown={(event) => {
                if (event.button > 0) return;
                event.preventDefault();
                try { event.currentTarget.setPointerCapture(event.pointerId); } catch { /* optional */ }
                if (mode === "drag-hold") {
                  drag.current = { pointerId: event.pointerId, category, x: event.clientX, y: event.clientY, moving: false };
                  return;
                }
                pressed.current.set(event.pointerId, category);
                onPress(category);
              }}
              onPointerMove={(event) => {
                const current = drag.current;
                if (!current || current.pointerId !== event.pointerId) return;
                if (!current.moving) {
                  if (Math.hypot(event.clientX - current.x, event.clientY - current.y) < DRAG_START) return;
                  current.moving = true;
                  onDragStart(current.category);
                }
                setGhost({ category: current.category, x: event.clientX, y: event.clientY });
                onDragMove(event.clientX, event.clientY);
              }}
              onPointerUp={(event) => { endDrag(event, false); release(event.pointerId); }}
              onPointerCancel={(event) => { endDrag(event, true); release(event.pointerId); }}
              onLostPointerCapture={(event) => { endDrag(event, true); release(event.pointerId); }}
              onContextMenu={(event) => event.preventDefault()}
              onClick={(event) => {
                // Pointer presses are handled above; this is Enter or Space.
                if (event.detail !== 0 || mode !== "criterion-first") return;
                onPress(category);
                onRelease(category);
              }}
            >
              <span className="criterion-tick" aria-hidden="true" />
              {showKeys && mode === "criterion-first" && <span className="criterion-key" aria-hidden="true">{index + 1}</span>}
              <span className="criterion-name">{def.short}</span>
            </button>
          );
        })}
      </div>
      {ghost && !trayOpen && (
        <div
          className={`criterion-ghost cat-${ghost.category}`}
          data-khafi={look.khafi}
          style={{ left: ghost.x, top: ghost.y }}
          aria-hidden="true"
        >
          {CATEGORY_BY_ID[ghost.category].short}
        </div>
      )}
      <div data-criterion-bar="" className="criterion-corner"
        style={{ "--panel-clear": side === "right" ? `${space - 12}px` : "0px" } as CSSProperties}>
        <button
          type="button"
          className="criterion-settings"
          aria-label="Marking settings"
          aria-expanded={settingsOpen}
          onClick={() => setSettingsOpen((open) => !open)}
        >
          <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <path d="M4 7h10M18 7h2M4 17h2M10 17h10" /><circle cx="16" cy="7" r="2" /><circle cx="8" cy="17" r="2" />
          </svg>
        </button>
        {settingsOpen && (
          <div className="criterion-panel" role="dialog" aria-label="Marking settings"
            onKeyDown={(event) => { if (event.key === "Escape") { event.stopPropagation(); setSettingsOpen(false); } }}>
            <div className="criterion-panel-head">
              <strong>Marking</strong>
              <button type="button" className="btn-ghost" onClick={() => setSettingsOpen(false)}>Done</button>
            </div>
            {settings}
          </div>
        )}
      </div>
    </>,
    document.body,
  );
}

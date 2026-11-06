import { useRef, useState, type HTMLAttributes, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { CATEGORY_BY_ID } from "../config";
import type { CategoryId } from "../types";
import type { CriterionChoiceHandlers } from "../lib/criterionChoice";

/** A press that travels further than this is a drag (drag-hold mode). */
export const DRAG_START = 8;

interface CriterionPressableProps extends Omit<HTMLAttributes<HTMLButtonElement>, "onClick" | "children"> {
  category: CategoryId;
  mode: "criterion-first" | "drag-hold";
  handlers: CriterionChoiceHandlers;
  /** The letter tray is open: the dragged label hides so it never covers the letters. */
  trayOpen: boolean;
  khafi: "current" | "deep";
  children: ReactNode;
}

/**
 * One criterion control, on the island or as a scorecard row. Criterion
 * first: press and release choose (a hold keeps it only while held). Drag and
 * hold: drag it onto a word; a plain tap only shakes.
 */
export function CriterionPressable({
  category, mode, handlers, trayOpen, khafi, children, ...rest
}: CriterionPressableProps) {
  const pressed = useRef(new Set<number>());
  const drag = useRef<{ pointerId: number; x: number; y: number; moving: boolean } | null>(null);
  const [ghost, setGhost] = useState<{ x: number; y: number } | null>(null);

  // A press that loses its pointer (finger slid away, window lost focus) still ends.
  const release = (pointerId: number) => {
    if (!pressed.current.delete(pointerId)) return;
    handlers.onRelease(category);
  };
  const endDrag = (event: React.PointerEvent, cancelled: boolean) => {
    const current = drag.current;
    if (!current || current.pointerId !== event.pointerId) return;
    drag.current = null;
    setGhost(null);
    if (current.moving) handlers.onDragEnd(cancelled ? -1 : event.clientX, cancelled ? -1 : event.clientY);
    else if (!cancelled) handlers.onDragTap();
  };

  return (
    <>
      <button
        type="button"
        data-criterion-button={category}
        {...rest}
        onPointerDown={(event) => {
          if (event.button > 0) return;
          event.preventDefault();
          try { event.currentTarget.setPointerCapture(event.pointerId); } catch { /* optional */ }
          if (mode === "drag-hold") {
            drag.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, moving: false };
            return;
          }
          pressed.current.add(event.pointerId);
          handlers.onPress(category);
        }}
        onPointerMove={(event) => {
          const current = drag.current;
          if (!current || current.pointerId !== event.pointerId) return;
          if (!current.moving) {
            if (Math.hypot(event.clientX - current.x, event.clientY - current.y) < DRAG_START) return;
            current.moving = true;
            handlers.onDragStart(category);
          }
          setGhost({ x: event.clientX, y: event.clientY });
          handlers.onDragMove(event.clientX, event.clientY);
        }}
        onPointerUp={(event) => { endDrag(event, false); release(event.pointerId); }}
        onPointerCancel={(event) => { endDrag(event, true); release(event.pointerId); }}
        onLostPointerCapture={(event) => { endDrag(event, true); release(event.pointerId); }}
        onContextMenu={(event) => event.preventDefault()}
        onClick={(event) => {
          // Pointer presses are handled above; this is Enter or Space.
          if (event.detail !== 0 || mode !== "criterion-first") return;
          handlers.onPress(category);
          handlers.onRelease(category);
        }}
      >
        {children}
      </button>
      {ghost && !trayOpen && createPortal(
        <div className={`criterion-ghost cat-${category}`} data-khafi={khafi}
          style={{ left: ghost.x, top: ghost.y }} aria-hidden="true">
          {CATEGORY_BY_ID[category].short}
        </div>,
        document.body,
      )}
    </>
  );
}

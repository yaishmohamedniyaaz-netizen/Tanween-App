import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";
import { CATEGORY_BY_ID } from "../config";
import type { CategoryId } from "../types";
import type { BarSize, Preselect } from "../lib/markingPreferences";

interface CriterionBarProps {
  categories: readonly CategoryId[];
  preselect: Preselect | null;
  side: "left" | "right";
  size: BarSize;
  /** Width of the column kept free beside the pages (px). */
  space: number;
  showKeys: boolean;
  /** Changes when a word was tapped before a criterion in "criterion first" order. */
  nudge: number;
  stageRef: RefObject<HTMLDivElement | null>;
  settings: ReactNode;
  onPress: (category: CategoryId) => void;
  onRelease: (category: CategoryId) => void;
}

const GAP = 10;

/**
 * Criterion buttons at the edge of the Mushaf. Tap = next mark, hold = only
 * while held (see markingPreferences). Rendered outside the page so its own
 * touches never count as a second finger on the page.
 */
export function CriterionBar({
  categories, preselect, side, size, space, showKeys, nudge, stageRef, settings, onPress, onRelease,
}: CriterionBarProps) {
  const barRef = useRef<HTMLDivElement>(null);
  const pressed = useRef(new Map<number, CategoryId>());
  const [position, setPosition] = useState<CSSProperties>({ visibility: "hidden" });
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [hint, setHint] = useState(false);

  useLayoutEffect(() => {
    const place = () => {
      const stage = stageRef.current;
      const bar = barRef.current;
      if (!stage || !bar) return;
      const rect = stage.getBoundingClientRect();
      const height = bar.offsetHeight;
      // Centre on the part of the pages the judge can see, below the app header.
      const header = document.querySelector(".app-header")?.getBoundingClientRect().bottom ?? 0;
      const visibleTop = Math.max(rect.top, header, 0);
      const visibleBottom = Math.min(rect.bottom, window.innerHeight);
      const top = Math.max(visibleTop + GAP, Math.min(window.innerHeight - height - GAP,
        (visibleTop + visibleBottom) / 2 - height / 2));
      // Centre the bar in the free column beside the pages.
      const width = bar.offsetWidth;
      const left = side === "left" ? rect.left - space / 2 - width / 2 : rect.right + space / 2 - width / 2;
      setPosition({ top, left: Math.max(GAP / 2, Math.min(window.innerWidth - width - GAP / 2, left)) });
    };
    place();
    const stage = stageRef.current;
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(place);
    if (stage) observer?.observe(stage);
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [side, size, space, stageRef, categories.length]);

  // Only a new nudge shows the hint, not one left from before the bar mounted.
  const seenNudge = useRef(nudge);
  useEffect(() => {
    if (nudge === seenNudge.current) return;
    seenNudge.current = nudge;
    setHint(true);
    const timer = window.setTimeout(() => setHint(false), 1800);
    return () => window.clearTimeout(timer);
  }, [nudge]);

  // A press that loses its pointer (finger slid away, window lost focus) still ends.
  const release = (pointerId: number) => {
    const category = pressed.current.get(pointerId);
    if (!category) return;
    pressed.current.delete(pointerId);
    onRelease(category);
  };

  const stateWord = (on: boolean) => !on || !preselect ? null
    : preselect.held ? "Held" : preselect.sticky ? "On" : "Next mark";

  return createPortal(
    <div
      ref={barRef}
      data-criterion-bar=""
      className={`criterion-bar side-${side} size-${size} ${hint ? "is-nudged" : ""}`}
      style={position}
      role="toolbar"
      aria-orientation="vertical"
      aria-label="Criterion for the next mark"
    >
      {categories.map((category, index) => {
        const on = preselect?.category === category;
        const def = CATEGORY_BY_ID[category];
        return (
          <button
            key={category}
            type="button"
            className={`criterion-button cat-${category} ${on ? "is-on" : ""} ${on && preselect?.held ? "is-held" : ""}`}
            aria-pressed={on}
            aria-label={`${def.label}${showKeys ? `, key ${index + 1}` : ""}${on ? `, ${stateWord(on)}` : ""}`}
            title={def.hint}
            data-criterion-button={category}
            onPointerDown={(event) => {
              if (event.button > 0) return;
              event.preventDefault();
              try { event.currentTarget.setPointerCapture(event.pointerId); } catch { /* optional */ }
              pressed.current.set(event.pointerId, category);
              onPress(category);
            }}
            onPointerUp={(event) => release(event.pointerId)}
            onPointerCancel={(event) => release(event.pointerId)}
            onLostPointerCapture={(event) => release(event.pointerId)}
            onContextMenu={(event) => event.preventDefault()}
            onClick={(event) => {
              // Pointer presses are handled above; this is Enter or Space.
              if (event.detail !== 0) return;
              onPress(category);
              onRelease(category);
            }}
          >
            <span className="criterion-name">{def.short}</span>
            {showKeys && <kbd aria-hidden="true">{index + 1}</kbd>}
            <span className="criterion-state" aria-hidden="true">{stateWord(on) ?? ""}</span>
          </button>
        );
      })}
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
      {hint && <div className="criterion-hint" role="status">Choose a criterion first</div>}
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
    </div>,
    document.body,
  );
}

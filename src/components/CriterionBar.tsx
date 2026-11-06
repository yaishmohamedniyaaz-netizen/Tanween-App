import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";
import { CATEGORY_BY_ID } from "../config";
import type { CategoryId } from "../types";
import type { BarSize, IslandLook, Preselect } from "../lib/markingPreferences";
import { criterionChoiceHandlers } from "../lib/criterionChoice";
import { CriterionPressable } from "./CriterionPressable";

interface CriterionBarProps {
  /** Island buttons beside the pages; off when the scorecard rows are the buttons. */
  showButtons: boolean;
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
  /** The pages: the island is centred on their visible part. */
  alignRef: RefObject<HTMLDivElement | null>;
  settings: ReactNode;
  /** The letter tray is open: the dragged label hides so it never covers the letters. */
  trayOpen: boolean;
}

const EDGE = 12;

/**
 * The criterion island beside the Mushaf, centred on the visible pages.
 * Rendered outside the page so its own touches never count as a second
 * finger on the page. The settings opener is a separate small button in the
 * bottom-right corner (also shown when the scorecard rows are the buttons).
 */
export function CriterionBar({
  showButtons, categories, preselect, mode, look, side, size, space, showKeys, nudge, stageRef, alignRef, settings, trayOpen,
}: CriterionBarProps) {
  const barRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<CSSProperties>({ visibility: "hidden" });
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [shake, setShake] = useState(false);

  useLayoutEffect(() => {
    if (!showButtons) return;
    const place = () => {
      const stage = stageRef.current;
      const bar = barRef.current;
      if (!stage || !bar) return;
      const rect = stage.getBoundingClientRect();
      const pages = alignRef.current?.getBoundingClientRect() ?? rect;
      const height = bar.offsetHeight;
      // Centre on the part of the pages the judge can see, below the app header.
      const header = document.querySelector(".app-header")?.getBoundingClientRect().bottom ?? 0;
      const visibleTop = Math.max(pages.top, rect.top, header + EDGE);
      const visibleBottom = Math.min(pages.bottom, rect.bottom, window.innerHeight - EDGE);
      const top = Math.max(header + EDGE, Math.min(window.innerHeight - height - EDGE,
        (visibleTop + visibleBottom) / 2 - height / 2));
      const width = bar.offsetWidth;
      const left = side === "left" ? rect.left - space / 2 - width / 2 : rect.right + space / 2 - width / 2;
      setPosition({ top, left: Math.max(EDGE / 2, Math.min(window.innerWidth - width - EDGE / 2, left)) });
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
  }, [showButtons, side, size, space, stageRef, alignRef, categories.length, look.shape, look.gap]);

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

  const islandStyle = {
    "--island-radius": `${look.radius}px`,
    "--island-gap": `${look.gap}px`,
  } as CSSProperties;

  return createPortal(
    <>
      {showButtons && (
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
          aria-label={mode === "drag-hold" ? "Drag a criterion onto a word" : "Criterion for the next mark"}
        >
          {categories.map((category, index) => {
            const on = preselect?.category === category;
            const def = CATEGORY_BY_ID[category];
            return (
              <CriterionPressable
                key={category}
                category={category}
                mode={mode}
                handlers={criterionChoiceHandlers}
                trayOpen={trayOpen}
                khafi={look.khafi}
                className={`criterion-button cat-${category} ${on ? "is-on" : ""} ${on && preselect?.held ? "is-held" : ""}`}
                aria-pressed={mode === "criterion-first" ? on : undefined}
                aria-label={`${def.label}${showKeys && mode === "criterion-first" ? `, key ${index + 1}` : ""}`}
                title={def.hint}
              >
                <span className="criterion-tick" aria-hidden="true" />
                {showKeys && mode === "criterion-first" && <span className="criterion-key" aria-hidden="true">{index + 1}</span>}
                <span className="criterion-name">{def.short}</span>
              </CriterionPressable>
            );
          })}
        </div>
      )}
      <div data-criterion-bar="" className="criterion-corner"
        style={{ "--panel-clear": showButtons && side === "right" ? `${space - 12}px` : "0px" } as CSSProperties}>
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

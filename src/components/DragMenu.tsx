import { createPortal } from "react-dom";
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
} from "react";
import { CATEGORIES } from "../config";
import { HoldToUndo } from "./HoldToUndo";
import {
  getSelectorPlacement,
  getSelectorVerticalPlacement,
  getSelectorWidths,
  SELECTOR_ESTIMATED_HEIGHT,
} from "../lib/selectorLayout";
import type { CategoryId, ScoreConfig } from "../types";

export interface MenuAnchor {
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
}

interface Props {
  anchor: MenuAnchor;
  glyph: string;
  units: Array<{
    tid: string;
    primaryGlyph: string;
    fullGlyph: string;
    selected: boolean;
    mistake?: { id: string; category: CategoryId; amount: number };
  }>;
  targetSelected: boolean;
  hovered: CategoryId | null;
  onPreview: (category: CategoryId | null) => void;
  pinned: boolean;
  config: ScoreConfig;
  allowedCategories: CategoryId[];
  onPick: (id: CategoryId) => void;
  onUnitPick: (tid: string) => void;
  onClose: () => void;
  onUndo: (id: string) => void;
  showTashkeel?: boolean;
  /** Floating tray within a parent surface; that surface owns dismissal and focus. */
  portalHost?: HTMLElement | null;
  /** Keep the source Arabic visible when a constrained phrase tray covers it. */
  preserveSourceContext?: boolean;
  /** Leave the parent's help/close controls reachable in a very short viewport. */
  reservedHeaderInlineSize?: number;
  reservedHeaderBlockSize?: number;
}

type SelectorStyle = CSSProperties & {
  "--picker-width": string;
  "--category-width": string;
  "--anchor-x": string;
};

export function DragMenu({
  anchor,
  glyph,
  units,
  targetSelected,
  hovered,
  onPreview,
  pinned,
  config,
  allowedCategories,
  onPick,
  onUnitPick,
  onClose,
  onUndo,
  showTashkeel,
  portalHost,
  preserveSourceContext = false,
  reservedHeaderInlineSize = 0,
  reservedHeaderBlockSize = 0,
}: Props) {
  const tashkeel = showTashkeel ?? false;
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuHeight, setMenuHeight] = useState(SELECTOR_ESTIMATED_HEIGHT);
  const visualViewport = window.visualViewport;
  const viewportWidth =
    visualViewport?.width ?? document.documentElement.clientWidth;
  const viewportHeight =
    visualViewport?.height ?? document.documentElement.clientHeight;
  const viewportLeft = visualViewport?.offsetLeft ?? 0;
  const viewportTop = visualViewport?.offsetTop ?? 0;
  // A tray inside a navigation panel must not cover its navigation controls.
  const panelBounds = portalHost?.getBoundingClientRect();
  const shareHeaderRow = Boolean(panelBounds && panelBounds.height - reservedHeaderBlockSize < 220);
  const placementTop = panelBounds
    ? Math.max(viewportTop, panelBounds.top + (shareHeaderRow ? 0 : reservedHeaderBlockSize))
    : viewportTop;
  const placementHeight = panelBounds
    ? Math.max(0, Math.min(viewportTop + viewportHeight, panelBounds.bottom) - placementTop)
    : viewportHeight;
  const compactParent = Boolean(panelBounds && placementHeight < 260);
  const placementWidth = panelBounds
    ? panelBounds.width - (shareHeaderRow ? reservedHeaderInlineSize : 0)
    : viewportWidth;
  const placementLeft = panelBounds?.left ?? viewportLeft;
  const { pickerWidth, categoryWidth, menuWidth } = getSelectorWidths(
    units.length,
    placementWidth,
  );
  const anchorCenter = anchor.left + anchor.width / 2;
  const { centerX, pointerX } = getSelectorPlacement(
    anchorCenter,
    placementWidth,
    menuWidth,
    pickerWidth,
    placementLeft,
  );
  const { openUp, top } = getSelectorVerticalPlacement(
    anchor.top,
    anchor.bottom,
    placementHeight,
    menuHeight,
    placementTop,
  );
  const sourceCovered = preserveSourceContext && (compactParent ||
    (top < anchor.bottom && top + menuHeight > anchor.top &&
    centerX - menuWidth / 2 < anchor.right && centerX + menuWidth / 2 > anchor.left));
  // Only pinpoint criteria can be tied to a letter; Adu & Raagu is marked once
  // for the whole recitation in its own panel.
  const categoryDefs = CATEGORIES.filter(
    (category) =>
      category.kind === "pinpoint" && allowedCategories.includes(category.id),
  );
  const fixedCategory = categoryDefs.length === 1 ? categoryDefs[0] : null;
  const selectedMistake = units.find((unit) => unit.selected)?.mistake;
  const selectedCategory = CATEGORIES.find((category) => category.id === selectedMistake?.category);

  // Measure the actual layout before paint: a one-criterion tray is much
  // shorter than the three-criterion tray. Do not guess from category count.
  useLayoutEffect(() => {
    const menu = menuRef.current;
    if (!menu) return;
    const measure = () => setMenuHeight(menu.getBoundingClientRect().height);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(menu);
    return () => observer.disconnect();
  }, [pickerWidth, categoryDefs.length, units.length, pinned]);

  useEffect(() => {
    // The source anchor is a snapshot. Dismiss when the page moves, but let
    // the judge scroll within the tray without losing their selection.
    const onScroll = (event: Event) => {
      if (event.target instanceof Node && menuRef.current?.contains(event.target)) return;
      onClose();
    };
    window.addEventListener("resize", onClose);
    window.addEventListener("scroll", onScroll, true);
    visualViewport?.addEventListener("resize", onClose);
    visualViewport?.addEventListener("scroll", onClose);
    return () => {
      window.removeEventListener("resize", onClose);
      window.removeEventListener("scroll", onScroll, true);
      visualViewport?.removeEventListener("resize", onClose);
      visualViewport?.removeEventListener("scroll", onClose);
    };
  }, [onClose, visualViewport]);

  // When the menu is pinned (tap path), move focus into it for keyboard users.
  useEffect(() => {
    if (!pinned) return;
    menuRef.current
      ?.querySelector<HTMLButtonElement>("[data-unit-tid]")
      ?.focus({ preventScroll: true });
  }, [pinned]);

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      onClose();
      return;
    }
    const unitButtons = Array.from(
      menuRef.current?.querySelectorAll<HTMLButtonElement>("[data-unit-tid]") ?? [],
    );
    const categoryButtons = Array.from(
      menuRef.current?.querySelectorAll<HTMLButtonElement>(
        "[data-pill]:not(:disabled)",
      ) ?? [],
    );
    const focusableButtons = Array.from(menuRef.current?.querySelectorAll<HTMLButtonElement>("button:not(:disabled)[tabindex='0'], button:not(:disabled):not([tabindex])") ?? []);
    const activeElement = document.activeElement;
    const unitIndex = unitButtons.findIndex((button) => button === activeElement);
    const categoryIndex = categoryButtons.findIndex(
      (button) => button === activeElement,
    );

    if (pinned && !portalHost && e.key === "Tab" && focusableButtons.length) {
      const focusIndex = focusableButtons.findIndex(
        (button) => button === activeElement,
      );
      if (e.shiftKey && focusIndex <= 0) {
        e.preventDefault();
        e.stopPropagation();
        focusableButtons[focusableButtons.length - 1]?.focus({ preventScroll: true });
      } else if (!e.shiftKey && focusIndex === focusableButtons.length - 1) {
        e.preventDefault();
        e.stopPropagation();
        focusableButtons[0]?.focus({ preventScroll: true });
      }
      return;
    }

    if (
      unitIndex >= 0 &&
      (e.key === "ArrowLeft" || e.key === "ArrowRight")
    ) {
      e.preventDefault();
      e.stopPropagation();
      // The rail is RTL: ArrowLeft advances visually left, ArrowRight moves right.
      const direction = e.key === "ArrowLeft" ? 1 : -1;
      const nextButton = unitButtons[
        (unitIndex + direction + unitButtons.length) % unitButtons.length
      ];
      nextButton.focus({ preventScroll: true });
      nextButton.scrollIntoView({ block: "nearest", inline: "nearest" });
      const nextTid = nextButton.dataset.unitTid;
      if (nextTid) onUnitPick(nextTid);
      return;
    }

    const outwardKey = openUp ? "ArrowUp" : "ArrowDown";
    const inwardKey = openUp ? "ArrowDown" : "ArrowUp";
    if (e.key !== outwardKey && e.key !== inwardKey) return;

    if (unitIndex >= 0 && e.key === outwardKey) {
      e.preventDefault();
      e.stopPropagation();
      categoryButtons[0]?.focus({ preventScroll: true });
      return;
    }

    if (categoryIndex < 0) return;
    e.preventDefault();
    e.stopPropagation();
    if (e.key === outwardKey) {
      categoryButtons[Math.min(categoryIndex + 1, categoryButtons.length - 1)]
        ?.focus({ preventScroll: true });
      return;
    }
    if (categoryIndex > 0) {
      categoryButtons[categoryIndex - 1]?.focus({ preventScroll: true });
      return;
    }
    (menuRef.current?.querySelector<HTMLButtonElement>(
      "[data-unit-tid][aria-checked='true']",
    ) ?? unitButtons[0])?.focus({ preventScroll: true });
  };

  const posStyle: SelectorStyle = {
    top,
    left: centerX,
    width: menuWidth,
    "--picker-width": `${pickerWidth}px`,
    "--category-width": `${categoryWidth}px`,
    "--anchor-x": `${pointerX}px`,
  };

  const unitPicker = (
    <div
      className={`unit-picker ${tashkeel ? "with-tashkeel" : ""} ${hovered ? `cat-${hovered}` : fixedCategory ? `cat-${fixedCategory.id}` : ""}`}
      dir="rtl"
    >
      <div
        className={`unit-picker-row ${units.length === 1 ? "single-unit" : ""}`}
        role="radiogroup"
        aria-label="Choose exact letter"
      >
        {units.map((unit, index) => (
          <button
            key={unit.tid}
            type="button"
            role="radio"
            data-unit-tid={unit.tid}
            className={`unit-choice ${unit.selected ? "selected" : ""} ${unit.mistake ? `marked cat-${unit.selected && hovered ? hovered : unit.mistake.category}` : ""}`}
            aria-label={`Letter ${index + 1} of ${units.length}: ${unit.primaryGlyph}. Exact source ${unit.fullGlyph}${unit.mistake ? `. Marked: ${CATEGORIES.find((category) => category.id === unit.mistake?.category)?.label}` : ""}`}
            aria-checked={unit.selected}
            tabIndex={
              pinned && (unit.selected || (!targetSelected && index === 0))
                ? 0
                : -1
            }
            onPointerEnter={(event) => {
              // A mouse can explore the pinned tray without extra clicks.
              // Touch still chooses deliberately by tapping or dragging.
              if (!pinned || event.pointerType === "mouse") {
                onPreview(null);
                onUnitPick(unit.tid);
              }
            }}
            onClick={() => onUnitPick(unit.tid)}
          >
            <span aria-hidden="true" className="unit-glyph">{tashkeel ? unit.fullGlyph || unit.primaryGlyph : unit.primaryGlyph}</span>
          </button>
        ))}
      </div>
    </div>
  );
  const categoryStack = (
    <div
      className="category-stack"
      role="menu"
      aria-label="Choose mistake type"
      aria-orientation="vertical"
    >
      {categoryDefs.map((c, index) => {
        const edgeClasses = [
          index === 0 ? "pill-inner" : "",
          index === categoryDefs.length - 1 ? "pill-outer" : "",
        ].filter(Boolean).join(" ");
        return (
        <button
          key={c.id}
          type="button"
          role="menuitem"
          data-pill={c.id}
          data-path-index={index}
          className={`pill cat-${c.id} ${edgeClasses} ${fixedCategory ? "pill-fixed" : ""} ${hovered === c.id ? "active" : ""}`}
          disabled={!targetSelected}
          aria-disabled={!targetSelected}
          aria-posinset={index + 1}
          aria-setsize={categoryDefs.length}
          onClick={() => onPick(c.id)}
          onPointerEnter={() => { if (pinned && targetSelected) onPreview(c.id); }}
          onPointerLeave={() => { if (pinned) onPreview(null); }}
          onFocus={() => { if (pinned && targetSelected) onPreview(c.id); }}
          onBlur={() => { if (pinned) onPreview(null); }}
          tabIndex={pinned ? 0 : -1}
        >
          <span className="pill-text">
            <span className="pill-main">
              {fixedCategory && pinned ? "Mark " : ""}
              {c.label.replace("Laḥn ", "")}
            </span>
          </span>
          <span className="pill-amt">−{config[c.id].step}</span>
        </button>
        );
      })}
    </div>
  );

  const content = (
    <>
      {pinned && !portalHost && (
        <div
          className="menu-backdrop"
          onPointerDown={(e) => {
            e.preventDefault();
            onClose();
          }}
        />
      )}
      <div
        ref={menuRef}
        className={`drag-menu ${openUp ? "up" : "down"} ${pinned ? "pinned" : ""} ${portalHost ? "in-navigation-panel" : ""} ${preserveSourceContext && placementHeight < 260 ? "phrase-selector-compact" : ""}`}
        style={posStyle}
        role={portalHost ? "group" : "dialog"}
        aria-modal={!portalHost && pinned || undefined}
        aria-label={`Choose exact letter and mistake type for ${glyph}`}
        onKeyDown={onKeyDown}
      >
        <div className="selector-runway" style={panelBounds ? { maxHeight: Math.max(0, placementHeight - 24) } : undefined}>
          {sourceCovered && <div className="phrase-selector-source" lang="ar" dir="rtl">{glyph}</div>}
          {unitPicker}
          {categoryStack}
          {pinned && selectedMistake && selectedCategory && (
            <div className={`selector-correction cat-${selectedMistake.category}`}>
              <span className="selector-current">{selectedCategory.label.replace("Laḥn ", "")} · −{selectedMistake.amount}</span>
              <HoldToUndo
                key={`${selectedMistake.id}:${selectedMistake.category}:${selectedMistake.amount}:${tashkeel}`}
                onUndo={() => onUndo(selectedMistake.id)}
              />
            </div>
          )}
        </div>
      </div>
    </>
  );
  return createPortal(content, portalHost ?? document.body);
}

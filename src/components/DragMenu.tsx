import { createPortal } from "react-dom";
import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
} from "react";
import { CATEGORIES } from "../config";
import {
  getSelectorPlacement,
  getSelectorVerticalPlacement,
  getSelectorWidths,
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
  }>;
  targetSelected: boolean;
  hovered: CategoryId | null;
  pinned: boolean;
  config: ScoreConfig;
  allowedCategories: CategoryId[];
  onPick: (id: CategoryId) => void;
  onUnitPick: (tid: string) => void;
  onClose: () => void;
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
  pinned,
  config,
  allowedCategories,
  onPick,
  onUnitPick,
  onClose,
}: Props) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [, setViewportEpoch] = useState(0);
  const visualViewport = window.visualViewport;
  const viewportWidth =
    visualViewport?.width ?? document.documentElement.clientWidth;
  const viewportHeight =
    visualViewport?.height ?? document.documentElement.clientHeight;
  const viewportLeft = 0;
  const viewportTop = 0;
  const { pickerWidth, categoryWidth, menuWidth } = getSelectorWidths(
    units.length,
    viewportWidth,
  );
  const anchorCenter = anchor.left + anchor.width / 2;
  const { centerX, pointerX } = getSelectorPlacement(
    anchorCenter,
    viewportWidth,
    menuWidth,
    pickerWidth,
    viewportLeft,
  );
  const { openUp, top } = getSelectorVerticalPlacement(
    anchor.top,
    anchor.bottom,
    viewportHeight,
    undefined,
    viewportTop,
  );
  const categoryDefs = CATEGORIES.filter((category) =>
    allowedCategories.includes(category.id),
  );
  const fixedCategory = categoryDefs.length === 1 ? categoryDefs[0] : null;

  useEffect(() => {
    const updateViewport = () => setViewportEpoch((value) => value + 1);
    window.addEventListener("resize", updateViewport);
    visualViewport?.addEventListener("resize", updateViewport);
    visualViewport?.addEventListener("scroll", updateViewport);
    return () => {
      window.removeEventListener("resize", updateViewport);
      visualViewport?.removeEventListener("resize", updateViewport);
      visualViewport?.removeEventListener("scroll", updateViewport);
    };
  }, [visualViewport]);

  // When the menu is pinned (tap path), move focus into it for keyboard users.
  useEffect(() => {
    if (!pinned) return;
    menuRef.current
      ?.querySelector<HTMLButtonElement>("[data-unit-tid]")
      ?.focus();
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
    const focusableButtons = [...unitButtons, ...categoryButtons];
    const activeElement = document.activeElement;
    const unitIndex = unitButtons.findIndex((button) => button === activeElement);
    const categoryIndex = categoryButtons.findIndex(
      (button) => button === activeElement,
    );

    if (pinned && e.key === "Tab" && focusableButtons.length) {
      const focusIndex = focusableButtons.findIndex(
        (button) => button === activeElement,
      );
      if (e.shiftKey && focusIndex <= 0) {
        e.preventDefault();
        e.stopPropagation();
        focusableButtons[focusableButtons.length - 1]?.focus();
      } else if (!e.shiftKey && focusIndex === focusableButtons.length - 1) {
        e.preventDefault();
        e.stopPropagation();
        focusableButtons[0]?.focus();
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
      nextButton.focus();
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
      categoryButtons[0]?.focus();
      return;
    }

    if (categoryIndex < 0) return;
    e.preventDefault();
    e.stopPropagation();
    if (e.key === outwardKey) {
      categoryButtons[Math.min(categoryIndex + 1, categoryButtons.length - 1)]
        ?.focus();
      return;
    }
    if (categoryIndex > 0) {
      categoryButtons[categoryIndex - 1]?.focus();
      return;
    }
    (menuRef.current?.querySelector<HTMLButtonElement>(
      "[data-unit-tid][aria-checked='true']",
    ) ?? unitButtons[0])?.focus();
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
      className={`unit-picker ${hovered ? `cat-${hovered}` : fixedCategory ? `cat-${fixedCategory.id}` : ""}`}
      dir="rtl"
    >
      <div
        className="unit-picker-row"
        role="radiogroup"
        aria-label="Choose exact letter"
      >
        {units.map((unit, index) => (
          <button
            key={unit.tid}
            type="button"
            role="radio"
            data-unit-tid={unit.tid}
            className={`unit-choice ${unit.selected ? "selected" : ""}`}
            aria-label={`Letter ${index + 1} of ${units.length}: ${unit.primaryGlyph}. Exact source ${unit.fullGlyph}`}
            aria-checked={unit.selected}
            tabIndex={
              pinned && (unit.selected || (!targetSelected && index === 0))
                ? 0
                : -1
            }
            onPointerEnter={() => onUnitPick(unit.tid)}
            onClick={() => onUnitPick(unit.tid)}
          >
            <span aria-hidden="true">{unit.primaryGlyph}</span>
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
      {categoryDefs.map((c, index) => (
        <button
          key={c.id}
          type="button"
          role="menuitem"
          data-pill={c.id}
          data-path-index={index}
          className={`pill cat-${c.id} ${fixedCategory ? "pill-fixed" : ""} ${hovered === c.id ? "active" : ""}`}
          disabled={!targetSelected}
          aria-disabled={!targetSelected}
          aria-posinset={index + 1}
          aria-setsize={categoryDefs.length}
          onClick={() => onPick(c.id)}
          tabIndex={pinned ? 0 : -1}
        >
          <span className="pill-text">
            <span className="pill-main">
              {fixedCategory && pinned ? "Mark " : ""}
              {c.label.replace(/^Laḥn\s/i, "")}
            </span>
          </span>
          <span className="pill-amt">−{config[c.id].step}</span>
        </button>
      ))}
    </div>
  );

  return createPortal(
    <>
      {pinned && (
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
        className={`drag-menu ${openUp ? "up" : "down"} ${pinned ? "pinned" : ""}`}
        style={posStyle}
        role="dialog"
        aria-modal={pinned || undefined}
        aria-label={`Choose exact letter and mistake type for ${glyph}`}
        onKeyDown={onKeyDown}
      >
        <div className="selector-runway">
          {unitPicker}
          {categoryStack}
        </div>
      </div>
    </>,
    document.body,
  );
}

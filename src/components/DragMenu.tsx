import { createPortal } from "react-dom";
import { useEffect, useRef, type CSSProperties, type KeyboardEvent } from "react";
import { CATEGORIES } from "../config";
import {
  getSelectorPlacement,
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
  units: Array<{ tid: string; glyph: string; selected: boolean }>;
  hovered: CategoryId | null;
  pinned: boolean;
  config: ScoreConfig;
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
  hovered,
  pinned,
  config,
  onPick,
  onUnitPick,
  onClose,
}: Props) {
  const menuRef = useRef<HTMLDivElement>(null);
  const viewportWidth = document.documentElement.clientWidth;
  const viewportHeight = document.documentElement.clientHeight;
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
  );
  const openUp = anchor.top > viewportHeight * 0.58;
  const gap = 9;

  // When the menu is pinned (tap path), move focus into it for keyboard users.
  useEffect(() => {
    if (!pinned) return;
    menuRef.current
      ?.querySelector<HTMLButtonElement>("[data-unit-tid][aria-pressed='true']")
      ?.focus();
  }, [pinned]);

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Escape") {
      e.preventDefault();
      onClose();
      return;
    }
    const unitButtons = Array.from(
      menuRef.current?.querySelectorAll<HTMLButtonElement>("[data-unit-tid]") ?? [],
    );
    const categoryButtons = Array.from(
      menuRef.current?.querySelectorAll<HTMLButtonElement>("[data-pill]") ?? [],
    );
    const activeElement = document.activeElement;
    const unitIndex = unitButtons.findIndex((button) => button === activeElement);
    const categoryIndex = categoryButtons.findIndex(
      (button) => button === activeElement,
    );

    if (
      unitIndex >= 0 &&
      (e.key === "ArrowLeft" || e.key === "ArrowRight")
    ) {
      e.preventDefault();
      // The rail is RTL: ArrowLeft advances visually left, ArrowRight moves right.
      const direction = e.key === "ArrowLeft" ? 1 : -1;
      unitButtons[
        (unitIndex + direction + unitButtons.length) % unitButtons.length
      ].focus();
      return;
    }

    const outwardKey = openUp ? "ArrowUp" : "ArrowDown";
    const inwardKey = openUp ? "ArrowDown" : "ArrowUp";
    if (e.key !== outwardKey && e.key !== inwardKey) return;

    if (unitIndex >= 0 && e.key === outwardKey) {
      e.preventDefault();
      categoryButtons[0]?.focus();
      return;
    }

    if (categoryIndex < 0) return;
    e.preventDefault();
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
      "[data-unit-tid][aria-pressed='true']",
    ) ?? unitButtons[0])?.focus();
  };

  const posStyle: SelectorStyle = {
    ...(openUp
      ? { bottom: Math.round(viewportHeight - anchor.top + gap) }
      : { top: Math.round(anchor.bottom + gap) }),
    left: centerX,
    width: menuWidth,
    "--picker-width": `${pickerWidth}px`,
    "--category-width": `${categoryWidth}px`,
    "--anchor-x": `${pointerX}px`,
  };

  const unitPicker = (
    <div
      className={`unit-picker ${hovered ? `cat-${hovered}` : ""}`}
      dir="rtl"
    >
      <div
        className="unit-picker-row"
        role="group"
        aria-label="Choose exact letter"
      >
        {units.map((unit) => (
          <button
            key={unit.tid}
            type="button"
            data-unit-tid={unit.tid}
            className={`unit-choice ${unit.selected ? "selected" : ""}`}
            aria-label={`Choose ${unit.glyph}`}
            aria-pressed={unit.selected}
            tabIndex={pinned ? 0 : -1}
            onPointerEnter={() => onUnitPick(unit.tid)}
            onClick={() => onUnitPick(unit.tid)}
          >
            {unit.glyph}
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
      {CATEGORIES.map((c, index) => (
        <button
          key={c.id}
          type="button"
          role="menuitem"
          data-pill={c.id}
          data-path-index={index}
          className={`pill cat-${c.id} ${hovered === c.id ? "active" : ""}`}
          aria-posinset={index + 1}
          aria-setsize={CATEGORIES.length}
          onClick={() => onPick(c.id)}
          tabIndex={pinned ? 0 : -1}
        >
          <span className="pill-text">
            <span className="pill-main">{c.label}</span>
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

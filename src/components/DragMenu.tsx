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
  word: string;
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
  word,
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
    const vertical = e.key === "ArrowDown" || e.key === "ArrowUp";
    const horizontal = e.key === "ArrowLeft" || e.key === "ArrowRight";
    if (!vertical && !horizontal) return;
    e.preventDefault();
    const btns = Array.from(
      menuRef.current?.querySelectorAll<HTMLButtonElement>(
        horizontal ? "[data-unit-tid]" : "[data-pill]",
      ) ?? [],
    );
    if (!btns.length) return;
    const idx = btns.findIndex((b) => b === document.activeElement);
    const dir = e.key === "ArrowDown" || e.key === "ArrowRight" ? 1 : -1;
    btns[(idx + dir + btns.length) % btns.length].focus();
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

  const items = openUp ? [...CATEGORIES].reverse() : CATEGORIES;
  const unitPicker = (
    <div
      className={`unit-picker ${hovered ? `cat-${hovered}` : ""}`}
      dir="rtl"
    >
      <div className="unit-picker-word" aria-hidden="true">
        {word}
      </div>
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
      {items.map((c) => (
        <button
          key={c.id}
          type="button"
          role="menuitem"
          data-pill={c.id}
          className={`pill cat-${c.id} ${hovered === c.id ? "active" : ""}`}
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
        aria-label={`Mark a mistake on ${glyph}`}
        onKeyDown={onKeyDown}
      >
        {openUp ? categoryStack : unitPicker}
        {openUp ? unitPicker : categoryStack}
      </div>
    </>,
    document.body,
  );
}

import { createPortal } from "react-dom";
import { useEffect, useRef, type CSSProperties, type KeyboardEvent } from "react";
import { CATEGORIES } from "../config";
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
  const menuWidth = Math.min(304, viewportWidth - 24);
  const halfMenu = menuWidth / 2;
  const anchorCenter = anchor.left + anchor.width / 2;
  const cx = Math.round(
    Math.min(
      viewportWidth - 12 - halfMenu,
      Math.max(12 + halfMenu, anchorCenter),
    ),
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

  const posStyle: CSSProperties = openUp
    ? { left: cx, bottom: Math.round(viewportHeight - anchor.top + gap) }
    : { left: cx, top: Math.round(anchor.bottom + gap) };

  const items = openUp ? [...CATEGORIES].reverse() : CATEGORIES;
  const unitPicker = (
    <div className="unit-picker" dir="rtl">
      <div className="unit-picker-word" aria-hidden="true">{word}</div>
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
  const categoryButtons = items.map((c, i) => (
    <button
      key={c.id}
      type="button"
      data-pill={c.id}
      className={`pill cat-${c.id} ${hovered === c.id ? "active" : ""}`}
      style={{ animationDelay: `${i * 40}ms` }}
      onClick={() => onPick(c.id)}
      tabIndex={pinned ? 0 : -1}
    >
      <span className="pill-text">
        <span className="pill-main">{c.label}</span>
      </span>
      <span className="pill-amt">−{config[c.id].step}</span>
    </button>
  ));

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
        role="menu"
        aria-label={`Mark a mistake on ${glyph}`}
        onKeyDown={onKeyDown}
      >
        {openUp ? categoryButtons : unitPicker}
        {openUp ? unitPicker : categoryButtons}
      </div>
    </>,
    document.body,
  );
}

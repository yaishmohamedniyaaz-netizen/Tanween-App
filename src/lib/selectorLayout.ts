export const SELECTOR_MAX_WIDTH = 360;
export const SELECTOR_CATEGORY_WIDTH = 164;
export const SELECTOR_PICKER_MIN_WIDTH = 104;
export const SELECTOR_UNIT_WIDTH = 44;
export const SELECTOR_UNIT_GAP = 2;
export const SELECTOR_PICKER_PADDING = 8;
export const SELECTOR_VIEWPORT_GUTTER = 24;
export const SELECTOR_POINTER_INSET = 18;
export const SELECTOR_EDGE_GUTTER = SELECTOR_VIEWPORT_GUTTER / 2;
export const SELECTOR_GAP = 9;
export const SELECTOR_ESTIMATED_HEIGHT = 186;

export interface SelectorWidths {
  availableWidth: number;
  pickerWidth: number;
  categoryWidth: number;
  menuWidth: number;
}

export interface SelectorPlacement {
  centerX: number;
  pointerX: number;
}

export interface SelectorVerticalPlacement {
  openUp: boolean;
  top: number;
}

/**
 * Size the selector around its semantic judging units without letting it
 * escape the viewport. Common two-to-six-unit words stay compact; unusually
 * long words use the existing horizontal rail at the maximum safe width.
 */
export function getSelectorWidths(
  unitCount: number,
  viewportWidth: number,
): SelectorWidths {
  const safeUnitCount = Math.max(
    1,
    Math.floor(Number.isFinite(unitCount) ? unitCount : 1),
  );
  const availableWidth = Math.max(
    0,
    Math.min(SELECTOR_MAX_WIDTH, viewportWidth - SELECTOR_VIEWPORT_GUTTER),
  );
  const desiredPickerWidth = Math.max(
    SELECTOR_PICKER_MIN_WIDTH,
    safeUnitCount * SELECTOR_UNIT_WIDTH +
      Math.max(0, safeUnitCount - 1) * SELECTOR_UNIT_GAP +
      SELECTOR_PICKER_PADDING,
  );
  const pickerWidth = Math.min(availableWidth, desiredPickerWidth);
  const categoryWidth = Math.min(availableWidth, SELECTOR_CATEGORY_WIDTH);

  return {
    availableWidth,
    pickerWidth,
    categoryWidth,
    menuWidth: Math.max(pickerWidth, categoryWidth),
  };
}

/**
 * Keep the complete menu inside the viewport while independently moving the
 * callout pointer toward the source glyph. The pointer itself keeps a small
 * corner-safe inset when the source sits at an extreme screen edge.
 */
export function getSelectorPlacement(
  anchorCenter: number,
  viewportWidth: number,
  menuWidth: number,
  pickerWidth: number,
  viewportLeft = 0,
): SelectorPlacement {
  const viewportInset = SELECTOR_EDGE_GUTTER;
  const halfMenu = menuWidth / 2;
  const centerX = Math.round(
    Math.min(
      viewportLeft + viewportWidth - viewportInset - halfMenu,
      Math.max(viewportLeft + viewportInset + halfMenu, anchorCenter),
    ),
  );
  const menuLeft = centerX - halfMenu;
  const pickerLeft = menuLeft + (menuWidth - pickerWidth) / 2;
  const pointerInset = Math.min(SELECTOR_POINTER_INSET, pickerWidth / 2);
  const pointerX = Math.round(
    Math.min(
      pickerWidth - pointerInset,
      Math.max(pointerInset, anchorCenter - pickerLeft),
    ),
  );

  return { centerX, pointerX };
}

/** Choose the roomier side, then clamp the complete runway to the viewport. */
export function getSelectorVerticalPlacement(
  anchorTop: number,
  anchorBottom: number,
  viewportHeight: number,
  menuHeight = SELECTOR_ESTIMATED_HEIGHT,
  viewportTop = 0,
): SelectorVerticalPlacement {
  const safeTop = viewportTop + SELECTOR_EDGE_GUTTER;
  const safeBottom = viewportTop + viewportHeight - SELECTOR_EDGE_GUTTER;
  const spaceAbove = Math.max(0, anchorTop - safeTop - SELECTOR_GAP);
  const spaceBelow = Math.max(0, safeBottom - anchorBottom - SELECTOR_GAP);
  const openUp =
    spaceAbove >= menuHeight ||
    (spaceBelow < menuHeight && spaceAbove > spaceBelow);
  const preferredTop = openUp
    ? anchorTop - SELECTOR_GAP - menuHeight
    : anchorBottom + SELECTOR_GAP;
  const maximumTop = Math.max(safeTop, safeBottom - menuHeight);
  return {
    openUp,
    top: Math.round(Math.min(maximumTop, Math.max(safeTop, preferredTop))),
  };
}

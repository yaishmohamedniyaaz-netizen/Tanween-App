export const SELECTOR_MAX_WIDTH = 304;
export const SELECTOR_CATEGORY_WIDTH = 164;
export const SELECTOR_PICKER_MIN_WIDTH = 104;
export const SELECTOR_UNIT_WIDTH = 44;
export const SELECTOR_PICKER_PADDING = 16;
export const SELECTOR_VIEWPORT_GUTTER = 24;
export const SELECTOR_POINTER_INSET = 18;

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
    safeUnitCount * SELECTOR_UNIT_WIDTH + SELECTOR_PICKER_PADDING,
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
): SelectorPlacement {
  const viewportInset = SELECTOR_VIEWPORT_GUTTER / 2;
  const halfMenu = menuWidth / 2;
  const centerX = Math.round(
    Math.min(
      viewportWidth - viewportInset - halfMenu,
      Math.max(viewportInset + halfMenu, anchorCenter),
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

export type MushafPageLayout = "full" | "spread";

export const STABLE_MUSHAF_STAGE_QUERY =
  "(min-width: 901px) and (min-height: 620px)";
export const MUSHAF_FRAME_INSET = 8;

export const MUSHAF_PAGE_ASPECT_RATIO = 0.68;
export const MUSHAF_PAGE_MAX_INLINE_SIZE = 760;
export const MUSHAF_SPREAD_GAP = 12;
/** The shared page control floats in the page's safe upper margin. */
export const MUSHAF_SPREAD_NAV_BLOCK_SIZE = 0;

export function computeMushafComposedBlockSize(
  inlineSize: number,
  layout: MushafPageLayout,
): number {
  if (!Number.isFinite(inlineSize) || inlineSize <= 0) return 0;
  const pageInlineSize = layout === "spread"
    ? (inlineSize - MUSHAF_SPREAD_GAP) / 2
    : inlineSize;
  if (pageInlineSize <= 0) return 0;
  return pageInlineSize / MUSHAF_PAGE_ASPECT_RATIO;
}

export interface MushafFitInput {
  frameInlineSize: number;
  frameBlockSize: number;
  layout: MushafPageLayout;
  inset?: number;
}

export function computeMushafFitInlineSize({
  frameInlineSize,
  frameBlockSize,
  layout,
  inset = MUSHAF_FRAME_INSET,
}: MushafFitInput): number {
  if (
    !Number.isFinite(frameInlineSize) ||
    !Number.isFinite(frameBlockSize) ||
    !Number.isFinite(inset) ||
    frameInlineSize <= 0 ||
    frameBlockSize <= 0 ||
    inset < 0
  ) {
    return 0;
  }

  const availableInlineSize = frameInlineSize - inset * 2;
  const reservedBlockSize = layout === "spread"
    ? MUSHAF_SPREAD_NAV_BLOCK_SIZE
    : 0;
  const availableBlockSize = frameBlockSize - inset * 2 - reservedBlockSize;
  if (availableInlineSize <= 0 || availableBlockSize <= 0) return 0;

  const maximumInlineSize = layout === "spread"
    ? MUSHAF_PAGE_MAX_INLINE_SIZE * 2 + MUSHAF_SPREAD_GAP
    : MUSHAF_PAGE_MAX_INLINE_SIZE;
  const heightLimitedInlineSize = layout === "spread"
    ? availableBlockSize * MUSHAF_PAGE_ASPECT_RATIO * 2 + MUSHAF_SPREAD_GAP
    : availableBlockSize * MUSHAF_PAGE_ASPECT_RATIO;
  return Math.max(
    0,
    Math.floor(
      Math.min(
        maximumInlineSize,
        availableInlineSize,
        heightLimitedInlineSize,
      ),
    ),
  );
}

export function computeMushafRenderedInlineSize(
  fitInlineSize: number,
  zoomPercent: number,
): number {
  if (!Number.isFinite(fitInlineSize) || fitInlineSize <= 0) return 0;
  const normalizedZoom = normalizeMushafZoom(
    zoomPercent,
    MUSHAF_ZOOM_DEFAULT,
  );
  return Math.max(1, Math.round(fitInlineSize * (normalizedZoom / 100)));
}

export function computeMushafRenderedBlockSize(
  fitInlineSize: number,
  layout: MushafPageLayout,
  zoomPercent: number,
): number {
  if (!Number.isFinite(fitInlineSize) || fitInlineSize <= 0) return 0;
  const composedBlockSize = computeMushafComposedBlockSize(
    fitInlineSize,
    layout,
  );
  const normalizedZoom = normalizeMushafZoom(
    zoomPercent,
    MUSHAF_ZOOM_DEFAULT,
  );
  return Math.max(1, Math.round(composedBlockSize * (normalizedZoom / 100)));
}
import {
  MUSHAF_ZOOM_DEFAULT,
  normalizeMushafZoom,
} from "./devicePreferences.ts";

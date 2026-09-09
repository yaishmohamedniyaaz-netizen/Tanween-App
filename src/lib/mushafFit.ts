export type MushafPageLayout = "full" | "spread";

export const STABLE_MUSHAF_STAGE_QUERY =
  "(min-width: 901px) and (min-height: 620px)";
export const MUSHAF_FRAME_INSET = 6;
export const MUSHAF_SPREAD_FRAME_INSET = 4;

export const MUSHAF_PAGE_ASPECT_RATIO = 0.68;
export const MUSHAF_PAGE_MAX_INLINE_SIZE = 760;
export const MUSHAF_SPREAD_GAP = 12;
/** A 36px control row plus one 4px spacing unit above a two-page spread. */
export const MUSHAF_SPREAD_NAV_BLOCK_SIZE = 40;

export function computeMushafComposedBlockSize(
  inlineSize: number,
  layout: MushafPageLayout,
  pageAspectRatio = MUSHAF_PAGE_ASPECT_RATIO,
): number {
  if (!Number.isFinite(inlineSize) || inlineSize <= 0) return 0;
  const pageInlineSize = layout === "spread"
    ? (inlineSize - MUSHAF_SPREAD_GAP) / 2
    : inlineSize;
  if (pageInlineSize <= 0) return 0;
  return pageInlineSize / pageAspectRatio;
}

export interface MushafFitInput {
  frameInlineSize: number;
  frameBlockSize: number;
  layout: MushafPageLayout;
  inset?: number;
  pageAspectRatio?: number;
  navigationBlockSize?: number;
}

export function computeMushafFitInlineSize({
  frameInlineSize,
  frameBlockSize,
  layout,
  inset,
  pageAspectRatio = MUSHAF_PAGE_ASPECT_RATIO,
  navigationBlockSize,
}: MushafFitInput): number {
  const resolvedInset = inset ?? (
    layout === "spread" ? MUSHAF_SPREAD_FRAME_INSET : MUSHAF_FRAME_INSET
  );
  if (
    !Number.isFinite(frameInlineSize) ||
    !Number.isFinite(frameBlockSize) ||
    !Number.isFinite(resolvedInset) ||
    frameInlineSize <= 0 ||
    frameBlockSize <= 0 ||
    resolvedInset < 0 || !Number.isFinite(pageAspectRatio) || pageAspectRatio <= 0 ||
    (navigationBlockSize !== undefined && (!Number.isFinite(navigationBlockSize) || navigationBlockSize < 0))
  ) {
    return 0;
  }

  const availableInlineSize = frameInlineSize - resolvedInset * 2;
  const reservedBlockSize = navigationBlockSize ?? (layout === "spread"
    ? MUSHAF_SPREAD_NAV_BLOCK_SIZE
    : 0);
  const availableBlockSize = frameBlockSize - resolvedInset * 2 - reservedBlockSize;
  if (availableInlineSize <= 0 || availableBlockSize <= 0) return 0;

  const maximumInlineSize = layout === "spread"
    ? MUSHAF_PAGE_MAX_INLINE_SIZE * 2 + MUSHAF_SPREAD_GAP
    : MUSHAF_PAGE_MAX_INLINE_SIZE;
  const heightLimitedInlineSize = layout === "spread"
    ? availableBlockSize * pageAspectRatio * 2 + MUSHAF_SPREAD_GAP
    : availableBlockSize * pageAspectRatio;
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
  pageAspectRatio = MUSHAF_PAGE_ASPECT_RATIO,
): number {
  if (!Number.isFinite(fitInlineSize) || fitInlineSize <= 0) return 0;
  const composedBlockSize = computeMushafComposedBlockSize(
    fitInlineSize,
    layout,
    pageAspectRatio,
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

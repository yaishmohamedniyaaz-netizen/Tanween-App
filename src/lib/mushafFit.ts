export type MushafPageLayout = "full" | "split";

export const STABLE_MUSHAF_STAGE_QUERY =
  "(min-width: 901px) and (min-height: 620px)";
export const MUSHAF_FRAME_INSET = 8;

const LAYOUT_GEOMETRY: Record<
  MushafPageLayout,
  { aspectRatio: number; maximumInlineSize: number }
> = {
  full: { aspectRatio: 0.68, maximumInlineSize: 760 },
  split: { aspectRatio: 1.24, maximumInlineSize: 1100 },
};

export function mushafLayoutAspectRatio(layout: MushafPageLayout): number {
  return LAYOUT_GEOMETRY[layout].aspectRatio;
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
  const availableBlockSize = frameBlockSize - inset * 2;
  if (availableInlineSize <= 0 || availableBlockSize <= 0) return 0;

  const geometry = LAYOUT_GEOMETRY[layout];
  return Math.max(
    0,
    Math.floor(
      Math.min(
        geometry.maximumInlineSize,
        availableInlineSize,
        availableBlockSize * geometry.aspectRatio,
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
  const composedBlockSize = fitInlineSize / mushafLayoutAspectRatio(layout);
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

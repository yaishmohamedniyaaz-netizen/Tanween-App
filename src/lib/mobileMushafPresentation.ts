import { computeMushafFitInlineSize } from './mushafFit.ts';

export const MOBILE_MUSHAF_QUERY = '(max-width: 600px) and (orientation: portrait)';
export const MOBILE_MUSHAF_DEFAULT_ZOOM = 100;
// These match the compact CSS: top breathing room + gap + 44px touch row.
export const MOBILE_MUSHAF_TOP_GAP = 16;
export const MOBILE_MUSHAF_NAV_SPACE = 48;

/** Only the added paper margin changes. Artwork pixels keep their scale. */
export function fixedPaperPresentation(compact = false) {
  const artScale = (532 - 24) / 1920;
  const width = compact ? 512 : 532;
  const inset = compact ? 2 : 12;
  const top = compact ? 8 : 16;
  const bottom = compact ? 2 : 12;
  const height = top + 3106 * artScale + bottom;
  return { width, inset, top, bottom, height, artScale, aspectRatio: width / height };
}

/** 100% means the largest complete page inside the deliberate spacing budget. */
export function mobileMushafFit(width: number, height: number) {
  const paper = fixedPaperPresentation(true);
  const maximum = computeMushafFitInlineSize({
    frameInlineSize: width, frameBlockSize: height - MOBILE_MUSHAF_TOP_GAP, inset: 0,
    layout: 'full', pageAspectRatio: paper.aspectRatio, navigationBlockSize: MOBILE_MUSHAF_NAV_SPACE,
  });
  return { base: maximum, maximum };
}

export function boundedMobileZoom(base: number, maximum: number, requested: number) {
  const width = Math.max(0, Math.floor(Math.min(maximum, base * requested / 100)));
  return { width, scale: base > 0 ? width / base : 1,
    constrained: base > 0 && maximum + 1 < base * requested / 100 };
}

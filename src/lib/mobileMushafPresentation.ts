import { computeMushafFitInlineSize } from './mushafFit.ts';

export const MOBILE_MUSHAF_QUERY = '(max-width: 600px) and (orientation: portrait)';
export const MOBILE_MUSHAF_DEFAULT_ZOOM = 110;

/** Only the added paper margin changes. Artwork pixels keep their scale. */
export function fixedPaperPresentation(compact = false) {
  const artScale = (532 - 24) / 1920;
  const width = compact ? 516 : 532;
  const inset = compact ? 4 : 12;
  const top = compact ? 8 : 16;
  const bottom = compact ? 4 : 12;
  const height = top + 3106 * artScale + bottom;
  return { width, inset, top, bottom, height, artScale, aspectRatio: width / height };
}

/** Compare zoom to the previous paper/text size, then bound the entire page. */
export function mobileMushafFit(width: number, height: number) {
  const paper = fixedPaperPresentation(true);
  const previous = fixedPaperPresentation();
  const oldFit = computeMushafFitInlineSize({
    frameInlineSize: width - 8, frameBlockSize: height - 8,
    layout: 'full', pageAspectRatio: previous.aspectRatio, navigationBlockSize: 44,
  });
  const maximum = computeMushafFitInlineSize({
    frameInlineSize: width, frameBlockSize: height - 8, inset: 0,
    layout: 'full', pageAspectRatio: paper.aspectRatio, navigationBlockSize: 48,
  });
  return { base: oldFit * paper.width / previous.width, maximum };
}

export function boundedMobileZoom(base: number, maximum: number, requested: number) {
  const width = Math.max(0, Math.floor(Math.min(maximum, base * requested / 100)));
  return { width, scale: base > 0 ? width / base : 1,
    constrained: base > 0 && maximum + 1 < base * requested / 100 };
}

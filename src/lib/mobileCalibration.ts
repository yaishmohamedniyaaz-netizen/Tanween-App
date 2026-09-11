import bounds from '../data/mobile-artwork-bounds.json' with { type: 'json' };
import artworkPackage from '../data/fixedMushafPackage.json' with { type: 'json' };

// Alpha bounds measured from the untouched, hash-verified PNG package.
// A future package must be remeasured; otherwise retain the entire image.
export const CALIBRATED_ARTWORK_VERSION = '1405-artwork-5a5f9f3846158475';

/** Default portrait presentation, including the PWA's query-free start URL.
 * App retains the portrait/prepared-or-live gates; 0 allows comparison rollback.
 * No preference or judging-state writes. */
export function mobileCalibrationEnabled(search: string) {
  return new URLSearchParams(search).get('mobileCalibration') !== '0';
}
export const MOBILE_CALIBRATION = {
  top: 6, navigation: 38, insideTop: 8, insideBottom: 8,
  referenceWidth: 512, artScale: 508 / 1920,
} as const;

export function mobileInkBounds(page: number): [number, number] {
  // Preserve the established sparse-opening composition; never stretch it to
  // the density of a full page. Unknown pages conservatively retain all ink.
  if (page <= 2 || artworkPackage.version !== CALIBRATED_ARTWORK_VERSION) return [0, 3106];
  const box = (bounds as Record<string, number[]>)[String(page)];
  return box ? [box[1], box[3]] : [0, 3106];
}

export function calibratedMobileFit(width: number, height: number, page: number) {
  const c = MOBILE_CALIBRATION, [top, bottom] = mobileInkBounds(page);
  const inkHeight = (bottom - top) * c.artScale;
  const available = Math.max(0, height - c.top - c.navigation - c.insideTop - c.insideBottom);
  const fit = Math.max(0, Math.floor(Math.min(width, available * c.referenceWidth / inkHeight)));
  return { base: fit, maximum: fit };
}

/** Image and all semantic hit regions receive the SAME offset and scale.
 * The 8px margins are screen-space values, not scaled reference-space padding.
 */
export function calibratedMobilePaper(width: number, page: number) {
  const c = MOBILE_CALIBRATION, [inkTop, inkBottom] = mobileInkBounds(page);
  const scale = Math.max(1, width) / c.referenceWidth;
  const top = c.insideTop / scale - inkTop * c.artScale;
  const bottom = c.insideBottom / scale - (3106 - inkBottom) * c.artScale;
  const height = top + 3106 * c.artScale + bottom;
  return {width:c.referenceWidth, inset:2, top, bottom, artScale:c.artScale,
    height, aspectRatio:c.referenceWidth / height};
}

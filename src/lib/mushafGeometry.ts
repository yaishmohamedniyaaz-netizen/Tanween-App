/** Reference-space dimensions. Only the outer page frame responds to viewport size. */
export const MUSHAF_REFERENCE_WIDTH = 532;
export const MUSHAF_REFERENCE_HEIGHT = MUSHAF_REFERENCE_WIDTH / 0.68;
export const MUSHAF_TEXT_INSET = 35;
export const MUSHAF_WORD_GAP_EM = 0.04;

export interface WordInkMetrics {
  advance: number;
  left: number;
  right: number;
  ascent: number;
  descent: number;
}

/** Fits intact glyph ink, including its bearings, without squeezing any letter. */
export function fitMushafLine(available: number, words: readonly WordInkMetrics[]) {
  const inkWidth = words.reduce((sum, word) => sum + word.right - word.left, 0);
  const units = inkWidth + Math.max(0, words.length - 1) * MUSHAF_WORD_GAP_EM;
  if (!(available > 0) || !(units > 0) || !Number.isFinite(units)) return null;
  return { fontSize: available / units, gap: available / units * MUSHAF_WORD_GAP_EM };
}

interface WordTargetRect { x:number; y:number; w:number; h:number; hx:number; hy:number; hw:number; hh:number }
/** Visible ink wins over a neighbor's invisible touch padding. */
export function pickMushafWord<T extends WordTargetRect>(words: readonly T[], x: number, y: number): T | null {
  const candidates = words.filter(w => x >= w.hx && x <= w.hx+w.hw && y >= w.hy && y <= w.hy+w.hh);
  const ink = candidates.filter(w => x >= w.x && x <= w.x+w.w && y >= w.y && y <= w.y+w.h);
  const score = (w: T) => ((x-w.x-w.w/2)/Math.max(w.w,4))**2 + ((y-w.y-w.h/2)/Math.max(w.h,4))**2;
  return (ink.length ? ink : candidates).reduce<T | null>((best,w) => !best || score(w)<score(best) ? w : best,null);
}

let context: CanvasRenderingContext2D | null = null;
const metricCache = new Map<string, WordInkMetrics>();
export function invalidateMushafMetrics(): void { metricCache.clear(); }
/** Called only after the exact font has loaded; values are in em units. */
export function measureMushafGlyph(text: string, family: string, fontSize = 1000): WordInkMetrics | null {
  const key = `${family}\u0000${fontSize}\u0000${text}`;
  if (!document.fonts.check(`${fontSize}px ${family}`, text)) return null;
  const cached = metricCache.get(key);
  if (cached) return cached;
  context ??= document.createElement("canvas").getContext("2d");
  if (!context) return null;
  context.font = `${fontSize}px ${family}`;
  context.direction = "rtl";
  context.textAlign = "left";
  context.textBaseline = "alphabetic";
  const value = context.measureText(text);
  const result = {
    advance: value.width / fontSize,
    left: -value.actualBoundingBoxLeft / fontSize,
    right: value.actualBoundingBoxRight / fontSize,
    ascent: value.actualBoundingBoxAscent / fontSize,
    descent: value.actualBoundingBoxDescent / fontSize,
  };
  if (!Object.values(result).every(Number.isFinite) || result.right <= result.left) return null;
  // Keep navigation through all 604 fonts from retaining the whole corpus.
  if (metricCache.size > 4000) metricCache.clear();
  metricCache.set(key, result);
  return result;
}

/** DOM rectangles include transforms and CSS zoom; offsetWidth does not. */
export function mushafPageScale(page: HTMLElement): number {
  // Compact artwork pages have a different paper width, but the same source
  // coordinates. Use the rendered surface's reference, not the desktop width.
  const declaredWidth = Number(page.dataset.referenceWidth);
  const referenceWidth = Number.isFinite(declaredWidth) && declaredWidth > 0
    ? declaredWidth : MUSHAF_REFERENCE_WIDTH;
  return page.getBoundingClientRect().width / referenceWidth || 1;
}

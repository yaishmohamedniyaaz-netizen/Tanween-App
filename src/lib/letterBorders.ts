import { TARGET_RULE_VERSION } from "./judgingUnits.ts";

/**
 * Owner-approved letter borders on the 1405H page artwork.
 *
 * Written by scripts/letter-masks/export_app_borders.py into
 * public/letter-borders/p{N}.json. A word that is not listed (or was approved
 * under other letter units) has no letter bar: it keeps the plain word
 * highlight, so a missing border never draws a bar under the wrong letter.
 */
export interface LetterBorderWord {
  /** The word's letter targets, in reading order. */
  tids: string[];
  /** Borders in artwork px (1920-wide page), right to left: letter i spans x[i+1]..x[i]. */
  x: number[];
}

export interface LetterBorderPage {
  page: number;
  ruleVersion: string;
  words: Record<string, LetterBorderWord>;
}

/** Bar thickness: 2.25 px on the 473.6 px desktop page, in artwork px. */
export const LETTER_BAR_ARTWORK_PX = (2.25 * 1920) / 473.624;

export interface LetterBarGeometry {
  /** Offset from the word region's left edge, as a share of its width. */
  left: number;
  /** Bar width and thickness, as shares of the word region's width. */
  width: number;
  thickness: number;
}

/**
 * Where the bar for one letter sits inside its word's artwork region
 * ([x0, y0, x1, y1] in artwork px), or null when no approved border exists.
 */
export function letterBarGeometry(
  page: LetterBorderPage | null | undefined,
  wid: string,
  tid: string,
  region: readonly number[] | undefined,
): LetterBarGeometry | null {
  if (!page || page.ruleVersion !== TARGET_RULE_VERSION || !region) return null;
  const word = page.words[wid];
  if (!word || word.x.length !== word.tids.length + 1) return null;
  const index = word.tids.indexOf(tid);
  if (index < 0) return null;
  const right = word.x[index];
  const left = word.x[index + 1];
  const regionWidth = region[2] - region[0];
  if (!(right > left) || !(regionWidth > 0)) return null;
  return {
    left: (left - region[0]) / regionWidth,
    width: (right - left) / regionWidth,
    thickness: LETTER_BAR_ARTWORK_PX / regionWidth,
  };
}

let indexPromise: Promise<Set<number>> | null = null;
const pagePromises = new Map<number, Promise<LetterBorderPage | null>>();

/** Approved borders for one page, or null when that page has none (or offline). */
export function loadLetterBorders(page: number): Promise<LetterBorderPage | null> {
  const cached = pagePromises.get(page);
  if (cached) return cached;
  indexPromise ??= fetch("/letter-borders/index.json")
    .then((response) => (response.ok ? response.json() : { pages: [] }))
    .then((index: { pages?: number[] }) => new Set(index.pages ?? []))
    .catch(() => {
      indexPromise = null; // offline now; try again on a later page view
      return new Set<number>();
    });
  const promise = indexPromise.then(async (pages) => {
    if (!pages.has(page)) return null;
    const response = await fetch(`/letter-borders/p${page}.json`);
    if (!response.ok) return null;
    const data = (await response.json()) as LetterBorderPage;
    return data.page === page ? data : null;
  }).catch(() => null);
  pagePromises.set(page, promise);
  // A failed fetch may succeed later (back online): do not keep the miss.
  promise.then((data) => { if (!data) pagePromises.delete(page); });
  return promise;
}

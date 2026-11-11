import { TARGET_RULE_VERSION } from "./judgingUnits.ts";
import { printedBasmalaBars } from "./printedBasmala.ts";
import type { BasmalaStyle } from "./markingPreferences.ts";

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
  /** Guesses only: never present on approved words. */
  confidence?: "high" | "medium" | "low";
  /**
   * DigitalKhatt-guided bars only: each letter's own span [left, right] in
   * artwork px, in reading order. Used instead of `x`, so gaps between
   * letters stay gaps.
   */
  bars?: [number, number][];
}

/**
 * Prototype switch for words the owner has not approved, using the learned
 * guesses (docs/CODEX_TASK_LETTER_BORDERS_ALL_PAGES.md): off; high-confidence
 * guesses only; every guess with a short centred bar (hides small border
 * errors); every guess with the full bar.
 */
export type GuessedUnderlines = "off" | "high" | "short" | "full";
/** Share of the guessed letter width used by the short bar (measured in the Codex task). */
export const SHORT_BAR_SHARE = 0.4;

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
  if (!word) return null;
  const index = word.tids.indexOf(tid);
  if (index < 0) return null;
  let right: number;
  let left: number;
  if (word.bars) {
    if (word.bars.length !== word.tids.length) return null;
    [left, right] = word.bars[index];
  } else {
    if (word.x.length !== word.tids.length + 1) return null;
    right = word.x[index];
    left = word.x[index + 1];
  }
  const regionWidth = region[2] - region[0];
  if (!(right > left) || !(regionWidth > 0)) return null;
  return {
    left: (left - region[0]) / regionWidth,
    width: (right - left) / regionWidth,
    thickness: LETTER_BAR_ARTWORK_PX / regionWidth,
  };
}

/**
 * The underline for one marked letter: the approved border first; otherwise,
 * when the prototype switch allows it, the learned guess.
 */
export function underlineGeometry(
  approved: LetterBorderPage | null | undefined,
  guessed: LetterBorderPage | null | undefined,
  mode: GuessedUnderlines,
  wid: string,
  tid: string,
  region: readonly number[] | undefined,
): LetterBarGeometry | null {
  const exact = letterBarGeometry(approved, wid, tid, region);
  if (exact || mode === "off" || !guessed) return exact;
  const word = guessed.words[wid];
  if (!word || (mode === "high" && word.confidence !== "high")) return null;
  const bar = letterBarGeometry(guessed, wid, tid, region);
  if (!bar || mode !== "short") return bar;
  const width = bar.width * SHORT_BAR_SHARE;
  return { ...bar, left: bar.left + (bar.width - width) / 2, width };
}

/**
 * The surah Basmalas of one page as a border page, for the chosen Basmala
 * style. The run does not cover them; their bars are measured once per style
 * and reviewed by the owner, so they show like approved borders.
 */
export function basmalaBarPage(page: number, style: BasmalaStyle): LetterBorderPage {
  const words: Record<string, LetterBorderWord> = {};
  for (const [wid, word] of Object.entries(printedBasmalaBars(page, style))) {
    words[wid] = { tids: word.tids, x: [], bars: word.bars };
  }
  return { page, ruleVersion: TARGET_RULE_VERSION, words };
}

/** One page of public/letter-bars-dk as written by the DigitalKhatt-guided run. */
interface DkBarPage {
  page: number;
  ruleVersion: string;
  words: Record<string, { tids: string[]; bars: ([number, number] | null)[]; status: "ok" | "review"; checks: string[] }>;
}

/**
 * DigitalKhatt-guided bars as guesses. Words that passed the automatic checks
 * are "high"; other words are "low". Words judged wrong when viewed, and words
 * without one valid bar per letter, are left out (they keep the word highlight).
 */
export function fromDkBars(data: DkBarPage): LetterBorderPage {
  const words: Record<string, LetterBorderWord> = {};
  for (const [wid, word] of Object.entries(data.words)) {
    if (word.checks.some((check) => /^visual-.*-wrong$/.test(check))) continue;
    if (word.bars.length !== word.tids.length) continue;
    if (!word.bars.every((bar) => bar && bar[1] > bar[0])) continue;
    words[wid] = {
      tids: word.tids,
      x: [],
      bars: word.bars as [number, number][],
      confidence: word.status === "ok" ? "high" : "low",
    };
  }
  return { page: data.page, ruleVersion: data.ruleVersion, words };
}

function borderLoader(folder: string, convert: (data: never) => LetterBorderPage = (data) => data) {
  let indexPromise: Promise<Set<number>> | null = null;
  const pagePromises = new Map<number, Promise<LetterBorderPage | null>>();
  return (page: number): Promise<LetterBorderPage | null> => {
    const cached = pagePromises.get(page);
    if (cached) return cached;
    indexPromise ??= fetch(`/${folder}/index.json`)
      .then((response) => (response.ok ? response.json() : { pages: [] }))
      .then((index: { pages?: number[] }) => new Set(index.pages ?? []))
      .catch(() => {
        indexPromise = null; // offline now; try again on a later page view
        return new Set<number>();
      });
    const promise = indexPromise.then(async (pages) => {
      if (!pages.has(page)) return null;
      const response = await fetch(`/${folder}/p${page}.json`);
      if (!response.ok) return null;
      const data = convert((await response.json()) as never);
      return data.page === page ? data : null;
    }).catch(() => null);
    pagePromises.set(page, promise);
    // A failed fetch may succeed later (back online): do not keep the miss.
    promise.then((data) => { if (!data) pagePromises.delete(page); });
    return promise;
  };
}

/** Approved borders for one page, or null when that page has none (or offline). */
export const loadLetterBorders = borderLoader("letter-borders");
/**
 * Unapproved bars for one page (prototype only): the DigitalKhatt-guided run,
 * which replaced the old learned guesses (removed before release).
 */
export const loadLetterBorderGuesses = borderLoader("letter-bars-dk", fromDkBars);

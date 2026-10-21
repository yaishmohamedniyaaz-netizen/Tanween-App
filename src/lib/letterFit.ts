import {
  HAFS_ASCENT,
  HAFS_DESCENT,
  HAFS_UNITS_PER_EM,
  LETTER_INK,
  SHARED_BASELINE_MID,
  TAILED_LETTERS,
  type LetterInk,
} from "./letterFitData.ts";

/**
 * Where a single Hafs letter sits inside its 40px category tile in the
 * mistake tray.
 *
 * Why this is needed: the Hafs font reserves a tall ascent (2400 units) and a
 * shorter descent (1200). When a letter is centred in a box by CSS, its
 * baseline lands 600 units below the box centre, so letters with tails
 * (ع ح م ر و …) hang low and letters like ا ل sit high.
 *
 * - "optical": move each letter so the middle of its own ink sits on the tile
 *   centre, both up-down and left-right. (Chosen, 13 Oct 2026 review.)
 * - "lift-tailed": move only the tailed letters, all by the same amount.
 * - "shared-baseline": smaller (22px) letters, all on one baseline, like a
 *   line of the Mushaf.
 * - "none": the font's own placement.
 */
export type LetterFit = "optical" | "lift-tailed" | "shared-baseline" | "none";

/** How the tile shows the category. Tonal is the default; hairline is kept as an option. */
export type LetterTileStyle = "tonal" | "hairline";

export const LETTER_FIT: LetterFit = "optical";
export const LETTER_TILE_STYLE: LetterTileStyle = "tonal";

export const LETTER_TILE_FONT_SIZE = 33;
export const SHARED_BASELINE_FONT_SIZE = 27;

export interface LetterPlacement {
  fontSize: number;
  /** px, positive moves right */
  dx: number;
  /** px, positive moves down */
  dy: number;
}

/**
 * With the glyph's line box centred in the tile, the baseline sits this many
 * font units below the tile centre, for any line-height:
 * line top = centre - L/2, baseline = line top + (L - (A + D))/2 + A = centre + (A - D)/2.
 */
const BASELINE_BELOW_CENTRE = (HAFS_ASCENT - HAFS_DESCENT) / 2;

const toPx = (units: number, fontSize: number) => (units * fontSize) / HAFS_UNITS_PER_EM;
const round1 = (n: number) => Math.round(n * 10) / 10 || 0;
const inkMiddleY = (ink: LetterInk) => (ink[2] + ink[4]) / 2;

/** Average optical lift of the tailed letters, in font units (negative = up). */
const TAILED_LIFT_UNITS =
  TAILED_LETTERS.reduce((sum, ch) => sum + (inkMiddleY(LETTER_INK[ch]) - BASELINE_BELOW_CENTRE), 0) /
  TAILED_LETTERS.length;

export function placeLetter(glyph: string, fit: LetterFit = LETTER_FIT): LetterPlacement {
  if (!Object.prototype.hasOwnProperty.call(LETTER_INK, glyph)) return { fontSize: LETTER_TILE_FONT_SIZE, dx: 0, dy: 0 };
  if (fit === "shared-baseline") {
    const fontSize = SHARED_BASELINE_FONT_SIZE;
    return { fontSize, dx: 0, dy: round1(toPx(SHARED_BASELINE_MID - BASELINE_BELOW_CENTRE, fontSize)) };
  }
  const fontSize = LETTER_TILE_FONT_SIZE;
  const ink = LETTER_INK[glyph];
  // Unknown glyphs (for example "—" for unreadable evidence) keep the font's placement.
  if (!ink || fit === "none") return { fontSize, dx: 0, dy: 0 };
  if (fit === "lift-tailed") {
    const dy = TAILED_LETTERS.includes(glyph) ? toPx(TAILED_LIFT_UNITS, fontSize) : 0;
    return { fontSize, dx: 0, dy: round1(dy) };
  }
  const [advance, xMin, , xMax] = ink;
  return {
    fontSize,
    dx: round1(toPx(advance / 2 - (xMin + xMax) / 2, fontSize)),
    dy: round1(toPx(inkMiddleY(ink) - BASELINE_BELOW_CENTRE, fontSize)),
  };
}

/** Inline style for the glyph inside the tile. Only font-size and transform change. */
export function letterTileGlyphStyle(glyph: string, fit: LetterFit = LETTER_FIT) {
  const { fontSize, dx, dy } = placeLetter(glyph, fit);
  return {
    fontSize: `${fontSize}px`,
    transform: dx || dy ? `translate(${dx}px, ${dy}px)` : undefined,
  };
}

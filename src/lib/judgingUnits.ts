import type { TokenRole } from "../types";
import { graphemesOf, isNonRecitationWord } from "./tokenize.ts";

export type JudgingUnitKind = "letter" | "hamza" | "allah-lam";

/** A recitation/judging target, independent from browser grapheme boundaries. */
export interface JudgingUnit {
  start: number;
  end: number;
  /** Compact glyph shown in the picker/log; geometry may cover a wider ligature. */
  glyph: string;
  base: string;
  kind: JudgingUnitKind;
  /** Old grapheme indices absorbed by this unit, used to keep saved marks valid. */
  legacyGraphemeIndices: number[];
}

const isOrdinaryArabicLetter = (character: string): boolean => {
  const codePoint = character.codePointAt(0) ?? 0;
  return (
    (codePoint >= 0x0621 && codePoint <= 0x063a) ||
    (codePoint >= 0x0641 && codePoint <= 0x064a) ||
    codePoint === 0x0671
  );
};

function ordinaryBase(cluster: string): string | null {
  return [...cluster].find(isOrdinaryArabicLetter) ?? null;
}

/** KFGQPC encodes a visually standalone hamza as tatweel + combining hamza. */
function isEncodedStandaloneHamza(cluster: string): boolean {
  return (
    !ordinaryBase(cluster) &&
    cluster.includes("\u0640") &&
    cluster.includes("\u0654")
  );
}

function mergeAllahLam(word: string, units: JudgingUnit[]): JudgingUnit[] {
  const next = [...units];
  for (let index = 0; index <= next.length - 4; index += 1) {
    const bases = next.slice(index, index + 4).map((unit) => unit.base);
    const beginsAllah = bases[0] === "\u0671" || bases[0] === "\u0627";
    if (
      beginsAllah &&
      bases[1] === "\u0644" &&
      bases[2] === "\u0644" &&
      bases[3] === "\u0647"
    ) {
      const firstLam = next[index + 1];
      const secondLam = next[index + 2];
      next.splice(index + 1, 2, {
        start: firstLam.start,
        end: secondLam.end,
        glyph: word.slice(secondLam.start, secondLam.end),
        base: "\u0644",
        kind: "allah-lam",
        legacyGraphemeIndices: [
          ...firstLam.legacyGraphemeIndices,
          ...secondLam.legacyGraphemeIndices,
        ],
      });
      index += 2;
    }
  }
  return next;
}

/**
 * Convert KFGQPC Unicode text into stable judging units.
 *
 * Ordinary letters become individual units. Combining marks, pause signs,
 * dagger alif, small waw/ya and elongation signs stay with their host letter.
 * The font-specific tatweel+hamza encoding becomes a real hamza unit. Allah's
 * two shaped lams are intentionally one judging target, matching the audible
 * and visual target expected by the judging workflow.
 */
export function judgingUnitsOf(
  word: string,
  wordRole: TokenRole,
): JudgingUnit[] {
  if (wordRole !== "letter" || isNonRecitationWord(word)) return [];

  const graphemes = graphemesOf(word, wordRole);
  const units: JudgingUnit[] = [];
  const leadingIndices: number[] = [];
  let leadingStart: number | null = null;

  graphemes.forEach((grapheme, graphemeIndex) => {
    const base = ordinaryBase(grapheme.glyph);
    const encodedHamza = isEncodedStandaloneHamza(grapheme.glyph);
    if (base || encodedHamza) {
      const start = leadingStart ?? grapheme.start;
      const legacyGraphemeIndices = [...leadingIndices, graphemeIndex];
      units.push({
        start,
        end: grapheme.end,
        glyph: word.slice(start, grapheme.end),
        base: base ?? "\u0621",
        kind: encodedHamza ? "hamza" : "letter",
        legacyGraphemeIndices,
      });
      leadingIndices.length = 0;
      leadingStart = null;
      return;
    }

    const previous = units[units.length - 1];
    if (previous) {
      previous.end = grapheme.end;
      previous.glyph = word.slice(previous.start, previous.end);
      previous.legacyGraphemeIndices.push(graphemeIndex);
    } else {
      leadingStart ??= grapheme.start;
      leadingIndices.push(graphemeIndex);
    }
  });

  // A font-specific sign with no neighbouring base still needs one reachable
  // target; ornaments have already been removed above.
  if (!units.length && graphemes.length) {
    units.push({
      start: 0,
      end: word.length,
      glyph: word,
      base: word,
      kind: "letter",
      legacyGraphemeIndices: graphemes.map((_, index) => index),
    });
  } else if (leadingIndices.length) {
    const first = units[0];
    first.start = leadingStart ?? first.start;
    first.glyph = word.slice(first.start, first.end);
    first.legacyGraphemeIndices.unshift(...leadingIndices);
  }

  return mergeAllahLam(word, units);
}

export function judgingUnitId(wordId: string, unitIndex: number): string {
  return `${wordId}@u${unitIndex}`;
}

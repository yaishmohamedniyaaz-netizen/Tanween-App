import type { TokenRole } from "../types";

/** A grapheme cluster within a word: base letter plus its attached marks. */
export interface Grapheme {
  start: number; // code-unit offset within the word string
  end: number;
  glyph: string;
  role: TokenRole;
}

const ARABIC_INDIC = /^[٠-٩۰-۹]+$/;

/** True if the whole word is just the ornate ayah-number marker. */
export function isAyahEndWord(word: string): boolean {
  return ARABIC_INDIC.test(word.trim());
}

/** Standalone print ornaments that are displayed but never recited. */
export function isNonRecitationWord(word: string): boolean {
  return /^[\u06DE\u06E9]+$/u.test(word.trim());
}

const segmenter =
  typeof Intl !== "undefined" && "Segmenter" in Intl
    ? new Intl.Segmenter("ar", { granularity: "grapheme" })
    : null;

/**
 * Split a word into grapheme clusters (each = one pressable letter unit).
 * Uses Intl.Segmenter so combining harakāt/sukūn/madd stay attached to their
 * base letter, which is exactly the prototype's press granularity.
 */
export function graphemesOf(word: string, wordRole: TokenRole): Grapheme[] {
  const out: Grapheme[] = [];
  if (segmenter) {
    for (const seg of segmenter.segment(word)) {
      const glyph = seg.segment;
      if (glyph.trim() === "") continue;
      out.push({
        start: seg.index,
        end: seg.index + glyph.length,
        glyph,
        role: wordRole,
      });
    }
    return out;
  }
  // Fallback: code-point split (older runtimes).
  let i = 0;
  for (const ch of word) {
    if (ch.trim() !== "") {
      out.push({ start: i, end: i + ch.length, glyph: ch, role: wordRole });
    }
    i += ch.length;
  }
  return out;
}

/**
 * What a letter tile shows when tashkeel is on.
 *
 * The tile shows one letter standing alone, without the letter after it. Two
 * things then go wrong in the Hafs font:
 * - A dagger alif (U+0670) after a haraka has no joint to sit on, so the font
 *   draws it through the fatha or shadda (مَٰ, صَّٰ). On letters that join
 *   forward we give it a short tatweel to sit on, as it does in the word.
 *   Letters that never join forward already draw it beside the haraka.
 * - Pause signs (U+06D6 to U+06DC) belong to the end of the word, not to the
 *   letter, and stack above the haraka at the tile's top edge.
 * Display only: the saved letter keeps its exact source text.
 */
const PAUSE_SIGNS = /[ۖ-ۜ]/gu;
const DAGGER_AFTER_MARK = /([ً-ٟۡ])(ٰ)/u;
const JOINS_FORWARD = new Set([..."بتثجحخسشصضطظعغفقكلمنهيىئـ"]);

export function tileGlyph(glyph: string): string {
  const text = glyph.replace(PAUSE_SIGNS, "");
  if (!JOINS_FORWARD.has(text.charAt(0))) return text;
  return text.replace(DAGGER_AFTER_MARK, "$1ـ$2");
}

/**
 * What a letter tile shows when tashkeel is on.
 *
 * The tile shows one letter standing alone, without the letter after it. In
 * the Hafs font some marks then collide with the letter or with each other.
 * Each case below was found by shaping every tile in the Quran with the app's
 * own font and measuring the ink (scripts/tile-glyph-overlap.py).
 *
 * - Pause signs (U+06D6 to U+06DC) belong to the end of the word, not to the
 *   letter, and stack above the haraka at the tile's top edge: left off.
 * - A dagger alif (U+0670) after a haraka has no joint to sit on, so the font
 *   draws it through the fatha or shadda (مَٰ, صَّٰ). On letters that join
 *   forward it sits on a short tatweel, as it does in the word; kaf needs a
 *   longer one because of its top stroke. Letters that never join forward
 *   already draw it beside the haraka.
 * - Ain, ghain and kaf before a madd alif are drawn as one shape with the
 *   fatha touching the alif (عَا): a short tatweel separates them.
 * - Ya-hamza with a mark below (ئِ): the alone form's tail hides the kasra.
 *   It is shown in its joined form (ئِـ), as in the word.
 * - Hamza on a tatweel (ـَٔ): the haraka runs into the tatweel. Shown as a
 *   plain hamza (ءَ), the same letter the tray shows without tashkeel.
 *
 * Display only: the saved letter keeps its exact source text.
 */
const PAUSE_SIGNS = /[ۖ-ۜ]/gu;
const DAGGER_AFTER_MARK = /([ً-ٟۡ])(ٰ)/u;
const JOINS_FORWARD = new Set([..."بتثجحخسشصضطظعغفقكلمنهيىئـ"]);
const MARKS = "[\\u064B-\\u065F\\u0670\\u06DF-\\u06ED]";
const ALIF_AFTER_LIGATING_LETTER = new RegExp(`^([عغك]${MARKS}+)(ا)`, "u");
const YA_HAMZA_MARK_BELOW = new RegExp(`^ئ${MARKS}*[\\u0650\\u064D\\u0656]${MARKS}*$`, "u");
const TATWEEL_HAMZA = /^ـٔ/u;
const TATWEEL = "ـ";
const ZWJ = "‍";

export function tileGlyph(glyph: string): string {
  let text = glyph.replace(PAUSE_SIGNS, "");
  text = text.replace(TATWEEL_HAMZA, "ء");
  if (YA_HAMZA_MARK_BELOW.test(text)) return text + ZWJ;
  if (!JOINS_FORWARD.has(text.charAt(0))) return text;
  const tatweels = text.charAt(0) === "ك" ? TATWEEL + TATWEEL : TATWEEL;
  text = text.replace(DAGGER_AFTER_MARK, `$1${tatweels}$2`);
  return text.replace(ALIF_AFTER_LIGATING_LETTER, `$1${TATWEEL}$2`);
}

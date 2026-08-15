import type { Mistake } from "../types";

export type MistakeGlyphEvidence = Pick<
  Mistake,
  "primaryGlyph" | "fullGlyph" | "glyph"
>;

function readable(value: string | undefined): value is string {
  return Boolean(value?.trim());
}

/** Clean semantic label for compact judge-facing surfaces. */
export function mistakePrimaryGlyph(mistake: MistakeGlyphEvidence): string {
  if (readable(mistake.primaryGlyph)) return mistake.primaryGlyph;
  if (readable(mistake.glyph)) return mistake.glyph;
  return "—";
}

/** Exact marked form retained for Quran context and historical evidence. */
export function mistakeFullGlyph(mistake: MistakeGlyphEvidence): string {
  if (readable(mistake.fullGlyph)) return mistake.fullGlyph;
  if (readable(mistake.glyph)) return mistake.glyph;
  return "—";
}

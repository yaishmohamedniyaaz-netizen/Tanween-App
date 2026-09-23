import type { Mistake } from "../types";
import { isPhraseMistake } from "./phraseEvidence.ts";

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

/** A phrase reference is never interpreted as a Quran coordinate. */
export function mistakeLocationReference(mistake: Mistake): string {
  if (isPhraseMistake(mistake)) return mistake.phrase.phraseId === "closing" ? "Ending phrase" : "Starting phrase";
  return `${mistake.surah}:${mistake.ayah === null ? "Basmala" : mistake.ayah}`;
}

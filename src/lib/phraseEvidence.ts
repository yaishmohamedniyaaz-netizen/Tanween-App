import type { JudgingEvent, Mistake, PhraseMistake, PhraseTarget } from "../types.ts";
import { judgingTargetsOf, TARGET_RULE_VERSION } from "./judgingUnits.ts";
import { RECITATION_PHRASES } from "./recitationPhrases.ts";

export const PHRASE_CATALOGUE_VERSION = "tanween-phrases-v1" as const;
export const PHRASE_READER_VERSION = 3 as const;

export function isPhraseMistake(mistake: Mistake): mistake is PhraseMistake {
  return mistake.evidenceKind === "phrase";
}

export function phraseWordId(target: PhraseTarget): string {
  return `phrase:${target.catalogueVersion}:${encodeURIComponent(target.occurrenceId)}:${target.phraseId}:${target.wordIndex}`;
}

function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

/** Validate exact source and semantic offsets, not just a plausible Arabic label. */
export function isPhraseMistakeSnapshot(value: unknown): value is PhraseMistake {
  if (!record(value) || value.evidenceKind !== "phrase" || !record(value.phrase)) return false;
  const target = value.phrase;
  if (target.catalogueVersion !== PHRASE_CATALOGUE_VERSION ||
      typeof target.occurrenceId !== "string" || !target.occurrenceId.trim() || target.occurrenceId.length > 128 ||
      !Number.isInteger(target.wordIndex) || (target.wordIndex as number) < 0 ||
      value.surah !== undefined || value.ayah !== undefined || value.page !== undefined ||
      value.targetVersion !== 2 || value.sourceVersion !== PHRASE_CATALOGUE_VERSION ||
      value.ruleVersion !== TARGET_RULE_VERSION || typeof value.judgeSeatId !== "string" || !value.judgeSeatId.trim() ||
      typeof value.id !== "string" || !value.id.trim() || typeof value.label !== "string" ||
      !["jali", "khafi", "fasaha"].includes(value.category as string) ||
      typeof value.amount !== "number" || !Number.isFinite(value.amount) || value.amount < 0 ||
      typeof value.ts !== "number" || !Number.isFinite(value.ts) || value.ts < 0 || value.ts > 8_640_000_000_000_000 ||
      (value.note !== undefined && typeof value.note !== "string")) return false;
  const phrase = RECITATION_PHRASES.find(item => item.id === target.phraseId);
  const word = phrase?.words[target.wordIndex as number];
  if (!word || value.wordText !== word) return false;
  let wordId: string;
  try { wordId = phraseWordId(target as unknown as PhraseTarget); }
  catch { return false; } // Malformed Unicode must be rejected, not crash validation.
  if (value.wordId !== wordId) return false;
  const unit = judgingTargetsOf(word, "letter", wordId).find(item => item.tid === value.tid);
  return !!unit && value.sourceStart === unit.start && value.sourceEnd === unit.end &&
    value.fullGlyph === unit.fullGlyph && value.glyph === unit.fullGlyph && value.primaryGlyph === unit.primaryGlyph;
}

/** Includes undone findings: an older reader must preserve the full audit trail. */
export function hasPhraseEvidence(value: { mistakes?: readonly Mistake[]; events?: readonly JudgingEvent[] }): boolean {
  return Boolean(value.mistakes?.some(isPhraseMistake) || value.events?.some(event =>
    "mistake" in event && isPhraseMistake(event.mistake)));
}

/** Unknown discriminators must not silently fall back to Quran evidence. */
export function hasNonQuranEvidence(value: unknown): boolean {
  if (!record(value)) return false;
  const nonQuran = (item: unknown) => record(item) &&
    ((item.evidenceKind !== undefined && item.evidenceKind !== "quran") || item.phrase !== undefined ||
      (typeof item.tid === "string" && item.tid.startsWith("phrase:")) ||
      (typeof item.wordId === "string" && item.wordId.startsWith("phrase:")) ||
      (typeof item.sourceVersion === "string" && item.sourceVersion.startsWith("tanween-phrases-")));
  return (Array.isArray(value.mistakes) && value.mistakes.some(nonQuran)) ||
    (Array.isArray(value.events) && value.events.some(event => record(event) && nonQuran(event.mistake)));
}

export function stateHasNonQuranEvidence(value: unknown): boolean {
  return hasNonQuranEvidence(value) || (record(value) && Array.isArray(value.history) && value.history.some(hasNonQuranEvidence));
}

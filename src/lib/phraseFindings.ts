import { wordFindingCounts } from "../lib/wordFindingSummary.ts";
import type { CategoryId } from "../types";

export interface PhraseFinding {
  id: string;
  targetId: string;
  occurrenceId: string;
  category: CategoryId;
  amount: number;
  wordKey: string;
  word: string;
  letter: string;
  phraseId: string;
}
export const PHRASE_HELP_KEY = "tanween.phrases.help.v1";

export function phraseWordSummary(findings: readonly PhraseFinding[], categories: readonly CategoryId[]) {
  const counts = wordFindingCounts(findings, undefined, categories);
  return { category: counts[0]?.category ?? null, total: counts.reduce((sum, item) => sum + item.count, 0) };
}

export function recordPhraseFinding(current: readonly PhraseFinding[], finding: PhraseFinding): PhraseFinding[] {
  // UI proof only: not an official judging event or saved score.
  return [...current.filter(item => item.targetId !== finding.targetId || item.occurrenceId !== finding.occurrenceId), finding];
}

import type { JudgingState, PhraseMistake, PhraseTarget } from "../types.ts";
import type { PhraseFinding } from "./phraseFindings.ts";
import { judgingTargetsOf, TARGET_RULE_VERSION } from "./judgingUnits.ts";
import { isPhraseMistake, PHRASE_CATALOGUE_VERSION, phraseWordId } from "./phraseEvidence.ts";
import { RECITATION_PHRASES } from "./recitationPhrases.ts";
import { uid } from "./id.ts";

/** Never write phrase evidence through the legacy development proof provider. */
export function phrasePracticeEnabled(state: JudgingState): boolean {
  if (typeof location === "undefined") return false;
  const params = new URLSearchParams(location.search);
  const enabled = import.meta.env?.PROD || import.meta.env?.DEV &&
    params.get("phraseHeader") === "1" && params.get("sessionStorage") === "3";
  return !!enabled && state.sessionActive && !!state.activeSessionId && !!state.activeAssignment;
}

/** Imported conflict copies retain the original recitation's evidence identity. */
export function phraseRecitationId(state: Pick<JudgingState, "events" | "activeSessionId">): string | null {
  const start = state.events.find(event => event.type === "session_started");
  return start?.type === "session_started" ? start.sessionId : state.activeSessionId;
}

/** Translate the panel's presentation target to an exact, versioned saved target. */
export function phraseMistakeFromFinding(state: JudgingState, finding: PhraseFinding): PhraseMistake | null {
  if (!state.activeSessionId || !state.activeAssignment) return null;
  const phrase = RECITATION_PHRASES.find(item => item.id === finding.phraseId);
  const wordIndex = phrase?.words.findIndex((_, index) => finding.wordKey === `${phrase.id}:${index}`) ?? -1;
  const word = phrase?.words[wordIndex];
  if (!phrase || !word || !state.activeAssignment.categories.includes(finding.category)) return null;
  const index = judgingTargetsOf(word, "letter", `phrase:recitation:${finding.wordKey}`)
    .findIndex(unit => unit.tid === finding.targetId);
  if (index < 0) return null;
  const target: PhraseTarget = {catalogueVersion: PHRASE_CATALOGUE_VERSION,
    phraseId: phrase.id, occurrenceId: phraseRecitationId(state)!, wordIndex};
  const wordId = phraseWordId(target);
  const unit = judgingTargetsOf(word, "letter", wordId)[index];
  return {id: uid("m"), evidenceKind: "phrase", phrase: target, judgeSeatId: state.activeAssignment.judgeSeatId,
    tid: unit.tid, wordId, wordText: word, glyph: unit.fullGlyph, fullGlyph: unit.fullGlyph,
    primaryGlyph: unit.primaryGlyph, sourceStart: unit.start, sourceEnd: unit.end,
    targetVersion: 2, sourceVersion: PHRASE_CATALOGUE_VERSION, ruleVersion: TARGET_RULE_VERSION,
    label: phrase.words.join(" "), category: finding.category,
    amount: state.activeAssignment.config[finding.category].step, ts: Date.now()};
}

/** Saved findings are the single source of highlighting, including after reload. */
export function phraseFindingsFromState(state: JudgingState): PhraseFinding[] {
  return state.mistakes.filter(isPhraseMistake).flatMap(mistake => {
    if (mistake.phrase.occurrenceId !== phraseRecitationId(state) || mistake.judgeSeatId !== state.activeAssignment?.judgeSeatId) return [];
    const wordKey = `${mistake.phrase.phraseId}:${mistake.phrase.wordIndex}`;
    const units = judgingTargetsOf(mistake.wordText, "letter", mistake.wordId);
    const index = units.findIndex(unit => unit.tid === mistake.tid);
    const unit = judgingTargetsOf(mistake.wordText, "letter", `phrase:recitation:${wordKey}`)[index];
    if (!unit) return [];
    return [{id: mistake.id, targetId: unit.tid, occurrenceId: mistake.phrase.occurrenceId,
      category: mistake.category, amount: mistake.amount, wordKey, word: mistake.wordText,
      letter: mistake.fullGlyph, phraseId: mistake.phrase.phraseId}];
  });
}

import {
  judgingTargetsOf,
  resolvesTargetId,
  TARGET_RULE_VERSION,
  TARGET_SCHEMA_VERSION,
  TARGET_SOURCE_VERSION,
} from "../lib/judgingUnits.ts";
import type { MushafPage, PageWord } from "../lib/page.ts";
import type { JudgingState, Mistake } from "../types.ts";

export type TargetMigrationPatch = Pick<
  Mistake,
  | "tid"
  | "targetVersion"
  | "sourceVersion"
  | "ruleVersion"
  | "wordId"
  | "sourceStart"
  | "sourceEnd"
  | "primaryGlyph"
  | "fullGlyph"
  | "originalTid"
  | "migrationStatus"
>;

export type TargetMigrationPatches = Record<
  string,
  Partial<TargetMigrationPatch>
>;

type PageLoader = (page: number) => Promise<MushafPage>;

function wordIdOf(mistake: Mistake): string | null {
  if (mistake.wordId) return mistake.wordId;
  const separator = mistake.tid.search(/[@#]/u);
  return separator > 0 ? mistake.tid.slice(0, separator) : null;
}

function wordsById(page: MushafPage): Map<string, PageWord> {
  const words = new Map<string, PageWord>();
  for (const line of page.lines) {
    if (!("words" in line)) continue;
    for (const word of line.words) words.set(word.wid, word);
  }
  return words;
}

function unresolvedPatch(mistake: Mistake): Partial<TargetMigrationPatch> {
  return {
    originalTid: mistake.originalTid ?? mistake.tid,
    migrationStatus: "unresolved",
  };
}

function patchForWord(
  mistake: Mistake,
  word: PageWord | undefined,
): Partial<TargetMigrationPatch> {
  if (!word || word.role !== "letter") return unresolvedPatch(mistake);
  const targets = judgingTargetsOf(word.text, word.role, word.wid);
  const matches = targets.filter((target) =>
    resolvesTargetId(target, mistake.tid),
  );
  if (matches.length !== 1) return unresolvedPatch(mistake);

  const target = matches[0];
  const oldOrdinalAliases = target.aliases.filter((alias) =>
    /@u\d+$/u.test(alias),
  );
  const changedId = mistake.tid !== target.tid;
  return {
    tid: target.tid,
    targetVersion: TARGET_SCHEMA_VERSION,
    sourceVersion: TARGET_SOURCE_VERSION,
    ruleVersion: TARGET_RULE_VERSION,
    wordId: word.wid,
    sourceStart: target.start,
    sourceEnd: target.end,
    primaryGlyph: target.primaryGlyph,
    fullGlyph: target.fullGlyph,
    originalTid: changedId
      ? mistake.originalTid ?? mistake.tid
      : mistake.originalTid,
    migrationStatus:
      changedId && oldOrdinalAliases.length > 1 ? "auto-merged" : "exact",
  };
}

function allMistakes(state: JudgingState): Mistake[] {
  const byId = new Map<string, Mistake>();
  for (const mistake of state.mistakes) byId.set(mistake.id, mistake);
  for (const session of state.history) {
    for (const mistake of session.mistakes) byId.set(mistake.id, mistake);
  }
  return [...byId.values()];
}

/**
 * Build non-destructive identity patches for every legacy active/history item.
 *
 * Mutable judge fields such as category, deduction, note and the historical
 * `glyph` snapshot are deliberately absent from the returned patches, so a
 * migration completing in the background cannot overwrite a concurrent edit.
 */
export async function buildTargetMigrationPatches(
  state: JudgingState,
  pageLoader: PageLoader,
): Promise<TargetMigrationPatches> {
  const legacy = allMistakes(state).filter(
    (mistake) =>
      mistake.targetVersion !== 2 ||
      mistake.sourceStart === undefined ||
      mistake.sourceEnd === undefined ||
      !mistake.wordId ||
      mistake.sourceVersion !== TARGET_SOURCE_VERSION ||
      mistake.ruleVersion !== TARGET_RULE_VERSION,
  );
  if (!legacy.length) return {};

  const byPage = new Map<number, Mistake[]>();
  for (const mistake of legacy) {
    // Items predating full-Mushaf navigation came from the bundled page 604.
    const page = mistake.page ?? 604;
    const pageMistakes = byPage.get(page);
    if (pageMistakes) pageMistakes.push(mistake);
    else byPage.set(page, [mistake]);
  }

  const patches: TargetMigrationPatches = {};
  // Pages are intentionally loaded in order rather than as an unbounded burst.
  for (const [pageNumber, mistakes] of byPage) {
    const page = await pageLoader(pageNumber);
    const words = wordsById(page);
    for (const mistake of mistakes) {
      const wordId = wordIdOf(mistake);
      patches[mistake.id] = wordId
        ? patchForWord(mistake, words.get(wordId))
        : unresolvedPatch(mistake);
    }
  }
  return patches;
}

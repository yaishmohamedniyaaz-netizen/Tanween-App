import type { RecitationRangeSnapshot } from "../types.ts";
import { MUSHAF_DATA_VERSION, MUSHAF_LAYOUT } from "./mushafContract.ts";

export const QUESTION_INDEX_VERSION = "qpc-v1-1405h-question-index-v1";

export type AyahRef = { surah: number; ayah: number };

/**
 * Compact generated tuple:
 * surah, ayah, start page/line/global-line, end page/line/global-line,
 * first word id, last word id, marker id.
 */
export type QuestionIndexTuple = [
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  string,
  string,
  string,
];

export interface QuestionIndexAsset {
  version: string;
  sourceVersion: string;
  layout: string;
  layoutHash: string;
  pageCount: number;
  recitationLineCount: number;
  entryCount: number;
  entries: QuestionIndexTuple[];
}

export interface IndexedAyah {
  surah: number;
  ayah: number;
  startPage: number;
  startLine: number;
  startGlobalLine: number;
  endPage: number;
  endLine: number;
  endGlobalLine: number;
  firstWordId: string;
  lastWordId: string;
  endMarkerId: string;
}

export interface QuestionIndexLookup {
  asset: QuestionIndexAsset;
  ayahs: IndexedAyah[];
  byKey: ReadonlyMap<string, IndexedAyah>;
  ordinalByKey: ReadonlyMap<string, number>;
}

export type FinalPrintedLineScoring = "include" | "exclude";

export interface QuestionRange {
  startAyah: AyahRef;
  endAyah: AyahRef;
  requestedLines: number;
  resolvedLines: number;
  extensionLines: number;
  startPage: number;
  startLine: number;
  endPage: number;
  endLine: number;
  startWordId: string;
  endWordId: string;
  endMarkerId: string;
  finalPrintedLineScoring: FinalPrintedLineScoring;
  sourceVersion: string;
  layoutHash: string;
}

export type QuestionRangeResolution =
  | { ok: true; range: QuestionRange }
  | {
      ok: false;
      reason: "invalid-target" | "start-not-found" | "insufficient-lines";
      availableLines?: number;
    };

const keyFor = ({ surah, ayah }: AyahRef) => `${surah}:${ayah}`;

function tupleToAyah(tuple: QuestionIndexTuple): IndexedAyah {
  return {
    surah: tuple[0],
    ayah: tuple[1],
    startPage: tuple[2],
    startLine: tuple[3],
    startGlobalLine: tuple[4],
    endPage: tuple[5],
    endLine: tuple[6],
    endGlobalLine: tuple[7],
    firstWordId: tuple[8],
    lastWordId: tuple[9],
    endMarkerId: tuple[10],
  };
}

export function createQuestionIndexLookup(
  asset: QuestionIndexAsset,
): QuestionIndexLookup {
  if (
    asset.version !== QUESTION_INDEX_VERSION ||
    asset.sourceVersion !== MUSHAF_DATA_VERSION ||
    asset.layout !== MUSHAF_LAYOUT ||
    asset.pageCount !== 604 ||
    asset.entryCount !== asset.entries.length ||
    asset.entryCount !== 6236 ||
    !asset.layoutHash.startsWith("sha256:")
  ) {
    throw new Error("Question index does not match the active Mushaf contract");
  }

  const ayahs = asset.entries.map(tupleToAyah);
  const byKey = new Map<string, IndexedAyah>();
  const ordinalByKey = new Map<string, number>();
  ayahs.forEach((ayah, ordinal) => {
    const key = keyFor(ayah);
    if (
      byKey.has(key) ||
      ayah.startGlobalLine < 0 ||
      ayah.endGlobalLine < ayah.startGlobalLine ||
      ayah.endGlobalLine >= asset.recitationLineCount ||
      !ayah.firstWordId ||
      !ayah.lastWordId ||
      !ayah.endMarkerId
    ) {
      throw new Error(`Invalid question index entry ${key}`);
    }
    byKey.set(key, ayah);
    ordinalByKey.set(key, ordinal);
  });

  return { asset, ayahs, byKey, ordinalByKey };
}

export function resolveQuestionRange(
  lookup: QuestionIndexLookup,
  startAyah: AyahRef,
  targetRecitationLines: number,
  finalPrintedLineScoring: FinalPrintedLineScoring = "exclude",
): QuestionRangeResolution {
  if (
    !Number.isInteger(targetRecitationLines) ||
    targetRecitationLines < 1 ||
    targetRecitationLines > 30
  ) {
    return { ok: false, reason: "invalid-target" };
  }

  const key = keyFor(startAyah);
  const start = lookup.byKey.get(key);
  const startOrdinal = lookup.ordinalByKey.get(key);
  if (!start || startOrdinal === undefined) {
    return { ok: false, reason: "start-not-found" };
  }

  const availableLines =
    lookup.asset.recitationLineCount - start.startGlobalLine;
  const targetGlobalLine =
    start.startGlobalLine + targetRecitationLines - 1;
  if (targetGlobalLine >= lookup.asset.recitationLineCount) {
    return { ok: false, reason: "insufficient-lines", availableLines };
  }

  const end = lookup.ayahs
    .slice(startOrdinal)
    .find((ayah) => ayah.endGlobalLine >= targetGlobalLine);
  if (!end) {
    return { ok: false, reason: "insufficient-lines", availableLines };
  }

  const resolvedLines = end.endGlobalLine - start.startGlobalLine + 1;
  return {
    ok: true,
    range: {
      startAyah: { surah: start.surah, ayah: start.ayah },
      endAyah: { surah: end.surah, ayah: end.ayah },
      requestedLines: targetRecitationLines,
      resolvedLines,
      extensionLines: resolvedLines - targetRecitationLines,
      startPage: start.startPage,
      startLine: start.startLine,
      endPage: end.endPage,
      endLine: end.endLine,
      startWordId: start.firstWordId,
      endWordId: end.lastWordId,
      endMarkerId: end.endMarkerId,
      finalPrintedLineScoring,
      sourceVersion: lookup.asset.sourceVersion,
      layoutHash: lookup.asset.layoutHash,
    },
  };
}

/**
 * Proves that a frozen result range is the exact deterministic range produced
 * by the active immutable question index. Structural validation alone is not
 * enough: a real word id paired with a different page or line must fail closed.
 */
export function recitationRangeMatchesQuestionIndex(
  lookup: QuestionIndexLookup,
  range: RecitationRangeSnapshot,
): boolean {
  if (
    range.mushafLayout !== MUSHAF_LAYOUT ||
    range.sourceVersion !== lookup.asset.sourceVersion ||
    range.questionIndexVersion !== lookup.asset.version ||
    range.layoutHash !== lookup.asset.layoutHash
  ) {
    return false;
  }
  const resolved = resolveQuestionRange(
    lookup,
    range.startAyah,
    range.requestedLines,
    range.finalPrintedLineScoring,
  );
  if (!resolved.ok) return false;
  const expected = resolved.range;
  return (
    expected.startAyah.surah === range.startAyah.surah &&
    expected.startAyah.ayah === range.startAyah.ayah &&
    expected.endAyah.surah === range.endAyah.surah &&
    expected.endAyah.ayah === range.endAyah.ayah &&
    expected.requestedLines === range.requestedLines &&
    expected.resolvedLines === range.resolvedLines &&
    expected.extensionLines === range.extensionLines &&
    expected.startPage === range.startPage &&
    expected.startLine === range.startLine &&
    expected.endPage === range.endPage &&
    expected.endLine === range.endLine &&
    expected.startWordId === range.startWordId &&
    expected.endWordId === range.endWordId &&
    expected.endMarkerId === range.endMarkerId &&
    expected.finalPrintedLineScoring === range.finalPrintedLineScoring
  );
}

let indexPromise: Promise<QuestionIndexLookup> | null = null;

export function questionIndexUrl(): string {
  return `/question-index.json?v=${QUESTION_INDEX_VERSION}`;
}

export function loadQuestionIndex(): Promise<QuestionIndexLookup> {
  if (!indexPromise) {
    indexPromise = fetch(questionIndexUrl())
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Could not load question index (${response.status})`);
        }
        return response.json() as Promise<QuestionIndexAsset>;
      })
      .then(createQuestionIndexLookup)
      .catch((error) => {
        indexPromise = null;
        throw error;
      });
  }
  return indexPromise;
}

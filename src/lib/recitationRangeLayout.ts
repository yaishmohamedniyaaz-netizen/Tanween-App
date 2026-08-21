import type { RecitationRangeSnapshot } from "../types.ts";
import type { MushafPage, PageLine } from "./page.ts";

export type RangeLineState = "question" | "mixed" | "context";

export interface ContextAyahSegment {
  id: string;
  line: number;
  surah: number;
  ayah: number | null;
  wordIds: string[];
}

export interface RangePageDisplay {
  selectedWordIds: Set<string>;
  lineStates: Map<number, RangeLineState>;
  contextAyahSegments: ContextAyahSegment[];
}

function recitedWords(line: PageLine) {
  return line.type === "surah-header"
    ? []
    : line.words.filter(
        (word) => word.role === "letter" || word.role === "ayah-end",
      );
}

function startBasmalaForRangePage(
  page: MushafPage,
  range: RecitationRangeSnapshot,
): PageLine | null {
  if (
    page.page !== range.startPage ||
    range.startAyah.ayah !== 1 ||
    range.startLine <= 1
  ) {
    return null;
  }
  return page.lines.find(
    (line) =>
      line.n === range.startLine - 1 &&
      line.type === "basmala" &&
      line.surah === range.startAyah.surah,
  ) ?? null;
}

export function linesForRangePage(
  page: MushafPage,
  range: RecitationRangeSnapshot,
): PageLine[] {
  if (page.page < range.startPage || page.page > range.endPage) return [];
  const startLine = page.page === range.startPage ? range.startLine : 1;
  const endLine = page.page === range.endPage ? range.endLine : 15;
  const recitationRows = page.lines.filter(
    (line) => line.n >= startLine && line.n <= endLine,
  );
  const startBasmala = startBasmalaForRangePage(page, range);
  return startBasmala ? [startBasmala, ...recitationRows] : recitationRows;
}

export function wordIdsForRangePage(
  page: MushafPage,
  range: RecitationRangeSnapshot,
): Set<string> | null {
  if (page.page < range.startPage || page.page > range.endPage) return new Set();
  const lines = linesForRangePage(page, range);
  const words = lines.flatMap(recitedWords);
  let start = 0;
  let end = words.length - 1;
  if (page.page === range.startPage) {
    const boundaryLine = lines.find((line) => line.n === range.startLine);
    if (
      !boundaryLine ||
      boundaryLine.type === "surah-header" ||
      !boundaryLine.words.some((word) => word.wid === range.startWordId)
    ) {
      return null;
    }
    start = startBasmalaForRangePage(page, range)
      ? 0
      : words.findIndex((word) => word.wid === range.startWordId);
  }
  if (page.page === range.endPage) {
    const boundaryLine = lines.find((line) => line.n === range.endLine);
    if (
      !boundaryLine ||
      boundaryLine.type === "surah-header" ||
      !boundaryLine.words.some((word) => word.wid === range.endMarkerId)
    ) {
      return null;
    }
    end = words.findIndex((word) => word.wid === range.endMarkerId);
  }
  if (start < 0 || end < start) return null;
  return new Set(words.slice(start, end + 1).map((word) => word.wid));
}

export function contextAyahSegmentsForPage(
  page: MushafPage,
  lineStates: Map<number, RangeLineState>,
  selectedWordIds: Set<string> = new Set(),
): ContextAyahSegment[] {
  const segments: ContextAyahSegment[] = [];

  for (const line of page.lines) {
    const lineState = lineStates.get(line.n);
    if (
      (lineState !== "context" && lineState !== "mixed") ||
      line.type === "surah-header"
    ) {
      continue;
    }
    for (const word of recitedWords(line).filter(
      (candidate) => !selectedWordIds.has(candidate.wid),
    )) {
      const ayahKey = `${word.surah}:${word.ayah ?? "b"}`;
      const previous = segments[segments.length - 1];
      if (previous && previous.id === `${line.n}:${ayahKey}`) {
        previous.wordIds.push(word.wid);
      } else {
        segments.push({
          id: `${line.n}:${ayahKey}`,
          line: line.n,
          surah: word.surah,
          ayah: word.ayah,
          wordIds: [word.wid],
        });
      }
    }
  }

  return segments;
}

/**
 * Resolves the exact visual emphasis for one already-loaded printed page.
 * A null result means the saved boundaries cannot be verified, so callers
 * must leave the complete Mushaf undimmed rather than guess.
 */
export function rangeDisplayForPage(
  page: MushafPage,
  range: RecitationRangeSnapshot,
): RangePageDisplay | null {
  const selectedWordIds = wordIdsForRangePage(page, range);
  if (selectedWordIds === null) return null;
  const rangeLineNumbers = new Set(
    linesForRangePage(page, range).map((line) => line.n),
  );
  const lineStates = new Map<number, RangeLineState>();

  for (const line of page.lines) {
    if (!rangeLineNumbers.has(line.n)) {
      lineStates.set(line.n, "context");
      continue;
    }
    const words = recitedWords(line);
    if (!words.length) {
      lineStates.set(line.n, "question");
      continue;
    }
    const selectedCount = words.filter((word) => selectedWordIds.has(word.wid)).length;
    lineStates.set(
      line.n,
      selectedCount === 0
        ? "context"
        : selectedCount === words.length
          ? "question"
          : "mixed",
    );
  }

  return {
    selectedWordIds,
    lineStates,
    contextAyahSegments: contextAyahSegmentsForPage(
      page,
      lineStates,
      selectedWordIds,
    ),
  };
}

import type { RecitationRangeSnapshot } from "../types.ts";
import type { MushafPage, PageLine } from "./page.ts";

export function linesForEvidencePage(
  page: MushafPage,
  range: RecitationRangeSnapshot,
): PageLine[] {
  if (page.page < range.startPage || page.page > range.endPage) return [];
  const startLine = page.page === range.startPage ? range.startLine : 1;
  const endLine = page.page === range.endPage ? range.endLine : 15;
  return page.lines.filter((line) => line.n >= startLine && line.n <= endLine);
}

export function wordIdsForEvidencePage(
  page: MushafPage,
  range: RecitationRangeSnapshot,
): Set<string> | null {
  if (page.page < range.startPage || page.page > range.endPage) return new Set();
  const lines = linesForEvidencePage(page, range);
  const words = lines.flatMap((line) =>
    line.type === "surah-header"
      ? []
      : line.words.filter(
          (word) => word.role === "letter" || word.role === "ayah-end",
        ),
  );
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
    start = words.findIndex((word) => word.wid === range.startWordId);
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

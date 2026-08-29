import { CATEGORY_BY_ID } from "../config.ts";
import type { CategoryId, CompetitionConfig, FinalizedResult } from "../types";
import { compareAgeGroups } from "./ageGroupOrder.ts";
import { muqarrarLabel, participantCategoryLabel } from "./participants.ts";
import { placeFinalizedResults } from "./finalResults.ts";

const RESULTS_LEADING_HEADERS = [
  "Place",
  "Participant Number",
  "Name",
  "Age Group",
  "Category",
  "Muqarrar start",
  "Institution",
] as const;

const AUDIT_HEADERS = [
  "Participant Number",
  "Name",
  "Maximum",
  "Final Marks (%)",
  "Result Revision",
  "Revision Reason",
  "Verification Manifest",
] as const;

const SCORE_LEDGER_LEADING_HEADERS = [
  "Place",
  "Participant Number",
  "Name",
  "Age Group",
  "Category",
  "Judge",
  "Assigned criteria",
] as const;

const SCORE_LEDGER_TRAILING_HEADERS = [
  "Judge total",
  "Judge maximum",
  "Judge (%)",
  "Final Marks (%)",
  "Verification Manifest",
] as const;

const CATEGORY_COLORS: Record<CategoryId, {
  tint: string;
  body: string;
  strong: string;
}> = {
  jali: { tint: "FFFCECEA", body: "FFFFF7F6", strong: "FF9E2820" },
  khafi: { tint: "FFFAF2DC", body: "FFFFFBF1", strong: "FF7C540E" },
  fasaha: { tint: "FFECEEFB", body: "FFF8F8FD", strong: "FF2F3AA3" },
  "adu-raagu": { tint: "FFEEF8F3", body: "FFF7FBF9", strong: "FF26624B" },
};

const JUDGE_COLORS = [
  { tint: "FFE8EEF5", body: "FFF8FAFC" },
  { tint: "FFF1EBDD", body: "FFFCFAF6" },
  { tint: "FFE7EFEA", body: "FFF8FBF9" },
  { tint: "FFEDE8F1", body: "FFFAF8FB" },
] as const;

const TABLE_LINE = "FFD8D7D1";
const GROUP_LINE = "FFAAA9A3";
const INK = "FF242421";

export interface FinalResultsWorkbookOptions {
  /** Injectable for deterministic verification; defaults to the device clock. */
  exportedAt?: number | Date;
}

export interface FinalResultsJudgeGroup {
  judgeSeatId: string;
  judgeName: string;
  categories: CategoryId[];
}

interface JudgeContribution {
  categories: Partial<Record<CategoryId, { score: number; max: number }>>;
  total: number;
  maximum: number;
  percentage: number;
}

type ResultsColumn =
  | { kind: "leading"; label: string }
  | {
      kind: "category";
      label: string;
      category: CategoryId;
      judge: FinalResultsJudgeGroup;
      judgeIndex: number;
    }
  | {
      kind: "judge-percentage";
      label: string;
      judge: FinalResultsJudgeGroup;
      judgeIndex: number;
    }
  | { kind: "final-percentage"; label: string };

/** Only the criteria a competition actually judged become score columns. */
export function finalResultsCategories(results: FinalizedResult[]): CategoryId[] {
  const used = new Set<CategoryId>();
  for (const result of results) {
    for (const category of Object.keys(result.byCategory) as CategoryId[]) {
      if (result.byCategory[category]) used.add(category);
    }
  }
  return (Object.keys(CATEGORY_BY_ID) as CategoryId[]).filter((category) =>
    used.has(category),
  );
}

/**
 * The current result contract has one responsible judge for each criterion.
 * Grouping those frozen category sources by seat keeps the export judge-readable
 * without pretending that duplicate criterion owners are already supported.
 */
export function finalResultsJudgeGroups(
  results: FinalizedResult[],
): FinalResultsJudgeGroup[] {
  const groups = new Map<string, FinalResultsJudgeGroup>();
  for (const result of results) {
    for (const category of finalResultsCategories([result])) {
      const score = result.byCategory[category];
      if (!score) continue;
      const judgeSeatId = score.judgeSeatId || "judge-1";
      const current = groups.get(judgeSeatId) ?? {
        judgeSeatId,
        judgeName: score.judgeName.trim() || judgeSeatId,
        categories: [],
      };
      if (current.judgeName === judgeSeatId && score.judgeName.trim()) {
        current.judgeName = score.judgeName.trim();
      }
      if (!current.categories.includes(category)) current.categories.push(category);
      groups.set(judgeSeatId, current);
    }
  }
  const categoryOrder = Object.keys(CATEGORY_BY_ID) as CategoryId[];
  return [...groups.values()]
    .map((group) => ({
      ...group,
      categories: [...group.categories].sort(
        (left, right) => categoryOrder.indexOf(left) - categoryOrder.indexOf(right),
      ),
    }))
    .sort((left, right) =>
      categoryOrder.indexOf(left.categories[0]) - categoryOrder.indexOf(right.categories[0]) ||
      left.judgeSeatId.localeCompare(right.judgeSeatId, undefined, {
        numeric: true,
        sensitivity: "base",
      }),
    );
}

export function finalResultPercentage(result: FinalizedResult): number {
  return result.totalMax > 0 ? result.total / result.totalMax : 0;
}

function judgeContribution(
  result: FinalizedResult,
  group: FinalResultsJudgeGroup,
): JudgeContribution {
  const categories: JudgeContribution["categories"] = {};
  let total = 0;
  let maximum = 0;
  group.categories.forEach((category) => {
    const score = result.byCategory[category];
    if (!score || score.judgeSeatId !== group.judgeSeatId) return;
    categories[category] = { score: score.score, max: score.max };
    total += score.score;
    maximum += score.max;
  });
  return {
    categories,
    total,
    maximum,
    percentage: maximum > 0 ? total / maximum : 0,
  };
}

function stableCategoryMaximum(
  results: FinalizedResult[],
  group: FinalResultsJudgeGroup,
  category: CategoryId,
): number | null {
  const values = new Set<number>();
  results.forEach((result) => {
    const score = result.byCategory[category];
    if (score?.judgeSeatId === group.judgeSeatId) values.add(score.max);
  });
  return values.size === 1 ? [...values][0] : null;
}

function displayMark(value: number): string {
  return Number.isInteger(value) ? String(value) : String(Math.round(value * 100) / 100);
}

function resultsColumns(results: FinalizedResult[]): ResultsColumn[] {
  const groups = finalResultsJudgeGroups(results);
  return [
    ...RESULTS_LEADING_HEADERS.map((label) => ({ kind: "leading", label }) as const),
    ...groups.flatMap((judge, judgeIndex) => [
      ...judge.categories.map((category) => {
        const maximum = stableCategoryMaximum(results, judge, category);
        return {
          kind: "category" as const,
          label: `${CATEGORY_BY_ID[category].label}${maximum === null ? "" : ` (${displayMark(maximum)})`}`,
          category,
          judge,
          judgeIndex,
        };
      }),
      {
        kind: "judge-percentage" as const,
        label: "Judge (%)",
        judge,
        judgeIndex,
      },
    ]),
    { kind: "final-percentage", label: "Final Marks (%)" } as const,
  ];
}

export function finalResultsHeaders(results: FinalizedResult[]): string[] {
  return resultsColumns(results).map((column) => column.label);
}

function safeExportDate(value?: number | Date): Date {
  const candidate = value instanceof Date
    ? new Date(value.getTime())
    : new Date(value ?? Date.now());
  return Number.isNaN(candidate.getTime()) ? new Date() : candidate;
}

function plainCellBorder(isGroupStart = false) {
  return {
    top: { style: "hair" as const, color: { argb: TABLE_LINE } },
    bottom: { style: "hair" as const, color: { argb: TABLE_LINE } },
    left: {
      style: isGroupStart ? "thin" as const : "hair" as const,
      color: { argb: isGroupStart ? GROUP_LINE : TABLE_LINE },
    },
    right: { style: "hair" as const, color: { argb: TABLE_LINE } },
  };
}

export async function buildFinalResultsWorkbook(
  results: FinalizedResult[],
  competition: CompetitionConfig,
  options: FinalResultsWorkbookOptions = {},
): Promise<ArrayBuffer> {
  const ExcelJS = (await import("exceljs")).default;
  const placed = placeFinalizedResults(results);
  placed.sort((left, right) =>
    compareAgeGroups(left.participant.ageGroup, right.participant.ageGroup) ||
    left.participant.category.localeCompare(right.participant.category) ||
    left.place - right.place ||
    left.participant.number.localeCompare(right.participant.number, undefined, {
      numeric: true,
      sensitivity: "base",
    }),
  );
  const categories = finalResultsCategories(results);
  const judgeGroups = finalResultsJudgeGroups(results);
  const columns = resultsColumns(results);
  const headers = columns.map((column) => column.label);
  const exportedAt = safeExportDate(options.exportedAt);
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Tahqeeq";
  workbook.title = `${competition.name || "Tahqeeq"} Final Marks`;
  workbook.subject = competition.isSample
    ? "Practice results — not official"
    : "Verified competition final marks";
  workbook.description = "Value-only placements, judge-owned criterion marks and verification records.";
  workbook.created = exportedAt;
  workbook.modified = exportedAt;

  const resultSheet = workbook.addWorksheet("Final marks", {
    properties: { defaultRowHeight: 24 },
    views: [{ state: "frozen", xSplit: 3, ySplit: 3, activeCell: "D4", showGridLines: false }],
    pageSetup: {
      orientation: "landscape",
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      paperSize: 9,
      margins: { left: 0.25, right: 0.25, top: 0.5, bottom: 0.5, header: 0.2, footer: 0.2 },
    },
  });
  resultSheet.pageSetup.printTitlesRow = "1:3";
  resultSheet.addRow([`${competition.name || "Tahqeeq"} — Final marks${competition.edition ? ` · ${competition.edition}` : ""}`]);
  resultSheet.mergeCells(1, 1, 1, Math.max(1, headers.length));
  resultSheet.addRow(Array(headers.length).fill(""));
  resultSheet.addRow(headers);

  resultSheet.mergeCells(2, 1, 2, RESULTS_LEADING_HEADERS.length);
  resultSheet.getCell(2, 1).value = "Participant";
  let judgeColumn = RESULTS_LEADING_HEADERS.length + 1;
  judgeGroups.forEach((group, judgeIndex) => {
    const span = group.categories.length + 1;
    resultSheet.mergeCells(2, judgeColumn, 2, judgeColumn + span - 1);
    const cell = resultSheet.getCell(2, judgeColumn);
    cell.value = group.judgeName;
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: JUDGE_COLORS[judgeIndex % JUDGE_COLORS.length].tint },
    };
    judgeColumn += span;
  });
  resultSheet.getCell(2, headers.length).value = "Result";

  placed.forEach((result) => {
    resultSheet.addRow([
      result.place,
      result.participant.number,
      result.participant.name,
      result.participant.ageGroup,
      participantCategoryLabel(result.participant.category),
      muqarrarLabel(result.participant.muqarrar),
      result.participant.institution,
      ...judgeGroups.flatMap((group) => {
        const contribution = judgeContribution(result, group);
        return [
          ...group.categories.map((category) => contribution.categories[category]?.score ?? ""),
          contribution.maximum > 0 ? contribution.percentage : "",
        ];
      }),
      finalResultPercentage(result),
    ]);
  });
  resultSheet.autoFilter = {
    from: { row: 3, column: 1 },
    to: { row: Math.max(3, resultSheet.rowCount), column: headers.length },
  };

  const widths = [8, 19, 30, 18, 27, 29, 28];
  columns.slice(RESULTS_LEADING_HEADERS.length).forEach((column) => {
    widths.push(column.kind === "category" ? 17 : column.kind === "judge-percentage" ? 13 : 15);
  });
  resultSheet.columns.forEach((column, index) => {
    column.width = widths[index] ?? 15;
  });

  const titleRow = resultSheet.getRow(1);
  titleRow.height = 38;
  const titleCell = resultSheet.getCell(1, 1);
  titleCell.font = { name: "Arial", size: 17, bold: true, color: { argb: INK } };
  titleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFFFFF" } };
  titleCell.alignment = { vertical: "middle", horizontal: "left" };
  titleCell.border = { bottom: { style: "medium", color: { argb: INK } } };

  const groupRow = resultSheet.getRow(2);
  groupRow.height = 27;
  groupRow.eachCell({ includeEmpty: true }, (cell, columnNumber) => {
    const metadata = columns[columnNumber - 1];
    const judgeIndex = metadata && "judgeIndex" in metadata ? metadata.judgeIndex : -1;
    cell.font = { name: "Arial", size: 10, bold: true, color: { argb: INK } };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: {
        argb: judgeIndex >= 0
          ? JUDGE_COLORS[judgeIndex % JUDGE_COLORS.length].tint
          : columnNumber === headers.length
            ? "FFE7EFEA"
            : "FFF0EFEA",
      },
    };
    cell.alignment = { vertical: "middle", horizontal: "center" };
    cell.border = plainCellBorder(columnNumber === 1 || columnNumber === RESULTS_LEADING_HEADERS.length + 1 || columnNumber === headers.length);
  });

  const headerRow = resultSheet.getRow(3);
  headerRow.height = 42;
  headerRow.eachCell({ includeEmpty: true }, (cell, columnNumber) => {
    const metadata = columns[columnNumber - 1];
    const category = metadata?.kind === "category" ? metadata.category : null;
    const judgeIndex = metadata && "judgeIndex" in metadata ? metadata.judgeIndex : -1;
    const isGroupStart = columnNumber === 1 ||
      columnNumber === RESULTS_LEADING_HEADERS.length + 1 ||
      (metadata?.kind === "category" && metadata.judge.categories[0] === metadata.category) ||
      metadata?.kind === "final-percentage";
    cell.font = { name: "Arial", size: 10, bold: true, color: { argb: INK } };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: {
        argb: category
          ? CATEGORY_COLORS[category].tint
          : metadata?.kind === "judge-percentage" && judgeIndex >= 0
            ? JUDGE_COLORS[judgeIndex % JUDGE_COLORS.length].tint
            : metadata?.kind === "final-percentage"
              ? "FFE7EFEA"
              : "FFFFFFFF",
      },
    };
    cell.alignment = {
      vertical: "middle",
      horizontal: columnNumber === 3 || (columnNumber >= 4 && columnNumber <= RESULTS_LEADING_HEADERS.length)
        ? "left"
        : "center",
      wrapText: true,
    };
    cell.border = plainCellBorder(isGroupStart);
    if (category) cell.border.bottom = { style: "thin", color: { argb: CATEGORY_COLORS[category].strong } };
  });

  let previousAgeGroup = "";
  for (let rowNumber = 4; rowNumber <= resultSheet.rowCount; rowNumber += 1) {
    const row = resultSheet.getRow(rowNumber);
    const ageGroup = String(resultSheet.getCell(rowNumber, 4).value ?? "");
    const isNewAgeGroup = ageGroup !== previousAgeGroup;
    previousAgeGroup = ageGroup;
    row.height = 24;
    row.eachCell({ includeEmpty: true }, (cell, columnNumber) => {
      const metadata = columns[columnNumber - 1];
      const category = metadata?.kind === "category" ? metadata.category : null;
      const judgeIndex = metadata && "judgeIndex" in metadata ? metadata.judgeIndex : -1;
      const isGroupStart = columnNumber === 1 ||
        columnNumber === RESULTS_LEADING_HEADERS.length + 1 ||
        (metadata?.kind === "category" && metadata.judge.categories[0] === metadata.category) ||
        metadata?.kind === "final-percentage";
      cell.font = { name: "Arial", size: 10.5, color: { argb: INK } };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: {
          argb: category
            ? CATEGORY_COLORS[category].body
            : metadata?.kind === "judge-percentage" && judgeIndex >= 0
              ? JUDGE_COLORS[judgeIndex % JUDGE_COLORS.length].body
              : metadata?.kind === "final-percentage"
                ? "FFF2F7F4"
                : rowNumber % 2 === 0
                  ? "FFF7F6F2"
                  : "FFFFFFFF",
        },
      };
      cell.alignment = {
        vertical: "middle",
        horizontal: columnNumber === 3 || (columnNumber >= 4 && columnNumber <= RESULTS_LEADING_HEADERS.length)
          ? "left"
          : "center",
      };
      cell.border = plainCellBorder(isGroupStart);
      if (isNewAgeGroup) {
        cell.border.top = { style: "thin", color: { argb: GROUP_LINE } };
      }
      if (metadata?.kind === "final-percentage") {
        cell.font = { name: "Arial", size: 10.5, bold: true, color: { argb: INK } };
      }
    });
    resultSheet.getCell(rowNumber, 2).numFmt = "@";
    columns.forEach((metadata, index) => {
      const cell = resultSheet.getCell(rowNumber, index + 1);
      if (metadata.kind === "category") cell.numFmt = "0.##";
      if (metadata.kind === "judge-percentage" || metadata.kind === "final-percentage") {
        cell.numFmt = "0.00%";
      }
    });
  }

  const ledgerHeaders = [
    ...SCORE_LEDGER_LEADING_HEADERS,
    ...categories.map((category) => CATEGORY_BY_ID[category].label),
    ...SCORE_LEDGER_TRAILING_HEADERS,
  ];
  const ledgerSheet = workbook.addWorksheet("Score ledger", {
    properties: { defaultRowHeight: 24 },
    views: [{ state: "frozen", xSplit: 3, ySplit: 1, activeCell: "D2", showGridLines: false }],
    pageSetup: {
      orientation: "landscape",
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      paperSize: 9,
      margins: { left: 0.25, right: 0.25, top: 0.5, bottom: 0.5, header: 0.2, footer: 0.2 },
    },
  });
  ledgerSheet.pageSetup.printTitlesRow = "1:1";
  ledgerSheet.addRow(ledgerHeaders);
  placed.forEach((result) => {
    judgeGroups.forEach((group) => {
      const contribution = judgeContribution(result, group);
      if (contribution.maximum <= 0) return;
      ledgerSheet.addRow([
        result.place,
        result.participant.number,
        result.participant.name,
        result.participant.ageGroup,
        participantCategoryLabel(result.participant.category),
        group.judgeName,
        group.categories
          .filter((category) => contribution.categories[category])
          .map((category) => CATEGORY_BY_ID[category].label)
          .join(" + "),
        ...categories.map((category) => contribution.categories[category]?.score ?? ""),
        contribution.total,
        contribution.maximum,
        contribution.percentage,
        finalResultPercentage(result),
        result.manifest,
      ]);
    });
  });
  ledgerSheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: Math.max(1, ledgerSheet.rowCount), column: ledgerHeaders.length },
  };
  [8, 19, 30, 18, 27, 24, 42, ...categories.map(() => 15), 14, 16, 13, 16, 48]
    .forEach((width, index) => { ledgerSheet.getColumn(index + 1).width = width; });
  const ledgerHeader = ledgerSheet.getRow(1);
  ledgerHeader.height = 36;
  ledgerHeader.eachCell((cell, columnNumber) => {
    const category = categories[columnNumber - SCORE_LEDGER_LEADING_HEADERS.length - 1];
    cell.font = { name: "Arial", size: 10, bold: true, color: { argb: INK } };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: category ? CATEGORY_COLORS[category].tint : "FFFFFFFF" },
    };
    cell.alignment = {
      vertical: "middle",
      horizontal: columnNumber === 3 || (columnNumber >= 4 && columnNumber <= 7) ? "left" : "center",
      wrapText: true,
    };
    cell.border = plainCellBorder(columnNumber === 1 || columnNumber === SCORE_LEDGER_LEADING_HEADERS.length + 1);
    if (category) cell.border.bottom = { style: "thin", color: { argb: CATEGORY_COLORS[category].strong } };
  });
  for (let rowNumber = 2; rowNumber <= ledgerSheet.rowCount; rowNumber += 1) {
    const row = ledgerSheet.getRow(rowNumber);
    row.height = 24;
    row.eachCell({ includeEmpty: true }, (cell, columnNumber) => {
      const category = categories[columnNumber - SCORE_LEDGER_LEADING_HEADERS.length - 1];
      cell.font = { name: "Arial", size: 10.5, color: { argb: INK } };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: category ? CATEGORY_COLORS[category].body : rowNumber % 2 === 0 ? "FFF7F6F2" : "FFFFFFFF" },
      };
      cell.alignment = {
        vertical: "middle",
        horizontal: columnNumber === 3 || (columnNumber >= 4 && columnNumber <= 7) ? "left" : "center",
      };
      cell.border = plainCellBorder(columnNumber === 1 || columnNumber === SCORE_LEDGER_LEADING_HEADERS.length + 1);
    });
    ledgerSheet.getCell(rowNumber, 2).numFmt = "@";
    categories.forEach((_, index) => {
      ledgerSheet.getCell(rowNumber, SCORE_LEDGER_LEADING_HEADERS.length + index + 1).numFmt = "0.##";
    });
    const trailingStart = SCORE_LEDGER_LEADING_HEADERS.length + categories.length + 1;
    ledgerSheet.getCell(rowNumber, trailingStart).numFmt = "0.##";
    ledgerSheet.getCell(rowNumber, trailingStart + 1).numFmt = "0.##";
    ledgerSheet.getCell(rowNumber, trailingStart + 2).numFmt = "0.00%";
    ledgerSheet.getCell(rowNumber, trailingStart + 3).numFmt = "0.00%";
  }

  const auditSheet = workbook.addWorksheet("Audit", {
    properties: { defaultRowHeight: 24 },
    views: [{ state: "frozen", xSplit: 2, ySplit: 1, activeCell: "C2", showGridLines: false }],
    pageSetup: {
      orientation: "landscape",
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      paperSize: 9,
      margins: { left: 0.25, right: 0.25, top: 0.5, bottom: 0.5, header: 0.2, footer: 0.2 },
    },
  });
  auditSheet.pageSetup.printTitlesRow = "1:1";
  auditSheet.addRow(AUDIT_HEADERS);
  placed.forEach((result) => {
    auditSheet.addRow([
      result.participant.number,
      result.participant.name,
      result.totalMax,
      finalResultPercentage(result),
      result.revision,
      result.revisionReason ?? "",
      result.manifest,
    ]);
  });
  auditSheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: Math.max(1, auditSheet.rowCount), column: AUDIT_HEADERS.length },
  };
  [19, 30, 12, 16, 16, 38, 54].forEach((width, index) => {
    auditSheet.getColumn(index + 1).width = width;
  });
  const auditHeader = auditSheet.getRow(1);
  auditHeader.height = 32;
  auditHeader.eachCell((cell) => {
    cell.font = { name: "Arial", size: 10.5, bold: true, color: { argb: INK } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFFFFF" } };
    cell.alignment = { vertical: "middle", horizontal: "left", wrapText: true };
    cell.border = plainCellBorder();
  });
  for (let rowNumber = 2; rowNumber <= auditSheet.rowCount; rowNumber += 1) {
    const row = auditSheet.getRow(rowNumber);
    row.height = 24;
    row.eachCell({ includeEmpty: true }, (cell) => {
      cell.font = { name: "Arial", size: 10.5, color: { argb: INK } };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: rowNumber % 2 === 0 ? "FFF7F6F2" : "FFFFFFFF" },
      };
      cell.alignment = { vertical: "middle", horizontal: "left" };
      cell.border = plainCellBorder();
    });
    auditSheet.getCell(rowNumber, 1).numFmt = "@";
    auditSheet.getCell(rowNumber, 3).numFmt = "0.##";
    auditSheet.getCell(rowNumber, 4).numFmt = "0.00%";
    auditSheet.getCell(rowNumber, 5).numFmt = "0";
  }

  const verificationSheet = workbook.addWorksheet("Verification", {
    properties: { defaultRowHeight: 24 },
    views: [{ state: "frozen", ySplit: 2, activeCell: "A3", showGridLines: false }],
    pageSetup: {
      orientation: "portrait",
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 1,
      margins: { left: 0.5, right: 0.5, top: 0.6, bottom: 0.6, header: 0.2, footer: 0.2 },
    },
  });
  verificationSheet.columns = [{ width: 34 }, { width: 88 }];
  verificationSheet.addRow(["Tahqeeq final marks verification"]);
  verificationSheet.mergeCells("A1:B1");
  verificationSheet.addRow([]);
  const verificationRows: Array<[string, string | number]> = [
    ["Competition", competition.name || "Not set"],
    ["Edition", competition.edition || "Not set"],
    ["Competition ID", competition.id],
    ["Record type", competition.isSample ? "PRACTICE DATA — NOT OFFICIAL" : "Official competition data"],
    ["Export generated (UTC)", exportedAt.toISOString()],
    ["Finalized result count", results.length],
    ["Ranking groups", new Set(placed.map((result) => result.rankGroup)).size],
    ["Tie rule", "Final percentage, then normalized Jali, then normalized Khafi; equal after that remains tied"],
    ["Criteria judged", categories.map((category) => CATEGORY_BY_ID[category].label).join(", ") || "None"],
    ["Judge groups", judgeGroups.map((group) => `${group.judgeName}: ${group.categories.map((category) => CATEGORY_BY_ID[category].label).join(" + ")}`).join("; ") || "None"],
    ["Calculation", "Allocation-weighted percentage: selected marks divided by selected maximum; no intermediate rounding"],
    ["Current panel contract", "One responsible judge per criterion"],
    ["Duplicate criterion owners", "Not enabled; requires a separately versioned aggregation and missing-score rule"],
    ["Spreadsheet authority", "Tahqeeq fixed values; spreadsheet formulas are not the source of truth"],
  ];
  verificationRows.forEach((row) => verificationSheet.addRow(row));
  verificationSheet.getRow(1).height = 38;
  verificationSheet.getCell("A1").font = {
    name: "Arial",
    size: 18,
    bold: true,
    color: { argb: INK },
  };
  verificationSheet.getCell("A1").alignment = { vertical: "middle", horizontal: "left" };
  for (let rowNumber = 3; rowNumber <= verificationSheet.rowCount; rowNumber += 1) {
    verificationSheet.getRow(rowNumber).height = 27;
    const labelCell = verificationSheet.getCell(rowNumber, 1);
    const valueCell = verificationSheet.getCell(rowNumber, 2);
    labelCell.font = { name: "Arial", size: 10.5, bold: true, color: { argb: INK } };
    valueCell.font = { name: "Arial", size: 10.5, color: { argb: INK } };
    labelCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF0EFEA" } };
    valueCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFFFFF" } };
    labelCell.alignment = { vertical: "middle", horizontal: "left", wrapText: true };
    valueCell.alignment = { vertical: "middle", horizontal: "left", wrapText: true };
    labelCell.border = plainCellBorder();
    valueCell.border = plainCellBorder();
  }

  const output = await workbook.xlsx.writeBuffer();
  return new Uint8Array(output).slice().buffer;
}

export async function verifyFinalResultsWorkbook(
  buffer: ArrayBuffer,
  results: FinalizedResult[],
): Promise<void> {
  const { read, utils } = await import("xlsx");
  const workbook = read(buffer, { type: "array" });
  if (workbook.SheetNames.join("|") !== "Final marks|Score ledger|Audit|Verification") {
    throw new Error("The exported workbook is missing a required sheet.");
  }
  const resultRows = utils.sheet_to_json<unknown[]>(workbook.Sheets["Final marks"], {
    header: 1,
    defval: "",
    raw: true,
    blankrows: false,
  });
  const headers = resultRows[2] ?? [];
  const visibleRows = resultRows.slice(3);
  const auditRows = utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets.Audit, {
    defval: "",
    raw: true,
  });
  if (visibleRows.length !== results.length || auditRows.length !== results.length) {
    throw new Error("The exported workbook result count does not match.");
  }
  if (headers[0] !== "Place" || headers[headers.length - 1] !== "Final Marks (%)") {
    throw new Error("The final-marks table is missing its placement or percentage column.");
  }
  const expectedByNumber = new Map(
    results.map((result) => [result.participant.number, result]),
  );
  for (const row of visibleRows) {
    const result = expectedByNumber.get(String(row[1] ?? ""));
    const percentage = Number(row[row.length - 1]);
    if (
      !result ||
      String(row[2]) !== result.participant.name ||
      Math.abs(percentage - finalResultPercentage(result)) > 1e-12
    ) {
      throw new Error("A visible result changed during workbook export.");
    }
  }
  const expectedByManifest = new Map(results.map((result) => [result.manifest, result]));
  for (const row of auditRows) {
    const result = expectedByManifest.get(String(row["Verification Manifest"] ?? ""));
    if (
      !result ||
      Number(row.Maximum) !== result.totalMax ||
      Math.abs(Number(row["Final Marks (%)"]) - finalResultPercentage(result)) > 1e-12 ||
      Number(row["Result Revision"]) !== result.revision ||
      String(row["Participant Number"]) !== result.participant.number
    ) {
      throw new Error("An audit record changed during workbook export.");
    }
  }
  for (const sheetName of workbook.SheetNames) {
    for (const [address, cell] of Object.entries(workbook.Sheets[sheetName])) {
      if (!address.startsWith("!") && cell.f) {
        throw new Error("The exported workbook unexpectedly contains a formula.");
      }
    }
  }

  const ExcelJS = (await import("exceljs")).default;
  const styledWorkbook = new ExcelJS.Workbook();
  await styledWorkbook.xlsx.load(buffer);
  const resultsSheet = styledWorkbook.getWorksheet("Final marks");
  const ledgerSheet = styledWorkbook.getWorksheet("Score ledger");
  const auditSheet = styledWorkbook.getWorksheet("Audit");
  const verificationSheet = styledWorkbook.getWorksheet("Verification");
  const resultsView = resultsSheet?.views[0];
  const resultsViewMatches =
    resultsView?.state === "frozen" &&
    resultsView.ySplit === 3 &&
    resultsView.xSplit === 3;
  if (
    !resultsSheet ||
    !ledgerSheet ||
    !auditSheet ||
    !verificationSheet ||
    !resultsViewMatches ||
    !resultsSheet.autoFilter ||
    !ledgerSheet.autoFilter ||
    !auditSheet.autoFilter ||
    verificationSheet.getCell("B7").value === null
  ) {
    throw new Error("The exported workbook layout did not verify.");
  }
}

export async function downloadFinalResultsWorkbook(
  results: FinalizedResult[],
  competition: CompetitionConfig,
): Promise<void> {
  const buffer = await buildFinalResultsWorkbook(results, competition);
  await verifyFinalResultsWorkbook(buffer, results);
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = competition.isSample
    ? "Tahqeeq-practice-final-marks-NOT-OFFICIAL.xlsx"
    : "Tahqeeq-final-marks.xlsx";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

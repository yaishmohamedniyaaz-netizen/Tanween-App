import { CATEGORY_BY_ID } from "../config.ts";
import type { CategoryId, CompetitionConfig, FinalizedResult } from "../types";
import {
  muqarrarLabel,
  participantCategoryLabel,
} from "./participants.ts";
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

const RESULTS_TRAILING_HEADERS = ["Total"] as const;

const AUDIT_HEADERS = [
  "Participant Number",
  "Name",
  "Maximum",
  "Result Revision",
  "Revision Reason",
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

export interface FinalResultsWorkbookOptions {
  /** Injectable for deterministic verification; defaults to the device clock. */
  exportedAt?: number | Date;
}

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

export function finalResultsHeaders(results: FinalizedResult[]): string[] {
  return [
    ...RESULTS_LEADING_HEADERS,
    ...finalResultsCategories(results).map((category) => CATEGORY_BY_ID[category].label),
    ...RESULTS_TRAILING_HEADERS,
  ];
}

function safeExportDate(value?: number | Date): Date {
  const candidate = value instanceof Date
    ? new Date(value.getTime())
    : new Date(value ?? Date.now());
  return Number.isNaN(candidate.getTime()) ? new Date() : candidate;
}

export async function buildFinalResultsWorkbook(
  results: FinalizedResult[],
  competition: CompetitionConfig,
  options: FinalResultsWorkbookOptions = {},
): Promise<ArrayBuffer> {
  const ExcelJS = (await import("exceljs")).default;
  const placed = placeFinalizedResults(results);
  const categories = finalResultsCategories(results);
  const headers = finalResultsHeaders(results);
  const exportedAt = safeExportDate(options.exportedAt);
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Tahqeeq";
  workbook.title = `${competition.name || "Tahqeeq"} Results`;
  workbook.subject = competition.isSample
    ? "Practice results — not official"
    : "Verified competition results";
  workbook.description = "Fixed competition results with separate audit and verification records.";
  workbook.created = exportedAt;
  workbook.modified = exportedAt;

  const resultSheet = workbook.addWorksheet("Results", {
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
  resultSheet.pageSetup.printTitlesRow = "1:1";
  resultSheet.addRow(headers);
  placed.forEach((result) => {
    resultSheet.addRow([
      result.place,
      result.participant.number,
      result.participant.name,
      result.participant.ageGroup,
      participantCategoryLabel(result.participant.category),
      muqarrarLabel(result.participant.muqarrar),
      result.participant.institution,
      ...categories.map((category) => result.byCategory[category]?.score ?? ""),
      result.total,
    ]);
  });
  resultSheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: Math.max(1, resultSheet.rowCount), column: headers.length },
  };
  const resultsWidths = [8, 19, 30, 18, 27, 29, 28, ...categories.map(() => 14), 12];
  resultSheet.columns.forEach((column, index) => {
    column.width = resultsWidths[index];
  });

  const resultsHeader = resultSheet.getRow(1);
  resultsHeader.height = 32;
  resultsHeader.eachCell((cell, columnNumber) => {
    const category = categories[columnNumber - RESULTS_LEADING_HEADERS.length - 1];
    cell.font = {
      name: "Aptos",
      size: 11,
      bold: true,
      color: { argb: category ? CATEGORY_COLORS[category].strong : "FFFFFFFF" },
    };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: category ? CATEGORY_COLORS[category].tint : "FF242421" },
    };
    cell.alignment = {
      vertical: "middle",
      horizontal: columnNumber === 1 || columnNumber >= RESULTS_LEADING_HEADERS.length + 1
        ? "center"
        : "left",
      wrapText: true,
    };
    cell.border = { bottom: { style: "thin", color: { argb: "FF11110F" } } };
  });

  for (let rowNumber = 2; rowNumber <= resultSheet.rowCount; rowNumber += 1) {
    const row = resultSheet.getRow(rowNumber);
    row.height = 24;
    row.eachCell({ includeEmpty: true }, (cell, columnNumber) => {
      const category = categories[columnNumber - RESULTS_LEADING_HEADERS.length - 1];
      cell.font = { name: "Aptos", size: 11, color: { argb: "FF242421" } };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: {
          argb: category
            ? CATEGORY_COLORS[category].body
            : rowNumber % 2 === 0
              ? "FFF7F6F2"
              : "FFFFFFFF",
        },
      };
      cell.alignment = {
        vertical: "middle",
        horizontal: columnNumber === 1 || columnNumber === 2 || columnNumber >= RESULTS_LEADING_HEADERS.length + 1
          ? "center"
          : "left",
      };
      cell.border = { bottom: { style: "hair", color: { argb: "FFD8D7D1" } } };
    });
    resultSheet.getCell(rowNumber, 2).numFmt = "@";
    resultSheet.getCell(rowNumber, headers.length).font = {
      name: "Aptos",
      size: 11,
      bold: true,
      color: { argb: "FF242421" },
    };
    categories.forEach((_, categoryIndex) => {
      resultSheet.getCell(rowNumber, RESULTS_LEADING_HEADERS.length + categoryIndex + 1).numFmt = "0.##";
    });
    resultSheet.getCell(rowNumber, headers.length).numFmt = "0.##";
  }

  const auditSheet = workbook.addWorksheet("Audit", {
    properties: { defaultRowHeight: 24 },
    views: [{ state: "frozen", xSplit: 2, ySplit: 1, activeCell: "C2", showGridLines: false }],
    pageSetup: {
      orientation: "landscape",
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
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
      result.revision,
      result.revisionReason ?? "",
      result.manifest,
    ]);
  });
  auditSheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: Math.max(1, auditSheet.rowCount), column: AUDIT_HEADERS.length },
  };
  [19, 30, 12, 16, 38, 54].forEach((width, index) => {
    auditSheet.getColumn(index + 1).width = width;
  });
  const auditHeader = auditSheet.getRow(1);
  auditHeader.height = 30;
  auditHeader.eachCell((cell) => {
    cell.font = { name: "Aptos", size: 11, bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF242421" } };
    cell.alignment = { vertical: "middle", horizontal: "left", wrapText: true };
    cell.border = { bottom: { style: "thin", color: { argb: "FF11110F" } } };
  });
  for (let rowNumber = 2; rowNumber <= auditSheet.rowCount; rowNumber += 1) {
    const row = auditSheet.getRow(rowNumber);
    row.height = 24;
    row.eachCell({ includeEmpty: true }, (cell) => {
      cell.font = { name: "Aptos", size: 11, color: { argb: "FF242421" } };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: rowNumber % 2 === 0 ? "FFF7F6F2" : "FFFFFFFF" },
      };
      cell.alignment = { vertical: "middle", horizontal: "left" };
      cell.border = { bottom: { style: "hair", color: { argb: "FFD8D7D1" } } };
    });
    auditSheet.getCell(rowNumber, 1).numFmt = "@";
    auditSheet.getCell(rowNumber, 3).numFmt = "0.##";
    auditSheet.getCell(rowNumber, 4).numFmt = "0";
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
  verificationSheet.columns = [{ width: 30 }, { width: 82 }];
  verificationSheet.addRow(["Tahqeeq results verification"]);
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
    ["Tie rule", "Equal percentages remain tied"],
    ["Criteria judged", categories.map((category) => CATEGORY_BY_ID[category].label).join(", ") || "None"],
    ["Calculation", "Tahqeeq fixed values; spreadsheet formulas are not the source of truth"],
  ];
  verificationRows.forEach((row) => verificationSheet.addRow(row));
  verificationSheet.getRow(1).height = 38;
  verificationSheet.getCell("A1").font = {
    name: "Aptos Display",
    size: 18,
    bold: true,
    color: { argb: "FF242421" },
  };
  verificationSheet.getCell("A1").alignment = { vertical: "middle", horizontal: "left" };
  for (let rowNumber = 3; rowNumber <= verificationSheet.rowCount; rowNumber += 1) {
    verificationSheet.getRow(rowNumber).height = 26;
    const labelCell = verificationSheet.getCell(rowNumber, 1);
    const valueCell = verificationSheet.getCell(rowNumber, 2);
    labelCell.font = { name: "Aptos", size: 11, bold: true, color: { argb: "FF242421" } };
    valueCell.font = { name: "Aptos", size: 11, color: { argb: "FF242421" } };
    labelCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF0EFEA" } };
    valueCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFFFFF" } };
    labelCell.alignment = { vertical: "middle", horizontal: "left", wrapText: true };
    valueCell.alignment = { vertical: "middle", horizontal: "left", wrapText: true };
    labelCell.border = { bottom: { style: "hair", color: { argb: "FFD8D7D1" } } };
    valueCell.border = { bottom: { style: "hair", color: { argb: "FFD8D7D1" } } };
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
  if (workbook.SheetNames.join("|") !== "Results|Audit|Verification") {
    throw new Error("The exported workbook is missing a required sheet.");
  }
  const resultRows = utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets.Results, {
    defval: "",
    raw: false,
  });
  const auditRows = utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets.Audit, {
    defval: "",
    raw: false,
  });
  if (resultRows.length !== results.length || auditRows.length !== results.length) {
    throw new Error("The exported workbook result count does not match.");
  }
  const expectedByNumber = new Map(
    results.map((result) => [result.participant.number, result]),
  );
  for (const row of resultRows) {
    const result = expectedByNumber.get(String(row["Participant Number"] ?? ""));
    if (!result || Number(row.Total) !== result.total || String(row.Name) !== result.participant.name) {
      throw new Error("A visible result changed during workbook export.");
    }
  }
  const expectedByManifest = new Map(results.map((result) => [result.manifest, result]));
  for (const row of auditRows) {
    const result = expectedByManifest.get(String(row["Verification Manifest"] ?? ""));
    if (
      !result ||
      Number(row.Maximum) !== result.totalMax ||
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
  const resultsSheet = styledWorkbook.getWorksheet("Results");
  const auditSheet = styledWorkbook.getWorksheet("Audit");
  const verificationSheet = styledWorkbook.getWorksheet("Verification");
  const resultsView = resultsSheet?.views[0];
  const resultsViewMatches =
    resultsView?.state === "frozen" &&
    resultsView.ySplit === 1 &&
    resultsView.xSplit === 3;
  if (
    !resultsSheet ||
    !auditSheet ||
    !verificationSheet ||
    !resultsViewMatches ||
    !resultsSheet.autoFilter ||
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
    ? "Tahqeeq-practice-results-NOT-OFFICIAL.xlsx"
    : "Tahqeeq-final-results.xlsx";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

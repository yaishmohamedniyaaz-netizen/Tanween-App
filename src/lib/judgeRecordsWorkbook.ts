import { CATEGORY_BY_ID } from "../config.ts";
import type { CategoryId, CompetitionConfig, SavedSession } from "../types";
import { compareAgeGroups } from "./ageGroupOrder.ts";
import { assignmentLabel, judgeDisplayName } from "./judgeAssignments.ts";
import { muqarrarLabel, participantCategoryLabel } from "./participants.ts";

export type JudgeRecordsScope = "official" | "sample" | "all";

export interface JudgeRecordsWorkbookOptions {
  exportedAt?: number | Date;
  competition?: CompetitionConfig;
  /** Distinguishes retained multi-competition exports from the current competition. */
  allStored?: boolean;
}

const RECORD_HEADERS = [
  "Age Group",
  "Participant Number",
  "Name",
  "Category",
  "Muqarrar start",
  "Institution",
  "Judge",
  "Criteria judged",
  "Score",
  "Maximum",
  "Evidence entries",
  "Saved date",
  "Competition",
] as const;

const MISTAKE_HEADERS = [
  "Age Group",
  "Participant Number",
  "Name",
  "Judge",
  "Criterion",
  "Evidence type",
  "Surah",
  "Ayah",
  "Kalimah",
  "Letter",
  "Location",
  "Deduction",
  "Note",
  "Recorded at",
  "Session ID",
] as const;

const CATEGORY_COLORS: Record<CategoryId, { body: string; strong: string }> = {
  jali: { body: "FFFFF7F6", strong: "FF9E2820" },
  khafi: { body: "FFFFFBF1", strong: "FF7C540E" },
  fasaha: { body: "FFF8F8FD", strong: "FF2F3AA3" },
  "adu-raagu": { body: "FFF7FBF9", strong: "FF26624B" },
};

const INK = "FF242421";
const LINE = "FFD8D7D1";
const ZEBRA = "FFF7F6F2";

const round2 = (value: number) => Math.round(value * 100) / 100;

function safeExportDate(value?: number | Date): Date {
  const candidate = value instanceof Date
    ? new Date(value.getTime())
    : new Date(value ?? Date.now());
  return Number.isNaN(candidate.getTime()) ? new Date() : candidate;
}

function selectedSessions(history: SavedSession[], scope: JudgeRecordsScope) {
  return history.filter((session) =>
    scope === "all"
      ? true
      : scope === "sample"
        ? Boolean(session.isSample)
        : !session.isSample,
  );
}

export function sortJudgeRecordSessions(history: SavedSession[]): SavedSession[] {
  return [...history].sort((left, right) =>
    compareAgeGroups(left.participant.ageGroup, right.participant.ageGroup) ||
    left.participant.category.localeCompare(right.participant.category) ||
    left.participant.number.localeCompare(right.participant.number, undefined, {
      numeric: true,
      sensitivity: "base",
    }) ||
    left.savedAt - right.savedAt ||
    left.id.localeCompare(right.id),
  );
}

function competitionLabel(
  session: SavedSession,
  competition?: CompetitionConfig,
): string {
  if (competition && session.competitionId === competition.id) {
    return [competition.name, competition.edition].filter(Boolean).join(" · ");
  }
  return session.competitionId || "Legacy record";
}

function recordMistakeCount(session: SavedSession): number {
  const impressions = (session.impressions ?? []).filter((item) => item.set).length;
  return session.mistakes.length + impressions;
}

function applyHeaderStyle(
  row: import("exceljs").Row,
  categoryColumns: Partial<Record<number, CategoryId>> = {},
) {
  row.height = 32;
  row.eachCell((cell, columnNumber) => {
    const category = categoryColumns[columnNumber];
    cell.font = {
      name: "Aptos",
      size: 11,
      bold: true,
      color: { argb: INK },
    };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFFFFFFF" },
    };
    cell.alignment = {
      vertical: "middle",
      horizontal: "left",
      wrapText: true,
    };
    cell.border = {
      bottom: {
        style: "medium",
        color: { argb: category ? CATEGORY_COLORS[category].strong : INK },
      },
    };
  });
}

function applyBodyStyle(
  row: import("exceljs").Row,
  rowNumber: number,
  isNewAgeGroup: boolean,
) {
  row.height = 24;
  row.eachCell({ includeEmpty: true }, (cell) => {
    cell.font = { name: "Aptos", size: 11, color: { argb: INK } };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: rowNumber % 2 === 0 ? ZEBRA : "FFFFFFFF" },
    };
    cell.alignment = { vertical: "middle", horizontal: "left" };
    cell.border = {
      top: isNewAgeGroup
        ? { style: "medium", color: { argb: "FFAAA9A3" } }
        : undefined,
      bottom: { style: "hair", color: { argb: LINE } },
    };
  });
}

function styleVerificationSheet(
  sheet: import("exceljs").Worksheet,
  title: string,
) {
  sheet.columns = [{ width: 31 }, { width: 82 }];
  sheet.mergeCells("A1:B1");
  sheet.getCell("A1").value = title;
  sheet.getRow(1).height = 38;
  sheet.getCell("A1").font = {
    name: "Aptos Display",
    size: 18,
    bold: true,
    color: { argb: INK },
  };
  sheet.getCell("A1").alignment = { vertical: "middle", horizontal: "left" };
  for (let rowNumber = 3; rowNumber <= sheet.rowCount; rowNumber += 1) {
    sheet.getRow(rowNumber).height = 26;
    const label = sheet.getCell(rowNumber, 1);
    const value = sheet.getCell(rowNumber, 2);
    label.font = { name: "Aptos", size: 11, bold: true, color: { argb: INK } };
    value.font = { name: "Aptos", size: 11, color: { argb: INK } };
    label.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF0EFEA" } };
    value.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFFFFF" } };
    label.alignment = { vertical: "middle", horizontal: "left", wrapText: true };
    value.alignment = { vertical: "middle", horizontal: "left", wrapText: true };
    label.border = { bottom: { style: "hair", color: { argb: LINE } } };
    value.border = { bottom: { style: "hair", color: { argb: LINE } } };
  }
}

export async function buildJudgeRecordsWorkbook(
  history: SavedSession[],
  scope: JudgeRecordsScope = "official",
  options: JudgeRecordsWorkbookOptions = {},
): Promise<ArrayBuffer> {
  const ExcelJS = (await import("exceljs")).default;
  const exportedAt = safeExportDate(options.exportedAt);
  const sessions = sortJudgeRecordSessions(selectedSessions(history, scope));
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Tahqeeq";
  workbook.title = "Tahqeeq judge records";
  workbook.subject = options.allStored
    ? scope === "sample" ? "All stored practice judge records" : "All stored official judge records"
    : scope === "sample" ? "Practice judge records" : "Judge records";
  workbook.description = "Value-only judge records with separate mistake evidence and verification details.";
  workbook.created = exportedAt;
  workbook.modified = exportedAt;

  const records = workbook.addWorksheet("Judge records", {
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
  records.pageSetup.printTitlesRow = "1:1";
  records.addRow(RECORD_HEADERS);
  sessions.forEach((session) => {
    records.addRow([
      session.participant.ageGroup,
      session.participant.number,
      session.participant.name,
      participantCategoryLabel(session.participant.category),
      muqarrarLabel(session.participant.muqarrar),
      session.participant.institution,
      session.assignment ? judgeDisplayName(session.assignment) : "Judge 1",
      session.assignment
        ? assignmentLabel(session.assignment.categories)
        : "Jali + Khafi + Fasaha",
      session.total,
      session.totalMax,
      recordMistakeCount(session),
      new Date(session.savedAt),
      competitionLabel(session, options.competition),
    ]);
  });
  records.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: Math.max(1, records.rowCount), column: RECORD_HEADERS.length },
  };
  [17, 19, 30, 27, 29, 28, 24, 31, 11, 11, 11, 14, 30].forEach((width, index) => {
    records.getColumn(index + 1).width = width;
  });
  applyHeaderStyle(records.getRow(1));
  let previousAgeGroup = "";
  for (let rowNumber = 2; rowNumber <= records.rowCount; rowNumber += 1) {
    const ageGroup = String(records.getCell(rowNumber, 1).value ?? "");
    applyBodyStyle(records.getRow(rowNumber), rowNumber, ageGroup !== previousAgeGroup);
    previousAgeGroup = ageGroup;
    records.getCell(rowNumber, 2).numFmt = "@";
    records.getCell(rowNumber, 9).numFmt = "0.##";
    records.getCell(rowNumber, 10).numFmt = "0.##";
    records.getCell(rowNumber, 11).numFmt = "0";
    records.getCell(rowNumber, 12).numFmt = "yyyy-mm-dd";
    [2, 9, 10, 11, 12].forEach((column) => {
      records.getCell(rowNumber, column).alignment = { vertical: "middle", horizontal: "center" };
    });
  }

  const mistakes = workbook.addWorksheet("Mistakes", {
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
  mistakes.pageSetup.printTitlesRow = "1:1";
  mistakes.addRow(MISTAKE_HEADERS);
  sessions.forEach((session) => {
    const judge = session.assignment ? judgeDisplayName(session.assignment) : "Judge 1";
    session.mistakes.forEach((mistake) => {
      mistakes.addRow([
        session.participant.ageGroup,
        session.participant.number,
        session.participant.name,
        judge,
        CATEGORY_BY_ID[mistake.category].label,
        "Pinpoint mistake",
        mistake.surah,
        mistake.ayah ?? "Basmala",
        mistake.wordText ?? "",
        mistake.fullGlyph ?? mistake.glyph,
        mistake.label,
        mistake.amount,
        mistake.note ?? "",
        new Date(mistake.ts),
        session.id,
      ]);
    });
    (session.impressions ?? []).filter((item) => item.set).forEach((impression) => {
      mistakes.addRow([
        session.participant.ageGroup,
        session.participant.number,
        session.participant.name,
        judge,
        CATEGORY_BY_ID[impression.category].label,
        "Whole recitation",
        "",
        "",
        "",
        "",
        "Whole recitation",
        round2((session.config[impression.category]?.start ?? 0) - impression.awarded),
        impression.note,
        new Date(impression.ts),
        session.id,
      ]);
    });
  });
  mistakes.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: Math.max(1, mistakes.rowCount), column: MISTAKE_HEADERS.length },
  };
  [17, 19, 30, 24, 18, 18, 10, 11, 24, 16, 34, 12, 32, 20, 30].forEach((width, index) => {
    mistakes.getColumn(index + 1).width = width;
  });
  applyHeaderStyle(mistakes.getRow(1));
  previousAgeGroup = "";
  for (let rowNumber = 2; rowNumber <= mistakes.rowCount; rowNumber += 1) {
    const ageGroup = String(mistakes.getCell(rowNumber, 1).value ?? "");
    applyBodyStyle(mistakes.getRow(rowNumber), rowNumber, ageGroup !== previousAgeGroup);
    previousAgeGroup = ageGroup;
    mistakes.getCell(rowNumber, 2).numFmt = "@";
    mistakes.getCell(rowNumber, 12).numFmt = "0.##";
    mistakes.getCell(rowNumber, 14).numFmt = "yyyy-mm-dd hh:mm";
    [2, 7, 8, 12, 14].forEach((column) => {
      mistakes.getCell(rowNumber, column).alignment = { vertical: "middle", horizontal: "center" };
    });
    const category = (Object.keys(CATEGORY_BY_ID) as CategoryId[]).find(
      (item) => CATEGORY_BY_ID[item].label === mistakes.getCell(rowNumber, 5).value,
    );
    if (category) {
      mistakes.getCell(rowNumber, 5).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: CATEGORY_COLORS[category].body },
      };
      mistakes.getCell(rowNumber, 5).font = {
        name: "Aptos",
        size: 11,
        bold: true,
        color: { argb: CATEGORY_COLORS[category].strong },
      };
    }
  }

  const verification = workbook.addWorksheet("Verification", {
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
  verification.addRow([]);
  verification.addRow([]);
  const evidenceCount = sessions.reduce((sum, session) => sum + session.mistakes.length, 0);
  const impressionCount = sessions.reduce(
    (sum, session) => sum + (session.impressions ?? []).filter((item) => item.set).length,
    0,
  );
  const competitionIds = [...new Set(sessions.map((session) => session.competitionId || "legacy"))];
  const verificationRows: Array<[string, string | number]> = [
    [
      "Record scope",
      options.allStored
        ? scope === "sample" ? "All stored practice records" : "All stored official records"
        : scope === "sample" ? "Practice records" : scope === "official" ? "Official records" : "All stored records",
    ],
    ["Export generated (UTC)", exportedAt.toISOString()],
    ["Judge record count", sessions.length],
    ["Pinpoint mistake count", evidenceCount],
    ["Whole-recitation mark count", impressionCount],
    ["Competition IDs", competitionIds.join(", ") || "None"],
    ["Age-group order", "Youngest numeric age group to oldest; open/non-numeric groups follow"],
    ["Calculation", "Tahqeeq fixed values; spreadsheet formulas are not the source of truth"],
  ];
  verificationRows.forEach((row) => verification.addRow(row));
  styleVerificationSheet(verification, "Tahqeeq judge-record verification");

  const output = await workbook.xlsx.writeBuffer();
  return new Uint8Array(output).slice().buffer;
}

export async function verifyJudgeRecordsWorkbook(
  buffer: ArrayBuffer,
  history: SavedSession[],
  scope: JudgeRecordsScope = "official",
): Promise<void> {
  const { read, utils } = await import("xlsx");
  const workbook = read(buffer, { type: "array", cellDates: true });
  if (workbook.SheetNames.join("|") !== "Judge records|Mistakes|Verification") {
    throw new Error("The judge-record workbook is missing a required sheet.");
  }
  const sessions = sortJudgeRecordSessions(selectedSessions(history, scope));
  const recordRows = utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets["Judge records"], {
    defval: "",
    raw: false,
  });
  const mistakeRows = utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets.Mistakes, {
    defval: "",
    raw: false,
  });
  const expectedMistakes = sessions.reduce(
    (sum, session) => sum + session.mistakes.length +
      (session.impressions ?? []).filter((item) => item.set).length,
    0,
  );
  if (recordRows.length !== sessions.length || mistakeRows.length !== expectedMistakes) {
    throw new Error("The judge-record workbook changed the number of source records.");
  }
  recordRows.forEach((row, index) => {
    const session = sessions[index];
    if (
      String(row["Participant Number"]) !== session.participant.number ||
      String(row.Name) !== session.participant.name ||
      Number(row.Score) !== session.total ||
      Number(row.Maximum) !== session.totalMax
    ) {
      throw new Error("A judge record changed during workbook export.");
    }
  });
  for (const sheetName of workbook.SheetNames) {
    for (const [address, cell] of Object.entries(workbook.Sheets[sheetName])) {
      if (!address.startsWith("!") && cell.f) {
        throw new Error("The judge-record workbook unexpectedly contains a formula.");
      }
    }
  }

  const ExcelJS = (await import("exceljs")).default;
  const styled = new ExcelJS.Workbook();
  await styled.xlsx.load(buffer);
  const records = styled.getWorksheet("Judge records");
  const mistakes = styled.getWorksheet("Mistakes");
  const verification = styled.getWorksheet("Verification");
  const recordsHeaderFill = records?.getCell("A1").fill;
  if (
    !records ||
    !mistakes ||
    !verification ||
    records.views[0]?.state !== "frozen" ||
    records.views[0]?.xSplit !== 3 ||
    records.views[0]?.ySplit !== 1 ||
    !records.autoFilter ||
    !mistakes.autoFilter ||
    recordsHeaderFill?.type !== "pattern" ||
    recordsHeaderFill.fgColor?.argb !== "FFFFFFFF" ||
    records.getCell("A1").font.color?.argb !== INK ||
    records.getCell("B2").numFmt !== "@"
  ) {
    throw new Error("The judge-record workbook layout did not verify.");
  }
}

export async function downloadJudgeRecordsWorkbook(
  history: SavedSession[],
  scope: JudgeRecordsScope,
  options: JudgeRecordsWorkbookOptions = {},
): Promise<void> {
  const buffer = await buildJudgeRecordsWorkbook(history, scope, options);
  await verifyJudgeRecordsWorkbook(buffer, history, scope);
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = options.allStored
    ? scope === "sample"
      ? "Tahqeeq-all-practice-judge-records-NOT-OFFICIAL.xlsx"
      : "Tahqeeq-all-official-judge-records.xlsx"
    : scope === "sample"
      ? "Tahqeeq-practice-judge-records-NOT-OFFICIAL.xlsx"
      : scope === "all"
        ? "Tahqeeq-all-judge-records.xlsx"
        : "Tahqeeq-judge-records.xlsx";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

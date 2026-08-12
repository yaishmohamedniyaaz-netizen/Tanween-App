// Participant workbook parsing and template generation are loaded on demand so
// the SheetJS bundle never slows the Mushaf or page navigation path.
import type { RosterEntry } from "../types";
import {
  normalizeMuqarrarSide,
  normalizeParticipantCategory,
  normalizeRosterEntry,
} from "./participants.ts";

export const PARTICIPANT_TEMPLATE_VERSION = 1;
export const PARTICIPANT_TEMPLATE_HEADERS = [
  "Participant Number",
  "Name",
  "Age Group",
  "Category",
  "Muqarrar (Hathim Side)",
  "Phone Number",
  "Institution",
] as const;

type Row = Record<string, unknown>;

export interface RosterImportIssue {
  row: number;
  level: "error" | "warning";
  message: string;
}

export interface RosterImportPreview {
  entries: RosterEntry[];
  issues: RosterImportIssue[];
  sourceRows: number;
  filename?: string;
}

const norm = (value: string) =>
  value.trim().toLowerCase().replace(/[\s_.\-()/]+/g, "");

function pick(row: Row, aliases: string[]): string {
  for (const key of Object.keys(row)) {
    if (aliases.includes(norm(key))) {
      const value = row[key];
      if (value === null || value === undefined) return "";
      return String(value).trim();
    }
  }
  return "";
}

function rowHasContent(row: Row): boolean {
  return Object.values(row).some((value) => String(value ?? "").trim());
}

/** Convert workbook rows into a replace-preview. Invalid rows never enter the
 * accepted list, and visible participant numbers must be unique. */
export function parseRosterRows(rows: Row[]): RosterImportPreview {
  const entries: RosterEntry[] = [];
  const issues: RosterImportIssue[] = [];
  const seenNumbers = new Set<string>();
  const contentRows = rows.filter(rowHasContent);

  for (const [index, row] of rows.entries()) {
    if (!rowHasContent(row)) continue;
    const rowNumber = index + 2;
    const number = pick(row, [
      "participantnumber",
      "number",
      "participantno",
      "no",
      "num",
      "id",
      "#",
    ]);
    const name = pick(row, ["name", "reciter", "participant", "fullname"]);
    const ageGroup = pick(row, ["agegroup", "agecategory", "division", "age"]);
    const categoryRaw = pick(row, ["category", "track"]);
    const muqarrarRaw = pick(row, [
      "muqarrarhathimside",
      "muqarrar",
      "hathimside",
      "startside",
      "side",
    ]);
    const phone = pick(row, [
      "phonenumber",
      "phone",
      "mobile",
      "mobilenumber",
      "contact",
      "contactnumber",
    ]);
    const institution = pick(row, [
      "institution",
      "organisation",
      "organization",
      "school",
      "class",
      "group",
      "from",
    ]);

    const rowErrors: string[] = [];
    if (!number) rowErrors.push("Participant Number is required");
    if (!name) rowErrors.push("Name is required");
    if (!ageGroup) rowErrors.push("Age Group is required");

    const category = normalizeParticipantCategory(categoryRaw);
    if (!categoryRaw) {
      rowErrors.push("Category is required");
    } else if (!category) {
      rowErrors.push("Category must be Baliagen or Hifz");
    }

    const muqarrar = normalizeMuqarrarSide(muqarrarRaw);
    if (!muqarrarRaw) {
      rowErrors.push("Muqarrar is required");
    } else if (!muqarrar) {
      rowErrors.push("Muqarrar must be Feshey kolhu or Nimey kolhu");
    }

    const numberKey = number.toLocaleLowerCase();
    if (number && seenNumbers.has(numberKey)) {
      rowErrors.push(`Participant Number ${number} is duplicated`);
    }

    if (rowErrors.length) {
      issues.push({ row: rowNumber, level: "error", message: rowErrors.join("; ") });
      continue;
    }

    seenNumbers.add(numberKey);
    const entry = normalizeRosterEntry({
      number,
      name,
      ageGroup,
      category: category ?? "",
      muqarrar: muqarrar ?? "",
      phone,
      institution,
      judged: false,
    });
    entries.push(entry);

    if (!phone) {
      issues.push({ row: rowNumber, level: "warning", message: "Phone Number is empty" });
    }
    if (!institution) {
      issues.push({ row: rowNumber, level: "warning", message: "Institution is empty" });
    }
  }

  if (!contentRows.length) {
    issues.push({
      row: 1,
      level: "error",
      message: "The Participants sheet has no participant rows",
    });
  }

  return { entries, issues, sourceRows: contentRows.length };
}

/** Parse the first sheet of a judge-supplied `.xlsx`, `.xls`, or UTF-8 `.csv`. */
export async function parseRosterFile(file: File): Promise<RosterImportPreview> {
  const { read, utils } = await import("xlsx");
  const workbook = /\.csv$/i.test(file.name)
    ? read(await file.text(), { type: "string" })
    : read(await file.arrayBuffer());
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  if (!sheet) throw new Error("The file has no sheets.");
  const rows = utils.sheet_to_json<Row>(sheet, { defval: "", raw: false });
  return { ...parseRosterRows(rows), filename: file.name };
}

/** Build the exact blank workbook offered in Competition setup. */
export async function buildParticipantTemplate(): Promise<ArrayBuffer> {
  const { utils, write } = await import("xlsx");
  const participants = utils.aoa_to_sheet([[...PARTICIPANT_TEMPLATE_HEADERS]]);
  participants["!cols"] = [
    { wch: 20 },
    { wch: 28 },
    { wch: 18 },
    { wch: 28 },
    { wch: 31 },
    { wch: 19 },
    { wch: 30 },
  ];
  participants["!autofilter"] = { ref: "A1:G1" };
  (participants as typeof participants & { "!freeze"?: unknown })["!freeze"] = {
    xSplit: 0,
    ySplit: 1,
    topLeftCell: "A2",
    activePane: "bottomLeft",
    state: "frozen",
  };

  const readMe = utils.aoa_to_sheet([
    ["Tahqeeq participant template"],
    ["Template version", PARTICIPANT_TEMPLATE_VERSION],
    [],
    ["How to use"],
    ["1", "Enter one participant per row in the Participants sheet."],
    ["2", "Keep Participant Number unique within this competition."],
    ["3", "Required: Participant Number, Name, Age Group, Category and Muqarrar."],
    ["4", "Category: Baliagen (Tarteel / reading) or Hifz (memorisation)."],
    ["5", "Muqarrar: Feshey kolhu (starting side) or Nimey kolhu (ending side)."],
    ["6", "Phone Number and Institution are optional but recommended."],
    ["7", "Institution may be a class, school, or Amilla faraathun (own participation)."],
    ["8", "For a number beginning with zero, enter a leading apostrophe, for example '014."],
    [],
    ["Example only — do not copy this row into the participant list unless it is real"],
    [
      "104",
      "Aminath Example",
      "Under 14",
      "Baliagen",
      "Feshey kolhu",
      "7770000",
      "Example School",
    ],
  ]);
  readMe["!cols"] = [
    { wch: 18 },
    { wch: 92 },
    { wch: 18 },
    { wch: 18 },
    { wch: 20 },
    { wch: 16 },
    { wch: 24 },
  ];

  const workbook = utils.book_new();
  utils.book_append_sheet(workbook, participants, "Participants");
  utils.book_append_sheet(workbook, readMe, "Read me");
  workbook.Props = {
    Title: "Tahqeeq Participant Template",
    Subject: "Competition participant import template",
    Author: "Tahqeeq",
    Comments: `Template version ${PARTICIPANT_TEMPLATE_VERSION}`,
  };
  return write(workbook, {
    bookType: "xlsx",
    type: "array",
    compression: true,
  }) as ArrayBuffer;
}

export async function verifyParticipantTemplate(buffer: ArrayBuffer): Promise<void> {
  const { read, utils } = await import("xlsx");
  const workbook = read(buffer, { type: "array" });
  if (workbook.SheetNames.join("|") !== "Participants|Read me") {
    throw new Error("The participant template is missing a required sheet.");
  }
  const participantRows = utils.sheet_to_json<unknown[]>(
    workbook.Sheets.Participants,
    { header: 1, defval: "", raw: false },
  );
  if (
    JSON.stringify(participantRows[0] ?? []) !==
      JSON.stringify([...PARTICIPANT_TEMPLATE_HEADERS]) ||
    participantRows.length !== 1
  ) {
    throw new Error("The participant template headers did not verify.");
  }
  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    for (const [address, cell] of Object.entries(sheet)) {
      if (!address.startsWith("!") && cell.f) {
        throw new Error("The participant template unexpectedly contains a formula.");
      }
    }
  }
}

export async function downloadParticipantTemplate(): Promise<void> {
  const buffer = await buildParticipantTemplate();
  await verifyParticipantTemplate(buffer);
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "Tahqeeq-participant-template.xlsx";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

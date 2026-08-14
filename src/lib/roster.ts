// Participant workbook parsing and template generation are loaded on demand so
// the SheetJS bundle never slows the Mushaf or judging path.
import type {
  CompetitionConfig,
  CompetitionDivision,
  ParticipantNumberingMode,
  RosterDraft,
  RosterDraftRow,
  RosterEntry,
} from "../types";
import { divisionLabel } from "./participantPresentation.ts";
import {
  normalizeMuqarrarSide,
  normalizeParticipantCategory,
  normalizeRosterEntry,
} from "./participants.ts";
import { createSampleRoster } from "./sampleCompetition.ts";

export const PARTICIPANT_TEMPLATE_VERSION = 3;
export const LEGACY_PARTICIPANT_TEMPLATE_HEADERS = [
  "Participant Number",
  "Name",
  "Age Group",
  "Category",
  "Muqarrar (Hathim Side)",
  "Phone Number",
  "Institution",
] as const;
/** Retained for V1 integrations and tests. */
export const PARTICIPANT_TEMPLATE_HEADERS = LEGACY_PARTICIPANT_TEMPLATE_HEADERS;
const SAMPLE_PARTICIPANT_TEMPLATE_HEADERS = [
  "Participant Number",
  "Name",
  "Age Group",
  "Category",
  "Muqarrar start",
  "Phone Number",
  "Institution",
] as const;
export const ROSTER_DRAFT_VERSION = 1;

type Row = Record<string, unknown>;
export type RosterDraftField =
  | "number"
  | "name"
  | "divisionId"
  | "muqarrar"
  | "phone"
  | "institution";

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

export interface RosterDraftIssue {
  rowId?: string;
  sourceRow?: number;
  field?: RosterDraftField;
  level: "error" | "warning";
  message: string;
}

export interface ValidatedRosterDraftRow {
  row: RosterDraftRow;
  number: string;
  issues: RosterDraftIssue[];
}

export interface RosterDraftValidation {
  rows: ValidatedRosterDraftRow[];
  issues: RosterDraftIssue[];
  errorCount: number;
  warningCount: number;
  entries: RosterEntry[];
}

export interface RosterTemplateContext {
  competitionId: string;
  competitionName: string;
  edition: string;
  divisions: CompetitionDivision[];
  numberingMode: ParticipantNumberingMode;
}

export type RosterColumnKey =
  | "number"
  | "name"
  | "division"
  | "ageGroup"
  | "category"
  | "muqarrar"
  | "phone"
  | "institution"
  | "ignore";

export interface ParsedRosterGrid {
  grid: string[][];
  headers: string[];
  suggestedMapping: RosterColumnKey[];
  hasRecognizedHeader: boolean;
}

const norm = (value: string) =>
  value.trim().toLowerCase().replace(/[\s_.\-/()–—]+/g, "");

const HEADER_ALIASES: Record<Exclude<RosterColumnKey, "ignore">, string[]> = {
  number: ["participantnumber", "number", "participantno", "no", "num", "id", "#"],
  name: ["name", "reciter", "participant", "fullname"],
  division: ["division", "competitiondivision", "participantcategory"],
  ageGroup: ["agegroup", "agecategory", "age"],
  category: ["category", "track", "recitationtype"],
  muqarrar: ["muqarrarstart", "muqarrarhathimside", "muqarrar", "hathimside", "startside", "side"],
  phone: ["phonenumber", "phone", "mobile", "mobilenumber", "contact", "contactnumber"],
  institution: ["institution", "organisation", "organization", "school", "class", "from"],
};

function columnForHeader(value: string): RosterColumnKey {
  const normalized = norm(value);
  for (const [column, aliases] of Object.entries(HEADER_ALIASES)) {
    if (aliases.includes(normalized)) return column as RosterColumnKey;
  }
  return "ignore";
}

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

function pickColumn(row: Row, column: Exclude<RosterColumnKey, "ignore">): string {
  return pick(row, HEADER_ALIASES[column]);
}

function rowHasContent(row: Row): boolean {
  return Object.values(row).some((value) => String(value ?? "").trim());
}

function rowId(index: number): string {
  return `roster-row-${Date.now().toString(36)}-${index.toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export function automaticParticipantNumber(index: number, count: number): string {
  return String(index + 1).padStart(Math.max(2, String(Math.max(1, count)).length), "0");
}

function divisionKey(ageGroup: string, category: string): string {
  return `${norm(ageGroup)}\u241f${category}`;
}

function matchDivision(
  divisions: CompetitionDivision[],
  divisionValue: string,
  ageGroup: string,
  categoryValue: string,
): string {
  const requestedDivision = norm(divisionValue);
  if (requestedDivision) {
    const matches = divisions.filter((division) =>
      [division.id, division.name, divisionLabel(division)].some(
        (candidate) => norm(candidate) === requestedDivision,
      ),
    );
    return matches.length === 1 ? matches[0].id : "";
  }
  const category = normalizeParticipantCategory(categoryValue);
  if (!ageGroup || !category) return "";
  const requestedKey = divisionKey(ageGroup, category);
  const matches = divisions.filter(
    (division) => divisionKey(division.ageGroup, division.category) === requestedKey,
  );
  return matches.length === 1 ? matches[0].id : "";
}

function draftRowFromRecord(
  row: Row,
  index: number,
  divisions: CompetitionDivision[],
): RosterDraftRow {
  const number = pickColumn(row, "number");
  const name = pickColumn(row, "name");
  const ageGroup = pickColumn(row, "ageGroup");
  const genericCategory = pick(row, ["category"]);
  const explicitCategory = pickColumn(row, "division");
  const divisionValue = explicitCategory || (!ageGroup ? genericCategory : "");
  const category = pick(row, ["track", "recitationtype"]) || (ageGroup ? genericCategory : "");
  const muqarrarRaw = pickColumn(row, "muqarrar");
  const muqarrar = normalizeMuqarrarSide(muqarrarRaw);
  return {
    id: rowId(index),
    sourceRow: index + 2,
    number,
    name,
    divisionId: matchDivision(divisions, divisionValue, ageGroup, category),
    ...(ageGroup ? { legacyAgeGroup: ageGroup } : {}),
    ...(category ? { legacyCategory: category } : {}),
    muqarrar: muqarrar || muqarrarRaw,
    phone: pickColumn(row, "phone"),
    institution: pickColumn(row, "institution"),
  };
}

export function createEmptyRosterDraft(
  competitionId: string,
  numberingMode: ParticipantNumberingMode,
  source: RosterDraft["source"] = "manual",
): RosterDraft {
  return {
    version: ROSTER_DRAFT_VERSION,
    competitionId,
    source,
    numberingMode,
    rows: [],
    sourceWarnings: [],
    updatedAt: Date.now(),
  };
}

export function createBlankRosterDraftRow(index = 0): RosterDraftRow {
  return {
    id: rowId(index),
    number: "",
    name: "",
    divisionId: "",
    muqarrar: "",
    phone: "",
    institution: "",
  };
}

export function createRosterDraftFromRows(args: {
  rows: Row[];
  competitionId: string;
  divisions: CompetitionDivision[];
  numberingMode: ParticipantNumberingMode;
  source: RosterDraft["source"];
  filename?: string;
  sourceWarnings?: string[];
}): RosterDraft {
  const rows = args.rows
    .filter(rowHasContent)
    .map((row, index) => draftRowFromRecord(row, index, args.divisions));
  return {
    ...createEmptyRosterDraft(args.competitionId, args.numberingMode, args.source),
    ...(args.filename ? { filename: args.filename } : {}),
    rows,
    sourceWarnings: [...(args.sourceWarnings ?? [])],
  };
}

export function createRosterDraftFromRoster(args: {
  roster: RosterEntry[];
  competitionId: string;
  divisions: CompetitionDivision[];
  numberingMode: ParticipantNumberingMode;
}): RosterDraft {
  return {
    ...createEmptyRosterDraft(args.competitionId, args.numberingMode, "existing"),
    rows: args.roster.map((participant, index) => ({
      id: rowId(index),
      participantId: participant.id,
      number: participant.number,
      name: participant.name,
      divisionId: matchDivision(
        args.divisions,
        "",
        participant.ageGroup,
        participant.category,
      ),
      legacyAgeGroup: participant.ageGroup,
      legacyCategory: participant.category,
      muqarrar: participant.muqarrar,
      phone: participant.phone,
      institution: participant.institution,
    })),
  };
}

export function normalizeRosterDraft(value: unknown): RosterDraft | null {
  if (!value || typeof value !== "object") return null;
  const draft = value as Partial<RosterDraft>;
  if (!Array.isArray(draft.rows) || !String(draft.competitionId ?? "").trim()) return null;
  const source: RosterDraft["source"] =
    draft.source === "paste" || draft.source === "file" || draft.source === "existing"
      ? draft.source
      : "manual";
  return {
    version: ROSTER_DRAFT_VERSION,
    competitionId: String(draft.competitionId),
    source,
    ...(String(draft.filename ?? "").trim() ? { filename: String(draft.filename) } : {}),
    numberingMode: draft.numberingMode === "automatic" ? "automatic" : "supplied",
    rows: draft.rows.map((raw, index) => {
      const row = (raw ?? {}) as Partial<RosterDraftRow>;
      const muqarrarRaw = String(row.muqarrar ?? "");
      const muqarrar = normalizeMuqarrarSide(muqarrarRaw);
      return {
        id: String(row.id ?? "").trim() || rowId(index),
        ...(String(row.participantId ?? "").trim() ? { participantId: String(row.participantId) } : {}),
        ...(Number.isFinite(row.sourceRow) ? { sourceRow: Number(row.sourceRow) } : {}),
        number: String(row.number ?? ""),
        name: String(row.name ?? ""),
        divisionId: String(row.divisionId ?? ""),
        ...(String(row.legacyAgeGroup ?? "").trim() ? { legacyAgeGroup: String(row.legacyAgeGroup) } : {}),
        ...(String(row.legacyCategory ?? "").trim() ? { legacyCategory: String(row.legacyCategory) } : {}),
        muqarrar: muqarrar || muqarrarRaw,
        phone: String(row.phone ?? ""),
        institution: String(row.institution ?? ""),
      };
    }),
    sourceWarnings: Array.isArray(draft.sourceWarnings)
      ? draft.sourceWarnings.map(String).filter(Boolean)
      : [],
    updatedAt: Number.isFinite(draft.updatedAt) ? Number(draft.updatedAt) : Date.now(),
  };
}

export function validateRosterDraft(
  draft: RosterDraft,
  divisions: CompetitionDivision[],
): RosterDraftValidation {
  const issues: RosterDraftIssue[] = [];
  const rows: ValidatedRosterDraftRow[] = [];
  const entries: RosterEntry[] = [];
  const seenNumbers = new Set<string>();

  draft.sourceWarnings.forEach((message) => issues.push({ level: "warning", message }));
  if (!draft.rows.length) {
    issues.push({ level: "error", message: "Add at least one participant." });
  }

  draft.rows.forEach((row, index) => {
    const rowIssues: RosterDraftIssue[] = [];
    const add = (
      field: RosterDraftField,
      level: "error" | "warning",
      message: string,
    ) => rowIssues.push({ rowId: row.id, sourceRow: row.sourceRow, field, level, message });
    const number = draft.numberingMode === "automatic"
      ? automaticParticipantNumber(index, draft.rows.length)
      : row.number.trim();
    if (draft.numberingMode === "supplied" && !number) add("number", "error", "Participant number is required.");
    const numberKey = number.toLocaleLowerCase();
    if (number && seenNumbers.has(numberKey)) add("number", "error", `Participant number ${number} is duplicated.`);
    if (number) seenNumbers.add(numberKey);
    if (!row.name.trim()) add("name", "error", "Name is required.");

    const division = divisions.find((candidate) => candidate.id === row.divisionId);
    if (!division) {
      const legacy = [row.legacyAgeGroup, row.legacyCategory].filter(Boolean).join(" · ");
      add(
        "divisionId",
        "error",
        legacy ? `Choose a category. Imported value: ${legacy}.` : "Category is required.",
      );
    }
    const muqarrar = normalizeMuqarrarSide(row.muqarrar);
    if (!row.muqarrar.trim()) add("muqarrar", "error", "Muqarrar start is required.");
    else if (!muqarrar) add("muqarrar", "error", "Choose a valid Muqarrar start.");
    if (!row.phone.trim()) add("phone", "warning", "Phone number is empty.");
    if (!row.institution.trim()) add("institution", "warning", "Institution is empty.");

    issues.push(...rowIssues);
    rows.push({ row, number, issues: rowIssues });
    if (!rowIssues.some((issue) => issue.level === "error") && division && muqarrar) {
      entries.push(normalizeRosterEntry({
        id: row.participantId,
        number,
        name: row.name,
        ageGroup: division.ageGroup,
        category: division.category,
        muqarrar,
        phone: row.phone,
        institution: row.institution,
        judged: false,
      }));
    }
  });

  return {
    rows,
    issues,
    errorCount: issues.filter((issue) => issue.level === "error").length,
    warningCount: issues.filter((issue) => issue.level === "warning").length,
    entries,
  };
}

export function rosterDraftComparison(current: RosterEntry[], next: RosterEntry[]) {
  const currentById = new Map(current.map((entry) => [entry.id, entry]));
  const nextIds = new Set(next.map((entry) => entry.id));
  let added = 0;
  let edited = 0;
  next.forEach((entry) => {
    const existing = currentById.get(entry.id);
    if (!existing) added += 1;
    else if (JSON.stringify({ ...existing, judged: false, absent: false }) !== JSON.stringify({ ...entry, judged: false, absent: false })) edited += 1;
  });
  return {
    before: current.length,
    after: next.length,
    added,
    edited,
    removed: current.filter((entry) => !nextIds.has(entry.id)).length,
  };
}

/** Legacy V1 replace-preview retained for old integrations and imports. */
export function parseRosterRows(rows: Row[]): RosterImportPreview {
  const entries: RosterEntry[] = [];
  const issues: RosterImportIssue[] = [];
  const seenNumbers = new Set<string>();
  const contentRows = rows.filter(rowHasContent);
  for (const [index, row] of rows.entries()) {
    if (!rowHasContent(row)) continue;
    const rowNumber = index + 2;
    const number = pickColumn(row, "number");
    const name = pickColumn(row, "name");
    const ageGroup = pickColumn(row, "ageGroup") || pickColumn(row, "division");
    const categoryRaw = pickColumn(row, "category");
    const muqarrarRaw = pickColumn(row, "muqarrar");
    const phone = pickColumn(row, "phone");
    const institution = pickColumn(row, "institution");
    const rowErrors: string[] = [];
    if (!number) rowErrors.push("Participant Number is required");
    if (!name) rowErrors.push("Name is required");
    if (!ageGroup) rowErrors.push("Age Group is required");
    const category = normalizeParticipantCategory(categoryRaw);
    if (!categoryRaw) rowErrors.push("Category is required");
    else if (!category) rowErrors.push("Category must be Baliagen or Hifz");
    const muqarrar = normalizeMuqarrarSide(muqarrarRaw);
    if (!muqarrarRaw) rowErrors.push("Muqarrar start is required");
    else if (!muqarrar) rowErrors.push("Muqarrar start must be Feshey kolhu or Nimey kolhu");
    const numberKey = number.toLocaleLowerCase();
    if (number && seenNumbers.has(numberKey)) rowErrors.push(`Participant Number ${number} is duplicated`);
    if (rowErrors.length) {
      issues.push({ row: rowNumber, level: "error", message: rowErrors.join("; ") });
      continue;
    }
    seenNumbers.add(numberKey);
    entries.push(normalizeRosterEntry({
      number,
      name,
      ageGroup,
      category: category ?? "",
      muqarrar: muqarrar ?? "",
      phone,
      institution,
      judged: false,
    }));
    if (!phone) issues.push({ row: rowNumber, level: "warning", message: "Phone Number is empty" });
    if (!institution) issues.push({ row: rowNumber, level: "warning", message: "Institution is empty" });
  }
  if (!contentRows.length) issues.push({ row: 1, level: "error", message: "The Participants sheet has no participant rows" });
  return { entries, issues, sourceRows: contentRows.length };
}

/** Parse quoted CSV/TSV clipboard text without requesting clipboard permission. */
export function parseDelimitedRosterText(text: string): ParsedRosterGrid {
  const delimiter = text.includes("\t") ? "\t" : ",";
  const grid: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (character === '"') {
      if (quoted && text[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else quoted = !quoted;
    } else if (character === delimiter && !quoted) {
      row.push(cell);
      cell = "";
    } else if ((character === "\n" || character === "\r") && !quoted) {
      if (character === "\r" && text[index + 1] === "\n") index += 1;
      row.push(cell);
      if (row.some((value) => value.trim())) grid.push(row);
      row = [];
      cell = "";
    } else cell += character;
  }
  row.push(cell);
  if (row.some((value) => value.trim())) grid.push(row);
  const headers = grid[0] ?? [];
  const suggestedMapping = headers.map(columnForHeader);
  const hasAgeGroup = suggestedMapping.includes("ageGroup");
  headers.forEach((header, index) => {
    if (norm(header) === "category") {
      suggestedMapping[index] = hasAgeGroup ? "category" : "division";
    }
  });
  const recognized = suggestedMapping.filter((column) => column !== "ignore");
  return {
    grid,
    headers,
    suggestedMapping,
    hasRecognizedHeader: recognized.includes("name") && recognized.length >= 2,
  };
}

export function recordsFromRosterGrid(
  parsed: ParsedRosterGrid,
  mapping = parsed.suggestedMapping,
  firstRowIsHeader = parsed.hasRecognizedHeader,
): Row[] {
  const start = firstRowIsHeader ? 1 : 0;
  return parsed.grid.slice(start).map((values) => {
    const record: Row = {};
    values.forEach((value, index) => {
      const column = mapping[index] ?? "ignore";
      if (column !== "ignore") record[column] = value;
    });
    return record;
  });
}

function metadataForWorkbook(workbook: { Custprops?: object }) {
  return (workbook.Custprops ?? {}) as Record<string, unknown>;
}

export function rosterTemplateFingerprint(divisions: CompetitionDivision[]): string {
  const source = divisions
    .map((division) => [division.id, division.name, division.ageGroup, division.category].map(norm).join("|"))
    .sort()
    .join("\u241e");
  let hash = 0x811c9dc5;
  for (let index = 0; index < source.length; index += 1) {
    hash ^= source.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(36);
}

export async function parseRosterFileToDraft(
  file: File,
  competition: CompetitionConfig,
): Promise<RosterDraft> {
  const { read, utils } = await import("xlsx");
  const workbook = /\.csv$/i.test(file.name)
    ? read(await file.text(), { type: "string" })
    : read(await file.arrayBuffer());
  const sheet = workbook.Sheets.Participants ?? workbook.Sheets[workbook.SheetNames[0]];
  if (!sheet) throw new Error("The file has no participant sheet.");
  const rows = utils.sheet_to_json<Row>(sheet, { defval: "", raw: false, blankrows: false });
  const metadata = metadataForWorkbook(workbook);
  const sourceWarnings: string[] = [];
  const fingerprint = String(
    metadata.TahqeeqCategoryFingerprint ?? metadata.TahqeeqDivisionFingerprint ?? "",
  );
  if (fingerprint && fingerprint !== rosterTemplateFingerprint(competition.divisions)) {
    sourceWarnings.push("This file was created for an older category setup. Check every mapped category before applying it.");
  }
  const metadataMode = metadata.TahqeeqNumberingMode;
  const numberingMode: ParticipantNumberingMode =
    metadataMode === "automatic" || metadataMode === "supplied"
      ? metadataMode
      : competition.participantNumbering;
  return createRosterDraftFromRows({
    rows,
    competitionId: competition.id,
    divisions: competition.divisions,
    numberingMode,
    source: "file",
    filename: file.name,
    sourceWarnings,
  });
}

/** Parse the first sheet using the original V1 replace-preview contract. */
export async function parseRosterFile(file: File): Promise<RosterImportPreview> {
  const { read, utils } = await import("xlsx");
  const workbook = /\.csv$/i.test(file.name)
    ? read(await file.text(), { type: "string" })
    : read(await file.arrayBuffer());
  const sheet = workbook.Sheets.Participants ?? workbook.Sheets[workbook.SheetNames[0]];
  if (!sheet) throw new Error("The file has no sheets.");
  const rows = utils.sheet_to_json<Row>(sheet, { defval: "", raw: false, blankrows: false });
  return { ...parseRosterRows(rows), filename: file.name };
}

function templateHeaders(mode: ParticipantNumberingMode): string[] {
  return [
    ...(mode === "supplied" ? ["Participant Number"] : []),
    "Name",
    "Category",
    "Muqarrar start",
    "Institution",
    "Phone Number",
  ];
}

function templateContextFromCompetition(competition: CompetitionConfig): RosterTemplateContext {
  return {
    competitionId: competition.id,
    competitionName: competition.name,
    edition: competition.edition,
    divisions: competition.divisions,
    numberingMode: competition.participantNumbering,
  };
}

function genericTemplateContext(): RosterTemplateContext {
  return {
    competitionId: "competition-local",
    competitionName: "Competition",
    edition: "",
    divisions: [],
    numberingMode: "supplied",
  };
}

async function buildParticipantWorkbook(
  context: RosterTemplateContext,
  entries: RosterEntry[],
  title: string,
  sample: boolean,
): Promise<ArrayBuffer> {
  const { utils, write } = await import("xlsx");
  const headers = sample ? [...SAMPLE_PARTICIPANT_TEMPLATE_HEADERS] : templateHeaders(context.numberingMode);
  const body = sample
    ? entries.map((entry) => [
        entry.number,
        entry.name,
        entry.ageGroup,
        entry.category === "nubalaa" ? "Hifz" : "Baliagen",
        entry.muqarrar === "nimey-kolhu" ? "Nimey kolhu" : "Feshey kolhu",
        entry.phone,
        entry.institution,
      ])
    : [];
  const participants = utils.aoa_to_sheet([headers, ...body]);
  participants["!cols"] = headers.map((header) => ({
    wch: header === "Name" || header === "Institution" ? 28 : header === "Category" ? 30 : 20,
  }));
  participants["!autofilter"] = { ref: `A1:${utils.encode_col(headers.length - 1)}1` };
  (participants as typeof participants & { "!freeze"?: unknown })["!freeze"] = {
    xSplit: 0,
    ySplit: 1,
    topLeftCell: "A2",
    activePane: "bottomLeft",
    state: "frozen",
  };

  const choices = utils.aoa_to_sheet([
    ["Category", "Muqarrar start"],
    ...Array.from({ length: Math.max(context.divisions.length, 2) }, (_, index) => [
      context.divisions[index] ? divisionLabel(context.divisions[index]) : "",
      ["Feshey kolhu", "Nimey kolhu"][index] ?? "",
    ]),
  ]);
  choices["!cols"] = [{ wch: 36 }, { wch: 22 }];

  const instructions = utils.aoa_to_sheet([
    [title],
    ["Template version", PARTICIPANT_TEMPLATE_VERSION],
    ["Competition", context.competitionName || "Not named"],
    ["Edition", context.edition || "Not set"],
    ["Numbering", context.numberingMode === "automatic" ? "Automatic in Tahqeeq" : "Supplied in this sheet"],
    [],
    ["How to use"],
    ["1", "Enter one participant per row in Participants."],
    ["2", "Use the exact Category and Muqarrar start values listed in Choices."],
    ["3", context.numberingMode === "automatic" ? "Tahqeeq assigns clean numbers from the final row order." : "Participant Number is required and must be unique."],
    ["4", "Name, Category and Muqarrar start are required. Institution and Phone Number are recommended."],
    ["5", "Import the completed file, fix highlighted rows in Tahqeeq, then review before applying."],
    ["6", "Keep phone numbers and supplied participant numbers as text when they begin with zero."],
    ...(sample ? [[], ["Sample file", "Every participant is fictional test data."]] : []),
  ]);
  instructions["!cols"] = [{ wch: 20 }, { wch: 92 }];

  const workbook = utils.book_new();
  utils.book_append_sheet(workbook, participants, "Participants");
  if (!sample) utils.book_append_sheet(workbook, choices, "Choices");
  utils.book_append_sheet(workbook, instructions, "Instructions");
  workbook.Props = {
    Title: title,
    Subject: sample ? "Fictional participant data for testing Tahqeeq" : "Competition participant import template",
    Author: "Tahqeeq",
    Comments: `Template version ${PARTICIPANT_TEMPLATE_VERSION}`,
  };
  workbook.Custprops = {
    TahqeeqTemplateVersion: PARTICIPANT_TEMPLATE_VERSION,
    TahqeeqCompetitionId: context.competitionId,
    TahqeeqCategoryFingerprint: rosterTemplateFingerprint(context.divisions),
    TahqeeqDivisionFingerprint: rosterTemplateFingerprint(context.divisions),
    TahqeeqNumberingMode: context.numberingMode,
  };
  return write(workbook, { bookType: "xlsx", type: "array", compression: true }) as ArrayBuffer;
}

export async function buildParticipantTemplate(
  competition?: CompetitionConfig,
): Promise<ArrayBuffer> {
  const context = competition ? templateContextFromCompetition(competition) : genericTemplateContext();
  return buildParticipantWorkbook(context, [], "Tahqeeq Participant Template", false);
}

export async function buildSampleParticipantWorkbook(): Promise<ArrayBuffer> {
  return buildParticipantWorkbook(
    genericTemplateContext(),
    createSampleRoster(),
    "Tahqeeq Sample Participant Roster",
    true,
  );
}

export async function verifyParticipantTemplate(
  buffer: ArrayBuffer,
  competition?: CompetitionConfig,
): Promise<void> {
  const { read, utils } = await import("xlsx");
  const workbook = read(buffer, { type: "array" });
  if (workbook.SheetNames.join("|") !== "Participants|Choices|Instructions") {
    throw new Error("The participant template is missing a required sheet.");
  }
  const participantRows = utils.sheet_to_json<unknown[]>(workbook.Sheets.Participants, {
    header: 1,
    defval: "",
    raw: false,
    blankrows: false,
  });
  const expected = templateHeaders(competition?.participantNumbering ?? "supplied");
  if (JSON.stringify(participantRows[0] ?? []) !== JSON.stringify(expected)) {
    throw new Error("The participant template headers did not verify.");
  }
  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    for (const [address, cell] of Object.entries(sheet)) {
      if (!address.startsWith("!") && cell.f) throw new Error("The participant template unexpectedly contains a formula.");
    }
  }
}

function downloadBuffer(buffer: ArrayBuffer, filename: string) {
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

export async function downloadParticipantTemplate(competition?: CompetitionConfig): Promise<void> {
  const buffer = await buildParticipantTemplate(competition);
  await verifyParticipantTemplate(buffer, competition);
  downloadBuffer(buffer, "Tahqeeq-participant-template.xlsx");
}

export async function downloadSampleParticipantWorkbook(): Promise<void> {
  const buffer = await buildSampleParticipantWorkbook();
  const preview = await parseRosterFile(new File([buffer], "Tahqeeq-sample-participants.xlsx"));
  if (preview.entries.length !== createSampleRoster().length) throw new Error("The sample participant workbook did not verify.");
  downloadBuffer(buffer, "Tahqeeq-sample-participants.xlsx");
}

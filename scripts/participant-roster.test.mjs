import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { read, utils } from "xlsx";
import ExcelJS from "exceljs";
import {
  buildParticipantTemplate,
  buildSampleParticipantWorkbook,
  parseRosterFileToDraft,
  parseRosterRows,
  PARTICIPANT_TEMPLATE_HEADERS,
  readParticipantTemplatePreferences,
  verifyParticipantTemplate,
  writeParticipantTemplatePreferences,
} from "../src/lib/roster.ts";
import {
  normalizeParticipant,
  normalizeParticipantCategory,
  participantCategoryLabel,
  muqarrarLabel,
} from "../src/lib/participants.ts";

const setupSource = readFileSync(
  new URL("../src/components/CompetitionSetup.tsx", import.meta.url),
  "utf8",
);
const rosterEditorSource = readFileSync(
  new URL("../src/components/ParticipantRosterEditor.tsx", import.meta.url),
  "utf8",
);

test("the requested participant columns parse into stable typed entries", () => {
  const preview = parseRosterRows([
    {
      "Participant Number": "014",
      Name: "Aishath",
      "Age Group": "Under 14",
      Category: "Baliagen",
      "Muqarrar (Hathim Side)": "Feshey kolhu",
      "Phone Number": "0777000",
      Institution: "School A",
    },
    {
      "Participant Number": "016",
      Name: "Mariyam",
      "Age Group": "Under 16",
      Category: "Hifz",
      "Muqarrar (Hathim Side)": "Nimey kolhu",
      "Phone Number": "+9607770001",
      Institution: "Amilla faraathun",
    },
  ]);

  assert.equal(preview.entries.length, 2);
  assert.equal(preview.issues.length, 0);
  assert.equal(preview.entries[0].number, "014");
  assert.equal(preview.entries[0].category, "mushaf-reading");
  assert.equal(preview.entries[0].muqarrar, "starting-side");
  assert.equal(preview.entries[1].category, "memorisation");
  assert.equal(participantCategoryLabel(preview.entries[1].category), "Nubalaa");
  assert.equal(normalizeParticipantCategory("Nubalaa"), "memorisation");
  assert.match(preview.entries[0].id, /^participant-/);
  assert.equal(participantCategoryLabel(preview.entries[0].category), "Balaigen");
  assert.equal(muqarrarLabel(preview.entries[1].muqarrar), "Nimeykolhu");
});

test("duplicates and unknown competition values cannot silently enter the roster", () => {
  const preview = parseRosterRows([
    {
      "Participant Number": "8",
      Name: "First",
      "Age Group": "Under 14",
      Category: "Baliagen",
      Muqarrar: "Feshey kolhu",
    },
    {
      "Participant Number": "8",
      Name: "Second",
      "Age Group": "Under 14",
      Category: "Unknown",
      Muqarrar: "Wrong side",
    },
  ]);

  assert.equal(preview.entries.length, 1);
  assert.equal(preview.issues.filter((issue) => issue.level === "error").length, 1);
  const rejected = preview.issues.find((issue) => issue.level === "error");
  assert.ok(rejected);
  assert.match(rejected.message, /Balaigen or Nubalaa/);
  assert.match(rejected.message, /Fesheykolhu or Nimeykolhu/);
  assert.match(rejected.message, /duplicated/);
});

test("legacy island or class data migrates into Institution", () => {
  const participant = normalizeParticipant({
    name: "Legacy",
    number: "3",
    group: "Old School",
  });
  assert.equal(participant.institution, "Old School");
  assert.equal(participant.ageGroup, "");
  assert.match(participant.id, /^participant-/);
});

test("template contact columns default off and remember the organizer's choice", () => {
  const values = new Map();
  const storage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  };
  assert.deepEqual(readParticipantTemplatePreferences(storage), {
    includeInstitution: false,
    includePhone: false,
  });
  writeParticipantTemplatePreferences({
    includeInstitution: true,
    includePhone: false,
  }, storage);
  assert.deepEqual(readParticipantTemplatePreferences(storage), {
    includeInstitution: true,
    includePhone: false,
  });
});

test("the competition workbook round-trips with a V7 native table and supplied numbering", async () => {
  const competition = {
    version: 2,
    isSample: false,
    id: "competition-test",
    name: "Test Competition",
    edition: "2026",
    status: "draft",
    setupRevision: 1,
    participantNumbering: "supplied",
    participantEntrySettings: {
      institutions: ["School A", "Quran Class"],
      defaultMuqarrar: "",
      defaultInstitution: "School A",
    },
    divisions: [
      { id: "u14-hifz", name: "Under 14 · Hifz", ageGroup: "Under 14", category: "nubalaa", quranPortion: { kind: "full-quran" } },
      { id: "u14-baliagen", name: "Under 14 · Baliagen", ageGroup: "Under 14", category: "baliagen", quranPortion: { kind: "full-quran" } },
      { id: "u16-hifz", name: "Under 16 · Hifz", ageGroup: "Under 16", category: "nubalaa", quranPortion: { kind: "full-quran" } },
      { id: "u16-baliagen", name: "Under 16 · Baliagen", ageGroup: "Under 16", category: "baliagen", quranPortion: { kind: "full-quran" } },
    ],
    questionPolicy: {},
    liveSnapshot: null,
  };
  const buffer = await buildParticipantTemplate(competition);
  await verifyParticipantTemplate(buffer, competition);
  const workbook = read(buffer, { type: "array" });
  assert.deepEqual(workbook.SheetNames, ["Participants", "Choices", "Instructions", "_Tahqeeq"]);
  const metadataRows = utils.sheet_to_json(workbook.Sheets._Tahqeeq, { defval: "", raw: false });
  const metadata = Object.fromEntries(metadataRows.map((row) => [row.Key, row.Value]));
  assert.equal(Number(metadata.TahqeeqTemplateVersion), 7);
  assert.equal(metadata.TahqeeqCompetitionId, "competition-test");
  assert.equal(metadata.TahqeeqNumberingMode, "supplied");
  assert.ok(String(metadata.TahqeeqCategoryFingerprint).length > 0);
  assert.ok(String(metadata.TahqeeqDivisionFingerprint).length > 0);
  const rows = utils.sheet_to_json(workbook.Sheets.Participants, {
    header: 1,
    defval: "",
    raw: false,
    blankrows: false,
  });
  assert.deepEqual(rows[0], ["Participant Number", "Name", "Category", "Muqarrar start"]);
  assert.equal(rows.length, 17);
  assert.equal(rows[1][2], "Under 14 · Nubalaa");
  assert.equal(rows[5][2], "Under 14 · Balaigen");
  assert.equal(rows[9][2], "Under 16 · Nubalaa");
  assert.equal(rows[13][2], "Under 16 · Balaigen");
  const choices = utils.sheet_to_json(workbook.Sheets.Choices, {
    header: 1,
    defval: "",
    raw: false,
  });
  assert.deepEqual(choices[0], ["Category", "Muqarrar start", "Institution"]);
  assert.equal(choices[1][0], "Under 14 · Nubalaa");
  assert.equal(choices[1][2], "School A");
  const styled = new ExcelJS.Workbook();
  await styled.xlsx.load(Buffer.from(buffer));
  const participantSheet = styled.getWorksheet("Participants");
  assert.ok(participantSheet);
  assert.equal(participantSheet.rowCount, 17);
  assert.equal(participantSheet.getCell("C2").dataValidation.type, "list");
  assert.equal(participantSheet.getCell("D2").dataValidation.type, "list");
  assert.equal(participantSheet.getCell("A2").numFmt, "@");
  assert.equal(participantSheet.views[0].ySplit, 1);
  assert.equal(participantSheet.views[0].showGridLines, true);
  assert.equal(participantSheet.pageSetup.orientation, "landscape");
  assert.equal(participantSheet.pageSetup.fitToWidth, 1);
  assert.equal(participantSheet.getColumn(1).width, 22);
  assert.equal(participantSheet.getColumn(2).width, 30);
  assert.equal(participantSheet.getColumn(4).width, 19);
  assert.equal(participantSheet.getCell("A1").font.color.argb, "FF1D2327");
  assert.equal(participantSheet.getCell("A1").fill.fgColor.argb, "FFC87838");
  assert.equal(participantSheet.getCell("A2").border.top.style, "medium");
  assert.equal(participantSheet.getCell("D5").border.bottom.style, "medium");
  assert.equal(participantSheet.getCell("A6").border.top.style, "medium");
  assert.notEqual(participantSheet.getCell("A2").fill.fgColor.argb, participantSheet.getCell("A3").fill.fgColor.argb);
  assert.ok(participantSheet.getTable("TahqeeqParticipants"));
  assert.equal(styled.getWorksheet("Choices").state, "hidden");
  assert.equal(styled.getWorksheet("_Tahqeeq").state, "veryHidden");
  assert.doesNotMatch(rows[0].join("|"), /Date/);
  const readMe = utils.sheet_to_json(workbook.Sheets.Instructions, {
    header: 1,
    defval: "",
    raw: false,
  });
  const readMeCells = readMe.flat().map(String);
  assert.ok(readMeCells.some((value) => value.includes("Supplied in this sheet")));
  assert.ok(readMeCells.some((value) => value.includes("review before applying")));
});

test("unused V7 starter rows do not become participant drafts", async () => {
  const competition = {
    version: 2,
    isSample: false,
    id: "competition-v6-prepared-rows",
    name: "Prepared Rows Competition",
    edition: "2026",
    status: "draft",
    setupRevision: 1,
    participantNumbering: "supplied",
    participantEntrySettings: { institutions: [], defaultMuqarrar: "", defaultInstitution: "" },
    divisions: [
      { id: "u14-hifz", name: "Under 14 · Hifz", ageGroup: "Under 14", category: "nubalaa", quranPortion: { kind: "full-quran" } },
      { id: "u16-hifz", name: "Under 16 · Hifz", ageGroup: "Under 16", category: "nubalaa", quranPortion: { kind: "full-quran" } },
    ],
    questionPolicy: {},
    liveSnapshot: null,
  };
  const buffer = await buildParticipantTemplate(competition);
  const draft = await parseRosterFileToDraft(
    new File([buffer], "prepared-category-rows.xlsx"),
    competition,
  );
  assert.equal(draft.rows.length, 0);
});

test("V7 generates four starter rows only for selected Categories", async () => {
  const competition = {
    version: 2,
    isSample: false,
    id: "competition-selected-categories",
    name: "Selected Categories Competition",
    edition: "2026",
    status: "draft",
    setupRevision: 1,
    participantNumbering: "automatic",
    participantEntrySettings: { institutions: [], defaultMuqarrar: "", defaultInstitution: "" },
    divisions: [
      { id: "junior-memory", name: "Junior", ageGroup: "Junior", category: "memorisation", quranPortion: { kind: "full-quran" } },
      { id: "open-reading", name: "Open", ageGroup: "Open", category: "mushaf-reading", quranPortion: { kind: "full-quran" } },
    ],
    questionPolicy: {},
    liveSnapshot: null,
  };
  const options = { selectedDivisionIds: ["open-reading"] };
  const buffer = await buildParticipantTemplate(competition, options);
  await verifyParticipantTemplate(buffer, competition, options);
  const workbook = read(buffer, { type: "array" });
  const rows = utils.sheet_to_json(workbook.Sheets.Participants, {
    header: 1,
    defval: "",
    raw: false,
  });
  assert.equal(rows.length, 5);
  assert.ok(rows.slice(1).every((row) => row[1] === "Open · Balaigen"));
  const metadataRows = utils.sheet_to_json(workbook.Sheets._Tahqeeq, { defval: "", raw: false });
  const metadata = Object.fromEntries(metadataRows.map((row) => [row.Key, row.Value]));
  assert.equal(metadata.TahqeeqSelectedCategoryIds, "open-reading");
});

test("a completed V7 starter row imports without the remaining starter rows", async () => {
  const competition = {
    version: 2,
    isSample: false,
    id: "competition-v5-import",
    name: "V7 Import Competition",
    edition: "2026",
    status: "draft",
    setupRevision: 1,
    participantNumbering: "supplied",
    participantEntrySettings: {
      institutions: ["School A"],
      defaultMuqarrar: "feshey-kolhu",
      defaultInstitution: "School A",
    },
    divisions: [{ id: "u14-hifz", name: "Under 14", ageGroup: "Under 14", category: "nubalaa", quranPortion: { kind: "full-quran" } }],
    questionPolicy: {},
    liveSnapshot: null,
  };
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(Buffer.from(await buildParticipantTemplate(competition, {
    includeInstitution: true,
    includePhone: true,
  })));
  const participants = workbook.getWorksheet("Participants");
  participants.getCell("A2").value = "007";
  participants.getCell("B2").value = "Aishath Ali";
  participants.getCell("C2").value = "Under 14 — Hifz";
  participants.getCell("D2").value = "Feshey kolhu";
  participants.getCell("E2").value = "0777000";
  participants.getCell("F2").value = "School A";
  const completed = await workbook.xlsx.writeBuffer();
  const file = new File([completed], "participants-v7.xlsx", {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const draft = await parseRosterFileToDraft(file, competition);

  assert.equal(draft.rows.length, 1);
  assert.equal(draft.numberingMode, "supplied");
  assert.equal(draft.rows[0].number, "007");
  assert.equal(draft.rows[0].divisionId, "u14-hifz");
  assert.equal(draft.rows[0].muqarrar, "starting-side");
  assert.equal(draft.rows[0].institution, "School A");
  assert.equal(draft.rows[0].phone, "0777000");
});

test("automatic numbering templates omit the participant-number column", async () => {
  const competition = {
    version: 2,
    isSample: false,
    id: "competition-automatic",
    name: "Automatic Numbering Competition",
    edition: "2026",
    status: "draft",
    setupRevision: 1,
    participantNumbering: "automatic",
    participantEntrySettings: {
      institutions: [],
      defaultMuqarrar: "feshey-kolhu",
      defaultInstitution: "",
    },
    divisions: [{ id: "open", name: "Open", ageGroup: "Open", category: "nubalaa", quranPortion: { kind: "full-quran" } }],
    questionPolicy: {},
    liveSnapshot: null,
  };
  const workbook = read(await buildParticipantTemplate(competition), { type: "array" });
  const rows = utils.sheet_to_json(workbook.Sheets.Participants, {
    header: 1,
    defval: "",
    raw: false,
  });

  assert.deepEqual(rows[0], ["Name", "Category", "Muqarrar start"]);
  const metadataRows = utils.sheet_to_json(workbook.Sheets._Tahqeeq, { defval: "", raw: false });
  const metadata = Object.fromEntries(metadataRows.map((row) => [row.Key, row.Value]));
  assert.equal(metadata.TahqeeqNumberingMode, "automatic");
});

test("participant templates can omit Institution and include Phone without shifting validation", async () => {
  const competition = {
    version: 2,
    isSample: false,
    id: "competition-custom-columns",
    name: "Custom Columns Competition",
    edition: "2026",
    status: "draft",
    setupRevision: 1,
    participantNumbering: "supplied",
    participantEntrySettings: {
      institutions: ["School A"],
      defaultMuqarrar: "feshey-kolhu",
      defaultInstitution: "School A",
    },
    divisions: [{ id: "open", name: "Open", ageGroup: "Open", category: "nubalaa", quranPortion: { kind: "full-quran" } }],
    questionPolicy: {},
    liveSnapshot: null,
  };
  const options = { includeInstitution: false, includePhone: true };
  const buffer = await buildParticipantTemplate(competition, options);
  await verifyParticipantTemplate(buffer, competition, options);
  const workbook = read(buffer, { type: "array" });
  const rows = utils.sheet_to_json(workbook.Sheets.Participants, {
    header: 1,
    defval: "",
    raw: false,
  });
  assert.deepEqual(rows[0], ["Participant Number", "Name", "Category", "Muqarrar start", "Phone Number"]);
  const metadataRows = utils.sheet_to_json(workbook.Sheets._Tahqeeq, { defval: "", raw: false });
  const metadata = Object.fromEntries(metadataRows.map((row) => [row.Key, row.Value]));
  assert.equal(metadata.TahqeeqTemplateColumns, rows[0].join("|"));
  const styled = new ExcelJS.Workbook();
  await styled.xlsx.load(Buffer.from(buffer));
  const participants = styled.getWorksheet("Participants");
  assert.equal(participants.getCell("C2").dataValidation.type, "list");
  assert.equal(participants.getCell("D2").dataValidation.type, "list");
  assert.equal(participants.getCell("E2").numFmt, "@");
});

test("the separate sample workbook contains fictional, importable participants", async () => {
  const buffer = await buildSampleParticipantWorkbook();
  const workbook = read(buffer, { type: "array" });
  const rows = utils.sheet_to_json(workbook.Sheets.Participants, {
    defval: "",
    raw: false,
  });
  assert.equal(rows.length, 72);
  assert.ok(rows.every((row) => !String(row.Name).startsWith("Sample Participant")));
  assert.equal(rows[0].Name, "Ahmed Rasheed");
  assert.ok(Object.hasOwn(rows[0], "Muqarrar start"));
  const preview = parseRosterRows(rows);
  assert.equal(preview.entries.length, 72);
  assert.equal(preview.issues.filter((issue) => issue.level === "error").length, 0);
});

test("settings opens one recoverable editor instead of applying imports immediately", () => {
  assert.match(setupSource, /ParticipantRosterEditor/);
  assert.match(setupSource, /Resume participant list/);
  assert.match(setupSource, /review every row before it becomes official/i);
  assert.doesNotMatch(setupSource, /rosterPreview/);
  assert.match(rosterEditorSource, /Paste table/);
  assert.match(rosterEditorSource, /Participant template/);
  assert.match(rosterEditorSource, /Build participant list/);
  assert.match(rosterEditorSource, /Download Excel/);
  assert.match(rosterEditorSource, /Review and apply/);
  assert.match(rosterEditorSource, /Participants by category/);
  assert.match(setupSource, /Participant defaults/);
  assert.match(rosterEditorSource, /Resolve categories once/);
  assert.match(rosterEditorSource, /Add participant like/);
  assert.match(rosterEditorSource, /role="radiogroup"/);
  assert.doesNotMatch(rosterEditorSource, />Division</);
  assert.match(rosterEditorSource, /APPLY_ROSTER_DRAFT/);
});

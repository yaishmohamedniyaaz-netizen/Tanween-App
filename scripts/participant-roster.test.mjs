import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { read, utils } from "xlsx";
import {
  buildParticipantTemplate,
  buildSampleParticipantWorkbook,
  parseRosterRows,
  PARTICIPANT_TEMPLATE_HEADERS,
  verifyParticipantTemplate,
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
  assert.equal(preview.entries[0].category, "baliagen");
  assert.equal(preview.entries[0].muqarrar, "feshey-kolhu");
  assert.equal(preview.entries[1].category, "nubalaa");
  assert.equal(participantCategoryLabel(preview.entries[1].category), "Hifz · Memorisation");
  assert.equal(normalizeParticipantCategory("Nubalaa"), "nubalaa");
  assert.match(preview.entries[0].id, /^participant-/);
  assert.equal(participantCategoryLabel(preview.entries[0].category), "Baliagen · Tarteel / reading");
  assert.equal(muqarrarLabel(preview.entries[1].muqarrar), "Nimey kolhu · Ending side");
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
  assert.match(rejected.message, /Baliagen or Hifz/);
  assert.match(rejected.message, /Feshey kolhu or Nimey kolhu/);
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

test("the competition workbook round-trips with V3 category choices and supplied numbering", async () => {
  const competition = {
    version: 2,
    isSample: false,
    id: "competition-test",
    name: "Test Competition",
    edition: "2026",
    status: "draft",
    setupRevision: 1,
    participantNumbering: "supplied",
    divisions: [{ id: "u14-hifz", name: "Under 14", ageGroup: "Under 14", category: "nubalaa", quranPortion: { kind: "full-quran" } }],
    questionPolicy: {},
    liveSnapshot: null,
  };
  const buffer = await buildParticipantTemplate(competition);
  await verifyParticipantTemplate(buffer, competition);
  const workbook = read(buffer, { type: "array" });
  assert.deepEqual(workbook.SheetNames, ["Participants", "Choices", "Instructions"]);
  assert.equal(workbook.Custprops.TahqeeqTemplateVersion, 3);
  assert.equal(workbook.Custprops.TahqeeqCompetitionId, "competition-test");
  assert.equal(workbook.Custprops.TahqeeqNumberingMode, "supplied");
  assert.ok(String(workbook.Custprops.TahqeeqCategoryFingerprint).length > 0);
  assert.ok(String(workbook.Custprops.TahqeeqDivisionFingerprint).length > 0);
  const rows = utils.sheet_to_json(workbook.Sheets.Participants, {
    header: 1,
    defval: "",
    raw: false,
  });
  assert.deepEqual(rows[0], ["Participant Number", "Name", "Category", "Muqarrar start", "Institution", "Phone Number"]);
  assert.equal(rows.length, 1);
  const choices = utils.sheet_to_json(workbook.Sheets.Choices, {
    header: 1,
    defval: "",
    raw: false,
  });
  assert.deepEqual(choices[0], ["Category", "Muqarrar start"]);
  assert.equal(choices[1][0], "Under 14 — Hifz");
  const readMe = utils.sheet_to_json(workbook.Sheets.Instructions, {
    header: 1,
    defval: "",
    raw: false,
  });
  const readMeCells = readMe.flat().map(String);
  assert.ok(readMeCells.some((value) => value.includes("Supplied in this sheet")));
  assert.ok(readMeCells.some((value) => value.includes("review before applying")));
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

  assert.deepEqual(rows[0], ["Name", "Category", "Muqarrar start", "Institution", "Phone Number"]);
  assert.equal(workbook.Custprops.TahqeeqNumberingMode, "automatic");
});

test("the separate sample workbook contains fictional, importable participants", async () => {
  const buffer = await buildSampleParticipantWorkbook();
  const workbook = read(buffer, { type: "array" });
  const rows = utils.sheet_to_json(workbook.Sheets.Participants, {
    defval: "",
    raw: false,
  });
  assert.equal(rows.length, 8);
  assert.ok(rows.every((row) => !String(row.Name).startsWith("Sample Participant")));
  assert.equal(rows[0].Name, "Ahmed Rasheed");
  assert.ok(Object.hasOwn(rows[0], "Muqarrar start"));
  const preview = parseRosterRows(rows);
  assert.equal(preview.entries.length, 8);
  assert.equal(preview.issues.filter((issue) => issue.level === "error").length, 0);
});

test("settings opens one recoverable editor instead of applying imports immediately", () => {
  assert.match(setupSource, /ParticipantRosterEditor/);
  assert.match(setupSource, /Resume participant list/);
  assert.match(setupSource, /review every row before it becomes official/i);
  assert.doesNotMatch(setupSource, /rosterPreview/);
  assert.match(rosterEditorSource, /Paste table/);
  assert.match(rosterEditorSource, /Competition template/);
  assert.match(rosterEditorSource, /Review and apply/);
  assert.match(rosterEditorSource, /Participants by category/);
  assert.match(rosterEditorSource, /role="radiogroup"/);
  assert.doesNotMatch(rosterEditorSource, />Division</);
  assert.match(rosterEditorSource, /APPLY_ROSTER_DRAFT/);
});

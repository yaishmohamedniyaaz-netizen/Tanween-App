import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { read, utils } from "xlsx";
import {
  buildParticipantTemplate,
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

test("the downloadable workbook round-trips with the exact seven headers", async () => {
  const buffer = await buildParticipantTemplate();
  await verifyParticipantTemplate(buffer);
  const workbook = read(buffer, { type: "array" });
  assert.deepEqual(workbook.SheetNames, ["Participants", "Read me"]);
  const rows = utils.sheet_to_json(workbook.Sheets.Participants, {
    header: 1,
    defval: "",
    raw: false,
  });
  assert.deepEqual(rows[0], [...PARTICIPANT_TEMPLATE_HEADERS]);
  assert.equal(rows.length, 1);
  const readMe = utils.sheet_to_json(workbook.Sheets["Read me"], {
    header: 1,
    defval: "",
    raw: false,
  });
  const readMeCells = readMe.flat().map(String);
  assert.ok(readMeCells.some((value) => value.includes("Baliagen (Tarteel / reading) or Hifz (memorisation).")));
  assert.ok(readMeCells.some((value) => value.includes("Feshey kolhu (starting side) or Nimey kolhu (ending side).")));
});

test("settings offers download and replace-preview instead of immediate overwrite", () => {
  assert.match(setupSource, /Download template/);
  assert.match(setupSource, /rosterPreview/);
  assert.match(setupSource, /Replace participant list/);
  assert.match(setupSource, /downloadParticipantTemplate/);
});

import assert from "node:assert/strict";
import test from "node:test";
import {
  automaticParticipantNumber,
  createRosterDraftFromRoster,
  createRosterDraftFromRows,
  parseDelimitedRosterText,
  recordsFromRosterGrid,
  rosterDraftComparison,
  validateRosterDraft,
} from "../src/lib/roster.ts";

const divisions = [
  { id: "u14-hifz", name: "Under 14", ageGroup: "Under 14", category: "nubalaa", quranPortion: { kind: "full-quran" } },
  { id: "u16-baliagen", name: "Under 16", ageGroup: "Under 16", category: "baliagen", quranPortion: { kind: "full-quran" } },
];

test("automatic numbering uses two digits below 100 and three at 100", () => {
  assert.equal(automaticParticipantNumber(0, 8), "01");
  assert.equal(automaticParticipantNumber(98, 99), "99");
  assert.equal(automaticParticipantNumber(0, 100), "001");
  assert.equal(automaticParticipantNumber(99, 100), "100");
});

test("invalid imported rows stay in the draft with field-level errors", () => {
  const draft = createRosterDraftFromRows({
    rows: [
      { Name: "Aishath", Division: "Under 14 — Hifz", Muqarrar: "Feshey kolhu" },
      { Name: "", Division: "Old division", Muqarrar: "Wrong side" },
    ],
    competitionId: "competition-test",
    divisions,
    numberingMode: "automatic",
    source: "file",
  });
  const result = validateRosterDraft(draft, divisions);
  assert.equal(draft.rows.length, 2);
  assert.equal(result.entries.length, 1);
  assert.equal(result.rows[0].number, "01");
  assert.ok(result.issues.some((issue) => issue.field === "name" && issue.level === "error"));
  assert.ok(result.issues.some((issue) => issue.field === "divisionId" && issue.level === "error"));
  assert.ok(result.issues.some((issue) => issue.field === "muqarrar" && issue.level === "error"));
});

test("V1 age group and category rows map to current division ids", () => {
  const draft = createRosterDraftFromRows({
    rows: [{ "Participant Number": "014", Name: "Mariyam", "Age Group": "Under 16", Category: "Baliagen", Muqarrar: "Nimey kolhu" }],
    competitionId: "competition-test",
    divisions,
    numberingMode: "supplied",
    source: "file",
  });
  assert.equal(draft.rows[0].divisionId, "u16-baliagen");
  const result = validateRosterDraft(draft, divisions);
  assert.equal(result.errorCount, 0);
  assert.equal(result.entries[0].number, "014");
  assert.equal(result.entries[0].category, "baliagen");
});

test("V3 Category and Muqarrar start headers map without changing internal ids", () => {
  const draft = createRosterDraftFromRows({
    rows: [{ Name: "Aishath", Category: "Under 14 — Hifz", "Muqarrar start": "Feshey kolhu" }],
    competitionId: "competition-test",
    divisions,
    numberingMode: "automatic",
    source: "file",
  });
  const result = validateRosterDraft(draft, divisions);
  assert.equal(draft.rows[0].divisionId, "u14-hifz");
  assert.equal(draft.rows[0].muqarrar, "feshey-kolhu");
  assert.equal(result.errorCount, 0);
});

test("spreadsheet paste recognizes V3 headers and quoted multiline cells", () => {
  const parsed = parseDelimitedRosterText('Name\tCategory\tMuqarrar start\tInstitution\n"Aisha\nAhmed"\tUnder 14 — Hifz\tFeshey kolhu\tSchool A');
  assert.equal(parsed.hasRecognizedHeader, true);
  const records = recordsFromRosterGrid(parsed);
  assert.equal(records.length, 1);
  assert.equal(records[0].name, "Aisha\nAhmed");
  assert.equal(records[0].division, "Under 14 — Hifz");
});

test("legacy Age Group plus Category paste still treats Category as recitation type", () => {
  const parsed = parseDelimitedRosterText("Name\tAge Group\tCategory\tMuqarrar\nAishath\tUnder 16\tBaliagen\tNimey kolhu");
  assert.deepEqual(parsed.suggestedMapping, ["name", "ageGroup", "category", "muqarrar"]);
});

test("a headerless paste can be mapped without losing its first participant", () => {
  const parsed = parseDelimitedRosterText("Aishath\tUnder 14 — Hifz\tFeshey kolhu");
  const records = recordsFromRosterGrid(parsed, ["name", "division", "muqarrar"], false);
  assert.equal(records.length, 1);
  assert.equal(records[0].name, "Aishath");
});

test("editing an applied roster preserves participant ids", () => {
  const current = [{ id: "participant-stable", number: "08", name: "Old name", ageGroup: "Under 14", category: "nubalaa", muqarrar: "feshey-kolhu", phone: "", institution: "", judged: false }];
  const draft = createRosterDraftFromRoster({ roster: current, competitionId: "competition-test", divisions, numberingMode: "automatic" });
  draft.rows[0].name = "Corrected name";
  const result = validateRosterDraft(draft, divisions);
  assert.equal(result.entries[0].id, "participant-stable");
  assert.equal(result.entries[0].number, "01");
  assert.deepEqual(rosterDraftComparison(current, result.entries), { before: 1, after: 1, added: 0, edited: 1, removed: 0 });
});

test("supplied numbers reject case-insensitive duplicates", () => {
  const draft = createRosterDraftFromRows({
    rows: [
      { Number: "A7", Name: "One", Division: "Under 14 — Hifz", Muqarrar: "Feshey kolhu" },
      { Number: "a7", Name: "Two", Division: "Under 14 — Hifz", Muqarrar: "Nimey kolhu" },
    ],
    competitionId: "competition-test",
    divisions,
    numberingMode: "supplied",
    source: "paste",
  });
  const result = validateRosterDraft(draft, divisions);
  assert.ok(result.issues.some((issue) => /duplicated/.test(issue.message)));
});

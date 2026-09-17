import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { build } from "esbuild";
import { utils, write, version } from "xlsx";
import { buildStateBackup, parseStateBackup } from "../src/lib/resultPackages.ts";
import { parseRosterFile } from "../src/lib/roster.ts";

// Exercise the real TSX migration code, including legacy backup compatibility.
const bundled = await build({
  entryPoints: ["src/state/store.tsx"], bundle: true, write: false,
  platform: "node", format: "esm", packages: "external",
});
const { normalizeLedgerState } = await import(
  `data:text/javascript;base64,${Buffer.from(bundled.outputFiles[0].text
    .replace(/from "react"/g, `from ${JSON.stringify(import.meta.resolve("react"))}`))
    .toString("base64")}`
);

test("current and legacy backup imports survive migration without changing notes", () => {
  for (const state of [
    { history: [], roster: [], notes: "Legacy notes" },
    { ...normalizeLedgerState({}), notes: "Current notes" },
  ]) {
    const input = JSON.parse(JSON.stringify(buildStateBackup(state)));
    const restored = normalizeLedgerState(parseStateBackup(input));
    assert.equal(restored.notes, state.notes);
    assert.deepEqual(restored.history, state.history);
    assert.doesNotThrow(() => normalizeLedgerState(restored));
  }
});

test("malformed backup fields are rejected before migration without changing current state", () => {
  const current = normalizeLedgerState({});
  const before = JSON.stringify(current);
  for (const [key, value] of Object.entries({
    notes: {}, events: "not-an-array", competition: 42, decks: {}, draws: [null],
    history: [null], roster: [null], finalizedResults: "bad", panel: [],
    mistakes: [null], impressions: [null], sessionActive: "yes", activeRevision: -1,
    activeStartedAt: "today", participant: { name: {} },
  })) {
    assert.throws(() => parseStateBackup(buildStateBackup({ ...current, [key]: value })),
      /not a complete Tahqeeq backup file/, key);
  }
  assert.equal(JSON.stringify(current), before);
});

test("malformed saved-session evidence is rejected", () => {
  const current = normalizeLedgerState({});
  for (const events of ["bad", [null], [{ id: "e", at: 1, type: "unknown" }]]) {
    assert.throws(() => parseStateBackup(buildStateBackup({ ...current, history: [{
      id: "session", savedAt: 1, participant: current.participant,
      config: current.config, notes: "", mistakes: [], events,
    }] })), /not a complete Tahqeeq backup file/);
  }
});

test("a scored backup retains its ledger, deductions and historical notes", () => {
  const idle = normalizeLedgerState({});
  const active = normalizeLedgerState({ ...idle, sessionActive: true,
    participant: { ...idle.participant, id: "participant-1", name: "Test participant" },
    activeSessionId: "security-session", activeStartedAt: 100,
    notes: "Keep this evidence", mistakes: [{ id: "m1", tid: "legacy-token",
      surah: 1, ayah: 1, glyph: "ب", label: "1:1", category: "jali", amount: 2, ts: 101 }],
  });
  const saved = { id: "saved-session", savedAt: 200, startedAt: 100,
    participant: active.participant, config: active.config, notes: active.notes,
    events: active.events, mistakes: active.mistakes, impressions: active.impressions,
    assignment: active.activeAssignment, total: 98, totalMax: 100 };
  const original = { ...active, history: [saved] };
  const expected = normalizeLedgerState(original);
  const actual = normalizeLedgerState(parseStateBackup(
    JSON.parse(JSON.stringify(buildStateBackup(original)))));
  assert.deepEqual(actual.events, expected.events);
  assert.deepEqual(actual.mistakes, expected.mistakes);
  assert.deepEqual(actual.history, expected.history);
  assert.equal(actual.history[0].notes, "Keep this evidence");
});

test("patched spreadsheet reader retains XLSX, XLS and CSV text imports", async () => {
  assert.equal(version, "0.20.3");
  const rows = [{ "Participant Number": "014", Name: "=literal name",
    "Age Group": "Under 16", Category: "Hifz", Muqarrar: "Nimey kolhu",
    "Phone Number": "+9601234567" }];
  for (const bookType of ["xlsx", "xls", "csv"]) {
    const workbook = utils.book_new();
    utils.book_append_sheet(workbook, utils.json_to_sheet(rows), "Participants");
    const bytes = write(workbook, { type: "buffer", bookType });
    const preview = await parseRosterFile(new File([bytes], `roster.${bookType}`));
    assert.equal(preview.entries[0].name, "=literal name");
    assert.equal(preview.entries[0].number, "014");
  }
});

test("a corrupt workbook fails without returning a roster", async () => {
  await assert.rejects(() => parseRosterFile(new File([
    new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0, 0, 0, 0]),
  ], "corrupt.xlsx")));
});

test("pre-upgrade fixtures preserve multilingual text, optional fields and leading zeros", async () => {
  for (const ext of ["xlsx", "xls", "csv"]) {
    const bytes = await readFile(new URL(`./fixtures/security-imports/legacy-roster.${ext}`, import.meta.url));
    const preview = await parseRosterFile(new File([bytes], `legacy-roster.${ext}`));
    assert.equal(preview.entries.length, 1);
    assert.equal(preview.entries[0].number, "014");
    assert.equal(preview.entries[0].name, "مريم މަރިޔަމް");
    assert.equal(preview.entries[0].phone, "+9601234567");
    assert.equal(preview.entries[0].institution, "Synthetic test school");
  }
});

import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import {
  latestMistakeEventIds,
  projectMistakes,
  seedLedgerEvents,
} from "../src/lib/judgingLedger.ts";
import { computeMistakeScores } from "../src/lib/scoring.ts";

const mistake = {
  id: "m-1",
  tid: "113:4:3:u4",
  surah: 113,
  ayah: 4,
  page: 604,
  glyph: "ف",
  label: "113:4 · letter 4",
  category: "jali",
  amount: 2,
  ts: 100,
};

const participant = { name: "Reciter", number: "7", group: "A" };
const config = {
  jali: { start: 50, step: 2 },
  khafi: { start: 30, step: 1 },
  fasaha: { start: 20, step: 1 },
};

test("the current score is reconstructed from the action history", () => {
  const events = [
    { id: "e1", at: 100, type: "mistake_added", mistake },
    {
      id: "e2",
      at: 110,
      type: "mistake_amount_changed",
      mistakeId: mistake.id,
      glyph: mistake.glyph,
      label: mistake.label,
      from: 2,
      to: 3.5,
    },
  ];
  const projected = projectMistakes(events);
  assert.equal(projected.length, 1);
  assert.equal(projected[0].amount, 3.5);
  assert.equal(computeMistakeScores(config, projected).total, 96.5);
  assert.deepEqual(projectMistakes(events), projected);
});

test("undo keeps evidence and restore returns the exact adjusted mark", () => {
  const adjusted = { ...mistake, amount: 3.5 };
  const events = [
    { id: "e1", at: 100, type: "mistake_added", mistake },
    {
      id: "e2",
      at: 110,
      type: "mistake_amount_changed",
      mistakeId: mistake.id,
      glyph: mistake.glyph,
      label: mistake.label,
      from: 2,
      to: 3.5,
    },
    { id: "e3", at: 120, type: "mistake_undone", mistake: adjusted },
  ];
  assert.deepEqual(projectMistakes(events), []);
  assert.equal(latestMistakeEventIds(events).get(mistake.id), "e3");

  const restored = [
    ...events,
    { id: "e4", at: 130, type: "mistake_restored", mistake: adjusted },
  ];
  assert.equal(projectMistakes(restored)[0].amount, 3.5);
  assert.equal(latestMistakeEventIds(restored).get(mistake.id), "e4");
});

test("old mistake snapshots receive a deterministic readable history", () => {
  const first = seedLedgerEvents({
    sessionId: "s-1",
    participant,
    startedAt: 50,
    mistakes: [mistake],
  });
  const second = seedLedgerEvents({
    sessionId: "s-1",
    participant,
    startedAt: 50,
    mistakes: [mistake],
  });
  assert.deepEqual(second, first);
  assert.equal(first[0].type, "session_started");
  assert.deepEqual(projectMistakes(first), [mistake]);
});

test("the app backs up old data and requires a reason to reopen", () => {
  const storeSource = fs.readFileSync(
    new URL("../src/state/store.tsx", import.meta.url),
    "utf8",
  );
  const recordsSource = fs.readFileSync(
    new URL("../src/components/RecordsView.tsx", import.meta.url),
    "utf8",
  );
  assert.match(storeSource, /tahqeeq\.session\.v1\.backup\.pre-ledger-v1/);
  assert.match(storeSource, /type: "session_finalized"/);
  assert.match(storeSource, /case "REOPEN_SESSION"/);
  assert.match(storeSource, /!saved \|\|\s*!reason \|\|/);
  assert.match(storeSource, /saved\.competitionId !== state\.competition\.id/);
  assert.match(recordsSource, /Reopen to correct/);
  assert.doesNotMatch(recordsSource, /type: "DELETE_SESSION"/);
  assert.doesNotMatch(recordsSource, /type: "CLEAR_HISTORY"/);
});

test("marking a letter again under another criterion corrects it in place", () => {
  const events = [
    { id: "e1", at: 1, type: "mistake_added", mistake: { ...mistake, category: "jali", amount: 2 } },
    {
      id: "e2",
      at: 2,
      type: "mistake_recategorized",
      mistakeId: mistake.id,
      glyph: mistake.glyph,
      label: mistake.label,
      from: "jali",
      to: "khafi",
      fromAmount: 2,
      toAmount: 1,
    },
  ];
  const projected = projectMistakes(events);
  assert.equal(projected.length, 1, "one letter must hold one finding");
  assert.equal(projected[0].id, mistake.id, "the entry keeps its identity");
  assert.equal(projected[0].category, "khafi");
  assert.equal(projected[0].amount, 1);
  assert.equal(projected[0].tid, mistake.tid);
});

test("a correction deducts once, not twice", () => {
  const corrected = projectMistakes([
    { id: "e1", at: 1, type: "mistake_added", mistake: { ...mistake, category: "jali", amount: 2 } },
    {
      id: "e2", at: 2, type: "mistake_recategorized", mistakeId: mistake.id,
      glyph: mistake.glyph, label: mistake.label,
      from: "jali", to: "khafi", fromAmount: 2, toAmount: 1,
    },
  ]);
  const scores = computeMistakeScores(config, corrected);
  assert.equal(scores.byCategory.jali.score, 50, "the abandoned criterion is made whole again");
  assert.equal(scores.byCategory.jali.count, 0);
  assert.equal(scores.byCategory.khafi.score, 29, "only the corrected criterion is deducted");
  assert.equal(scores.byCategory.khafi.count, 1);
});

test("correcting a letter that is no longer marked changes nothing", () => {
  const projected = projectMistakes([
    { id: "e1", at: 1, type: "mistake_added", mistake },
    { id: "e2", at: 2, type: "mistake_undone", mistake },
    {
      id: "e3", at: 3, type: "mistake_recategorized", mistakeId: mistake.id,
      glyph: mistake.glyph, label: mistake.label,
      from: "jali", to: "khafi", fromAmount: 2, toAmount: 1,
    },
  ]);
  assert.equal(projected.length, 0);
});

test("a correction can be undone like any other mistake", () => {
  const projected = projectMistakes([
    { id: "e1", at: 1, type: "mistake_added", mistake },
    {
      id: "e2", at: 2, type: "mistake_recategorized", mistakeId: mistake.id,
      glyph: mistake.glyph, label: mistake.label,
      from: "jali", to: "khafi", fromAmount: 2, toAmount: 1,
    },
    { id: "e3", at: 3, type: "mistake_undone", mistake },
  ]);
  assert.equal(projected.length, 0);
});

test("version 1 ledgers replay unchanged", () => {
  const projected = projectMistakes([
    { id: "e1", at: 1, type: "mistake_added", mistake },
    {
      id: "e2", at: 2, type: "mistake_amount_changed", mistakeId: mistake.id,
      glyph: mistake.glyph, label: mistake.label, from: 2, to: 4,
    },
  ]);
  assert.equal(projected.length, 1);
  assert.equal(projected[0].category, "jali");
  assert.equal(projected[0].amount, 4);
});

test("a correction is the letter's latest event, so it can be undone from the log", () => {
  const latest = latestMistakeEventIds([
    { id: "e1", at: 1, type: "mistake_added", mistake },
    {
      id: "e2", at: 2, type: "mistake_recategorized", mistakeId: mistake.id,
      glyph: mistake.glyph, label: mistake.label,
      from: "jali", to: "khafi", fromAmount: 2, toAmount: 1,
    },
  ]);
  assert.equal(latest.get(mistake.id), "e2");
});

test("two judges marking the same letter stay two separate findings", () => {
  const projected = projectMistakes([
    { id: "e1", at: 1, type: "mistake_added", mistake: { ...mistake, id: "m-jali", category: "jali", judgeSeatId: "seat-1" } },
    { id: "e2", at: 2, type: "mistake_added", mistake: { ...mistake, id: "m-khafi", category: "khafi", judgeSeatId: "seat-2" } },
  ]);
  assert.equal(projected.length, 2, "one judge's finding must not overwrite another's");
});

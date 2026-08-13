import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import {
  latestMistakeEventIds,
  projectMistakes,
  seedLedgerEvents,
} from "../src/lib/judgingLedger.ts";
import { computeCategoryScores } from "../src/lib/scoring.ts";

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
  jali: { enabled: true, start: 50, step: 2 },
  khafi: { enabled: true, start: 30, step: 1 },
  fasaha: { enabled: true, start: 20, step: 1 },
  "adu-raagu": { enabled: false, start: 0, step: 1 },
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
  assert.equal(computeCategoryScores(config, projected).total, 96.5);
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

import assert from "node:assert/strict";
import test from "node:test";
import { judgingTargetsOf } from "../src/lib/judgingUnits.ts";
import { buildTargetMigrationPatches } from "../src/state/migrateTargets.ts";

const config = {
  jali: { enabled: true, start: 50, step: 2 },
  khafi: { enabled: true, start: 30, step: 1 },
  fasaha: { enabled: true, start: 20, step: 1 },
  "adu-raagu": { enabled: false, start: 0, step: 1 },
};

function mistake(overrides = {}) {
  return {
    id: "m1",
    tid: "103.3.5@u3",
    surah: 103,
    ayah: 3,
    page: 601,
    glyph: "ا",
    label: "103:3 · letter 4",
    category: "jali",
    amount: 2,
    note: "judge note must remain outside identity patches",
    ts: 1,
    ...overrides,
  };
}

function state(active = [], historyMistakes = []) {
  return {
    participant: { name: "", number: "", group: "" },
    sessionActive: true,
    config,
    mistakes: active,
    notes: "live note",
    history: historyMistakes.length
      ? [
          {
            id: "s1",
            savedAt: 1,
            participant: { name: "A", number: "", group: "" },
            config,
            total: 98,
            totalMax: 100,
            notes: "saved note",
            mistakes: historyMistakes,
          },
        ]
      : [],
    roster: [],
  };
}

const tawasaw =
  "\u0648\u064e\u062a\u064e\u0648\u064e\u0627\u0635\u064e\u0648\u06e1\u0627\u0652";
const page601 = {
  page: 601,
  font: "qcf-v1",
  layout: "KFGQPC V1 1405H",
  lines: [
    {
      n: 1,
      type: "ayah",
      centered: false,
      words: [
        {
          wid: "103.3.5",
          text: tawasaw,
          surah: 103,
          ayah: 3,
          role: "letter",
        },
      ],
    },
  ],
};

test("many-to-one V1 ids migrate to one stable target without mutable fields", async () => {
  const original = mistake();
  const patches = await buildTargetMigrationPatches(
    state([original]),
    async () => page601,
  );
  assert.deepEqual(patches.m1, {
    tid: "103.3.5@r4",
    targetVersion: 2,
    sourceVersion: "qpc-hafs-v1-1405-r1",
    ruleVersion: "qpc-hafs-v1-targets-2.0.0",
    wordId: "103.3.5",
    sourceStart: 4,
    sourceEnd: 7,
    primaryGlyph: "و",
    fullGlyph: "وَا",
    originalTid: "103.3.5@u3",
    migrationStatus: "auto-merged",
  });
  assert.ok(!("glyph" in patches.m1));
  assert.ok(!("amount" in patches.m1));
  assert.ok(!("note" in patches.m1));
});

test("active and historical records are both included and deduplicated by id", async () => {
  const active = mistake({ id: "active", tid: "103.3.5#0" });
  const saved = mistake({ id: "saved", tid: "103.3.5@u6" });
  const patches = await buildTargetMigrationPatches(
    state([active], [saved]),
    async () => page601,
  );
  assert.deepEqual(Object.keys(patches).sort(), ["active", "saved"]);
  assert.equal(patches.active.migrationStatus, "exact");
  assert.equal(patches.saved.migrationStatus, "auto-merged");
});

test("an unknown or ambiguous legacy id remains explicitly unresolved", async () => {
  const old = mistake({ tid: "103.3.5@u99" });
  const patches = await buildTargetMigrationPatches(
    state([old]),
    async () => page601,
  );
  assert.deepEqual(patches.m1, {
    originalTid: "103.3.5@u99",
    migrationStatus: "unresolved",
  });
});

test("fully migrated V2 evidence is idempotent and performs no page load", async () => {
  const target = judgingTargetsOf(tawasaw, "letter", "103.3.5")[2];
  const current = mistake({
    tid: target.tid,
    targetVersion: 2,
    sourceVersion: "qpc-hafs-v1-1405-r1",
    ruleVersion: "qpc-hafs-v1-targets-2.0.0",
    wordId: "103.3.5",
    sourceStart: target.start,
    sourceEnd: target.end,
    primaryGlyph: target.primaryGlyph,
    fullGlyph: target.fullGlyph,
    migrationStatus: "exact",
  });
  let loads = 0;
  const patches = await buildTargetMigrationPatches(state([current]), async () => {
    loads += 1;
    return page601;
  });
  assert.deepEqual(patches, {});
  assert.equal(loads, 0);
});

test("pre-navigation mistakes use the bundled page 604 fallback", async () => {
  const old = mistake({ page: undefined });
  let requestedPage = 0;
  await buildTargetMigrationPatches(state([old]), async (page) => {
    requestedPage = page;
    return page601;
  });
  assert.equal(requestedPage, 604);
});

test("a page-load failure rejects before any partial state can be dispatched", async () => {
  await assert.rejects(
    buildTargetMigrationPatches(state([mistake()]), async () => {
      throw new Error("offline");
    }),
    /offline/,
  );
});

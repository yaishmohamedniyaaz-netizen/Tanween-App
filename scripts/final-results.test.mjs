import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  buildResultCandidates,
  finalizeParticipantResult,
  placeFinalizedResults,
} from "../src/lib/finalResults.ts";
import {
  buildFinalResultsWorkbook,
  finalResultsHeaders,
  verifyFinalResultsWorkbook,
} from "../src/lib/finalResultsWorkbook.ts";
import {
  buildJudgeResultPackage,
  buildStateBackup,
  parseJudgeResultPackage,
  parseStateBackup,
} from "../src/lib/resultPackages.ts";

const config = {
  jali: { enabled: true, start: 50, step: 2 },
  khafi: { enabled: true, start: 30, step: 1 },
  fasaha: { enabled: true, start: 20, step: 1 },
  "adu-raagu": { enabled: false, start: 0, step: 1 },
};
const JUDGED = ["jali", "khafi", "fasaha"];
const participant = {
  id: "participant-1",
  number: "014",
  name: "Aishath Latheefa",
  ageGroup: "Under 14",
  category: "baliagen",
  muqarrar: "feshey-kolhu",
  phone: "7771234",
  institution: "School A",
};
const competition = {
  version: 1,
  id: "competition-test",
  name: "National Quran Competition",
  edition: "2026",
};

function session(id, categories, mistakes = [], savedAt = 1000) {
  return {
    id,
    savedAt,
    revision: 1,
    participant,
    config,
    total: 0,
    totalMax: 0,
    scoreKind: "judge-section",
    assignment: {
      version: 1,
      panel: {
        version: 1,
        preset: categories.length === 3 ? "all" : "custom",
        seats: [{ id: `judge-${id}`, label: `Judge ${id}`, name: "", categories }],
      },
      judgeSeatId: `judge-${id}`,
      judgeLabel: `Judge ${id}`,
      judgeName: "",
      categories,
      config,
    },
    notes: "",
    mistakes,
    events: [],
  };
}

function mistake(category, amount) {
  return {
    id: `mistake-${category}-${amount}`,
    tid: `target-${category}`,
    surah: 1,
    ayah: 1,
    glyph: "ا",
    label: "1:1 · letter 1",
    category,
    amount,
    ts: 900,
  };
}

test("three judge-owned sections combine only when every category is present", () => {
  const history = [
    session("jali", ["jali"], [mistake("jali", 2)]),
    session("khafi", ["khafi"], [mistake("khafi", 1)]),
    session("fasaha", ["fasaha"], [mistake("fasaha", 1)]),
  ];
  const candidate = buildResultCandidates(history, JUDGED)[0];
  assert.deepEqual(candidate.missing, []);
  assert.deepEqual(candidate.conflicts, []);
  const result = finalizeParticipantResult(candidate, {});
  assert.ok(result);
  assert.equal(result.byCategory.jali.score, 48);
  assert.equal(result.byCategory.khafi.score, 29);
  assert.equal(result.byCategory.fasaha.score, 19);
  assert.equal(result.total, 96);
  assert.equal(result.totalMax, 100);
});

test("missing and competing judge sections never resolve silently", () => {
  const incomplete = buildResultCandidates([session("jali", ["jali"])], JUDGED)[0];
  assert.deepEqual(incomplete.missing, ["khafi", "fasaha"]);
  assert.equal(finalizeParticipantResult(incomplete, {}), null);

  const conflict = buildResultCandidates([
    session("jali-a", ["jali"]),
    session("jali-b", ["jali"], [], 1100),
    session("khafi", ["khafi"]),
    session("fasaha", ["fasaha"]),
  ], JUDGED)[0];
  assert.deepEqual(conflict.conflicts, ["jali"]);
  assert.equal(finalizeParticipantResult(conflict, {}), null);
  assert.ok(finalizeParticipantResult(conflict, { jali: "jali-b" }));
});

test("finalization rejects participants without ranking identity fields", () => {
  const incompleteParticipant = {
    ...participant,
    number: "",
    ageGroup: "",
    category: "",
    muqarrar: "",
  };
  const source = {
    ...session("all-incomplete", ["jali", "khafi", "fasaha"]),
    participant: incompleteParticipant,
  };
  const candidate = buildResultCandidates([source], JUDGED)[0];
  assert.equal(finalizeParticipantResult(candidate, {}), null);
});

test("equal percentages retain equal places inside the same age and category", () => {
  const firstCandidate = buildResultCandidates([
    session("all-a", ["jali", "khafi", "fasaha"]),
  ], JUDGED)[0];
  const first = finalizeParticipantResult(firstCandidate, {});
  assert.ok(first);
  const second = {
    ...first,
    id: "final-participant-2",
    participant: { ...participant, id: "participant-2", number: "015", name: "Mariyam" },
    manifest: "manifest-2",
  };
  const third = {
    ...first,
    id: "final-participant-3",
    participant: { ...participant, id: "participant-3", number: "016", name: "Fathimath" },
    total: 90,
    manifest: "manifest-3",
  };
  assert.deepEqual(placeFinalizedResults([first, second, third]).map((item) => item.place), [1, 1, 3]);
});

test("a corrected final records a new revision reason and manifest", () => {
  const candidate = buildResultCandidates([
    session("all-revision", ["jali", "khafi", "fasaha"]),
  ], JUDGED)[0];
  const first = finalizeParticipantResult(candidate, {});
  assert.ok(first);
  const second = finalizeParticipantResult(candidate, {}, first, "Chief judge correction");
  assert.ok(second);
  assert.equal(second.revision, 2);
  assert.equal(second.revisionReason, "Chief judge correction");
  assert.notEqual(second.manifest, first.manifest);
});

test("final workbook preserves requested participant fields and verified fixed totals", async () => {
  const candidate = buildResultCandidates([
    session("all", ["jali", "khafi", "fasaha"], [mistake("jali", 2)]),
  ], JUDGED)[0];
  const result = finalizeParticipantResult(candidate, {});
  assert.ok(result);
  const buffer = await buildFinalResultsWorkbook([result], competition);
  await verifyFinalResultsWorkbook(buffer, [result]);
  const { read, utils } = await import("xlsx");
  const workbook = read(buffer, { type: "array" });
  assert.deepEqual(workbook.SheetNames, ["Results", "Verification"]);
  const rows = utils.sheet_to_json(workbook.Sheets.Results, { header: 1, defval: "" });
  assert.deepEqual(rows[0], finalResultsHeaders([result]));
  assert.deepEqual(rows[1].slice(1, 8), [
    "014",
    "Aishath Latheefa",
    "Under 14",
    "Baliagen · Tarteel / reading",
    "Feshey kolhu · Starting side",
    "7771234",
    "School A",
  ]);
  assert.deepEqual(rows[1].slice(8, 13), [48, 30, 20, 98, 100]);
});

test("judge packages and full backups reject incomplete files", () => {
  const source = session("jali", ["jali"]);
  const resultPackage = buildJudgeResultPackage(source, competition);
  assert.equal(parseJudgeResultPackage(resultPackage).session.id, "jali");
  assert.throws(() => parseJudgeResultPackage({ app: "tahqeeq" }));
  assert.throws(
    () => parseJudgeResultPackage({
      ...resultPackage,
      session: { ...resultPackage.session, competitionId: "" },
    }),
    /conflicting competition identity/,
  );
  assert.throws(
    () => parseJudgeResultPackage({
      ...resultPackage,
      session: { ...resultPackage.session, competitionVersionId: "" },
    }),
    /conflicting competition identity/,
  );

  const state = { history: [source], roster: [] };
  const backup = buildStateBackup(state);
  assert.equal(parseStateBackup(backup), state);
  assert.throws(() => parseStateBackup({ app: "tahqeeq" }));
});

test("the UI retains old final revisions and validates imported competition records", () => {
  const storeSource = readFileSync(
    new URL("../src/state/store.tsx", import.meta.url),
    "utf8",
  );
  const recordsSource = readFileSync(
    new URL("../src/components/RecordsView.tsx", import.meta.url),
    "utf8",
  );
  assert.match(storeSource, /supersededAt: action\.result\.finalizedAt/);
  assert.match(recordsSource, /different competition or edition/);
  assert.match(recordsSource, /not in this competition's participant list/);
  assert.match(recordsSource, /does not match this competition's panel assignments/);
  assert.match(recordsSource, /uses different scoring rules/);
});

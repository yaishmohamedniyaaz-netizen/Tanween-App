import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  CATEGORY_ORDER,
  createPanelPreset,
  makeAssignmentSnapshot,
  normalizeJudgePanel,
  validateJudgePanel,
} from "../src/lib/judgeAssignments.ts";
import { computeAssignedMistakeScores } from "../src/lib/scoring.ts";

const config = {
  jali: { start: 50, step: 2 },
  khafi: { start: 30, step: 1 },
  fasaha: { start: 20, step: 1 },
};
const setupSource = readFileSync(
  new URL("../src/components/CompetitionSetup.tsx", import.meta.url),
  "utf8",
);
const scoreSource = readFileSync(
  new URL("../src/components/ScorePanel.tsx", import.meta.url),
  "utf8",
);
const recordsSource = readFileSync(
  new URL("../src/components/RecordsView.tsx", import.meta.url),
  "utf8",
);
const startSource = readFileSync(
  new URL("../src/components/StartDialog.tsx", import.meta.url),
  "utf8",
);
const appSource = readFileSync(
  new URL("../src/App.tsx", import.meta.url),
  "utf8",
);

test("the two common panel presets cover every category exactly once", () => {
  for (const preset of ["all", "one-each"]) {
    const panel = createPanelPreset(preset);
    assert.equal(validateJudgePanel(panel).valid, true);
    assert.deepEqual(
      panel.seats.flatMap((seat) => seat.categories).sort(),
      [...CATEGORY_ORDER].sort(),
    );
  }
});

test("custom panels reject missing, duplicated, and empty assignments", () => {
  const missing = {
    version: 1,
    preset: "custom",
    seats: [{ id: "judge-1", label: "Judge 1", name: "", categories: ["jali"] }],
  };
  assert.deepEqual(validateJudgePanel(missing).missing, ["khafi", "fasaha"]);

  const duplicate = {
    version: 1,
    preset: "custom",
    seats: [
      { id: "judge-1", label: "Judge 1", name: "", categories: ["jali", "khafi"] },
      { id: "judge-2", label: "Judge 2", name: "", categories: ["jali", "fasaha"] },
    ],
  };
  assert.deepEqual(validateJudgePanel(duplicate).duplicates, ["jali"]);

  const empty = {
    version: 1,
    preset: "custom",
    seats: [
      { id: "judge-1", label: "Judge 1", name: "", categories: CATEGORY_ORDER },
      { id: "judge-2", label: "Judge 2", name: "", categories: [] },
    ],
  };
  assert.deepEqual(validateJudgePanel(empty).emptySeatIds, ["judge-2"]);
});

test("invalid stored panels fall back to the legacy one-judge meaning", () => {
  const normalized = normalizeJudgePanel({ version: 1, preset: "custom", seats: [] });
  assert.equal(normalized.preset, "all");
  assert.deepEqual(normalized.seats[0].categories, CATEGORY_ORDER);
});

test("a session assignment is a detached immutable snapshot", () => {
  const panel = createPanelPreset("one-each");
  const assignment = makeAssignmentSnapshot(panel, "judge-2", config);
  assert.ok(assignment);
  panel.seats[1].name = "Changed later";
  panel.seats[1].categories = ["jali"];
  config.khafi.step = 5;
  assert.equal(assignment.judgeName, "");
  assert.deepEqual(assignment.categories, ["khafi"]);
  assert.equal(assignment.config.khafi.step, 1);
});

test("section scoring includes only assigned categories", () => {
  const mistakes = [
    { id: "1", tid: "a", category: "jali", amount: 2, ts: 1 },
    { id: "2", tid: "b", category: "khafi", amount: 1, ts: 2 },
    { id: "3", tid: "c", category: "fasaha", amount: 1, ts: 3 },
  ];
  const one = computeAssignedMistakeScores(config, mistakes, ["khafi"]);
  assert.equal(one.total, 29);
  assert.equal(one.totalMax, 30);
  const two = computeAssignedMistakeScores(config, mistakes, ["jali", "fasaha"]);
  assert.equal(two.total, 67);
  assert.equal(two.totalMax, 70);
});

test("all seven possible device assignments retain the standard order", () => {
  const subsets = [
    ["jali"],
    ["khafi"],
    ["fasaha"],
    ["jali", "khafi"],
    ["jali", "fasaha"],
    ["khafi", "fasaha"],
    ["jali", "khafi", "fasaha"],
  ];
  for (const categories of subsets) {
    const remainder = CATEGORY_ORDER.filter((category) => !categories.includes(category));
    const panel = {
      version: 1,
      preset: "custom",
      seats: [
        { id: "judge-1", label: "Judge 1", name: "", categories },
        ...(remainder.length
          ? [{ id: "judge-2", label: "Judge 2", name: "", categories: remainder }]
          : []),
      ],
    };
    assert.equal(validateJudgePanel(panel).valid, true);
    const assignment = makeAssignmentSnapshot(panel, "judge-1", config);
    assert.deepEqual(assignment.categories, categories);
  }
});

test("the saved-state reducer independently rejects unassigned categories", () => {
  const source = readFileSync(
    new URL("../src/state/store.tsx", import.meta.url),
    "utf8",
  );
  assert.match(source, /!state\.activeAssignment\.categories\.includes\(action\.mistake\.category\)/);
  assert.match(source, /judgeSeatId: state\.activeAssignment\.judgeSeatId/);
  assert.match(source, /backup\.pre-judge-assignments-v1/);
  assert.match(source, /if \(state\.sessionActive\) return state/);
});

test("setup derives judge count, requires a device role, and freezes active settings", () => {
  assert.match(setupSource, /panelDraft\.seats\.length < 3/);
  assert.match(setupSource, /This device is for/);
  assert.match(setupSource, /panelDeviceValid/);
  assert.match(setupSource, /const editable = state\.competition\.status === "draft"/);
  assert.doesNotMatch(setupSource, /judgeCount/);
});

test("participant selection shows the frozen device assignment and links to setup", () => {
  assert.match(startSource, /Judging panel/);
  assert.match(startSource, /Change assignments/);
  assert.match(startSource, /Add judges or assign/);
  assert.match(startSource, /onClick=\{onOpenSetup\}/);
  assert.match(startSource, /One judge covering all three is the default/);
  assert.match(startSource, /closest\("button, select, textarea"\)/);
  assert.match(appSource, /startOpen &&/);
  assert.match(appSource, /state\.competition\.status === "live"/);
  assert.match(appSource, /<CompetitionSetup/);
});

test("scores stay scoped without the unwanted live wording", () => {
  assert.match(scoreSource, />Score</);
  assert.doesNotMatch(scoreSource, /Your section/);
  assert.match(scoreSource, /categories\.includes\(category\.id\)/);
  assert.match(recordsSource, /Average score/);
  assert.match(recordsSource, /Judge-section result/);
  assert.match(recordsSource, /assignmentLabel/);
});

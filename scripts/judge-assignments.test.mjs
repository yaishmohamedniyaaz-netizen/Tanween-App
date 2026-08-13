import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  CATEGORY_ORDER,
  assignmentLabel,
  categoryListLabel,
  createPanelPreset,
  makeAssignmentSnapshot,
  normalizeJudgePanel,
  validateJudgePanel,
} from "../src/lib/judgeAssignments.ts";
import { computeAssignedScores } from "../src/lib/scoring.ts";

const JUDGED = ["jali", "khafi", "fasaha"];
const config = {
  jali: { enabled: true, start: 50, step: 2 },
  khafi: { enabled: true, start: 30, step: 1 },
  fasaha: { enabled: true, start: 20, step: 1 },
  "adu-raagu": { enabled: false, start: 0, step: 1 },
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
const questionNumberSource = readFileSync(
  new URL("../src/components/QuestionNumberScreen.tsx", import.meta.url),
  "utf8",
);
const appSource = readFileSync(
  new URL("../src/App.tsx", import.meta.url),
  "utf8",
);

test("the two common panel presets cover every category exactly once", () => {
  for (const preset of ["all", "one-each"]) {
    const panel = createPanelPreset(preset, JUDGED);
    assert.equal(validateJudgePanel(panel, JUDGED).valid, true);
    assert.deepEqual(
      panel.seats.flatMap((seat) => seat.categories).sort(),
      [...JUDGED].sort(),
    );
  }
});

test("custom panels reject missing, duplicated, and empty assignments", () => {
  const missing = {
    version: 1,
    preset: "custom",
    seats: [{ id: "judge-1", label: "Judge 1", name: "", categories: ["jali"] }],
  };
  assert.deepEqual(validateJudgePanel(missing, JUDGED).missing, ["khafi", "fasaha"]);

  const duplicate = {
    version: 1,
    preset: "custom",
    seats: [
      { id: "judge-1", label: "Judge 1", name: "", categories: ["jali", "khafi"] },
      { id: "judge-2", label: "Judge 2", name: "", categories: ["jali", "fasaha"] },
    ],
  };
  assert.deepEqual(validateJudgePanel(duplicate, JUDGED).duplicates, ["jali"]);

  const empty = {
    version: 1,
    preset: "custom",
    seats: [
      { id: "judge-1", label: "Judge 1", name: "", categories: JUDGED },
      { id: "judge-2", label: "Judge 2", name: "", categories: [] },
    ],
  };
  assert.deepEqual(validateJudgePanel(empty, JUDGED).emptySeatIds, ["judge-2"]);
});

test("invalid stored panels fall back to the legacy one-judge meaning", () => {
  const normalized = normalizeJudgePanel({ version: 1, preset: "custom", seats: [] }, JUDGED);
  assert.equal(normalized.preset, "all");
  assert.deepEqual(normalized.seats[0].categories, JUDGED);
});

test("a session assignment is a detached immutable snapshot", () => {
  const panel = createPanelPreset("one-each", JUDGED);
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
  const one = computeAssignedScores(config, mistakes, [], ["khafi"]);
  assert.equal(one.total, 29);
  assert.equal(one.totalMax, 30);
  const two = computeAssignedScores(config, mistakes, [], ["jali", "fasaha"]);
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
    const remainder = JUDGED.filter((category) => !categories.includes(category));
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
    assert.equal(validateJudgePanel(panel, JUDGED).valid, true);
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
  assert.match(source, /const judgeSeatId = state\.activeAssignment\.judgeSeatId/);
  assert.match(source, /backup\.pre-judge-assignments-v1/);
  assert.match(source, /state\.sessionActive \|\| state\.preparedRecitation/);
  assert.match(source, /backup\.pre-prepared-recitation-v1/);
});

test("setup derives judge count, requires a device role, and freezes active settings", () => {
  assert.match(setupSource, /panelDraft\.seats\.length < MAX_JUDGE_SEATS/);
  assert.match(setupSource, /This device is for/);
  assert.match(setupSource, /panelDeviceValid/);
  assert.match(setupSource, /const recitationInProgress/);
  assert.match(setupSource, /Boolean\(state\.preparedRecitation\)/);
  assert.doesNotMatch(setupSource, /judgeCount/);
});

test("the reciter handoff freezes the device assignment before Ready", () => {
  assert.match(startSource, /This device/);
  assert.match(startSource, /Select reciter/);
  assert.match(questionNumberSource, /Choose a number/);
  assert.match(startSource, /prepareWithQuestion\(drawnId/);
  assert.match(startSource, /type: "PREPARE_RECITER"/);
  assert.doesNotMatch(startSource, /type: "BEGIN_RECITER"/);
  assert.match(startSource, /questionId/);
  assert.match(startSource, /onClick=\{onOpenSetup\}/);
  assert.match(startSource, /eligibleQuestionDrafts/);
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
  assert.match(recordsSource, /categoryListLabel/);
});

test("interface labels never print a raw storage id", () => {
  const label = categoryListLabel(["fasaha", "jali", "khafi"]);
  assert.equal(label, "Laḥn Jalī + Laḥn Khafī + Faṣāḥa");
  for (const id of CATEGORY_ORDER) {
    assert.doesNotMatch(label, new RegExp(`\\b${id}\\b`));
  }
});

test("interface labels follow the canonical category order", () => {
  assert.equal(
    categoryListLabel(["khafi", "jali"]),
    categoryListLabel(["jali", "khafi"]),
  );
});

test("an empty selection produces an empty label the caller can replace", () => {
  assert.equal(categoryListLabel([]), "");
});

test("export labels stay plain ASCII so saved records remain comparable", () => {
  assert.equal(
    assignmentLabel(CATEGORY_ORDER),
    "Jali + Khafi + Fasaha + Adu / Raagu",
  );
});

test("the setup summary uses the interface labels, not raw ids", () => {
  const setupSource = readFileSync(
    new URL("../src/components/CompetitionSetup.tsx", import.meta.url),
    "utf8",
  );
  assert.match(setupSource, /categoryListLabel\(seat\.categories\)/);
  assert.doesNotMatch(
    setupSource,
    /categoriesInOrder\(seat\.categories\)\.join\(" \+ "\)/,
  );
});

test("only exports keep the plain ASCII criterion spellings", () => {
  const uiFiles = [
    "CompetitionIdlePanel",
    "FinishDialog",
    "HintBanner",
    "JudgeRoleStrip",
    "JudgingHistory",
    "RecordsView",
    "ResultSheet",
    "StartDialog",
  ];
  for (const name of uiFiles) {
    const source = readFileSync(
      new URL(`../src/components/${name}.tsx`, import.meta.url),
      "utf8",
    );
    assert.doesNotMatch(
      source,
      /assignmentLabel/,
      `${name} should show interface labels, not export spellings`,
    );
  }
  const exportSource = readFileSync(
    new URL("../src/lib/exportSession.ts", import.meta.url),
    "utf8",
  );
  assert.match(
    exportSource,
    /assignmentLabel/,
    "exports must keep the ASCII spellings so saved records stay comparable",
  );
});

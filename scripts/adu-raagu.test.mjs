import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  ALL_CATEGORIES,
  CATEGORY_BY_ID,
  DEFAULT_CONFIG,
  IMPRESSION_CATEGORIES,
  MAX_IMPRESSION_MARKS,
  OPTIONAL_CATEGORIES,
  PINPOINT_CATEGORIES,
  TOTAL_MARKS,
  enabledCategories,
  enabledMarksTotal,
  normalizeScoreConfig,
  startOptionsFor,
} from "../src/config.ts";
import {
  awardableMarks,
  computeAssignedScores,
  computeCategoryScores,
  impressionScore,
} from "../src/lib/scoring.ts";
import {
  latestMistakeEventIds,
  projectImpressions,
  projectMistakes,
  seedLedgerEvents,
} from "../src/lib/judgingLedger.ts";
import {
  assignmentLabel,
  createPanelPreset,
  legacyAssignment,
  makeAssignmentSnapshot,
  normalizeAssignment,
  shortCategoryLabel,
  validateJudgePanel,
} from "../src/lib/judgeAssignments.ts";
import { competitionReadiness, normalizeCompetition } from "../src/lib/competition.ts";
import {
  buildResultCandidates,
  finalizeParticipantResult,
} from "../src/lib/finalResults.ts";
import { finalResultsHeaders } from "../src/lib/finalResultsWorkbook.ts";

const storeSource = readFileSync(
  new URL("../src/state/store.tsx", import.meta.url),
  "utf8",
);
const setupSource = readFileSync(
  new URL("../src/components/CompetitionSetup.tsx", import.meta.url),
  "utf8",
);
const pickerSource = readFileSync(
  new URL("../src/components/MarkPicker.tsx", import.meta.url),
  "utf8",
);
const scorePanelSource = readFileSync(
  new URL("../src/components/ScorePanel.tsx", import.meta.url),
  "utf8",
);
const appSource = readFileSync(
  new URL("../src/App.tsx", import.meta.url),
  "utf8",
);
const mistakeLogSource = readFileSync(
  new URL("../src/components/MistakeLog.tsx", import.meta.url),
  "utf8",
);
const mushafSource = readFileSync(
  new URL("../src/components/Mushaf.tsx", import.meta.url),
  "utf8",
);
const cssSource = readFileSync(
  new URL("../src/styles/global.css", import.meta.url),
  "utf8",
);

/** The declarations a rule sets, given its exact selector text. */
const ruleBody = (selector) => {
  const at = cssSource.indexOf(`\n${selector} {`);
  assert.notEqual(at, -1, `expected a rule for ${selector}`);
  return cssSource.slice(at, cssSource.indexOf("}", at));
};

/** A pre-Adu & Raagu competition exactly as older browsers stored it. */
const legacyStoredConfig = {
  jali: { start: 50, step: 2 },
  khafi: { start: 30, step: 1 },
  fasaha: { start: 20, step: 1 },
};

const mistake = (category, amount) => ({
  id: `m-${category}`,
  tid: `t-${category}`,
  surah: 1,
  ayah: 1,
  glyph: "ب",
  label: "1:1 · letter 1",
  category,
  amount,
  ts: 900,
});

test("Adu and Raagu is a whole-recitation criterion, never a page target", () => {
  assert.deepEqual(IMPRESSION_CATEGORIES, ["adu-raagu"]);
  assert.deepEqual(PINPOINT_CATEGORIES, ["jali", "khafi", "fasaha"]);
  assert.equal(CATEGORY_BY_ID["adu-raagu"].kind, "impression");
  assert.deepEqual(ALL_CATEGORIES, ["jali", "khafi", "fasaha", "adu-raagu"]);
});

test("Fasaha and Adu and Raagu are optional; Jali and Khafi are not", () => {
  assert.deepEqual(OPTIONAL_CATEGORIES, ["fasaha", "adu-raagu"]);
  assert.equal(CATEGORY_BY_ID.jali.optional, false);
  assert.equal(CATEGORY_BY_ID.khafi.optional, false);
  assert.equal(enabledMarksTotal(DEFAULT_CONFIG), TOTAL_MARKS);
  assert.deepEqual(enabledCategories(DEFAULT_CONFIG), ALL_CATEGORIES);
});

test("a competition that judges neither optional criterion still totals 100", () => {
  const config = normalizeScoreConfig({
    jali: { enabled: true, start: 60, step: 2 },
    khafi: { enabled: true, start: 40, step: 1 },
    fasaha: { enabled: false, start: 20, step: 1 },
    "adu-raagu": { enabled: false, start: 10, step: 1 },
  });
  assert.deepEqual(enabledCategories(config), ["jali", "khafi"]);
  assert.equal(config.fasaha.start, 0, "a criterion out of use carries no marks");
  assert.equal(enabledMarksTotal(config), TOTAL_MARKS);
  const { total, totalMax } = computeCategoryScores(config, [mistake("jali", 2)]);
  assert.equal(total, 98);
  assert.equal(totalMax, 100);
});

test("records saved before Adu and Raagu keep their exact criteria and totals", () => {
  const config = normalizeScoreConfig(legacyStoredConfig);
  assert.equal(config["adu-raagu"].enabled, false);
  assert.equal(config["adu-raagu"].start, 0);
  assert.equal(config.fasaha.enabled, true);
  assert.equal(config.fasaha.start, 20);
  assert.deepEqual(enabledCategories(config), ["jali", "khafi", "fasaha"]);
  assert.equal(computeCategoryScores(config, []).totalMax, 100);
  assert.match(storeSource, /config: normalizeScoreConfig\(session\.config\)/);
  assert.match(storeSource, /backup\.pre-adu-raagu-v1/);
});

test("a raw pre-Adu and Raagu config still yields a usable assignment", () => {
  const assignment = legacyAssignment(legacyStoredConfig);
  assert.ok(assignment, "legacy browser state must never fail to load");
  assert.deepEqual(assignment.categories, ["jali", "khafi", "fasaha"]);
  assert.equal(assignment.config["adu-raagu"].enabled, false);
  const restored = normalizeAssignment(undefined, legacyStoredConfig);
  assert.deepEqual(restored.categories, ["jali", "khafi", "fasaha"]);
});

test("an unmarked impression rests on full marks and records once marked", () => {
  const config = normalizeScoreConfig(DEFAULT_CONFIG);
  const unmarked = computeCategoryScores(config, []);
  assert.equal(unmarked.byCategory["adu-raagu"].score, 10);
  assert.equal(unmarked.byCategory["adu-raagu"].marked, false);
  assert.equal(unmarked.total, 100);

  const events = [
    {
      id: "e1",
      at: 10,
      type: "impression_changed",
      category: "adu-raagu",
      from: 10,
      to: 10,
    },
    {
      id: "e2",
      at: 20,
      type: "impression_note_changed",
      category: "adu-raagu",
      from: "",
      to: "Strong voice, unsteady maqam",
    },
    {
      id: "e3",
      at: 30,
      type: "impression_changed",
      category: "adu-raagu",
      from: 10,
      to: 7.5,
    },
  ];
  const impressions = projectImpressions(events);
  assert.equal(impressions.length, 1);
  assert.equal(impressions[0].awarded, 7.5);
  assert.equal(impressions[0].note, "Strong voice, unsteady maqam");
  assert.equal(impressions[0].set, true);

  const marked = computeCategoryScores(config, [], impressions);
  assert.equal(marked.byCategory["adu-raagu"].score, 7.5);
  assert.equal(marked.byCategory["adu-raagu"].deducted, 2.5);
  assert.equal(marked.byCategory["adu-raagu"].marked, true);
  assert.equal(marked.total, 97.5);
});

test("impression marks are clamped to the criterion allocation", () => {
  const config = normalizeScoreConfig(DEFAULT_CONFIG);
  const over = impressionScore(config, [
    { category: "adu-raagu", awarded: 40, note: "", set: true, ts: 1 },
  ], "adu-raagu");
  assert.equal(over.awarded, 10);
  const under = impressionScore(config, [
    { category: "adu-raagu", awarded: -5, note: "", set: true, ts: 1 },
  ], "adu-raagu");
  assert.equal(under.awarded, 0);
  assert.match(storeSource, /Math\.min\(start, Math\.max\(0, action\.awarded\)\)/);
});

test("a saved impression survives a reopened session unchanged", () => {
  const events = seedLedgerEvents({
    sessionId: "s-1",
    participant: { name: "Reciter", number: "1" },
    startedAt: 100,
    mistakes: [],
    impressions: [
      { category: "adu-raagu", awarded: 6, note: "Melody drifted", set: true, ts: 150 },
    ],
  });
  const restored = projectImpressions(events);
  assert.equal(restored.length, 1);
  assert.equal(restored[0].awarded, 6);
  assert.equal(restored[0].note, "Melody drifted");
  assert.equal(restored[0].set, true);
});

test("section scoring keeps an Adu and Raagu judge to their own criterion", () => {
  const config = normalizeScoreConfig(DEFAULT_CONFIG);
  const impressions = [
    { category: "adu-raagu", awarded: 8, note: "", set: true, ts: 1 },
  ];
  const section = computeAssignedScores(
    config,
    [mistake("jali", 2)],
    impressions,
    ["adu-raagu"],
  );
  assert.equal(section.total, 8);
  assert.equal(section.totalMax, 10);
});

test("the panel covers exactly the criteria in use and allows four seats", () => {
  const judged = enabledCategories(DEFAULT_CONFIG);
  const panel = createPanelPreset("one-each", judged);
  assert.equal(panel.seats.length, 4);
  assert.equal(validateJudgePanel(panel, judged).valid, true);

  const twoCriteria = ["jali", "khafi"];
  assert.equal(validateJudgePanel(panel, twoCriteria).valid, false);
  assert.deepEqual(
    validateJudgePanel(
      createPanelPreset("all", twoCriteria),
      twoCriteria,
    ).errors,
    [],
  );
});

test("an assignment cannot own a criterion the competition switched off", () => {
  const config = normalizeScoreConfig({
    jali: { enabled: true, start: 60, step: 2 },
    khafi: { enabled: true, start: 40, step: 1 },
    fasaha: { enabled: false, start: 0, step: 1 },
    "adu-raagu": { enabled: false, start: 0, step: 1 },
  });
  const fullPanel = createPanelPreset("one-each", ALL_CATEGORIES);
  assert.equal(makeAssignmentSnapshot(fullPanel, "judge-1", config), null);

  const assignment = normalizeAssignment({ panel: fullPanel, judgeSeatId: "judge-1" }, config);
  assert.deepEqual(assignment.categories, ["jali", "khafi"]);
  assert.match(storeSource, /A criterion that is no longer judged cannot keep its scoring seat/);
});

test("readiness checks the marks of the criteria actually in use", () => {
  const input = {
    competition: normalizeCompetition({
      id: "competition-adu",
      name: "Adu Test",
      edition: "2026",
      divisions: [
        {
          id: "d1",
          name: "Under 14 Hifz",
          ageGroup: "Under 14",
          category: "nubalaa",
          quranPortion: { kind: "full-quran" },
        },
      ],
    }),
    panel: createPanelPreset("all", ["jali", "khafi"]),
    deviceJudgeId: "judge-1",
    config: normalizeScoreConfig({
      jali: { enabled: true, start: 60, step: 2 },
      khafi: { enabled: true, start: 40, step: 1 },
      fasaha: { enabled: false, start: 0, step: 1 },
      "adu-raagu": { enabled: false, start: 0, step: 1 },
    }),
    roster: [
      {
        id: "p1",
        number: "001",
        name: "Reciter",
        ageGroup: "Under 14",
        category: "nubalaa",
        muqarrar: "feshey-kolhu",
        phone: "",
        institution: "",
        judged: false,
      },
    ],
  };
  assert.deepEqual(competitionReadiness(input), { ready: true, issues: [] });

  const short = {
    ...input,
    config: normalizeScoreConfig({
      ...input.config,
      "adu-raagu": { enabled: true, start: 10, step: 1 },
    }),
  };
  assert.equal(competitionReadiness(short).ready, false);
});

test("final results and the workbook only carry the criteria judged", () => {
  const config = normalizeScoreConfig({
    jali: { enabled: true, start: 60, step: 2 },
    khafi: { enabled: true, start: 30, step: 1 },
    fasaha: { enabled: false, start: 0, step: 1 },
    "adu-raagu": { enabled: true, start: 10, step: 1 },
  });
  const participant = {
    id: "participant-1",
    number: "001",
    name: "Reciter",
    ageGroup: "Under 14",
    category: "nubalaa",
    muqarrar: "feshey-kolhu",
    phone: "",
    institution: "",
  };
  const judged = enabledCategories(config);
  const session = (id, categories, mistakes, impressions = []) => ({
    id,
    savedAt: 1000,
    revision: 1,
    participant,
    config,
    total: 0,
    totalMax: 0,
    assignment: {
      version: 1,
      panel: { version: 1, preset: "custom", seats: [{ id, label: id, name: "", categories }] },
      judgeSeatId: id,
      judgeLabel: id,
      judgeName: "",
      categories,
      config,
    },
    notes: "",
    mistakes,
    impressions,
  });

  const candidate = buildResultCandidates(
    [
      session("pinpoint", ["jali", "khafi"], [mistake("jali", 2)]),
      session("voice", ["adu-raagu"], [], [
        { category: "adu-raagu", awarded: 7, note: "Flat ending", set: true, ts: 1 },
      ]),
    ],
    judged,
  )[0];
  assert.deepEqual(candidate.categories, ["jali", "khafi", "adu-raagu"]);
  assert.deepEqual(candidate.missing, []);

  const result = finalizeParticipantResult(candidate, {});
  assert.ok(result);
  assert.equal(result.byCategory.fasaha, undefined);
  assert.equal(result.byCategory["adu-raagu"].score, 7);
  assert.equal(result.total, 95);
  assert.equal(result.totalMax, 100);
  assert.deepEqual(finalResultsHeaders([result]).slice(8, 11), [
    "Jali",
    "Khafi",
    "Adu / Raagu",
  ]);
});

test("setup can switch an optional criterion off and warns about the panel", () => {
  assert.match(setupSource, /toggleCategory/);
  assert.match(setupSource, /category\.optional \?/);
  assert.match(setupSource, /Always judged/);
  assert.match(setupSource, /rebuilds the judging panel/);
});

test("a whole-recitation criterion stops at 20 marks", () => {
  assert.equal(MAX_IMPRESSION_MARKS, 20);
  assert.deepEqual(startOptionsFor("adu-raagu"), [5, 10, 15, 20]);
  assert.ok(startOptionsFor("jali").includes(50), "pinpoint criteria keep the full range");

  const config = normalizeScoreConfig({
    jali: { enabled: true, start: 50, step: 2 },
    khafi: { enabled: true, start: 30, step: 1 },
    fasaha: { enabled: false, start: 0, step: 1 },
    "adu-raagu": { enabled: true, start: 40, step: 1 },
  });
  assert.equal(config["adu-raagu"].start, 20, "a stored allocation above the cap is trimmed");
});

test("the mark list runs from full marks down to zero", () => {
  assert.deepEqual(awardableMarks(10, 1), [10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0]);
  assert.deepEqual(awardableMarks(2, 0.5), [2, 1.5, 1, 0.5, 0]);
  assert.equal(awardableMarks(20, 0.5).length, 41);
  assert.equal(awardableMarks(20, 0.5)[0], 20);
  assert.equal(awardableMarks(20, 0.5).at(-1), 0);
});

test("the wheel never changes a mark on hover alone", () => {
  assert.match(pickerSource, /document\.activeElement !== button \|\| open/);
  assert.match(pickerSource, /Acting on hover alone is how people change official numbers/);
});

test("Adu and Raagu has one home in the rail, inside its score row", () => {
  assert.match(scorePanelSource, /sc-row-impression/);
  assert.match(scorePanelSource, /<MarkPicker/);
  assert.match(scorePanelSource, /SET_IMPRESSION_NOTE/);
  assert.doesNotMatch(appSource, /ImpressionPanel/);
});

test("the judging rail sits on the left unless the judge chose otherwise", () => {
  assert.match(
    appSource,
    /localStorage\.getItem\(LS_JUDGE_RAIL_SIDE_KEY\) === "right" \? "right" : "left"/,
  );
});

test("the criterion is written Adu / Raagu", () => {
  assert.equal(CATEGORY_BY_ID["adu-raagu"].label, "Adu / Raagu");
  assert.equal(shortCategoryLabel("adu-raagu"), "Adu / Raagu");
  assert.match(assignmentLabel(["jali", "adu-raagu"]), /Jali \+ Adu \/ Raagu/);
});

test("marking a letter twice replaces the mark instead of stacking one", () => {
  const jali = { ...mistake("jali", 2), id: "m-1", tid: "112:1:2:u3" };
  const khafi = { ...mistake("khafi", 1), id: "m-2", tid: "112:1:2:u3" };
  const events = [
    { id: "e1", at: 10, type: "mistake_added", mistake: jali },
    { id: "e2", at: 20, type: "mistake_undone", mistake: jali },
    { id: "e3", at: 21, type: "mistake_added", mistake: khafi },
  ];
  const projected = projectMistakes(events);
  assert.equal(projected.length, 1, "one letter carries one mark");
  assert.equal(projected[0].category, "khafi");
  // The replaced mark stays in the history and can be restored from it.
  assert.equal(latestMistakeEventIds(events).get(jali.id), "e2");

  assert.match(storeSource, /One letter carries one mark/);
  assert.match(storeSource, /state\.mistakes\.find\(\(item\) => item\.tid === mistake\.tid\)/);
  assert.match(storeSource, /if \(previous && previous\.category === mistake\.category\) return state;/);
});

test("mistake details name the kalimah and where it sits", () => {
  assert.match(mistakeLogSource, /log-kalimah-word/);
  assert.match(mistakeLogSource, /mistake\.wordText \|\| mistake\.glyph/);
  assert.match(mistakeLogSource, /\$\{mistake\.surah\}:\$\{mistake\.ayah\}/);
  assert.match(mistakeLogSource, /log-kalimah-ref/);
  // The letter ordinal stays in the stored evidence, not in the judge's view.
  assert.doesNotMatch(mistakeLogSource, /mistake\.label/);
  assert.match(mushafSource, /wordText: active\.meta\.semanticText/);
});

test("the opened mark reads as two rows, and never spells out its category", () => {
  // The dot on the row already carries the category; the name is not repeated.
  assert.doesNotMatch(mistakeLogSource, /className="log-loc"/);
  assert.doesNotMatch(cssSource, /\.log-loc\s*\{/);
  assert.match(mistakeLogSource, /category\.label\} · \$\{reference\}/, "kept for the row title");

  // Word then reference, read as one phrase — not flung to opposite edges.
  assert.doesNotMatch(ruleBody(".log-kalimah"), /space-between/);
  // The tray hangs off the glyph column, so the kalimah sits under its letter.
  assert.match(ruleBody(".log-expand-inner"), /padding-left: 25px/);
  assert.match(ruleBody(".log-undo"), /margin-left: auto/);
});

test("holding a word is neutral; only a criterion colours the page", () => {
  // The old wash was rgb(85,102,230) — Fasaha's own colour — so a held word
  // read as already marked. Neutral now, in both themes.
  for (const selector of [".hit:hover::before", ".hit.armed::before"]) {
    assert.match(ruleBody(selector), /var\(--hold-wash/);
  }
  assert.match(ruleBody(".glyph-ink.armed"), /var\(--hold-wash-strong\)/);
  // No rule that paints a word or its letter may carry a raw hue again.
  for (const [selector, body] of cssSource.matchAll(
    /\n([^\n{}]*\.(?:hit|glyph-ink)[^\n{}]*)\{([^}]*)\}/g,
  )) {
    if (/cat-/.test(selector)) continue; // a chosen criterion, which must colour
    assert.doesNotMatch(body, /rgba\(\s*(?:85, 102, 230|120, 135, 255)/, selector.trim());
  }

  const holdWashes = cssSource.match(/--hold-wash(?:-strong)?: rgba\([^)]+\)/g) ?? [];
  assert.equal(holdWashes.length, 4, "a light and a dark pair");
  for (const wash of holdWashes) {
    const [r, g, b] = wash.match(/[\d.]+/g).map(Number);
    // The washes are the app's own ink, which leans two points cool by design.
    // Anything wider than that is a hue, and a hue here would read as a verdict.
    assert.ok(
      Math.max(r, g, b) - Math.min(r, g, b) <= 4,
      `${wash} must carry no visible hue`,
    );
  }

  // Dragging onto a pill still paints the criterion's own colour.
  assert.match(cssSource, /\.hit\.armed\.cat-jali::before,/);
});

test("the mark bar opens on a press and commits when the press ends", () => {
  assert.match(pickerSource, /className={`mark-bar/);
  assert.match(pickerSource, /setOpen\(true\);\s*setPinned\(false\);/);
  assert.match(pickerSource, /if \(drag\?\.moved && preview !== null\)/);
  // A press that does not move leaves the bar open to pick from.
  assert.match(pickerSource, /setPinned\(true\);/);
  assert.match(pickerSource, /mark-tick/);
  assert.match(pickerSource, /labelEvery/);
});

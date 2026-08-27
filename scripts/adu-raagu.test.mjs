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
  missingRequiredImpressionCategories,
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
const finishDialogSource = readFileSync(
  new URL("../src/components/FinishDialog.tsx", import.meta.url),
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

test("live unmarked impressions start at zero while history retains full marks", () => {
  const config = normalizeScoreConfig(DEFAULT_CONFIG);
  const historical = computeCategoryScores(config, []);
  assert.equal(historical.byCategory["adu-raagu"].score, 10);
  assert.equal(historical.byCategory["adu-raagu"].marked, false);
  assert.equal(historical.total, 100);

  const active = computeCategoryScores(config, [], [], "entry-zero");
  assert.equal(active.byCategory["adu-raagu"].score, 0);
  assert.equal(active.byCategory["adu-raagu"].marked, false);
  assert.equal(active.total, 90);

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

test("required impression marks distinguish notes and explicit zero", () => {
  const config = normalizeScoreConfig(DEFAULT_CONFIG);
  const assigned = ["jali", "adu-raagu"];
  assert.deepEqual(
    missingRequiredImpressionCategories(config, [], assigned),
    ["adu-raagu"],
  );
  assert.deepEqual(
    missingRequiredImpressionCategories(
      config,
      [{ category: "adu-raagu", awarded: 0, note: "Listen again", set: false, ts: 1 }],
      assigned,
    ),
    ["adu-raagu"],
  );
  assert.deepEqual(
    missingRequiredImpressionCategories(
      config,
      [{ category: "adu-raagu", awarded: 0, note: "", set: true, ts: 2 }],
      assigned,
    ),
    [],
  );
});

test("completion uses the same required-entry rule at every boundary", () => {
  assert.match(
    storeSource,
    /case "FINISH_SESSION":[\s\S]*missingRequiredImpressionCategories\([\s\S]*return state;/,
  );
  assert.match(
    appSource,
    /onConfirm=\{\(\) => \{[\s\S]*missingRequiredImpressionCategories\([\s\S]*return;/,
  );
  assert.doesNotMatch(finishDialogSource, /disabled=\{missing\.length > 0\}/);
  assert.match(
    finishDialogSource,
    /if \(missing\.length > 0\) \{\s*setSaveAttemptCount\(\(attempts\) => attempts \+ 1\);\s*return;/,
  );
  assert.match(finishDialogSource, /presentation="inline"/);
  assert.match(finishDialogSource, /invalid=\{invalid\}/);
  assert.match(finishDialogSource, /describedBy=\{invalid \? errorId : undefined\}/);
  assert.match(pickerSource, /focusAndOpen/);
  assert.match(finishDialogSource, /layer="dialog"/);
  assert.doesNotMatch(finishDialogSource, /autoFocus=\{missing\[0\] === category\}/);
  assert.match(scorePanelSource, /missingRequiredImpressionCategories\(/);
  assert.match(
    storeSource,
    /from: previous\?\.set \? previous\.awarded : 0,/,
  );
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
  assert.deepEqual(finalResultsHeaders([result]).slice(7, 10), [
    "Laḥn Jalī",
    "Laḥn Khafī",
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
  assert.match(scorePanelSource, /sc-score score-value-layout/);
  assert.match(pickerSource, /mark-picker score-value-layout/);
  assert.match(ruleBody(".score-value-layout"), /display: inline-flex/);
  assert.match(ruleBody(".score-value-layout"), /align-items: center/);
  assert.match(ruleBody(".score-value-layout"), /justify-content: center/);
  assert.match(ruleBody(".score-value-layout"), /gap: 2px/);
  assert.match(ruleBody(".score-value-layout"), /white-space: nowrap/);
  assert.match(ruleBody(".score-value-layout .sc-of"), /line-height: 1/);
  assert.match(ruleBody(".mark-picker"), /width: 72px/);
  assert.match(ruleBody(".sc-score .sc-of"), /font-size: 12px/);
  assert.match(ruleBody(".mark-picker-of"), /font-size: 12px/);
  assert.match(ruleBody(".mark-picker-of"), /font-weight: 400/);
});

test("the judging rail sits on the left unless the judge chose otherwise", () => {
  assert.match(appSource, /rail-\$\{preferences\.judgeRailSide\}/);
  assert.match(appSource, /readDevicePreferences\(\)/);
  assert.match(appSource, /writeDevicePreferences\(preferences\)/);
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

  assert.match(storeSource, /A letter carries one finding per judge/);
  assert.match(storeSource, /item\.tid === action\.mistake\.tid/);
  assert.match(storeSource, /existing\.category === action\.mistake\.category/);
});

test("mistake details name the kalimah and where it sits", () => {
  assert.match(mistakeLogSource, /log-kalimah-word/);
  assert.match(mistakeLogSource, /mistake\.wordText \|\| mistakeFullGlyph\(mistake\)/);
  assert.match(mistakeLogSource, /\$\{mistake\.surah\}:\$\{mistake\.ayah\}/);
  assert.match(mistakeLogSource, /log-kalimah-ref/);
  // The letter ordinal stays in the stored evidence, not in the judge's view.
  assert.doesNotMatch(mistakeLogSource, /mistake\.label/);
  assert.match(mushafSource, /wordText: active\.meta\.semanticText/);
});

test("the opened mark fits one evidence line and never spells out its category", () => {
  // The dot on the row already carries the category; the name is not repeated.
  assert.doesNotMatch(mistakeLogSource, /className="log-loc"/);
  assert.doesNotMatch(cssSource, /\.log-loc\s*\{/);
  assert.match(mistakeLogSource, /category\.label\} · \$\{reference\}/, "kept for the row title");

  // Word then reference, read as one phrase — not flung to opposite edges.
  assert.match(mistakeLogSource, /className="log-detail-line"/);
  assert.match(mistakeLogSource, /className="log-kalimah"/);
  assert.match(mistakeLogSource, /className="log-adjust"/);
  assert.match(cssSource, /\.log-detail-line\s*\{[^}]*display: grid/s);
  assert.match(ruleBody(".log-detail-line .log-kalimah"), /background: var\(--c-tint\)/);
  assert.match(ruleBody(".log-detail-line .log-adjust"), /height: 24px/);
  // The tray hangs off the glyph column, so the kalimah sits under its letter.
  assert.match(ruleBody(".log-expand-inner"), /padding-left: 25px/);
  assert.match(mistakeLogSource, />\s*Undo\s*</);
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

test("the mark bar carries its criterion's colour across the portal", () => {
  // The bar is portalled to the body, so it leaves the score row's subtree.
  // Custom properties inherit down the DOM, not the React tree: without the
  // category travelling with it, --c is unset on the bar and the control
  // falls back to ink while its own row reads as the criterion.
  assert.match(pickerSource, /createPortal/);
  assert.match(pickerSource, /className={`mark-bar cat-\$\{category\}/);
  assert.match(pickerSource, /category: string;/);
  assert.match(scorePanelSource, /category=\{category\}/);
});

test("the finish checkpoint reviews assigned category scores and exact remarks", () => {
  assert.match(finishDialogSource, /role="table" aria-label="Score by criterion"/);
  assert.match(finishDialogSource, /reviewCategories\.map/);
  assert.match(finishDialogSource, /byCategory\[category\]/);
  assert.match(finishDialogSource, /state\.activeQuestion\.label/);
  assert.match(finishDialogSource, /label: "Notes", text: state\.notes/);
  assert.match(finishDialogSource, /finish-remarks/);
  assert.doesNotMatch(finishDialogSource, /finish-summary/);
  assert.doesNotMatch(finishDialogSource, /This saves the result and opens the next reciter/);
});

test("the finish checkpoint focuses its heading and contains keyboard focus", () => {
  assert.match(finishDialogSource, /<dialog/);
  assert.match(finishDialogSource, /dialog\.showModal\(\)/);
  assert.match(finishDialogSource, /headingRef\.current\?\.focus/);
  assert.match(finishDialogSource, /onCancel=\{\(event\) =>/);
  assert.match(finishDialogSource, /const containFocus/);
  assert.match(finishDialogSource, /active === headingRef\.current/);
  assert.match(finishDialogSource, /last\.focus\(\)/);
  assert.match(finishDialogSource, /first\.focus\(\)/);
});

test("Adu and Raagu ruler keeps readable ink and a neutral uncommitted state", () => {
  const categoryRule = ruleBody(".cat-adu-raagu");
  const accent = categoryRule.match(/--c:\s*(#[0-9a-f]{6})/i)?.[1];
  assert.equal(accent, "#377b60");
  assert.match(categoryRule, /--c-on:\s*#ffffff/);

  const luminance = (hex) => {
    const channels = hex.match(/[0-9a-f]{2}/gi).map((channel) => parseInt(channel, 16) / 255);
    const linear = channels.map((channel) =>
      channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4,
    );
    return linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722;
  };
  const white = luminance("ffffff");
  const green = luminance(accent.slice(1));
  assert.ok((white + 0.05) / (green + 0.05) >= 4.5, "white must meet AA on the chosen green");

  assert.match(ruleBody(".mark-ruler-value"), /var\(--c-on, #ffffff\)/);
  assert.match(ruleBody(".mark-ruler-fill"), /var\(--c, var\(--ink\)\)/);
  assert.match(pickerSource, /const hasSelection = marked \|\| preview !== null/);

  const openRule = ruleBody(".mark-picker.is-open");
  assert.match(openRule, /border-color: var\(--ink\)/);
  assert.doesNotMatch(openRule, /--c(?:-wash)?|background:/);
  assert.match(ruleBody(".mark-picker:hover"), /border-color: var\(--ink-3\)/);
});

test("the mark bar opens on a press and commits when the press ends", () => {
  assert.match(pickerSource, /className={`mark-bar/);
  assert.match(pickerSource, /setOpen\(true\);\s*setPinned\(false\);/);
  assert.match(pickerSource, /if \(drag\?\.moved && previewRef\.current !== null\)/);
  // A press that does not move leaves the bar open to pick from.
  assert.match(pickerSource, /setPinned\(true\);/);
  assert.match(pickerSource, /className={`mark-ruler/);
  assert.match(pickerSource, /const markAt = useCallback/);
  assert.doesNotMatch(pickerSource, /chip-strip|previewChipAt/);
});

test("the mark ruler uses sparse anchors and exposes half marks as minor ticks", () => {
  assert.match(pickerSource, /awardableMarks\(max, step\)/);
  assert.match(pickerSource, /role="slider"/);
  assert.match(pickerSource, /aria-valuemin=\{0\}/);
  assert.match(pickerSource, /aria-valuemax=\{max\}/);
  assert.match(pickerSource, /const RULER_LABEL_INTERVAL = 5/);
  assert.match(pickerSource, /shouldLabelRulerMark\(mark, max\)/);
  assert.match(pickerSource, /mark === 0 \|\| mark === max \|\| mark % RULER_LABEL_INTERVAL === 0/);
  assert.match(pickerSource, /whole \? "is-whole" : "is-half"/);
  assert.match(ruleBody(".mark-ruler"), /height: 72px/);
  assert.match(ruleBody(".mark-ruler-tick.is-whole"), /height: 16px/);
  assert.match(ruleBody(".mark-ruler-tick"), /height: 8px/);
  assert.doesNotMatch(pickerSource, /role="radio"|data-mark|wholeChips/);
});

test("the ruler uses a substantial thumb and disables easing while dragging", () => {
  assert.match(pickerSource, /const \[dragging, setDragging\] = useState\(false\)/);
  assert.match(pickerSource, /dragging \? "is-dragging" : ""/);
  assert.match(pickerSource, /key=\{display\} className="mark-ruler-value t-num"/);
  assert.match(ruleBody(".mark-ruler-thumb"), /width: 28px/);
  assert.match(ruleBody(".mark-ruler-thumb"), /height: 38px/);
  assert.match(ruleBody(".mark-ruler-thumb"), /transition: left 120ms/);
  assert.match(
    cssSource,
    /\.mark-ruler\.is-dragging \.mark-ruler-fill,[\s\S]*?\.mark-ruler\.is-dragging \.mark-ruler-thumb\s*\{[\s\S]*?transition: none/,
  );
  assert.match(cssSource, /@media \(prefers-reduced-motion: reduce\)/);
});

test("the Finish recovery remains available across repeated invalid saves", () => {
  assert.match(finishDialogSource, /const \[saveAttemptCount, setSaveAttemptCount\] = useState\(0\)/);
  assert.match(finishDialogSource, /setSaveAttemptCount\(\(attempts\) => attempts \+ 1\)/);
  assert.match(finishDialogSource, /\[firstMissing, saveAttemptCount\]/);
  assert.match(finishDialogSource, /dismissOnOutsidePress=\{!invalid\}/);
  assert.match(pickerSource, /dismissOnOutsidePress\?: boolean/);
  assert.match(pickerSource, /if \(!dismissOnOutsidePress\) return/);
  assert.doesNotMatch(ruleBody(".finish-score-row.is-invalid"), /inset 3px/);
  assert.match(ruleBody(".finish-score-row.is-invalid"), /padding: 8px 10px 12px/);
  assert.match(
    ruleBody('[data-theme="dark"] .finish-mark-error'),
    /color: #e17c73/,
  );
});

test("the ruler snaps to half marks and commits only when the pointer is released", () => {
  assert.match(
    pickerSource,
    /clamp\(ratio \* max\)/,
  );

  const moveHandler = pickerSource.slice(
    pickerSource.indexOf("onPointerMove={(event) =>"),
    pickerSource.indexOf("onPointerUp={(event) =>"),
  );
  assert.match(moveHandler, /previewMarkAt\(event\.clientX\)/);
  assert.doesNotMatch(moveHandler, /commit\(/);

  const upHandler = pickerSource.slice(
    pickerSource.indexOf("onPointerUp={(event) =>"),
    pickerSource.indexOf("onPointerCancel={() =>"),
  );
  assert.match(upHandler, /commit\(previewRef\.current \?\? markAt\(event\.clientX\)\)/);
});

test("the quiet ruler stays neutral until a mark is set or previewed", () => {
  assert.match(pickerSource, /const hasSelection = marked \|\| preview !== null/);
  assert.match(pickerSource, /\{hasSelection && \(\s*<span className="mark-ruler-fill"/s);
  assert.match(
    pickerSource,
    /\{hasSelection && \(\s*<span\s+className=\{`mark-ruler-thumb \$\{thumbEdge\}`\}/s,
  );
  assert.match(ruleBody(".mark-ruler-rail"), /background: var\(--bg\)/);
});

test("Adu and Raagu defaults to half-mark increments", () => {
  assert.equal(DEFAULT_CONFIG["adu-raagu"].step, 0.5);
});

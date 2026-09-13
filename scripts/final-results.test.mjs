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
  finalResultPercentage,
  finalResultsHeaders,
  finalResultsJudgeGroups,
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

const participantForAge = (id, number, name, ageGroup) => ({
  ...participant,
  id,
  number,
  name,
  ageGroup,
});
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

test("placements use final percentage, then Jali, then Khafi, and stop there", () => {
  const candidate = buildResultCandidates([
    session("ranking-base", ["jali", "khafi", "fasaha"]),
  ], JUDGED)[0];
  const base = finalizeParticipantResult(candidate, {});
  assert.ok(base);

  const rankedResult = (id, number, scores, includeAduRaagu = false) => {
    const byCategory = {
      jali: { ...base.byCategory.jali, score: scores.jali },
      khafi: { ...base.byCategory.khafi, score: scores.khafi },
      fasaha: { ...base.byCategory.fasaha, score: scores.fasaha },
      ...(includeAduRaagu ? {
        "adu-raagu": {
          category: "adu-raagu",
          score: scores["adu-raagu"],
          max: 10,
          sessionId: `adu-${id}`,
          sessionRevision: 1,
          judgeSeatId: "judge-adu",
          judgeName: "Judge Adu",
        },
      } : {}),
    };
    const total = Object.values(byCategory).reduce((sum, score) => sum + score.score, 0);
    const totalMax = Object.values(byCategory).reduce((sum, score) => sum + score.max, 0);
    return {
      ...base,
      id,
      participant: { ...base.participant, id: `p-${id}`, number, name: id },
      byCategory,
      total,
      totalMax,
      manifest: `manifest-${id}`,
    };
  };

  const strongerJali = rankedResult("stronger-jali", "002", {
    jali: 48,
    khafi: 29,
    fasaha: 19,
  });
  const weakerJali = rankedResult("weaker-jali", "001", {
    jali: 46,
    khafi: 30,
    fasaha: 20,
  });
  assert.deepEqual(
    placeFinalizedResults([weakerJali, strongerJali]).map((item) => [item.id, item.place]),
    [["stronger-jali", 1], ["weaker-jali", 2]],
  );

  const strongerKhafi = rankedResult("stronger-khafi", "004", {
    jali: 48,
    khafi: 29,
    fasaha: 19,
  });
  const weakerKhafi = rankedResult("weaker-khafi", "003", {
    jali: 48,
    khafi: 28,
    fasaha: 20,
  });
  assert.deepEqual(
    placeFinalizedResults([weakerKhafi, strongerKhafi]).map((item) => [item.id, item.place]),
    [["stronger-khafi", 1], ["weaker-khafi", 2]],
  );

  const laterCriteriaLeft = rankedResult("later-left", "006", {
    jali: 48,
    khafi: 29,
    fasaha: 18,
    "adu-raagu": 10,
  }, true);
  const laterCriteriaRight = rankedResult("later-right", "005", {
    jali: 48,
    khafi: 29,
    fasaha: 20,
    "adu-raagu": 8,
  }, true);
  assert.deepEqual(
    placeFinalizedResults([laterCriteriaLeft, laterCriteriaRight]).map((item) => item.place),
    [1, 1],
  );
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
  const exportedAt = Date.UTC(2026, 7, 19, 10, 15, 0);
  const buffer = await buildFinalResultsWorkbook([result], competition, { exportedAt });
  await verifyFinalResultsWorkbook(buffer, [result]);
  const { read, utils } = await import("xlsx");
  const workbook = read(buffer, { type: "array" });
  assert.deepEqual(workbook.SheetNames, ["Final marks", "Score ledger", "Audit", "Verification"]);
  const rows = utils.sheet_to_json(workbook.Sheets["Final marks"], { header: 1, defval: "" });
  assert.match(rows[0][0], /National Quran Competition — Final marks/);
  assert.equal(rows[1][0], "Participant");
  assert.equal(rows[1][7], "Judge all");
  assert.equal(rows[1].at(-1), "Result");
  assert.deepEqual(rows[2], finalResultsHeaders([result]));
  assert.deepEqual(rows[3].slice(1, 7), [
    "014",
    "Aishath Latheefa",
    "Under 14",
    "Balaigen",
    "Fesheykolhu",
    "School A",
  ]);
  assert.deepEqual(rows[3].slice(7, 12), [48, 30, 20, 0.98, 0.98]);
  assert.doesNotMatch(rows[2].join("|"), /Phone|Maximum|Revision|Manifest|Date/);

  const ledgerRows = utils.sheet_to_json(workbook.Sheets["Score ledger"], { header: 1, defval: "" });
  assert.deepEqual(ledgerRows[1].slice(1, 7), [
    "014",
    "Aishath Latheefa",
    "Under 14",
    "Balaigen",
    "Judge all",
    "Laḥn Jalī + Laḥn Khafī + Faṣāḥa",
  ]);
  assert.deepEqual(ledgerRows[1].slice(7, 15), [48, 30, 20, 98, 100, 0.98, 0.98, result.manifest]);

  const auditRows = utils.sheet_to_json(workbook.Sheets.Audit, { header: 1, defval: "" });
  assert.deepEqual(auditRows[0], [
    "Participant Number",
    "Name",
    "Maximum",
    "Final Marks (%)",
    "Result Revision",
    "Revision Reason",
    "Verification Manifest",
  ]);
  assert.deepEqual(auditRows[1], ["014", "Aishath Latheefa", 100, 0.98, 1, "", result.manifest]);
  const verificationRows = utils.sheet_to_json(workbook.Sheets.Verification, {
    header: 1,
    defval: "",
    blankrows: false,
  });
  assert.ok(verificationRows.some((row) =>
    row[0] === "Export generated (UTC)" && row[1] === "2026-08-19T10:15:00.000Z"
  ));

  const ExcelJS = (await import("exceljs")).default;
  const styled = new ExcelJS.Workbook();
  await styled.xlsx.load(buffer);
  const resultSheet = styled.getWorksheet("Final marks");
  const ledgerSheet = styled.getWorksheet("Score ledger");
  const auditSheet = styled.getWorksheet("Audit");
  assert.ok(resultSheet);
  assert.ok(ledgerSheet);
  assert.ok(auditSheet);
  assert.equal(resultSheet.views[0].xSplit, 3);
  assert.equal(resultSheet.views[0].ySplit, 3);
  assert.equal(resultSheet.pageSetup.orientation, "landscape");
  assert.equal(resultSheet.pageSetup.fitToWidth, 0);
  assert.equal(resultSheet.pageSetup.fitToPage, false);
  assert.equal(resultSheet.pageSetup.scale, 100);
  assert.equal(resultSheet.pageSetup.printTitlesColumn, "A:C");
  assert.equal(resultSheet.pageSetup.fitToHeight, 0);
  assert.ok(resultSheet.autoFilter);
  assert.equal(resultSheet.getColumn(2).width, 7);
  assert.equal(resultSheet.getCell("B3").value, "No.");
  assert.equal(resultSheet.getCell("H3").alignment.horizontal, "center");
  assert.equal(resultSheet.getCell("H4").alignment.horizontal, "center");
  assert.equal(resultSheet.getColumn(4).width, 12);
  assert.equal(resultSheet.getColumn(5).width, 18);
  assert.equal(resultSheet.getCell("H2").fill.fgColor.argb, "FFF0EFEA");
  assert.equal(resultSheet.getCell("H3").fill.fgColor.argb, "FFFCECEA");
  assert.equal(resultSheet.getCell("H4").fill.fgColor.argb, "FFFEF6F5");
  assert.equal(resultSheet.getCell("B4").numFmt, "@");
  assert.equal(resultSheet.getCell("A1").fill.fgColor.argb, "FFFFFFFF");
  assert.equal(resultSheet.getCell("A1").font.color.argb, "FF242421");
  assert.equal(resultSheet.getCell("A1").font.name, "Arial");
  assert.equal(resultSheet.getCell("A3").font.name, "Arial");
  assert.equal(resultSheet.getCell("A4").font.name, "Arial");
  assert.equal(resultSheet.getCell("B4").border.bottom.style, "hair");
  assert.equal(resultSheet.getCell("H4").border.left.style, "thin");
  assert.equal(resultSheet.getCell("H2").font.color.argb, "FF242421");
  assert.equal(resultSheet.getCell("H3").border.bottom.color.argb, "FF9E2820");
  assert.equal(resultSheet.getCell("H3").border.bottom.style, "thin");
  assert.equal(resultSheet.getCell("I3").border.bottom.color.argb, "FF7C540E");
  assert.equal(resultSheet.getCell("J3").border.bottom.color.argb, "FF2F3AA3");
  assert.ok(ledgerSheet.autoFilter);
  assert.equal(auditSheet.getCell("A1").fill.fgColor.argb, "FFFFFFFF");
  assert.equal(auditSheet.getCell("A1").font.color.argb, "FF242421");
  assert.ok(auditSheet.autoFilter);
});

test("final workbook groups split-responsibility marks under their responsible judges", async () => {
  const candidate = buildResultCandidates([
    session("jali", ["jali"], [mistake("jali", 2)]),
    session("khafi", ["khafi"], [mistake("khafi", 1)]),
    session("fasaha", ["fasaha"], [mistake("fasaha", 1)]),
  ], JUDGED)[0];
  const result = finalizeParticipantResult(candidate, {});
  assert.ok(result);
  assert.equal(finalResultPercentage(result), 0.96);
  assert.deepEqual(finalResultsJudgeGroups([result]).map((group) => ({
    judge: group.judgeName,
    categories: group.categories,
  })), [
    { judge: "Judge jali", categories: ["jali"] },
    { judge: "Judge khafi", categories: ["khafi"] },
    { judge: "Judge fasaha", categories: ["fasaha"] },
  ]);

  const buffer = await buildFinalResultsWorkbook([result], competition, {
    exportedAt: Date.UTC(2026, 7, 20),
  });
  await verifyFinalResultsWorkbook(buffer, [result]);
  const { read, utils } = await import("xlsx");
  const workbook = read(buffer, { type: "array" });
  const markRows = utils.sheet_to_json(workbook.Sheets["Final marks"], { header: 1, defval: "" });
  assert.deepEqual(markRows[1].filter(Boolean), [
    "Participant",
    "Judge jali",
    "Judge khafi",
    "Judge fasaha",
    "Result",
  ]);
  assert.deepEqual(markRows[2].slice(7), [
    "Laḥn Jalī (50)",
    "Judge (%)",
    "Laḥn Khafī (30)",
    "Judge (%)",
    "Faṣāḥa (20)",
    "Judge (%)",
    "Final Marks (%)",
  ]);
  assert.deepEqual(markRows[3].slice(7), [48, 0.96, 29, 29 / 30, 19, 0.95, 0.96]);
  const ledgerRows = utils.sheet_to_json(workbook.Sheets["Score ledger"], { header: 1, defval: "" });
  assert.equal(ledgerRows.length, 4);
});

test("frozen setup creates one to four judge groups with enabled criteria only", async () => {
  const all = ["jali", "khafi", "fasaha", "adu-raagu"];
  const { read, utils } = await import("xlsx");
  for (const count of [1, 2, 3, 4]) {
    const seats = Array.from({ length: count }, (_, index) => ({
      id: `seat-${index}`, label: `Judge ${index + 1}`, name: "Same name",
      categories: all.filter((_, categoryIndex) => categoryIndex % count === index),
    }));
    const configured = { ...competition, liveSnapshot: {
      panel: { seats },
      scoreConfig: Object.fromEntries(all.map((category, index) => [category, {
        enabled: true, start: 10 + index, step: 0.5,
      }])),
    } };
    const groups = finalResultsJudgeGroups([], configured);
    assert.equal(groups.length, count);
    assert.equal(new Set(groups.map(group => group.judgeSeatId)).size, count);
    const buffer = await buildFinalResultsWorkbook([], configured);
    await verifyFinalResultsWorkbook(buffer, [], configured);
    const workbook = read(buffer, { type: "array" });
    const rows = utils.sheet_to_json(workbook.Sheets["Final marks"], { header: 1 });
    assert.equal(rows[2].length, 7 + 4 + count + 1);
    assert.equal(rows[1].filter(value => value === "Same name").length, count);
    configured.liveSnapshot.scoreConfig.fasaha.enabled = false;
    const reduced = await buildFinalResultsWorkbook([], configured);
    const reducedRows = utils.sheet_to_json(read(reduced, { type: "array" }).Sheets["Final marks"], { header: 1 });
    assert.ok(!reducedRows[2].some(value => String(value).includes("Faṣāḥa")));
    assert.ok(reducedRows[2].includes("Adu / Raagu (13)"));
  }
});

test("setup additions leave missing marks blank and preserve frozen judge attribution", async () => {
  const result = finalizeParticipantResult(buildResultCandidates([
    session("original", JUDGED),
  ], JUDGED)[0], {});
  const configured = { ...competition, liveSnapshot: {
    panel: { seats: [{ id: "new-seat", label: "New judge", name: "", categories: ["jali"] }] },
    scoreConfig: { ...config, fasaha: { ...config.fasaha, enabled: false } },
  } };
  const buffer = await buildFinalResultsWorkbook([result], configured);
  await verifyFinalResultsWorkbook(buffer, [result], configured);
  const { read, utils } = await import("xlsx");
  const rows = utils.sheet_to_json(read(buffer, { type: "array" }).Sheets["Final marks"], { header: 1, defval: "" });
  const newColumn = rows[1].indexOf("New judge");
  assert.ok(newColumn >= 7);
  assert.equal(rows[3][newColumn], "");
  assert.equal(rows[3][newColumn + 1], "");
  assert.ok(rows[1].includes("Judge original"));
  assert.ok(rows[2].includes("Faṣāḥa (20)"));
  assert.equal(rows[3].at(-1), 1);
});

test("long institution and judge names wrap without enlarging ordinary rows", async () => {
  const source = session("long-name", JUDGED);
  source.assignment.judgeName = "Example Judge Mohamed Abdul Rahman Ibrahim Hassan Ali";
  const result = finalizeParticipantResult(buildResultCandidates([source], JUDGED)[0], {});
  const long = { ...result, participant: { ...result.participant, number: "015", institution: "Example International Quran Education and Learning Centre" }, manifest: "long-name-example" };
  const buffer = await buildFinalResultsWorkbook([result, long], competition);
  const ExcelJS = (await import("exceljs")).default;
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  const sheet = workbook.getWorksheet("Final marks");
  assert.equal(sheet.getCell("H2").alignment.wrapText, true);
  const rows = [sheet.getRow(4), sheet.getRow(5)];
  const longRow = rows.find(row => row.getCell(2).value === "015");
  const normalRow = rows.find(row => row.getCell(2).value === "014");
  assert.ok(longRow.height > normalRow.height);
  assert.equal(normalRow.height, 26);
  assert.equal(longRow.getCell(7).alignment.wrapText, true);
  assert.equal(longRow.getCell(8).alignment.horizontal, "center");
});

test("final workbook orders numeric age groups from youngest to oldest", async () => {
  const baseCandidate = buildResultCandidates([
    session("age-base", ["jali", "khafi", "fasaha"]),
  ], JUDGED)[0];
  const base = finalizeParticipantResult(baseCandidate, {});
  assert.ok(base);
  const results = [
    { ...base, id: "r-open", participant: participantForAge("p-open", "090", "Open", "Open"), manifest: "m-open" },
    { ...base, id: "r-16", participant: participantForAge("p-16", "016", "Older", "Under 16"), manifest: "m-16" },
    { ...base, id: "r-10", participant: participantForAge("p-10", "010", "Youngest", "Under 10"), manifest: "m-10" },
    { ...base, id: "r-12", participant: participantForAge("p-12", "012", "Younger", "Under 12"), manifest: "m-12" },
  ];
  const buffer = await buildFinalResultsWorkbook(results, competition, {
    exportedAt: Date.UTC(2026, 7, 20),
  });
  const { read, utils } = await import("xlsx");
  const workbook = read(buffer, { type: "array" });
  const rows = utils.sheet_to_json(workbook.Sheets["Final marks"], {
    defval: "",
    raw: false,
    range: 2,
  });
  assert.deepEqual(rows.map((row) => row["Age Group"]), [
    "Under 10",
    "Under 12",
    "Under 16",
    "Open",
  ]);
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
  assert.throws(
    () => parseJudgeResultPackage({
      ...resultPackage,
      competition: { ...resultPackage.competition, isSample: undefined },
    }),
    /not a complete Tahqeeq judge-result file/,
  );
  assert.throws(
    () => parseJudgeResultPackage({
      ...resultPackage,
      session: { ...resultPackage.session, events: [null] },
    }),
    /not a complete Tahqeeq judge-result file/,
  );
  assert.throws(
    () => parseJudgeResultPackage({
      ...resultPackage,
      session: {
        ...resultPackage.session,
        events: [{ type: "session_finalized" }],
      },
    }),
    /not a complete Tahqeeq judge-result file/,
  );
  assert.throws(
    () => parseJudgeResultPackage({
      ...resultPackage,
      session: { ...resultPackage.session, savedAt: Number.MAX_VALUE },
    }),
    /not a complete Tahqeeq judge-result file/,
  );
  assert.throws(
    () => parseJudgeResultPackage({
      ...resultPackage,
      session: {
        ...resultPackage.session,
        mistakes: [{ ...mistake("jali", 2), amount: -2 }],
      },
    }),
    /not a complete Tahqeeq judge-result file/,
  );
  assert.throws(
    () => parseJudgeResultPackage({
      ...resultPackage,
      session: {
        ...resultPackage.session,
        mistakes: [{ ...mistake("jali", 2), category: "adu-raagu" }],
      },
    }),
    /not a complete Tahqeeq judge-result file/,
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
  assert.match(recordsSource, /normalizeImportedSavedSession/);
  assert.match(recordsSource, /participant: canonicalParticipant/);
  assert.match(storeSource, /judging ledger does not agree with its saved score evidence/);
});

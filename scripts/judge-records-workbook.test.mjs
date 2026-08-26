import assert from "node:assert/strict";
import test from "node:test";
import {
  buildJudgeRecordsWorkbook,
  sortJudgeRecordSessions,
  verifyJudgeRecordsWorkbook,
} from "../src/lib/judgeRecordsWorkbook.ts";

const config = {
  jali: { enabled: true, start: 50, step: 2 },
  khafi: { enabled: true, start: 30, step: 1 },
  fasaha: { enabled: true, start: 10, step: 1 },
  "adu-raagu": { enabled: true, start: 10, step: 0.5 },
};

function session(id, ageGroup, number, savedAt, isSample = false) {
  return {
    id,
    competitionId: "competition-1436",
    competitionVersionId: "version-1",
    isSample,
    savedAt,
    participant: {
      id: `participant-${id}`,
      number,
      name: `Participant ${number}`,
      ageGroup,
      category: "baliagen",
      muqarrar: "feshey-kolhu",
      phone: "7770000",
      institution: "Falaah School",
    },
    config,
    total: 94.5,
    totalMax: 100,
    scoreKind: "judge-section",
    assignment: {
      version: 1,
      panel: {
        version: 1,
        preset: "all",
        seats: [{ id: "judge-1", label: "Judge 1", name: "Hassan Yoonus", categories: ["jali", "khafi", "fasaha", "adu-raagu"] }],
      },
      judgeSeatId: "judge-1",
      judgeLabel: "Judge 1",
      judgeName: "Hassan Yoonus",
      categories: ["jali", "khafi", "fasaha", "adu-raagu"],
      config,
    },
    notes: "",
    mistakes: [{
      id: `mistake-${id}`,
      tid: `target-${id}`,
      wordId: `word-${id}`,
      wordText: "لَئِن",
      fullGlyph: "ئِ",
      surah: 9,
      ayah: 75,
      page: 199,
      glyph: "ئِ",
      label: "9:75 · kalimah 5",
      category: "jali",
      amount: 2,
      note: "Hamzah pronunciation",
      ts: savedAt - 200,
    }],
    impressions: [{
      category: "adu-raagu",
      awarded: 6.5,
      note: "Measured whole-recitation mark",
      set: true,
      judgeSeatId: "judge-1",
      ts: savedAt - 100,
    }],
    events: [],
  };
}

const competition = {
  version: 1,
  id: "competition-1436",
  name: "Falaah Quran Mubaaraai",
  edition: "1436",
  status: "live",
  isSample: false,
};

test("judge-record workbook is formatted, verified, and ordered youngest first", async () => {
  const history = [
    session("open", "Open", "090", 5000),
    session("u16", "Under 16", "016", 4000),
    session("u10", "Under 10", "001", 2000),
    session("u12", "Under 12", "012", 3000),
    session("practice", "Under 8", "099", 1000, true),
  ];
  assert.deepEqual(
    sortJudgeRecordSessions(history.filter((item) => !item.isSample)).map((item) => item.participant.ageGroup),
    ["Under 10", "Under 12", "Under 16", "Open"],
  );
  const buffer = await buildJudgeRecordsWorkbook(history, "official", {
    exportedAt: Date.UTC(2026, 7, 20, 8, 30),
    competition,
  });
  await verifyJudgeRecordsWorkbook(buffer, history, "official");

  const { read, utils } = await import("xlsx");
  const workbook = read(buffer, { type: "array" });
  assert.deepEqual(workbook.SheetNames, ["Judge records", "Mistakes", "Verification"]);
  const records = utils.sheet_to_json(workbook.Sheets["Judge records"], { defval: "", raw: false });
  assert.deepEqual(records.map((row) => row["Age Group"]), ["Under 10", "Under 12", "Under 16", "Open"]);
  assert.deepEqual(records.map((row) => row["Participant Number"]), ["001", "012", "016", "090"]);
  assert.ok(records.every((row) => row.Judge === "Hassan Yoonus"));
  assert.ok(records.every((row) => row.Competition === "Falaah Quran Mubaaraai · 1436"));
  assert.ok(records.every((row) => !("Phone" in row)));

  const evidence = utils.sheet_to_json(workbook.Sheets.Mistakes, { defval: "", raw: false });
  assert.equal(evidence.length, 8);
  assert.equal(evidence[0].Kalimah, "لَئِن");
  assert.equal(evidence[0].Letter, "ئِ");
  assert.equal(evidence[1]["Evidence type"], "Whole recitation");
  assert.equal(Number(evidence[1].Deduction), 3.5);

  const ExcelJS = (await import("exceljs")).default;
  const styled = new ExcelJS.Workbook();
  await styled.xlsx.load(buffer);
  const recordsSheet = styled.getWorksheet("Judge records");
  const mistakesSheet = styled.getWorksheet("Mistakes");
  assert.ok(recordsSheet);
  assert.ok(mistakesSheet);
  assert.equal(recordsSheet.getCell("A1").fill.fgColor.argb, "FFFFFFFF");
  assert.equal(recordsSheet.getCell("A1").font.color.argb, "FF242421");
  assert.equal(recordsSheet.getCell("A1").font.bold, true);
  assert.equal(recordsSheet.getCell("B2").numFmt, "@");
  assert.equal(recordsSheet.views[0].xSplit, 3);
  assert.ok(recordsSheet.autoFilter);
  assert.equal(mistakesSheet.getCell("E2").fill.fgColor.argb, "FFFFF7F6");
  assert.equal(mistakesSheet.getCell("E2").font.color.argb, "FF9E2820");
});

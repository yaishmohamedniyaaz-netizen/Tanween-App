import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import {
  competitionReadiness,
  createLiveCompetitionSnapshot,
  normalizeCompetition,
} from "../src/lib/competition.ts";
import { createPanelPreset } from "../src/lib/judgeAssignments.ts";
import {
  createSampleCompetition,
  createSampleRoster,
} from "../src/lib/sampleCompetition.ts";

const config = {
  jali: { start: 50, step: 2 },
  khafi: { start: 30, step: 1 },
  fasaha: { start: 20, step: 1 },
};
const participant = {
  id: "participant-14",
  number: "014",
  name: "Aishath",
  ageGroup: "Under 14",
  category: "nubalaa",
  muqarrar: "feshey-kolhu",
  phone: "7770000",
  institution: "School A",
  judged: false,
};
const division = {
  id: "division-u14-hifz",
  name: "Under 14 Hifz",
  ageGroup: "Under 14",
  category: "nubalaa",
  quranPortion: { kind: "juz-range", startJuz: 25, endJuz: 30 },
};

function readyInput() {
  return {
    competition: normalizeCompetition({
      id: "competition-2026",
      name: "National Quran Competition",
      edition: "2026",
      divisions: [division],
    }),
    panel: createPanelPreset("all"),
    deviceJudgeId: "judge-1",
    config,
    roster: [participant],
  };
}

test("legacy competition identity becomes a non-live draft", () => {
  const competition = normalizeCompetition({
    version: 1,
    id: "legacy",
    name: "Legacy event",
    edition: "2025",
  });
  assert.equal(competition.version, 2);
  assert.equal(competition.status, "draft");
  assert.equal(competition.liveSnapshot, null);
  assert.equal(competition.questionPolicy.mode, "manual");
  assert.equal(competition.questionPolicy.targetRecitationLines, 7);
});

test("official start readiness names every incomplete section", () => {
  const empty = competitionReadiness({
    competition: normalizeCompetition(),
    panel: createPanelPreset("all"),
    deviceJudgeId: "judge-1",
    config,
    roster: [],
  });
  assert.equal(empty.ready, false);
  assert.deepEqual(
    new Set(empty.issues.map((issue) => issue.section)),
    new Set(["competition", "divisions", "participants"]),
  );

  const ready = competitionReadiness(readyInput());
  assert.deepEqual(ready, { ready: true, issues: [] });
});

test("a Tahqeeq question set must be checked and frozen before start", () => {
  const input = readyInput();
  input.competition.questionPolicy = {
    ...input.competition.questionPolicy,
    mode: "tahqeeq",
  };
  const readiness = competitionReadiness(input);
  assert.equal(readiness.ready, false);
  assert.equal(readiness.issues[0].section, "questions");
});

test("every participant must map to exactly one active division", () => {
  const unmatched = readyInput();
  unmatched.roster[0].ageGroup = "Under 16";
  assert.equal(competitionReadiness(unmatched).ready, false);
  assert.match(
    competitionReadiness(unmatched).issues[0].message,
    /does not match an active age-group and category division/,
  );

  const duplicated = readyInput();
  duplicated.competition.divisions.push({
    ...division,
    id: "duplicate-division",
    name: "Duplicate division",
  });
  const duplicateReadiness = competitionReadiness(duplicated);
  assert.equal(duplicateReadiness.ready, false);
  assert.ok(duplicateReadiness.issues.some((issue) => /Only one/.test(issue.message)));
});

test("the live competition snapshot is detached and versioned", () => {
  const input = readyInput();
  const snapshot = createLiveCompetitionSnapshot({ ...input, startedAt: 1000 });
  assert.equal(snapshot.versionId, "competition-2026:setup-1");
  assert.equal(snapshot.startedAt, 1000);
  assert.equal(snapshot.mushafSourceVersion, "v1-1405-r2");
  assert.equal(snapshot.roster[0].name, "Aishath");
  assert.equal("judged" in snapshot.roster[0], false);

  input.panel.seats[0].name = "Changed";
  input.config.jali.start = 5;
  input.roster[0].name = "Changed participant";
  input.competition.divisions[0].name = "Changed division";
  assert.equal(snapshot.panel.seats[0].name, "");
  assert.equal(snapshot.scoreConfig.jali.start, 50);
  assert.equal(snapshot.roster[0].name, "Aishath");
  assert.equal(snapshot.divisions[0].name, "Under 14 Hifz");
});

test("the built-in sample is complete, clearly marked, and ready to test", () => {
  const competition = createSampleCompetition();
  const roster = createSampleRoster();
  assert.equal(competition.isSample, true);
  assert.equal(competition.divisions.length, 4);
  assert.equal(roster.length, 8);
  assert.ok(roster.every((entry) => entry.name.startsWith("Sample Participant")));
  const input = {
    competition,
    panel: createPanelPreset("all"),
    deviceJudgeId: "judge-1",
    config: {
      jali: { start: 50, step: 2 },
      khafi: { start: 30, step: 1 },
      fasaha: { start: 20, step: 1 },
    },
    roster,
  };
  assert.deepEqual(competitionReadiness(input), { ready: true, issues: [] });
  assert.equal(createLiveCompetitionSnapshot(input).isSample, true);
});

test("the reducer gates official judging behind a live frozen competition", () => {
  const source = fs.readFileSync(
    new URL("../src/state/store.tsx", import.meta.url),
    "utf8",
  );
  assert.match(source, /case "START_COMPETITION"/);
  assert.match(source, /competitionReadiness\(state\)/);
  assert.match(source, /state\.competition\.status !== "live"/);
  assert.match(source, /liveSnapshot\.roster\.some/);
  assert.match(source, /currentRosterEntry\.judged/);
  assert.match(source, /backup\.pre-question-bank-v1/);
  assert.match(source, /case "CLOSE_COMPETITION"/);
  assert.match(source, /case "LOAD_SAMPLE_COMPETITION"/);
  assert.match(source, /case "REMOVE_SAMPLE_DATA"/);
});

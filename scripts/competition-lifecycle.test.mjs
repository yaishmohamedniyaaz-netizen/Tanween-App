import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import {
  competitionReadiness,
  createLiveCompetitionSnapshot,
  normalizeCompetition,
} from "../src/lib/competition.ts";
import {
  createPanelPreset,
  makeAssignmentSnapshot,
} from "../src/lib/judgeAssignments.ts";
import {
  createSampleCompetition,
  createSampleJudgePanel,
  createSampleRoster,
  refreshSampleRoster,
  SAMPLE_COMPETITION_EDITION,
  SAMPLE_COMPETITION_NAME,
  SAMPLE_JUDGE_NAME,
} from "../src/lib/sampleCompetition.ts";
import { normalizePreparedRecitation } from "../src/lib/preparedRecitation.ts";

const JUDGED = ["jali", "khafi", "fasaha"];
const baseConfig = {
  jali: { enabled: true, start: 50, step: 2 },
  khafi: { enabled: true, start: 30, step: 1 },
  fasaha: { enabled: true, start: 20, step: 1 },
  "adu-raagu": { enabled: false, start: 0, step: 1 },
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
    panel: createPanelPreset("all", JUDGED),
    deviceJudgeId: "judge-1",
    config: structuredClone(baseConfig),
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
  assert.equal(competition.participantNumbering, "supplied");
  assert.deepEqual(competition.participantEntrySettings, {
    institutions: [],
    defaultMuqarrar: "",
    defaultInstitution: "",
  });
  assert.equal(competition.questionPolicy.mode, "manual");
  assert.equal(competition.questionPolicy.targetRecitationLines, 7);
});

test("new competitions default to ten lines while explicit seven-line policies stay unchanged", () => {
  assert.equal(normalizeCompetition().questionPolicy.targetRecitationLines, 10);
  assert.equal(normalizeCompetition({
    questionPolicy: { targetRecitationLines: 7 },
  }).questionPolicy.targetRecitationLines, 7);
});

test("official start readiness names every incomplete section", () => {
  const empty = competitionReadiness({
    competition: normalizeCompetition(),
    panel: createPanelPreset("all", JUDGED),
    deviceJudgeId: "judge-1",
    config: structuredClone(baseConfig),
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

  input.competition.questionPolicy = {
    ...input.competition.questionPolicy,
    questionSetId: "reviewed-set",
    frozenQuestionSet: true,
    approvedQuestionCount: 19,
  };
  assert.equal(competitionReadiness(input).ready, false);
  input.competition.questionPolicy.approvedQuestionCount = 20;
  assert.equal(competitionReadiness(input).ready, true);
});

test("participant entry settings normalize duplicate institutions without inventing defaults", () => {
  const competition = normalizeCompetition({
    participantEntrySettings: {
      institutions: [" School A ", "school a", "Quran Class", ""],
      defaultMuqarrar: "feshey-kolhu",
      defaultInstitution: " School A ",
    },
  });
  assert.deepEqual(competition.participantEntrySettings, {
    institutions: ["School A", "Quran Class"],
    defaultMuqarrar: "feshey-kolhu",
    defaultInstitution: "School A",
  });
});

test("an unapplied roster draft blocks official start", () => {
  const input = readyInput();
  input.rosterDraft = {
    version: 1,
    competitionId: input.competition.id,
    source: "manual",
    numberingMode: "automatic",
    rows: [],
    sourceWarnings: [],
    updatedAt: 1,
  };
  const readiness = competitionReadiness(input);
  assert.equal(readiness.ready, false);
  assert.ok(readiness.issues.some((issue) => /apply or discard/.test(issue.message)));
});

test("every participant must map to exactly one active division", () => {
  const unmatched = readyInput();
  unmatched.roster[0].ageGroup = "Under 16";
  assert.equal(competitionReadiness(unmatched).ready, false);
  assert.match(
    competitionReadiness(unmatched).issues[0].message,
    /does not match an active participant category/,
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
  const panel = createSampleJudgePanel(baseConfig);
  const roster = createSampleRoster();
  assert.equal(competition.isSample, true);
  assert.equal(competition.name, SAMPLE_COMPETITION_NAME);
  assert.equal(competition.edition, SAMPLE_COMPETITION_EDITION);
  assert.equal(panel.seats.length, 1);
  assert.equal(panel.seats[0].name, SAMPLE_JUDGE_NAME);
  assert.equal(competition.divisions.length, 4);
  assert.equal(roster.length, 72);
  assert.equal(roster.at(-1).number, "72");
  assert.equal(new Set(roster.map((entry) => entry.id)).size, roster.length);
  assert.equal(new Set(roster.map((entry) => entry.number)).size, roster.length);
  assert.equal(new Set(roster.map((entry) => entry.name)).size, roster.length);
  assert.ok(roster.every((entry) => !entry.name.startsWith("Sample Participant")));
  assert.equal(roster[0].name, "Ahmed Rasheed");
  const refreshedRoster = refreshSampleRoster([
    { ...roster[0], judged: true },
    ...roster.slice(1, 8),
  ]);
  assert.equal(refreshedRoster.length, 72);
  assert.equal(refreshedRoster[0].judged, true);
  assert.equal(refreshedRoster[8].judged, false);
  for (const division of competition.divisions) {
    const divisionRoster = roster.filter(
      (entry) =>
        entry.ageGroup === division.ageGroup && entry.category === division.category,
    );
    assert.equal(divisionRoster.length, 18);
    assert.equal(
      divisionRoster.filter((entry) => entry.muqarrar === "feshey-kolhu").length,
      9,
    );
    assert.equal(
      divisionRoster.filter((entry) => entry.muqarrar === "nimey-kolhu").length,
      9,
    );
  }
  const input = {
    competition,
    panel,
    deviceJudgeId: "judge-1",
    config: structuredClone(baseConfig),
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
  assert.match(source, /questionAssignmentIsValid/);
  assert.match(source, /case "PREPARE_RECITER"/);
  assert.match(source, /case "BEGIN_RECITER"/);
  assert.match(source, /question: ReciterQuestionAssignment/);
  assert.match(source, /backup\.pre-question-bank-v1/);
  assert.match(source, /case "CLOSE_COMPETITION"/);
  assert.match(source, /case "LOAD_SAMPLE_COMPETITION"/);
  assert.match(source, /case "REMOVE_SAMPLE_DATA"/);
});

test("Prepared survives normalization without creating a judging event", () => {
  const competition = createSampleCompetition();
  const roster = createSampleRoster();
  const panel = createPanelPreset("all", JUDGED);
  const assignment = makeAssignmentSnapshot(panel, "judge-1", baseConfig);
  assert.ok(assignment);
  const question = {
    version: 1,
    id: `question-assignment:${roster[0].id}:manual`,
    kind: "manual",
    participantId: roster[0].id,
    divisionId: competition.divisions[0].id,
    muqarrar: roster[0].muqarrar,
    selectedAt: 1500,
    label: "External question",
    replacements: [{
      version: 1,
      id: "replacement-1",
      replacedAt: 1400,
      reason: "question-changed",
      fromParticipantId: roster[0].id,
      fromQuestionId: "question-before",
      fromDrawId: "draw-before",
      toParticipantId: roster[0].id,
      toQuestionId: `question-assignment:${roster[0].id}:manual`,
    }],
  };
  const restored = normalizePreparedRecitation(
    {
      version: 1,
      id: "prepared-1",
      participant: roster[0],
      assignment,
      question,
      preparedAt: 2000,
    },
    baseConfig,
  );
  assert.equal(restored?.id, "prepared-1");
  assert.equal(restored?.question.label, "External question");
  assert.equal(restored?.question.replacements?.[0].fromDrawId, "draw-before");
  assert.equal(normalizePreparedRecitation({ ...restored, question: undefined }, baseConfig), null);
});

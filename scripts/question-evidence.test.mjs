import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import {
  buildResultCandidates,
  finalizeParticipantResult,
} from "../src/lib/finalResults.ts";
import {
  createQuestionIndexLookup,
  QUESTION_INDEX_VERSION,
  recitationRangeMatchesQuestionIndex,
  resolveQuestionRange,
} from "../src/lib/questionBank.ts";
import {
  buildParticipantQuestionEvidence,
  inspectImportedSessionQuestion,
  questionEvidenceFingerprint,
} from "../src/lib/questionEvidence.ts";
import {
  linesForEvidencePage,
  wordIdsForEvidencePage,
} from "../src/lib/recitationEvidenceLayout.ts";
import {
  contextRunsForLineStates,
  rangeDisplayForPage,
} from "../src/lib/recitationRangeLayout.ts";
import {
  normalizeQuestionAssignment,
  normalizeRecitationRangeSnapshot,
} from "../src/lib/reciterQuestions.ts";
import {
  MUSHAF_DATA_VERSION,
  MUSHAF_LAYOUT,
} from "../src/lib/mushafContract.ts";

const indexAsset = JSON.parse(
  fs.readFileSync("public/question-index.json", "utf8"),
);
const lookup = createQuestionIndexLookup(indexAsset);

function exactRange(startAyah, lines) {
  const resolved = resolveQuestionRange(lookup, startAyah, lines);
  assert.equal(resolved.ok, true);
  return {
    version: 1,
    ...resolved.range,
    mushafLayout: MUSHAF_LAYOUT,
    questionIndexVersion: QUESTION_INDEX_VERSION,
  };
}

function question(range, participantId = "participant-1") {
  return {
    version: 2,
    id: `question-assignment:${participantId}:fixture`,
    kind: "prepared-draft",
    participantId,
    divisionId: "division-1",
    muqarrar: "feshey-kolhu",
    selectedAt: 100,
    label: `${range.startAyah.surah}:${range.startAyah.ayah}–${range.endAyah.surah}:${range.endAyah.ayah}`,
    sourceQuestionId: "fixture",
    startAyah: { ...range.startAyah },
    endAyah: { ...range.endAyah },
    requestedLines: range.requestedLines,
    resolvedLines: range.resolvedLines,
    startPage: range.startPage,
    endPage: range.endPage,
    sourceVersion: range.sourceVersion,
    questionIndexVersion: range.questionIndexVersion,
    layoutHash: range.layoutHash,
    range,
  };
}

const participant = {
  id: "participant-1",
  number: "01",
  name: "Evidence Fixture",
  ageGroup: "Under 14",
  category: "baliagen",
  muqarrar: "feshey-kolhu",
  phone: "",
  institution: "",
};

const config = {
  jali: { enabled: true, start: 50, step: 2 },
  khafi: { enabled: true, start: 30, step: 1 },
  fasaha: { enabled: false, start: 0, step: 1 },
  "adu-raagu": { enabled: false, start: 0, step: 0.5 },
};

function session(id, category, recordedQuestion) {
  return {
    id,
    savedAt: 1000,
    revision: 1,
    participant,
    config,
    total: 0,
    totalMax: 0,
    scoreKind: "judge-section",
    assignment: {
      version: 1,
      panel: { version: 1, preset: "custom", seats: [] },
      judgeSeatId: `judge-${category}`,
      judgeLabel: `Judge ${category}`,
      judgeName: "",
      categories: [category],
      config,
    },
    question: recordedQuestion,
    notes: "",
    mistakes: [],
    impressions: [],
    events: [],
  };
}

test("a versioned question keeps the full immutable range and strips unknown input", () => {
  const range = exactRange({ surah: 97, ayah: 2 }, 10);
  const raw = { ...question(range), unknownPrivateField: "discard-me" };
  const normalized = normalizeQuestionAssignment(raw);
  assert.ok(normalized);
  assert.deepEqual(normalized.range, range);
  assert.equal(Object.hasOwn(normalized, "unknownPrivateField"), false);

  assert.equal(normalizeRecitationRangeSnapshot({
    ...range,
    startPage: 598,
    endPage: 598,
    startLine: 14,
    endLine: 3,
  }), null);
  assert.equal(normalizeRecitationRangeSnapshot({
    ...range,
    startWordId: "",
  }), null);

  const legacy = normalizeQuestionAssignment({
    ...question(range),
    version: 1,
    range,
  });
  assert.ok(legacy);
  assert.equal(legacy.range, undefined);
});

test("page 598 renders only the recorded physical rows while retaining structural rows", () => {
  const range = exactRange({ surah: 97, ayah: 2 }, 10);
  const page = JSON.parse(fs.readFileSync("public/pages/p598.json", "utf8"));
  const lines = linesForEvidencePage(page, range);
  assert.deepEqual(lines.map((line) => line.n), [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]);
  assert.deepEqual(lines.map((line) => line.type).slice(3, 5), ["surah-header", "basmala"]);
  const selected = wordIdsForEvidencePage(page, range);
  assert.ok(selected);
  assert.equal([...selected][0], "97.2.0");
  assert.equal([...selected].at(-1), "98.6.16");
  assert.equal(selected.has("97.1.0"), false);
  assert.equal(selected.has("98.7.0"), false);
  assert.equal(wordIdsForEvidencePage(page, {
    ...range,
    startLine: range.startLine + 1,
  }), null);
  const display = rangeDisplayForPage(page, range);
  assert.ok(display);
  assert.equal(display.lineStates.get(1), "context");
  assert.equal(display.lineStates.get(15), "context");
  assert.ok([...display.lineStates.values()].includes("mixed"));
  assert.deepEqual(display.contextLineRuns, [
    { startLine: 1, endLine: 2 },
    { startLine: 15, endLine: 15 },
  ]);
  assert.equal(rangeDisplayForPage(page, {
    ...range,
    startLine: range.startLine + 1,
  }), null);
  assert.equal(recitationRangeMatchesQuestionIndex(lookup, range), true);
  assert.equal(recitationRangeMatchesQuestionIndex(lookup, {
    ...range,
    startLine: range.startLine + 1,
  }), false);
});

test("context lines collapse into stable shade bands without crossing mixed lines", () => {
  assert.deepEqual(contextRunsForLineStates(new Map([
    [1, "context"],
    [2, "context"],
    [3, "mixed"],
    [4, "question"],
    [5, "context"],
    [7, "context"],
    [6, "context"],
  ])), [
    { startLine: 1, endLine: 2 },
    { startLine: 5, endLine: 7 },
  ]);
});

test("cross-page evidence cuts page 603 and 604 at the exact recorded lines", () => {
  const range = exactRange({ surah: 109, ayah: 1 }, 10);
  const page603 = JSON.parse(fs.readFileSync("public/pages/p603.json", "utf8"));
  const page604 = JSON.parse(fs.readFileSync("public/pages/p604.json", "utf8"));
  assert.deepEqual(
    linesForEvidencePage(page603, range).map((line) => line.n),
    [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
  );
  assert.deepEqual(
    linesForEvidencePage(page604, range).map((line) => line.n),
    [1, 2, 3],
  );
  assert.equal([...wordIdsForEvidencePage(page603, range)][0], "109.1.0");
  assert.equal([...wordIdsForEvidencePage(page604, range)].at(-1), "112.1.4");
});

test("judge-source consensus is explicit and deterministic", () => {
  const range = exactRange({ surah: 97, ayah: 2 }, 10);
  const recorded = question(range);
  const candidate = buildResultCandidates([
    session("jali", "jali", recorded),
    session("khafi", "khafi", structuredClone(recorded)),
  ], ["jali", "khafi"])[0];
  const evidence = buildParticipantQuestionEvidence(candidate, {});
  assert.equal(evidence.status, "ready");
  assert.deepEqual(evidence.range, range);
  assert.equal(evidence.fingerprint, questionEvidenceFingerprint(recorded));
  assert.equal(evidence.selectedSessions.length, 2);

  const missingChoiceCandidate = buildResultCandidates([
    session("jali-a", "jali", recorded),
    session("jali-b", "jali", recorded),
    session("khafi", "khafi", recorded),
  ], ["jali", "khafi"])[0];
  assert.equal(
    buildParticipantQuestionEvidence(missingChoiceCandidate, {}).status,
    "source-missing",
  );
});

test("question conflicts never invent one Quran span or change score finalization", () => {
  const firstRange = exactRange({ surah: 97, ayah: 2 }, 10);
  const otherRange = exactRange({ surah: 109, ayah: 1 }, 10);
  const candidate = buildResultCandidates([
    session("jali", "jali", question(firstRange)),
    session("khafi", "khafi", question(otherRange)),
  ], ["jali", "khafi"])[0];
  const evidence = buildParticipantQuestionEvidence(candidate, {});
  assert.equal(evidence.status, "source-conflict");
  assert.equal(evidence.range, null);

  const final = finalizeParticipantResult(candidate, {});
  assert.ok(final);
  assert.equal(final.total, 80);
  assert.equal(final.questionEvidence, undefined);
});

test("legacy injected ranges and mismatched question context never become exact evidence", () => {
  const range = exactRange({ surah: 97, ayah: 2 }, 10);
  const legacyPrepared = { ...question(range), version: 1 };
  const legacyManual = { ...legacyPrepared, kind: "manual", sourceQuestionId: undefined };
  const exactManual = {
    ...question(range),
    kind: "manual",
    sourceQuestionId: undefined,
  };
  assert.equal(
    buildParticipantQuestionEvidence(
      buildResultCandidates([
        session("jali", "jali", legacyPrepared),
        session("khafi", "khafi", legacyPrepared),
      ], ["jali", "khafi"])[0],
      {},
    ).status,
    "legacy-missing",
  );
  assert.equal(
    buildParticipantQuestionEvidence(
      buildResultCandidates([
        session("jali", "jali", legacyManual),
        session("khafi", "khafi", legacyManual),
      ], ["jali", "khafi"])[0],
      {},
    ).status,
    "manual-missing",
  );
  assert.equal(
    buildParticipantQuestionEvidence(
      buildResultCandidates([
        session("jali", "jali", exactManual),
        session("khafi", "khafi", exactManual),
      ], ["jali", "khafi"])[0],
      {},
    ).status,
    "manual-missing",
  );

  const otherContext = {
    ...question(range),
    divisionId: "division-2",
  };
  const candidate = buildResultCandidates([
    session("jali", "jali", question(range)),
    session("khafi", "khafi", otherContext),
  ], ["jali", "khafi"])[0];
  assert.equal(
    buildParticipantQuestionEvidence(candidate, {}).status,
    "source-conflict",
  );
});

test("import inspection validates the session-started fallback before it becomes evidence", () => {
  const range = exactRange({ surah: 97, ayah: 2 }, 10);
  const recorded = question(range);
  const eventOnly = inspectImportedSessionQuestion({
    events: [{ type: "session_started", question: recorded }],
  }, {
    competitionId: "competition-1",
    competitionVersionId: "version-1",
  });
  assert.equal(eventOnly.ok, true);
  assert.deepEqual(eventOnly.question, normalizeQuestionAssignment(recorded));

  const conflicting = inspectImportedSessionQuestion({
    question: recorded,
    events: [{
      type: "session_started",
      question: question(exactRange({ surah: 109, ayah: 1 }, 10)),
    }],
  }, {
    competitionId: "competition-1",
    competitionVersionId: "version-1",
  });
  assert.deepEqual(conflicting, {
    ok: false,
    reason: "question-conflict",
  });

  assert.deepEqual(
    inspectImportedSessionQuestion({ events: {} }, {}),
    { ok: false, reason: "invalid-events" },
  );
  assert.deepEqual(
    inspectImportedSessionQuestion({ question: recorded }, {
      competitionId: "competition-1",
    }),
    { ok: false, reason: "version-missing" },
  );
});

test("matching ranges with different source provenance are not merged", () => {
  const range = exactRange({ surah: 97, ayah: 2 }, 10);
  const changed = {
    ...range,
    layoutHash: `sha256:${"b".repeat(64)}`,
  };
  const candidate = buildResultCandidates([
    session("jali", "jali", question(range)),
    session("khafi", "khafi", question(changed)),
  ], ["jali", "khafi"])[0];
  assert.equal(
    buildParticipantQuestionEvidence(candidate, {}).status,
    "version-mismatch",
  );

  const firstSession = session("jali-version", "jali", question(range));
  const secondSession = session("khafi-version", "khafi", question(range));
  firstSession.competitionVersionId = "version-1";
  secondSession.competitionVersionId = "version-2";
  assert.equal(
    buildParticipantQuestionEvidence(
      buildResultCandidates([firstSession, secondSession], ["jali", "khafi"])[0],
      {},
    ).status,
    "version-mismatch",
  );
});

test("the active Mushaf contract is captured in every fixture", () => {
  const range = exactRange({ surah: 1, ayah: 1 }, 10);
  assert.equal(range.mushafLayout, MUSHAF_LAYOUT);
  assert.equal(range.sourceVersion, MUSHAF_DATA_VERSION);
  assert.equal(range.questionIndexVersion, QUESTION_INDEX_VERSION);
  assert.equal(range.startPage, 1);
  assert.equal(range.endPage, 2);
});

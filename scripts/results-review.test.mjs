import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  buildParticipantResultPreview,
  buildResultCandidates,
  finalizeParticipantResult,
  hasCompleteFinalizationIdentity,
} from "../src/lib/finalResults.ts";
import {
  buildResultsReviewItems,
  filterResultsReviewItems,
  isCurrentFinalResult,
  paginateResultsReviewItems,
  selectStoredResultsHistory,
  sortResultsReviewItems,
  summarizeResultsReview,
} from "../src/lib/resultsReview.ts";

const categories = ["jali", "khafi", "fasaha"];
const config = {
  jali: { enabled: true, start: 50, step: 2 },
  khafi: { enabled: true, start: 30, step: 1 },
  fasaha: { enabled: true, start: 20, step: 1 },
  "adu-raagu": { enabled: false, start: 0, step: 0.5 },
};
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

function session(
  id,
  assignedCategories,
  options = {},
) {
  const savedAt = options.savedAt ?? 1000;
  return {
    id,
    competitionId: options.competitionId ?? "competition-a",
    competitionVersionId: "version-a",
    isSample: false,
    savedAt,
    importedAt: options.importedAt,
    revision: options.revision ?? 1,
    participant: options.participant ?? participant,
    config,
    total: 0,
    totalMax: 0,
    scoreKind: "judge-section",
    assignment: {
      version: 1,
      panel: {
        version: 1,
        preset: "custom",
        seats: [],
      },
      judgeSeatId: `judge-${id}`,
      judgeLabel: `Judge ${id}`,
      judgeName: "",
      categories: assignedCategories,
      config,
    },
    notes: "",
    mistakes: [],
    impressions: [],
    events: [],
  };
}

function completeHistory(options = {}) {
  return [
    session("jali", ["jali"], options),
    session("khafi", ["khafi"], options),
    session("fasaha", ["fasaha"], options),
  ];
}

function finalizedFrom(history, selected = {}) {
  const candidate = buildResultCandidates(history, categories)[0];
  const result = finalizeParticipantResult(candidate, selected);
  assert.ok(result);
  return { ...result, competitionId: "competition-a", finalizedAt: 2000 };
}

test("identity readiness and preview share finalization's exact score seam", () => {
  assert.equal(hasCompleteFinalizationIdentity(participant), true);
  for (const field of ["number", "name", "ageGroup", "category", "muqarrar"]) {
    assert.equal(
      hasCompleteFinalizationIdentity({ ...participant, [field]: "" }),
      false,
      field,
    );
  }
  const candidate = buildResultCandidates(completeHistory(), categories)[0];
  const preview = buildParticipantResultPreview(candidate, {});
  const final = finalizeParticipantResult(candidate, {});
  assert.ok(preview);
  assert.ok(final);
  assert.deepEqual(preview.byCategory, final.byCategory);
  assert.equal(preview.total, final.total);
  assert.equal(preview.totalMax, final.totalMax);
  const incomplete = buildResultCandidates([session("jali", ["jali"])], categories)[0];
  assert.equal(buildParticipantResultPreview(incomplete, {}), null);
});

test("complete, missing, conflicting, and incomplete candidates classify safely", () => {
  const ready = buildResultsReviewItems(
    completeHistory(),
    [],
    "competition-a",
    categories,
  );
  assert.equal(ready[0].state, "ready");

  const missing = buildResultsReviewItems(
    [session("jali", ["jali"])],
    [],
    "competition-a",
    categories,
  )[0];
  assert.equal(missing.state, "needs-review");
  assert.deepEqual(
    missing.reasons.find((reason) => reason.code === "required-categories-missing")?.categories,
    ["khafi", "fasaha"],
  );

  const conflicting = buildResultsReviewItems(
    [
      session("jali-a", ["jali"]),
      session("jali-b", ["jali"]),
      session("khafi", ["khafi"]),
      session("fasaha", ["fasaha"]),
    ],
    [],
    "competition-a",
    categories,
  )[0];
  assert.equal(conflicting.state, "needs-review");
  assert.deepEqual(
    conflicting.reasons.find((reason) => reason.code === "source-conflict")?.categories,
    ["jali"],
  );

  const incompleteParticipant = { ...participant, number: "", muqarrar: "" };
  const incomplete = buildResultsReviewItems(
    completeHistory({ participant: incompleteParticipant }),
    [],
    "competition-a",
    categories,
  )[0];
  assert.equal(incomplete.state, "needs-review");
  assert.deepEqual(
    incomplete.reasons.find((reason) => reason.code === "participant-details-missing")?.fields,
    ["number", "muqarrar"],
  );
});

test("current final preserves a source choice made among pre-existing alternatives", () => {
  const history = [
    session("jali-a", ["jali"], { savedAt: 100 }),
    session("jali-b", ["jali"], { savedAt: 200 }),
    session("khafi", ["khafi"], { savedAt: 100 }),
    session("fasaha", ["fasaha"], { savedAt: 100 }),
  ];
  const result = finalizedFrom(history, { jali: "jali-a" });
  const candidate = buildResultCandidates(history, categories)[0];
  assert.equal(isCurrentFinalResult(candidate, result), true);
  const item = buildResultsReviewItems(
    history,
    [result],
    "competition-a",
    categories,
  )[0];
  assert.equal(item.state, "finalized");
  assert.deepEqual(item.reasons, []);
});

test("missing, revised, and newer final sources return to review", () => {
  const history = completeHistory({ savedAt: 100 });
  const result = finalizedFrom(history);

  const missing = buildResultsReviewItems(
    history.filter((entry) => entry.id !== "jali"),
    [result],
    "competition-a",
    categories,
  )[0];
  assert.equal(missing.state, "needs-review");
  assert.ok(missing.reasons.some((reason) => reason.code === "final-source-missing"));

  const revised = buildResultsReviewItems(
    history.map((entry) => entry.id === "jali" ? { ...entry, revision: 2 } : entry),
    [result],
    "competition-a",
    categories,
  )[0];
  assert.equal(revised.state, "needs-review");
  assert.ok(
    revised.reasons.some(
      (reason) => reason.code === "final-source-revision-changed",
    ),
  );

  const newer = buildResultsReviewItems(
    [...history, session("jali-new", ["jali"], { savedAt: 3000 })],
    [result],
    "competition-a",
    categories,
  )[0];
  assert.equal(newer.state, "needs-review");
  assert.ok(newer.reasons.some((reason) => reason.code === "newer-source-available"));
});

test("active competition and retained-history scopes stay explicit", () => {
  const current = completeHistory();
  const older = completeHistory({ competitionId: "competition-b" }).map(
    (entry) => ({ ...entry, id: `old-${entry.id}` }),
  );
  assert.equal(
    buildResultsReviewItems(
      [...current, ...older],
      [],
      "competition-a",
      categories,
    ).length,
    1,
  );
  assert.equal(
    selectStoredResultsHistory([...current, ...older], "competition-a", "current").length,
    3,
  );
  assert.equal(
    selectStoredResultsHistory([...current, ...older], "competition-a", "all").length,
    6,
  );
});

test("summaries, filters, and numeric participant ordering agree", () => {
  const participants = [
    { ...participant, id: "p-10", number: "10", name: "Zainab" },
    { ...participant, id: "p-2", number: "2", name: "Mariyam", category: "nubalaa" },
    { ...participant, id: "p-1", number: "1", name: "Aishath" },
  ];
  const history = participants.flatMap((entry) =>
    completeHistory({ participant: entry }).map((saved) => ({
      ...saved,
      id: `${entry.id}-${saved.id}`,
    })),
  );
  const items = buildResultsReviewItems(history, [], "competition-a", categories);
  const summary = summarizeResultsReview(items);
  assert.deepEqual(summary, {
    needsReview: 0,
    ready: 3,
    finalized: 0,
    total: 3,
    unresolved: 3,
  });
  assert.deepEqual(
    sortResultsReviewItems(items).map((item) => item.candidate.participant.number),
    ["1", "2", "10"],
  );
  assert.deepEqual(
    filterResultsReviewItems(items, {
      query: "  MARIYAM  ",
      state: "ready",
      ageGroup: "Under 14",
      participantCategory: "nubalaa",
    }).map((item) => item.candidate.participant.id),
    ["p-2"],
  );
});

test("review pagination uses the 50-item boundary and clamps pages", () => {
  const items = Array.from({ length: 51 }, (_, index) => ({
    candidate: {
      participant: { ...participant, id: `p-${index}`, number: String(index + 1) },
    },
  }));
  const first = paginateResultsReviewItems(items, 1);
  const second = paginateResultsReviewItems(items, 2);
  const clamped = paginateResultsReviewItems(items.slice(0, 5), 2);
  assert.equal(first.items.length, 50);
  assert.equal(first.pageCount, 2);
  assert.equal(second.items.length, 1);
  assert.equal(clamped.page, 1);
  assert.equal(clamped.items.length, 5);
});

test("Results UI retains the reviewed navigation, tabs, audit, and export contracts", () => {
  const header = readFileSync(
    new URL("../src/components/Header.tsx", import.meta.url),
    "utf8",
  );
  const records = readFileSync(
    new URL("../src/components/RecordsView.tsx", import.meta.url),
    "utf8",
  );
  const finalPanel = readFileSync(
    new URL("../src/components/FinalResultsPanel.tsx", import.meta.url),
    "utf8",
  );
  const styles = readFileSync(
    new URL("../src/styles/global.css", import.meta.url),
    "utf8",
  );
  assert.match(header, /name="fileCheck"/);
  assert.match(header, /> Results /);
  assert.match(header, /Back to Judging/);
  assert.doesNotMatch(header, /name="chart"[^>]*\/> Records/);
  assert.match(records, /<h1>Results<\/h1>/);
  assert.doesNotMatch(records, /Results &amp; review|results-eyebrow|sample-records-notice|Test mode/);
  assert.match(records, /lifecycleLabel\(state\.competition\.status\)/);
  assert.match(records, /role="tablist"/);
  assert.match(records, /role="tabpanel"/);
  assert.match(records, /Filter participant results by status/);
  assert.match(records, /results-status-card is-needs-review/);
  assert.match(records, /results-filter-disclosure/);
  assert.match(records, /ArrowLeft/);
  assert.match(records, /Current competition/);
  assert.match(records, /All stored competitions/);
  assert.match(records, /Judge results/);
  assert.match(records, /Reopen to correct/);
  assert.match(records, /different competition or edition/);
  assert.match(records, /uses different scoring rules/);
  assert.doesNotMatch(records, />Rankings<|>Exports</);
  assert.match(finalPanel, /window\.prompt/);
  assert.match(finalPanel, /UPSERT_FINAL_RESULT/);
  assert.match(finalPanel, /aria-expanded=\{isExpanded\}/);
  assert.match(finalPanel, /final-source-block cat-\$\{categoryId\}/);
  assert.match(finalPanel, /Finalized results \(\.xlsx\)/);
  assert.match(styles, /\.results-workspace \.cat-row-top/);
  assert.match(styles, /\.results-workspace \.cat-bar-fill/);
  assert.match(styles, /\.results-status-card\[aria-pressed="true"\]/);
  assert.match(styles, /\.results-workspace \.metric-cards\.results-metrics\s*\{[^}]*display:\s*grid[^}]*gap:\s*0/s);
  assert.match(styles, /\.results-workspace \.final-source-value strong\s*\{[^}]*background:\s*transparent/s);
  assert.doesNotMatch(records, /dispatch\(\{ type: "(?:DELETE_SESSION|CLEAR_HISTORY)"/);
});

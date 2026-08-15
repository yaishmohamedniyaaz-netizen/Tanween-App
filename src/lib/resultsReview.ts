import type {
  CategoryId,
  FinalizedResult,
  Participant,
  ParticipantCategory,
  SavedSession,
} from "../types";
import {
  buildResultCandidates,
  hasCompleteFinalizationIdentity,
  type ParticipantResultCandidate,
} from "./finalResults.ts";

export type ResultsReviewState = "needs-review" | "ready" | "finalized";
export type StoredResultsScope = "current" | "all";
export type FinalizationIdentityField =
  | "number"
  | "name"
  | "ageGroup"
  | "category"
  | "muqarrar";

export type ResultsReviewReason =
  | { code: "participant-details-missing"; fields: FinalizationIdentityField[] }
  | { code: "required-categories-missing"; categories: CategoryId[] }
  | { code: "source-conflict"; categories: CategoryId[] }
  | { code: "final-source-missing"; categories: CategoryId[] }
  | { code: "final-source-revision-changed"; categories: CategoryId[] }
  | { code: "newer-source-available"; categories: CategoryId[] };

export interface ResultsReviewItem {
  candidate: ParticipantResultCandidate;
  activeFinal?: FinalizedResult;
  finalIsCurrent: boolean;
  state: ResultsReviewState;
  reasons: ResultsReviewReason[];
  lastChangedAt: number;
}

export interface ResultsReviewSummary {
  needsReview: number;
  ready: number;
  finalized: number;
  total: number;
  unresolved: number;
}

export interface ResultsReviewFilters {
  query: string;
  state: "all" | ResultsReviewState;
  ageGroup: string;
  participantCategory: ParticipantCategory;
}

export interface ResultsReviewPage {
  items: ResultsReviewItem[];
  page: number;
  pageCount: number;
  total: number;
}

export const RESULTS_REVIEW_PAGE_SIZE = 50;

const identityFields: FinalizationIdentityField[] = [
  "number",
  "name",
  "ageGroup",
  "category",
  "muqarrar",
];

function missingIdentityFields(
  participant: Participant,
): FinalizationIdentityField[] {
  return identityFields.filter((field) => !String(participant[field] ?? "").trim());
}

function categoriesForReason(
  candidate: ParticipantResultCandidate,
  result: FinalizedResult,
  predicate: (
    category: CategoryId,
    finalized: FinalizedResult["byCategory"][CategoryId],
  ) => boolean,
): CategoryId[] {
  return candidate.categories.filter((category) =>
    predicate(category, result.byCategory[category]),
  );
}

export function isCurrentFinalResult(
  candidate: ParticipantResultCandidate,
  result: FinalizedResult,
): boolean {
  return candidate.categories.every((category) => {
    const finalized = result.byCategory[category];
    if (!finalized) return false;
    const source = candidate.byCategory[category].find(
      (session) => session.id === finalized.sessionId,
    );
    const hasNewAlternative = candidate.byCategory[category].some(
      (session) =>
        session.id !== finalized.sessionId &&
        (session.importedAt ?? session.savedAt) > result.finalizedAt,
    );
    return Boolean(
      source &&
      (source.revision ?? 1) === finalized.sessionRevision &&
      !hasNewAlternative,
    );
  });
}

function staleFinalReasons(
  candidate: ParticipantResultCandidate,
  result: FinalizedResult,
): ResultsReviewReason[] {
  const missingSources = categoriesForReason(
    candidate,
    result,
    (category, finalized) =>
      !finalized ||
      !candidate.byCategory[category].some(
        (session) => session.id === finalized.sessionId,
      ),
  );
  const changedRevisions = categoriesForReason(
    candidate,
    result,
    (category, finalized) => {
      if (!finalized) return false;
      const source = candidate.byCategory[category].find(
        (session) => session.id === finalized.sessionId,
      );
      return Boolean(
        source && (source.revision ?? 1) !== finalized.sessionRevision,
      );
    },
  );
  const newerSources = categoriesForReason(
    candidate,
    result,
    (category, finalized) =>
      Boolean(
        finalized &&
        candidate.byCategory[category].some(
          (session) =>
            session.id !== finalized.sessionId &&
            (session.importedAt ?? session.savedAt) > result.finalizedAt,
        ),
      ),
  );
  const reasons: ResultsReviewReason[] = [];
  if (missingSources.length) {
    reasons.push({ code: "final-source-missing", categories: missingSources });
  }
  if (changedRevisions.length) {
    reasons.push({
      code: "final-source-revision-changed",
      categories: changedRevisions,
    });
  }
  if (newerSources.length) {
    reasons.push({ code: "newer-source-available", categories: newerSources });
  }
  return reasons;
}

export function buildResultsReviewItems(
  history: SavedSession[],
  finalizedResults: FinalizedResult[],
  competitionId: string,
  categories: CategoryId[],
): ResultsReviewItem[] {
  const competitionHistory = history.filter(
    (session) => session.competitionId === competitionId,
  );
  const candidates = buildResultCandidates(competitionHistory, categories);
  const activeFinals = [...finalizedResults]
    .filter(
      (result) =>
        result.competitionId === competitionId && !result.supersededAt,
    )
    .sort((left, right) => right.finalizedAt - left.finalizedAt);
  const activeByParticipant = new Map<string, FinalizedResult>();
  activeFinals.forEach((result) => {
    if (!activeByParticipant.has(result.participant.id)) {
      activeByParticipant.set(result.participant.id, result);
    }
  });

  return candidates.map((candidate) => {
    const activeFinal = activeByParticipant.get(candidate.participant.id);
    const finalIsCurrent = Boolean(
      activeFinal && isCurrentFinalResult(candidate, activeFinal),
    );
    const detailsMissing = missingIdentityFields(candidate.participant);
    const reasons: ResultsReviewReason[] = [];

    if (!finalIsCurrent) {
      if (
        !hasCompleteFinalizationIdentity(candidate.participant) &&
        detailsMissing.length
      ) {
        reasons.push({
          code: "participant-details-missing",
          fields: detailsMissing,
        });
      }
      if (candidate.missing.length) {
        reasons.push({
          code: "required-categories-missing",
          categories: candidate.missing,
        });
      }
      if (candidate.conflicts.length) {
        reasons.push({
          code: "source-conflict",
          categories: candidate.conflicts,
        });
      }
      if (activeFinal) reasons.push(...staleFinalReasons(candidate, activeFinal));
    }

    const state: ResultsReviewState = finalIsCurrent
      ? "finalized"
      : reasons.length
        ? "needs-review"
        : "ready";
    const lastChangedAt = Math.max(
      activeFinal?.finalizedAt ?? 0,
      ...candidate.sessions.map((session) =>
        Math.max(session.savedAt, session.importedAt ?? 0),
      ),
    );

    return {
      candidate,
      activeFinal,
      finalIsCurrent,
      state,
      reasons,
      lastChangedAt,
    };
  });
}

export function selectStoredResultsHistory(
  history: SavedSession[],
  competitionId: string,
  scope: StoredResultsScope,
): SavedSession[] {
  return scope === "all"
    ? history
    : history.filter((session) => session.competitionId === competitionId);
}

export function summarizeResultsReview(
  items: ResultsReviewItem[],
): ResultsReviewSummary {
  const needsReview = items.filter((item) => item.state === "needs-review").length;
  const ready = items.filter((item) => item.state === "ready").length;
  const finalized = items.filter((item) => item.state === "finalized").length;
  return {
    needsReview,
    ready,
    finalized,
    total: items.length,
    unresolved: needsReview + ready,
  };
}

function normalizedSearch(value: string): string {
  return value.trim().toLocaleLowerCase().replace(/\s+/g, " ");
}

export function filterResultsReviewItems(
  items: ResultsReviewItem[],
  filters: ResultsReviewFilters,
): ResultsReviewItem[] {
  const query = normalizedSearch(filters.query);
  return items.filter((item) => {
    const participant = item.candidate.participant;
    const matchesQuery =
      !query ||
      normalizedSearch(participant.name).includes(query) ||
      normalizedSearch(participant.number).includes(query);
    return (
      matchesQuery &&
      (filters.state === "all" || item.state === filters.state) &&
      (!filters.ageGroup || participant.ageGroup.trim() === filters.ageGroup) &&
      (!filters.participantCategory ||
        participant.category === filters.participantCategory)
    );
  });
}

const stateOrder: Record<ResultsReviewState, number> = {
  "needs-review": 0,
  ready: 1,
  finalized: 2,
};

export function sortResultsReviewItems(
  items: ResultsReviewItem[],
): ResultsReviewItem[] {
  return [...items].sort((left, right) => {
    const stateDifference = stateOrder[left.state] - stateOrder[right.state];
    if (stateDifference) return stateDifference;
    const numberDifference = left.candidate.participant.number.localeCompare(
      right.candidate.participant.number,
      undefined,
      { numeric: true, sensitivity: "base" },
    );
    if (numberDifference) return numberDifference;
    const nameDifference = left.candidate.participant.name.localeCompare(
      right.candidate.participant.name,
      undefined,
      { sensitivity: "base" },
    );
    return nameDifference || left.candidate.participant.id.localeCompare(
      right.candidate.participant.id,
    );
  });
}

export function paginateResultsReviewItems(
  items: ResultsReviewItem[],
  requestedPage: number,
  pageSize = RESULTS_REVIEW_PAGE_SIZE,
): ResultsReviewPage {
  const normalizedSize = Math.max(1, Math.floor(pageSize));
  const pageCount = Math.max(1, Math.ceil(items.length / normalizedSize));
  const page = Math.min(pageCount, Math.max(1, Math.floor(requestedPage) || 1));
  const start = (page - 1) * normalizedSize;
  return {
    items: items.slice(start, start + normalizedSize),
    page,
    pageCount,
    total: items.length,
  };
}

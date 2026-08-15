import { DEFAULT_CONFIG, enabledCategories } from "../config.ts";
import type {
  CategoryId,
  FinalizedCategoryScore,
  FinalizedResult,
  Participant,
  SavedSession,
} from "../types";
import { judgeDisplayName } from "./judgeAssignments.ts";
import { computeCategoryScores } from "./scoring.ts";

export interface ParticipantResultCandidate {
  participant: Participant;
  sessions: SavedSession[];
  byCategory: Record<CategoryId, SavedSession[]>;
  /** The criteria this competition judges, in reading order. */
  categories: CategoryId[];
  missing: CategoryId[];
  conflicts: CategoryId[];
}

export interface ParticipantResultPreview {
  byCategory: Partial<Record<CategoryId, FinalizedCategoryScore>>;
  total: number;
  totalMax: number;
}

const round2 = (value: number) => Math.round(value * 100) / 100;

export function hasCompleteFinalizationIdentity(
  participant: Participant,
): boolean {
  return Boolean(
    participant.number.trim() &&
    participant.name.trim() &&
    participant.ageGroup.trim() &&
    participant.category &&
    participant.muqarrar,
  );
}

function stableHash(value: string): string {
  let result = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    result ^= value.charCodeAt(index);
    result = Math.imul(result, 0x01000193);
  }
  return (result >>> 0).toString(36);
}

export function buildResultCandidates(
  history: SavedSession[],
  categories: CategoryId[] = enabledCategories(DEFAULT_CONFIG),
): ParticipantResultCandidate[] {
  const categoryIds = categories;
  const groups = new Map<string, SavedSession[]>();
  for (const session of history) {
    const participantId = session.participant.id;
    const group = groups.get(participantId) ?? [];
    group.push(session);
    groups.set(participantId, group);
  }

  return [...groups.values()]
    .map((sessions) => {
      const byCategory = Object.fromEntries(
        categoryIds.map((category) => [
          category,
          sessions
            .filter((session) =>
              (session.assignment?.categories ?? categoryIds).includes(category),
            )
            .sort((left, right) => right.savedAt - left.savedAt),
        ]),
      ) as Record<CategoryId, SavedSession[]>;
      return {
        participant: sessions[0].participant,
        sessions,
        byCategory,
        categories: categoryIds,
        missing: categoryIds.filter((category) => byCategory[category].length === 0),
        conflicts: categoryIds.filter((category) => byCategory[category].length > 1),
      };
    })
    .sort((left, right) =>
      left.participant.number.localeCompare(right.participant.number, undefined, {
        numeric: true,
      }),
    );
}

export function finalizeParticipantResult(
  candidate: ParticipantResultCandidate,
  selectedSessionIds: Partial<Record<CategoryId, string>>,
  previous?: FinalizedResult,
  revisionReason?: string,
): FinalizedResult | null {
  if (!hasCompleteFinalizationIdentity(candidate.participant)) return null;
  const preview = buildParticipantResultPreview(candidate, selectedSessionIds);
  if (!preview) return null;
  const { byCategory, total, totalMax } = preview;
  const revision = (previous?.revision ?? 0) + 1;
  const normalizedReason = revisionReason?.trim() || undefined;
  const manifestSource = JSON.stringify({
    participantId: candidate.participant.id,
    revision,
    revisionReason: normalizedReason,
    byCategory,
    total,
    totalMax,
  });

  return {
    id: previous?.id ?? `final-${candidate.participant.id}`,
    isSample: candidate.sessions.every((session) => Boolean(session.isSample)),
    participant: { ...candidate.participant },
    revision,
    finalizedAt: Date.now(),
    revisionReason: normalizedReason,
    byCategory,
    total,
    totalMax,
    manifest: `fnv1a-${stableHash(manifestSource)}`,
  };
}

export function buildParticipantResultPreview(
  candidate: ParticipantResultCandidate,
  selectedSessionIds: Partial<Record<CategoryId, string>>,
): ParticipantResultPreview | null {
  const categoryIds = candidate.categories;
  const byCategory: Partial<Record<CategoryId, FinalizedCategoryScore>> = {};
  for (const category of categoryIds) {
    const options = candidate.byCategory[category];
    const selectedId = selectedSessionIds[category] ??
      (options.length === 1 ? options[0].id : "");
    const session = options.find((option) => option.id === selectedId);
    if (!session) return null;
    const score = computeCategoryScores(
      session.config,
      session.mistakes,
      session.impressions ?? [],
    ).byCategory[category];
    byCategory[category] = {
      category,
      score: score.score,
      max: score.start,
      sessionId: session.id,
      sessionRevision: session.revision ?? 1,
      judgeSeatId: session.assignment?.judgeSeatId ?? "judge-1",
      judgeName: session.assignment
        ? judgeDisplayName(session.assignment)
        : "Judge 1",
    };
  }

  const total = round2(
    categoryIds.reduce((sum, category) => sum + (byCategory[category]?.score ?? 0), 0),
  );
  const totalMax = round2(
    categoryIds.reduce((sum, category) => sum + (byCategory[category]?.max ?? 0), 0),
  );
  return { byCategory, total, totalMax };
}

export interface PlacedResult extends FinalizedResult {
  place: number;
  rankGroup: string;
}

export function placeFinalizedResults(results: FinalizedResult[]): PlacedResult[] {
  const groups = new Map<string, FinalizedResult[]>();
  for (const result of results) {
    const rankGroup = `${result.participant.ageGroup}\u241f${result.participant.category}`;
    const group = groups.get(rankGroup) ?? [];
    group.push(result);
    groups.set(rankGroup, group);
  }

  const placed: PlacedResult[] = [];
  for (const [rankGroup, group] of groups) {
    const sorted = [...group].sort(
      (left, right) =>
        right.total / Math.max(1, right.totalMax) -
          left.total / Math.max(1, left.totalMax) ||
        left.participant.number.localeCompare(right.participant.number, undefined, {
          numeric: true,
        }),
    );
    let previousRatio: number | null = null;
    let place = 0;
    sorted.forEach((result, index) => {
      const ratio = result.total / Math.max(1, result.totalMax);
      if (previousRatio === null || Math.abs(ratio - previousRatio) > 1e-10) {
        place = index + 1;
        previousRatio = ratio;
      }
      placed.push({ ...result, place, rankGroup });
    });
  }
  return placed.sort((left, right) =>
    left.rankGroup.localeCompare(right.rankGroup) || left.place - right.place,
  );
}

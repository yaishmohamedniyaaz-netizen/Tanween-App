import {
  ALL_CATEGORIES,
  enabledCategories,
  isImpressionCategory,
} from "../config.ts";
import type {
  CategoryId,
  ImpressionMark,
  JudgingState,
  Mistake,
  ScoreConfig,
} from "../types";

export interface CategoryScore {
  start: number;
  deducted: number;
  score: number;
  /** Pinpointed mistakes, or 1 once an impression criterion has been marked. */
  count: number;
  /** false while an impression criterion is still resting on full marks. */
  marked: boolean;
}

export type Scores = Record<CategoryId, CategoryScore>;

const round2 = (n: number) => Math.round(n * 100) / 100;

/** The awarded marks for one impression criterion. An unmarked criterion rests
 *  on full marks, the same way a judge starts from the full allocation. */
export function impressionScore(
  config: ScoreConfig,
  impressions: ImpressionMark[],
  category: CategoryId,
): { awarded: number; marked: boolean; note: string } {
  const start = config[category].start;
  const mark = impressions.find((item) => item.category === category);
  if (!mark || !mark.set) {
    return { awarded: start, marked: false, note: mark?.note ?? "" };
  }
  return {
    awarded: round2(Math.min(start, Math.max(0, mark.awarded))),
    marked: true,
    note: mark.note,
  };
}

export function computeCategoryScores(
  config: ScoreConfig,
  mistakes: Mistake[],
  impressions: ImpressionMark[] = [],
): {
  byCategory: Scores;
  total: number;
  totalMax: number;
} {
  const byCategory = {} as Scores;
  for (const id of ALL_CATEGORIES) {
    const { start } = config[id];
    if (isImpressionCategory(id)) {
      const { awarded, marked } = impressionScore(config, impressions, id);
      byCategory[id] = {
        start,
        deducted: round2(start - awarded),
        score: awarded,
        count: marked ? 1 : 0,
        marked,
      };
      continue;
    }
    const related = mistakes.filter((m) => m.category === id);
    const deducted = round2(related.reduce((sum, m) => sum + m.amount, 0));
    byCategory[id] = {
      start,
      deducted,
      score: round2(Math.max(0, start - deducted)),
      count: related.length,
      marked: related.length > 0,
    };
  }
  const ids = enabledCategories(config);
  const total = round2(ids.reduce((s, id) => s + byCategory[id].score, 0));
  const totalMax = round2(ids.reduce((s, id) => s + byCategory[id].start, 0));
  return { byCategory, total, totalMax };
}

export function computeAssignedScores(
  config: ScoreConfig,
  mistakes: Mistake[],
  impressions: ImpressionMark[],
  categories: CategoryId[],
) {
  const full = computeCategoryScores(config, mistakes, impressions);
  const allowed = new Set(categories);
  const ids = enabledCategories(config).filter((id) => allowed.has(id));
  const total = round2(
    ids.reduce((sum, category) => sum + full.byCategory[category].score, 0),
  );
  const totalMax = round2(
    ids.reduce((sum, category) => sum + full.byCategory[category].start, 0),
  );
  return { ...full, total, totalMax };
}

export function computeScores(state: JudgingState) {
  const config = state.activeAssignment?.config ?? state.config;
  const categories =
    state.activeAssignment?.categories ??
    state.panel.seats.find((seat) => seat.id === state.deviceJudgeId)?.categories ??
    enabledCategories(config);
  return computeAssignedScores(
    config,
    state.mistakes,
    state.impressions,
    categories,
  );
}

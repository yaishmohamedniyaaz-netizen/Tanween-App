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
  /** false until an impression criterion has been explicitly committed. */
  marked: boolean;
}

export type Scores = Record<CategoryId, CategoryScore>;

export type UnmarkedImpressionMode = "legacy-full" | "entry-zero";

const round2 = (n: number) => Math.round(n * 100) / 100;

/** The awarded marks for one impression criterion. Saved-session callers keep
 *  the historical full-mark fallback; live judging opts into explicit entry. */
export function impressionScore(
  config: ScoreConfig,
  impressions: ImpressionMark[],
  category: CategoryId,
  unmarkedMode: UnmarkedImpressionMode = "legacy-full",
): { awarded: number; marked: boolean; note: string } {
  const start = config[category].start;
  const mark = impressions.find((item) => item.category === category);
  if (!mark || !mark.set) {
    return {
      awarded: unmarkedMode === "entry-zero" ? 0 : start,
      marked: false,
      note: mark?.note ?? "",
    };
  }
  return {
    awarded: round2(Math.min(start, Math.max(0, mark.awarded))),
    marked: true,
    note: mark.note,
  };
}

/** Required whole-recitation marks that the current judge has not committed. */
export function missingRequiredImpressionCategories(
  config: ScoreConfig,
  impressions: ImpressionMark[],
  assignedCategories: CategoryId[],
): CategoryId[] {
  const assigned = new Set(assignedCategories);
  return ALL_CATEGORIES.filter(
    (category) =>
      isImpressionCategory(category) &&
      assigned.has(category) &&
      config[category].enabled &&
      !impressions.some((mark) => mark.category === category && mark.set),
  );
}

/** Every mark a judge may award for a criterion, from full marks down to zero. */
export function awardableMarks(max: number, step: number): number[] {
  const safeStep = step > 0 ? step : 1;
  const marks: number[] = [];
  for (let value = max; value > -0.0001; value -= safeStep) {
    marks.push(round2(Math.max(0, value)));
  }
  return marks;
}

export function computeCategoryScores(
  config: ScoreConfig,
  mistakes: Mistake[],
  impressions: ImpressionMark[] = [],
  unmarkedMode: UnmarkedImpressionMode = "legacy-full",
): {
  byCategory: Scores;
  total: number;
  totalMax: number;
} {
  const byCategory = {} as Scores;
  for (const id of ALL_CATEGORIES) {
    const { start } = config[id];
    if (isImpressionCategory(id)) {
      const { awarded, marked } = impressionScore(
        config,
        impressions,
        id,
        unmarkedMode,
      );
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
  unmarkedMode: UnmarkedImpressionMode = "legacy-full",
) {
  const full = computeCategoryScores(
    config,
    mistakes,
    impressions,
    unmarkedMode,
  );
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
    "entry-zero",
  );
}

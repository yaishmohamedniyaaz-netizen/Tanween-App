import type {
  CategoryId,
  JudgingState,
  Mistake,
  ScoreConfig,
} from "../types";

export interface CategoryScore {
  start: number;
  deducted: number;
  score: number;
  count: number;
}

export type Scores = Record<CategoryId, CategoryScore>;

const round2 = (n: number) => Math.round(n * 100) / 100;

export function computeMistakeScores(
  config: ScoreConfig,
  mistakes: Mistake[],
): {
  byCategory: Scores;
  total: number;
  totalMax: number;
} {
  const ids: CategoryId[] = ["jali", "khafi", "fasaha"];
  const byCategory = {} as Scores;
  for (const id of ids) {
    const { start } = config[id];
    const related = mistakes.filter((m) => m.category === id);
    const deducted = round2(related.reduce((sum, m) => sum + m.amount, 0));
    byCategory[id] = {
      start,
      deducted,
      score: round2(Math.max(0, start - deducted)),
      count: related.length,
    };
  }
  const total = round2(ids.reduce((s, id) => s + byCategory[id].score, 0));
  const totalMax = round2(ids.reduce((s, id) => s + byCategory[id].start, 0));
  return { byCategory, total, totalMax };
}

export function computeAssignedMistakeScores(
  config: ScoreConfig,
  mistakes: Mistake[],
  categories: CategoryId[],
) {
  const full = computeMistakeScores(config, mistakes);
  const allowed = new Set(categories);
  const ids: CategoryId[] = ["jali", "khafi", "fasaha"];
  const total = round2(
    ids.reduce(
      (sum, category) =>
        allowed.has(category) ? sum + full.byCategory[category].score : sum,
      0,
    ),
  );
  const totalMax = round2(
    ids.reduce(
      (sum, category) =>
        allowed.has(category) ? sum + full.byCategory[category].start : sum,
      0,
    ),
  );
  return { ...full, total, totalMax };
}

export function computeScores(state: JudgingState) {
  const categories =
    state.activeAssignment?.categories ??
    state.panel.seats.find((seat) => seat.id === state.deviceJudgeId)?.categories ??
    ["jali", "khafi", "fasaha"];
  const config = state.activeAssignment?.config ?? state.config;
  return computeAssignedMistakeScores(config, state.mistakes, categories);
}

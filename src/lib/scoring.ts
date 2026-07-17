import type { CategoryId, JudgingState } from "../types";

export interface CategoryScore {
  start: number;
  deducted: number;
  score: number;
  count: number;
}

export type Scores = Record<CategoryId, CategoryScore>;

const round2 = (n: number) => Math.round(n * 100) / 100;

export function computeScores(state: JudgingState): {
  byCategory: Scores;
  total: number;
  totalMax: number;
} {
  const ids: CategoryId[] = ["jali", "khafi", "fasaha"];
  const byCategory = {} as Scores;
  for (const id of ids) {
    const { start } = state.config[id];
    const related = state.mistakes.filter((m) => m.category === id);
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

import type { CategoryId, Mistake } from "../types.ts";

export interface FindingCount { category: CategoryId; count: number }
export interface MarkerRect { x: number; y: number; w: number; h: number }

const ORDER: CategoryId[] = ["jali", "khafi", "fasaha"];

/** Match the editable target scope. Count evidence IDs, never deductions. */
export function wordFindingCounts(
  mistakes: readonly Pick<Mistake, "id" | "category" | "judgeSeatId">[],
  judgeSeatId: string | undefined,
  allowedCategories: readonly CategoryId[],
): FindingCount[] {
  const seen = new Set<string>();
  const counts = new Map<CategoryId, number>();
  for (const mistake of mistakes) {
    if ((mistake.judgeSeatId ?? judgeSeatId) !== judgeSeatId ||
        !allowedCategories.includes(mistake.category) ||
        !ORDER.includes(mistake.category) || seen.has(mistake.id)) continue;
    seen.add(mistake.id);
    counts.set(mistake.category, (counts.get(mistake.category) ?? 0) + 1);
  }
  return ORDER.flatMap(category => {
    const count = counts.get(category) ?? 0;
    return count ? [{ category, count }] : [];
  });
}

/** A fixed-size circle attached to the word corner, independent of word width. */
export function wordTotalCircle(word: MarkerRect, total: number): MarkerRect | null {
  if (!Number.isFinite(total) || total < 2) return null;
  const size = Math.max(12, String(total).length * 4 + 6);
  return { x: word.x + word.w - size * 0.4, y: word.y - size * 0.75, w: size, h: size };
}

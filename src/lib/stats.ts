import { PINPOINT_CATEGORIES } from "../config.ts";
import type { CategoryId, SavedSession } from "../types";

export interface RecordsStats {
  sessions: number;
  avgScore: number;
  avgPercent: number;
  totalMistakes: number;
  byCategory: Record<CategoryId, { count: number; deducted: number }>;
  topLetters: { glyph: string; count: number }[];
  topLocations: {
    tid: string;
    glyph: string;
    label: string;
    count: number;
    topCategory: CategoryId;
  }[];
  ageGroups: string[];
}

const round1 = (n: number) => Math.round(n * 10) / 10;
/** The accountability view counts pinpointed mistakes; whole-recitation
 *  criteria such as Adu & Raagu have no letter-level evidence to aggregate. */
const CATS: CategoryId[] = PINPOINT_CATEGORIES;

/** Aggregate the local session history — the accountability layer's core view:
 *  which mistakes repeat, across which islands/classes. */
export function computeRecords(
  history: SavedSession[],
  ageGroupFilter: string | null,
): RecordsStats {
  const ageGroups = Array.from(
    new Set(
      history.map((s) => s.participant.ageGroup?.trim()).filter(Boolean) as string[],
    ),
  ).sort();

  const filtered = ageGroupFilter
    ? history.filter(
        (s) => (s.participant.ageGroup?.trim() || "") === ageGroupFilter,
      )
    : history;

  const byCategory = Object.fromEntries(
    CATS.map((c) => [c, { count: 0, deducted: 0 }]),
  ) as RecordsStats["byCategory"];
  const letterMap = new Map<string, number>();
  const locMap = new Map<
    string,
    { glyph: string; label: string; count: number; cats: Record<string, number> }
  >();
  let totalMistakes = 0;
  let scoreSum = 0;
  let pctSum = 0;

  for (const s of filtered) {
    scoreSum += s.total;
    pctSum += s.totalMax > 0 ? (s.total / s.totalMax) * 100 : 0;
    for (const m of s.mistakes) {
      totalMistakes += 1;
      byCategory[m.category].count += 1;
      byCategory[m.category].deducted += m.amount;
      letterMap.set(m.glyph, (letterMap.get(m.glyph) || 0) + 1);
      const loc = locMap.get(m.tid) || {
        glyph: m.glyph,
        label: m.label,
        count: 0,
        cats: {},
      };
      loc.count += 1;
      loc.cats[m.category] = (loc.cats[m.category] || 0) + 1;
      locMap.set(m.tid, loc);
    }
  }
  for (const c of CATS) byCategory[c].deducted = round1(byCategory[c].deducted);

  const topLetters = [...letterMap.entries()]
    .map(([glyph, count]) => ({ glyph, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const topLocations = [...locMap.entries()]
    .map(([tid, v]) => ({
      tid,
      glyph: v.glyph,
      label: v.label,
      count: v.count,
      topCategory: (Object.entries(v.cats).sort((a, b) => b[1] - a[1])[0]?.[0] ||
        "jali") as CategoryId,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  return {
    sessions: filtered.length,
    avgScore: filtered.length ? round1(scoreSum / filtered.length) : 0,
    avgPercent: filtered.length ? Math.round(pctSum / filtered.length) : 0,
    totalMistakes,
    byCategory,
    topLetters,
    topLocations,
    ageGroups,
  };
}

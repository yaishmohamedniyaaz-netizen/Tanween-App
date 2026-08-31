import { CATEGORY_BY_ID, isImpressionCategory } from "../config.ts";
import type { CategoryId, JudgingEvent, Mistake } from "../types";
import type { Scores } from "./scoring";

export interface MobileCriterionChip {
  category: CategoryId;
  label: string;
  value: string;
}

export function mobileJudgeDeckEnabled(search: string): boolean {
  return new URLSearchParams(search).get("mobileJudgeDeck") !== "0";
}

export function mistakeCountLabel(count: number): string {
  return `${count} ${count === 1 ? "mistake" : "mistakes"}`;
}

export function formatRecitationElapsed(milliseconds: number): string {
  const seconds = Math.max(0, Math.floor(milliseconds / 1000));
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(seconds % 60).padStart(2, "0")}`;
}

export function buildMobileCriterionChips(
  categories: readonly CategoryId[],
  scores: Scores,
  missingImpressions: readonly CategoryId[],
): MobileCriterionChip[] {
  const missing = new Set(missingImpressions);
  return categories.map((category) => {
    const score = scores[category];
    const deducted = missing.has(category) ? 0 : score.deducted;
    return {
      category,
      label: CATEGORY_BY_ID[category].label,
      value: isImpressionCategory(category)
        ? `${missing.has(category) ? "—" : score.score} / ${score.start}`
        : deducted === 0 ? "—" : `−${deducted}`,
    };
  });
}

export function latestMobileMistakeAction(
  events: readonly JudgingEvent[],
  mistakes: readonly Mistake[],
): { mistake: Mistake; at: number } | null {
  const latest = [...events].reverse().find((event) => event.type !== "session_started");
  if (!latest) return null;

  if (latest.type === "mistake_added" || latest.type === "mistake_restored") {
    const mistake = mistakes.find((item) => item.id === latest.mistake.id);
    return mistake ? { mistake, at: latest.at } : null;
  }
  if (latest.type === "mistake_recategorized") {
    const mistake = mistakes.find((item) => item.id === latest.mistakeId);
    return mistake ? { mistake, at: latest.at } : null;
  }
  return null;
}

export function sessionStartedAt(events: readonly JudgingEvent[]): number | null {
  return events.find((event) => event.type === "session_started")?.at ?? null;
}

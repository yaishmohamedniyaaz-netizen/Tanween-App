import { CATEGORY_BY_ID } from "../config.ts";
import type { CategoryId } from "../types.ts";
import type { CompetitionResultRow } from "./competitionResults.ts";

/** Status words on the results list. Colour is kept for the two states that need a person: Check needed and Official. */
export const RESULT_STATUS_WORDS = {
  ready: "Ready",
  check: "Check needed",
  official: "Official",
  awaiting: "Awaiting marks",
  partial: "Awaiting",
  absent: "Absent",
} as const;
export type ResultStatus = keyof typeof RESULT_STATUS_WORDS;

const isAwaitingReason = (reason: string) => reason.startsWith("Awaiting ") || reason.endsWith("mark has not been entered");

/** A row needs a person when a reason other than "still waiting for marks" applies. */
export const requiresCheck = (row: CompetitionResultRow) => row.needsAttention && row.reasons.some(reason => !isAwaitingReason(reason));

/** One status per row, plus an optional second line: the reason to check, or the criteria still awaited (short names). */
export function resultStatus(row: CompetitionResultRow, categories: CategoryId[]): { status: ResultStatus; detail?: string } {
  if (row.absent && !row.needsAttention) return { status: "absent" };
  if (requiresCheck(row)) return { status: "check", detail: row.reasons.find(reason => !isAwaitingReason(reason)) };
  if (row.complete) return { status: row.view?.matchesOfficial ? "official" : "ready" };
  if (!row.received) return { status: "awaiting" };
  const missing = categories.filter(c => !row.item?.candidate.byCategory[c].length ||
    row.reasons.includes(`${CATEGORY_BY_ID[c].label} mark has not been entered`));
  return { status: "partial", detail: missing.map(c => CATEGORY_BY_ID[c].short).join(", ") || undefined };
}

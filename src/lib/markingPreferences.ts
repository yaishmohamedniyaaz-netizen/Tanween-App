import type { CategoryId } from "../types";

/**
 * How a judge chooses the criterion for a mark (device preference).
 *
 * Defaults are the recommended path from the marking-order study
 * (docs/MARKING_ORDER_PROTOTYPE.md): a criterion bar that works before or
 * after the word, tap for the next mark, hold to keep, keys 1 · 2 · 3.
 */
export type MarkOrder = "both" | "criterion-first" | "word-first";
/** What a tap on a bar button does: arm the next mark only, or stay on until tapped again. */
export type BarTap = "next" | "sticky";
/** "auto" keeps the bar on the side away from the scorecard. */
export type BarSide = "auto" | "left" | "right";
export type BarSize = "standard" | "large";

export interface MarkingPreferences {
  order: MarkOrder;
  barTap: BarTap;
  /** Holding a bar button (or key) keeps the criterion only while held. */
  holdToKeep: boolean;
  /** Keys 1 · 2 · 3 press the visible bar buttons. */
  keys: boolean;
  /** With a pen in the letter tray: tap = first criterion, double tap = second. */
  penDoubleTap: boolean;
  /** Finger touches on the page never mark (pen only); the bar still takes fingers. */
  penOnly: boolean;
  barSide: BarSide;
  barSize: BarSize;
}

export const DEFAULT_MARKING_PREFERENCES: MarkingPreferences = {
  order: "both",
  barTap: "next",
  holdToKeep: true,
  keys: true,
  penDoubleTap: false,
  penOnly: false,
  barSide: "auto",
  barSize: "standard",
};

const oneOf = <T extends string>(value: unknown, options: readonly T[], fallback: T): T =>
  typeof value === "string" && (options as readonly string[]).includes(value) ? value as T : fallback;
const bool = (value: unknown, fallback: boolean) => typeof value === "boolean" ? value : fallback;

export function normalizeMarkingPreferences(
  value: unknown,
  fallback: MarkingPreferences = DEFAULT_MARKING_PREFERENCES,
): MarkingPreferences {
  const v = value && typeof value === "object" ? value as Record<string, unknown> : {};
  return {
    order: oneOf(v.order, ["both", "criterion-first", "word-first"] as const, fallback.order),
    barTap: oneOf(v.barTap, ["next", "sticky"] as const, fallback.barTap),
    holdToKeep: bool(v.holdToKeep, fallback.holdToKeep),
    keys: bool(v.keys, fallback.keys),
    penDoubleTap: bool(v.penDoubleTap, fallback.penDoubleTap),
    penOnly: bool(v.penOnly, fallback.penOnly),
    barSide: oneOf(v.barSide, ["auto", "left", "right"] as const, fallback.barSide),
    barSize: oneOf(v.barSize, ["standard", "large"] as const, fallback.barSize),
  };
}

/** The bar's screen side: "auto" puts it away from the scorecard rail. */
export function resolvedBarSide(side: BarSide, railSide: "left" | "right"): "left" | "right" {
  if (side !== "auto") return side;
  return railSide === "left" ? "right" : "left";
}

/**
 * The criterion chosen on the bar before (or while) the word is tapped.
 * `held`: the button or key is still pressed; `used`: a mark was made
 * during this press; `sticky`: stays on after marks until tapped again.
 */
export interface Preselect {
  category: CategoryId;
  held: boolean;
  used: boolean;
  sticky: boolean;
}

/** Bar button or key goes down. Returns the new state and the state before the press. */
export function pressCriterion(
  current: Preselect | null,
  category: CategoryId,
  prefs: Pick<MarkingPreferences, "holdToKeep" | "barTap">,
): { next: Preselect | null; before: Preselect | null } {
  if (!prefs.holdToKeep) return { next: current, before: current };
  return {
    next: { category, held: true, used: false, sticky: prefs.barTap === "sticky" },
    before: current,
  };
}

/**
 * Bar button or key comes up. A press that made marks was a hold: it ends.
 * A plain tap toggles: the same criterion again turns it off, another one
 * replaces it.
 */
export function releaseCriterion(
  current: Preselect | null,
  before: Preselect | null,
  category: CategoryId,
  prefs: Pick<MarkingPreferences, "barTap">,
): Preselect | null {
  if (current?.held && current.category === category && current.used) return null;
  if (before?.category === category) return null;
  return { category, held: false, used: false, sticky: prefs.barTap === "sticky" };
}

/** After a mark was saved with `category`. */
export function afterMark(current: Preselect | null, category: CategoryId): Preselect | null {
  if (!current || current.category !== category) return current;
  if (current.held) return { ...current, used: true };
  return current.sticky ? current : null;
}

/** Keys 1 · 2 · 3 map to the bar's visible order. */
export function categoryForKey(key: string, categories: readonly CategoryId[]): CategoryId | null {
  if (!/^[1-9]$/.test(key)) return null;
  return categories[Number(key) - 1] ?? null;
}

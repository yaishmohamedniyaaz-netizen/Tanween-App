import type { CategoryId } from "../types";

/**
 * How a judge chooses the criterion for a mark (device preference).
 *
 * Owner decisions of 6 November 2026 (docs/MARKING_ORDER_PROTOTYPE.md): the
 * ways of marking are separate modes, never mixed; a chosen criterion stays
 * chosen until another is picked or it is tapped again.
 *
 * - criterion-first: choose on the island, then tap the word (default).
 * - drag-hold: drag from an island button onto the word, slide to the letter.
 * - word-first: no island; tap the word, then the letter and criterion in the tray.
 */
export type MarkOrder = "criterion-first" | "drag-hold" | "word-first";
/** "auto" keeps the bar on the side away from the scorecard. */
export type BarSide = "auto" | "left" | "right";
export type BarSize = "standard" | "large";
/**
 * How the page is drawn. "print": the scanned 1405 artwork (default).
 * "digitalkhatt": the DigitalKhatt old Madina font, with every letter its own
 * shape, so the mistaken letter itself can be coloured (prototype).
 */
export type PageDrawing = "print" | "digitalkhatt";

/**
 * Look of the criterion island. These are test switches for choosing a final
 * design (docs/CRITERION_ISLAND_RESEARCH.md); one set will be kept.
 */
export interface IslandLook {
  /** Where the criteria are chosen: the scorecard rows, or an island beside the pages. */
  place: "scorecard" | "island";
  /** Chosen button: strong colour fill, or soft fill with a 2px strong edge. */
  chosen: "solid" | "soft";
  /** Khafi's strong colour: the app's current #d58e3a, or the deeper #a16300. */
  khafi: "current" | "deep";
  radius: 12 | 16 | 20;
  /** Large squares (option 1) or rows with a small square and the name (option 2). */
  shape: "squares" | "rows";
  gap: 8 | 12;
  /** Buttons at rest: neutral paper with a small colour square, or a light tint. */
  rest: "paper" | "tinted";
  /** The Mushaf frame while a criterion is chosen. */
  frame: "strong" | "thin" | "off";
  /** Keyboard focus ring: neutral ink, or the app's blue (the same as Fasaha). */
  focus: "neutral" | "blue";
}

export const DEFAULT_ISLAND_LOOK: IslandLook = {
  place: "scorecard",
  chosen: "solid",
  khafi: "current",
  radius: 20,
  shape: "squares",
  gap: 12,
  rest: "paper",
  frame: "strong",
  focus: "neutral",
};

export interface MarkingPreferences {
  order: MarkOrder;
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
  /** Show the criterion buttons in the letter tray too (off: the bar is the only place). */
  trayCriteria: boolean;
  /** Prototype: underlines on words without approved borders, from learned guesses. */
  guessedUnderlines: "off" | "high" | "short" | "full";
  pageDrawing: PageDrawing;
  look: IslandLook;
}

export const DEFAULT_MARKING_PREFERENCES: MarkingPreferences = {
  order: "criterion-first",
  holdToKeep: true,
  keys: true,
  penDoubleTap: false,
  penOnly: false,
  barSide: "auto",
  barSize: "standard",
  trayCriteria: false,
  guessedUnderlines: "off",
  pageDrawing: "print",
  look: DEFAULT_ISLAND_LOOK,
};

const oneOf = <T extends string | number>(value: unknown, options: readonly T[], fallback: T): T =>
  (options as readonly unknown[]).includes(value) ? value as T : fallback;
const bool = (value: unknown, fallback: boolean) => typeof value === "boolean" ? value : fallback;
const record = (value: unknown) => value && typeof value === "object" ? value as Record<string, unknown> : {};

export function normalizeIslandLook(value: unknown, fallback: IslandLook = DEFAULT_ISLAND_LOOK): IslandLook {
  const v = record(value);
  return {
    place: oneOf(v.place, ["scorecard", "island"] as const, fallback.place),
    chosen: oneOf(v.chosen, ["solid", "soft"] as const, fallback.chosen),
    khafi: oneOf(v.khafi, ["current", "deep"] as const, fallback.khafi),
    radius: oneOf(v.radius, [12, 16, 20] as const, fallback.radius),
    shape: oneOf(v.shape, ["squares", "rows"] as const, fallback.shape),
    gap: oneOf(v.gap, [8, 12] as const, fallback.gap),
    rest: oneOf(v.rest, ["paper", "tinted"] as const, fallback.rest),
    frame: oneOf(v.frame, ["strong", "thin", "off"] as const, fallback.frame),
    focus: oneOf(v.focus, ["neutral", "blue"] as const, fallback.focus),
  };
}

export function normalizeMarkingPreferences(
  value: unknown,
  fallback: MarkingPreferences = DEFAULT_MARKING_PREFERENCES,
): MarkingPreferences {
  const v = record(value);
  // "both" (the first prototype) is gone: modes are never mixed.
  const order = v.order === "both" ? "criterion-first" : v.order;
  return {
    order: oneOf(order, ["criterion-first", "drag-hold", "word-first"] as const, fallback.order),
    holdToKeep: bool(v.holdToKeep, fallback.holdToKeep),
    keys: bool(v.keys, fallback.keys),
    penDoubleTap: bool(v.penDoubleTap, fallback.penDoubleTap),
    penOnly: bool(v.penOnly, fallback.penOnly),
    barSide: oneOf(v.barSide, ["auto", "left", "right"] as const, fallback.barSide),
    barSize: oneOf(v.barSize, ["standard", "large"] as const, fallback.barSize),
    trayCriteria: bool(v.trayCriteria, fallback.trayCriteria),
    guessedUnderlines: oneOf(v.guessedUnderlines, ["off", "high", "short", "full"] as const, fallback.guessedUnderlines),
    pageDrawing: oneOf(v.pageDrawing, ["print", "digitalkhatt"] as const, fallback.pageDrawing),
    look: normalizeIslandLook(v.look, fallback.look),
  };
}

/** The bar's screen side: "auto" puts it away from the scorecard rail. */
export function resolvedBarSide(side: BarSide, railSide: "left" | "right"): "left" | "right" {
  if (side !== "auto") return side;
  return railSide === "left" ? "right" : "left";
}

/**
 * The criterion chosen for the next mark. After a mark it turns off (owner
 * decision, 6 November 2026, round 2); a hold keeps it until the hold ends.
 * `held`: the button or key is still pressed; `used`: a mark was made
 * during this press.
 */
export interface Preselect {
  category: CategoryId;
  held: boolean;
  used: boolean;
}

/** Bar button or key goes down. Returns the new state and the state before the press. */
export function pressCriterion(
  current: Preselect | null,
  category: CategoryId,
  prefs: Pick<MarkingPreferences, "holdToKeep">,
): { next: Preselect | null; before: Preselect | null } {
  if (!prefs.holdToKeep) return { next: current, before: current };
  return { next: { category, held: true, used: false }, before: current };
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
): Preselect | null {
  if (current?.held && current.category === category && current.used) return null;
  if (before?.category === category) return null;
  return { category, held: false, used: false };
}

/** After a mark was saved with `category`: back to nothing chosen, unless it is held. */
export function afterMark(current: Preselect | null, category: CategoryId): Preselect | null {
  if (!current || current.category !== category) return current;
  return current.held ? { ...current, used: true } : null;
}

/** Keys 1 · 2 · 3 map to the bar's visible order. */
export function categoryForKey(key: string, categories: readonly CategoryId[]): CategoryId | null {
  if (!/^[1-9]$/.test(key)) return null;
  return categories[Number(key) - 1] ?? null;
}

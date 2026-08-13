import {
  ALL_CATEGORIES,
  CATEGORY_BY_ID,
  DEFAULT_CONFIG,
  cloneScoreConfig,
  enabledCategories,
  normalizeScoreConfig,
} from "../config.ts";
import type {
  CategoryId,
  JudgeAssignmentSnapshot,
  JudgePanelConfig,
  JudgePanelPreset,
  JudgeSeat,
  ScoreConfig,
} from "../types";

export const CATEGORY_ORDER: CategoryId[] = ALL_CATEGORIES;

/** One seat per criterion is the largest panel a single competition can need. */
export const MAX_JUDGE_SEATS = CATEGORY_ORDER.length;

export const DEFAULT_JUDGE_PANEL: JudgePanelConfig = {
  version: 1,
  preset: "all",
  seats: [
    {
      id: "judge-1",
      label: "Judge 1",
      name: "",
      categories: enabledCategories(DEFAULT_CONFIG),
    },
  ],
};

export function categoriesInOrder(categories: Iterable<CategoryId>): CategoryId[] {
  const selected = new Set(categories);
  return CATEGORY_ORDER.filter((category) => selected.has(category));
}

function seat(index: number, categories: CategoryId[]): JudgeSeat {
  return {
    id: `judge-${index + 1}`,
    label: `Judge ${index + 1}`,
    name: "",
    categories: categoriesInOrder(categories),
  };
}

export function createPanelPreset(
  preset: JudgePanelPreset,
  categories: CategoryId[] = enabledCategories(DEFAULT_CONFIG),
): JudgePanelConfig {
  const judged = categoriesInOrder(categories);
  if (preset === "one-each") {
    return {
      version: 1,
      preset,
      seats: judged.map((category, index) => seat(index, [category])),
    };
  }
  return {
    version: 1,
    preset,
    seats: [{ ...DEFAULT_JUDGE_PANEL.seats[0], categories: judged }],
  };
}

export interface JudgePanelValidation {
  valid: boolean;
  errors: string[];
  missing: CategoryId[];
  duplicates: CategoryId[];
  emptySeatIds: string[];
}

export function validateJudgePanel(
  panel: JudgePanelConfig,
  categories: CategoryId[] = enabledCategories(DEFAULT_CONFIG),
): JudgePanelValidation {
  const judged = categoriesInOrder(categories);
  const errors: string[] = [];
  const counts = new Map<CategoryId, number>(
    CATEGORY_ORDER.map((category) => [category, 0]),
  );
  const emptySeatIds: string[] = [];

  if (panel.seats.length < 1 || panel.seats.length > MAX_JUDGE_SEATS) {
    errors.push(`Use between one and ${MAX_JUDGE_SEATS} judges.`);
  }

  const ids = new Set<string>();
  panel.seats.forEach((judge) => {
    if (ids.has(judge.id)) errors.push("Each judge row needs a unique seat.");
    ids.add(judge.id);
    const seatCategories = categoriesInOrder(judge.categories);
    if (seatCategories.length === 0) emptySeatIds.push(judge.id);
    seatCategories.forEach((category) =>
      counts.set(category, (counts.get(category) ?? 0) + 1),
    );
  });

  if (emptySeatIds.length) errors.push("Every judge needs at least one category.");
  const missing = judged.filter((category) => counts.get(category) === 0);
  const duplicates = judged.filter((category) => (counts.get(category) ?? 0) > 1);
  const unused = CATEGORY_ORDER.filter(
    (category) => !judged.includes(category) && (counts.get(category) ?? 0) > 0,
  );
  if (missing.length) errors.push("Every category must be assigned.");
  if (duplicates.length) errors.push("A category can belong to only one judge.");
  if (unused.length) {
    errors.push("A criterion this competition does not use cannot be assigned.");
  }

  return {
    valid: errors.length === 0,
    errors,
    missing,
    duplicates,
    emptySeatIds,
  };
}

export function normalizeJudgePanel(
  value: unknown,
  categories: CategoryId[] = enabledCategories(DEFAULT_CONFIG),
): JudgePanelConfig {
  if (!value || typeof value !== "object") return createPanelPreset("all", categories);
  const candidate = value as Partial<JudgePanelConfig>;
  const rawSeats = Array.isArray(candidate.seats) ? candidate.seats : [];
  const seats = rawSeats.slice(0, MAX_JUDGE_SEATS).map((raw, index) => {
    const judge = (raw ?? {}) as Partial<JudgeSeat>;
    const categories = Array.isArray(judge.categories)
      ? categoriesInOrder(
          judge.categories.filter((item): item is CategoryId =>
            CATEGORY_ORDER.includes(item as CategoryId),
          ),
        )
      : [];
    return {
      id: typeof judge.id === "string" && judge.id ? judge.id : `judge-${index + 1}`,
      label: `Judge ${index + 1}`,
      name: typeof judge.name === "string" ? judge.name.slice(0, 80) : "",
      categories,
    };
  });
  const preset: JudgePanelPreset =
    candidate.preset === "one-each" || candidate.preset === "custom"
      ? candidate.preset
      : "all";
  const panel: JudgePanelConfig = { version: 1, preset, seats };
  return validateJudgePanel(panel, categories).valid
    ? panel
    : createPanelPreset("all", categories);
}

export function judgeSeatFor(
  panel: JudgePanelConfig,
  judgeSeatId: string | null | undefined,
): JudgeSeat | null {
  return panel.seats.find((judge) => judge.id === judgeSeatId) ?? null;
}

export function makeAssignmentSnapshot(
  panel: JudgePanelConfig,
  judgeSeatId: string | null | undefined,
  config: ScoreConfig,
): JudgeAssignmentSnapshot | null {
  if (!validateJudgePanel(panel, enabledCategories(config)).valid) return null;
  const judge = judgeSeatFor(panel, judgeSeatId);
  if (!judge) return null;
  return {
    version: 1,
    panel: {
      ...panel,
      seats: panel.seats.map((item) => ({
        ...item,
        categories: [...item.categories],
      })),
    },
    judgeSeatId: judge.id,
    judgeLabel: judge.label,
    judgeName: judge.name,
    categories: categoriesInOrder(judge.categories),
    config: cloneScoreConfig(config),
  };
}

export function legacyAssignment(config: ScoreConfig): JudgeAssignmentSnapshot {
  // The fallback must survive a raw stored config from any earlier release.
  const normalized = normalizeScoreConfig(config);
  return makeAssignmentSnapshot(
    createPanelPreset("all", enabledCategories(normalized)),
    "judge-1",
    normalized,
  )!;
}

export function normalizeAssignment(
  value: unknown,
  fallbackConfig: ScoreConfig,
): JudgeAssignmentSnapshot {
  if (!value || typeof value !== "object") return legacyAssignment(fallbackConfig);
  const candidate = value as Partial<JudgeAssignmentSnapshot>;
  const config = normalizeScoreConfig(candidate.config ?? fallbackConfig);
  const panel = normalizeJudgePanel(candidate.panel, enabledCategories(config));
  return (
    makeAssignmentSnapshot(panel, candidate.judgeSeatId, config) ??
    legacyAssignment(fallbackConfig)
  );
}

export function judgeDisplayName(
  assignment: Pick<JudgeAssignmentSnapshot, "judgeLabel" | "judgeName">,
): string {
  return assignment.judgeName.trim() || assignment.judgeLabel;
}

/** Short criterion names for judge strips, filters and exports. */
export function shortCategoryLabel(category: CategoryId): string {
  const labels: Record<CategoryId, string> = {
    jali: "Jali",
    khafi: "Khafi",
    fasaha: "Fasaha",
    "adu-raagu": "Adu & Raagu",
  };
  return labels[category] ?? CATEGORY_BY_ID[category]?.label ?? category;
}

export function assignmentLabel(categories: CategoryId[]): string {
  return categoriesInOrder(categories).map(shortCategoryLabel).join(" + ");
}

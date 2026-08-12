import type {
  CategoryId,
  JudgeAssignmentSnapshot,
  JudgePanelConfig,
  JudgePanelPreset,
  JudgeSeat,
  ScoreConfig,
} from "../types";
import { CATEGORY_BY_ID } from "../config.ts";

export const CATEGORY_ORDER: CategoryId[] = ["jali", "khafi", "fasaha"];

export const DEFAULT_JUDGE_PANEL: JudgePanelConfig = {
  version: 1,
  preset: "all",
  seats: [
    {
      id: "judge-1",
      label: "Judge 1",
      name: "",
      categories: [...CATEGORY_ORDER],
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

export function createPanelPreset(preset: JudgePanelPreset): JudgePanelConfig {
  if (preset === "one-each") {
    return {
      version: 1,
      preset,
      seats: CATEGORY_ORDER.map((category, index) => seat(index, [category])),
    };
  }
  return {
    ...DEFAULT_JUDGE_PANEL,
    preset,
    seats: DEFAULT_JUDGE_PANEL.seats.map((judge) => ({
      ...judge,
      categories: [...judge.categories],
    })),
  };
}

export interface JudgePanelValidation {
  valid: boolean;
  errors: string[];
  missing: CategoryId[];
  duplicates: CategoryId[];
  emptySeatIds: string[];
}

export function validateJudgePanel(panel: JudgePanelConfig): JudgePanelValidation {
  const errors: string[] = [];
  const counts = new Map<CategoryId, number>(
    CATEGORY_ORDER.map((category) => [category, 0]),
  );
  const emptySeatIds: string[] = [];

  if (panel.seats.length < 1 || panel.seats.length > 3) {
    errors.push("Use between one and three judges.");
  }

  const ids = new Set<string>();
  panel.seats.forEach((judge) => {
    if (ids.has(judge.id)) errors.push("Each judge row needs a unique seat.");
    ids.add(judge.id);
    const categories = categoriesInOrder(judge.categories);
    if (categories.length === 0) emptySeatIds.push(judge.id);
    categories.forEach((category) =>
      counts.set(category, (counts.get(category) ?? 0) + 1),
    );
  });

  if (emptySeatIds.length) errors.push("Every judge needs at least one category.");
  const missing = CATEGORY_ORDER.filter((category) => counts.get(category) === 0);
  const duplicates = CATEGORY_ORDER.filter((category) => (counts.get(category) ?? 0) > 1);
  if (missing.length) errors.push("Every category must be assigned.");
  if (duplicates.length) errors.push("A category can belong to only one judge.");

  return {
    valid: errors.length === 0,
    errors,
    missing,
    duplicates,
    emptySeatIds,
  };
}

export function normalizeJudgePanel(value: unknown): JudgePanelConfig {
  if (!value || typeof value !== "object") return createPanelPreset("all");
  const candidate = value as Partial<JudgePanelConfig>;
  const rawSeats = Array.isArray(candidate.seats) ? candidate.seats : [];
  const seats = rawSeats.slice(0, 3).map((raw, index) => {
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
  return validateJudgePanel(panel).valid ? panel : createPanelPreset("all");
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
  if (!validateJudgePanel(panel).valid) return null;
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
    config: Object.fromEntries(
      CATEGORY_ORDER.map((category) => [category, { ...config[category] }]),
    ) as ScoreConfig,
  };
}

export function legacyAssignment(config: ScoreConfig): JudgeAssignmentSnapshot {
  return makeAssignmentSnapshot(
    createPanelPreset("all"),
    "judge-1",
    config,
  )!;
}

export function normalizeAssignment(
  value: unknown,
  fallbackConfig: ScoreConfig,
): JudgeAssignmentSnapshot {
  if (!value || typeof value !== "object") return legacyAssignment(fallbackConfig);
  const candidate = value as Partial<JudgeAssignmentSnapshot>;
  const panel = normalizeJudgePanel(candidate.panel);
  const config = candidate.config ?? fallbackConfig;
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

/**
 * Plain-ASCII criterion names for exports and saved records.
 *
 * Deliberately separate from the interface names below: spreadsheets and
 * archived result files already carry these spellings, and rewriting them
 * would make historical exports incomparable with new ones.
 */
export function assignmentLabel(categories: CategoryId[]): string {
  const labels: Record<CategoryId, string> = {
    jali: "Jali",
    khafi: "Khafi",
    fasaha: "Fasaha",
  };
  return categoriesInOrder(categories).map((category) => labels[category]).join(" + ");
}

/**
 * Criterion names for the interface, taken from the single definition in
 * `CATEGORY_BY_ID` so every screen reads the same. Nothing on screen should
 * ever print a raw storage id such as `jali`.
 */
export function categoryListLabel(categories: CategoryId[]): string {
  return categoriesInOrder(categories)
    .map((category) => CATEGORY_BY_ID[category].label)
    .join(" + ");
}

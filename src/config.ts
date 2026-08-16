import type {
  CategoryConfig,
  CategoryDef,
  CategoryId,
  ScoreConfig,
} from "./types";

export const CATEGORIES: CategoryDef[] = [
  {
    id: "jali",
    kind: "pinpoint",
    optional: false,
    label: "Laḥn Jalī",
    labelAr: "لَحْن جَلِيّ",
    hint: "Clear error — a letter or vowel changed",
  },
  {
    id: "khafi",
    kind: "pinpoint",
    optional: false,
    label: "Laḥn Khafī",
    labelAr: "لَحْن خَفِيّ",
    hint: "Hidden error — a tajwīd rule",
  },
  {
    id: "fasaha",
    kind: "pinpoint",
    optional: true,
    label: "Faṣāḥa",
    labelAr: "فَصَاحَة",
    hint: "Clarity — over-stress, harshness",
  },
  {
    id: "adu-raagu",
    kind: "impression",
    optional: true,
    label: "Adu / Raagu",
    labelAr: "الصوت واللحن",
    hint: "Voice and melody — marked for the whole recitation",
  },
];

export const CATEGORY_BY_ID: Record<CategoryId, CategoryDef> = Object.fromEntries(
  CATEGORIES.map((c) => [c.id, c]),
) as Record<CategoryId, CategoryDef>;

/** Every criterion, in the order judges read them. */
export const ALL_CATEGORIES: CategoryId[] = CATEGORIES.map((c) => c.id);

/** Criteria marked by pinpointing an exact letter on the page. */
export const PINPOINT_CATEGORIES: CategoryId[] = CATEGORIES.filter(
  (c) => c.kind === "pinpoint",
).map((c) => c.id);

/** Criteria marked once for the whole recitation. */
export const IMPRESSION_CATEGORIES: CategoryId[] = CATEGORIES.filter(
  (c) => c.kind === "impression",
).map((c) => c.id);

/** Criteria a competition may switch off. Jalī and Khafī are always judged. */
export const OPTIONAL_CATEGORIES: CategoryId[] = CATEGORIES.filter(
  (c) => c.optional,
).map((c) => c.id);

export function isPinpointCategory(category: CategoryId): boolean {
  return CATEGORY_BY_ID[category]?.kind === "pinpoint";
}

export function isImpressionCategory(category: CategoryId): boolean {
  return CATEGORY_BY_ID[category]?.kind === "impression";
}

/** Category allocations must always total 100 across the criteria in use. */
export const TOTAL_MARKS = 100;

export const DEFAULT_CONFIG: ScoreConfig = {
  jali: { enabled: true, start: 50, step: 2 },
  khafi: { enabled: true, start: 30, step: 1 },
  fasaha: { enabled: true, start: 10, step: 1 },
  "adu-raagu": { enabled: true, start: 10, step: 0.5 },
};

/** Allocation for an optional criterion that a competition switched off. */
const DISABLED_CATEGORY: CategoryConfig = { enabled: false, start: 0, step: 1 };

/** Allocation options — increments of 5. */
export const START_OPTIONS = Array.from({ length: 18 }, (_, i) => (i + 1) * 5);

/** A whole-recitation criterion is a minor share of the total in practice, and
 *  its picker lists every mark, so its allocation stops at 20. */
export const MAX_IMPRESSION_MARKS = 20;

export function startOptionsFor(category: CategoryId): number[] {
  return isImpressionCategory(category)
    ? START_OPTIONS.filter((value) => value <= MAX_IMPRESSION_MARKS)
    : START_OPTIONS;
}

/** Deduction step options. */
export const STEP_OPTIONS = [0.5, 1, 2, 3, 5];

export const STORAGE_KEY = "tahqeeq.session.v1";

/** The criteria this configuration actually judges, in reading order. */
export function enabledCategories(config: ScoreConfig): CategoryId[] {
  return ALL_CATEGORIES.filter((category) => config[category]?.enabled);
}

export function enabledMarksTotal(config: ScoreConfig): number {
  return enabledCategories(config).reduce(
    (sum, category) => sum + config[category].start,
    0,
  );
}

function normalizeCategoryConfig(
  value: unknown,
  fallback: CategoryConfig,
  optional: boolean,
): CategoryConfig {
  // A criterion missing from stored state was never part of that competition,
  // so it stays switched off rather than silently adding marks to old records.
  if (!value || typeof value !== "object") {
    return optional ? { ...DISABLED_CATEGORY } : { ...fallback };
  }
  const candidate = value as Partial<CategoryConfig>;
  const enabled = optional ? candidate.enabled !== false : true;
  const start = Number.isFinite(candidate.start)
    ? Math.max(0, Number(candidate.start))
    : fallback.start;
  const step = Number.isFinite(candidate.step) && Number(candidate.step) > 0
    ? Number(candidate.step)
    : fallback.step;
  return { enabled, start: enabled ? start : 0, step };
}

function capStart(category: CategoryId, config: CategoryConfig): CategoryConfig {
  const cap = isImpressionCategory(category) ? MAX_IMPRESSION_MARKS : Infinity;
  return config.start > cap ? { ...config, start: cap } : config;
}

/** Read any stored score configuration, including pre-Adu & Raagu records. */
export function normalizeScoreConfig(value: unknown): ScoreConfig {
  const source = (value ?? {}) as Partial<Record<CategoryId, unknown>>;
  return Object.fromEntries(
    CATEGORIES.map((category) => [
      category.id,
      capStart(
        category.id,
        normalizeCategoryConfig(
          source[category.id],
          DEFAULT_CONFIG[category.id],
          category.optional,
        ),
      ),
    ]),
  ) as ScoreConfig;
}

export function cloneScoreConfig(config: ScoreConfig): ScoreConfig {
  return Object.fromEntries(
    ALL_CATEGORIES.map((category) => [category, { ...config[category] }]),
  ) as ScoreConfig;
}

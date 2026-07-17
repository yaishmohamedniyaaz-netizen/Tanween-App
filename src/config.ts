import type { CategoryDef, CategoryId, ScoreConfig } from "./types";

export const CATEGORIES: CategoryDef[] = [
  {
    id: "jali",
    label: "Laḥn Jalī",
    labelAr: "لَحْن جَلِيّ",
    hint: "Clear error — a letter or vowel changed",
  },
  {
    id: "khafi",
    label: "Laḥn Khafī",
    labelAr: "لَحْن خَفِيّ",
    hint: "Hidden error — a tajwīd rule",
  },
  {
    id: "fasaha",
    label: "Faṣāḥa",
    labelAr: "فَصَاحَة",
    hint: "Clarity — over-stress, harshness",
  },
];

export const CATEGORY_BY_ID: Record<CategoryId, CategoryDef> = Object.fromEntries(
  CATEGORIES.map((c) => [c.id, c]),
) as Record<CategoryId, CategoryDef>;

/** Category allocations must always total 100. */
export const TOTAL_MARKS = 100;

export const DEFAULT_CONFIG: ScoreConfig = {
  jali: { start: 50, step: 2 },
  khafi: { start: 30, step: 1 },
  fasaha: { start: 20, step: 1 },
};

/** Allocation options — increments of 5. */
export const START_OPTIONS = Array.from({ length: 18 }, (_, i) => (i + 1) * 5);

/** Deduction step options. */
export const STEP_OPTIONS = [0.5, 1, 2, 3, 5];

export const STORAGE_KEY = "tahqeeq.session.v1";

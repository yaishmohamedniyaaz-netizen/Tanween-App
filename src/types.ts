export type CategoryId = "jali" | "khafi" | "fasaha";

export interface CategoryDef {
  id: CategoryId;
  label: string; // transliteration
  labelAr: string; // arabic
  hint: string; // short description for the menu / tooltip
}

export interface CategoryConfig {
  start: number; // starting marks for this category
  step: number; // default deduction per pinpoint
}

export type ScoreConfig = Record<CategoryId, CategoryConfig>;

export type TokenRole = "letter" | "ayah-end" | "ornament";

/** One pinpointed deduction tied to an exact glyph on the page. */
export interface Mistake {
  id: string;
  tid: string; // token id (stable address of the glyph)
  surah: number;
  ayah: number | null; // null === basmala line
  page?: number; // page number for cross-page navigation
  glyph: string; // the letter/mark text
  label: string; // human location, e.g. "112:1 · letter 3"
  category: CategoryId;
  amount: number; // marks deducted (defaults to category.step, adjustable)
  note?: string;
  ts: number;
}

export interface Participant {
  name: string;
  number: string;
  group: string; // atoll / island / class — for the later stats layer
}

/** One roster entry from an uploaded participant sheet. */
export interface RosterEntry {
  name: string;
  number: string;
  group: string;
  judged: boolean;
}

/** A finished session, snapshotted into the local records/accountability layer. */
export interface SavedSession {
  id: string;
  savedAt: number;
  participant: Participant;
  config: ScoreConfig;
  total: number;
  totalMax: number;
  notes: string;
  mistakes: Mistake[];
}

export interface JudgingState {
  participant: Participant;
  /** false until a reciter has been chosen via the start dialog */
  sessionActive: boolean;
  config: ScoreConfig;
  mistakes: Mistake[];
  notes: string; // free notes: Fasaha / voice & melody
  history: SavedSession[];
  roster: RosterEntry[];
}

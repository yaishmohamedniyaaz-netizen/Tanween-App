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

export type JudgePanelPreset = "all" | "one-each" | "custom";

export interface JudgeSeat {
  id: string;
  label: string;
  /** Optional human name; the stable seat label remains the fallback. */
  name: string;
  categories: CategoryId[];
}

export interface JudgePanelConfig {
  version: 1;
  preset: JudgePanelPreset;
  seats: JudgeSeat[];
}

/** Immutable ownership and scoring rules captured when a reciter begins. */
export interface JudgeAssignmentSnapshot {
  version: 1;
  panel: JudgePanelConfig;
  judgeSeatId: string;
  judgeLabel: string;
  judgeName: string;
  categories: CategoryId[];
  config: ScoreConfig;
}

export type TokenRole = "letter" | "ayah-end" | "ornament";

/** One pinpointed deduction tied to an exact semantic judging unit. */
export interface Mistake {
  id: string;
  tid: string; // stable judging-unit id; legacy grapheme ids remain readable
  /** Target schema used when this evidence item was created. */
  targetVersion?: 2;
  sourceVersion?: string;
  ruleVersion?: string;
  wordId?: string;
  sourceStart?: number;
  sourceEnd?: number;
  primaryGlyph?: string;
  fullGlyph?: string;
  /** Retained when a legacy id is later resolved to a V2 target. */
  originalTid?: string;
  migrationStatus?: "exact" | "auto-merged" | "unresolved";
  surah: number;
  ayah: number | null; // null === basmala line
  page?: number; // page number for cross-page navigation
  glyph: string; // immutable historical display snapshot
  label: string; // human location, e.g. "112:1 · letter 3"
  category: CategoryId;
  /** The judge seat responsible when this evidence was recorded. */
  judgeSeatId?: string;
  amount: number; // marks deducted (defaults to category.step, adjustable)
  note?: string;
  ts: number;
}

/** A readable, append-only record of what the judge did during one reciter. */
export type JudgingEvent =
  | {
      id: string;
      at: number;
      type: "session_started";
      sessionId: string;
      participant: Participant;
      assignment?: JudgeAssignmentSnapshot;
    }
  | {
      id: string;
      at: number;
      type: "mistake_added";
      mistake: Mistake;
    }
  | {
      id: string;
      at: number;
      type: "mistake_amount_changed";
      mistakeId: string;
      glyph: string;
      label: string;
      from: number;
      to: number;
    }
  | {
      id: string;
      at: number;
      type: "mistake_note_changed";
      mistakeId: string;
      glyph: string;
      label: string;
      from: string;
      to: string;
    }
  | {
      id: string;
      at: number;
      type: "mistake_undone" | "mistake_restored";
      mistake: Mistake;
    }
  | {
      id: string;
      at: number;
      type: "session_reopened";
      sessionId: string;
      reason: string;
    }
  | {
      id: string;
      at: number;
      type: "session_finalized";
      sessionId: string;
      total: number;
      totalMax: number;
      scoreKind?: "judge-section";
    };

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
  startedAt?: number;
  revision?: number;
  ledgerVersion?: 1;
  participant: Participant;
  config: ScoreConfig;
  total: number;
  totalMax: number;
  scoreKind?: "judge-section";
  sectionTotal?: number;
  sectionMax?: number;
  assignment?: JudgeAssignmentSnapshot;
  notes: string;
  mistakes: Mistake[];
  events?: JudgingEvent[];
}

export interface JudgingState {
  participant: Participant;
  /** false until a reciter has been chosen via the start dialog */
  sessionActive: boolean;
  activeSessionId: string | null;
  activeStartedAt: number | null;
  activeRevision: number;
  /** Frozen for the active reciter; live setup changes cannot rewrite it. */
  activeAssignment: JudgeAssignmentSnapshot | null;
  events: JudgingEvent[];
  config: ScoreConfig;
  panel: JudgePanelConfig;
  deviceJudgeId: string | null;
  mistakes: Mistake[];
  notes: string; // free notes: Fasaha / voice & melody
  history: SavedSession[];
  roster: RosterEntry[];
}

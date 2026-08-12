export type CategoryId = "jali" | "khafi" | "fasaha";
export type ParticipantCategory = "" | "baliagen" | "nubalaa";
export type MuqarrarSide = "" | "feshey-kolhu" | "nimey-kolhu";
export type QuestionMuqarrar = Exclude<MuqarrarSide, ""> | "both";
export type CompetitionStatus = "draft" | "live" | "closed";

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
      question?: ReciterQuestionAssignment;
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
      /**
       * The judge marked an already-marked letter under a different criterion.
       * A letter carries one finding per judge, so this corrects the existing
       * entry in place rather than adding a second deduction — and is recorded
       * as the correction it is, not as a delete followed by an add.
       */
      type: "mistake_recategorized";
      mistakeId: string;
      glyph: string;
      label: string;
      from: CategoryId;
      to: CategoryId;
      fromAmount: number;
      toAmount: number;
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
  /** Stable local identity. Visible participant number remains separate. */
  id: string;
  name: string;
  number: string;
  ageGroup: string;
  category: ParticipantCategory;
  muqarrar: MuqarrarSide;
  phone: string;
  institution: string;
}

/** One roster entry from an uploaded participant sheet. */
export interface RosterEntry extends Participant {
  judged: boolean;
  /**
   * Marked not present when their turn came. Reversible: pressing their name
   * puts them back up, which is how a latecomer is handled.
   */
  absent?: boolean;
}

export type QuranPortion =
  | { kind: "full-quran" }
  | { kind: "juz-range"; startJuz: number; endJuz: number }
  | { kind: "surah-range"; startSurah: number; endSurah: number };

export interface CompetitionDivision {
  id: string;
  name: string;
  ageGroup: string;
  category: Exclude<ParticipantCategory, "">;
  quranPortion: QuranPortion;
}

export interface CompetitionQuestionPolicy {
  version: 1;
  mode: "manual" | "tahqeeq";
  targetRecitationLines: number;
  endRule: "first-ayah-end-at-or-after-target";
  firstPrintedLinePolicy: "containing-start-ayah";
  finalPrintedLineScoring: "include" | "exclude";
  sourceVersion: string;
  questionIndexVersion: string;
  questionSetId?: string;
  questionSetVersion?: number;
  approvedQuestionCount?: number;
  frozenQuestionSet?: boolean;
}

/** A manually prepared, non-official question candidate. */
export interface CompetitionQuestionDraft {
  version: 1;
  id: string;
  competitionId: string;
  isSample: boolean;
  divisionId: string;
  /** Organizer-confirmed side of the muqarrar this question may be used for. */
  muqarrar: QuestionMuqarrar;
  createdAt: number;
  updatedAt: number;
  note: string;
  startAyah: { surah: number; ayah: number };
  endAyah: { surah: number; ayah: number };
  requestedLines: number;
  resolvedLines: number;
  extensionLines: number;
  startPage: number;
  startLine: number;
  endPage: number;
  endLine: number;
  startWordId: string;
  endWordId: string;
  endMarkerId: string;
  finalPrintedLineScoring: "include" | "exclude";
  sourceVersion: string;
  questionIndexVersion: string;
  layoutHash: string;
}

/** The exact question choice frozen when one reciter's judging begins. */
export interface ReciterQuestionAssignment {
  version: 1;
  id: string;
  kind: "prepared-draft" | "manual";
  participantId: string;
  divisionId: string;
  muqarrar: Exclude<MuqarrarSide, "">;
  selectedAt: number;
  label: string;
  sourceQuestionId?: string;
  startAyah?: { surah: number; ayah: number };
  endAyah?: { surah: number; ayah: number };
  requestedLines?: number;
  resolvedLines?: number;
  startPage?: number;
  endPage?: number;
  sourceVersion?: string;
  questionIndexVersion?: string;
  layoutHash?: string;
}

/** One position on a frozen draw board. */
export interface QuestionDeckTile {
  /** What the reciter points at. Stable for the life of the deck. */
  position: number;
  /** Resolved only when the organiser presses the position. */
  questionId: string;
}

/**
 * A frozen draw board for one division and muqarrar side. The questions are
 * fixed when the deck is cut; only their positions are shuffled. Seed and
 * fingerprint together let a disputed draw be reconstructed exactly.
 */
export interface QuestionDeck {
  version: 1;
  generatorVersion: number;
  competitionId: string;
  divisionId: string;
  muqarrar: Exclude<MuqarrarSide, "">;
  seed: string;
  candidateFingerprint: string;
  frozenAt: number;
  tiles: QuestionDeckTile[];
}

/** A number, once pressed. Spends that position for the rest of the session. */
export interface QuestionDrawRecord {
  version: 1;
  competitionId: string;
  scopeKey: string;
  seed: string;
  position: number;
  questionId: string;
  participantId: string;
  revealedAt: number;
}

export interface LiveCompetitionSnapshot {
  version: 1;
  /** Test competitions are permanently identifiable in every frozen record. */
  isSample: boolean;
  versionId: string;
  competitionId: string;
  name: string;
  edition: string;
  setupRevision: number;
  startedAt: number;
  divisions: CompetitionDivision[];
  questionPolicy: CompetitionQuestionPolicy;
  panel: JudgePanelConfig;
  scoreConfig: ScoreConfig;
  roster: Participant[];
  mushafLayout: string;
  mushafSourceVersion: string;
  questionIndexVersion: string;
}

export interface CompetitionConfig {
  version: 2;
  /** Sample data is never treated as an official competition export. */
  isSample: boolean;
  id: string;
  name: string;
  edition: string;
  status: CompetitionStatus;
  setupRevision: number;
  divisions: CompetitionDivision[];
  questionPolicy: CompetitionQuestionPolicy;
  liveSnapshot: LiveCompetitionSnapshot | null;
  closedAt?: number;
}

export interface FinalizedCategoryScore {
  category: CategoryId;
  score: number;
  max: number;
  sessionId: string;
  sessionRevision: number;
  judgeSeatId: string;
  judgeName: string;
}

export interface FinalizedResult {
  id: string;
  competitionId?: string;
  competitionVersionId?: string;
  isSample?: boolean;
  participant: Participant;
  revision: number;
  finalizedAt: number;
  revisionReason?: string;
  byCategory: Record<CategoryId, FinalizedCategoryScore>;
  total: number;
  totalMax: number;
  manifest: string;
  /** Earlier revisions remain in the audit record but never enter rankings. */
  supersededAt?: number;
  supersededByRevision?: number;
}

/** A finished session, snapshotted into the local records/accountability layer. */
export interface SavedSession {
  id: string;
  competitionId?: string;
  competitionVersionId?: string;
  isSample?: boolean;
  savedAt: number;
  startedAt?: number;
  revision?: number;
  /** 1 = original event set; 2 adds `mistake_recategorized`. */
  ledgerVersion?: 1 | 2;
  participant: Participant;
  config: ScoreConfig;
  total: number;
  totalMax: number;
  scoreKind?: "judge-section";
  sectionTotal?: number;
  sectionMax?: number;
  assignment?: JudgeAssignmentSnapshot;
  question?: ReciterQuestionAssignment;
  notes: string;
  mistakes: Mistake[];
  events?: JudgingEvent[];
  importedAt?: number;
  sourceSessionId?: string;
  conflictsWith?: string;
}

export interface JudgingState {
  competition: CompetitionConfig;
  /** Device-local preparation drafts; never part of an official live snapshot. */
  questionDrafts: CompetitionQuestionDraft[];
  /** Frozen draw boards, one per division and muqarrar side. */
  decks: QuestionDeck[];
  /** Every number pressed, in order. Spends a position for the session. */
  draws: QuestionDrawRecord[];
  sampleQuestionsInitialized: boolean;
  participant: Participant;
  /** false until a reciter has been chosen via the start dialog */
  sessionActive: boolean;
  activeSessionId: string | null;
  activeStartedAt: number | null;
  activeRevision: number;
  /** Frozen for the active reciter; live setup changes cannot rewrite it. */
  activeAssignment: JudgeAssignmentSnapshot | null;
  /** Frozen question evidence for the active reciter. */
  activeQuestion: ReciterQuestionAssignment | null;
  events: JudgingEvent[];
  config: ScoreConfig;
  panel: JudgePanelConfig;
  deviceJudgeId: string | null;
  mistakes: Mistake[];
  notes: string; // free notes: Fasaha / voice & melody
  history: SavedSession[];
  roster: RosterEntry[];
  finalizedResults: FinalizedResult[];
}

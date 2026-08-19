export type CategoryId = "jali" | "khafi" | "fasaha" | "adu-raagu";
export type ParticipantCategory = "" | "baliagen" | "nubalaa";
export type MuqarrarSide = "" | "feshey-kolhu" | "nimey-kolhu";
export type QuestionMuqarrar = Exclude<MuqarrarSide, ""> | "both";
export type CompetitionStatus = "draft" | "live" | "closed";

/** How a criterion is marked. Pinpoint criteria are tied to an exact letter on
 *  the page; impression criteria are judged over the whole recitation. */
export type CategoryKind = "pinpoint" | "impression";

export interface CategoryDef {
  id: CategoryId;
  kind: CategoryKind;
  /** Optional criteria can be switched off for a competition. */
  optional: boolean;
  label: string; // transliteration
  labelAr: string; // arabic
  hint: string; // short description for the menu / tooltip
}

export interface CategoryConfig {
  /** Optional criteria that a competition does not use are disabled with 0 marks. */
  enabled: boolean;
  start: number; // starting marks for this category
  step: number; // default deduction per pinpoint or impression step
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
  /** The whole kalimah the marked letter belongs to. */
  wordText?: string;
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

/** One whole-recitation mark for a criterion that cannot be pinpointed on a
 *  letter, such as Adu & Raagu (voice and melody). */
export interface ImpressionMark {
  category: CategoryId;
  /** Marks awarded out of the category allocation. */
  awarded: number;
  note: string;
  /** false until the judge has explicitly marked this criterion. */
  set: boolean;
  judgeSeatId?: string;
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
      type: "impression_changed";
      category: CategoryId;
      from: number;
      to: number;
      judgeSeatId?: string;
    }
  | {
      id: string;
      at: number;
      type: "impression_note_changed";
      category: CategoryId;
      from: string;
      to: string;
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

export type ParticipantNumberingMode = "automatic" | "supplied";

export type RosterDraftSource = "manual" | "paste" | "file" | "existing";

/** Editable, device-local row. Raw strings are intentional so an invalid
 * import can be corrected instead of disappearing from the preview. */
export interface RosterDraftRow {
  id: string;
  participantId?: string;
  sourceRow?: number;
  number: string;
  name: string;
  divisionId: string;
  /** Exact imported Category text retained until an organizer maps it. */
  importedCategory?: string;
  legacyAgeGroup?: string;
  legacyCategory?: string;
  muqarrar: string;
  phone: string;
  institution: string;
}

export interface RosterDraft {
  version: 1;
  competitionId: string;
  source: RosterDraftSource;
  filename?: string;
  numberingMode: ParticipantNumberingMode;
  rows: RosterDraftRow[];
  sourceWarnings: string[];
  updatedAt: number;
}

export type QuranPortion =
  | { kind: "full-quran" }
  | { kind: "juz-range"; startJuz: number; endJuz: number }
  | { kind: "surah-range"; startSurah: number; endSurah: number };

export interface ParticipantEntrySettings {
  institutions: string[];
  defaultMuqarrar: MuqarrarSide;
  defaultInstitution: string;
}

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
export interface RecitationRangeSnapshot {
  version: 1;
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
  mushafLayout: string;
  sourceVersion: string;
  questionIndexVersion: string;
  layoutHash: string;
}

export interface ReciterQuestionAssignment {
  version: 1 | 2;
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
  /** Exact immutable printed range. Present on every newly prepared question. */
  range?: RecitationRangeSnapshot;
  /** Immutable link back to the revealed number when Tahqeeq supplied it. */
  drawId?: string;
  drawPosition?: number;
  drawCycle?: number;
  /** Every pre-Ready replacement remains attached to the final session record. */
  replacements?: QuestionReplacementRecord[];
}

export interface QuestionReplacementRecord {
  version: 1;
  id: string;
  replacedAt: number;
  reason: "question-changed" | "reciter-changed";
  fromParticipantId: string;
  fromQuestionId: string;
  fromDrawId?: string;
  toParticipantId: string;
  toQuestionId: string;
  toDrawId?: string;
}

/**
 * A reciter and question that have been revealed but have not begun judging.
 * This is persisted so a refresh cannot lose the public draw or accidentally
 * turn preparation time into judging time.
 */
export interface PreparedRecitation {
  version: 1;
  id: string;
  participant: Participant;
  assignment: JudgeAssignmentSnapshot;
  question: ReciterQuestionAssignment;
  preparedAt: number;
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
  version: 1 | 2;
  generatorVersion: number;
  competitionId: string;
  divisionId: string;
  muqarrar: Exclude<MuqarrarSide, "">;
  seed: string;
  /** Increments only after every position in the previous board was spent. */
  cycle?: number;
  candidateFingerprint: string;
  frozenAt: number;
  tiles: QuestionDeckTile[];
}

/** A number, once pressed. Spends that position for the rest of the session. */
export interface QuestionDrawRecord {
  version: 1 | 2;
  /** Stable evidence id used to link an explicit replacement draw. */
  id?: string;
  competitionId: string;
  scopeKey: string;
  seed: string;
  cycle?: number;
  position: number;
  questionId: string;
  participantId: string;
  revealedAt: number;
  /** Present when this draw intentionally replaces an earlier reveal. */
  replacesDrawId?: string;
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
  participantNumbering: ParticipantNumberingMode;
  participantEntrySettings: ParticipantEntrySettings;
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
  /** Only the criteria this competition uses are present. */
  byCategory: Partial<Record<CategoryId, FinalizedCategoryScore>>;
  total: number;
  totalMax: number;
  manifest: string;
  /** Frozen only when every selected judge source agrees on one exact question. */
  questionEvidence?: {
    version: 1;
    fingerprint: string;
    question: ReciterQuestionAssignment;
    sources: Array<{
      sessionId: string;
      sessionRevision: number;
      judgeSeatId: string;
    }>;
  };
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
  /** Whole-recitation marks, such as Adu & Raagu. Absent in pre-impression records. */
  impressions?: ImpressionMark[];
  events?: JudgingEvent[];
  importedAt?: number;
  sourceSessionId?: string;
  conflictsWith?: string;
}

export interface JudgingState {
  competition: CompetitionConfig;
  /** Recoverable participant preparation; never enters a live snapshot. */
  rosterDraft: RosterDraft | null;
  /** Device-local preparation drafts; never part of an official live snapshot. */
  questionDrafts: CompetitionQuestionDraft[];
  /** Frozen draw boards, one per division and muqarrar side. */
  decks: QuestionDeck[];
  /** Every number pressed, in order. Spends a position for the session. */
  draws: QuestionDrawRecord[];
  sampleQuestionsInitialized: boolean;
  participant: Participant;
  /** True only after the prepared recitation has explicitly begun judging. */
  sessionActive: boolean;
  /** Revealed participant/question, held safely until this device presses Ready. */
  preparedRecitation: PreparedRecitation | null;
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
  impressions: ImpressionMark[];
  notes: string; // free notes for the whole recitation
  history: SavedSession[];
  roster: RosterEntry[];
  finalizedResults: FinalizedResult[];
}

import {
  TOTAL_MARKS,
  cloneScoreConfig,
  enabledCategories,
  enabledMarksTotal,
  normalizeScoreConfig,
} from "../config.ts";
import type {
  CompetitionConfig,
  CompetitionDivision,
  CompetitionQuestionPolicy,
  JudgePanelConfig,
  LiveCompetitionSnapshot,
  Participant,
  QuranPortion,
  RosterEntry,
  RosterDraft,
  ScoreConfig,
} from "../types";
import { validateJudgePanel, judgeSeatFor } from "./judgeAssignments.ts";
import { MUSHAF_DATA_VERSION, MUSHAF_LAYOUT } from "./mushafContract.ts";
import { QUESTION_INDEX_VERSION } from "./questionBank.ts";

export const DEFAULT_QUESTION_POLICY: CompetitionQuestionPolicy = {
  version: 1,
  mode: "manual",
  targetRecitationLines: 7,
  endRule: "first-ayah-end-at-or-after-target",
  firstPrintedLinePolicy: "containing-start-ayah",
  finalPrintedLineScoring: "exclude",
  sourceVersion: MUSHAF_DATA_VERSION,
  questionIndexVersion: QUESTION_INDEX_VERSION,
};

export const EMPTY_COMPETITION: CompetitionConfig = {
  version: 2,
  isSample: false,
  id: "competition-local",
  name: "",
  edition: "",
  status: "draft",
  setupRevision: 1,
  participantNumbering: "automatic",
  divisions: [],
  questionPolicy: { ...DEFAULT_QUESTION_POLICY },
  liveSnapshot: null,
};

function hash(value: string): string {
  let result = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    result ^= value.charCodeAt(index);
    result = Math.imul(result, 0x01000193);
  }
  return (result >>> 0).toString(36);
}

export function competitionIdFor(name: string, edition: string): string {
  const source = `${name.trim().toLowerCase()}\u241f${edition.trim().toLowerCase()}`;
  return source === "\u241f" ? "competition-local" : `competition-${hash(source)}`;
}

export function normalizeCompetition(
  value?: Partial<CompetitionConfig>,
): CompetitionConfig {
  const name = String(value?.name ?? "").trim();
  const edition = String(value?.edition ?? "").trim();
  const status =
    value?.status === "live" || value?.status === "closed"
      ? value.status
      : "draft";
  return {
    version: 2,
    isSample: Boolean(value?.isSample),
    id: String(value?.id ?? "").trim() || competitionIdFor(name, edition),
    name,
    edition,
    status,
    setupRevision: Math.max(1, Math.floor(Number(value?.setupRevision) || 1)),
    participantNumbering:
      value?.participantNumbering === "automatic" ? "automatic" : "supplied",
    divisions: Array.isArray(value?.divisions)
      ? value.divisions.map(normalizeDivision).filter(Boolean) as CompetitionDivision[]
      : [],
    questionPolicy: normalizeQuestionPolicy(value?.questionPolicy),
    liveSnapshot:
      value?.liveSnapshot && typeof value.liveSnapshot === "object"
        ? cloneLiveSnapshot(value.liveSnapshot)
        : null,
    ...(Number.isFinite(value?.closedAt) ? { closedAt: Number(value?.closedAt) } : {}),
  };
}

function normalizePortion(value: unknown): QuranPortion {
  const portion = (value ?? {}) as Partial<QuranPortion>;
  if (portion.kind === "juz-range") {
    const startJuz = Math.min(30, Math.max(1, Math.floor(Number(portion.startJuz) || 1)));
    const endJuz = Math.min(30, Math.max(startJuz, Math.floor(Number(portion.endJuz) || startJuz)));
    return { kind: "juz-range", startJuz, endJuz };
  }
  if (portion.kind === "surah-range") {
    const startSurah = Math.min(114, Math.max(1, Math.floor(Number(portion.startSurah) || 1)));
    const endSurah = Math.min(114, Math.max(startSurah, Math.floor(Number(portion.endSurah) || startSurah)));
    return { kind: "surah-range", startSurah, endSurah };
  }
  return { kind: "full-quran" };
}

export function normalizeDivision(
  value: Partial<CompetitionDivision>,
): CompetitionDivision | null {
  const category = value.category === "baliagen" || value.category === "nubalaa"
    ? value.category
    : null;
  if (!category) return null;
  return {
    id: String(value.id ?? "").trim() || `division-${hash(`${value.name ?? ""}\u241f${value.ageGroup ?? ""}\u241f${category}`)}`,
    name: String(value.name ?? "").trim().slice(0, 100),
    ageGroup: String(value.ageGroup ?? "").trim().slice(0, 80),
    category,
    quranPortion: normalizePortion(value.quranPortion),
  };
}

export function normalizeQuestionPolicy(
  value?: Partial<CompetitionQuestionPolicy>,
): CompetitionQuestionPolicy {
  return {
    version: 1,
    mode: value?.mode === "tahqeeq" ? "tahqeeq" : "manual",
    targetRecitationLines: Math.min(
      30,
      Math.max(1, Math.floor(Number(value?.targetRecitationLines) || 7)),
    ),
    endRule: "first-ayah-end-at-or-after-target",
    firstPrintedLinePolicy: "containing-start-ayah",
    finalPrintedLineScoring:
      value?.finalPrintedLineScoring === "include" ? "include" : "exclude",
    sourceVersion: String(value?.sourceVersion || MUSHAF_DATA_VERSION),
    questionIndexVersion: String(value?.questionIndexVersion || QUESTION_INDEX_VERSION),
    ...(value?.questionSetId ? { questionSetId: String(value.questionSetId) } : {}),
    ...(Number.isInteger(value?.questionSetVersion)
      ? { questionSetVersion: Number(value?.questionSetVersion) }
      : {}),
    ...(Number.isInteger(value?.approvedQuestionCount)
      ? { approvedQuestionCount: Number(value?.approvedQuestionCount) }
      : {}),
    ...(value?.frozenQuestionSet ? { frozenQuestionSet: true } : {}),
  };
}

function clonePanel(panel: JudgePanelConfig): JudgePanelConfig {
  return {
    ...panel,
    seats: panel.seats.map((seat) => ({
      ...seat,
      categories: [...seat.categories],
    })),
  };
}

function participantForSnapshot(participant: Participant): Participant {
  return {
    id: participant.id,
    name: participant.name,
    number: participant.number,
    ageGroup: participant.ageGroup,
    category: participant.category,
    muqarrar: participant.muqarrar,
    phone: participant.phone,
    institution: participant.institution,
  };
}

function cloneLiveSnapshot(
  snapshot: LiveCompetitionSnapshot,
): LiveCompetitionSnapshot {
  return {
    ...snapshot,
    divisions: snapshot.divisions.map((division) => ({
      ...division,
      quranPortion: { ...division.quranPortion },
    })),
    questionPolicy: { ...snapshot.questionPolicy },
    panel: clonePanel(snapshot.panel),
    scoreConfig: normalizeScoreConfig(snapshot.scoreConfig),
    roster: snapshot.roster.map(participantForSnapshot),
  };
}

export type ReadinessSection =
  | "competition"
  | "divisions"
  | "participants"
  | "panel"
  | "marks"
  | "questions";

export interface ReadinessIssue {
  section: ReadinessSection;
  message: string;
}

export function competitionReadiness(input: {
  competition: CompetitionConfig;
  panel: JudgePanelConfig;
  deviceJudgeId: string | null;
  config: ScoreConfig;
  roster: RosterEntry[];
  rosterDraft?: RosterDraft | null;
}): { ready: boolean; issues: ReadinessIssue[] } {
  const issues: ReadinessIssue[] = [];
  if (!input.competition.name || !input.competition.edition) {
    issues.push({ section: "competition", message: "Add the competition name and edition." });
  }
  if (!input.competition.divisions.length) {
    issues.push({ section: "divisions", message: "Add at least one participant category." });
  }
  input.competition.divisions.forEach((division) => {
    if (!division.name || !division.ageGroup) {
      issues.push({ section: "divisions", message: "Every category needs a name and age group." });
    }
  });
  const divisionKeys = new Set<string>();
  input.competition.divisions.forEach((division) => {
    const key = `${division.ageGroup.trim().toLocaleLowerCase()}\u241f${division.category}`;
    if (divisionKeys.has(key)) {
      issues.push({
        section: "divisions",
        message: `Only one ${division.ageGroup} ${division.category === "nubalaa" ? "Hifz" : "Baliagen"} category can be active.`,
      });
    }
    divisionKeys.add(key);
  });
  const panelValidation = validateJudgePanel(
    input.panel,
    enabledCategories(input.config),
  );
  panelValidation.errors.forEach((message) =>
    issues.push({ section: "panel", message }),
  );
  if (!judgeSeatFor(input.panel, input.deviceJudgeId)) {
    issues.push({ section: "panel", message: "Choose the judge using this device." });
  }
  if (enabledMarksTotal(input.config) !== TOTAL_MARKS) {
    issues.push({
      section: "marks",
      message: `Starting marks must total ${TOTAL_MARKS} across the criteria in use.`,
    });
  }
  if (!input.roster.length) {
    issues.push({ section: "participants", message: "Add at least one participant." });
  }
  if (input.rosterDraft) {
    issues.push({
      section: "participants",
      message: "Review and apply or discard the saved participant-list draft.",
    });
  }
  const rosterNumbers = new Set<string>();
  input.roster.forEach((participant) => {
    if (
      !participant.name ||
      !participant.number ||
      !participant.ageGroup ||
      !participant.category ||
      !participant.muqarrar
    ) {
      issues.push({ section: "participants", message: "Every participant needs their required competition details." });
    }
    const divisionKey = `${participant.ageGroup.trim().toLocaleLowerCase()}\u241f${participant.category}`;
    if (
      participant.ageGroup &&
      participant.category &&
      !divisionKeys.has(divisionKey)
    ) {
      issues.push({
        section: "participants",
        message: `${participant.name || `Participant ${participant.number}`} does not match an active participant category.`,
      });
    }
    if (participant.number && rosterNumbers.has(participant.number)) {
      issues.push({ section: "participants", message: `Participant number ${participant.number} is duplicated.` });
    }
    rosterNumbers.add(participant.number);
  });
  const policy = input.competition.questionPolicy;
  if (
    policy.sourceVersion !== MUSHAF_DATA_VERSION ||
    policy.questionIndexVersion !== QUESTION_INDEX_VERSION
  ) {
    issues.push({ section: "questions", message: "Question rules use an older Mushaf data version." });
  }
  if (
    policy.mode === "tahqeeq" &&
    (
      !policy.questionSetId ||
      !policy.frozenQuestionSet ||
      (policy.approvedQuestionCount ?? 0) < 20
    )
  ) {
    issues.push({
      section: "questions",
      message: "Choose a frozen Tahqeeq set with at least 20 reviewed questions.",
    });
  }
  return { ready: issues.length === 0, issues };
}

export function createLiveCompetitionSnapshot(input: {
  competition: CompetitionConfig;
  panel: JudgePanelConfig;
  config: ScoreConfig;
  roster: RosterEntry[];
  startedAt?: number;
}): LiveCompetitionSnapshot {
  const startedAt = input.startedAt ?? Date.now();
  return {
    version: 1,
    isSample: input.competition.isSample,
    versionId: `${input.competition.id}:setup-${input.competition.setupRevision}`,
    competitionId: input.competition.id,
    name: input.competition.name,
    edition: input.competition.edition,
    setupRevision: input.competition.setupRevision,
    startedAt,
    divisions: input.competition.divisions.map((division) => ({
      ...division,
      quranPortion: { ...division.quranPortion },
    })),
    questionPolicy: { ...input.competition.questionPolicy },
    panel: clonePanel(input.panel),
    scoreConfig: cloneScoreConfig(normalizeScoreConfig(input.config)),
    roster: input.roster.map(participantForSnapshot),
    mushafLayout: MUSHAF_LAYOUT,
    mushafSourceVersion: MUSHAF_DATA_VERSION,
    questionIndexVersion: QUESTION_INDEX_VERSION,
  };
}

export function bumpDraftCompetition(
  competition: CompetitionConfig,
  patch: Partial<CompetitionConfig> = {},
): CompetitionConfig {
  return normalizeCompetition({
    ...competition,
    ...patch,
    status: "draft",
    setupRevision: competition.setupRevision + 1,
    liveSnapshot: null,
    closedAt: undefined,
  });
}

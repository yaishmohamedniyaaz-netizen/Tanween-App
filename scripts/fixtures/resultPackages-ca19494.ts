import type {
  CompetitionConfig,
  JudgingState,
  SavedSession,
} from "../types";

const PINPOINT_CATEGORY_IDS = new Set(["jali", "khafi", "fasaha"]);
const IMPRESSION_CATEGORY_IDS = new Set(["adu-raagu"]);
const MAX_DATE_TIMESTAMP = 8_640_000_000_000_000;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && Boolean(value.trim());
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isTimestamp(value: unknown): value is number {
  return (
    isFiniteNumber(value) &&
    value >= 0 &&
    value <= MAX_DATE_TIMESTAMP
  );
}

function isParticipantSnapshot(value: unknown): boolean {
  if (!isRecord(value)) return false;
  return (
    isNonEmptyString(value.id) &&
    isNonEmptyString(value.name) &&
    typeof value.number === "string" &&
    typeof value.ageGroup === "string" &&
    typeof value.category === "string" &&
    typeof value.muqarrar === "string" &&
    typeof value.phone === "string" &&
    typeof value.institution === "string"
  );
}

function isMistakeSnapshot(value: unknown): boolean {
  if (!isRecord(value)) return false;
  return (
    isNonEmptyString(value.id) &&
    isNonEmptyString(value.tid) &&
    Number.isInteger(value.surah) &&
    (value.ayah === null || Number.isInteger(value.ayah)) &&
    typeof value.glyph === "string" &&
    typeof value.label === "string" &&
    PINPOINT_CATEGORY_IDS.has(value.category as string) &&
    isFiniteNumber(value.amount) &&
    value.amount >= 0 &&
    isTimestamp(value.ts) &&
    (value.page === undefined || Number.isInteger(value.page))
  );
}

function isImpressionSnapshot(value: unknown): boolean {
  if (!isRecord(value)) return false;
  return (
    IMPRESSION_CATEGORY_IDS.has(value.category as string) &&
    isFiniteNumber(value.awarded) &&
    value.awarded >= 0 &&
    typeof value.note === "string" &&
    typeof value.set === "boolean" &&
    isTimestamp(value.ts) &&
    (value.judgeSeatId === undefined || typeof value.judgeSeatId === "string")
  );
}

function isValidJudgingEvent(value: unknown): boolean {
  if (
    !isRecord(value) ||
    !isNonEmptyString(value.id) ||
    !isTimestamp(value.at) ||
    typeof value.type !== "string"
  ) return false;
  switch (value.type) {
    case "session_started":
      return (
        isNonEmptyString(value.sessionId) &&
        isParticipantSnapshot(value.participant) &&
        (value.assignment === undefined || isRecord(value.assignment)) &&
        (value.question === undefined || isRecord(value.question))
      );
    case "mistake_added":
    case "mistake_undone":
    case "mistake_restored":
      return isMistakeSnapshot(value.mistake);
    case "mistake_amount_changed":
      return (
        isNonEmptyString(value.mistakeId) &&
        typeof value.glyph === "string" &&
        typeof value.label === "string" &&
        isFiniteNumber(value.from) &&
        value.from >= 0 &&
        isFiniteNumber(value.to) &&
        value.to >= 0
      );
    case "mistake_recategorized":
      return (
        isNonEmptyString(value.mistakeId) &&
        typeof value.glyph === "string" &&
        typeof value.label === "string" &&
        PINPOINT_CATEGORY_IDS.has(value.from as string) &&
        PINPOINT_CATEGORY_IDS.has(value.to as string) &&
        isFiniteNumber(value.fromAmount) &&
        value.fromAmount >= 0 &&
        isFiniteNumber(value.toAmount) &&
        value.toAmount >= 0
      );
    case "mistake_note_changed":
      return (
        isNonEmptyString(value.mistakeId) &&
        typeof value.glyph === "string" &&
        typeof value.label === "string" &&
        typeof value.from === "string" &&
        typeof value.to === "string"
      );
    case "impression_changed":
      return (
        IMPRESSION_CATEGORY_IDS.has(value.category as string) &&
        isFiniteNumber(value.from) &&
        value.from >= 0 &&
        isFiniteNumber(value.to) &&
        value.to >= 0 &&
        (value.judgeSeatId === undefined || typeof value.judgeSeatId === "string")
      );
    case "impression_note_changed":
      return (
        IMPRESSION_CATEGORY_IDS.has(value.category as string) &&
        typeof value.from === "string" &&
        typeof value.to === "string"
      );
    case "session_reopened":
      return isNonEmptyString(value.sessionId) && typeof value.reason === "string";
    case "session_finalized":
      return (
        isNonEmptyString(value.sessionId) &&
        isFiniteNumber(value.total) &&
        isFiniteNumber(value.totalMax) &&
        (value.scoreKind === undefined || value.scoreKind === "judge-section")
      );
    default:
      return false;
  }
}

export interface JudgeResultPackage {
  app: "tahqeeq";
  schema: "judge-result-v1";
  exportedAt: string;
  competition: {
    version: 2;
    id: string;
    name: string;
    edition: string;
    versionId: string | null;
    isSample: boolean;
  };
  session: SavedSession;
}

export interface StateBackupPackage {
  app: "tahqeeq";
  schema: "state-backup-v1";
  exportedAt: string;
  state: JudgingState;
}

function downloadBlob(content: BlobPart, type: string, filename: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

function safeSlug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-") || "tahqeeq";
}

export function buildJudgeResultPackage(
  session: SavedSession,
  competition: CompetitionConfig,
): JudgeResultPackage {
  return {
    app: "tahqeeq",
    schema: "judge-result-v1",
    exportedAt: new Date().toISOString(),
    competition: {
      version: 2,
      id: competition.id,
      name: competition.name,
      edition: competition.edition,
      versionId: competition.liveSnapshot?.versionId ?? null,
      isSample: Boolean(competition.isSample),
    },
    session,
  };
}

export function downloadJudgeResultPackage(
  session: SavedSession,
  competition: CompetitionConfig,
) {
  const payload = buildJudgeResultPackage(session, competition);
  downloadBlob(
    JSON.stringify(payload, null, 2),
    "application/json",
    `tahqeeq-result-${safeSlug(session.participant.number || session.participant.name)}.json`,
  );
}

export function parseJudgeResultPackage(value: unknown): JudgeResultPackage {
  const payload = value as Partial<JudgeResultPackage> | null;
  const events = payload?.session?.events;
  const impressions = payload?.session?.impressions;
  if (
    !payload ||
    payload.app !== "tahqeeq" ||
    payload.schema !== "judge-result-v1" ||
    !isNonEmptyString(payload.competition?.id) ||
    !payload.session ||
    !isNonEmptyString(payload.session.id) ||
    !isTimestamp(payload.session.savedAt) ||
    (payload.session.startedAt !== undefined &&
      !isTimestamp(payload.session.startedAt)) ||
    !isParticipantSnapshot(payload.session.participant) ||
    !isRecord(payload.session.config) ||
    !isFiniteNumber(payload.session.total) ||
    !isFiniteNumber(payload.session.totalMax) ||
    !isRecord(payload.session.assignment) ||
    typeof payload.session.notes !== "string" ||
    !Array.isArray(payload.session.mistakes) ||
    payload.session.mistakes.some((mistake) => !isMistakeSnapshot(mistake)) ||
    (impressions !== undefined &&
      (!Array.isArray(impressions) ||
        impressions.some((impression) => !isImpressionSnapshot(impression)))) ||
    typeof payload.competition.isSample !== "boolean" ||
    (events !== undefined &&
      (!Array.isArray(events) ||
        events.some((event) => !isValidJudgingEvent(event))))
  ) {
    throw new Error("This is not a complete Tahqeeq judge-result file.");
  }
  const sessionCompetitionId = payload.session.competitionId;
  const packageVersionId = payload.competition.versionId;
  const sessionVersionId = payload.session.competitionVersionId;
  if (
    (sessionCompetitionId != null &&
      (typeof sessionCompetitionId !== "string" ||
        !sessionCompetitionId.trim() ||
        sessionCompetitionId !== payload.competition.id)) ||
    (packageVersionId != null &&
      (typeof packageVersionId !== "string" || !packageVersionId.trim())) ||
    (sessionVersionId != null &&
      (typeof sessionVersionId !== "string" || !sessionVersionId.trim())) ||
    (packageVersionId != null &&
      sessionVersionId != null &&
      packageVersionId !== sessionVersionId)
  ) {
    throw new Error("This Tahqeeq judge-result file has conflicting competition identity.");
  }
  return payload as JudgeResultPackage;
}

export async function readJudgeResultFile(file: File): Promise<JudgeResultPackage> {
  try {
    return parseJudgeResultPackage(JSON.parse(await file.text()));
  } catch (error) {
    if (error instanceof Error) throw error;
    throw new Error("Could not read that result file.");
  }
}

export function buildStateBackup(state: JudgingState): StateBackupPackage {
  return {
    app: "tahqeeq",
    schema: "state-backup-v1",
    exportedAt: new Date().toISOString(),
    state,
  };
}

export function downloadStateBackup(state: JudgingState) {
  downloadBlob(
    JSON.stringify(buildStateBackup(state), null, 2),
    "application/json",
    `tahqeeq-backup-${new Date().toISOString().slice(0, 10)}.json`,
  );
}

export function parseStateBackup(value: unknown): JudgingState {
  const payload = value as Partial<StateBackupPackage> | null;
  if (
    !payload ||
    payload.app !== "tahqeeq" ||
    payload.schema !== "state-backup-v1" ||
    !payload.state ||
    !Array.isArray(payload.state.history) ||
    !Array.isArray(payload.state.roster)
  ) {
    throw new Error("This is not a complete Tahqeeq backup file.");
  }
  return payload.state;
}

export async function readStateBackupFile(file: File): Promise<JudgingState> {
  try {
    return parseStateBackup(JSON.parse(await file.text()));
  } catch (error) {
    if (error instanceof Error) throw error;
    throw new Error("Could not read that backup file.");
  }
}

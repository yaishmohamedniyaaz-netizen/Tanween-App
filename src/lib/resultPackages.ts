import type {
  CompetitionConfig,
  JudgingState,
  SavedSession,
} from "../types";
import { hasNonQuranEvidence, isPhraseMistakeSnapshot, stateHasNonQuranEvidence, PHRASE_READER_VERSION } from "./phraseEvidence.ts";
import { projectMistakes } from "./judgingLedger.ts";

const PINPOINT_CATEGORY_IDS = new Set(["jali", "khafi", "fasaha"]);
const IMPRESSION_CATEGORY_IDS = new Set(["adu-raagu"]);
const MAX_DATE_TIMESTAMP = 8_640_000_000_000_000;

function canonical(value: unknown): string {
  const sort = (item: unknown): unknown => Array.isArray(item) ? item.map(sort)
    : isRecord(item) ? Object.fromEntries(Object.keys(item).sort().map(key => [key, sort(item[key])])) : item;
  return JSON.stringify(sort(value));
}

/** V2 containers keep one verifiable cache and ledger, including undone phrase evidence. */
function validatePhraseContainer(value: unknown, judgeSeatId?: string, sessionId?: string, categories?: readonly string[]): void {
  // A new backup can contain older Quran-only records with no ledger at all.
  if (!hasNonQuranEvidence(value)) return;
  if (!isRecord(value) || !Array.isArray(value.mistakes) || !Array.isArray(value.events) ||
      value.mistakes.some(item => !isMistakeSnapshot(item)) || value.events.some(item => !isValidJudgingEvent(item))) {
    throw new Error("This phrase-evidence container is incomplete or unsupported.");
  }
  if (!judgeSeatId || !sessionId) {
    throw new Error("Phrase evidence needs its recitation and judge identity.");
  }
  const snapshots = [...value.mistakes, ...value.events.flatMap(event => isRecord(event) && "mistake" in event ? [event.mistake] : [])];
  if (snapshots.some(item => isRecord(item) && item.evidenceKind === "phrase" && item.judgeSeatId !== judgeSeatId)) {
    throw new Error("Phrase evidence belongs to a different judge.");
  }
  const starts = value.events.filter(event => isRecord(event) && event.type === "session_started");
  const start = starts[0] as Record<string, unknown>;
  const identityMatches = start && (start.sessionId === sessionId ||
    value.sourceSessionId === start.sessionId || value.events.some(event =>
      isRecord(event) && event.type === "session_reopened" && event.sessionId === sessionId));
  if (starts.length !== 1 || !identityMatches || !isRecord(start.assignment) ||
      start.assignment.judgeSeatId !== judgeSeatId || !Array.isArray(categories) ||
      canonical(start.assignment.categories) !== canonical(categories)) {
    throw new Error("Phrase evidence has conflicting recitation or judge assignment.");
  }
  const phraseIds = new Set(snapshots.filter(isPhraseMistakeSnapshot).map(item => item.id));
  const active = new Map<string, Record<string, unknown>>();
  const removed = new Map<string, Record<string, unknown>>();
  const seen = new Set<string>();
  for (const raw of value.events) {
    const event = raw as Record<string, unknown>;
    const snapshot = isRecord(event.mistake) ? event.mistake : undefined;
    const id = snapshot?.id ?? event.mistakeId;
    if (typeof id !== "string" || !phraseIds.has(id)) continue;
    const current = active.get(id);
    const targetAlreadyActive = snapshot && [...active.values()].some(item =>
      item.tid === snapshot.tid && item.judgeSeatId === snapshot.judgeSeatId);
    const fail = () => { throw new Error("The phrase ledger contains a conflicting finding or correction."); };
    if (snapshot && (!isPhraseMistakeSnapshot(snapshot) || !categories.includes(snapshot.category as string))) fail();
    switch (event.type) {
      case "mistake_added":
        if (seen.has(id) || !snapshot || targetAlreadyActive) fail();
        seen.add(id); active.set(id, { ...snapshot }); break;
      case "mistake_undone":
        if (!current || canonical(current) !== canonical(snapshot)) fail();
        removed.set(id, current!); active.delete(id); break;
      case "mistake_restored":
        if (current || targetAlreadyActive || !removed.has(id) || canonical(removed.get(id)) !== canonical(snapshot)) fail();
        active.set(id, { ...snapshot }); removed.delete(id); break;
      case "mistake_amount_changed":
      case "mistake_note_changed":
      case "mistake_recategorized": {
        if (!current || event.glyph !== current.glyph || event.label !== current.label) fail();
        if (event.type === "mistake_amount_changed") {
          if (event.from !== current!.amount) fail();
          active.set(id, { ...current, amount: event.to });
        } else if (event.type === "mistake_note_changed") {
          if (event.from !== (current!.note ?? "")) fail();
          active.set(id, { ...current, note: event.to });
        } else {
          if (event.from !== current!.category || event.fromAmount !== current!.amount || !categories.includes(event.to as string)) fail();
          active.set(id, { ...current, category: event.to, amount: event.toAmount });
        }
        break;
      }
    }
  }
  if (new Set(value.events.map(event => (event as {id: string}).id)).size !== value.events.length ||
      new Set(value.mistakes.map(item => (item as {id: string}).id)).size !== value.mistakes.length) {
    throw new Error("Duplicate evidence identities cannot be counted safely.");
  }
  const projected = projectMistakes(value.events as NonNullable<SavedSession["events"]>);
  const order = (items: unknown[]) => [...items].sort((a, b) => String((a as {id: string}).id).localeCompare(String((b as {id: string}).id)));
  if (canonical(order(projected)) !== canonical(order(value.mistakes))) {
    throw new Error("The phrase ledger does not agree with its saved evidence.");
  }
}

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
  if (value.evidenceKind === "phrase") return isPhraseMistakeSnapshot(value);
  if (hasNonQuranEvidence({ mistakes: [value] })) return false;
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
  schema: "judge-result-v1" | "judge-result-v2";
  minimumReaderVersion?: 3;
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
  schema: "state-backup-v1" | "state-backup-v2";
  minimumReaderVersion?: 3;
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

export function validateSavedPhraseSession(session: SavedSession): void {
  if (!hasNonQuranEvidence(session)) return;
  if (session.ledgerVersion !== 3) throw new Error("Phrase history needs its ledger version.");
  validatePhraseContainer(session, session.assignment?.judgeSeatId, session.id, session.assignment?.categories);
}

export function buildJudgeResultPackage(
  session: SavedSession,
  competition: CompetitionConfig,
): JudgeResultPackage {
  const payload: JudgeResultPackage = {
    app: "tahqeeq",
    schema: hasNonQuranEvidence(session) ? "judge-result-v2" : "judge-result-v1",
    ...(hasNonQuranEvidence(session) ? { minimumReaderVersion: PHRASE_READER_VERSION } : {}),
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
  return payload.schema === "judge-result-v2" ? parseJudgeResultPackage(payload) : payload;
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
    !["judge-result-v1", "judge-result-v2"].includes(payload.schema ?? "") ||
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
  if (payload.schema === "judge-result-v1" && (hasNonQuranEvidence(payload.session) || payload.minimumReaderVersion !== undefined || payload.session.ledgerVersion === 3)) {
    throw new Error("Phrase evidence requires a version 2 result file. It cannot be read as Quran-only evidence.");
  }
  if (payload.schema === "judge-result-v2") {
    if (payload.minimumReaderVersion !== PHRASE_READER_VERSION || payload.session.ledgerVersion !== 3) {
      throw new Error("This result requires a supported phrase-evidence reader version.");
    }
    validatePhraseContainer(payload.session, payload.session.assignment?.judgeSeatId, payload.session.id, payload.session.assignment?.categories);
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
    const payload = parseJudgeResultPackage(JSON.parse(await file.text()));
    return payload;
  } catch (error) {
    if (error instanceof Error) throw error;
    throw new Error("Could not read that result file.");
  }
}

export function buildStateBackup(state: JudgingState): StateBackupPackage {
  const payload: StateBackupPackage = {
    app: "tahqeeq",
    schema: stateHasNonQuranEvidence(state) ? "state-backup-v2" : "state-backup-v1",
    ...(stateHasNonQuranEvidence(state) ? { minimumReaderVersion: PHRASE_READER_VERSION } : {}),
    exportedAt: new Date().toISOString(),
    state,
  };
  if (payload.schema === "state-backup-v2") parseStateBackup(payload);
  return payload;
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
    !["state-backup-v1", "state-backup-v2"].includes(payload.schema ?? "") ||
    !payload.state ||
    !Array.isArray(payload.state.history) ||
    !Array.isArray(payload.state.roster)
  ) {
    throw new Error("This is not a complete Tahqeeq backup file.");
  }
  if (payload.schema === "state-backup-v1" && (stateHasNonQuranEvidence(payload.state) || payload.minimumReaderVersion !== undefined)) {
    throw new Error("Phrase evidence requires a version 2 backup. It cannot be restored as Quran-only evidence.");
  }
  if (payload.schema === "state-backup-v2") {
    if (payload.minimumReaderVersion !== PHRASE_READER_VERSION) throw new Error("This backup requires a supported phrase-evidence reader version.");
    validatePhraseContainer(payload.state, payload.state.activeAssignment?.judgeSeatId, payload.state.activeSessionId ?? undefined, payload.state.activeAssignment?.categories);
    for (const session of payload.state.history) {
      if (hasNonQuranEvidence(session) && session.ledgerVersion !== 3) throw new Error("Phrase history needs its ledger version.");
      validatePhraseContainer(session, session.assignment?.judgeSeatId, session.id, session.assignment?.categories);
    }
  }
  return payload.state;
}

export async function readStateBackupFile(file: File): Promise<JudgingState> {
  try {
    const state = parseStateBackup(JSON.parse(await file.text()));
    return state;
  } catch (error) {
    if (error instanceof Error) throw error;
    throw new Error("Could not read that backup file.");
  }
}

import type {
  CompetitionConfig,
  JudgingState,
  SavedSession,
} from "../types";

export interface JudgeResultPackage {
  app: "tahqeeq";
  schema: "judge-result-v1";
  exportedAt: string;
  competition: CompetitionConfig;
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
    competition,
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
  if (
    !payload ||
    payload.app !== "tahqeeq" ||
    payload.schema !== "judge-result-v1" ||
    !payload.competition?.id ||
    !payload.session?.id ||
    !payload.session.participant?.name ||
    !payload.session.assignment ||
    !Array.isArray(payload.session.mistakes)
  ) {
    throw new Error("This is not a complete Tahqeeq judge-result file.");
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

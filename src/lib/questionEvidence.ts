import type {
  CategoryId,
  Mistake,
  RecitationRangeSnapshot,
  ReciterQuestionAssignment,
  SavedSession,
} from "../types.ts";
import { judgeDisplayName } from "./judgeAssignments.ts";
import { normalizeQuestionAssignment } from "./reciterQuestions.ts";
import type { ParticipantResultCandidate } from "./finalResults.ts";

export type QuestionEvidenceStatus =
  | "ready"
  | "source-missing"
  | "legacy-missing"
  | "manual-missing"
  | "source-conflict"
  | "version-mismatch";

export interface EvidenceMistake {
  key: string;
  mistake: Mistake;
  sessionId: string;
  sessionRevision: number;
  judgeSeatId: string;
  judgeName: string;
}

export interface ParticipantQuestionEvidence {
  status: QuestionEvidenceStatus;
  question: ReciterQuestionAssignment | null;
  range: RecitationRangeSnapshot | null;
  fingerprint: string | null;
  selectedSessions: SavedSession[];
  mistakes: EvidenceMistake[];
}

export type ImportedQuestionInspection =
  | { ok: true; question: ReciterQuestionAssignment | null }
  | {
      ok: false;
      reason:
        | "invalid-events"
        | "invalid-question"
        | "question-conflict"
        | "version-missing";
    };

function stableHash(value: string): string {
  let result = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    result ^= value.charCodeAt(index);
    result = Math.imul(result, 0x01000193);
  }
  return (result >>> 0).toString(36);
}

function semanticRangeKey(range: RecitationRangeSnapshot): string {
  return [
    range.startAyah.surah,
    range.startAyah.ayah,
    range.endAyah.surah,
    range.endAyah.ayah,
    range.requestedLines,
    range.resolvedLines,
    range.extensionLines,
    range.startPage,
    range.startLine,
    range.startWordId,
    range.endPage,
    range.endLine,
    range.endWordId,
    range.endMarkerId,
    range.finalPrintedLineScoring,
  ].join("|");
}

function provenanceKey(range: RecitationRangeSnapshot): string {
  return [
    range.mushafLayout,
    range.sourceVersion,
    range.questionIndexVersion,
    range.layoutHash,
  ].join("|");
}

function semanticQuestionKey(
  session: Pick<SavedSession, "competitionId"> | undefined,
  question: ReciterQuestionAssignment,
): string | null {
  if (question.version !== 2 || !question.range) return null;
  return [
    "question-evidence-v1",
    session?.competitionId ?? "",
    question.kind,
    question.participantId,
    question.divisionId,
    question.muqarrar,
    semanticRangeKey(question.range),
  ].join("|");
}

function questionProvenanceKey(
  session: Pick<SavedSession, "competitionVersionId"> | undefined,
  question: ReciterQuestionAssignment,
): string | null {
  if (question.version !== 2 || !question.range) return null;
  return [
    session?.competitionVersionId ?? "",
    provenanceKey(question.range),
  ].join("|");
}

export function questionEvidenceExactKey(
  session: Pick<SavedSession, "competitionId" | "competitionVersionId"> | undefined,
  question: ReciterQuestionAssignment,
): string | null {
  const semantic = semanticQuestionKey(session, question);
  const provenance = questionProvenanceKey(session, question);
  return semantic && provenance ? `${semantic}|${provenance}` : null;
}

export function questionEvidenceFingerprint(
  question: ReciterQuestionAssignment,
  session?: Pick<SavedSession, "competitionId" | "competitionVersionId">,
): string | null {
  const value = questionEvidenceExactKey(session, question);
  return value ? `qev1-${stableHash(value)}` : null;
}

export function inspectImportedSessionQuestion(
  session: { question?: unknown; events?: unknown },
  context: Pick<SavedSession, "competitionId" | "competitionVersionId">,
): ImportedQuestionInspection {
  if (session.events !== undefined && !Array.isArray(session.events)) {
    return { ok: false, reason: "invalid-events" };
  }
  const sessionStarted = session.events?.find((event) => {
    const candidate = event as { type?: unknown; question?: unknown } | null;
    return candidate?.type === "session_started" && candidate.question != null;
  }) as { question?: unknown } | undefined;
  const eventQuestionRaw = sessionStarted?.question;
  const topLevelQuestion = normalizeQuestionAssignment(
    session.question as Parameters<typeof normalizeQuestionAssignment>[0],
  );
  const eventQuestion = normalizeQuestionAssignment(
    eventQuestionRaw as Parameters<typeof normalizeQuestionAssignment>[0],
  );
  if (
    (session.question != null && !topLevelQuestion) ||
    (eventQuestionRaw != null && !eventQuestion)
  ) {
    return { ok: false, reason: "invalid-question" };
  }
  if (topLevelQuestion && eventQuestion) {
    const topLevelKey = questionEvidenceExactKey(context, topLevelQuestion);
    const eventKey = questionEvidenceExactKey(context, eventQuestion);
    const questionsAgree = topLevelKey || eventKey
      ? Boolean(topLevelKey && eventKey && topLevelKey === eventKey)
      : JSON.stringify(topLevelQuestion) === JSON.stringify(eventQuestion);
    if (!questionsAgree) {
      return { ok: false, reason: "question-conflict" };
    }
  }
  const question = topLevelQuestion ?? eventQuestion;
  if (
    question?.version === 2 &&
    question.range &&
    !context.competitionVersionId
  ) {
    return { ok: false, reason: "version-missing" };
  }
  return { ok: true, question };
}

export function selectedSessionsForCandidate(
  candidate: ParticipantResultCandidate,
  selectedSessionIds: Partial<Record<CategoryId, string>>,
): SavedSession[] {
  const sessions = new Map<string, SavedSession>();
  for (const category of candidate.categories) {
    const options = candidate.byCategory[category];
    const selectedId = selectedSessionIds[category] ??
      (options.length === 1 ? options[0].id : "");
    const selected = options.find((option) => option.id === selectedId);
    if (selected) sessions.set(selected.id, selected);
  }
  return [...sessions.values()];
}

function selectedMistakes(
  candidate: ParticipantResultCandidate,
  selectedSessionIds: Partial<Record<CategoryId, string>>,
): EvidenceMistake[] {
  const mistakes = new Map<string, EvidenceMistake>();
  for (const category of candidate.categories) {
    const options = candidate.byCategory[category];
    const selectedId = selectedSessionIds[category] ??
      (options.length === 1 ? options[0].id : "");
    const session = options.find((option) => option.id === selectedId);
    if (!session) continue;
    for (const mistake of session.mistakes) {
      if (mistake.category !== category) continue;
      const key = `${session.id}:${mistake.id}`;
      mistakes.set(key, {
        key,
        mistake,
        sessionId: session.id,
        sessionRevision: session.revision ?? 1,
        judgeSeatId: session.assignment?.judgeSeatId ?? "judge-1",
        judgeName: session.assignment
          ? judgeDisplayName(session.assignment)
          : "Judge 1",
      });
    }
  }
  return [...mistakes.values()].sort((left, right) =>
    (left.mistake.page ?? Number.MAX_SAFE_INTEGER) -
      (right.mistake.page ?? Number.MAX_SAFE_INTEGER) ||
    left.mistake.surah - right.mistake.surah ||
    (left.mistake.ayah ?? 0) - (right.mistake.ayah ?? 0) ||
    (left.mistake.sourceStart ?? Number.MAX_SAFE_INTEGER) -
      (right.mistake.sourceStart ?? Number.MAX_SAFE_INTEGER) ||
    left.mistake.ts - right.mistake.ts ||
    left.key.localeCompare(right.key),
  );
}

export function buildParticipantQuestionEvidence(
  candidate: ParticipantResultCandidate,
  selectedSessionIds: Partial<Record<CategoryId, string>>,
): ParticipantQuestionEvidence {
  const selectedSessions = selectedSessionsForCandidate(
    candidate,
    selectedSessionIds,
  );
  const mistakes = selectedMistakes(candidate, selectedSessionIds);
  const selectionIncomplete = candidate.categories.some((category) => {
    const options = candidate.byCategory[category];
    const selectedId = selectedSessionIds[category] ??
      (options.length === 1 ? options[0].id : "");
    return !options.some((option) => option.id === selectedId);
  });
  if (selectedSessions.length === 0 || selectionIncomplete) {
    return {
      status: "source-missing",
      question: null,
      range: null,
      fingerprint: null,
      selectedSessions,
      mistakes,
    };
  }
  const missingQuestion = selectedSessions.find((session) => !session.question);
  if (missingQuestion) {
    return {
      status: "legacy-missing",
      question: null,
      range: null,
      fingerprint: null,
      selectedSessions,
      mistakes,
    };
  }
  const records = selectedSessions.map((session) => ({
    session,
    question: session.question!,
  }));
  const manualQuestion = records.find(
    ({ question }) => question.kind === "manual",
  );
  if (manualQuestion) {
    return {
      status: "manual-missing",
      question: manualQuestion.question,
      range: null,
      fingerprint: null,
      selectedSessions,
      mistakes,
    };
  }
  const legacyWithoutRange = records.find(
    ({ question }) => question.version !== 2 || !question.range,
  );
  if (legacyWithoutRange) {
    return {
      status: "legacy-missing",
      question: legacyWithoutRange.question,
      range: null,
      fingerprint: null,
      selectedSessions,
      mistakes,
    };
  }
  const semanticKeys = new Set(
    records.map(({ session, question }) => semanticQuestionKey(session, question)),
  );
  if (semanticKeys.size > 1) {
    return {
      status: "source-conflict",
      question: null,
      range: null,
      fingerprint: null,
      selectedSessions,
      mistakes,
    };
  }
  const provenanceKeys = new Set(
    records.map(({ session, question }) => questionProvenanceKey(session, question)),
  );
  if (provenanceKeys.size > 1) {
    return {
      status: "version-mismatch",
      question: null,
      range: null,
      fingerprint: null,
      selectedSessions,
      mistakes,
    };
  }
  const { question, session } = records[0];
  return {
    status: "ready",
    question,
    range: question.range!,
    fingerprint: questionEvidenceFingerprint(question, session),
    selectedSessions,
    mistakes,
  };
}

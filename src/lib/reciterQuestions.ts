import type {
  CompetitionDivision,
  CompetitionQuestionDraft,
  MuqarrarSide,
  Participant,
  QuestionMuqarrar,
  RecitationRangeSnapshot,
  ReciterQuestionAssignment,
} from "../types.ts";
import { MUSHAF_LAYOUT } from "./mushafContract.ts";

const eligibleSide = (
  questionSide: QuestionMuqarrar,
  participantSide: MuqarrarSide,
) => Boolean(participantSide) && (questionSide === "both" || questionSide === participantSide);

export function participantDivision(
  participant: Participant,
  divisions: CompetitionDivision[],
): CompetitionDivision | undefined {
  const ageGroup = participant.ageGroup.trim().toLocaleLowerCase();
  return divisions.find(
    (division) =>
      division.ageGroup.trim().toLocaleLowerCase() === ageGroup &&
      division.category === participant.category,
  );
}

export function eligibleQuestionDrafts(input: {
  participant: Participant;
  divisions: CompetitionDivision[];
  drafts: CompetitionQuestionDraft[];
  competitionId: string;
}): CompetitionQuestionDraft[] {
  const division = participantDivision(input.participant, input.divisions);
  if (!division || !input.participant.muqarrar) return [];
  return input.drafts
    .filter(
      (draft) =>
        draft.competitionId === input.competitionId &&
        draft.divisionId === division.id &&
        eligibleSide(draft.muqarrar, input.participant.muqarrar),
    )
    .sort((left, right) => {
      if (left.startPage !== right.startPage) return left.startPage - right.startPage;
      if (left.startLine !== right.startLine) return left.startLine - right.startLine;
      return left.id.localeCompare(right.id);
    });
}

export function questionRangeLabel(
  value: Pick<CompetitionQuestionDraft, "startAyah" | "endAyah">,
): string {
  return `${value.startAyah.surah}:${value.startAyah.ayah}–${value.endAyah.surah}:${value.endAyah.ayah}`;
}

export function assignmentFromDraft(input: {
  draft: CompetitionQuestionDraft;
  participant: Participant;
  selectedAt?: number;
}): ReciterQuestionAssignment | null {
  if (!input.participant.muqarrar || !eligibleSide(input.draft.muqarrar, input.participant.muqarrar)) {
    return null;
  }
  return {
    version: 2,
    id: `question-assignment:${input.participant.id}:${input.draft.id}`,
    kind: "prepared-draft",
    participantId: input.participant.id,
    divisionId: input.draft.divisionId,
    muqarrar: input.participant.muqarrar,
    selectedAt: input.selectedAt ?? Date.now(),
    label: questionRangeLabel(input.draft),
    sourceQuestionId: input.draft.id,
    startAyah: { ...input.draft.startAyah },
    endAyah: { ...input.draft.endAyah },
    requestedLines: input.draft.requestedLines,
    resolvedLines: input.draft.resolvedLines,
    startPage: input.draft.startPage,
    endPage: input.draft.endPage,
    sourceVersion: input.draft.sourceVersion,
    questionIndexVersion: input.draft.questionIndexVersion,
    layoutHash: input.draft.layoutHash,
    range: {
      version: 1,
      startAyah: { ...input.draft.startAyah },
      endAyah: { ...input.draft.endAyah },
      requestedLines: input.draft.requestedLines,
      resolvedLines: input.draft.resolvedLines,
      extensionLines: input.draft.extensionLines,
      startPage: input.draft.startPage,
      startLine: input.draft.startLine,
      endPage: input.draft.endPage,
      endLine: input.draft.endLine,
      startWordId: input.draft.startWordId,
      endWordId: input.draft.endWordId,
      endMarkerId: input.draft.endMarkerId,
      finalPrintedLineScoring: input.draft.finalPrintedLineScoring,
      mushafLayout: MUSHAF_LAYOUT,
      sourceVersion: input.draft.sourceVersion,
      questionIndexVersion: input.draft.questionIndexVersion,
      layoutHash: input.draft.layoutHash,
    },
  };
}

export function manualQuestionAssignment(input: {
  participant: Participant;
  division: CompetitionDivision;
  selectedAt?: number;
}): ReciterQuestionAssignment | null {
  if (!input.participant.muqarrar) return null;
  return {
    version: 1,
    id: `question-assignment:${input.participant.id}:manual`,
    kind: "manual",
    participantId: input.participant.id,
    divisionId: input.division.id,
    muqarrar: input.participant.muqarrar,
    selectedAt: input.selectedAt ?? Date.now(),
    label: "External question",
  };
}

export function normalizeQuestionAssignment(
  value: Partial<ReciterQuestionAssignment> | null | undefined,
): ReciterQuestionAssignment | null {
  if (
    (value?.version !== 1 && value?.version !== 2) ||
    (value.kind !== "prepared-draft" && value.kind !== "manual") ||
    !value.id ||
    !value.participantId ||
    !value.divisionId ||
    (value.muqarrar !== "feshey-kolhu" && value.muqarrar !== "nimey-kolhu") ||
    !Number.isFinite(value.selectedAt) ||
    !value.label
  ) {
    return null;
  }
  if (value.kind === "prepared-draft" && !value.sourceQuestionId) return null;
  const range = value.version === 2
    ? normalizeRecitationRangeSnapshot(value.range)
    : null;
  if (value.version === 2 && value.kind === "prepared-draft" && !range) return null;
  const replacements = Array.isArray(value.replacements)
    ? value.replacements.flatMap((record) => {
        if (
          record?.version !== 1 ||
          !record.id ||
          !Number.isFinite(record.replacedAt) ||
          (record.reason !== "question-changed" &&
            record.reason !== "reciter-changed") ||
          !record.fromParticipantId ||
          !record.fromQuestionId ||
          !record.toParticipantId ||
          !record.toQuestionId
        ) return [];
        return [{
          version: 1 as const,
          id: String(record.id),
          replacedAt: Number(record.replacedAt),
          reason: record.reason,
          fromParticipantId: String(record.fromParticipantId),
          fromQuestionId: String(record.fromQuestionId),
          ...(record.fromDrawId ? { fromDrawId: String(record.fromDrawId) } : {}),
          toParticipantId: String(record.toParticipantId),
          toQuestionId: String(record.toQuestionId),
          ...(record.toDrawId ? { toDrawId: String(record.toDrawId) } : {}),
        }];
      })
    : [];
  return {
    version: value.version,
    kind: value.kind,
    id: String(value.id),
    participantId: String(value.participantId),
    divisionId: String(value.divisionId),
    muqarrar: value.muqarrar,
    selectedAt: Number(value.selectedAt),
    label: String(value.label),
    ...(value.sourceQuestionId
      ? { sourceQuestionId: String(value.sourceQuestionId) }
      : {}),
    ...(ayahRef(value.startAyah)
      ? { startAyah: { ...value.startAyah } }
      : {}),
    ...(ayahRef(value.endAyah)
      ? { endAyah: { ...value.endAyah } }
      : {}),
    ...(positiveInteger(value.requestedLines)
      ? { requestedLines: Number(value.requestedLines) }
      : {}),
    ...(positiveInteger(value.resolvedLines)
      ? { resolvedLines: Number(value.resolvedLines) }
      : {}),
    ...(positiveInteger(value.startPage)
      ? { startPage: Number(value.startPage) }
      : {}),
    ...(positiveInteger(value.endPage)
      ? { endPage: Number(value.endPage) }
      : {}),
    ...(value.sourceVersion
      ? { sourceVersion: String(value.sourceVersion) }
      : {}),
    ...(value.questionIndexVersion
      ? { questionIndexVersion: String(value.questionIndexVersion) }
      : {}),
    ...(value.layoutHash ? { layoutHash: String(value.layoutHash) } : {}),
    ...(value.drawId ? { drawId: String(value.drawId) } : {}),
    ...(Number.isInteger(value.drawPosition) && Number(value.drawPosition) > 0
      ? { drawPosition: Number(value.drawPosition) }
      : {}),
    ...(Number.isInteger(value.drawCycle) && Number(value.drawCycle) > 0
      ? { drawCycle: Number(value.drawCycle) }
      : {}),
    ...(replacements.length ? { replacements } : {}),
    ...(range ? { range } : {}),
  } as ReciterQuestionAssignment;
}

function positiveInteger(value: unknown): value is number {
  return Number.isInteger(value) && Number(value) > 0;
}

function ayahRef(value: unknown): value is { surah: number; ayah: number } {
  const candidate = value as { surah?: unknown; ayah?: unknown } | null;
  return Boolean(
    candidate &&
    positiveInteger(candidate.surah) &&
    positiveInteger(candidate.ayah),
  );
}

export function normalizeRecitationRangeSnapshot(
  value: Partial<RecitationRangeSnapshot> | null | undefined,
): RecitationRangeSnapshot | null {
  if (
    value?.version !== 1 ||
    !ayahRef(value.startAyah) ||
    !ayahRef(value.endAyah) ||
    !positiveInteger(value.requestedLines) ||
    !positiveInteger(value.resolvedLines) ||
    !Number.isInteger(value.extensionLines) ||
    Number(value.extensionLines) < 0 ||
    !positiveInteger(value.startPage) ||
    !positiveInteger(value.startLine) ||
    !positiveInteger(value.endPage) ||
    !positiveInteger(value.endLine) ||
    Number(value.startPage) > Number(value.endPage) ||
    (Number(value.startPage) === Number(value.endPage) &&
      Number(value.startLine) > Number(value.endLine)) ||
    Number(value.startPage) > 604 ||
    Number(value.endPage) > 604 ||
    Number(value.startLine) > 15 ||
    Number(value.endLine) > 15 ||
    Number(value.resolvedLines) < Number(value.requestedLines) ||
    Number(value.extensionLines) !==
      Number(value.resolvedLines) - Number(value.requestedLines) ||
    !value.startWordId ||
    !value.endWordId ||
    !value.endMarkerId ||
    (value.finalPrintedLineScoring !== "include" &&
      value.finalPrintedLineScoring !== "exclude") ||
    !value.mushafLayout ||
    !value.sourceVersion ||
    !value.questionIndexVersion ||
    !/^sha256:[a-f0-9]{64}$/i.test(String(value.layoutHash ?? ""))
  ) {
    return null;
  }
  return {
    version: 1,
    startAyah: { ...value.startAyah },
    endAyah: { ...value.endAyah },
    requestedLines: Number(value.requestedLines),
    resolvedLines: Number(value.resolvedLines),
    extensionLines: Number(value.extensionLines),
    startPage: Number(value.startPage),
    startLine: Number(value.startLine),
    endPage: Number(value.endPage),
    endLine: Number(value.endLine),
    startWordId: String(value.startWordId),
    endWordId: String(value.endWordId),
    endMarkerId: String(value.endMarkerId),
    finalPrintedLineScoring: value.finalPrintedLineScoring,
    mushafLayout: String(value.mushafLayout),
    sourceVersion: String(value.sourceVersion),
    questionIndexVersion: String(value.questionIndexVersion),
    layoutHash: String(value.layoutHash),
  };
}

export function questionStartPage(
  question: Pick<
    ReciterQuestionAssignment,
    "version" | "range" | "startPage"
  > | null | undefined,
): number | null {
  const page = question?.version === 2
    ? question.range?.startPage ?? question.startPage
    : question?.startPage;
  return positiveInteger(page) && page <= 604 ? Number(page) : null;
}

export function questionAssignmentIsValid(input: {
  question: ReciterQuestionAssignment;
  participant: Participant;
  divisions: CompetitionDivision[];
  drafts: CompetitionQuestionDraft[];
  competitionId: string;
  allowManual: boolean;
}): boolean {
  const division = participantDivision(input.participant, input.divisions);
  if (
    !division ||
    !input.participant.muqarrar ||
    input.question.participantId !== input.participant.id ||
    input.question.divisionId !== division.id ||
    input.question.muqarrar !== input.participant.muqarrar
  ) {
    return false;
  }
  if (input.question.kind === "manual") return input.allowManual;
  const draft = input.drafts.find(
    (candidate) =>
      candidate.id === input.question.sourceQuestionId &&
      candidate.competitionId === input.competitionId,
  );
  const expected = draft
    ? assignmentFromDraft({
        draft,
        participant: input.participant,
        selectedAt: input.question.selectedAt,
      })
    : null;
  const rangeMatches = Boolean(
    expected?.range &&
      input.question.range &&
      JSON.stringify(expected.range) === JSON.stringify(input.question.range),
  );
  return Boolean(
    expected &&
      expected.divisionId === input.question.divisionId &&
      expected.label === input.question.label &&
      expected.sourceQuestionId === input.question.sourceQuestionId &&
      expected.layoutHash === input.question.layoutHash &&
      (input.question.version === 1 || rangeMatches),
  );
}

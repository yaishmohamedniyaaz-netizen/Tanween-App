import type {
  CompetitionDivision,
  CompetitionQuestionDraft,
  MuqarrarSide,
  Participant,
  QuestionMuqarrar,
  ReciterQuestionAssignment,
} from "../types.ts";

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
    version: 1,
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
    value?.version !== 1 ||
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
  return {
    ...value,
    version: 1,
    kind: value.kind,
    id: String(value.id),
    participantId: String(value.participantId),
    divisionId: String(value.divisionId),
    muqarrar: value.muqarrar,
    selectedAt: Number(value.selectedAt),
    label: String(value.label),
  } as ReciterQuestionAssignment;
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
  return Boolean(
    expected &&
      expected.divisionId === input.question.divisionId &&
      expected.label === input.question.label &&
      expected.layoutHash === input.question.layoutHash,
  );
}

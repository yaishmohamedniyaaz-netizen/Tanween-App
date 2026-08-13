import type {
  PreparedRecitation,
  ScoreConfig,
} from "../types.ts";
import { normalizeAssignment } from "./judgeAssignments.ts";
import { normalizeParticipant } from "./participants.ts";
import { normalizeQuestionAssignment } from "./reciterQuestions.ts";

/** Restores only complete Prepared evidence; partial state never unlocks judging. */
export function normalizePreparedRecitation(
  value: Partial<PreparedRecitation> | null | undefined,
  fallbackConfig: ScoreConfig,
): PreparedRecitation | null {
  if (
    value?.version !== 1 ||
    !value.id ||
    !value.participant ||
    !value.assignment ||
    !value.question ||
    !Number.isFinite(value.preparedAt)
  ) {
    return null;
  }
  const question = normalizeQuestionAssignment(value.question);
  const participant = normalizeParticipant(value.participant);
  if (
    !question ||
    question.participantId !== participant.id ||
    (question.kind === "prepared-draft" &&
      (!question.drawId || !question.drawPosition || !question.drawCycle))
  ) return null;
  return {
    version: 1,
    id: String(value.id),
    participant,
    assignment: normalizeAssignment(value.assignment, fallbackConfig),
    question,
    preparedAt: Number(value.preparedAt),
  };
}

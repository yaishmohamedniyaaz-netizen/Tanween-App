import type { ReciterQuestionAssignment } from "../types";

export const FIRST_PAGE = 1;
export const LAST_PAGE = 604;

/**
 * Identifies the reciter/question pairing the Mushaf has already been opened
 * for. Keyed on the session as well as the question because a question id is
 * stable per participant: re-judging the same passage starts a new session and
 * must reopen the page, while a refresh inside one session must not.
 */
export function questionOpeningKey(
  sessionId: string | null | undefined,
  question: Pick<ReciterQuestionAssignment, "id"> | null | undefined,
): string | null {
  if (!sessionId) return null;
  return `${sessionId}:${question?.id ?? "none"}`;
}

/**
 * Page the Mushaf should open on for a question, or null to leave the current
 * page alone.
 *
 * Manual questions are read from a printed sheet and carry no page, so there is
 * nothing to open. A page outside the Mushaf is treated the same way rather
 * than clamped: showing page 604 because the stored value was 9999 would put
 * the judge on the wrong passage without saying so.
 */
export function questionOpeningPage(
  question: Pick<ReciterQuestionAssignment, "startPage"> | null | undefined,
): number | null {
  const page = question?.startPage;
  if (typeof page !== "number" || !Number.isInteger(page)) return null;
  if (page < FIRST_PAGE || page > LAST_PAGE) return null;
  return page;
}

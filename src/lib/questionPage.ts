import type { ReciterQuestionAssignment } from "../types";
import { questionStartPage } from "./reciterQuestions.ts";

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
  question: Pick<
    ReciterQuestionAssignment,
    "version" | "range" | "startPage"
  > | null | undefined,
): number | null {
  return questionStartPage(question);
}

function validQuestionPage(value: unknown): value is number {
  return Number.isInteger(value) && Number(value) >= FIRST_PAGE && Number(value) <= LAST_PAGE;
}

/**
 * Whether one of the currently rendered pages intersects the selected
 * question. A null result means there is no trustworthy page-backed question
 * to return to (for example, a manual question).
 */
export function questionIsVisibleOnPages(
  question: Pick<
    ReciterQuestionAssignment,
    "version" | "range" | "startPage" | "endPage"
  > | null | undefined,
  visiblePages: readonly number[],
): boolean | null {
  const startPage = questionOpeningPage(question);
  if (startPage === null) return null;
  const storedEndPage = question?.version === 2
    ? question.range?.endPage ?? question.endPage
    : question?.endPage;
  const endPage = validQuestionPage(storedEndPage) && storedEndPage >= startPage
    ? storedEndPage
    : startPage;
  return visiblePages.some(
    (page) => validQuestionPage(page) && page >= startPage && page <= endPage,
  );
}

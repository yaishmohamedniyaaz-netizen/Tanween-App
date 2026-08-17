import type { CompetitionDivision, PreparedRecitation } from "../types";
import { ParticipantIdentity } from "./ParticipantIdentity";

function questionSummary(prepared: PreparedRecitation): string {
  const { question } = prepared;
  const choice =
    question.kind === "manual"
      ? "External question"
      : question.drawPosition
        ? `Number ${question.drawPosition}`
        : "Question";
  return question.startPage ? `${choice} · page ${question.startPage}` : choice;
}

export function PreparedSidebar({
  prepared,
  participantCount,
  division,
  onReady,
  onChangeQuestion,
  onChangeReciter,
}: {
  prepared: PreparedRecitation;
  participantCount: number;
  division?: CompetitionDivision;
  onReady: () => void;
  onChangeQuestion: () => void;
  onChangeReciter: () => void;
}) {
  return (
    <section className="prepared-sidebar" aria-label="Ready to begin judging">
      <ParticipantIdentity
        participant={prepared.participant}
        participantCount={participantCount}
        division={division}
        density="lead"
        className="prepared-sidebar-participant"
      />
      <div className="prepared-sidebar-question">
        <span>Prepared question</span>
        <strong>{questionSummary(prepared)}</strong>
      </div>
      <button type="button" className="btn-primary" onClick={onReady}>
        Begin judging
      </button>
      <div className="prepared-sidebar-secondary">
        <button
          type="button"
          className="btn-ghost"
          onClick={onChangeQuestion}
        >
          Change question
        </button>
        <button
          type="button"
          className="btn-ghost"
          onClick={onChangeReciter}
        >
          Change reciter
        </button>
      </div>
    </section>
  );
}

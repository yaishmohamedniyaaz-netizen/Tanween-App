import type { PreparedRecitation } from "../types";
import { ParticipantIdentity } from "./ParticipantIdentity";

function questionChoice(value: PreparedRecitation): string {
  const question = value.question;
  if (question.kind === "manual") return "External question";
  return question.drawPosition ? `Number ${question.drawPosition}` : "Question";
}

export function PreparedRecitationStrip({
  prepared,
  participantCount,
  onChangeReciter,
  onChangeQuestion,
}: {
  prepared: PreparedRecitation;
  participantCount: number;
  onChangeReciter: () => void;
  onChangeQuestion: () => void;
}) {
  return (
    <section className="prepared-recitation-strip" aria-label="Prepared recitation">
      <span className="prepared-state">Prepared</span>
      <ParticipantIdentity
        participant={prepared.participant}
        participantCount={participantCount}
        density="compact"
      />
      <span className="prepared-question">
        <strong>{questionChoice(prepared)}</strong>
        <small>{prepared.question.label}</small>
      </span>
      <span className="prepared-actions">
        <button type="button" onClick={onChangeReciter}>
          Change reciter
        </button>
        <button type="button" onClick={onChangeQuestion}>
          Change question
        </button>
      </span>
    </section>
  );
}

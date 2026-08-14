import type { PreparedRecitation } from "../types";

function questionChoice(value: PreparedRecitation): string {
  const question = value.question;
  if (question.kind === "manual") return "External question";
  return question.drawPosition ? `Number ${question.drawPosition}` : "Question";
}

export function PreparedRecitationStrip({
  prepared,
  onChangeReciter,
  onChangeQuestion,
}: {
  prepared: PreparedRecitation;
  onChangeReciter: () => void;
  onChangeQuestion: () => void;
}) {
  return (
    <section className="prepared-recitation-strip" aria-label="Prepared recitation">
      <span className="prepared-state">Prepared</span>
      <span className="prepared-reciter">
        <strong>{prepared.participant.name || "Unnamed"}</strong>
        <small>
          {prepared.participant.number || "No number"}
          {prepared.participant.institution
            ? ` · ${prepared.participant.institution}`
            : ""}
        </small>
      </span>
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

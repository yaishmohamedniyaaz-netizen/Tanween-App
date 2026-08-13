import type {
  CompetitionDivision,
  QuestionDeck,
  RosterEntry,
} from "../types";
import { Icon } from "./Icon";

function reciterContext(
  participant: RosterEntry,
  division: CompetitionDivision,
): string {
  const category = participant.category === "nubalaa" ? "Hifz" : "Baliagen";
  const side =
    participant.muqarrar === "feshey-kolhu"
      ? "Starting side"
      : "Ending side";
  return [participant.institution, division.name, category, side]
    .filter(Boolean)
    .join(" · ");
}

export function QuestionNumberScreen({
  participant,
  division,
  deck,
  spentPositions,
  drawnPosition,
  loading,
  loadFailed,
  boardExhausted,
  allowManual,
  hasEligibleQuestions,
  onDraw,
  onUseManual,
  onBack,
}: {
  participant?: RosterEntry;
  division?: CompetitionDivision;
  deck: QuestionDeck | null;
  spentPositions: Set<number>;
  drawnPosition: number | null;
  loading: boolean;
  loadFailed: boolean;
  boardExhausted: boolean;
  allowManual: boolean;
  hasEligibleQuestions: boolean;
  onDraw: (position: number) => void;
  onUseManual: () => void;
  onBack: () => void;
}) {
  return (
    <section className="question-number-screen" aria-label="Choose a question">
      {participant && division ? (
        <div className="draw-reciter-strip">
          <span className="reciter-row-number">{participant.number || "—"}</span>
          <span className="reciter-row-copy">
            <strong>{participant.name || "Unnamed"}</strong>
            <small>{reciterContext(participant, division)}</small>
          </span>
          <button type="button" className="btn-ghost" onClick={onBack}>
            Change reciter
          </button>
        </div>
      ) : (
        <div className="question-choice-state">
          Select a participant with a matched division.
        </div>
      )}

      {participant && division && loading && !loadFailed ? (
        <div className="question-choice-state">
          <span className="loading-spinner" /> Preparing question numbers…
        </div>
      ) : participant && division ? (
        <>
          <div className="question-board-heading">
            <h3>Choose a number</h3>
            <p>Ask the reciter to choose one available number.</p>
          </div>

          <div className="draw-board" role="group" aria-label="Question numbers">
            {deck?.tiles.map((tile) => {
              const spent = spentPositions.has(tile.position);
              const mine = drawnPosition === tile.position;
              return (
                <button
                  key={tile.position}
                  type="button"
                  className={`draw-tile ${mine ? "is-drawn" : ""} ${spent && !mine ? "is-spent" : ""}`}
                  disabled={spent && !mine}
                  aria-label={
                    spent && !mine
                      ? `Number ${tile.position}, already taken`
                      : `Number ${tile.position}`
                  }
                  onClick={() => onDraw(tile.position)}
                >
                  {tile.position}
                </button>
              );
            })}
          </div>

          {deck && boardExhausted && (
            <p className="question-choice-warning">
              Every available number in this division has been drawn. Add more
              checked questions in competition setup before continuing.
            </p>
          )}

          {!hasEligibleQuestions && !allowManual && !loading && (
            <div className="question-choice-warning">
              No checked question is available for this participant. Return to
              competition setup.
            </div>
          )}

          {allowManual && (
            <button
              type="button"
              className="draw-external"
              onClick={onUseManual}
            >
              <strong>Use an external question</strong>
              <small>
                Confirm that the printed question matches this division and
                muqarrar.
              </small>
              <Icon name="chevron" size={14} />
            </button>
          )}
        </>
      ) : null}
    </section>
  );
}

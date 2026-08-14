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
  const divisionIncludesCategory = division.name
    .toLocaleLowerCase()
    .includes(category.toLocaleLowerCase());
  return [
    participant.institution,
    division.name,
    divisionIncludesCategory ? null : category,
    side,
  ]
    .filter((value): value is string => Boolean(value))
    .filter(
      (value, index, values) =>
        values.findIndex(
          (candidate) => candidate.trim().toLowerCase() === value.trim().toLowerCase(),
        ) === index,
    )
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

          {!hasEligibleQuestions && !allowManual && !loading && (
            <div className="question-choice-warning">
              No checked question is available for this participant. Return to
              competition setup.
            </div>
          )}

          {deck && deck.tiles.length < 20 && !allowManual && (
            <div className="question-choice-warning">
              This set contains only {deck.tiles.length} checked question
              {deck.tiles.length === 1 ? "" : "s"}. A final Tahqeeq set needs
              all 20 before official use.
            </div>
          )}

          {allowManual && (
            <button
              type="button"
              className="draw-external"
              onClick={onUseManual}
            >
              <strong>Use an external question</strong>
              <Icon name="chevron" size={14} />
            </button>
          )}
        </>
      ) : null}
    </section>
  );
}

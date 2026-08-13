import type {
  CompetitionDivision,
  RosterEntry,
} from "../types";
import type { RosterGroup } from "../lib/rosterQueue.ts";
import { Icon } from "./Icon";

function categoryLabel(entry: RosterEntry): string {
  if (entry.category === "nubalaa") return "Hifz";
  if (entry.category === "baliagen") return "Baliagen";
  return "Category not set";
}

function sideLabel(entry: RosterEntry): string {
  if (entry.muqarrar === "feshey-kolhu") return "Starting side";
  if (entry.muqarrar === "nimey-kolhu") return "Ending side";
  return "Muqarrar not set";
}

function participantMeta(
  entry: RosterEntry,
  division?: CompetitionDivision,
): string {
  const category = categoryLabel(entry);
  // A division is usually named for its category already ("Under 14 · Hifz"),
  // and saying it twice is how the row came to read "Hifz · Hifz".
  return [
    entry.institution || "Institution not listed",
    division?.name,
    division?.name?.includes(category) ? null : category,
    sideLabel(entry),
  ]
    .filter(Boolean)
    .join(" · ");
}

export function ParticipantSelectionScreen({
  recommended,
  recommendedDivision,
  activeGroup,
  groups,
  waitingCount,
  finishedCount,
  offerSearch,
  search,
  onSearch,
  onChoose,
  onMarkAbsent,
}: {
  recommended?: RosterEntry;
  recommendedDivision?: CompetitionDivision;
  activeGroup?: RosterGroup;
  groups: RosterGroup[];
  waitingCount: number;
  finishedCount: number;
  offerSearch: boolean;
  search: string;
  onSearch: (value: string) => void;
  onChoose: (entry: RosterEntry) => void;
  onMarkAbsent: (entry: RosterEntry) => void;
}) {
  return (
    <section
      className="reciter-selection-screen"
      aria-label="Participant running order"
    >
      <div className="reciter-queue-summary">
        <span>
          <strong>{waitingCount}</strong> waiting
        </span>
        <span>
          <strong>{finishedCount}</strong> finished
        </span>
        {activeGroup && (
          <span className="reciter-queue-division">
            {activeGroup.division?.name ?? "No matching division"}
          </span>
        )}
      </div>

      {recommended ? (
        <article className="next-reciter-row">
          <button
            type="button"
            className="next-reciter-main"
            onClick={() => onChoose(recommended)}
          >
            <span className="reciter-row-number">
              {recommended.number || "—"}
            </span>
            <span className="reciter-row-copy">
              <strong>{recommended.name || "Unnamed"}</strong>
              <small>
                {participantMeta(recommended, recommendedDivision)}
              </small>
            </span>
            <span className="next-reciter-cue">
              Choose question <Icon name="chevron" size={14} />
            </span>
          </button>
          <button
            type="button"
            className="next-reciter-absent"
            onClick={() => onMarkAbsent(recommended)}
          >
            Not here
          </button>
        </article>
      ) : (
        <div className="reciter-start-empty">
          Every participant in this roster is finished.
        </div>
      )}

      {offerSearch && (
        <label className="queue-search">
          <Icon name="newUser" size={15} />
          <input
            type="search"
            value={search}
            placeholder="Find by number, name or institution"
            aria-label="Find a participant"
            onChange={(event) => onSearch(event.target.value)}
          />
        </label>
      )}

      <div className="queue-scroll">
        {groups.length === 0 ? (
          <p className="queue-empty">
            {search.trim()
              ? `Nobody matches “${search.trim()}”.`
              : "Nobody else is waiting."}
          </p>
        ) : (
          groups.map((group) => (
            <section className="queue-group" key={group.id}>
              <h3>
                <span>{group.division?.name ?? "No matching division"}</span>
                <small>
                  {group.waiting > 0 ? `${group.waiting} waiting` : "None waiting"}
                  {group.absent > 0 ? ` · ${group.absent} not here` : ""}
                  {group.judged > 0 ? ` · ${group.judged} finished` : ""}
                </small>
              </h3>
              <ul>
                {group.entries.map((entry) => (
                  <li key={entry.id}>
                    <button
                      type="button"
                      disabled={entry.judged}
                      onClick={() => onChoose(entry)}
                    >
                      <span className="queue-number">
                        {entry.number || "—"}
                      </span>
                      <span className="queue-participant-copy">
                        <strong>{entry.name || "Unnamed"}</strong>
                        <small>
                          {participantMeta(entry, group.division)}
                        </small>
                      </span>
                      <small
                        className={
                          entry.judged
                            ? "is-judged"
                            : entry.absent
                              ? "is-absent"
                              : "is-waiting"
                        }
                      >
                        {entry.judged
                          ? "Finished"
                          : entry.absent
                            ? "Not here"
                            : "Select"}
                      </small>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ))
        )}
      </div>
    </section>
  );
}

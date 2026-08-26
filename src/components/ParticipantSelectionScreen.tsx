import { useEffect, useState } from "react";
import type {
  CompetitionDivision,
  RosterEntry,
} from "../types";
import type { RosterGroup, VisibleRosterGroup } from "../lib/rosterQueue.ts";
import { divisionLabel } from "../lib/participantPresentation.ts";
import { Icon } from "./Icon";
import { ParticipantIdentity } from "./ParticipantIdentity";

export function ParticipantSelectionScreen({
  recommended,
  recommendedDivision,
  activeGroup,
  groups,
  participantCount,
  waitingCount,
  offerSearch,
  search,
  selectionDisabled = false,
  onSearch,
  onChoose,
  onMarkAbsent,
}: {
  recommended?: RosterEntry;
  recommendedDivision?: CompetitionDivision;
  activeGroup?: RosterGroup;
  groups: VisibleRosterGroup[];
  participantCount: number;
  waitingCount: number;
  offerSearch: boolean;
  search: string;
  selectionDisabled?: boolean;
  onSearch: (value: string) => void;
  onChoose: (entry: RosterEntry) => void;
  onMarkAbsent: (entry: RosterEntry) => void;
}) {
  const initiallyExpandedGroupId =
    activeGroup?.id ?? (groups.length === 1 ? groups[0]?.id : undefined);
  const [expandedGroupIds, setExpandedGroupIds] = useState<Set<string>>(
    () => new Set(initiallyExpandedGroupId ? [initiallyExpandedGroupId] : []),
  );
  const searching = Boolean(search.trim());

  useEffect(() => {
    const groupId = activeGroup?.id;
    if (!groupId) return;
    setExpandedGroupIds(new Set([groupId]));
  }, [activeGroup?.id]);

  useEffect(() => {
    setExpandedGroupIds((current) => {
      const next = new Set(
        [...current].filter((id) => {
          const group = groups.find((candidate) => candidate.id === id);
          return group && (group.waiting > 0 || id === activeGroup?.id);
        }),
      );
      return next.size === current.size && [...next].every((id) => current.has(id))
        ? current
        : next;
    });
  }, [activeGroup?.id, groups]);

  const toggleGroup = (groupId: string) => {
    setExpandedGroupIds((current) => {
      return current.has(groupId) ? new Set() : new Set([groupId]);
    });
  };

  return (
    <section
      className="reciter-selection-screen"
      aria-label="Participant running order"
    >
      <div className="reciter-queue-summary">
        <strong>Next</strong>
        <span>{waitingCount} waiting</span>
      </div>

      {recommended ? (
        <article className="next-reciter-row">
          <button
            type="button"
            className="next-reciter-main"
            disabled={selectionDisabled}
            onClick={() => onChoose(recommended)}
          >
            <ParticipantIdentity
              participant={recommended}
              participantCount={participantCount}
              division={recommendedDivision}
              density="lead"
            />
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
          groups.map((group) => {
            const expanded = searching || expandedGroupIds.has(group.id);
            const panelId = `queue-group-${group.id.replace(
              /[^a-zA-Z0-9_-]/g,
              "-",
            )}`;
            return (
              <section
                className={`queue-group ${expanded ? "is-expanded" : ""}`}
                key={group.id}
              >
                <h3>
                  <button
                    type="button"
                    className="queue-group-toggle"
                    aria-expanded={expanded}
                    aria-controls={panelId}
                    aria-disabled={searching || undefined}
                    disabled={searching}
                    onClick={() => toggleGroup(group.id)}
                  >
                    <span className="queue-group-title">
                      <Icon name="chevron" size={13} />
                      {group.division
                        ? divisionLabel(group.division)
                        : "Category required"}
                    </span>
                    <small>
                      {searching && group.matchCount !== undefined
                        ? `${group.matchCount} ${group.matchCount === 1 ? "match" : "matches"} · `
                        : ""}
                      {group.waiting > 0 ? `${group.waiting} waiting` : "None waiting"}
                      {group.absent > 0 ? ` · ${group.absent} not here` : ""}
                      {group.judged > 0 ? ` · ${group.judged} finished` : ""}
                    </small>
                  </button>
                </h3>
                {expanded && (
                  <ul id={panelId}>
                    {group.entries.map((entry) => (
                      <li key={entry.id}>
                        <button
                          type="button"
                          className="queue-participant-button"
                          disabled={entry.judged || selectionDisabled}
                          onClick={() => onChoose(entry)}
                        >
                          <ParticipantIdentity
                            participant={entry}
                            participantCount={participantCount}
                            division={group.division}
                            density="row"
                            numberPosition="start"
                          />
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
                )}
              </section>
            );
          })
        )}
      </div>
    </section>
  );
}

import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import type { RosterEntry } from "../types";
import type { RosterGroup, VisibleRosterGroup } from "../lib/rosterQueue.ts";
import { divisionLabel } from "../lib/participantPresentation.ts";
import { Icon } from "./Icon";
import { ParticipantIdentity } from "./ParticipantIdentity";

export function ParticipantSelectionScreen({
  recommended,
  preparedId,
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
  preparedId?: string;
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
  const id = useId();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [selectedId, setSelectedId] = useState(recommended?.id);
  const [expandedGroupIds, setExpandedGroupIds] = useState<Set<string>>(
    () =>
      new Set(
        activeGroup
          ? [activeGroup.id]
          : groups.length === 1
            ? [groups[0].id]
            : [],
      ),
  );
  const searching = Boolean(search.trim());
  useEffect(() => {
    setSelectedId(recommended?.id);
  }, [recommended?.id]);
  useEffect(() => {
    if (activeGroup) setExpandedGroupIds(new Set([activeGroup.id]));
  }, [activeGroup?.id]);
  // Display order only: never mutate the persisted queue or the draw.
  const displayGroups = groups.map((group) => ({
    ...group,
    entries: [...group.entries].sort(
      (a, b) => Number(a.judged) - Number(b.judged),
    ),
  }));
  const entries = displayGroups
    .filter((group) => searching || expandedGroupIds.has(group.id))
    .flatMap((group) => group.entries);
  const selected =
    entries.find((entry) => entry.id === selectedId) ??
    entries.find((entry) => entry.id === recommended?.id) ??
    entries[0];
  const groupId = (index: number) => `${id}-group-${index}`;
  const optionRefs = useRef(new Map<string, HTMLButtonElement>());
  const typeahead = useRef({ value: "", time: 0 });
  useLayoutEffect(() => {
    const element = selected && optionRefs.current.get(selected.id),
      scroll = scrollRef.current;
    if (!element || !scroll || document.activeElement !== element) return;
    const row = element.getBoundingClientRect(),
      frame = scroll.getBoundingClientRect();
    if (row.top < frame.top) scroll.scrollTop += row.top - frame.top;
    else if (row.bottom > frame.bottom)
      scroll.scrollTop += row.bottom - frame.bottom;
  }, [selected?.id, selected?.judged, search]);
  const selectAndFocus = (entry: RosterEntry | undefined) => {
    if (!entry) return;
    setSelectedId(entry.id);
    const element = optionRefs.current.get(entry.id),
      scroll = scrollRef.current;
    element?.focus({ preventScroll: true });
    if (element && scroll) {
      const row = element.getBoundingClientRect(),
        frame = scroll.getBoundingClientRect();
      if (row.top < frame.top) scroll.scrollTop += row.top - frame.top;
      else if (row.bottom > frame.bottom)
        scroll.scrollTop += row.bottom - frame.bottom;
    }
  };
  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    const index = entries.findIndex((entry) => entry.id === selected?.id);
    let next: RosterEntry | undefined;
    if (event.key === "ArrowDown") next = entries[(index + 1) % entries.length];
    else if (event.key === "ArrowUp")
      next = entries[(index - 1 + entries.length) % entries.length];
    else if (event.key === "Home") next = entries[0];
    else if (event.key === "End") next = entries[entries.length - 1];
    else if (event.key === "Enter") {
      event.preventDefault();
      if (selected && !selected.judged && !selectionDisabled)
        onChoose(selected);
      return;
    } else if (
      event.key.length === 1 &&
      event.key !== " " &&
      !event.ctrlKey &&
      !event.metaKey &&
      !event.altKey
    ) {
      const now = Date.now();
      typeahead.current = {
        value:
          (now - typeahead.current.time < 700 ? typeahead.current.value : "") +
          event.key.toLocaleLowerCase(),
        time: now,
      };
      next = [...entries.slice(index + 1), ...entries.slice(0, index + 1)].find(
        (entry) =>
          entry.name.toLocaleLowerCase().startsWith(typeahead.current.value),
      );
    } else return;
    event.preventDefault();
    selectAndFocus(next);
  };
  return (
    <section
      className="reciter-selection-screen"
      aria-label="Participant queue"
    >
      <div className="reciter-queue-summary">
        <strong>Participants</strong>
        <span>{waitingCount} waiting</span>
      </div>
      {!recommended && (
        <div className="reciter-start-empty">
          {groups.some((group) => group.absent > 0)
            ? "Nobody is waiting. Absent participants can return to the queue."
            : "Every participant in this roster is finished."}
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
      <div className="queue-scroll quiet-scroll" ref={scrollRef}>
        {/* aria-owns keeps collapsible headings outside the single listbox. */}
        {entries.length > 0 && (
          <div
            role="listbox"
            aria-label="Reciters"
            aria-owns={displayGroups
              .flatMap((group, index) =>
                searching || expandedGroupIds.has(group.id)
                  ? [groupId(index)]
                  : [],
              )
              .join(" ")}
          />
        )}
        {groups.length === 0 ? (
          <p className="queue-empty">
            {search.trim()
              ? `Nobody matches “${search.trim()}”.`
              : "Nobody else is waiting."}
          </p>
        ) : (
          displayGroups.map((group, index) => {
            const expanded = searching || expandedGroupIds.has(group.id);
            const label = group.division
              ? divisionLabel(group.division)
              : "Category required";
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
                    aria-controls={groupId(index)}
                    disabled={searching}
                    onClick={() =>
                      setExpandedGroupIds(
                        expanded ? new Set() : new Set([group.id]),
                      )
                    }
                  >
                    <span className="queue-group-title">
                      <Icon name="chevron" size={13} />
                      {label}
                    </span>
                    <small>
                      {searching && group.matchCount !== undefined
                        ? `${group.matchCount} ${group.matchCount === 1 ? "match" : "matches"} · `
                        : ""}
                      {group.waiting > 0
                        ? `${group.waiting} waiting`
                        : "None waiting"}
                      {group.absent > 0 ? ` · ${group.absent} not here` : ""}
                      {group.judged > 0 ? ` · ${group.judged} finished` : ""}
                    </small>
                  </button>
                </h3>
                {expanded && (
                  <ul id={groupId(index)} role="group" aria-label={label}>
                    {group.entries.map((entry) => {
                      const tag = entry.judged
                        ? "Finished"
                        : entry.absent
                          ? "Not here"
                          : entry.id === preparedId
                            ? "Ready"
                            : entry.id === recommended?.id
                              ? "Next"
                              : "";
                      return (
                        <li key={entry.id} role="none">
                          <button
                            type="button"
                            role="option"
                            className="queue-participant-button"
                            ref={(node) => {
                              if (node) optionRefs.current.set(entry.id, node);
                              else optionRefs.current.delete(entry.id);
                            }}
                            data-queue-entry={entry.id}
                            aria-selected={selected?.id === entry.id}
                            tabIndex={selected?.id === entry.id ? 0 : -1}
                            onFocus={() => setSelectedId(entry.id)}
                            onClick={() => setSelectedId(entry.id)}
                            onKeyDown={onKeyDown}
                          >
                            <ParticipantIdentity
                              participant={entry}
                              participantCount={participantCount}
                              division={group.division}
                              density="row"
                              numberPosition="start"
                            />
                            {tag && (
                              <small
                                className={`queue-status ${entry.judged ? "is-judged" : entry.absent ? "is-absent" : "is-waiting"}`}
                              >
                                {tag}
                              </small>
                            )}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>
            );
          })
        )}
      </div>
      <div className="queue-actions">
        <span className="queue-selection-status" role="status">
          {selected?.judged
            ? `${selected.name} is finished.`
            : !selected
              ? "Select a participant."
              : ""}
        </span>
        <button
          type="button"
          className="btn-primary queue-choose"
          disabled={!selected || selected.judged || selectionDisabled}
          onClick={() => selected && onChoose(selected)}
        >
          {selected
            ? `Choose question for ${selected.name}`
            : "Choose question"}
        </button>
        <button
          type="button"
          className="btn-ghost queue-absence"
          disabled={!selected || selected.judged || selectionDisabled}
          onClick={() => {
            if (!selected) return;
            if (selected.absent) onChoose(selected);
            else {
              onSearch("");
              setSelectedId(recommended?.id === selected.id ? undefined : recommended?.id);
              if (activeGroup) setExpandedGroupIds(new Set([activeGroup.id]));
              onMarkAbsent(selected);
            }
          }}
        >
          {selected?.absent ? "Back in queue" : "Not here"}
        </button>
      </div>
    </section>
  );
}

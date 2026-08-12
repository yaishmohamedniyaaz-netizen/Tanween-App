import { participantDivision } from "./reciterQuestions.ts";
import type { CompetitionDivision, RosterEntry } from "../types";

/**
 * One block of the running order. A session is worked through a group at a
 * time — a morning block might be Under 8 Baliagen — so the queue is grouped
 * the way the hall actually runs rather than shown as one flat roster.
 */
export interface RosterGroup {
  id: string;
  division?: CompetitionDivision;
  entries: RosterEntry[];
  judged: number;
  waiting: number;
  absent: number;
}

const UNGROUPED = "no-division";

/**
 * Groups the roster by division, preserving roster order both within a group
 * and between groups: the first group is the one whose first participant
 * appears earliest, so the order on screen matches the order called.
 *
 * Participants whose age group and category match no configured division are
 * kept in a trailing group rather than dropped — they still have to be judged,
 * and hiding them would make the count on screen disagree with the roster.
 */
export function groupRosterByDivision(
  roster: RosterEntry[],
  divisions: CompetitionDivision[],
): RosterGroup[] {
  const groups = new Map<string, RosterGroup>();

  for (const entry of roster) {
    const division = participantDivision(entry, divisions);
    const id = division?.id ?? UNGROUPED;
    let group = groups.get(id);
    if (!group) {
      group = { id, division, entries: [], judged: 0, waiting: 0, absent: 0 };
      groups.set(id, group);
    }
    group.entries.push(entry);
    if (entry.judged) group.judged += 1;
    else if (entry.absent) group.absent += 1;
    else group.waiting += 1;
  }

  return [...groups.values()];
}

/**
 * Still to recite: not judged, and not marked away. Absent participants are
 * held aside so a block can read as finished instead of waiting forever on
 * somebody who never came.
 */
export function isWaiting(entry: RosterEntry): boolean {
  return !entry.judged && !entry.absent;
}

/**
 * Waiting first, then absent, then judged. Whoever is still to recite stays
 * at the top where the organiser is looking, and the list only re-sorts as
 * the visible result of something they pressed.
 */
export function queueOrder(entries: RosterEntry[]): RosterEntry[] {
  const rank = (entry: RosterEntry) =>
    entry.judged ? 2 : entry.absent ? 1 : 0;
  return [...entries].sort((a, b) => rank(a) - rank(b));
}

/** The group a participant belongs to, or the first group still waiting. */
export function activeGroupFor(
  groups: RosterGroup[],
  participantId: string | undefined,
): RosterGroup | undefined {
  if (participantId) {
    const owning = groups.find((group) =>
      group.entries.some((entry) => entry.id === participantId),
    );
    if (owning) return owning;
  }
  return groups.find((group) => group.waiting > 0) ?? groups[0];
}

/**
 * Matches a participant against a typed query on number, name or institution —
 * the three things an organiser has to hand when someone is called out of
 * order. Case and surrounding space are ignored.
 */
export function matchesParticipantSearch(
  entry: RosterEntry,
  query: string,
): boolean {
  const needle = query.trim().toLocaleLowerCase();
  if (!needle) return true;
  return [entry.number, entry.name, entry.institution].some((field) =>
    field.trim().toLocaleLowerCase().includes(needle),
  );
}

/**
 * Search is noise on a small roster and essential on a large one. Eight is the
 * point where the queue stops fitting on screen without scrolling.
 */
export const SEARCH_THRESHOLD = 8;

export function shouldOfferSearch(roster: RosterEntry[]): boolean {
  return roster.length > SEARCH_THRESHOLD;
}

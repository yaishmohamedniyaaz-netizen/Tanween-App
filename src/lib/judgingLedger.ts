import type {
  JudgeAssignmentSnapshot,
  JudgingEvent,
  Mistake,
  Participant,
  ReciterQuestionAssignment,
} from "../types";

/**
 * 2 adds `mistake_recategorized`. Version 1 ledgers replay unchanged — the new
 * case only ever applies to events written after this version.
 */
export const LEDGER_VERSION = 2 as const;

/** Rebuild the current mistake list from the recorded judge actions. */
export function projectMistakes(events: JudgingEvent[]): Mistake[] {
  const active = new Map<string, Mistake>();

  for (const event of events) {
    switch (event.type) {
      case "mistake_added":
      case "mistake_restored":
        active.set(event.mistake.id, { ...event.mistake });
        break;
      case "mistake_amount_changed": {
        const mistake = active.get(event.mistakeId);
        if (mistake) active.set(event.mistakeId, { ...mistake, amount: event.to });
        break;
      }
      case "mistake_note_changed": {
        const mistake = active.get(event.mistakeId);
        if (mistake) active.set(event.mistakeId, { ...mistake, note: event.to });
        break;
      }
      case "mistake_recategorized": {
        const mistake = active.get(event.mistakeId);
        if (mistake) {
          active.set(event.mistakeId, {
            ...mistake,
            category: event.to,
            amount: event.toAmount,
          });
        }
        break;
      }
      case "mistake_undone":
        active.delete(event.mistake.id);
        break;
      default:
        break;
    }
  }

  return [...active.values()].sort((a, b) => a.ts - b.ts);
}

/** Make old saved mistakes readable by the new history without changing them. */
export function seedLedgerEvents({
  sessionId,
  participant,
  startedAt,
  mistakes,
  assignment,
  question,
}: {
  sessionId: string;
  participant: Participant;
  startedAt: number;
  mistakes: Mistake[];
  assignment?: JudgeAssignmentSnapshot;
  question?: ReciterQuestionAssignment;
}): JudgingEvent[] {
  return [
    {
      id: `ledger:${sessionId}:started`,
      at: startedAt,
      type: "session_started",
      sessionId,
      participant,
      assignment,
      question,
    },
    ...mistakes.map(
      (mistake): JudgingEvent => ({
        id: `ledger:${mistake.id}:added`,
        at: mistake.ts,
        type: "mistake_added",
        mistake: {
          ...mistake,
          ...(mistake.judgeSeatId || assignment?.judgeSeatId
            ? { judgeSeatId: mistake.judgeSeatId ?? assignment?.judgeSeatId }
            : {}),
        },
      }),
    ),
  ];
}

export function latestMistakeEventIds(events: JudgingEvent[]): Map<string, string> {
  const latest = new Map<string, string>();
  for (const event of events) {
    if (
      event.type === "mistake_added" ||
      event.type === "mistake_undone" ||
      event.type === "mistake_restored"
    ) {
      latest.set(event.mistake.id, event.id);
    } else if (
      event.type === "mistake_amount_changed" ||
      event.type === "mistake_note_changed" ||
      event.type === "mistake_recategorized"
    ) {
      latest.set(event.mistakeId, event.id);
    }
  }
  return latest;
}

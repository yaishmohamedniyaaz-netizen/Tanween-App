import type { JudgingEvent, Mistake, Participant } from "../types";

export const LEDGER_VERSION = 1 as const;

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
}: {
  sessionId: string;
  participant: Participant;
  startedAt: number;
  mistakes: Mistake[];
}): JudgingEvent[] {
  return [
    {
      id: `ledger:${sessionId}:started`,
      at: startedAt,
      type: "session_started",
      sessionId,
      participant,
    },
    ...mistakes.map(
      (mistake): JudgingEvent => ({
        id: `ledger:${mistake.id}:added`,
        at: mistake.ts,
        type: "mistake_added",
        mistake: { ...mistake },
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
      event.type === "mistake_note_changed"
    ) {
      latest.set(event.mistakeId, event.id);
    }
  }
  return latest;
}

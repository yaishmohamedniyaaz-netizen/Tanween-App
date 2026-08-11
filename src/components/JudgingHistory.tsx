import { CATEGORY_BY_ID } from "../config";
import { latestMistakeEventIds } from "../lib/judgingLedger";
import type { CategoryId, JudgingEvent, Mistake } from "../types";
import { assignmentLabel, judgeDisplayName } from "../lib/judgeAssignments";

function eventMistake(event: JudgingEvent): Mistake | null {
  if (
    event.type === "mistake_added" ||
    event.type === "mistake_undone" ||
    event.type === "mistake_restored"
  ) {
    return event.mistake;
  }
  return null;
}

function historyCopy(event: JudgingEvent) {
  switch (event.type) {
    case "session_started":
      return {
        title: "Judging started",
        detail: event.assignment
          ? `${judgeDisplayName(event.assignment)} · ${assignmentLabel(event.assignment.categories)}`
          : event.participant.name || "Unnamed reciter",
      };
    case "mistake_added":
      return {
        title: "Mistake marked",
        detail: `${CATEGORY_BY_ID[event.mistake.category].label} · ${event.mistake.label} · −${event.mistake.amount}`,
      };
    case "mistake_amount_changed":
      return {
        title: "Deduction adjusted",
        detail: `${event.label} · −${event.from} → −${event.to}`,
      };
    case "mistake_note_changed":
      return {
        title: "Mistake note changed",
        detail: event.label,
      };
    case "mistake_undone":
      return { title: "Mistake undone", detail: event.mistake.label };
    case "mistake_restored":
      return { title: "Mistake restored", detail: event.mistake.label };
    case "session_reopened":
      return { title: "Result reopened", detail: event.reason };
    case "session_finalized":
      return {
        title: event.scoreKind === "judge-section" ? "Section finished" : "Result finished",
        detail: `${event.total} / ${event.totalMax}`,
      };
  }
}

function categoryForEvent(
  event: JudgingEvent,
  categories: Map<string, CategoryId>,
): CategoryId | null {
  const mistake = eventMistake(event);
  if (mistake) return mistake.category;
  if (
    event.type === "mistake_amount_changed" ||
    event.type === "mistake_note_changed"
  ) {
    return categories.get(event.mistakeId) ?? null;
  }
  return null;
}

export function JudgingHistory({
  events,
  onRestore,
}: {
  events: JudgingEvent[];
  onRestore?: (eventId: string) => void;
}) {
  const latest = latestMistakeEventIds(events);
  const categories = new Map<string, CategoryId>();
  for (const event of events) {
    const mistake = eventMistake(event);
    if (mistake) categories.set(mistake.id, mistake.category);
  }

  if (events.length === 0) {
    return <p className="empty">No judging actions yet.</p>;
  }

  return (
    <ol className="history-list">
      {[...events].reverse().map((event) => {
        const copy = historyCopy(event);
        const mistake = eventMistake(event);
        const category = categoryForEvent(event, categories);
        const canRestore =
          onRestore &&
          event.type === "mistake_undone" &&
          latest.get(event.mistake.id) === event.id;
        return (
          <li
            className={`history-item ${category ? `cat-${category}` : ""}`}
            key={event.id}
          >
            <span className="history-mark" aria-hidden="true" />
            <span className="history-body">
              <span className="history-title">{copy.title}</span>
              <span className="history-detail">{copy.detail}</span>
            </span>
            {mistake && <span className="history-glyph">{mistake.glyph}</span>}
            {canRestore && (
              <button
                type="button"
                className="history-restore"
                onClick={() => onRestore(event.id)}
              >
                Restore
              </button>
            )}
            <time className="history-time" dateTime={new Date(event.at).toISOString()}>
              {new Date(event.at).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </time>
          </li>
        );
      })}
    </ol>
  );
}

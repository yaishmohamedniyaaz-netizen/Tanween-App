import { CATEGORY_BY_ID } from "../config";
import { latestMistakeEventIds } from "../lib/judgingLedger";
import type { CategoryId, JudgingEvent, Mistake } from "../types";
import { categoryListLabel, judgeDisplayName } from "../lib/judgeAssignments";

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
          ? `${judgeDisplayName(event.assignment)} · ${categoryListLabel(event.assignment.categories)}`
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
    case "mistake_recategorized":
      return {
        title: "Mistake corrected",
        detail: `${event.label} · ${CATEGORY_BY_ID[event.from].label} → ${CATEGORY_BY_ID[event.to].label} · −${event.fromAmount} → −${event.toAmount}`,
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
    case "impression_changed":
      return {
        title: `${CATEGORY_BY_ID[event.category].label} marked`,
        detail: `${event.from} → ${event.to}`,
      };
    case "impression_note_changed":
      return {
        title: `${CATEGORY_BY_ID[event.category].label} note changed`,
        detail: event.to || "Note cleared",
      };
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
  // A correction is shown in the criterion it was moved to, so the stripe
  // matches what the letter now counts against.
  if (event.type === "mistake_recategorized") return event.to;
  if (
    event.type === "impression_changed" ||
    event.type === "impression_note_changed"
  ) {
    return event.category;
  }
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

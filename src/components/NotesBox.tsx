import { useJudging } from "../state/store";
import { CompactTextEditor } from "./CompactTextEditor";

export function NotesBox({
  presentation = "rail",
}: {
  presentation?: "rail" | "compact";
}) {
  const { state, dispatch } = useJudging();
  if (presentation === "compact") {
    return (
      <section className="notes-panel is-compact" aria-label="Notes">
        <CompactTextEditor
          title="Recitation notes"
          label="Notes for improvement"
          value={state.notes}
          placeholder="Notes for improvement"
          triggerClassName={`compact-notes-trigger ${state.notes.trim() ? "has-value" : ""}`}
          triggerLabel="Edit recitation notes"
          triggerContent={
            <>
              <span>Notes</span>
              {state.notes.trim() && <i aria-hidden="true" />}
            </>
          }
          onChange={(notes) => dispatch({ type: "SET_NOTES", notes })}
        />
      </section>
    );
  }

  return (
    <section className="panel notes-panel" aria-label="Notes">
      <div className="panel-head">
        <span className="t-label">Notes</span>
      </div>
      <textarea
        className="notes"
        value={state.notes}
        placeholder="Notes for improvement"
        onChange={(e) => dispatch({ type: "SET_NOTES", notes: e.target.value })}
        rows={2}
      />
    </section>
  );
}

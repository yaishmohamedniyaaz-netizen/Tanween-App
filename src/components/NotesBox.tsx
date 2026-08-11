import { useJudging } from "../state/store";

export function NotesBox() {
  const { state, dispatch } = useJudging();
  return (
    <section className="panel" aria-label="Notes">
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

import {
  assignmentLabel,
  judgeDisplayName,
  makeAssignmentSnapshot,
} from "../lib/judgeAssignments";
import { useJudging } from "../state/store";

export function JudgeRoleStrip({ onChange }: { onChange: () => void }) {
  const { state } = useJudging();
  const assignment =
    state.activeAssignment ??
    makeAssignmentSnapshot(state.panel, state.deviceJudgeId, state.config);
  if (!assignment) return null;

  return (
    <section className="judge-role-strip" aria-label="Current judge assignment">
      <span className="judge-role-main">
        <strong>{judgeDisplayName(assignment)}</strong>
        <span aria-hidden="true">·</span>
        <span>{assignmentLabel(assignment.categories)}</span>
      </span>
      <span className="judge-role-colors" aria-hidden="true">
        {assignment.categories.map((category) => (
          <i className={`cat-${category}`} key={category} />
        ))}
      </span>
      <button
        type="button"
        disabled={state.sessionActive}
        title={state.sessionActive ? "Finish this reciter before changing judge" : "Change judge assignment"}
        onClick={onChange}
      >
        Change
      </button>
    </section>
  );
}

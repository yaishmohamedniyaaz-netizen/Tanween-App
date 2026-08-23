import {
  categoryListLabel,
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

  const judgeName = judgeDisplayName(assignment);
  const criteria = categoryListLabel(assignment.categories);

  return (
    <section
      className="judge-role-strip"
      aria-label={`Current judge assignment: ${judgeName}. Criteria: ${criteria}.`}
    >
      <span className="judge-role-main">
        <strong>{judgeName}</strong>
      </span>
      <span className="judge-role-colors" aria-hidden="true">
        {assignment.categories.map((category) => (
          <i className={`cat-${category}`} key={category} />
        ))}
      </span>
      {!state.sessionActive && (
        <button
          type="button"
          title="Change judge assignment"
          onClick={onChange}
        >
          Change
        </button>
      )}
    </section>
  );
}

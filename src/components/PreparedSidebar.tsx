import {
  categoryListLabel,
  judgeDisplayName,
} from "../lib/judgeAssignments";
import type { PreparedRecitation } from "../types";

export function PreparedSidebar({
  prepared,
  onReady,
}: {
  prepared: PreparedRecitation;
  onReady: () => void;
}) {
  return (
    <section className="prepared-sidebar" aria-label="Ready to begin judging">
      <span className="prepared-sidebar-kicker">Prepared on this device</span>
      <h2>Check the passage, then begin</h2>
      <p>
        The draw is recorded and the Mushaf is open at the starting page.
        Marking remains locked until you are ready.
      </p>
      <div className="prepared-sidebar-assignment">
        <span>This device</span>
        <strong>{judgeDisplayName(prepared.assignment)}</strong>
        <small>{categoryListLabel(prepared.assignment.categories)}</small>
      </div>
      <button type="button" className="btn-primary" onClick={onReady}>
        Ready · begin judging
      </button>
      <small className="prepared-device-note">
        This confirms only this judge device. Shared readiness will be added
        with multi-device synchronization.
      </small>
    </section>
  );
}

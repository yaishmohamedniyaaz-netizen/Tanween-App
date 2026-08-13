import { categoryListLabel, judgeDisplayName, makeAssignmentSnapshot } from "../lib/judgeAssignments";
import { useJudging } from "../state/store";
import { Icon } from "./Icon";

export function CompetitionIdlePanel({
  onPrepare,
  onStartReciter,
}: {
  onPrepare: () => void;
  onStartReciter: () => void;
}) {
  const { state } = useJudging();
  const { competition } = state;
  const liveSnapshot =
    competition.status === "live" ? competition.liveSnapshot : null;
  const assignment = liveSnapshot
    ? makeAssignmentSnapshot(
        liveSnapshot.panel,
        state.deviceJudgeId,
        liveSnapshot.scoreConfig,
      )
    : null;
  const remaining = state.roster.filter((participant) => !participant.judged);
  const next = remaining[0];

  if (liveSnapshot) {
    return (
      <section className="competition-idle-panel is-live" aria-label="Competition ready">
        <span className="competition-state-label">
          <i aria-hidden="true" /> {competition.isSample ? "Test competition ready" : "Competition live"}
        </span>
        <h2>{competition.name || "Live competition"}</h2>
        {competition.edition && (
          <p className="competition-idle-edition">{competition.edition}</p>
        )}
        {assignment && (
          <div className="competition-idle-role">
            <span>This device</span>
            <strong>{judgeDisplayName(assignment)}</strong>
            <small>{categoryListLabel(assignment.categories)}</small>
          </div>
        )}
        <div className="competition-idle-progress">
          <span>
            <strong>{remaining.length}</strong>
            waiting
          </span>
          <span>
            <strong>{state.roster.length - remaining.length}</strong>
            finished
          </span>
        </div>
        {next ? (
          <button type="button" className="btn-primary competition-start-reciter" onClick={onStartReciter}>
            Prepare next reciter
            <span>{next.number ? `${next.number} · ` : ""}{next.name}</span>
          </button>
        ) : state.roster.length ? (
          <p className="competition-idle-complete">Every participant in this roster is finished.</p>
        ) : (
          <p className="competition-idle-complete">
            This restored competition has no participant roster. Close it from
            setup, then prepare a new competition.
          </p>
        )}
        <button type="button" className="btn-ghost competition-setup-link" onClick={onPrepare}>
          <Icon name="settings" size={15} /> View competition setup
        </button>
      </section>
    );
  }

  const draft = competition.status === "draft" && Boolean(competition.name || state.roster.length);
  return (
    <section className={`competition-idle-panel ${competition.status === "closed" ? "is-closed" : ""}`} aria-label="Competition status">
      <span className="competition-state-label">
        <i aria-hidden="true" />
        {competition.status === "closed"
          ? "Competition closed"
          : draft
            ? "Draft competition"
            : "No competition running"}
      </span>
      <h2>{competition.name || "The Mushaf is ready"}</h2>
      <p>
        {competition.status === "closed"
          ? "Results remain available. Start a new draft when the next competition is ready."
          : draft
            ? competition.isSample
              ? "Use the fictional roster to test judging. Sample results stay separate from official exports."
              : "Continue preparation, review every rule, then start it officially."
            : "Browse any page freely. Official marks stay disabled until a competition is prepared and started."}
      </p>
      <button type="button" className="btn-primary" onClick={onPrepare}>
        {competition.status === "closed"
          ? "View competition"
          : draft
            ? "Continue setup"
            : "Prepare competition"}
      </button>
    </section>
  );
}

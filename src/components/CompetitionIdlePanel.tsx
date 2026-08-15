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
      <section className="competition-idle-panel is-live" aria-labelledby="competition-idle-title">
        <h2 id="competition-idle-title">{competition.name || "Live competition"}</h2>
        {competition.edition && (
          <p className="competition-idle-edition">{competition.edition}</p>
        )}
        {assignment && (
          <div className="competition-idle-role">
            <span>Judge</span>
            <div>
              <strong>{judgeDisplayName(assignment)}</strong>
              <small>{categoryListLabel(assignment.categories)}</small>
            </div>
          </div>
        )}
        <dl className="competition-idle-progress">
          <div><dt>Waiting</dt><dd>{remaining.length}</dd></div>
          <div><dt>Finished</dt><dd>{state.roster.length - remaining.length}</dd></div>
        </dl>
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
    <section className={`competition-idle-panel ${competition.status === "closed" ? "is-closed" : ""}`} aria-labelledby="competition-idle-title">
      <h2 id="competition-idle-title">{competition.name || "The Mushaf is ready"}</h2>
      <p>
        {competition.status === "closed"
          ? "Results remain available for review."
          : draft
            ? "Continue setup when the competition is ready."
            : "Browse freely, or prepare a competition when you are ready."}
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

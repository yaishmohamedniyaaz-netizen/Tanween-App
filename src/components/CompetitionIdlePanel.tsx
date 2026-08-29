import { competitionReadiness } from "../lib/competition";
import { makeAssignmentSnapshot } from "../lib/judgeAssignments";
import { participantDivision } from "../lib/reciterQuestions";
import { isWaiting } from "../lib/rosterQueue";
import { useJudging } from "../state/store";
import { Icon } from "./Icon";
import { ParticipantIdentity } from "./ParticipantIdentity";

export function CompetitionIdlePanel({
  onPrepare,
  onChooseQuestion,
  onOpenReciterQueue,
  onOpenResults,
}: {
  onPrepare: () => void;
  onChooseQuestion: () => void;
  onOpenReciterQueue: () => void;
  onOpenResults: () => void;
}) {
  const { state, dispatch } = useJudging();
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
  const remaining = state.roster.filter(isWaiting);
  const next = remaining[0];
  const absentCount = state.roster.filter(
    (participant) => participant.absent && !participant.judged,
  ).length;
  const finishedCount = state.roster.filter(
    (participant) => participant.judged,
  ).length;

  if (liveSnapshot) {
    if (!state.roster.length) {
      return (
        <section
          className="competition-idle-panel is-blocked"
          aria-labelledby="competition-idle-title"
        >
          <span className="competition-idle-eyebrow">Competition unavailable</span>
          <h2 id="competition-idle-title">Participant roster required</h2>
          <p>Open setup to review or close this restored competition.</p>
          <button type="button" className="btn-primary" onClick={onPrepare}>
            Open competition setup
          </button>
        </section>
      );
    }

    if (!next) {
      return (
        <section
          className="competition-idle-panel is-complete"
          aria-labelledby="competition-idle-title"
        >
          <h2 id="competition-idle-title">
            {absentCount ? "No one left waiting" : "All participants finished"}
          </h2>
          <p>
            {absentCount
              ? `${finishedCount} judged · ${absentCount} not here`
              : `${finishedCount} of ${state.roster.length} completed`}
          </p>
          {absentCount ? (
            <>
              <button
                type="button"
                className="btn-primary"
                onClick={onOpenReciterQueue}
              >
                Review reciter queue
              </button>
              <div className="competition-idle-secondary">
                <button type="button" className="btn-ghost" onClick={onOpenResults}>
                  Open results
                </button>
                <button type="button" className="btn-ghost" onClick={onPrepare}>
                  Competition setup
                </button>
              </div>
            </>
          ) : (
            <>
              <button
                type="button"
                className="btn-primary"
                onClick={onOpenResults}
              >
                Open results
              </button>
              <button
                type="button"
                className="btn-ghost competition-setup-link"
                onClick={onPrepare}
              >
                <Icon name="settings" size={15} /> View competition setup
              </button>
            </>
          )}
        </section>
      );
    }

    if (!assignment) {
      return (
        <section
          className="competition-idle-panel is-blocked"
          aria-labelledby="competition-idle-title"
        >
          <span className="competition-idle-eyebrow">Judging unavailable</span>
          <h2 id="competition-idle-title">Judge assignment required</h2>
          <p>Choose the judge and criteria before drawing a question.</p>
          <button type="button" className="btn-primary" onClick={onPrepare}>
            Open competition setup
          </button>
        </section>
      );
    }

    const division = participantDivision(next, liveSnapshot.divisions);
    return (
      <section
        className="competition-idle-panel is-live"
        aria-labelledby="competition-idle-title"
      >
        <div className="competition-idle-heading">
          <h2 id="competition-idle-title">Next reciter</h2>
          <span>{remaining.length} waiting</span>
        </div>
        <ParticipantIdentity
          participant={next}
          participantCount={state.roster.length}
          division={division}
          density="lead"
          className="competition-idle-participant"
        />
        <button
          type="button"
          className="btn-primary competition-start-reciter"
          onClick={onChooseQuestion}
        >
          Choose question
        </button>
        <div className="competition-idle-secondary">
          <button
            type="button"
            className="btn-ghost"
            onClick={onOpenReciterQueue}
          >
            Reciter queue
          </button>
          <button
            type="button"
            className="btn-ghost"
            onClick={() =>
              dispatch({
                type: "SET_PARTICIPANT_ABSENT",
                id: next.id,
                absent: true,
              })
            }
          >
            Not here
          </button>
        </div>
      </section>
    );
  }

  const draft =
    competition.status === "draft" &&
    Boolean(competition.name || state.roster.length);
  const readiness = draft
    ? competitionReadiness({
        competition,
        panel: state.panel,
        deviceJudgeId: state.deviceJudgeId,
        config: state.config,
        roster: state.roster,
        rosterDraft: state.rosterDraft,
      })
    : null;
  const incompleteSections = new Set(
    readiness?.issues.map((issue) => issue.section) ?? [],
  );
  const completedSetupSteps = readiness
    ? 6 - incompleteSections.size + 1 + (readiness.ready ? 1 : 0)
    : 0;

  if (competition.status === "closed") {
    return (
      <section
        className="competition-idle-panel is-closed"
        aria-labelledby="competition-idle-title"
      >
        <h2 id="competition-idle-title">Competition closed</h2>
        <p>Results remain available.</p>
        <button
          type="button"
          className="btn-primary"
          onClick={onOpenResults}
        >
          View results
        </button>
      </section>
    );
  }

  return (
    <section
      className="competition-idle-panel"
      aria-labelledby="competition-idle-title"
    >
      <h2 id="competition-idle-title">
        {draft ? competition.name : "Mushaf ready"}
      </h2>
      <p>
        {draft
          ? `${completedSetupSteps} of 8 setup steps ready`
          : "Prepare a competition to begin judging."}
      </p>
      <button type="button" className="btn-primary" onClick={onPrepare}>
        {draft ? "Continue setup" : "Prepare competition"}
      </button>
    </section>
  );
}

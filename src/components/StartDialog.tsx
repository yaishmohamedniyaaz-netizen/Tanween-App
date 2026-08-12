import { useEffect, useMemo, useState } from "react";
import {
  buildSampleQuestionDrafts,
  questionDraftIssues,
  sampleQuestionCoverageComplete,
} from "../lib/questionDrafts.ts";
import { loadQuestionIndex, type QuestionIndexLookup } from "../lib/questionBank.ts";
import {
  assignmentFromDraft,
  eligibleQuestionDrafts,
  manualQuestionAssignment,
  participantDivision,
  questionRangeLabel,
} from "../lib/reciterQuestions.ts";
import {
  assignmentLabel,
  judgeDisplayName,
  makeAssignmentSnapshot,
} from "../lib/judgeAssignments";
import {
  muqarrarLabel,
  participantCategoryLabel,
} from "../lib/participants";
import { useJudging } from "../state/store";
import type { RosterEntry } from "../types";
import { Icon } from "./Icon";

export function StartDialog({
  onOpenSetup,
  onClose,
}: {
  onOpenSetup: () => void;
  onClose: () => void;
}) {
  const { state, dispatch } = useJudging();
  const roster = state.roster;
  const next = roster.find((entry) => !entry.judged);
  const [participantId, setParticipantId] = useState(next?.id ?? "");
  const [questionId, setQuestionId] = useState("");
  const [showRoster, setShowRoster] = useState(false);
  const [lookup, setLookup] = useState<QuestionIndexLookup | null>(null);
  const [questionLoadError, setQuestionLoadError] = useState(false);

  const liveSnapshot = state.competition.liveSnapshot;
  const participant = roster.find((entry) => entry.id === participantId && !entry.judged) ?? next;
  const divisions = liveSnapshot?.divisions ?? state.competition.divisions;
  const division = participant ? participantDivision(participant, divisions) : undefined;
  const assignment = liveSnapshot
    ? makeAssignmentSnapshot(
        liveSnapshot.panel,
        state.deviceJudgeId,
        liveSnapshot.scoreConfig,
      )
    : null;

  useEffect(() => {
    let cancelled = false;
    loadQuestionIndex()
      .then((value) => {
        if (!cancelled) setLookup(value);
      })
      .catch(() => {
        if (!cancelled) setQuestionLoadError(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (
      !lookup ||
      !state.competition.isSample ||
      sampleQuestionCoverageComplete(state.questionDrafts, state.competition) ||
      state.competition.status === "closed"
    ) {
      return;
    }
    dispatch({
      type: "INITIALIZE_SAMPLE_QUESTIONS",
      drafts: buildSampleQuestionDrafts(lookup, state.competition),
    });
  }, [dispatch, lookup, state.competition, state.questionDrafts]);

  useEffect(() => {
    if (participantId && roster.some((entry) => entry.id === participantId && !entry.judged)) {
      return;
    }
    setParticipantId(next?.id ?? "");
    setQuestionId("");
  }, [next?.id, participantId, roster]);

  const eligibleDrafts = useMemo(() => {
    if (!participant || !liveSnapshot) return [];
    return eligibleQuestionDrafts({
      participant,
      divisions: liveSnapshot.divisions,
      drafts: state.questionDrafts,
      competitionId: liveSnapshot.competitionId,
    }).filter((draft) =>
      lookup
        ? questionDraftIssues({
            draft,
            competition: state.competition,
            policy: liveSnapshot.questionPolicy,
            lookup,
          }).length === 0
        : false,
    );
  }, [liveSnapshot, lookup, participant, state.competition, state.questionDrafts]);

  useEffect(() => {
    setQuestionId("");
  }, [participant?.id]);

  const chooseParticipant = (entry: RosterEntry) => {
    if (entry.judged) return;
    setParticipantId(entry.id);
    setQuestionId("");
    setShowRoster(false);
  };

  const beginJudging = () => {
    if (!participant || !division || !assignment || !liveSnapshot || !questionId) return;
    const selectedDraft = eligibleDrafts.find((draft) => draft.id === questionId);
    const question = questionId === "manual"
      ? manualQuestionAssignment({ participant, division })
      : selectedDraft
        ? assignmentFromDraft({ participant, draft: selectedDraft })
        : null;
    if (!question) return;
    dispatch({ type: "START_RECITER", participant, question });
    onClose();
  };

  const allowManual = liveSnapshot?.questionPolicy.mode === "manual";
  const ready = Boolean(participant && division && assignment && questionId);
  const waitingCount = roster.filter((entry) => !entry.judged).length;

  return (
    <div
      className="dialog-backdrop"
      onKeyDown={(event) => {
        if (event.key === "Escape") onClose();
      }}
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className="dialog reciter-start-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="reciter-start-title"
      >
        <header className="reciter-start-head">
          <div>
            <span className="dialog-kicker">
              {state.competition.isSample ? "Test competition" : "Competition live"}
            </span>
            <h2 id="reciter-start-title">Prepare the next reciter</h2>
            <p>Select the participant and their question before judging begins.</p>
          </div>
          <button type="button" className="dialog-close" aria-label="Close" onClick={onClose}>×</button>
        </header>

        <div className={`reciter-start-judge ${assignment ? "" : "is-missing"}`}>
          <span>Judging on this device</span>
          <strong>{assignment ? judgeDisplayName(assignment) : "No judge assigned"}</strong>
          <small>{assignment ? assignmentLabel(assignment.categories) : "Choose the judge and criteria before starting."}</small>
          <button type="button" className="btn-ghost" onClick={onOpenSetup}>Change</button>
        </div>

        <div className="reciter-start-grid">
          <section className="reciter-start-step" aria-labelledby="reciter-step-participant">
            <div className="reciter-step-head">
              <span>1</span>
              <div>
                <h3 id="reciter-step-participant">Reciter</h3>
                <p>The next waiting participant is selected automatically.</p>
              </div>
            </div>

            {participant ? (
              <article className="selected-reciter-card">
                <div className="selected-reciter-number">{participant.number || "—"}</div>
                <div className="selected-reciter-main">
                  <strong>{participant.name}</strong>
                  <span>{participant.institution || "Institution not listed"}</span>
                </div>
                <dl>
                  <div><dt>Division</dt><dd>{division?.name ?? "Not matched"}</dd></div>
                  <div><dt>Muqarrar</dt><dd>{muqarrarLabel(participant.muqarrar)}</dd></div>
                  <div><dt>Category</dt><dd>{participantCategoryLabel(participant.category)}</dd></div>
                </dl>
              </article>
            ) : (
              <div className="reciter-start-empty">Every participant in this roster is finished.</div>
            )}

            {waitingCount > 1 && (
              <button
                type="button"
                className="reciter-roster-toggle"
                aria-expanded={showRoster}
                onClick={() => setShowRoster((current) => !current)}
              >
                <Icon name="newUser" size={15} />
                Choose another participant
                <span>{waitingCount} waiting</span>
              </button>
            )}

            {showRoster && (
              <ul className="reciter-roster-list">
                {roster.map((entry) => (
                  <li key={entry.id}>
                    <button
                      type="button"
                      disabled={entry.judged}
                      className={entry.id === participant?.id ? "is-selected" : ""}
                      onClick={() => chooseParticipant(entry)}
                    >
                      <span>{entry.number}</span>
                      <strong>{entry.name}</strong>
                      <small>{entry.judged ? "Finished" : entry.ageGroup}</small>
                      {entry.id === participant?.id && <Icon name="check" size={14} />}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="reciter-start-step question-choice-step" aria-labelledby="reciter-step-question">
            <div className="reciter-step-head">
              <span>2</span>
              <div>
                <h3 id="reciter-step-question">Question</h3>
                <p>{participant?.muqarrar ? `${muqarrarLabel(participant.muqarrar)} questions only.` : "Select a participant first."}</p>
              </div>
            </div>

            {!participant || !division ? (
              <div className="question-choice-state">Select a participant with a matched division.</div>
            ) : !lookup && !questionLoadError ? (
              <div className="question-choice-state"><span className="loading-spinner" /> Checking prepared questions…</div>
            ) : (
              <div className="question-tile-grid" role="radiogroup" aria-label="Questions for this reciter">
                {eligibleDrafts.map((draft, index) => (
                  <button
                    key={draft.id}
                    type="button"
                    role="radio"
                    aria-checked={questionId === draft.id}
                    className={`reciter-question-tile ${questionId === draft.id ? "is-selected" : ""}`}
                    onClick={() => setQuestionId(draft.id)}
                  >
                    <span className="question-tile-number">{String(index + 1).padStart(2, "0")}</span>
                    <span className="question-tile-copy">
                      <strong>{questionRangeLabel(draft)}</strong>
                      <small>Pages {draft.startPage}{draft.endPage !== draft.startPage ? `–${draft.endPage}` : ""} · {draft.resolvedLines} lines</small>
                      {draft.note && <em>{draft.note}</em>}
                    </span>
                    <span className="question-tile-check"><Icon name="check" size={13} /></span>
                  </button>
                ))}

                {allowManual && (
                  <button
                    type="button"
                    role="radio"
                    aria-checked={questionId === "manual"}
                    className={`reciter-question-tile is-manual ${questionId === "manual" ? "is-selected" : ""}`}
                    onClick={() => setQuestionId("manual")}
                  >
                    <span className="question-tile-number">M</span>
                    <span className="question-tile-copy">
                      <strong>External question</strong>
                      <small>Confirm the printed question matches this division and muqarrar.</small>
                    </span>
                    <span className="question-tile-check"><Icon name="check" size={13} /></span>
                  </button>
                )}
              </div>
            )}

            {lookup && eligibleDrafts.length === 0 && !allowManual && (
              <div className="question-choice-warning">No checked question is available for this participant. Return to setup.</div>
            )}
            {state.competition.isSample && (
              <p className="reciter-test-note">This is rehearsal data. The selected question is recorded, but it is not an approved official question set.</p>
            )}
          </section>
        </div>

        <footer className="reciter-start-actions">
          <button type="button" className="btn-ghost" onClick={onOpenSetup}>View competition setup</button>
          <div>
            <span>{!participant ? "Choose a reciter" : !questionId ? "Choose a question to unlock judging" : `Ready · ${participant.name}`}</span>
            <button type="button" className="btn-primary" disabled={!ready} onClick={beginJudging}>
              Begin judging
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}

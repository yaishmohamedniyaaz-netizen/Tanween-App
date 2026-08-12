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
  categoryListLabel,
  judgeDisplayName,
  makeAssignmentSnapshot,
} from "../lib/judgeAssignments";
import {
  muqarrarLabel,
  participantCategoryLabel,
} from "../lib/participants";
import {
  activeGroupFor,
  groupRosterByDivision,
  matchesParticipantSearch,
  shouldOfferSearch,
} from "../lib/rosterQueue.ts";
import {
  DRAW_BOARD_SIZE,
  buildDeck,
  deckExhausted,
  deckScopeKey,
  questionAtPosition,
  spentPositions,
} from "../lib/questionDeck.ts";
import { uid } from "../lib/id";
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
  const [search, setSearch] = useState("");
  const [stage, setStage] = useState<"participant" | "draw">("participant");
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

  // Pressing a name is the whole decision: the board comes up straight away
  // rather than making the organiser confirm a choice they just made.
  const chooseParticipant = (entry: RosterEntry) => {
    if (entry.judged) return;
    setParticipantId(entry.id);
    setQuestionId("");
    setSearch("");
    setStage("draw");
  };

  // Pressing a number is beginning. The drawn id is passed in rather than read
  // back from state, which has not settled yet in the same tick.
  const startWithQuestion = (selectedQuestionId: string) => {
    if (!participant || !division || !assignment || !liveSnapshot) return;
    const selectedDraft = eligibleDrafts.find(
      (draft) => draft.id === selectedQuestionId,
    );
    const question =
      selectedQuestionId === "manual"
        ? manualQuestionAssignment({ participant, division })
        : selectedDraft
          ? assignmentFromDraft({ participant, draft: selectedDraft })
          : null;
    if (!question) return;
    dispatch({ type: "START_RECITER", participant, question });
    onClose();
  };

  const allowManual = liveSnapshot?.questionPolicy.mode === "manual";
  const waitingCount = roster.filter((entry) => !entry.judged).length;

  // The draw board for this reciter's division and muqarrar side. Cut once,
  // then reused for everyone in that block until the numbers run out.
  const deckScope =
    division && participant?.muqarrar
      ? deckScopeKey(state.competition.id, division.id, participant.muqarrar)
      : null;
  const deck =
    state.decks.find(
      (item) =>
        deckScopeKey(item.competitionId, item.divisionId, item.muqarrar) ===
        deckScope,
    ) ?? null;

  const candidateIds = useMemo(
    () => eligibleDrafts.map((draft) => draft.id),
    [eligibleDrafts],
  );

  useEffect(() => {
    if (!deckScope || deck || !division || !participant?.muqarrar) return;
    if (candidateIds.length === 0) return;
    dispatch({
      type: "FREEZE_DECK",
      deck: buildDeck({
        competitionId: state.competition.id,
        divisionId: division.id,
        muqarrar: participant.muqarrar,
        questionIds: candidateIds,
        seed: uid("deck"),
        size: DRAW_BOARD_SIZE,
        frozenAt: Date.now(),
      }),
    });
  }, [
    candidateIds,
    deck,
    deckScope,
    division,
    dispatch,
    participant?.muqarrar,
    state.competition.id,
  ]);

  const spentHere = deck ? spentPositions(state.draws, deck) : new Set<number>();
  const boardExhausted = deck ? deckExhausted(deck, state.draws) : false;

  // A reciter keeps the number they drew, so reopening this dialog shows the
  // same reveal rather than offering them a second pick.
  const myDraw = state.draws.find(
    (draw) =>
      draw.scopeKey === deckScope &&
      draw.seed === deck?.seed &&
      draw.participantId === participant?.id,
  );
  const [drawnPosition, setDrawnPosition] = useState<number | null>(null);
  useEffect(() => {
    setDrawnPosition(myDraw?.position ?? null);
    if (myDraw) setQuestionId(myDraw.questionId);
  }, [myDraw?.position, myDraw?.questionId, participant?.id]);

  const drawnQuestion = eligibleDrafts.find((draft) => draft.id === questionId);

  const drawPosition = (position: number) => {
    if (!deck || !participant) return;
    const drawnId = questionAtPosition(deck, position);
    if (!drawnId) return;
    dispatch({
      type: "RECORD_DRAW",
      draw: {
        version: 1,
        competitionId: deck.competitionId,
        scopeKey: deckScopeKey(deck.competitionId, deck.divisionId, deck.muqarrar),
        seed: deck.seed,
        position,
        questionId: drawnId,
        participantId: participant.id,
        revealedAt: Date.now(),
      },
    });
    setDrawnPosition(position);
    setQuestionId(drawnId);
    startWithQuestion(drawnId);
  };

  const rosterGroups = useMemo(
    () => groupRosterByDivision(roster, divisions),
    [roster, divisions],
  );
  const activeGroup = activeGroupFor(rosterGroups, participant?.id);
  const offerSearch = shouldOfferSearch(roster);

  // The queue lists everyone except whoever is already up — the card above
  // covers them, and repeating the row was the clearest duplication on this
  // screen. Groups that empty out under a search are dropped rather than left
  // as bare headings.
  const queueGroups = useMemo(
    () =>
      rosterGroups
        .map((group) => {
          const entries = group.entries.filter(
            (entry) =>
              entry.id !== participant?.id &&
              matchesParticipantSearch(entry, search),
          );
          // Counts describe the rows under the heading, so whoever is already
          // up is not also reported as waiting.
          return {
            ...group,
            entries,
            judged: entries.filter((entry) => entry.judged).length,
            waiting: entries.filter((entry) => !entry.judged).length,
          };
        })
        .filter((group) => group.entries.length > 0),
    [rosterGroups, participant?.id, search],
  );

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
          <small>{assignment ? categoryListLabel(assignment.categories) : "Choose the judge and criteria before starting."}</small>
          <button type="button" className="btn-ghost" onClick={onOpenSetup}>Change</button>
        </div>

        <div className="reciter-start-body">
          {stage === "participant" ? (
          <section className="reciter-start-step" aria-labelledby="reciter-step-participant">
            <div className="reciter-step-head">
              <span>1</span>
              <div>
                <h3 id="reciter-step-participant">Reciter</h3>
                <p>
                  {waitingCount > 0
                    ? `${waitingCount} still to judge · the next one is selected automatically`
                    : "Every participant in this roster has been judged."}
                </p>
              </div>
            </div>

            {activeGroup && (
              <p className="queue-block">
                <span className="queue-block-name">
                  {activeGroup.division?.name ?? "No matching division"}
                </span>
                <span className="queue-block-progress">
                  {activeGroup.judged} of {activeGroup.entries.length} judged
                </span>
              </p>
            )}

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

            {offerSearch && (
              <label className="queue-search">
                <Icon name="newUser" size={15} />
                <input
                  type="search"
                  value={search}
                  placeholder="Find by number, name or school"
                  aria-label="Find a participant"
                  onChange={(event) => setSearch(event.target.value)}
                />
              </label>
            )}

            <div className="queue-scroll">
              {queueGroups.length === 0 ? (
                <p className="queue-empty">
                  {search.trim()
                    ? `Nobody matches “${search.trim()}”.`
                    : "Nobody else is waiting."}
                </p>
              ) : (
                queueGroups.map((group) => (
                  <section className="queue-group" key={group.id}>
                    <h4>
                      <span>{group.division?.name ?? "No matching division"}</span>
                      <small>
                        {group.waiting > 0 ? `${group.waiting} waiting` : "All judged"}
                        {group.judged > 0 && group.waiting > 0 ? ` · ${group.judged} judged` : ""}
                      </small>
                    </h4>
                    <ul>
                      {group.entries.map((entry) => (
                        <li key={entry.id}>
                          <button
                            type="button"
                            disabled={entry.judged}
                            onClick={() => chooseParticipant(entry)}
                          >
                            <span className="queue-number">{entry.number || "—"}</span>
                            <strong>{entry.name || "Unnamed"}</strong>
                            <small className={entry.judged ? "is-judged" : "is-waiting"}>
                              {entry.judged ? "Judged" : "Waiting"}
                            </small>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </section>
                ))
              )}
            </div>
          </section>
          ) : (
          <section className="reciter-start-step question-choice-step" aria-labelledby="reciter-step-question">
            <div className="reciter-step-head">
              <span>2</span>
              <div>
                <h3 id="reciter-step-question">Question</h3>
                <p>
                  {participant
                    ? `${participant.number ? `${participant.number} · ` : ""}${participant.name}${participant.muqarrar ? ` · ${muqarrarLabel(participant.muqarrar)}` : ""}`
                    : "Select a participant first."}
                </p>
              </div>
            </div>

            {!participant || !division ? (
              <div className="question-choice-state">Select a participant with a matched division.</div>
            ) : !lookup && !questionLoadError ? (
              <div className="question-choice-state"><span className="loading-spinner" /> Checking prepared questions…</div>
            ) : (
              <>
                <div className="draw-board" role="group" aria-label="Question numbers">
                  {deck?.tiles.map((tile) => {
                    const spent = spentHere.has(tile.position);
                    const mine = drawnPosition === tile.position;
                    return (
                      <button
                        key={tile.position}
                        type="button"
                        // Nothing here names the passage. The board carries
                        // positions only until the organiser presses one.
                        className={`draw-tile ${mine ? "is-drawn" : ""} ${spent && !mine ? "is-spent" : ""}`}
                        disabled={spent && !mine}
                        aria-label={
                          spent && !mine
                            ? `Number ${tile.position}, already taken`
                            : `Number ${tile.position}`
                        }
                        onClick={() => drawPosition(tile.position)}
                      >
                        {tile.position}
                      </button>
                    );
                  })}
                </div>

                {drawnQuestion && (
                  <p className="draw-revealed">
                    <span>Number {drawnPosition}</span>
                    <strong>{questionRangeLabel(drawnQuestion)}</strong>
                    <small>
                      Pages {drawnQuestion.startPage}
                      {drawnQuestion.endPage !== drawnQuestion.startPage
                        ? `–${drawnQuestion.endPage}`
                        : ""}{" "}
                      · {drawnQuestion.resolvedLines} lines
                    </small>
                  </p>
                )}

                {deck && boardExhausted && (
                  <p className="question-choice-warning">
                    Every number in this division has been drawn. Add more
                    checked questions in setup before the next reciter.
                  </p>
                )}

                {allowManual && (
                  <button
                    type="button"
                    className={`draw-external ${questionId === "manual" ? "is-selected" : ""}`}
                    onClick={() => {
                      setQuestionId("manual");
                      setDrawnPosition(null);
                      startWithQuestion("manual");
                    }}
                  >
                    <strong>External question</strong>
                    <small>Confirm the printed question matches this division and muqarrar.</small>
                  </button>
                )}
              </>
            )}

            {lookup && eligibleDrafts.length === 0 && !allowManual && (
              <div className="question-choice-warning">No checked question is available for this participant. Return to setup.</div>
            )}
            {state.competition.isSample && (
              <p className="reciter-test-note">This is rehearsal data. The selected question is recorded, but it is not an approved official question set.</p>
            )}
          </section>
          )}
        </div>

        <footer className="reciter-start-actions">
          {stage === "participant" ? (
            <>
              <button type="button" className="btn-ghost" onClick={onOpenSetup}>View competition setup</button>
              <div>
                <span>{participant ? participant.name : "Nobody left to judge"}</span>
                <button
                  type="button"
                  className="btn-primary"
                  disabled={!participant || !division}
                  onClick={() => setStage("draw")}
                >
                  Draw question
                </button>
              </div>
            </>
          ) : (
            <>
              <button type="button" className="btn-ghost" onClick={() => setStage("participant")}>
                Back to reciter
              </button>
              <span className="reciter-start-cue">
                Press the number the reciter picks — judging starts straight away
              </span>
            </>
          )}
        </footer>
      </div>
    </div>
  );
}

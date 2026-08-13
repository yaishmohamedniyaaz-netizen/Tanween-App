import { useEffect, useMemo, useState } from "react";
import {
  buildSampleQuestionDrafts,
  questionDraftIssues,
  sampleQuestionCoverageComplete,
} from "../lib/questionDrafts.ts";
import {
  loadQuestionIndex,
  type QuestionIndexLookup,
} from "../lib/questionBank.ts";
import {
  assignmentFromDraft,
  eligibleQuestionDrafts,
  manualQuestionAssignment,
  participantDivision,
} from "../lib/reciterQuestions.ts";
import {
  categoryListLabel,
  judgeDisplayName,
  makeAssignmentSnapshot,
} from "../lib/judgeAssignments";
import {
  activeGroupFor,
  groupRosterByDivision,
  isWaiting,
  matchesParticipantSearch,
  queueOrder,
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
import { ParticipantSelectionScreen } from "./ParticipantSelectionScreen";
import { QuestionNumberScreen } from "./QuestionNumberScreen";

export function StartDialog({
  onOpenSetup,
  onClose,
}: {
  onOpenSetup: () => void;
  onClose: () => void;
}) {
  const { state, dispatch } = useJudging();
  const roster = state.roster;
  const next = roster.find(isWaiting);
  const [participantId, setParticipantId] = useState(next?.id ?? "");
  const [search, setSearch] = useState("");
  const [stage, setStage] = useState<"participant" | "draw">("participant");
  const [lookup, setLookup] = useState<QuestionIndexLookup | null>(null);
  const [questionLoadError, setQuestionLoadError] = useState(false);

  const liveSnapshot = state.competition.liveSnapshot;
  const participant =
    roster.find(
      (entry) => entry.id === participantId && !entry.judged,
    ) ?? next;
  const divisions = liveSnapshot?.divisions ?? state.competition.divisions;
  const division = participant
    ? participantDivision(participant, divisions)
    : undefined;
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
      sampleQuestionCoverageComplete(
        state.questionDrafts,
        state.competition,
      ) ||
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
    if (
      participantId &&
      roster.some(
        (entry) => entry.id === participantId && isWaiting(entry),
      )
    ) {
      return;
    }
    setParticipantId(next?.id ?? "");
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

  const chooseParticipant = (entry: RosterEntry) => {
    if (entry.judged) return;
    if (entry.absent) {
      dispatch({ type: "SET_PARTICIPANT_ABSENT", id: entry.id, absent: false });
    }
    setParticipantId(entry.id);
    setSearch("");
    setStage("draw");
  };

  const markParticipantAbsent = (entry: RosterEntry) => {
    const following = roster.find(
      (candidate) => candidate.id !== entry.id && isWaiting(candidate),
    );
    dispatch({ type: "SET_PARTICIPANT_ABSENT", id: entry.id, absent: true });
    setParticipantId(following?.id ?? "");
  };

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
  const waitingCount = roster.filter(isWaiting).length;
  const finishedCount = roster.filter((entry) => entry.judged).length;

  const deckScope =
    division && participant?.muqarrar
      ? deckScopeKey(
          state.competition.id,
          division.id,
          participant.muqarrar,
        )
      : null;
  const deck =
    state.decks.find(
      (item) =>
        deckScopeKey(
          item.competitionId,
          item.divisionId,
          item.muqarrar,
        ) === deckScope,
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
  const myDraw = state.draws.find(
    (draw) =>
      draw.scopeKey === deckScope &&
      draw.seed === deck?.seed &&
      draw.participantId === participant?.id,
  );
  const [drawnPosition, setDrawnPosition] = useState<number | null>(null);

  useEffect(() => {
    setDrawnPosition(myDraw?.position ?? null);
  }, [myDraw?.position, myDraw?.questionId, participant?.id]);

  const drawPosition = (position: number) => {
    if (!deck || !participant) return;
    const drawnId = questionAtPosition(deck, position);
    if (!drawnId) return;
    dispatch({
      type: "RECORD_DRAW",
      draw: {
        version: 1,
        competitionId: deck.competitionId,
        scopeKey: deckScopeKey(
          deck.competitionId,
          deck.divisionId,
          deck.muqarrar,
        ),
        seed: deck.seed,
        position,
        questionId: drawnId,
        participantId: participant.id,
        revealedAt: Date.now(),
      },
    });
    setDrawnPosition(position);
    startWithQuestion(drawnId);
  };

  const rosterGroups = useMemo(
    () => groupRosterByDivision(roster, divisions),
    [roster, divisions],
  );
  const activeGroup = activeGroupFor(rosterGroups, participant?.id);
  const offerSearch = shouldOfferSearch(roster);
  const queueGroups = useMemo(
    () =>
      rosterGroups
        .map((group) => {
          const entries = queueOrder(
            group.entries.filter(
              (entry) =>
                entry.id !== participant?.id &&
                matchesParticipantSearch(entry, search),
            ),
          );
          return {
            ...group,
            entries,
            judged: entries.filter((entry) => entry.judged).length,
            waiting: entries.filter(isWaiting).length,
            absent: entries.filter(
              (entry) => !entry.judged && entry.absent,
            ).length,
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
        className={`dialog reciter-start-dialog stage-${stage}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="reciter-start-title"
      >
        <header className="reciter-start-head">
          <div>
            <span className="dialog-kicker">
              {state.competition.name || "Competition"}
              {state.competition.isSample ? " · Test mode" : ""}
            </span>
            <h2 id="reciter-start-title">
              {stage === "participant" ? "Select reciter" : "Choose a question"}
            </h2>
            <p>
              {stage === "participant"
                ? "Select the next person in the running order."
                : "The reciter chooses an available number."}
            </p>
          </div>
          <button
            type="button"
            className="dialog-close"
            aria-label="Close"
            onClick={onClose}
          >
            ×
          </button>
        </header>

        {stage === "participant" && (
          <div className={`reciter-start-judge ${assignment ? "" : "is-missing"}`}>
            <span>This device</span>
            <strong>
              {assignment ? judgeDisplayName(assignment) : "No judge assigned"}
            </strong>
            <small>
              {assignment
                ? categoryListLabel(assignment.categories)
                : "Choose a judge and criteria before starting."}
            </small>
            <button type="button" className="btn-ghost" onClick={onOpenSetup}>
              Change
            </button>
          </div>
        )}

        <div className="reciter-start-body">
          {stage === "participant" ? (
            <ParticipantSelectionScreen
              recommended={participant}
              recommendedDivision={division}
              activeGroup={activeGroup}
              groups={queueGroups}
              waitingCount={waitingCount}
              finishedCount={finishedCount}
              offerSearch={offerSearch}
              search={search}
              onSearch={setSearch}
              onChoose={chooseParticipant}
              onMarkAbsent={markParticipantAbsent}
            />
          ) : (
            <QuestionNumberScreen
              participant={participant}
              division={division}
              deck={deck}
              spentPositions={spentHere}
              drawnPosition={drawnPosition}
              loading={!lookup && !questionLoadError}
              loadFailed={questionLoadError}
              boardExhausted={boardExhausted}
              allowManual={Boolean(allowManual)}
              hasEligibleQuestions={eligibleDrafts.length > 0}
              onDraw={drawPosition}
              onUseManual={() => {
                setDrawnPosition(null);
                startWithQuestion("manual");
              }}
              onBack={() => setStage("participant")}
            />
          )}
        </div>
      </div>
    </div>
  );
}

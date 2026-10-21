import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
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
import { makeAssignmentSnapshot } from "../lib/judgeAssignments";
import {
  activeGroupFor,
  groupRosterByDivision,
  isWaiting,
  shouldOfferSearch,
  visibleRosterGroups,
} from "../lib/rosterQueue.ts";
import {
  DRAW_BOARD_SIZE,
  buildDeck,
  deckCycle,
  deckExhausted,
  deckIsStale,
  deckScopeKey,
  latestDeckForScope,
  questionAtPosition,
  spentPositions,
} from "../lib/questionDeck.ts";
import { uid } from "../lib/id";
import { useJudging } from "../state/store";
import type { RosterEntry } from "../types";
import { ParticipantSelectionScreen } from "./ParticipantSelectionScreen";
import { QuestionNumberScreen } from "./QuestionNumberScreen";
import { useSessionSaveStatus } from "./SessionStorageBoundary";
import { questionOpeningPage } from "../lib/questionPage";

export function StartDialog({
  onOpenSetup,
  onClose,
  mode = "start",
  embedded = false,
  onPrepared,
  preparing = false,
  preparationError,
  onRetryPreparation,
}: {
  onOpenSetup: () => void;
  onClose: () => void;
  mode?: "start" | "next-question" | "change-reciter" | "change-question";
  embedded?: boolean;
  onPrepared?: (page: number | null) => void;
  preparing?: boolean;
  preparationError?: string | null;
  onRetryPreparation?: () => void;
}) {
  const { state, dispatch } = useJudging();
  const roster = state.roster;
  const prepared = state.preparedRecitation;
  const next =
    roster.find(
      (entry) =>
        isWaiting(entry) &&
        (mode !== "change-reciter" || entry.id !== prepared?.participant.id),
    ) ?? roster.find(isWaiting);
  const initialParticipant =
    mode === "change-question" ? prepared?.participant : next;
  const [participantId, setParticipantId] = useState(initialParticipant?.id ?? "");
  const [search, setSearch] = useState("");
  const [stage, setStage] = useState<"participant" | "draw">(
    mode === "change-question" || mode === "next-question"
      ? "draw"
      : "participant",
  );
  const [lookup, setLookup] = useState<QuestionIndexLookup | null>(null);
  const [questionLoadError, setQuestionLoadError] = useState(false);
  const modalRef = useRef<HTMLDialogElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const queueReturnRef = useRef<{ id: string; recommended: boolean; scroll: number } | null>(null);
  const preparedNewQuestionRef = useRef(false);
  const changedStageRef = useRef(false);
  const saveStatus = useSessionSaveStatus();

  useLayoutEffect(() => {
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const modal = modalRef.current;
    if (modal && !modal.open) modal.showModal();
    return () => {
      if (modal?.open) modal.close();
      requestAnimationFrame(() => {
        if (document.querySelector("dialog[open]")) return;
        const fallback = document.querySelector<HTMLElement>(".prepared-sidebar .btn-primary")
          ?? document.querySelector<HTMLElement>("[data-reciter-queue-launch]")
          ?? document.querySelector<HTMLElement>(".competition-start-reciter")
          ?? document.querySelector<HTMLElement>(".reciter-chip");
        const target = !preparedNewQuestionRef.current && opener?.isConnected &&
          opener.matches('button:not([disabled]), input, select, textarea, a[href], [tabindex]') && !opener.closest("[inert]")
          ? opener : fallback;
        target?.focus({ preventScroll: true });
      });
    };
  }, [embedded]);

  useLayoutEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;
    panel.querySelector<HTMLElement>(".reciter-start-body")?.scrollTo(0, 0);
    const point = stage === "participant" ? queueReturnRef.current : null;
    if (point) {
      queueReturnRef.current = null;
      const scroll = panel.querySelector<HTMLElement>(".queue-scroll");
      if (scroll) scroll.scrollTop = point.scroll;
      const controls = [...panel.querySelectorAll<HTMLButtonElement>("[data-queue-entry]")];
      const control = controls.find(
        (button) => button.dataset.queueEntry === point.id &&
          button.classList.contains("next-reciter-main") === point.recommended && !button.disabled,
      ) ?? controls.find((button) => button.dataset.queueEntry === point.id && !button.disabled);
      if (control) { control.focus({ preventScroll: true }); return; }
    }
    const initial = stage === "participant"
      ? panel.querySelector<HTMLElement>('[role="option"][aria-selected="true"]')
      : panel.querySelector<HTMLElement>('.draw-tile:not([disabled]), .draw-external:not([disabled])');
    (initial ?? titleRef.current)?.focus({ preventScroll: true });
  }, [stage]);

  useEffect(() => {
    if (stage !== "draw" || document.activeElement !== titleRef.current) return;
    panelRef.current?.querySelector<HTMLElement>('.draw-tile:not([disabled]), .draw-external:not([disabled])')?.focus({ preventScroll: true });
  }, [stage, lookup, state.decks]);

  useEffect(() => {
    if (saveStatus?.phase === "failed" || saveStatus?.phase === "conflict") onClose();
  }, [saveStatus?.phase, onClose]);

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
    if (entry.judged || !assignment || !liveSnapshot) return;
    if (entry.absent) {
      dispatch({ type: "SET_PARTICIPANT_ABSENT", id: entry.id, absent: false });
    }
    queueReturnRef.current = {
      id: entry.id,
      recommended: document.activeElement?.classList.contains("next-reciter-main") ?? false,
      scroll: panelRef.current?.querySelector(".queue-scroll")?.scrollTop ?? 0,
    };
    changedStageRef.current = true;
    setParticipantId(entry.id);
    setStage("draw");
  };

  const markParticipantAbsent = (entry: RosterEntry) => {
    const following = roster.find(
      (candidate) => candidate.id !== entry.id && isWaiting(candidate),
    );
    dispatch({ type: "SET_PARTICIPANT_ABSENT", id: entry.id, absent: true });
    setParticipantId(following?.id ?? "");
  };

  const prepareWithQuestion = (
    selectedQuestionId: string,
    draw?: { id: string; position: number; cycle: number },
  ) => {
    if (preparedNewQuestionRef.current || !participant || !division || !assignment || !liveSnapshot) return;
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
    preparedNewQuestionRef.current = true;
    dispatch({
      type: "PREPARE_RECITER",
      participant,
      question,
      ...(draw
        ? {
            drawId: draw.id,
            drawPosition: draw.position,
            drawCycle: draw.cycle,
          }
        : {}),
      ...(prepared
        ? {
            replacementReason:
              mode === "change-reciter"
                ? ("reciter-changed" as const)
                : ("question-changed" as const),
          }
        : {}),
    });
    if (onPrepared) onPrepared(questionOpeningPage(question));
    else onClose();
  };

  const allowManual = liveSnapshot?.questionPolicy.mode === "manual";
  const waitingCount = roster.filter(isWaiting).length;

  const deckScope =
    division && participant?.muqarrar
      ? deckScopeKey(
          state.competition.id,
          division.id,
          participant.muqarrar,
        )
      : null;
  const candidateIds = useMemo(
    () => eligibleDrafts.map((draft) => draft.id),
    [eligibleDrafts],
  );

  const latestDeck =
    division && participant?.muqarrar
      ? latestDeckForScope(
          state.decks,
          state.competition.id,
          division.id,
          participant.muqarrar,
        )
      : null;
  const latestExhausted = latestDeck
    ? deckExhausted(latestDeck, state.draws)
    : false;
  const latestStale = latestDeck
    ? deckIsStale(latestDeck, candidateIds)
    : false;
  const deck =
    latestDeck && !latestExhausted && !latestStale ? latestDeck : null;

  useEffect(() => {
    if (!deckScope || deck || !division || !participant?.muqarrar) return;
    if (candidateIds.length === 0) return;
    const cycle = latestDeck ? deckCycle(latestDeck) + 1 : 1;
    dispatch({
      type: "FREEZE_DECK",
      deck: buildDeck({
        competitionId: state.competition.id,
        divisionId: division.id,
        muqarrar: participant.muqarrar,
        questionIds: candidateIds,
        seed: uid(`deck-cycle-${cycle}`),
        size: DRAW_BOARD_SIZE,
        frozenAt: Date.now(),
        cycle,
      }),
    });
  }, [
    candidateIds,
    deck,
    deckScope,
    division,
    dispatch,
    latestDeck,
    participant?.muqarrar,
    state.competition.id,
  ]);

  const spentHere = deck ? spentPositions(state.draws, deck) : new Set<number>();

  const drawPosition = (position: number) => {
    if (preparedNewQuestionRef.current) return;
    if (
      !deck ||
      !participant ||
      !division ||
      !assignment ||
      !liveSnapshot
    ) return;
    const drawnId = questionAtPosition(deck, position);
    if (!drawnId) return;
    const drawId = uid("draw");
    dispatch({
      type: "RECORD_DRAW",
      draw: {
        version: 2,
        id: drawId,
        competitionId: deck.competitionId,
        scopeKey: deckScopeKey(
          deck.competitionId,
          deck.divisionId,
          deck.muqarrar,
        ),
        seed: deck.seed,
        cycle: deckCycle(deck),
        position,
        questionId: drawnId,
        participantId: participant.id,
        revealedAt: Date.now(),
        ...(prepared?.question.drawId
          ? { replacesDrawId: prepared.question.drawId }
          : {}),
      },
    });
    prepareWithQuestion(drawnId, {
      id: drawId,
      position,
      cycle: deckCycle(deck),
    });
  };

  const rosterGroups = useMemo(
    () => groupRosterByDivision(roster, divisions),
    [roster, divisions],
  );
  const activeGroup = activeGroupFor(rosterGroups, participant?.id);
  const offerSearch = shouldOfferSearch(roster);
  const queueGroups = useMemo(
    () => visibleRosterGroups(rosterGroups, undefined, search),
    [rosterGroups, search],
  );

  const content = (
    <div
      className={`dialog-backdrop reciter-start-backdrop stage-${stage} ${embedded ? "is-embedded" : ""}`}
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        className={`dialog reciter-start-dialog stage-${stage} ${assignment ? "has-assignment" : "is-missing-assignment"} ${changedStageRef.current ? "has-changed-stage" : ""}`}
        aria-labelledby="reciter-start-title"
      >
        <header className="reciter-start-head">
          <div>
            <h2 id="reciter-start-title" ref={titleRef} tabIndex={-1}>
              {stage === "participant" ? "Reciter queue" : "Choose a question"}
            </h2>
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

        {stage === "participant" && !assignment && (
          <div className="reciter-start-judge is-missing">
            <span>Judging</span>
            <strong>Judge assignment required</strong>
            <small>Choose the judge and criteria before drawing a question.</small>
            <button type="button" className="btn-ghost" onClick={onOpenSetup}>
              Open setup
            </button>
          </div>
        )}

        <div className="reciter-start-body quiet-scroll" aria-busy={(preparing && !preparationError) || undefined}>
          {preparing && <div className="question-opening-status" role={preparationError ? "alert" : "status"}>
            <span>{preparationError ? "The question page could not load." : "Opening question…"}</span>
            {preparationError && <button type="button" className="btn-ghost" onClick={onRetryPreparation}>Retry</button>}
          </div>}
          <div className="reciter-queue-stage" hidden={stage !== "participant"}>
            <ParticipantSelectionScreen
              recommended={next}
              preparedId={prepared?.participant.id}
              activeGroup={activeGroup}
              groups={queueGroups}
              participantCount={roster.length}
              waitingCount={waitingCount}
              offerSearch={offerSearch}
              search={search}
              selectionDisabled={!assignment}
              onSearch={setSearch}
              onChoose={chooseParticipant}
              onMarkAbsent={markParticipantAbsent}
            />
          </div>
          {stage === "draw" && <div className="reciter-draw-stage" ref={node => node?.toggleAttribute("inert", preparing)}>
            <QuestionNumberScreen
              participant={participant}
              participantCount={roster.length}
              division={division}
              deck={deck}
              spentPositions={spentHere}
              drawnPosition={null}
              loading={
                (!lookup && !questionLoadError) ||
                (candidateIds.length > 0 && !deck)
              }
              loadFailed={questionLoadError}
              allowManual={Boolean(allowManual)}
              hasEligibleQuestions={eligibleDrafts.length > 0}
              blockedReason={
                assignment
                  ? undefined
                  : "Judge assignment required before drawing a question."
              }
              onDraw={drawPosition}
              onUseManual={() => {
                prepareWithQuestion("manual");
              }}
              onBack={() =>
                mode === "change-question" ? onClose() : setStage("participant")
              }
            />
          </div>}
        </div>
      </div>
    </div>
  );
  return embedded ? content : (
    <dialog
      ref={modalRef}
      className="reciter-queue-modal"
      aria-labelledby="reciter-start-title"
      onCancel={(event) => { event.preventDefault(); onClose(); }}
      onKeyDown={(event) => {
        if (event.key !== "Tab") return;
        const controls = [...event.currentTarget.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input:not([disabled]), select:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
        )].filter((element) => element.tabIndex >= 0 && element.getClientRects().length > 0 && !element.closest("[hidden], [inert]"));
        const first = controls[0], last = controls[controls.length - 1], active = document.activeElement;
        if (!first || !last) { event.preventDefault(); return; }
        if (event.shiftKey && (active === first || active === titleRef.current)) {
          event.preventDefault(); last.focus();
        } else if (!event.shiftKey && active === last) {
          event.preventDefault(); first.focus();
        }
      }}
    >
      {content}
    </dialog>
  );
}

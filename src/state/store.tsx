import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  type ReactNode,
} from "react";
import {
  DEFAULT_CONFIG,
  STORAGE_KEY,
  TOTAL_MARKS,
  cloneScoreConfig,
  enabledCategories,
  enabledMarksTotal,
  isImpressionCategory,
  normalizeScoreConfig,
} from "../config";
import {
  LEDGER_VERSION,
  latestMistakeEventIds,
  projectImpressions,
  projectMistakes,
  seedLedgerEvents,
} from "../lib/judgingLedger";
import {
  computeAssignedScores,
  computeScores,
} from "../lib/scoring";
import {
  createPanelPreset,
  judgeSeatFor,
  legacyAssignment,
  makeAssignmentSnapshot,
  normalizeAssignment,
  normalizeJudgePanel,
  validateJudgePanel,
} from "../lib/judgeAssignments";
import { uid } from "../lib/id";
import { loadPage } from "../lib/page";
import {
  EMPTY_PARTICIPANT,
  normalizeParticipant,
  normalizeRosterEntry,
} from "../lib/participants";
import {
  bumpDraftCompetition,
  competitionReadiness,
  createLiveCompetitionSnapshot,
  EMPTY_COMPETITION,
  normalizeCompetition,
  normalizeQuestionPolicy,
} from "../lib/competition";
import {
  createSampleCompetition,
  createSampleRoster,
} from "../lib/sampleCompetition";
import { normalizeQuestionDrafts } from "../lib/questionDrafts";
import {
  deckCycle,
  deckScopeKey,
  normalizeQuestionDeck,
  normalizeQuestionDrawRecord,
  questionAtPosition,
} from "../lib/questionDeck";
import {
  normalizeQuestionAssignment,
  questionAssignmentIsValid,
} from "../lib/reciterQuestions";
import { normalizePreparedRecitation } from "../lib/preparedRecitation";
import {
  buildTargetMigrationPatches,
  type TargetMigrationPatches,
} from "./migrateTargets";
import type {
  CategoryId,
  CompetitionConfig,
  CompetitionDivision,
  CompetitionQuestionDraft,
  CompetitionQuestionPolicy,
  FinalizedResult,
  JudgeAssignmentSnapshot,
  JudgePanelConfig,
  JudgingEvent,
  JudgingState,
  Mistake,
  Participant,
  PreparedRecitation,
  QuestionDeck,
  QuestionDrawRecord,
  ReciterQuestionAssignment,
  RosterEntry,
  SavedSession,
} from "../types";

const initialState: JudgingState = {
  competition: createSampleCompetition(),
  questionDrafts: [],
  decks: [],
  draws: [],
  sampleQuestionsInitialized: false,
  participant: { ...EMPTY_PARTICIPANT },
  sessionActive: false,
  preparedRecitation: null,
  activeSessionId: null,
  activeStartedAt: null,
  activeRevision: 1,
  activeAssignment: null,
  activeQuestion: null,
  events: [],
  config: cloneScoreConfig(DEFAULT_CONFIG),
  panel: createPanelPreset("all", enabledCategories(DEFAULT_CONFIG)),
  deviceJudgeId: "judge-1",
  mistakes: [],
  impressions: [],
  notes: "",
  history: [],
  roster: createSampleRoster(),
  finalizedResults: [],
};

/** Non-destructive checkpoint of the last pre-target-V2 browser state. */
export const PRE_TARGET_V2_BACKUP_KEY =
  "tahqeeq.session.v1.backup.pre-target-v2";

/** Untouched browser state from immediately before the readable ledger upgrade. */
export const PRE_LEDGER_BACKUP_KEY =
  "tahqeeq.session.v1.backup.pre-ledger-v1";

/** Untouched browser state from immediately before judge ownership was added. */
export const PRE_JUDGE_ASSIGNMENTS_BACKUP_KEY =
  "tahqeeq.session.v1.backup.pre-judge-assignments-v1";

/** Untouched state before participant schema and finalized results were added. */
export const PRE_COMPETITION_RESULTS_BACKUP_KEY =
  "tahqeeq.session.v1.backup.pre-competition-results-v1";

/** Untouched browser state before official competition lifecycle was added. */
export const PRE_QUESTION_BANK_BACKUP_KEY =
  "tahqeeq.session.v1.backup.pre-question-bank-v1";

/** Untouched browser state from immediately before optional criteria existed. */
export const PRE_ADU_RAAGU_BACKUP_KEY =
  "tahqeeq.session.v1.backup.pre-adu-raagu-v1";

/** Untouched browser state from immediately before draft question authoring. */
export const PRE_QUESTION_BUILDER_BACKUP_KEY =
  "tahqeeq.session.v1.backup.pre-question-builder-v1";

/** Untouched state before a revealed draw became a recoverable Prepared step. */
export const PRE_PREPARED_RECITATION_BACKUP_KEY =
  "tahqeeq.session.v1.backup.pre-prepared-recitation-v1";

type Action =
  | { type: "ADD_MISTAKE"; mistake: Mistake }
  | { type: "REMOVE_MISTAKE"; id: string }
  | { type: "RESTORE_MISTAKE"; eventId: string }
  | { type: "SET_MISTAKE_AMOUNT"; id: string; amount: number }
  | { type: "SET_MISTAKE_NOTE"; id: string; note: string }
  | {
      type: "SET_CONFIG";
      category: CategoryId;
      start?: number;
      step?: number;
      enabled?: boolean;
    }
  | { type: "SET_IMPRESSION"; category: CategoryId; awarded: number }
  | { type: "SET_IMPRESSION_NOTE"; category: CategoryId; note: string }
  | { type: "SET_PANEL"; panel: JudgePanelConfig; deviceJudgeId: string }
  | { type: "SET_DEVICE_JUDGE"; judgeSeatId: string }
  | { type: "SET_COMPETITION"; competition: CompetitionConfig }
  | { type: "SET_DIVISIONS"; divisions: CompetitionDivision[] }
  | { type: "SET_QUESTION_POLICY"; policy: CompetitionQuestionPolicy }
  | { type: "UPSERT_QUESTION_DRAFT"; draft: CompetitionQuestionDraft }
  | { type: "REMOVE_QUESTION_DRAFT"; id: string }
  | { type: "INITIALIZE_SAMPLE_QUESTIONS"; drafts: CompetitionQuestionDraft[] }
  | { type: "START_COMPETITION" }
  | { type: "CLOSE_COMPETITION" }
  | { type: "NEW_COMPETITION" }
  | { type: "LOAD_SAMPLE_COMPETITION" }
  | { type: "REMOVE_SAMPLE_DATA" }
  | { type: "SET_NOTES"; notes: string }
  | { type: "SET_PARTICIPANT"; patch: Partial<Participant> }
  | { type: "CLEAR_MARKS" }
  | { type: "DELETE_SESSION"; id: string }
  | { type: "CLEAR_HISTORY" }
  | { type: "LOAD_ROSTER"; entries: RosterEntry[] }
  | { type: "IMPORT_SESSION"; session: SavedSession }
  | { type: "UPSERT_FINAL_RESULT"; result: FinalizedResult }
  | { type: "SET_PARTICIPANT_ABSENT"; id: string; absent: boolean }
  | { type: "CLEAR_ROSTER" }
  | {
      type: "PREPARE_RECITER";
      participant: Participant;
      question: ReciterQuestionAssignment;
      drawId?: string;
      drawPosition?: number;
      drawCycle?: number;
      replacementReason?: "question-changed" | "reciter-changed";
    }
  | { type: "BEGIN_RECITER" }
  | { type: "FINISH_SESSION" }
  | { type: "REOPEN_SESSION"; id: string; reason: string }
  | { type: "FREEZE_DECK"; deck: QuestionDeck }
  | { type: "RECORD_DRAW"; draw: QuestionDrawRecord }
  | { type: "APPLY_TARGET_MIGRATION"; patches: TargetMigrationPatches }
  | { type: "LOAD"; state: JudgingState };

const round2 = (n: number) => Math.round(n * 100) / 100;

function withEvent(state: JudgingState, event: JudgingEvent): JudgingState {
  const events = [...state.events, event];
  return {
    ...state,
    events,
    mistakes: projectMistakes(events),
    impressions: projectImpressions(events),
  };
}

function eventsWithAssignment(
  events: JudgingEvent[],
  assignment: JudgeAssignmentSnapshot,
): JudgingEvent[] {
  return events.map((event) => {
    if (event.type === "session_started") {
      return {
        ...event,
        participant: normalizeParticipant(event.participant),
        assignment: event.assignment
          ? normalizeAssignment(event.assignment, assignment.config)
          : assignment,
        question: normalizeQuestionAssignment(event.question) ?? undefined,
      };
    }
    if (
      event.type === "mistake_added" ||
      event.type === "mistake_undone" ||
      event.type === "mistake_restored"
    ) {
      return {
        ...event,
        mistake: {
          ...event.mistake,
          judgeSeatId: event.mistake.judgeSeatId ?? assignment.judgeSeatId,
        },
      };
    }
    return event;
  });
}

function patchEvent(
  event: JudgingEvent,
  patches: TargetMigrationPatches,
): JudgingEvent {
  if (
    event.type === "mistake_added" ||
    event.type === "mistake_undone" ||
    event.type === "mistake_restored"
  ) {
    return {
      ...event,
      mistake: {
        ...event.mistake,
        ...(patches[event.mistake.id] ?? {}),
      },
    };
  }
  return event;
}

function reducer(state: JudgingState, action: Action): JudgingState {
  switch (action.type) {
    case "ADD_MISTAKE": {
      if (
        !state.sessionActive ||
        !state.activeAssignment ||
        !state.activeAssignment.categories.includes(action.mistake.category)
      ) {
        return state;
      }
      const judgeSeatId = state.activeAssignment.judgeSeatId;
      // A letter carries one finding per judge. Marking an already-marked
      // letter corrects it instead of stacking a second deduction, because
      // picking the wrong criterion is an ordinary slip mid-recitation.
      // Scoped to the seat: with one judge per criterion, two judges marking
      // the same letter are two findings, not a correction.
      const existing = state.mistakes.find(
        (item) =>
          item.tid === action.mistake.tid &&
          (item.judgeSeatId ?? judgeSeatId) === judgeSeatId,
      );
      if (existing) {
        // Re-marking under the same criterion changes nothing, so a double
        // press cannot deduct twice. Any amount the judge set by hand stands.
        if (existing.category === action.mistake.category) return state;
        return withEvent(state, {
          id: uid("e"),
          at: Date.now(),
          type: "mistake_recategorized",
          mistakeId: existing.id,
          glyph: existing.glyph,
          label: existing.label,
          from: existing.category,
          to: action.mistake.category,
          fromAmount: existing.amount,
          toAmount: action.mistake.amount,
        });
      }
      return withEvent(state, {
        id: uid("e"),
        at: Date.now(),
        type: "mistake_added",
        mistake: {
          ...action.mistake,
          judgeSeatId,
        },
      });
    }
    case "REMOVE_MISTAKE": {
      const mistake = state.mistakes.find((item) => item.id === action.id);
      if (!mistake) return state;
      return withEvent(state, {
        id: uid("e"),
        at: Date.now(),
        type: "mistake_undone",
        mistake: { ...mistake },
      });
    }
    case "RESTORE_MISTAKE": {
      const source = state.events.find(
        (event) =>
          event.id === action.eventId && event.type === "mistake_undone",
      );
      if (!source || source.type !== "mistake_undone") return state;
      if (
        !state.sessionActive ||
        !state.activeAssignment?.categories.includes(source.mistake.category)
      ) {
        return state;
      }
      if (state.mistakes.some((item) => item.id === source.mistake.id)) return state;
      const latest = latestMistakeEventIds(state.events).get(source.mistake.id);
      if (latest !== source.id) return state;
      return withEvent(state, {
        id: uid("e"),
        at: Date.now(),
        type: "mistake_restored",
        mistake: { ...source.mistake },
      });
    }
    case "SET_MISTAKE_AMOUNT": {
      const mistake = state.mistakes.find((item) => item.id === action.id);
      if (!mistake) return state;
      const amount = round2(Math.max(0, action.amount));
      if (amount === mistake.amount) return state;
      return withEvent(state, {
        id: uid("e"),
        at: Date.now(),
        type: "mistake_amount_changed",
        mistakeId: mistake.id,
        glyph: mistake.glyph,
        label: mistake.label,
        from: mistake.amount,
        to: amount,
      });
    }
    case "SET_MISTAKE_NOTE": {
      const mistake = state.mistakes.find((item) => item.id === action.id);
      if (!mistake || (mistake.note ?? "") === action.note) return state;
      return withEvent(state, {
        id: uid("e"),
        at: Date.now(),
        type: "mistake_note_changed",
        mistakeId: mistake.id,
        glyph: mistake.glyph,
        label: mistake.label,
        from: mistake.note ?? "",
        to: action.note,
      });
    }
    case "SET_CONFIG": {
      if (state.sessionActive || state.preparedRecitation || state.competition.status !== "draft") return state;
      const current = state.config[action.category];
      const enabled = action.enabled ?? current.enabled;
      const config = normalizeScoreConfig({
        ...state.config,
        [action.category]: {
          enabled,
          start: enabled ? (action.start ?? current.start) : 0,
          step: action.step ?? current.step,
        },
      });
      // A criterion that is no longer judged cannot keep its scoring seat.
      const judged = enabledCategories(config);
      const panel = normalizeJudgePanel(
        {
          ...state.panel,
          seats: state.panel.seats.map((seat) => ({
            ...seat,
            categories: seat.categories.filter((item) => judged.includes(item)),
          })),
        },
        judged,
      );
      return {
        ...state,
        competition: bumpDraftCompetition(state.competition),
        config,
        panel,
        deviceJudgeId: judgeSeatFor(panel, state.deviceJudgeId)
          ? state.deviceJudgeId
          : (panel.seats[0]?.id ?? null),
      };
    }
    case "SET_IMPRESSION": {
      const assignment = state.activeAssignment;
      if (
        !state.sessionActive ||
        !assignment ||
        !isImpressionCategory(action.category) ||
        !assignment.categories.includes(action.category) ||
        !assignment.config[action.category].enabled
      ) {
        return state;
      }
      const start = assignment.config[action.category].start;
      const awarded = round2(Math.min(start, Math.max(0, action.awarded)));
      const previous = state.impressions.find(
        (item) => item.category === action.category,
      );
      if (previous?.set && previous.awarded === awarded) return state;
      return withEvent(state, {
        id: uid("e"),
        at: Date.now(),
        type: "impression_changed",
        category: action.category,
        from: previous?.set ? previous.awarded : start,
        to: awarded,
        judgeSeatId: assignment.judgeSeatId,
      });
    }
    case "SET_IMPRESSION_NOTE": {
      const assignment = state.activeAssignment;
      if (
        !state.sessionActive ||
        !assignment ||
        !isImpressionCategory(action.category) ||
        !assignment.categories.includes(action.category)
      ) {
        return state;
      }
      const previous = state.impressions.find(
        (item) => item.category === action.category,
      );
      if ((previous?.note ?? "") === action.note) return state;
      return withEvent(state, {
        id: uid("e"),
        at: Date.now(),
        type: "impression_note_changed",
        category: action.category,
        from: previous?.note ?? "",
        to: action.note,
      });
    }
    case "SET_PANEL": {
      if (
        state.sessionActive ||
        state.preparedRecitation ||
        state.competition.status !== "draft" ||
        !validateJudgePanel(action.panel, enabledCategories(state.config)).valid
      ) {
        return state;
      }
      const panel = normalizeJudgePanel(
        action.panel,
        enabledCategories(state.config),
      );
      if (!judgeSeatFor(panel, action.deviceJudgeId)) return state;
      return {
        ...state,
        competition: bumpDraftCompetition(state.competition),
        panel,
        deviceJudgeId: action.deviceJudgeId,
      };
    }
    case "SET_DEVICE_JUDGE":
      if (
        state.sessionActive ||
        state.preparedRecitation ||
        !judgeSeatFor(state.panel, action.judgeSeatId)
      ) {
        return state;
      }
      return { ...state, deviceJudgeId: action.judgeSeatId };
    case "SET_COMPETITION":
      if (state.sessionActive || state.preparedRecitation || state.competition.status !== "draft") return state;
      return {
        ...state,
        competition: bumpDraftCompetition(state.competition, {
          id: action.competition.id,
          name: action.competition.name,
          edition: action.competition.edition,
          divisions: action.competition.divisions,
          questionPolicy: action.competition.questionPolicy,
        }),
      };
    case "SET_DIVISIONS":
      if (state.sessionActive || state.preparedRecitation || state.competition.status !== "draft") return state;
      return {
        ...state,
        competition: bumpDraftCompetition(state.competition, {
          divisions: action.divisions,
        }),
      };
    case "SET_QUESTION_POLICY":
      if (state.sessionActive || state.preparedRecitation || state.competition.status !== "draft") return state;
      return {
        ...state,
        competition: bumpDraftCompetition(state.competition, {
          questionPolicy: normalizeQuestionPolicy(action.policy),
        }),
      };
    case "UPSERT_QUESTION_DRAFT": {
      if (
        state.sessionActive ||
        state.preparedRecitation ||
        state.competition.status !== "draft" ||
        action.draft.competitionId !== state.competition.id ||
        action.draft.isSample !== state.competition.isSample ||
        !state.competition.divisions.some((division) => division.id === action.draft.divisionId)
      ) {
        return state;
      }
      const drafts = normalizeQuestionDrafts([
        action.draft,
        ...state.questionDrafts.filter((draft) => draft.id !== action.draft.id),
      ]);
      return { ...state, questionDrafts: drafts };
    }
    case "REMOVE_QUESTION_DRAFT":
      if (state.sessionActive || state.preparedRecitation || state.competition.status !== "draft") return state;
      return {
        ...state,
        questionDrafts: state.questionDrafts.filter(
          (draft) => draft.id !== action.id || draft.competitionId !== state.competition.id,
        ),
      };
    case "INITIALIZE_SAMPLE_QUESTIONS":
      if (
        !state.competition.isSample ||
        state.sessionActive ||
        state.preparedRecitation ||
        state.competition.status === "closed"
      ) {
        return state;
      }
      return {
        ...state,
        sampleQuestionsInitialized: true,
        questionDrafts: normalizeQuestionDrafts([
          ...action.drafts,
          ...state.questionDrafts.filter((draft) => !draft.isSample),
        ]),
      };
    case "START_COMPETITION": {
      if (state.sessionActive || state.preparedRecitation || state.competition.status !== "draft") return state;
      const readiness = competitionReadiness(state);
      if (!readiness.ready) return state;
      const liveSnapshot = createLiveCompetitionSnapshot(state);
      return {
        ...state,
        competition: {
          ...state.competition,
          status: "live",
          liveSnapshot,
          closedAt: undefined,
        },
      };
    }
    case "CLOSE_COMPETITION":
      if (state.sessionActive || state.preparedRecitation || state.competition.status !== "live") return state;
      return {
        ...state,
        competition: {
          ...state.competition,
          status: "closed",
          closedAt: Date.now(),
        },
      };
    case "NEW_COMPETITION":
      if (state.sessionActive || state.preparedRecitation || state.competition.status === "live") return state;
      return {
        ...state,
        competition: { ...EMPTY_COMPETITION, questionPolicy: { ...EMPTY_COMPETITION.questionPolicy } },
        sampleQuestionsInitialized: true,
        participant: { ...EMPTY_PARTICIPANT },
        preparedRecitation: null,
        config: cloneScoreConfig(DEFAULT_CONFIG),
        panel: createPanelPreset("all", enabledCategories(DEFAULT_CONFIG)),
        deviceJudgeId: "judge-1",
        roster: [],
        mistakes: [],
        impressions: [],
        notes: "",
        events: [],
      };
    case "LOAD_SAMPLE_COMPETITION":
      if (state.sessionActive || state.preparedRecitation || state.competition.status === "live") return state;
      return {
        ...state,
        competition: createSampleCompetition(),
        questionDrafts: state.questionDrafts.filter((draft) => !draft.isSample),
        decks: [],
        draws: [],
        sampleQuestionsInitialized: false,
        participant: { ...EMPTY_PARTICIPANT },
        preparedRecitation: null,
        config: cloneScoreConfig(DEFAULT_CONFIG),
        panel: createPanelPreset("all", enabledCategories(DEFAULT_CONFIG)),
        deviceJudgeId: "judge-1",
        roster: createSampleRoster(),
        mistakes: [],
        impressions: [],
        notes: "",
        events: [],
        history: state.history.filter((session) => !session.isSample),
        finalizedResults: state.finalizedResults.filter((result) => !result.isSample),
      };
    case "REMOVE_SAMPLE_DATA":
      if (state.sessionActive || state.preparedRecitation || state.competition.status === "live") return state;
      return {
        ...state,
        ...(state.competition.isSample
          ? {
              competition: {
                ...EMPTY_COMPETITION,
                questionPolicy: { ...EMPTY_COMPETITION.questionPolicy },
              },
              participant: { ...EMPTY_PARTICIPANT },
              preparedRecitation: null,
              config: cloneScoreConfig(DEFAULT_CONFIG),
              panel: createPanelPreset("all", enabledCategories(DEFAULT_CONFIG)),
              deviceJudgeId: "judge-1",
              roster: [],
              mistakes: [],
              impressions: [],
              notes: "",
              events: [],
            }
          : {}),
        questionDrafts: state.questionDrafts.filter((draft) => !draft.isSample),
        decks: state.decks.filter((deck) => deck.competitionId !== state.competition.id),
        draws: state.draws.filter((draw) => draw.competitionId !== state.competition.id),
        sampleQuestionsInitialized: true,
        history: state.history.filter((session) => !session.isSample),
        finalizedResults: state.finalizedResults.filter((result) => !result.isSample),
      };
    case "FREEZE_DECK": {
      // One immutable board is allowed per recorded cycle. A new board can be
      // cut only as the next cycle after the previous twenty positions are
      // exhausted; a duplicate cycle would change unrevealed meanings.
      const key = deckScopeKey(
        action.deck.competitionId,
        action.deck.divisionId,
        action.deck.muqarrar,
      );
      const exists = state.decks.some(
        (deck) =>
          deckScopeKey(deck.competitionId, deck.divisionId, deck.muqarrar) === key &&
          deckCycle(deck) === deckCycle(action.deck),
      );
      if (exists) return state;
      return { ...state, decks: [...state.decks, action.deck] };
    }
    case "RECORD_DRAW": {
      const deck = state.decks.find(
        (candidate) =>
          candidate.seed === action.draw.seed &&
          deckScopeKey(
            candidate.competitionId,
            candidate.divisionId,
            candidate.muqarrar,
          ) === action.draw.scopeKey,
      );
      if (
        !deck ||
        questionAtPosition(deck, action.draw.position) !== action.draw.questionId
      ) {
        return state;
      }
      const already = state.draws.some(
        (draw) =>
          draw.scopeKey === action.draw.scopeKey &&
          draw.seed === action.draw.seed &&
          draw.position === action.draw.position,
      );
      if (already) return state;
      const draw = normalizeQuestionDrawRecord({
        ...action.draw,
        version: 2,
        cycle: deckCycle(deck),
      });
      if (!draw) return state;
      if (
        draw.replacesDrawId &&
        !state.draws.some((candidate) => candidate.id === draw.replacesDrawId)
      ) {
        return state;
      }
      return { ...state, draws: [...state.draws, draw] };
    }
    case "SET_PARTICIPANT_ABSENT":
      return {
        ...state,
        roster: state.roster.map((entry) =>
          entry.id === action.id ? { ...entry, absent: action.absent } : entry,
        ),
      };
    case "SET_NOTES":
      return { ...state, notes: action.notes };
    case "SET_PARTICIPANT":
      return {
        ...state,
        participant: normalizeParticipant({
          ...state.participant,
          ...action.patch,
        }),
      };
    case "CLEAR_MARKS": {
      const events = [...state.events];
      const at = Date.now();
      state.mistakes.forEach((mistake, index) => {
        events.push({
          id: uid("e"),
          at: at + index,
          type: "mistake_undone",
          mistake: { ...mistake },
        });
      });
      return {
        ...state,
        events,
        mistakes: projectMistakes(events),
        impressions: projectImpressions(events),
        notes: "",
      };
    }
    case "DELETE_SESSION":
      return {
        ...state,
        history: state.history.filter((session) => session.id !== action.id),
      };
    case "CLEAR_HISTORY":
      return { ...state, history: [] };
    case "LOAD_ROSTER":
      if (state.sessionActive || state.preparedRecitation || state.competition.status !== "draft") return state;
      return {
        ...state,
        competition: bumpDraftCompetition(state.competition),
        roster: action.entries.map((entry) => normalizeRosterEntry(entry)),
      };
    case "IMPORT_SESSION": {
      if (state.sessionActive || state.preparedRecitation) return state;
      const incoming = normalizeSavedSession({
        ...action.session,
        competitionId: action.session.competitionId ?? state.competition.id,
        competitionVersionId:
          action.session.competitionVersionId ??
          state.competition.liveSnapshot?.versionId,
      });
      const existing = state.history.find((session) => session.id === incoming.id);
      if (!existing) {
        return { ...state, history: [incoming, ...state.history] };
      }
      if (JSON.stringify(existing) === JSON.stringify(incoming)) return state;
      const conflictCopy: SavedSession = {
        ...incoming,
        id: `${incoming.id}:import:${uid("r")}`,
        sourceSessionId: incoming.sourceSessionId ?? incoming.id,
        importedAt: Date.now(),
        conflictsWith: existing.id,
      };
      return { ...state, history: [conflictCopy, ...state.history] };
    }
    case "UPSERT_FINAL_RESULT":
      return {
        ...state,
        finalizedResults: [
          {
            ...action.result,
            isSample: action.result.isSample ?? state.competition.isSample,
            competitionId:
              action.result.competitionId ?? state.competition.id,
            competitionVersionId:
              action.result.competitionVersionId ??
              state.competition.liveSnapshot?.versionId,
          },
          ...state.finalizedResults.map((result) =>
            result.id === action.result.id && !result.supersededAt
              ? {
                  ...result,
                  id: `${result.id}:revision:${result.revision}`,
                  supersededAt: action.result.finalizedAt,
                  supersededByRevision: action.result.revision,
                }
              : result,
          ),
        ],
      };
    case "CLEAR_ROSTER":
      if (state.sessionActive || state.preparedRecitation || state.competition.status !== "draft") return state;
      return {
        ...state,
        competition: bumpDraftCompetition(state.competition),
        roster: [],
      };
    case "PREPARE_RECITER": {
      const liveSnapshot = state.competition.liveSnapshot;
      if (
        state.sessionActive ||
        state.competition.status !== "live" ||
        !liveSnapshot
      ) return state;
      const participant = normalizeParticipant(action.participant);
      const currentRosterEntry = state.roster.find(
        (entry) =>
          entry.id === participant.id ||
          (entry.number === participant.number && entry.name === participant.name),
      );
      if (
        !currentRosterEntry ||
        currentRosterEntry.judged ||
        !liveSnapshot.roster.some(
          (entry) =>
            entry.id === participant.id ||
            (entry.number === participant.number && entry.name === participant.name),
        )
      ) {
        return state;
      }
      const assignment = makeAssignmentSnapshot(
        liveSnapshot.panel,
        state.deviceJudgeId,
        liveSnapshot.scoreConfig,
      );
      const question = normalizeQuestionAssignment({
        ...action.question,
        ...(action.drawId ? { drawId: action.drawId } : {}),
        ...(Number.isInteger(action.drawPosition)
          ? { drawPosition: action.drawPosition }
          : {}),
        ...(Number.isInteger(action.drawCycle)
          ? { drawCycle: action.drawCycle }
          : {}),
      });
      if (
        !assignment ||
        !question ||
        !questionAssignmentIsValid({
          question,
          participant,
          divisions: liveSnapshot.divisions,
          drafts: state.questionDrafts,
          competitionId: liveSnapshot.competitionId,
          allowManual: liveSnapshot.questionPolicy.mode === "manual",
        })
      ) {
        return state;
      }
      if (question.kind === "prepared-draft") {
        const draw = state.draws.find((candidate) => candidate.id === question.drawId);
        if (
          !draw ||
          draw.participantId !== participant.id ||
          draw.questionId !== question.sourceQuestionId ||
          draw.position !== question.drawPosition ||
          Math.max(1, Number(draw.cycle) || 1) !== question.drawCycle
        ) {
          return state;
        }
      }
      const preparedAt = Date.now();
      const replacements = state.preparedRecitation
        ? [
            ...(state.preparedRecitation.question.replacements ?? []),
            {
              version: 1 as const,
              id: uid("question-replacement"),
              replacedAt: preparedAt,
              reason: action.replacementReason ?? "question-changed",
              fromParticipantId: state.preparedRecitation.participant.id,
              fromQuestionId: state.preparedRecitation.question.id,
              ...(state.preparedRecitation.question.drawId
                ? { fromDrawId: state.preparedRecitation.question.drawId }
                : {}),
              toParticipantId: participant.id,
              toQuestionId: question.id,
              ...(question.drawId ? { toDrawId: question.drawId } : {}),
            },
          ]
        : (question.replacements ?? []);
      const preparedQuestion = {
        ...question,
        ...(replacements.length ? { replacements } : {}),
      };
      const preparedRecitation: PreparedRecitation = {
        version: 1,
        id: `prepared:${participant.id}:${preparedQuestion.id}:${preparedQuestion.drawId ?? preparedAt}`,
        participant,
        assignment,
        question: preparedQuestion,
        preparedAt,
      };
      return {
        ...state,
        preparedRecitation,
        participant: { ...EMPTY_PARTICIPANT },
        activeSessionId: null,
        activeStartedAt: null,
        activeRevision: 1,
        activeAssignment: null,
        activeQuestion: null,
        events: [],
        mistakes: [],
        impressions: [],
        notes: "",
      };
    }
    case "BEGIN_RECITER": {
      const prepared = state.preparedRecitation;
      const liveSnapshot = state.competition.liveSnapshot;
      if (
        state.sessionActive ||
        !prepared ||
        state.competition.status !== "live" ||
        !liveSnapshot
      ) return state;
      const currentRosterEntry = state.roster.find(
        (entry) => entry.id === prepared.participant.id,
      );
      if (!currentRosterEntry || currentRosterEntry.judged) return state;
      if (
        !questionAssignmentIsValid({
          question: prepared.question,
          participant: prepared.participant,
          divisions: liveSnapshot.divisions,
          drafts: state.questionDrafts,
          competitionId: liveSnapshot.competitionId,
          allowManual: liveSnapshot.questionPolicy.mode === "manual",
        })
      ) return state;
      const sessionId = uid("s");
      const startedAt = Date.now();
      const events = seedLedgerEvents({
        sessionId,
        participant: prepared.participant,
        startedAt,
        mistakes: [],
        assignment: prepared.assignment,
        question: prepared.question,
      });
      return {
        ...state,
        participant: prepared.participant,
        sessionActive: true,
        preparedRecitation: null,
        activeSessionId: sessionId,
        activeStartedAt: startedAt,
        activeRevision: 1,
        activeAssignment: prepared.assignment,
        activeQuestion: prepared.question,
        events,
        mistakes: [],
        impressions: [],
        notes: "",
      };
    }
    case "FINISH_SESSION": {
      if (!state.sessionActive || !state.activeSessionId) return state;
      const { total, totalMax } = computeScores(state);
      const savedAt = Date.now();
      const finalized: JudgingEvent = {
        id: uid("e"),
        at: savedAt,
        type: "session_finalized",
        sessionId: state.activeSessionId,
        total,
        totalMax,
        scoreKind: "judge-section",
      };
      const events = [...state.events, finalized];
      const mistakes = projectMistakes(events);
      const impressions = projectImpressions(events);
      const saved: SavedSession = {
        id: state.activeSessionId,
        competitionId: state.competition.id,
        competitionVersionId: state.competition.liveSnapshot?.versionId,
        isSample: state.competition.isSample,
        savedAt,
        startedAt: state.activeStartedAt ?? savedAt,
        revision: state.activeRevision,
        ledgerVersion: LEDGER_VERSION,
        participant: state.participant,
        config: state.activeAssignment?.config ?? state.config,
        total,
        totalMax,
        scoreKind: "judge-section",
        sectionTotal: total,
        sectionMax: totalMax,
        assignment: state.activeAssignment ?? undefined,
        question: state.activeQuestion ?? undefined,
        notes: state.notes,
        mistakes,
        impressions,
        events,
      };
      const participant = state.participant;
      return {
        ...state,
        history: [
          saved,
          ...state.history.filter((session) => session.id !== saved.id),
        ],
        roster: state.roster.map((entry) =>
          !entry.judged &&
          (entry.id === participant.id ||
            (entry.name === participant.name &&
              entry.number === participant.number))
            ? { ...entry, judged: true }
            : entry,
        ),
        participant: { ...EMPTY_PARTICIPANT },
        sessionActive: false,
        preparedRecitation: null,
        activeSessionId: null,
        activeStartedAt: null,
        activeRevision: 1,
        activeAssignment: null,
        activeQuestion: null,
        events: [],
        mistakes: [],
        impressions: [],
        notes: "",
      };
    }
    case "REOPEN_SESSION": {
      if (state.sessionActive || state.preparedRecitation) return state;
      const saved = state.history.find((session) => session.id === action.id);
      const reason = action.reason.trim();
      if (
        !saved ||
        !reason ||
        (saved.competitionId && saved.competitionId !== state.competition.id)
      ) return state;
      const baseEvents = saved.events?.length
        ? saved.events
        : seedLedgerEvents({
            sessionId: saved.id,
            participant: saved.participant,
            startedAt: saved.startedAt ?? saved.savedAt,
            mistakes: saved.mistakes,
            impressions: saved.impressions,
            assignment: saved.assignment,
            question: saved.question,
          });
      const events: JudgingEvent[] = [
        ...baseEvents,
        {
          id: uid("e"),
          at: Date.now(),
          type: "session_reopened",
          sessionId: saved.id,
          reason,
        },
      ];
      return {
        ...state,
        participant: saved.participant,
        sessionActive: true,
        preparedRecitation: null,
        activeSessionId: saved.id,
        activeStartedAt: saved.startedAt ?? saved.savedAt,
        activeRevision: (saved.revision ?? 1) + 1,
        activeAssignment: normalizeAssignment(saved.assignment, saved.config),
        activeQuestion: normalizeQuestionAssignment(saved.question),
        events,
        mistakes: projectMistakes(events),
        impressions: projectImpressions(events),
        notes: saved.notes,
        history: state.history.filter((session) => session.id !== saved.id),
      };
    }
    case "APPLY_TARGET_MIGRATION": {
      const events = state.events.map((event) => patchEvent(event, action.patches));
      return {
        ...state,
        events,
        mistakes: projectMistakes(events),
        impressions: projectImpressions(events),
        history: state.history.map((session) => {
          const sessionEvents = (session.events ?? []).map((event) =>
            patchEvent(event, action.patches),
          );
          return {
            ...session,
            events: sessionEvents,
            mistakes: sessionEvents.length
              ? projectMistakes(sessionEvents)
              : session.mistakes.map((mistake) => ({
                  ...mistake,
                  ...(action.patches[mistake.id] ?? {}),
                })),
            impressions: sessionEvents.length
              ? projectImpressions(sessionEvents)
              : session.impressions,
          };
        }),
      };
    }
    case "LOAD":
      return normalizeLedgerState(action.state);
    default:
      return state;
  }
}

export function normalizeSavedSession(session: SavedSession): SavedSession {
  const participant = normalizeParticipant(session.participant);
  const eventAssignment = session.events?.find(
    (event) => event.type === "session_started" && event.assignment,
  );
  const assignment = normalizeAssignment(
    session.assignment ??
      (eventAssignment?.type === "session_started" ? eventAssignment.assignment : undefined),
    session.config,
  );
  const eventQuestion = session.events?.find(
    (event) => event.type === "session_started" && event.question,
  );
  const question = normalizeQuestionAssignment(
    session.question ??
      (eventQuestion?.type === "session_started" ? eventQuestion.question : undefined),
  );
  const startedAt =
    session.startedAt ??
    Math.min(session.savedAt, ...session.mistakes.map((mistake) => mistake.ts));
  let events = session.events?.length
    ? session.events
    : seedLedgerEvents({
        sessionId: session.id,
        participant,
        startedAt,
        mistakes: session.mistakes,
        impressions: session.impressions,
        assignment,
        question: question ?? undefined,
      });
  events = eventsWithAssignment(events, assignment);
  const mistakes = projectMistakes(events);
  const impressions = projectImpressions(events);
  const score = computeAssignedScores(
    assignment.config,
    mistakes,
    impressions,
    assignment.categories,
  );
  if (!events.some((event) => event.type === "session_finalized")) {
    events = [
      ...events,
      {
        id: `ledger:${session.id}:finalized`,
        at: session.savedAt,
        type: "session_finalized",
        sessionId: session.id,
        total: score.total,
        totalMax: score.totalMax,
        scoreKind: "judge-section",
      },
    ];
  } else {
    events = events.map((event) =>
      event.type === "session_finalized"
        ? {
            ...event,
            total: score.total,
            totalMax: score.totalMax,
            scoreKind: "judge-section" as const,
          }
        : event,
    );
  }
  return {
    ...session,
    isSample: Boolean(session.isSample),
    // Records saved before optional criteria keep exactly the criteria they
    // were judged with, so their totals never move.
    config: normalizeScoreConfig(session.config),
    participant,
    startedAt,
    revision: session.revision ?? 1,
    ledgerVersion: LEDGER_VERSION,
    total: score.total,
    totalMax: score.totalMax,
    scoreKind: "judge-section",
    sectionTotal: score.total,
    sectionMax: score.totalMax,
    assignment,
    question: question ?? undefined,
    mistakes,
    impressions,
    events,
  };
}

export function normalizeLedgerState(
  parsed: Partial<JudgingState>,
): JudgingState {
  // Records saved before optional criteria existed keep exactly the criteria
  // they were judged with; Adu & Raagu stays off until an organizer enables it.
  let config = normalizeScoreConfig(parsed.config);
  if (enabledMarksTotal(config) !== TOTAL_MARKS) {
    config = cloneScoreConfig(DEFAULT_CONFIG);
  }
  let panel = normalizeJudgePanel(parsed.panel, enabledCategories(config));

  let participant = normalizeParticipant(parsed.participant);
  const legacyMistakes = parsed.mistakes ?? [];
  const sessionActive =
    parsed.sessionActive ??
    (legacyMistakes.length > 0 ||
      participant.name.trim() !== "" ||
      (parsed.notes ?? "").trim() !== "");
  let roster = (parsed.roster ?? []).map((entry) => normalizeRosterEntry(entry));
  let competition = normalizeCompetition(parsed.competition);
  if (competition.isSample) {
    const sampleById = new Map(
      createSampleRoster().map((entry) => [entry.id, entry]),
    );
    const updateSampleIdentity = <T extends Participant>(entry: T): T => {
      const sample = sampleById.get(entry.id);
      return sample ? { ...entry, ...sample, ...("judged" in entry ? { judged: entry.judged } : {}) } : entry;
    };
    roster = roster.map(updateSampleIdentity);
    participant = updateSampleIdentity(participant);
    if (competition.liveSnapshot) {
      competition = {
        ...competition,
        liveSnapshot: {
          ...competition.liveSnapshot,
          roster: competition.liveSnapshot.roster.map(updateSampleIdentity),
        },
      };
    }
  }
  if ((sessionActive || competition.status === "live") && !competition.liveSnapshot) {
    const liveSnapshot = createLiveCompetitionSnapshot({
      competition,
      panel,
      config,
      roster,
    });
    competition = {
      ...competition,
      status: "live",
      liveSnapshot,
      closedAt: undefined,
    };
  } else if (sessionActive && competition.status !== "live") {
    competition = { ...competition, status: "live", closedAt: undefined };
  }
  if (competition.status === "live" && competition.liveSnapshot) {
    config = normalizeScoreConfig(competition.liveSnapshot.scoreConfig);
    panel = normalizeJudgePanel(
      competition.liveSnapshot.panel,
      enabledCategories(config),
    );
    if (!roster.length) {
      roster = competition.liveSnapshot.roster.map((entry) =>
        normalizeRosterEntry({ ...entry, judged: false }),
      );
    }
  }
  const preferredJudge = judgeSeatFor(panel, parsed.deviceJudgeId)
    ? parsed.deviceJudgeId!
    : panel.seats[0]?.id ?? "judge-1";
  const startedAt = sessionActive
    ? (parsed.activeStartedAt ??
      Math.min(Date.now(), ...legacyMistakes.map((mistake) => mistake.ts)))
    : null;
  const sessionId = sessionActive
    ? (parsed.activeSessionId ?? `legacy-active-${startedAt}`)
    : null;
  const activeEventAssignment = parsed.events?.find(
    (event) => event.type === "session_started" && event.assignment,
  );
  const activeAssignment = sessionActive
    ? parsed.activeAssignment || activeEventAssignment
      ? normalizeAssignment(
          parsed.activeAssignment ??
            (activeEventAssignment?.type === "session_started"
              ? activeEventAssignment.assignment
              : undefined),
          config,
        )
      : makeAssignmentSnapshot(panel, preferredJudge, config) ??
        legacyAssignment(config)
    : null;
  const activeEventQuestion = parsed.events?.find(
    (event) => event.type === "session_started" && event.question,
  );
  const activeQuestion = sessionActive
    ? normalizeQuestionAssignment(
        parsed.activeQuestion ??
          (activeEventQuestion?.type === "session_started"
            ? activeEventQuestion.question
            : undefined),
      )
    : null;
  let preparedRecitation =
    !sessionActive && competition.status === "live"
      ? normalizePreparedRecitation(
          parsed.preparedRecitation,
          competition.liveSnapshot?.scoreConfig ?? config,
        )
      : null;
  if (competition.isSample && preparedRecitation) {
    const currentSample = createSampleRoster().find(
      (entry) => entry.id === preparedRecitation?.participant.id,
    );
    if (currentSample) {
      preparedRecitation = {
        ...preparedRecitation,
        participant: normalizeParticipant(currentSample),
      };
    }
  }
  const events = sessionActive
    ? eventsWithAssignment(
        parsed.events?.length
          ? parsed.events
          : seedLedgerEvents({
              sessionId: sessionId!,
              participant,
              startedAt: startedAt!,
              mistakes: legacyMistakes,
              impressions: parsed.impressions,
              assignment: activeAssignment!,
              question: activeQuestion ?? undefined,
            }),
        activeAssignment!,
      )
    : [];

  return {
    ...initialState,
    ...parsed,
    competition,
    questionDrafts: normalizeQuestionDrafts(parsed.questionDrafts),
    decks: (Array.isArray(parsed.decks) ? parsed.decks : [])
      .map((deck) => normalizeQuestionDeck(deck))
      .filter((deck): deck is QuestionDeck => Boolean(deck)),
    draws: (Array.isArray(parsed.draws) ? parsed.draws : [])
      .map((draw) => normalizeQuestionDrawRecord(draw))
      .filter((draw): draw is QuestionDrawRecord => Boolean(draw)),
    sampleQuestionsInitialized:
      typeof parsed.sampleQuestionsInitialized === "boolean"
        ? parsed.sampleQuestionsInitialized
        : !competition.isSample,
    participant,
    sessionActive,
    preparedRecitation,
    activeSessionId: sessionId,
    activeStartedAt: startedAt,
    activeRevision: parsed.activeRevision ?? 1,
    activeAssignment,
    activeQuestion,
    events,
    config,
    panel,
    deviceJudgeId: preferredJudge,
    mistakes: projectMistakes(events),
    impressions: projectImpressions(events),
    history: (parsed.history ?? []).map((session) =>
      normalizeSavedSession({
        ...session,
        competitionId: session.competitionId ?? competition.id,
        competitionVersionId:
          session.competitionVersionId ?? competition.liveSnapshot?.versionId,
      }),
    ),
    roster,
    finalizedResults: (parsed.finalizedResults ?? []).map((result) => ({
      ...result,
      isSample: Boolean(result.isSample),
      competitionId: result.competitionId ?? competition.id,
      competitionVersionId:
        result.competitionVersionId ?? competition.liveSnapshot?.versionId,
      participant: normalizeParticipant(result.participant),
    })),
  };
}

function loadInitial(): JudgingState {
  if (typeof localStorage === "undefined") return initialState;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return initialState;
    for (const key of [
      PRE_TARGET_V2_BACKUP_KEY,
      PRE_LEDGER_BACKUP_KEY,
      PRE_JUDGE_ASSIGNMENTS_BACKUP_KEY,
      PRE_COMPETITION_RESULTS_BACKUP_KEY,
      PRE_QUESTION_BANK_BACKUP_KEY,
      PRE_QUESTION_BUILDER_BACKUP_KEY,
      PRE_ADU_RAAGU_BACKUP_KEY,
      PRE_PREPARED_RECITATION_BACKUP_KEY,
    ]) {
      if (!localStorage.getItem(key)) {
        try {
          localStorage.setItem(key, raw);
        } catch {
          // A backup quota failure must never prevent the live session loading.
        }
      }
    }
    return normalizeLedgerState(JSON.parse(raw) as Partial<JudgingState>);
  } catch {
    return initialState;
  }
}

interface Ctx {
  state: JudgingState;
  dispatch: React.Dispatch<Action>;
}

const JudgingContext = createContext<Ctx | null>(null);

export function JudgingProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, loadInitial);
  const targetMigrationStarted = useRef(false);

  useEffect(() => {
    if (targetMigrationStarted.current) return;
    targetMigrationStarted.current = true;
    let cancelled = false;
    buildTargetMigrationPatches(state, loadPage)
      .then((patches) => {
        if (!cancelled && Object.keys(patches).length) {
          dispatch({ type: "APPLY_TARGET_MIGRATION", patches });
        }
      })
      .catch(() => {
        // Keep the untouched, backed-up V1 state and retry on a later load.
      });
    return () => {
      cancelled = true;
    };
    // Initial-state migration only; patches are applied to current evidence.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* ignore quota errors */
    }
  }, [state]);

  const value = useMemo(() => ({ state, dispatch }), [state]);
  return (
    <JudgingContext.Provider value={value}>{children}</JudgingContext.Provider>
  );
}

export function useJudging(): Ctx {
  const ctx = useContext(JudgingContext);
  if (!ctx) throw new Error("useJudging must be used within JudgingProvider");
  return ctx;
}

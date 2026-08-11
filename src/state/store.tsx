import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  type ReactNode,
} from "react";
import { DEFAULT_CONFIG, STORAGE_KEY, TOTAL_MARKS } from "../config";
import {
  LEDGER_VERSION,
  latestMistakeEventIds,
  projectMistakes,
  seedLedgerEvents,
} from "../lib/judgingLedger";
import {
  computeAssignedMistakeScores,
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
  buildTargetMigrationPatches,
  type TargetMigrationPatches,
} from "./migrateTargets";
import type {
  CategoryId,
  JudgeAssignmentSnapshot,
  JudgePanelConfig,
  JudgingEvent,
  JudgingState,
  Mistake,
  Participant,
  RosterEntry,
  SavedSession,
} from "../types";

const EMPTY_PARTICIPANT: Participant = { name: "", number: "", group: "" };

const initialState: JudgingState = {
  participant: EMPTY_PARTICIPANT,
  sessionActive: false,
  activeSessionId: null,
  activeStartedAt: null,
  activeRevision: 1,
  activeAssignment: null,
  events: [],
  config: DEFAULT_CONFIG,
  panel: createPanelPreset("all"),
  deviceJudgeId: "judge-1",
  mistakes: [],
  notes: "",
  history: [],
  roster: [],
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

type Action =
  | { type: "ADD_MISTAKE"; mistake: Mistake }
  | { type: "REMOVE_MISTAKE"; id: string }
  | { type: "RESTORE_MISTAKE"; eventId: string }
  | { type: "SET_MISTAKE_AMOUNT"; id: string; amount: number }
  | { type: "SET_MISTAKE_NOTE"; id: string; note: string }
  | { type: "SET_CONFIG"; category: CategoryId; start?: number; step?: number }
  | { type: "SET_PANEL"; panel: JudgePanelConfig; deviceJudgeId: string }
  | { type: "SET_DEVICE_JUDGE"; judgeSeatId: string }
  | { type: "SET_NOTES"; notes: string }
  | { type: "SET_PARTICIPANT"; patch: Partial<Participant> }
  | { type: "CLEAR_MARKS" }
  | { type: "DELETE_SESSION"; id: string }
  | { type: "CLEAR_HISTORY" }
  | { type: "LOAD_ROSTER"; entries: RosterEntry[] }
  | { type: "CLEAR_ROSTER" }
  | { type: "START_RECITER"; participant: Participant }
  | { type: "FINISH_SESSION" }
  | { type: "REOPEN_SESSION"; id: string; reason: string }
  | { type: "APPLY_TARGET_MIGRATION"; patches: TargetMigrationPatches }
  | { type: "LOAD"; state: JudgingState };

const round2 = (n: number) => Math.round(n * 100) / 100;

function withEvent(state: JudgingState, event: JudgingEvent): JudgingState {
  const events = [...state.events, event];
  return { ...state, events, mistakes: projectMistakes(events) };
}

function eventsWithAssignment(
  events: JudgingEvent[],
  assignment: JudgeAssignmentSnapshot,
): JudgingEvent[] {
  return events.map((event) => {
    if (event.type === "session_started") {
      return {
        ...event,
        assignment: event.assignment
          ? normalizeAssignment(event.assignment, assignment.config)
          : assignment,
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
    case "ADD_MISTAKE":
      if (
        !state.sessionActive ||
        !state.activeAssignment ||
        !state.activeAssignment.categories.includes(action.mistake.category)
      ) {
        return state;
      }
      return withEvent(state, {
        id: uid("e"),
        at: Date.now(),
        type: "mistake_added",
        mistake: {
          ...action.mistake,
          judgeSeatId: state.activeAssignment.judgeSeatId,
        },
      });
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
    case "SET_CONFIG":
      if (state.sessionActive) return state;
      return {
        ...state,
        config: {
          ...state.config,
          [action.category]: {
            start: action.start ?? state.config[action.category].start,
            step: action.step ?? state.config[action.category].step,
          },
        },
      };
    case "SET_PANEL": {
      if (state.sessionActive || !validateJudgePanel(action.panel).valid) {
        return state;
      }
      const panel = normalizeJudgePanel(action.panel);
      if (!judgeSeatFor(panel, action.deviceJudgeId)) return state;
      return { ...state, panel, deviceJudgeId: action.deviceJudgeId };
    }
    case "SET_DEVICE_JUDGE":
      if (state.sessionActive || !judgeSeatFor(state.panel, action.judgeSeatId)) {
        return state;
      }
      return { ...state, deviceJudgeId: action.judgeSeatId };
    case "SET_NOTES":
      return { ...state, notes: action.notes };
    case "SET_PARTICIPANT":
      return {
        ...state,
        participant: { ...state.participant, ...action.patch },
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
      return { ...state, events, mistakes: projectMistakes(events), notes: "" };
    }
    case "DELETE_SESSION":
      return {
        ...state,
        history: state.history.filter((session) => session.id !== action.id),
      };
    case "CLEAR_HISTORY":
      return { ...state, history: [] };
    case "LOAD_ROSTER":
      return { ...state, roster: action.entries };
    case "CLEAR_ROSTER":
      return { ...state, roster: [] };
    case "START_RECITER": {
      const assignment = makeAssignmentSnapshot(
        state.panel,
        state.deviceJudgeId,
        state.config,
      );
      if (!assignment) return state;
      const sessionId = uid("s");
      const startedAt = Date.now();
      const events = seedLedgerEvents({
        sessionId,
        participant: action.participant,
        startedAt,
        mistakes: [],
        assignment,
      });
      return {
        ...state,
        participant: action.participant,
        sessionActive: true,
        activeSessionId: sessionId,
        activeStartedAt: startedAt,
        activeRevision: 1,
        activeAssignment: assignment,
        events,
        mistakes: [],
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
      const saved: SavedSession = {
        id: state.activeSessionId,
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
        notes: state.notes,
        mistakes,
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
          entry.name === participant.name &&
          entry.number === participant.number
            ? { ...entry, judged: true }
            : entry,
        ),
        participant: EMPTY_PARTICIPANT,
        sessionActive: false,
        activeSessionId: null,
        activeStartedAt: null,
        activeRevision: 1,
        activeAssignment: null,
        events: [],
        mistakes: [],
        notes: "",
      };
    }
    case "REOPEN_SESSION": {
      if (state.sessionActive) return state;
      const saved = state.history.find((session) => session.id === action.id);
      const reason = action.reason.trim();
      if (!saved || !reason) return state;
      const baseEvents = saved.events?.length
        ? saved.events
        : seedLedgerEvents({
            sessionId: saved.id,
            participant: saved.participant,
            startedAt: saved.startedAt ?? saved.savedAt,
            mistakes: saved.mistakes,
            assignment: saved.assignment,
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
        activeSessionId: saved.id,
        activeStartedAt: saved.startedAt ?? saved.savedAt,
        activeRevision: (saved.revision ?? 1) + 1,
        activeAssignment: normalizeAssignment(saved.assignment, saved.config),
        events,
        mistakes: projectMistakes(events),
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

function normalizeSavedSession(session: SavedSession): SavedSession {
  const eventAssignment = session.events?.find(
    (event) => event.type === "session_started" && event.assignment,
  );
  const assignment = normalizeAssignment(
    session.assignment ??
      (eventAssignment?.type === "session_started" ? eventAssignment.assignment : undefined),
    session.config,
  );
  const startedAt =
    session.startedAt ??
    Math.min(session.savedAt, ...session.mistakes.map((mistake) => mistake.ts));
  let events = session.events?.length
    ? session.events
    : seedLedgerEvents({
        sessionId: session.id,
        participant: session.participant,
        startedAt,
        mistakes: session.mistakes,
        assignment,
      });
  events = eventsWithAssignment(events, assignment);
  const mistakes = projectMistakes(events);
  const score = computeAssignedMistakeScores(
    assignment.config,
    mistakes,
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
    startedAt,
    revision: session.revision ?? 1,
    ledgerVersion: LEDGER_VERSION,
    total: score.total,
    totalMax: score.totalMax,
    scoreKind: "judge-section",
    sectionTotal: score.total,
    sectionMax: score.totalMax,
    assignment,
    mistakes,
    events,
  };
}

export function normalizeLedgerState(
  parsed: Partial<JudgingState>,
): JudgingState {
  let config = { ...DEFAULT_CONFIG, ...(parsed.config ?? {}) };
  const allocation =
    config.jali.start + config.khafi.start + config.fasaha.start;
  if (allocation !== TOTAL_MARKS) config = DEFAULT_CONFIG;
  const panel = normalizeJudgePanel(parsed.panel);
  const preferredJudge = judgeSeatFor(panel, parsed.deviceJudgeId)
    ? parsed.deviceJudgeId!
    : panel.seats[0]?.id ?? "judge-1";

  const participant = {
    ...EMPTY_PARTICIPANT,
    ...(parsed.participant ?? {}),
  };
  const legacyMistakes = parsed.mistakes ?? [];
  const sessionActive =
    parsed.sessionActive ??
    (legacyMistakes.length > 0 ||
      participant.name.trim() !== "" ||
      (parsed.notes ?? "").trim() !== "");
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
  const events = sessionActive
    ? eventsWithAssignment(
        parsed.events?.length
          ? parsed.events
          : seedLedgerEvents({
              sessionId: sessionId!,
              participant,
              startedAt: startedAt!,
              mistakes: legacyMistakes,
              assignment: activeAssignment!,
            }),
        activeAssignment!,
      )
    : [];

  return {
    ...initialState,
    ...parsed,
    participant,
    sessionActive,
    activeSessionId: sessionId,
    activeStartedAt: startedAt,
    activeRevision: parsed.activeRevision ?? 1,
    activeAssignment,
    events,
    config,
    panel,
    deviceJudgeId: preferredJudge,
    mistakes: projectMistakes(events),
    history: (parsed.history ?? []).map(normalizeSavedSession),
    roster: parsed.roster ?? [],
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

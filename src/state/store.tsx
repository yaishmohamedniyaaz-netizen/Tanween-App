import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  type ReactNode,
} from "react";
import { DEFAULT_CONFIG, STORAGE_KEY, TOTAL_MARKS } from "../config";
import { computeScores } from "../lib/scoring";
import { uid } from "../lib/id";
import type {
  CategoryId,
  JudgingState,
  Mistake,
  Participant,
  RosterEntry,
  SavedSession,
} from "../types";

const initialState: JudgingState = {
  participant: { name: "", number: "", group: "" },
  sessionActive: false,
  config: DEFAULT_CONFIG,
  mistakes: [],
  notes: "",
  history: [],
  roster: [],
};

type Action =
  | { type: "ADD_MISTAKE"; mistake: Mistake }
  | { type: "REMOVE_MISTAKE"; id: string }
  | { type: "SET_MISTAKE_AMOUNT"; id: string; amount: number }
  | { type: "SET_MISTAKE_NOTE"; id: string; note: string }
  | { type: "SET_CONFIG"; category: CategoryId; start?: number; step?: number }
  | { type: "SET_NOTES"; notes: string }
  | { type: "SET_PARTICIPANT"; patch: Partial<Participant> }
  | { type: "CLEAR_MARKS" }
  | { type: "RESET_ALL" }
  | { type: "SAVE_TO_HISTORY" }
  | { type: "DELETE_SESSION"; id: string }
  | { type: "CLEAR_HISTORY" }
  | { type: "LOAD_ROSTER"; entries: RosterEntry[] }
  | { type: "CLEAR_ROSTER" }
  | { type: "START_RECITER"; participant: Participant }
  | { type: "FINISH_SESSION" }
  | { type: "LOAD"; state: JudgingState };

const round2 = (n: number) => Math.round(n * 100) / 100;

function reducer(state: JudgingState, action: Action): JudgingState {
  switch (action.type) {
    case "ADD_MISTAKE":
      return { ...state, mistakes: [...state.mistakes, action.mistake] };
    case "REMOVE_MISTAKE":
      return {
        ...state,
        mistakes: state.mistakes.filter((m) => m.id !== action.id),
      };
    case "SET_MISTAKE_AMOUNT":
      return {
        ...state,
        mistakes: state.mistakes.map((m) =>
          m.id === action.id
            ? { ...m, amount: round2(Math.max(0, action.amount)) }
            : m,
        ),
      };
    case "SET_MISTAKE_NOTE":
      return {
        ...state,
        mistakes: state.mistakes.map((m) =>
          m.id === action.id ? { ...m, note: action.note } : m,
        ),
      };
    case "SET_CONFIG":
      return {
        ...state,
        config: {
          ...state.config,
          [action.category]: {
            start:
              action.start ?? state.config[action.category].start,
            step: action.step ?? state.config[action.category].step,
          },
        },
      };
    case "SET_NOTES":
      return { ...state, notes: action.notes };
    case "SET_PARTICIPANT":
      return {
        ...state,
        participant: { ...state.participant, ...action.patch },
      };
    case "CLEAR_MARKS":
      return { ...state, mistakes: [], notes: "" };
    case "RESET_ALL":
      return {
        ...state,
        mistakes: [],
        notes: "",
        participant: { name: "", number: "", group: "" },
      };
    case "SAVE_TO_HISTORY": {
      const { total, totalMax } = computeScores(state);
      const saved: SavedSession = {
        id: uid("s"),
        savedAt: Date.now(),
        participant: state.participant,
        config: state.config,
        total,
        totalMax,
        notes: state.notes,
        mistakes: state.mistakes,
      };
      return { ...state, history: [saved, ...state.history] };
    }
    case "DELETE_SESSION":
      return {
        ...state,
        history: state.history.filter((s) => s.id !== action.id),
      };
    case "CLEAR_HISTORY":
      return { ...state, history: [] };
    case "LOAD_ROSTER":
      return { ...state, roster: action.entries };
    case "CLEAR_ROSTER":
      return { ...state, roster: [] };
    case "START_RECITER":
      return {
        ...state,
        participant: action.participant,
        sessionActive: true,
        mistakes: [],
        notes: "",
      };
    case "FINISH_SESSION": {
      const hasContent =
        state.mistakes.length > 0 ||
        state.notes.trim() !== "" ||
        state.participant.name.trim() !== "";
      const { total, totalMax } = computeScores(state);
      const saved: SavedSession = {
        id: uid("s"),
        savedAt: Date.now(),
        participant: state.participant,
        config: state.config,
        total,
        totalMax,
        notes: state.notes,
        mistakes: state.mistakes,
      };
      const p = state.participant;
      return {
        ...state,
        history: hasContent ? [saved, ...state.history] : state.history,
        roster: state.roster.map((r) =>
          !r.judged && r.name === p.name && r.number === p.number
            ? { ...r, judged: true }
            : r,
        ),
        participant: { name: "", number: "", group: "" },
        sessionActive: false,
        mistakes: [],
        notes: "",
      };
    }
    case "LOAD":
      return action.state;
    default:
      return state;
  }
}

function loadInitial(): JudgingState {
  if (typeof localStorage === "undefined") return initialState;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return initialState;
    const parsed = JSON.parse(raw) as Partial<JudgingState>;
    // migrate configs saved before the total-must-be-100 rule
    let config = { ...DEFAULT_CONFIG, ...(parsed.config ?? {}) };
    const total = config.jali.start + config.khafi.start + config.fasaha.start;
    if (total !== TOTAL_MARKS) config = DEFAULT_CONFIG;
    return {
      ...initialState,
      ...parsed,
      config,
      participant: { ...initialState.participant, ...(parsed.participant ?? {}) },
      mistakes: parsed.mistakes ?? [],
      history: parsed.history ?? [],
      roster: parsed.roster ?? [],
      sessionActive: parsed.sessionActive ?? false,
    };
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

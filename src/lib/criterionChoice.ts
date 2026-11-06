import { useSyncExternalStore } from "react";
import type { CategoryId } from "../types";
import type { IslandLook, Preselect } from "./markingPreferences";

/**
 * Bridge between the Mushaf (which owns the chosen criterion and the marking
 * gestures) and the scorecard rows, when the scorecard is where the judge
 * chooses the criterion (marking look "place: scorecard").
 */
export interface CriterionChoiceSnapshot {
  /** The scorecard rows are the criterion buttons. */
  active: boolean;
  preselect: Preselect | null;
  mode: "criterion-first" | "drag-hold";
  categories: readonly CategoryId[];
  showKeys: boolean;
  look: IslandLook | null;
  trayOpen: boolean;
  /** Changes when the choice should shake (a word was tapped with nothing chosen). */
  nudge: number;
}

export interface CriterionChoiceHandlers {
  onPress: (category: CategoryId) => void;
  onRelease: (category: CategoryId) => void;
  onDragStart: (category: CategoryId) => void;
  onDragMove: (x: number, y: number) => void;
  onDragEnd: (x: number, y: number) => void;
  onDragTap: () => void;
}

const INACTIVE: CriterionChoiceSnapshot = {
  active: false, preselect: null, mode: "criterion-first", categories: [], showKeys: false, look: null, trayOpen: false, nudge: 0,
};

let snapshot = INACTIVE;
let handlers: CriterionChoiceHandlers | null = null;
const listeners = new Set<() => void>();

const same = (a: CriterionChoiceSnapshot, b: CriterionChoiceSnapshot) =>
  a.active === b.active && a.preselect === b.preselect && a.mode === b.mode && a.showKeys === b.showKeys &&
  a.look === b.look && a.trayOpen === b.trayOpen && a.nudge === b.nudge &&
  a.categories.join("|") === b.categories.join("|");

export function publishCriterionChoice(next: CriterionChoiceSnapshot, nextHandlers: CriterionChoiceHandlers | null) {
  handlers = nextHandlers;
  if (same(snapshot, next)) return;
  snapshot = next;
  listeners.forEach((listener) => listener());
}

export function clearCriterionChoice() {
  publishCriterionChoice(INACTIVE, null);
}

/** Always calls the Mushaf's latest handlers. */
export const criterionChoiceHandlers: CriterionChoiceHandlers = {
  onPress: (category) => handlers?.onPress(category),
  onRelease: (category) => handlers?.onRelease(category),
  onDragStart: (category) => handlers?.onDragStart(category),
  onDragMove: (x, y) => handlers?.onDragMove(x, y),
  onDragEnd: (x, y) => handlers?.onDragEnd(x, y),
  onDragTap: () => handlers?.onDragTap(),
};

export function useCriterionChoice(): CriterionChoiceSnapshot {
  return useSyncExternalStore(
    (listener) => { listeners.add(listener); return () => { listeners.delete(listener); }; },
    () => snapshot,
    () => INACTIVE,
  );
}

import { useEffect, useState } from "react";
import { useJudging } from "../state/store";
import { Icon } from "./Icon";
import {
  categoryListLabel,
  makeAssignmentSnapshot,
} from "../lib/judgeAssignments";

const KEY = "tahqeeq.hintSeen.assignedRail.v1";

function hintRetired(): boolean {
  try {
    return localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

function retireHint(): void {
  try {
    localStorage.setItem(KEY, "1");
  } catch {
    /* ignore */
  }
}

/** A subtle, dismissible coach tip for the connected letter-to-category path.
 *  Shows on a clean slate until the judge has marked something or dismissed it. */
export function HintBanner() {
  const { state } = useJudging();
  const [hidden, setHidden] = useState(hintRetired);
  const hasMarks = state.mistakes.length > 0;
  const sessionId = state.activeSessionId;

  // Marking a letter proves the judge knows the gesture, so the tip retires —
  // but not until the next reciter. This banner sits above the Mushaf in
  // normal flow, and removing it the instant a mark lands pulled the page 68px
  // upward while the judge's hand was still on it, moving every remaining
  // letter out from under them mid-gesture.
  useEffect(() => {
    if (hasMarks) retireHint();
  }, [hasMarks]);

  // Re-read when a reciter starts, so a tip retired during the last session
  // does not reappear for the next one.
  useEffect(() => {
    setHidden(hintRetired());
  }, [sessionId]);

  const assignment =
    state.activeAssignment ??
    makeAssignmentSnapshot(state.panel, state.deviceJudgeId, state.config);
  const categories = assignment?.categories ?? [];

  if (!state.sessionActive || hidden) return null;

  return (
    <div className="hint-banner" role="note">
      <span className="hint-banner-icon" aria-hidden="true">
        <Icon name="pointer" size={16} />
      </span>
      <span className="hint-banner-copy">
        {categories.length === 1 ? (
          <>
            <strong>Hold a word</strong>, slide to the exact letter and release
            to mark {categoryListLabel(categories)} — or tap the letter and confirm.
          </>
        ) : (
          <>
            <strong>Hold a word</strong>, choose the exact letter, then slide to
            {categories.length ? ` ${categoryListLabel(categories)}` : " the mistake type"}
            {" "}and release — or tap each step.
          </>
        )}
      </span>
      <button
        type="button"
        className="btn-ghost hint-banner-dismiss"
        onClick={() => {
          setHidden(true);
          retireHint();
        }}
      >
        Got it
      </button>
    </div>
  );
}

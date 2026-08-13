import { useEffect, useState } from "react";
import { isPinpointCategory } from "../config";
import { categoryListLabel, makeAssignmentSnapshot } from "../lib/judgeAssignments";
import { useJudging } from "../state/store";
import { Icon } from "./Icon";

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
    /* Storage may be unavailable in a private or restricted browser context. */
  }
}

/** A subtle, dismissible coach tip for the connected letter-to-category path. */
export function HintBanner() {
  const { state } = useJudging();
  const [hidden, setHidden] = useState(hintRetired);
  const hasMarks = state.mistakes.length > 0;
  const sessionId = state.activeSessionId;

  // Retire the tip after the first successful mark, but keep its current
  // space until the reciter changes. Removing it mid-gesture would pull the
  // Mushaf upward and move the remaining letters beneath the judge's hand.
  useEffect(() => {
    if (hasMarks) retireHint();
  }, [hasMarks]);

  useEffect(() => {
    setHidden(hintRetired());
  }, [sessionId]);

  const assignment =
    state.activeAssignment ??
    makeAssignmentSnapshot(state.panel, state.deviceJudgeId, state.config);
  const categories = (assignment?.categories ?? []).filter(isPinpointCategory);

  if (!state.sessionActive || hidden || categories.length === 0) return null;

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
            {` ${categoryListLabel(categories)}`} and release — or tap each step.
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

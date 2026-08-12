import { useState } from "react";
import { useJudging } from "../state/store";
import { Icon } from "./Icon";
import {
  assignmentLabel,
  makeAssignmentSnapshot,
} from "../lib/judgeAssignments";

const KEY = "tahqeeq.hintSeen.assignedRail.v1";

/** A subtle, dismissible coach tip for the connected letter-to-category path.
 *  Shows only on a clean slate (no marks yet) until dismissed once. */
export function HintBanner() {
  const { state } = useJudging();
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem(KEY) === "1";
    } catch {
      return false;
    }
  });
  const assignment =
    state.activeAssignment ??
    makeAssignmentSnapshot(state.panel, state.deviceJudgeId, state.config);
  const categories = assignment?.categories ?? [];

  if (!state.sessionActive || dismissed || state.mistakes.length > 0) return null;

  return (
    <div className="hint-banner" role="note">
      <span className="hint-banner-icon" aria-hidden="true">
        <Icon name="pointer" size={16} />
      </span>
      <span className="hint-banner-copy">
        {categories.length === 1 ? (
          <>
            <strong>Hold a word</strong>, slide to the exact letter and release
            to mark {assignmentLabel(categories)} — or tap the letter and confirm.
          </>
        ) : (
          <>
            <strong>Hold a word</strong>, choose the exact letter, then slide to
            {categories.length ? ` ${assignmentLabel(categories)}` : " the mistake type"}
            {" "}and release — or tap each step.
          </>
        )}
      </span>
      <button
        type="button"
        className="btn-ghost hint-banner-dismiss"
        onClick={() => {
          setDismissed(true);
          try {
            localStorage.setItem(KEY, "1");
          } catch {
            /* ignore */
          }
        }}
      >
        Got it
      </button>
    </div>
  );
}

import { useEffect, useState } from "react";
import { isPinpointCategory } from "../config";
import { makeAssignmentSnapshot } from "../lib/judgeAssignments";
import { useJudging } from "../state/store";

export const MARKING_COACH_KEY = "tahqeeq.hintSeen.assignedRail.v1";

function coachRetired(): boolean {
  try {
    return localStorage.getItem(MARKING_COACH_KEY) === "1";
  } catch {
    return false;
  }
}

function retireCoach(): void {
  try {
    localStorage.setItem(MARKING_COACH_KEY, "1");
  } catch {
    /* The guide must never interrupt judging when storage is unavailable. */
  }
}

interface MarkingCoachTipProps {
  forcedOpen: boolean;
  suppressed: boolean;
  onForcedOpenChange: (open: boolean) => void;
}

export function MarkingCoachTip({
  forcedOpen,
  suppressed,
  onForcedOpenChange,
}: MarkingCoachTipProps) {
  const { state } = useJudging();
  const [hidden, setHidden] = useState(coachRetired);
  const [compactExpanded, setCompactExpanded] = useState(false);
  const hasMarks = state.mistakes.length > 0;
  const sessionId = state.activeSessionId;
  const assignment = state.activeAssignment ?? makeAssignmentSnapshot(
    state.panel,
    state.deviceJudgeId,
    state.config,
  );
  const categories = (assignment?.categories ?? []).filter(isPinpointCategory);

  useEffect(() => {
    if (!hasMarks) return;
    retireCoach();
    setHidden(true);
    onForcedOpenChange(false);
  }, [hasMarks, onForcedOpenChange]);

  useEffect(() => {
    setHidden(coachRetired());
    setCompactExpanded(false);
    onForcedOpenChange(false);
  }, [onForcedOpenChange, sessionId]);

  useEffect(() => {
    if (forcedOpen) setCompactExpanded(true);
  }, [forcedOpen]);

  const visible = !suppressed && state.sessionActive && categories.length > 0 && (forcedOpen || !hidden);
  if (!visible) return null;

  const dismiss = () => {
    setHidden(true);
    retireCoach();
    onForcedOpenChange(false);
  };

  return (
    <aside
      className={`marking-coach-tip ${compactExpanded ? "is-expanded" : ""}`}
      role="status"
      aria-live="polite"
    >
      <button
        type="button"
        className="marking-coach-compact-trigger"
        aria-label="Open marking guide"
        onClick={() => setCompactExpanded(true)}
      >
        ?
      </button>
      <p>
        Hold a word, then slide to the exact letter. Release over the mistake type.
      </p>
      <button type="button" className="marking-coach-dismiss" onClick={dismiss}>Got it</button>
    </aside>
  );
}

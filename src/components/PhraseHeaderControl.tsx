import { useEffect, useState } from "react";
import { isPinpointCategory } from "../config";
import { recordPhraseFinding, type PhraseFinding } from "../lib/phraseFindings";
import { useJudging } from "../state/store";
import { phrasePracticeEnabled, phraseMistakeFromFinding, phraseFindingsFromState } from "../lib/phrasePractice";
import { StartingEndingPanel, type PhraseOpenRequest } from "./StartingEndingPanel";

/** Production uses saved evidence; the isolated development proof remains available. */
export function phraseHeaderProofEnabled() {
  return import.meta.env.PROD || import.meta.env.DEV && new URLSearchParams(location.search).get("phraseHeader") === "1";
}

export function PhraseHeaderControl({ showTashkeel, onOpenChange }: {
  showTashkeel: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { state, dispatch } = useJudging();
  const [request, setRequest] = useState<PhraseOpenRequest | null>(null);
  const [open, setOpen] = useState(false);
  const [findings, setFindings] = useState<PhraseFinding[]>([]);
  const savedPractice = phrasePracticeEnabled(state);
  useEffect(() => { setFindings([]); }, [state.activeSessionId]);
  useEffect(() => { onOpenChange(open); }, [open, onOpenChange]);
  useEffect(() => () => onOpenChange(false), [onOpenChange]);
  return <>
    <button type="button" className="phrase-header-trigger" data-phrase-entry
      aria-expanded={open} aria-haspopup="dialog" aria-controls={open ? "starting-ending-panel" : undefined}
      onClick={event => setRequest({ id: (request?.id ?? 0) + 1, source: event.currentTarget })}>
      Starting &amp; ending
    </button>
    <StartingEndingPanel request={request} onOpenChange={setOpen} showTashkeel={showTashkeel}
      categories={(state.activeAssignment?.categories ?? []).filter(isPinpointCategory)}
      config={state.activeAssignment?.config ?? state.config} findings={savedPractice ? phraseFindingsFromState(state) : findings}
      onMark={finding => {
        if (savedPractice) {
          const mistake = phraseMistakeFromFinding(state, finding);
          if (mistake) dispatch({type: "ADD_MISTAKE", mistake});
        } else setFindings(current => recordPhraseFinding(current, finding));
      }}
      onUndo={id => {
        if (savedPractice) dispatch({type: "REMOVE_MISTAKE", id});
        else setFindings(current => current.filter(finding => finding.id !== id));
      }} />
  </>;
}

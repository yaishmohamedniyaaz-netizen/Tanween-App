import { useEffect, useMemo, useRef, useState } from "react";
import { CATEGORY_BY_ID } from "../config";
import { selectedResultView } from "../lib/competitionResults";
import { buildParticipantQuestionEvidence, type ParticipantQuestionEvidence } from "../lib/questionEvidence";
import { computeCategoryScores, missingRequiredImpressionCategories } from "../lib/scoring";
import type { ResultsReviewItem } from "../lib/resultsReview";
import type { ReplayWord } from "../lib/recitationReplay";
import type { CategoryId } from "../types";
import { RecitationEvidenceSpan } from "./RecitationEvidenceSpan";
import { SessionRecordingPlayer } from "./SessionRecordingPlayer";
import "../styles/participantReviewWorkspace.css";

interface Props {
  item: ResultsReviewItem;
  selected: Record<CategoryId, string>;
  isSample: boolean;
  active: boolean;
  reasons: string[];
  onSelectSource: (category: CategoryId, id: string) => void;
  onBack: () => void;
  onPrevious?: () => void;
  onNext?: () => void;
}

const unavailable: Record<ParticipantQuestionEvidence["status"], string> = {
  ready: "",
  "source-missing": "Choose the missing judge sources to show the recorded passage.",
  "source-conflict": "The selected sources contain different questions. Inspect their sources before using one passage.",
  "version-mismatch": "The recorded Mushaf versions do not agree. An exact passage cannot be shown.",
  "manual-missing": "This external question has no saved Quran range.",
  "legacy-missing": "This older result has no saved Quran range.",
};

export function ParticipantReviewWorkspace(props: Props) {
  const evidence = useMemo(() => buildParticipantQuestionEvidence(props.item.candidate, props.selected),
    [props.item.candidate, props.selected]);
  const identity = [props.item.candidate.participant.id, evidence.status, evidence.fingerprint,
    ...evidence.selectedSessions.map(s => `${s.id}:${s.revision ?? 1}`)].join("|");
  // A new source/revision gets a fresh inspector and player, never stale media.
  return <WorkspaceEvidence key={identity} {...props} evidence={evidence} />;
}

function WorkspaceEvidence({ item, selected, evidence, active, reasons, onSelectSource,
  onBack, onPrevious, onNext }: Props & { evidence: ParticipantQuestionEvidence }) {
  const [words, setWords] = useState<ReplayWord[]>([]);
  const [locatable, setLocatable] = useState<Set<string> | null>(null);
  const [wordId, setWordId] = useState<string | null>(null);
  const [findingKey, setFindingKey] = useState<string | null>(null);
  const [focusWord, setFocusWord] = useState(false);
  const [locationRequest, setLocationRequest] = useState(0);
  const [playbackWord, setPlaybackWord] = useState<string | null>(null);
  const [requestedSource, setRequestedSource] = useState<string | null>(null);
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const inspector = useRef<HTMLElement>(null);
  const origin = useRef<HTMLElement | null>(null);
  const participant = item.candidate.participant;
  const view = selectedResultView(item, selected);
  const word = words.find(w => w.wordId === wordId);
  const finding = evidence.mistakes.find(m => m.key === findingKey);
  const related = wordId ? evidence.mistakes.filter(m => m.mistake.wordId === wordId) : finding ? [finding] : [];
  useEffect(() => { heading.current?.focus({ preventScroll: true }); }, []);
  const revealInspector = () => {
    origin.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setInspectorOpen(true);
    requestAnimationFrame(() => inspector.current?.focus({ preventScroll: true }));
  };
  const closeInspector = () => {
    setInspectorOpen(false);
    origin.current?.focus({ preventScroll: true });
  };
  const selectWord = (id: string) => {
    setWordId(id); setFindingKey(null); setFocusWord(false); setRequestedSource(null);
    revealInspector();
  };
  const selectFinding = (key: string, fromPage = false) => {
    const entry = evidence.mistakes.find(m => m.key === key);
    if (!entry) return;
    setFindingKey(key); setWordId(entry.mistake.wordId ?? null);
    setFocusWord(!fromPage); setRequestedSource(entry.sessionId); revealInspector();
    setLocationRequest(n => n + 1);
  };
  const sources = useMemo(() => evidence.selectedSessions.map(s => ({sessionId:s.id,
    label:`${s.assignment?.judgeName || s.assignment?.judgeLabel || "Judge"} · revision ${s.revision ?? 1}`})), [evidence.selectedSessions]);

  return <article className="participant-review-workspace" aria-labelledby="rw-participant">
    <header className="rw-header">
      <button onClick={onBack} className="btn-ghost">Back to results</button>
      <div className="rw-identity"><h2 id="rw-participant" ref={heading} tabIndex={-1}>
        <bdi>{participant.number}</bdi> {participant.name || "Unnamed participant"}</h2>
        <p>{evidence.question?.label || "Recorded passage unavailable"}</p></div>
      <details className="rw-score"><summary aria-label="Score breakdown and judge sources">
        Score <strong>{view.preview?.total ?? "—"}</strong>{view.preview && <span> / {view.preview.totalMax}</span>}
      </summary><div className="rw-score-content">
        <button className="btn-ghost" onClick={event => {
          const details = event.currentTarget.closest("details");
          if (details) { details.open = false; details.querySelector("summary")?.focus(); }
        }}>Close score details</button>
        {view.official && !view.matchesOfficial && <p>Official: {view.official.total} / {view.official.totalMax} · revision {view.official.revision}</p>}
        {reasons.length > 0 && <ul>{reasons.map(reason => <li key={reason}>{reason}</li>)}</ul>}
        {item.candidate.categories.map(category => {
          const options = item.candidate.byCategory[category];
          const source = options.find(s => s.id === selected[category]);
          const score = source && !missingRequiredImpressionCategories(source.config, source.impressions ?? [], [category]).length
            ? computeCategoryScores(source.config, source.mistakes, source.impressions ?? []).byCategory[category] : null;
          return <div className={`rw-criterion cat-${category}`} key={category}>
            <span><i aria-hidden="true"/>{CATEGORY_BY_ID[category].label}</span><strong>{score ? `${score.score} / ${score.start}` : "—"}</strong>
            {options.length > 1 ? <label>Source<select value={selected[category]}
              aria-label={`${CATEGORY_BY_ID[category].label} source`} onChange={e => onSelectSource(category, e.target.value)}>
              <option value="">Choose source</option>{options.map(s => <option key={s.id} value={s.id}>
                {s.assignment?.judgeName || s.assignment?.judgeLabel || "Judge"} · revision {s.revision ?? 1}
              </option>)}</select></label> : <small>{source ? `${source.assignment?.judgeName || source.assignment?.judgeLabel || "Judge"} · revision ${source.revision ?? 1}` : "Source missing"}</small>}
          </div>;
        })}
        <p>Source choices change this view only. They do not edit a judge's record.</p>
      </div></details>
      <nav className="rw-neighbours" aria-label="Participants in filtered results">
        <button className="btn-ghost" disabled={!onPrevious} onClick={onPrevious} aria-label="Previous participant">←</button>
        <button className="btn-ghost" disabled={!onNext} onClick={onNext} aria-label="Next participant">→</button>
      </nav>
    </header>
    <div className="rw-layout">
      <section className="rw-passage" aria-label="Recorded Quran passage">
        {evidence.status === "ready" && evidence.range ? <RecitationEvidenceSpan
          range={evidence.range} mistakes={evidence.mistakes} activeMistakeKey={findingKey}
          focusActiveWord={focusWord} onMistakeSelect={key => selectFinding(key, true)}
          onWordIdsReady={setLocatable} onReplayWordsReady={setWords} onReplayWordSelect={selectWord}
          selectedWordId={wordId} replayWordId={playbackWord} paginated locationRequest={locationRequest}
        /> : <p className="rw-unavailable" role="status">{unavailable[evidence.status] || "The saved Quran range is unavailable."} Judge findings remain readable.</p>}
      </section>
      <aside className="rw-sidebar" aria-label="Findings and recording">
        <section className="rw-findings" aria-labelledby="rw-findings-title">
          <h3 id="rw-findings-title">Judge findings <span>{evidence.mistakes.length}</span></h3>
          {evidence.mistakes.length ? <ol>{evidence.mistakes.map(entry => <li key={entry.key}>
            <button className={`rw-finding cat-${entry.mistake.category}`} aria-pressed={findingKey === entry.key}
              onClick={() => selectFinding(entry.key)}><i aria-hidden="true"/>
              <span><strong>{entry.mistake.label || CATEGORY_BY_ID[entry.mistake.category].label}</strong>
                <small>{entry.mistake.surah}:{entry.mistake.ayah} · {entry.judgeName}</small></span>
              <bdi>−{entry.mistake.amount}</bdi></button>
          </li>)}</ol> : <p>No judge-recorded findings.</p>}
        </section>
        <section ref={inspector} tabIndex={-1} className={`rw-inspector${inspectorOpen ? " is-open" : ""}`}
          aria-label="Selected word or finding" onKeyDown={e => {if(e.key === "Escape") closeInspector();}}>
          <div className="rw-inspector-head"><h3>{word ? <bdi dir="rtl">{word.text}</bdi> : finding ? "Selected finding" : "Word & recording"}</h3>
            {inspectorOpen && <button className="btn-ghost" onClick={closeInspector}>Close</button>}</div>
          {active && <SessionRecordingPlayer sources={sources} presentation="workspace"
            replay={evidence.status === "ready" && evidence.fingerprint ? {
              questionFingerprint:evidence.fingerprint, words, selectedWordId:wordId, requestedSessionId:requestedSource,
              onWordSelect:selectWord, onPlaybackWord:setPlaybackWord,
            } : undefined}/>}
          {inspectorOpen ? <>
            {word && <p>{word.surah}:{word.ayah ?? "Basmalah"}</p>}
            {related.map(entry => <div className={`rw-selected-finding cat-${entry.mistake.category}`} key={entry.key}>
              <strong><i aria-hidden="true"/>{CATEGORY_BY_ID[entry.mistake.category].label} · −{entry.mistake.amount}</strong>
              <p>{entry.mistake.label}</p>{entry.mistake.note && <p>{entry.mistake.note}</p>}
              <small>{entry.judgeName} · revision {entry.sessionRevision}</small>
              {!locatable?.has(entry.mistake.wordId ?? "") && <p>Location not verified in this recorded passage.</p>}
            </div>)}
            {word && !related.length && <p>No judge finding on this word. This is not an automatic assessment.</p>}
          </> : <p>Select a word or finding to inspect it.</p>}
        </section>
        <details className="rw-notes"><summary>Source notes & question history</summary>
          {evidence.selectedSessions.map(s => <div key={s.id}><strong>{s.assignment?.judgeName || s.assignment?.judgeLabel || "Judge"} · revision {s.revision ?? 1}</strong>
            <p>{s.notes || "No session note."}</p>
            {(s.question?.replacements ?? []).map(r => <p key={r.id}>Before judging: {r.reason === "reciter-changed" ? "Reciter changed" : "Question changed"} · {new Date(r.replacedAt).toLocaleString()}</p>)}
          </div>)}
        </details>
      </aside>
    </div>
  </article>;
}

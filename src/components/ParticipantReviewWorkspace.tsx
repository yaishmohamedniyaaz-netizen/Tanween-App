import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { CATEGORY_BY_ID } from "../config";
import { selectedResultView } from "../lib/competitionResults";
import { buildParticipantQuestionEvidence, type ParticipantQuestionEvidence } from "../lib/questionEvidence";
import { computeCategoryScores, missingRequiredImpressionCategories } from "../lib/scoring";
import type { ResultsReviewItem } from "../lib/resultsReview";
import type { ReplayWord } from "../lib/recitationReplay";
import type { CategoryId } from "../types";
import { RecitationEvidenceSpan } from "./RecitationEvidenceSpan";
import { SessionRecordingPlayer } from "./SessionRecordingPlayer";
import { ReplayKalima } from "./ReplayKalima";
import "../styles/participantReviewWorkspace.css";
import "../styles/replayPlayerLayout.css";
import { useMediaQuery } from "../hooks/useMediaQuery";
import type { MushafLayout } from "../lib/devicePreferences";
import { fixedMushafReviewEnabled } from "../lib/fixedMushafReview";
import { FIXED_PAGE_ASPECT_RATIO } from "./FixedMushafPageSurface";

interface Props {
  item: ResultsReviewItem;
  selected: Record<CategoryId, string>;
  isSample: boolean;
  active: boolean;
  pageLayout?: MushafLayout;
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

function WorkspaceEvidence({ item, selected, evidence, active, reasons, onSelectSource, pageLayout = "full",
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
  const replayPrototype = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("wordReplayPrototype") === "1";
  const [replayMode, setReplayMode] = useState(false);
  const [transportTarget, setTransportTarget] = useState<HTMLDivElement | null>(null);
  const [feedbackTarget, setFeedbackTarget] = useState<HTMLDivElement | null>(null);
  const [audioAvailability, setAudioAvailability] = useState("loading");
  const shell = useRef<HTMLElement>(null);
  const recordingPanel = useRef<HTMLElement>(null);
  const dockFits = useMediaQuery("(max-width: 760px), (min-width: 901px) and (max-width: 1279px) and (min-height: 481px)");
  const docked = replayPrototype && dockFits;
  useLayoutEffect(() => {
    const node = shell.current;
    if (!node || !docked) return;
    const measure = () => {
      // Document position stays stable when a surrounding page is scrolled.
      const top = Math.max(0, node.getBoundingClientRect().top + window.scrollY);
      node.style.setProperty("--rw-shell-top", `${top}px`);
      const dock = node.querySelector(".rw-player-dock");
      if (dock) node.style.setProperty("--rw-dock-height", `${dock.getBoundingClientRect().height}px`);
    };
    measure();
    const observer = new ResizeObserver(measure);
    const header = node.querySelector(".rw-header");
    if (header) observer.observe(header);
    const banner = document.querySelector(".app-header");
    if (banner) observer.observe(banner);
    const dock = node.querySelector(".rw-player-dock");
    if (dock) observer.observe(dock);
    window.addEventListener("resize", measure);
    return () => { observer.disconnect(); window.removeEventListener("resize", measure); };
  }, [docked]);
  const [playbackRequest, setPlaybackRequest] = useState<{id:number;wordId:string} | null>(null);
  const tapSequence = useRef(0);
  useEffect(() => {
    if (!active) { setReplayMode(false); setPlaybackRequest(null); }
  }, [active]);
  const heading = useRef<HTMLHeadingElement>(null);
  const inspector = useRef<HTMLElement>(null);
  const origin = useRef<HTMLElement | null>(null);
  const scoreDetails = useRef<HTMLDetailsElement>(null);
  const fixedReview = fixedMushafReviewEnabled();
  const compact = useMediaQuery(fixedReview ? "(max-width: 900px)" : "(max-width: 760px)");
  const narrowDesktop = useMediaQuery("(min-width: 901px) and (max-width: 1279px)");
  const spread = pageLayout === "spread" && !compact;
  useEffect(() => {
    const dismiss = (event: PointerEvent) => {
      const card = scoreDetails.current;
      if (card?.open && event.target instanceof Node && !card.contains(event.target)) card.open = false;
    };
    const escape = (event: KeyboardEvent) => {
      const card = scoreDetails.current;
      if (event.key === "Escape" && !event.defaultPrevented && card?.open) {
        card.open = false; card.querySelector("summary")?.focus();
      }
    };
    document.addEventListener("pointerdown", dismiss);
    document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("pointerdown", dismiss); document.removeEventListener("keydown", escape); };
  }, []);
  useEffect(() => { if (!active && scoreDetails.current) scoreDetails.current.open = false; }, [active]);
  const participant = item.candidate.participant;
  const view = selectedResultView(item, selected);
  const word = words.find(w => w.wordId === wordId);
  const finding = evidence.mistakes.find(m => m.key === findingKey);
  const related = wordId ? evidence.mistakes.filter(m => m.mistake.wordId === wordId) : finding ? [finding] : [];
  useEffect(() => { heading.current?.focus({ preventScroll: true }); }, []);
  const revealInspector = () => {
    origin.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setInspectorOpen(true);
    requestAnimationFrame(() => {
      inspector.current?.focus({ preventScroll: true });
      if (spread && narrowDesktop) inspector.current?.scrollIntoView({block:"nearest",behavior:"smooth"});
    });
  };
  const closeInspector = () => {
    setInspectorOpen(false);
    origin.current?.focus({ preventScroll: true });
  };
  const selectWord = (id: string) => {
    setWordId(id); setFindingKey(null); setFocusWord(false); setRequestedSource(null);
    if (replayPrototype && replayMode) {
      setPlaybackRequest({id: ++tapSequence.current, wordId:id});
      return;
    }
    revealInspector();
  };
  const selectFinding = (key: string, fromPage = false) => {
    const entry = evidence.mistakes.find(m => m.key === key);
    if (!entry) return;
    if (fromPage && replayPrototype && replayMode && entry.mistake.wordId) {
      selectWord(entry.mistake.wordId); return;
    }
    setPlaybackRequest(null);
    setFindingKey(key); setWordId(entry.mistake.wordId ?? null);
    setFocusWord(!fromPage); setRequestedSource(entry.sessionId); revealInspector();
    setLocationRequest(n => n + 1);
  };
  const sources = useMemo(() => evidence.selectedSessions.map(s => ({sessionId:s.id,
    label:`${s.assignment?.judgeName || s.assignment?.judgeLabel || "Judge"} · revision ${s.revision ?? 1}`})), [evidence.selectedSessions]);

  const toggleReplay = () => { setReplayMode(value => !value); setPlaybackRequest(null); setInspectorOpen(false); };
  const replayToggle = <button className="btn-secondary" aria-pressed={replayMode} disabled={!active || evidence.status !== "ready" || (!replayMode && audioAvailability !== "ready")}
    onClick={toggleReplay} title="Controls word taps, not the Play button">Word replay {replayMode ? "on" : "off"}</button>;

  return <article ref={shell} className={`participant-review-workspace${spread ? " rw-dual" : ""}${replayPrototype ? " rw-player-layout" : ""}${docked ? " rw-docked" : ""}`} aria-labelledby="rw-participant"
    onKeyDown={event => {
      if (event.key === "Escape" && playbackRequest) {
        event.stopPropagation(); setPlaybackRequest(null);
        shell.current?.querySelector<HTMLButtonElement>('.rw-passage button[aria-pressed="true"]')?.focus();
      }
    }}>
    <header className="rw-header">
      <button onClick={onBack} className="btn-ghost">Back to results</button>
      <div className="rw-identity"><h2 id="rw-participant" ref={heading} tabIndex={-1}>
        <bdi>{participant.number}</bdi> {participant.name || "Unnamed participant"}</h2>
        <p>{evidence.question?.label || "Recorded passage unavailable"}</p></div>
      <details ref={scoreDetails} className="rw-score"><summary aria-label="Score breakdown and judge sources">
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
      <section className="rw-passage" aria-label="Recorded Quran passage"
        style={{ "--rw-page-ratio": fixedReview ? FIXED_PAGE_ASPECT_RATIO : 1 / 1.471 } as import("react").CSSProperties}>
        {evidence.status === "ready" && evidence.range ? <RecitationEvidenceSpan
          range={evidence.range} mistakes={evidence.mistakes} activeMistakeKey={findingKey}
          focusActiveWord={focusWord} onMistakeSelect={key => selectFinding(key, true)}
          onWordIdsReady={setLocatable} onReplayWordsReady={setWords} onReplayWordSelect={selectWord}
          selectedWordId={wordId} replayWordId={playbackWord} wordReplayMode={replayPrototype && replayMode} paginated spread={spread} locationRequest={locationRequest}
        /> : <p className="rw-unavailable" role="status">{unavailable[evidence.status] || "The saved Quran range is unavailable."} Judge findings remain readable.</p>}
      </section>
      <aside className="rw-sidebar" aria-label="Findings and recording">
        {replayPrototype && <section ref={recordingPanel} tabIndex={-1} className="rw-replay-panel" aria-label="Recording replay">
          <div className="rw-inspector-head"><h3>Recording</h3>
            {!docked && replayToggle}</div>
          <p>{replayMode ? "Tap a word to replay." : "Word taps inspect findings."}</p>
          {active && <SessionRecordingPlayer sources={sources} presentation="workspace"
            replay={evidence.status === "ready" && evidence.fingerprint ? {
              questionFingerprint:evidence.fingerprint, words, selectedWordId:wordId, requestedSessionId:requestedSource,
              playbackRequest, wordReplayEnabled: replayMode, transportTarget: docked ? transportTarget : null, feedbackTarget: docked ? feedbackTarget : null,
              onAvailabilityChange: setAudioAvailability,
              onTimingWordSelect: nextWord => { setWordId(nextWord); setPlaybackRequest(null); },
              onCloseWordFeedback: () => {
                setPlaybackRequest(null);
                shell.current?.querySelector<HTMLButtonElement>('.rw-passage button[aria-pressed="true"]')?.focus();
              }, onWordSelect:selectWord, onPlaybackWord:() => {},
            } : undefined}/>}
        </section>}
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
        {(!replayPrototype || inspectorOpen) && <section ref={inspector} tabIndex={-1} className={`rw-inspector${inspectorOpen ? " is-open" : ""}`}
          aria-label="Selected word or finding" onKeyDown={e => {if(e.key === "Escape") closeInspector();}}>
          <div className="rw-inspector-head"><h3>{word ? <ReplayKalima word={word}/> : finding ? "Selected finding" : "Word & recording"}</h3>
            {inspectorOpen && <button className="btn-ghost" onClick={closeInspector}>Close</button>}</div>
          {active && !replayPrototype && <SessionRecordingPlayer sources={sources} presentation="workspace"
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
        </section>}
        <details className="rw-notes"><summary>Source notes & question history</summary>
          {evidence.selectedSessions.map(s => <div key={s.id}><strong>{s.assignment?.judgeName || s.assignment?.judgeLabel || "Judge"} · revision {s.revision ?? 1}</strong>
            <p>{s.notes || "No session note."}</p>
            {(s.question?.replacements ?? []).map(r => <p key={r.id}>Before judging: {r.reason === "reciter-changed" ? "Reciter changed" : "Question changed"} · {new Date(r.replacedAt).toLocaleString()}</p>)}
          </div>)}
        </details>
      </aside>
    </div>
    {replayPrototype && <footer className="rw-player-dock" aria-label="Recording playback controls" hidden={!docked}>
      <div ref={setFeedbackTarget} className="rw-feedback-slot" />
      <div className="rw-dock-context">
        <div>{word ? <ReplayKalima word={word}/> : <strong>Recording</strong>}</div>
        {docked && replayToggle}
        <button className="btn-ghost" onClick={() => {
          recordingPanel.current?.scrollIntoView({ block: "nearest" });
          recordingPanel.current?.focus({ preventScroll: true });
        }}>Details</button>
      </div>
      <div ref={setTransportTarget} className="rw-transport-slot" />
      <p className="rw-transport-empty" role="status">{audioAvailability === "loading" ? "Loading recording…" : audioAvailability === "failed" ? "Could not open recording. Open Details to retry." : "Recording unavailable on this device. Open Details."}</p>
    </footer>}
  </article>;
}

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { CATEGORY_BY_ID } from "../config";
import { isPhraseMistake } from "../lib/phraseEvidence";
import { mistakeLocationReference } from "../lib/mistakeDisplay";
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
import { Icon } from "./Icon";
import { mistakePrimaryGlyph } from "../lib/mistakeDisplay";
import { letterTileGlyphStyle } from "../lib/letterFit";
import { visibleMushafPages, mushafPageRangeLabel } from "../lib/mushafSpread";
import { RESULT_STATUS_WORDS, type ResultStatus } from "../lib/resultStatus";
import type { JudgeRailSide } from "../lib/devicePreferences";
import { participantCategoryLabel } from "../lib/participants";

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
  /** Number and name of the neighbouring participants in the filtered list. */
  previous?: { number: string; name: string };
  next?: { number: string; name: string };
  position?: { index: number; total: number };
  status?: { status: ResultStatus; detail?: string };
  /** Follows the judging rail setting, so both screens put the details on the same side. */
  railSide?: JudgeRailSide;
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
  onBack, onPrevious, onNext, previous, next, position, status, railSide = "left" }: Props & { evidence: ParticipantQuestionEvidence }) {
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
      const owner = node.closest<HTMLElement>('.records-main');
      const top = Math.max(0, node.getBoundingClientRect().top + (owner?.scrollTop ?? window.scrollY));
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
  // Results always open as two pages on a wide screen, the facing page faded (Results review, round 2).
  const spread = !compact;
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
    setFindingKey(key); setWordId(isPhraseMistake(entry.mistake) ? null : entry.mistake.wordId ?? null);
    setFocusWord(!fromPage && !isPhraseMistake(entry.mistake)); setRequestedSource(entry.sessionId); revealInspector();
    setLocationRequest(n => n + 1);
  };
  const sources = useMemo(() => evidence.selectedSessions.map(s => ({sessionId:s.id,
    label:`${s.assignment?.judgeName || s.assignment?.judgeLabel || "Judge"} · revision ${s.revision ?? 1}`})), [evidence.selectedSessions]);

  const toggleReplay = () => { setReplayMode(value => !value); setPlaybackRequest(null); setInspectorOpen(false); };
  const replayToggle = <button className="btn-secondary" aria-pressed={replayMode} disabled={!active || evidence.status !== "ready" || (!replayMode && audioAvailability !== "ready")}
    onClick={toggleReplay} title="Controls word taps, not the Play button">Word replay {replayMode ? "on" : "off"}</button>;

  const firstName = (name: string) => name.trim().split(/\s+/)[0] || "Unnamed";
  const judges = [...new Set(evidence.selectedSessions.map(s => s.assignment?.judgeName || s.assignment?.judgeLabel || "Judge"))];
  const spreadPages = evidence.range ? (spread ? visibleMushafPages(evidence.range.startPage, "spread") : [evidence.range.startPage]) : [];
  const pagesLabel = evidence.range && evidence.range.endPage > spreadPages[spreadPages.length - 1]
    ? `${evidence.range.startPage}–${evidence.range.endPage}` : mushafPageRangeLabel(spreadPages);
  const checkReasons = status?.status === "check" ? reasons.filter(r => !r.startsWith("Awaiting ")) : [];

  return <article ref={shell} className={`participant-review-workspace rw2 rail-${railSide}${spread ? " rw-dual" : ""}${replayPrototype ? " rw-player-layout" : ""}${docked ? " rw-docked" : ""}`} aria-labelledby="rw-participant"
    style={{ "--rw-page-ratio": fixedReview ? FIXED_PAGE_ASPECT_RATIO : 1 / 1.471 } as import("react").CSSProperties}
    onKeyDown={event => {
      if (event.key === "Escape" && playbackRequest) {
        event.stopPropagation(); setPlaybackRequest(null);
        shell.current?.querySelector<HTMLButtonElement>('.rw-passage button[aria-pressed="true"]')?.focus();
      }
    }}>
    {/* The row where judging shows page numbers: back, View only, pages, participant switcher. */}
    <header className="rw-header rw2-row">
      <button type="button" onClick={onBack} className="rw2-chip"><span className="rw2-back"><Icon name="chevron" size={16} /></span>All results</button>
      <span className="rw2-viewonly"><EyeIcon />View only</span>
      {pagesLabel && <span className="rw2-pages-label t-num" aria-label={`Pages ${pagesLabel}`}>{pagesLabel.replace("–", " – ")}</span>}
      <nav className="rw-neighbours rw2-switch" aria-label="Participants in filtered results">
        <button type="button" className="rw2-chip" disabled={!onPrevious} onClick={onPrevious}
          aria-label={previous ? `Previous participant: ${previous.number} ${previous.name}` : "Previous participant"} title={previous ? `${previous.number} ${previous.name}` : undefined}>
          <span className="rw2-back"><Icon name="chevron" size={16} /></span>{previous && <><bdi className="t-num">{previous.number}</bdi> {firstName(previous.name)}</>}</button>
        {position && <span className="rw2-pos t-num">{position.index} of {position.total}</span>}
        <button type="button" className="rw2-chip" disabled={!onNext} onClick={onNext}
          aria-label={next ? `Next participant: ${next.number} ${next.name}` : "Next participant"} title={next ? `${next.number} ${next.name}` : undefined}>
          {next && <><bdi className="t-num">{next.number}</bdi> {firstName(next.name)}</>}<Icon name="chevron" size={16} /></button>
      </nav>
    </header>
    <aside className="rw-sidebar rw2-rail" aria-label="Result details">
      <section className="rw2-sec rw2-identity">
        <div className="rw2-name-row"><h2 id="rw-participant" ref={heading} tabIndex={-1}>{participant.name || "Unnamed participant"}</h2>
          {status && <span className={`ro-status is-${status.status}`}>{RESULT_STATUS_WORDS[status.status]}</span>}</div>
        <p className="rw2-meta"><bdi className="t-num">{participant.number}</bdi>{[participant.ageGroup, participant.category && participantCategoryLabel(participant.category), participant.institution].filter(Boolean).map(part => <span key={part}> · {part}</span>)}</p>
        <dl className="rw2-kv">
          <dt>Question</dt><dd>{evidence.question?.label || "Recorded passage unavailable"}</dd>
          <dt>Judge</dt><dd>{judges.join(", ") || "—"}</dd>
        </dl>
        {checkReasons.length > 0 && <ul className="rw2-reasons">{checkReasons.map(reason => <li key={reason}>{reason}</li>)}</ul>}
        {view.official && !view.matchesOfficial && <p className="rw2-official t-num">Official: {view.official.total} / {view.official.totalMax} · revision {view.official.revision}</p>}
      </section>
      <section className="rw2-sec rw2-score" aria-label="Score">
        <div className="rw2-total"><span className="rw2-label">Score</span>
          <span className="rw2-total-value"><b className="t-num">{view.preview?.total ?? "—"}</b><small className="t-num">/ {view.preview?.totalMax ?? item.candidate.categories.reduce((sum, c) => sum + (item.candidate.byCategory[c][0]?.config[c].start ?? 0), 0)}</small></span></div>
        {item.candidate.categories.map(category => {
          const options = item.candidate.byCategory[category];
          const source = options.find(s => s.id === selected[category]);
          const score = source && !missingRequiredImpressionCategories(source.config, source.impressions ?? [], [category]).length
            ? computeCategoryScores(source.config, source.mistakes, source.impressions ?? []).byCategory[category] : null;
          const deducted = score ? Math.round((score.start - score.score) * 100) / 100 : 0;
          return <div className={`rw-criterion rw2-crow cat-${category}`} key={category}>
            <i aria-hidden="true" />
            <span className="rw2-cname">{CATEGORY_BY_ID[category].short}</span>
            <span className={`rw2-cded t-num${deducted ? "" : " is-zero"}`}>{deducted ? `−${deducted}` : "—"}</span>
            <span className="rw2-cval t-num"><b>{score ? score.score : "—"}</b><small>/ {source?.config[category].start ?? options[0]?.config[category].start ?? "—"}</small></span>
            {options.length > 1 && <label className="rw2-source">Source<select value={selected[category]}
              aria-label={`${CATEGORY_BY_ID[category].label} source`} onChange={e => onSelectSource(category, e.target.value)}>
              <option value="">Choose source</option>{options.map(s => <option key={s.id} value={s.id}>
                {s.assignment?.judgeName || s.assignment?.judgeLabel || "Judge"} · revision {s.revision ?? 1}
              </option>)}</select></label>}
          </div>;
        })}
      </section>
      <section className="rw-findings rw2-sec rw2-mistakes" aria-labelledby="rw-findings-title">
        <h3 id="rw-findings-title" className="rw2-label">Mistakes · <span className="t-num">{evidence.mistakes.length}</span></h3>
        {evidence.mistakes.length ? <ol className="rw2-cards">{evidence.mistakes.map(entry => {
          const open = findingKey === entry.key;
          const glyph = mistakePrimaryGlyph(entry.mistake);
          return <li key={entry.key} className={`rw2-card cat-${entry.mistake.category}${open ? " is-open" : ""}`}>
            <button type="button" className="rw-finding rw2-card-row" aria-pressed={open} onClick={() => selectFinding(entry.key)}
              aria-label={`${glyph}, ${CATEGORY_BY_ID[entry.mistake.category].label}, ${mistakeLocationReference(entry.mistake)}, deduction ${entry.mistake.amount}`}>
              <span className="log-tile" aria-hidden="true"><span className="log-glyph" lang="ar" dir="rtl" style={letterTileGlyphStyle(glyph)}>{glyph}</span></span>
              <span className="rw2-amt t-num">−{entry.mistake.amount}</span>
              <span className="rw2-ref t-num"><bdi>{mistakeLocationReference(entry.mistake)}</bdi>{judges.length > 1 && <> · {entry.judgeName}</>}</span>
            </button>
            {open && <div className="rw2-card-line">
              {isPhraseMistake(entry.mistake) || !entry.mistake.wordText ? <span>{entry.mistake.label}</span>
                : <span className="rw2-word" lang="ar" dir="rtl">{entry.mistake.wordText}</span>}
              {entry.mistake.note && <small>{entry.mistake.note}</small>}
              {!isPhraseMistake(entry.mistake) && !locatable?.has(entry.mistake.wordId ?? "") && <small>Location not verified in this recorded passage.</small>}
            </div>}
          </li>;
        })}</ol> : <p>No judge-recorded findings.</p>}
      </section>
      {replayPrototype && <section ref={recordingPanel} tabIndex={-1} className="rw-replay-panel rw2-sec" aria-label="Recording replay">
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
      {!replayPrototype && <details ref={inspector as unknown as import("react").RefObject<HTMLDetailsElement>} className="rw-inspector rw2-sec rw2-recording" open={inspectorOpen}
        onToggle={event => setInspectorOpen((event.currentTarget as HTMLDetailsElement).open)}
        onKeyDown={e => {if(e.key === "Escape") closeInspector();}}>
        <summary className="rw2-disc">{word ? <>Recording · <ReplayKalima word={word}/></> : "Recording"}<Icon name="chevron" size={14} /></summary>
        {active && <SessionRecordingPlayer sources={sources} presentation="workspace"
          replay={evidence.status === "ready" && evidence.fingerprint ? {
            questionFingerprint:evidence.fingerprint, words, selectedWordId:wordId, requestedSessionId:requestedSource,
            onWordSelect:selectWord, onPlaybackWord:setPlaybackWord,
          } : undefined}/>}
        {word && !related.length && <p>No judge finding on this word. This is not an automatic assessment.</p>}
      </details>}
      <section className="rw2-sec rw2-notes-sec">
        <span className="rw2-label">Notes</span>
        <p className="rw2-notes">{evidence.selectedSessions.map(s => s.notes).filter(Boolean).join(" ") || "No session note."}</p>
        <details className="rw-notes"><summary className="rw2-disc">Sources and question history<Icon name="chevron" size={14} /></summary>
          {evidence.selectedSessions.map(s => <div key={s.id}><strong>{s.assignment?.judgeName || s.assignment?.judgeLabel || "Judge"} · revision {s.revision ?? 1}</strong>
            <p>{s.notes || "No session note."}</p>
            {(s.question?.replacements ?? []).map(r => <p key={r.id}>Before judging: {r.reason === "reciter-changed" ? "Reciter changed" : "Question changed"} · {new Date(r.replacedAt).toLocaleString()}</p>)}
          </div>)}
          <p>Source choices change this view only. They do not edit a judge's record.</p>
        </details>
      </section>
    </aside>
    <section className="rw-passage rw2-pages" aria-label="Recorded Quran passage">
      {evidence.status === "ready" && evidence.range ? <RecitationEvidenceSpan
        range={evidence.range} mistakes={evidence.mistakes} activeMistakeKey={findingKey}
        focusActiveWord={focusWord} onMistakeSelect={key => selectFinding(key, true)}
        onWordIdsReady={setLocatable} onReplayWordsReady={setWords} onReplayWordSelect={selectWord}
        selectedWordId={wordId} replayWordId={playbackWord} wordReplayMode={replayPrototype && replayMode} paginated spread={spread} facingPage locationRequest={locationRequest}
      /> : <p className="rw-unavailable" role="status">{unavailable[evidence.status] || "The saved Quran range is unavailable."} Judge findings remain readable.</p>}
    </section>
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

function EyeIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" /></svg>;
}

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { ReplayToolsPanel } from "./ReplayToolsPanel";
import type { SessionRecordingSource } from "./SessionRecordingPlayer.tsx";
import { appendReplayRevision, loadLocalRecordingPlayback, loadReplayRevisions, ReplayRevisionConflict,
  type LocalRecordingPlayback } from "../lib/recitationAudioStorage.ts";
import { decodeReplayAudio, type DecodedReplayAudio } from "../lib/decodeReplayAudio.ts";
import { currentReplayOccurrences, formatReplayTime, replayTargetMatches, replayWordAt,
  sameReplayMedia, type ReplayMediaIdentity, type ReplayRevision, type ReplayTarget,
  type ReplayWord } from "../lib/recitationReplay.ts";
import type { ReplaySuggestion } from "../lib/recitationReplayAnalysis.ts";
import { replaySaveFailure } from "../lib/recitationReplayRecovery.ts";
import { Icon } from "./Icon.tsx";
import { wordReplayChoices } from "../lib/wordReplayChoices.ts";
import { resolveWordReplay, wordTapDecision, type ReplayPartEvidence } from "../lib/wordReplayNavigation.ts";
import { indexReplayParts, prepareSavedReplay, prepareReplayContinuation } from "../lib/replayRecordingIndex.ts";

type PreparedNavigation = Omit<Awaited<ReturnType<typeof prepareSavedReplay>>, "audio"> & { id: number; wordId: string | null };

export interface RecitationReplayContext {
  questionFingerprint: string;
  words: ReplayWord[];
  selectedWordId: string | null;
  requestedSessionId: string | null;
  onWordSelect: (wordId: string) => void;
  onTimingWordSelect?: (wordId: string) => void;
  onPlaybackWord: (wordId: string | null) => void;
  /** Explicit tap intent, not selection state. Null disables prototype autoplay. */
  playbackRequest?: { id: number; wordId: string } | null;
  wordReplayEnabled?: boolean;
  /** Presentation slot only. The media element and controller never move. */
  transportTarget?: HTMLElement | null;
  feedbackTarget?: HTMLElement | null;
  onCloseWordFeedback?: () => void;
  onAvailabilityChange?: (status: string) => void;
}

export function RecitationReplayPlayer({ sources, context, fallback, embedded = false }: {
  sources: SessionRecordingSource[];
  context: RecitationReplayContext;
  fallback: ReactNode;
  embedded?: boolean;
}) {
  const [open, setOpen] = useState(embedded);
  const [sourceId, setSourceId] = useState(sources[0]?.sessionId ?? "");
  const [playback, setPlayback] = useState<LocalRecordingPlayback | null>(null);
  const [loadStatus, setLoadStatus] = useState("loading");
  const [loadSourceId, setLoadSourceId] = useState("");
  const [retryLoad, setRetryLoad] = useState(0);
  const [part, setPart] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [indexedParts, setIndexedParts] = useState<ReplayPartEvidence[]>([]);
  const [navigation, setNavigation] = useState<PreparedNavigation | null>(null);
  const [locating, setLocating] = useState(false);
  const [continuationNotice, setContinuationNotice] = useState("");
  const navigationEpoch = useRef(0);
  const navigationAbort = useRef<AbortController | null>(null);
  const cancelNavigation = () => {
    navigationEpoch.current++; navigationAbort.current?.abort();
    setLocating(false); setNavigation(null);
  };
  useEffect(() => {
    cancelNavigation();
    setContinuationNotice("");
    return () => { navigationEpoch.current++; navigationAbort.current?.abort(); };
  }, [sourceId, open, context.selectedWordId, context.questionFingerprint]);
  useEffect(() => {
    const hidden = () => { if (document.hidden) cancelNavigation(); };
    document.addEventListener("visibilitychange", hidden);
    return () => document.removeEventListener("visibilitychange", hidden);
  }, []);
  const continueRecording = async (media: ReplayMediaIdentity) => {
    cancelNavigation();
    const epoch = navigationEpoch.current;
    const abort = new AbortController(); navigationAbort.current = abort;
    setLocating(true); setError(null);
    try {
      const next = await prepareReplayContinuation(media, abort.signal, loadLocalRecordingPlayback);
      if (abort.signal.aborted || epoch !== navigationEpoch.current) return;
      if (next.kind === "gap") { setContinuationNotice("Playback stopped: the next recording part is unavailable. Later parts can be selected manually."); return; }
      if (next.kind === "end") { setContinuationNotice("End of recording."); return; }
      setContinuationNotice(`Continuing in part ${next.media.segmentIndex + 1}. Time between recording parts is not included.`);
      setPart(next.part);
      setNavigation({ id: epoch, wordId: context.selectedWordId, part: next.part,
        request: {media: next.media, occurrenceId: "continuation", revisionId: "continuation", startSeconds: 0, stopSeconds: null} });
    } catch (failure) {
      if (!abort.signal.aborted && epoch === navigationEpoch.current) setError(failure instanceof Error ? failure.message : "Continuation stopped.");
    } finally { if (epoch === navigationEpoch.current) setLocating(false); }
  };
  useEffect(() => {
    setIndexedParts([]);
    if (!playback || playback.manifest.sessionId !== sourceId) return;
    const abort = new AbortController();
    const source = { sessionId: sourceId, recordingCreatedAt: playback.manifest.createdAt,
      questionFingerprint: context.questionFingerprint };
    void loadReplayRevisions(sourceId).then(revisions =>
      indexReplayParts(playback, source, revisions, abort.signal)).then(result => {
        if (!abort.signal.aborted) setIndexedParts(result.parts);
      }).catch(() => { /* Current-part playback remains available if indexing fails. */ });
    return () => abort.abort();
  }, [playback, sourceId, context.questionFingerprint]);
  const navigate = async (entry: ReplayRevision) => {
    cancelNavigation();
    if (!playback) return;
    const epoch = navigationEpoch.current;
    const abort = new AbortController(); navigationAbort.current = abort;
    setLocating(true); setError(null);
    setContinuationNotice("");
    try {
      const prepared = await prepareSavedReplay(entry, { sessionId: sourceId,
        recordingCreatedAt: playback.manifest.createdAt, questionFingerprint: context.questionFingerprint }, abort.signal,
        { loadRecording: loadLocalRecordingPlayback, loadRevisions: loadReplayRevisions });
      if (abort.signal.aborted || epoch !== navigationEpoch.current) return;
      setPart(prepared.part);
      setNavigation({ request: prepared.request, part: prepared.part, id: epoch, wordId: context.selectedWordId });
    } catch (failure) {
      if (!abort.signal.aborted && epoch === navigationEpoch.current) setError(failure instanceof Error ? failure.message : "Replay could not be prepared.");
    } finally {
      if (epoch === navigationEpoch.current) setLocating(false);
    }
  };
  const tapSource = useRef<{request: NonNullable<RecitationReplayContext["playbackRequest"]>; sourceId: string} | null>(null);
  useEffect(() => {
    const request = context.playbackRequest;
    if (!open || !request || request.wordId !== context.selectedWordId) { cancelNavigation(); return; }
    if (tapSource.current?.request !== request) tapSource.current = {request, sourceId};
    // Changing recording source is not a new word-tap instruction.
    if (tapSource.current.sourceId !== sourceId) return;
    cancelNavigation();
    const abort = new AbortController(); navigationAbort.current = abort;
    const epoch = navigationEpoch.current;
    setLocating(true); setError(null); setContinuationNotice("");
    void (async () => {
      const saved = await loadLocalRecordingPlayback(sourceId);
      if (!saved) throw Error("Recording is not on this device.");
      const source = {sessionId: sourceId, recordingCreatedAt: saved.manifest.createdAt,
        questionFingerprint: context.questionFingerprint};
      const revisions = await loadReplayRevisions(sourceId);
      const index = await indexReplayParts(saved, source, revisions, abort.signal);
      if (abort.signal.aborted || epoch !== navigationEpoch.current) return;
      const decision = wordTapDecision(resolveWordReplay(revisions, source, index.parts, context.words, request.wordId));
      if (decision.kind === "play") {
        const prepared = await prepareSavedReplay(decision.entry, source, abort.signal,
          {loadRecording: loadLocalRecordingPlayback, loadRevisions: loadReplayRevisions});
        if (abort.signal.aborted || epoch !== navigationEpoch.current) return;
        setPart(prepared.part);
        setNavigation({request: prepared.request, part: prepared.part, id: epoch, wordId: request.wordId});
      }
      // The existing occurrence/preview controls explain non-autoplay outcomes.
      // Do not repeat the same explanation above those controls.
    })().catch(failure => {
      if (!abort.signal.aborted && epoch === navigationEpoch.current) setError(failure instanceof Error ? failure.message : "Replay unavailable.");
    }).finally(() => { if (epoch === navigationEpoch.current) setLocating(false); });
    return () => { abort.abort(); };
  }, [context.playbackRequest, sourceId, open]);
  const sourceKey = sources.map((source) => source.sessionId).join("|");
  useEffect(() => {
    setSourceId((current) => sources.some((source) => source.sessionId === current)
      ? current : sources[0]?.sessionId ?? "");
  }, [sourceKey]);
  useEffect(() => {
    if (context.requestedSessionId && sources.some((source) => source.sessionId === context.requestedSessionId)) {
      setSourceId(context.requestedSessionId);
    }
  }, [context.requestedSessionId, sourceKey]);
  useEffect(() => {
    let cancelled = false;
    setPlayback(null); setError(null); setPart(0);
    setLoadSourceId(sourceId);
    setLoadStatus(open && sourceId ? "loading" : "unavailable");
    if (open && sourceId) void loadLocalRecordingPlayback(sourceId).then((value) => {
      if (!cancelled) { setPlayback(value); setLoadStatus(value ? "ready" : "unavailable"); }
    }).catch(() => { if (!cancelled) { setLoadStatus("failed"); setError("Saved audio could not be opened on this device."); } });
    return () => { cancelled = true; };
  }, [sourceId, open, retryLoad]);
  const currentPlayback = playback?.manifest.sessionId === sourceId ? playback : null;
  const segment = currentPlayback?.segments[part];
  const unavailable = !segment || !currentPlayback || !["ready", "paused", "interrupted"].includes(currentPlayback.manifest.state);
  const sourceLoading = loadStatus === "loading" || Boolean(sourceId && sourceId !== loadSourceId);
  useEffect(() => {
    context.onAvailabilityChange?.(sourceLoading ? "loading" : loadStatus === "ready" && unavailable ? "unavailable" : loadStatus);
  }, [sourceLoading, loadStatus, unavailable, context.onAvailabilityChange]);
  return <>
    {!open && fallback}
    <section className="replay-review" aria-label="Word replay review">
      {!embedded && <div className="replay-review-heading">
        <div><span>Practice · on this device</span><h3>Ayah & word replay</h3></div>
        <button type="button" className="btn-secondary" aria-expanded={open}
          onClick={() => setOpen((value) => !value)}>{open ? "Close word review" : "Review words"}</button>
      </div>}
      {open && <>
        <div className="replay-source-row">
          {embedded && sources.length === 1 ? <small>{sources[0].label}</small> : <label>Recording source<select aria-label="Word replay recording source" value={sourceId}
            onChange={(event) => { cancelNavigation(); setSourceId(event.target.value); }}>
            {sources.map((source) => <option key={source.sessionId} value={source.sessionId}>{source.label}</option>)}
          </select></label>}
          {playback && playback.segments.length > 1 && <label>Recording part<select aria-label="Recording part"
            value={part} onChange={(event) => { cancelNavigation(); setPart(Number(event.target.value)); }}>
            {playback.segments.map((item, index) => <option key={item.index} value={index}>Part {item.index + 1}</option>)}
          </select></label>}
        </div>
        {locating && <ReplayTransportSlot target={context.feedbackTarget}><p className="replay-direct" role="status">Preparing replay… <button type="button" className="btn-secondary" onClick={cancelNavigation}>Cancel playback</button></p></ReplayTransportSlot>}
        {continuationNotice && <p role="status">{continuationNotice}</p>}
        {!unavailable && error && <p role="alert">{error}</p>}
        {sourceLoading ? <p role="status">Loading recording…</p> : loadStatus === "failed" ? <p role="alert">{error} <button type="button" className="btn-secondary" onClick={() => setRetryLoad(value => value + 1)}>Retry recording</button></p> : unavailable ? <p role="status">{error ?? (embedded ? "Recording unavailable on this device. Score imports do not include audio." : "No finished recording part is available for this source on this device. Record a Practice recitation first.")}</p>
          : segment.integrityError ? <p role="alert">{segment.integrityError} Other complete parts can still be reviewed.</p>
          : <ReviewSegment key={`${sourceId}:${currentPlayback.manifest.createdAt}:${segment.index}:${context.questionFingerprint}`}
            playback={currentPlayback} part={part} context={context} embedded={embedded} sourceLabel={sources.find(source => source.sessionId === sourceId)?.label ?? "Recording source"}
            indexedParts={indexedParts} navigation={navigation} onNavigate={navigate} onCancelNavigation={() => { cancelNavigation(); setContinuationNotice(""); }}
            locating={locating} onContinue={continueRecording} />}
      </>}
    </section>
  </>;
}

function ReviewSegment({ playback, part, context, embedded = false, indexedParts, navigation, onNavigate, onCancelNavigation, locating, onContinue, sourceLabel }: {
  sourceLabel: string;
  playback: LocalRecordingPlayback; part: number; context: RecitationReplayContext;
  embedded?: boolean;
  indexedParts: ReplayPartEvidence[];
  navigation: PreparedNavigation | null;
  onNavigate: (entry: ReplayRevision) => Promise<void>;
  onCancelNavigation: () => void;
  locating: boolean;
  onContinue: (media: ReplayMediaIdentity) => Promise<void>;
}) {
  const segment = playback.segments[part];
  const [decoded, setDecoded] = useState<DecodedReplayAudio | null>(null);
  const [transportError, setTransportError] = useState<string | null>(null);
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [conflict, setConflict] = useState(false);
  const [revisions, setRevisions] = useState<ReplayRevision[]>([]);
  const [position, setPosition] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [starting, setStarting] = useState(false);
  const [ready, setReady] = useState(false);
  const [kind, setKind] = useState<"word" | "ayah">("word");
  const [occurrenceId, setOccurrenceId] = useState("");
  const [directSelection, setDirectSelection] = useState<{ wordId: string | null; id: string }>({ wordId: null, id: "" });
  const [answeredRequest, setAnsweredRequest] = useState<number | null>(null);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [toolsTransport, setToolsTransport] = useState<HTMLDivElement | null>(null);
  const [timingDirty, setTimingDirty] = useState(false);
  const draftBeforeEdit = useRef({ start: "", end: "" });
  const [start, setStart] = useState("0.00");
  const [end, setEnd] = useState("1.00");
  const [repeat, setRepeat] = useState(false);
  const [follow, setFollow] = useState(true);
  const [busy, setBusy] = useState(false);
  const [analysisStatus, setAnalysisStatus] = useState("");
  const audioRef = useRef<HTMLAudioElement>(null);
  const workerRef = useRef<Worker | null>(null);
  const aliveRef = useRef(true);
  const analysisEpoch = useRef(0);
  const stopAtRef = useRef<number | null>(null);
  const loopStartRef = useRef(0);
  const pendingPlayRef = useRef(false);
  const playWantedRef = useRef(false);
  const playAttemptRef = useRef(0);
  const continuousRef = useRef(false);
  useEffect(() => {
    if (context.playbackRequest === undefined) return;
    setDirectSelection({ wordId: null, id: "" });
    playWantedRef.current = false;
    setStarting(false);
    audioRef.current?.pause(); pendingPlayRef.current = false; stopAtRef.current = null;
    continuousRef.current = false;
    return () => { playWantedRef.current = false; pendingPlayRef.current = false; audioRef.current?.pause(); };
  }, [context.playbackRequest, context.wordReplayEnabled]);
  const focusRef = useRef(context.onPlaybackWord);
  focusRef.current = context.onPlaybackWord;
  const duration = decoded ? decoded.samples.length / decoded.sampleRate : 0;
  const media = useMemo<ReplayMediaIdentity | null>(() => decoded ? {
    sessionId: playback.manifest.sessionId, recordingCreatedAt: playback.manifest.createdAt,
    segmentIndex: segment.index, sha256: decoded.sha256, sampleRate: decoded.sampleRate,
    sampleCount: decoded.samples.length, questionFingerprint: context.questionFingerprint,
  } : null, [decoded, playback.manifest.sessionId, playback.manifest.createdAt, segment.index, context.questionFingerprint]);
  const selectedWord = context.words.find((word) => word.wordId === context.selectedWordId) ?? (embedded ? undefined : context.words[0]);
  const target = useMemo<ReplayTarget | null>(() => selectedWord ? {
    kind,
    wordIds: kind === "word" ? [selectedWord.wordId] : context.words.filter((word) =>
      word.surah === selectedWord.surah && word.ayah === selectedWord.ayah).map((word) => word.wordId),
    label: kind === "word" ? selectedWord.text
      : `${selectedWord.surah}:${selectedWord.ayah ?? "basmalah"} · recorded span`,
  } : null, [selectedWord, kind, context.words]);
  const matchingRevisions = useMemo(() => media ? revisions.filter((entry) => sameReplayMedia(entry.media, media)) : [], [media, revisions]);
  const occurrences = useMemo(() => currentReplayOccurrences(matchingRevisions).filter((entry) =>
    target && replayTargetMatches(entry.target, target)), [matchingRevisions, target]);
  const selectedOccurrence = occurrences.find((entry) => entry.occurrenceId === occurrenceId);
  const directChoices = useMemo(() => {
    if (!media) return wordReplayChoices(revisions, media, context.words, context.selectedWordId);
    const all = resolveWordReplay(revisions, media,
      [...indexedParts.filter(item => item.index !== media.segmentIndex), { index: media.segmentIndex, media }],
      context.words, context.selectedWordId ?? "");
    const entries = [...all.reviewedWords, ...all.approximateWords].sort((a,b) => a.media.segmentIndex-b.media.segmentIndex || a.startSample-b.startSample);
    return entries.length ? {kind:"word" as const,entries} : {kind:all.reviewedAyahSpans.length ? "ayah" as const : "none" as const,entries:all.reviewedAyahSpans};
  }, [revisions, media, indexedParts, context.words, context.selectedWordId]);
  const directChoice = directChoices.entries.length === 1 ? directChoices.entries[0]
    : directChoices.entries.find(entry => directSelection.wordId === context.selectedWordId && entry.id === directSelection.id);
  useEffect(() => {
    if (!embedded) return;
    playWantedRef.current = false;
    audioRef.current?.pause(); pendingPlayRef.current = false; stopAtRef.current = null;
  }, [context.selectedWordId, embedded]);

  useEffect(() => {
    aliveRef.current = true;
    let cancelled = false;
    let objectUrl = "";
    void Promise.all([decodeReplayAudio(segment.blob), loadReplayRevisions(playback.manifest.sessionId)])
      .then(([audio, saved]) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(audio.blob);
        setDecoded(audio); setUrl(objectUrl); setRevisions(saved);
      }).catch((failure: unknown) => {
        if (!cancelled) setError(failure instanceof Error ? failure.message : "This recording part could not be decoded. Close word review to use full playback.");
      });
    return () => {
      cancelled = true; aliveRef.current = false; analysisEpoch.current++;
      workerRef.current?.terminate(); workerRef.current = null;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      focusRef.current(null);
    };
  }, [segment.blob, playback.manifest.sessionId]);

  useEffect(() => {
    const audio = audioRef.current;
    const pauseWhenHidden = () => {
      if (document.hidden) { playWantedRef.current = false; pendingPlayRef.current = false; audio?.pause(); }
    };
    document.addEventListener("visibilitychange", pauseWhenHidden);
    return () => {
      document.removeEventListener("visibilitychange", pauseWhenHidden);
      pendingPlayRef.current = false;
      playWantedRef.current = false;
      audio?.pause();
      audio?.removeAttribute("src");
      audio?.load();
    };
  }, [url]);

  // A Quran selection never silently chooses one of several repeated occurrences.
  const targetKey = `${target?.kind}:${target?.wordIds.join("|")}`;
  const selectionRef = useRef(targetKey);
  selectionRef.current = targetKey;
  useEffect(() => {
    setOccurrenceId(""); setNotice(""); setConflict(false); setError(null);
    playWantedRef.current = false;
    setStarting(false);
    continuousRef.current = false;
    audioRef.current?.pause(); pendingPlayRef.current = false; stopAtRef.current = null;
    const at = audioRef.current?.currentTime ?? 0;
    setStart(at.toFixed(2)); setEnd(Math.min(duration, at + 1).toFixed(2));
  }, [targetKey, duration]);

  const play = () => {
    const audio = audioRef.current;
    if (!audio || !ready) return;
    playWantedRef.current = true;
    setStarting(true);
    const attempt = ++playAttemptRef.current;
    audio.defaultMuted = false; audio.muted = false; audio.volume = 1;
    void audio.play().catch(() => {
      if (aliveRef.current && playWantedRef.current && playAttemptRef.current === attempt) {
        playWantedRef.current = false;
        setStarting(false);
        setError("Playback could not start. Press Play again.");
      }
    });
  };
  const seek = (seconds: number, autoplay = false) => {
    const audio = audioRef.current;
    if (!audio || !ready || !Number.isFinite(seconds)) return;
    const bounded = Math.max(0, Math.min(duration, seconds));
    pendingPlayRef.current = autoplay;
    if (Math.abs(audio.currentTime - bounded) < 0.001) {
      pendingPlayRef.current = false;
      if (autoplay) play();
    } else {
      audio.currentTime = bounded;
    }
    setPosition(bounded);
  };
  const consumedNavigation = useRef<number | null>(null);
  useEffect(() => {
    if (!ready || !media || !navigation || navigation.wordId !== context.selectedWordId ||
      consumedNavigation.current === navigation.id || !sameReplayMedia(media, navigation.request.media)) return;
    consumedNavigation.current = navigation.id;
    if (navigation.request.revisionId !== "continuation") {
      setDirectSelection({wordId: context.selectedWordId, id: navigation.request.revisionId});
    }
    continuousRef.current = true;
    stopAtRef.current = null;
    seek(navigation.request.startSeconds, true);
  }, [ready, media, navigation, context.selectedWordId]);
  const startNumber = Number(start);
  const endNumber = Number(end);
  const validInterval = start.trim() !== "" && end.trim() !== "" &&
    Number.isFinite(startNumber) && Number.isFinite(endNumber) &&
    startNumber >= 0 && endNumber > startNumber && endNumber <= duration;
  const preview = () => {
    if (!validInterval) return;
    onCancelNavigation(); continuousRef.current = false;
    loopStartRef.current = Math.max(0, startNumber - 0.4);
    stopAtRef.current = Math.min(duration, endNumber + 0.4);
    seek(loopStartRef.current, true);
  };

  useEffect(() => {
    if (!playing) { focusRef.current(null); return; }
    let frame = 0;
    const tick = () => {
      const audio = audioRef.current;
      if (!audio) return;
      if (stopAtRef.current !== null && audio.currentTime >= stopAtRef.current) {
        if (repeat) audio.currentTime = loopStartRef.current;
        else { audio.pause(); stopAtRef.current = null; }
      }
      focusRef.current(follow && media ? replayWordAt(matchingRevisions,
        Math.floor(audio.currentTime * media.sampleRate)) : null);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(frame); focusRef.current(null); };
  }, [playing, repeat, follow, media, matchingRevisions]);

  const selectOccurrence = (id: string) => {
    audioRef.current?.pause(); pendingPlayRef.current = false; stopAtRef.current = null;
    setOccurrenceId(id); setNotice(""); setConflict(false); setError(null);
    const occurrence = occurrences.find((entry) => entry.occurrenceId === id);
    if (occurrence && media) {
      setStart((occurrence.startSample / media.sampleRate).toFixed(3));
      setEnd((occurrence.endSample / media.sampleRate).toFixed(3));
      seek(occurrence.startSample / media.sampleRate);
    }
  };
  useEffect(() => {
    if (!embedded && ready && occurrences.length === 1 && occurrences[0].status === "reviewed") {
      selectOccurrence(occurrences[0].occurrenceId);
    }
    // Selection changes may seek a single reviewed occurrence; saving/reanalysis
    // must not replace a draft or choose between repetitions behind the reviewer.
  }, [targetKey, ready]);
  const save = async (remove = false) => {
    if (!target || !media || !validInterval || busy || conflict) return;
    const selection = targetKey;
    setBusy(true); setError(null); setNotice("");
    const previous = selectedOccurrence;
    const entry: ReplayRevision = {
      version: 1, id: crypto.randomUUID(), occurrenceId: previous?.occurrenceId ?? crypto.randomUUID(),
      revision: (previous?.revision ?? 0) + 1, media, target,
      startSample: Math.max(0, Math.round(startNumber * media.sampleRate)),
      endSample: Math.min(media.sampleCount, Math.round(endNumber * media.sampleRate)),
      status: remove ? "removed" : "reviewed", method: previous?.method ?? "manual",
      createdAt: new Date().toISOString(), reviewer: "local-reviewer", ...(previous?.model ? { model: previous.model } : {}),
    };
    try {
      await appendReplayRevision(entry);
      if (!aliveRef.current) return;
      setRevisions((current) => [...current, entry]);
      if (selectionRef.current === selection) {
        setOccurrenceId(remove ? "" : entry.occurrenceId);
        setTimingDirty(false);
        draftBeforeEdit.current = { start, end };
        setNotice(remove ? "Timing removed; its revision history is retained." : "Timing saved as reviewed on this device.");
      }
    } catch (failure) {
      if (aliveRef.current && selectionRef.current === selection) {
        setConflict(failure instanceof ReplayRevisionConflict);
        setError(replaySaveFailure(failure));
      }
    } finally { if (aliveRef.current) setBusy(false); }
  };

  const reloadTimings = async () => {
    if (!media || busy) return;
    const selection = targetKey;
    setBusy(true);
    try {
      const saved = await loadReplayRevisions(media.sessionId);
      if (!aliveRef.current) return;
      setRevisions(saved);
      if (selectionRef.current !== selection) return;
      const latest = currentReplayOccurrences(saved.filter((entry) => sameReplayMedia(entry.media, media)))
        .find((entry) => entry.occurrenceId === occurrenceId);
      setConflict(false); setError(null);
      setNotice(latest
        ? `Latest saved timing: ${formatReplayTime(latest.startSample / media.sampleRate)}–${formatReplayTime(latest.endSample / media.sampleRate)} (revision ${latest.revision}). Your draft is kept below; listen before saving a correction.`
        : "This timing was removed in another view. Your draft is kept; saving it will create a new occurrence.");
    } catch {
      if (aliveRef.current && selectionRef.current === selection) setError("Latest timings could not be loaded. Your draft is still here; try again.");
    } finally { if (aliveRef.current) setBusy(false); }
  };

  const cancelAnalysis = () => {
    analysisEpoch.current++; workerRef.current?.terminate(); workerRef.current = null;
    setAnalysisStatus("");
  };
  const analyze = async () => {
    if (!decoded || !media || analysisStatus) return;
    const epoch = ++analysisEpoch.current;
    const current = () => aliveRef.current && epoch === analysisEpoch.current;
    const offset = Math.max(0, Math.min(position, duration - 1));
    const count = Math.min(20, duration - offset);
    setAnalysisStatus("Preparing the next 20 seconds…"); setError(null); setNotice("");
    try {
      // Browser resampling retains fractional phase across the entire window.
      const inputStart = Math.floor(offset * decoded.sampleRate);
      const inputEnd = Math.min(decoded.samples.length, inputStart + Math.floor(count * decoded.sampleRate));
      const sampleWindow = decoded.samples.slice(inputStart, inputEnd);
      const render = new OfflineAudioContext(1, Math.round(sampleWindow.length / decoded.sampleRate * 16000), 16000);
      const buffer = render.createBuffer(1, sampleWindow.length, decoded.sampleRate);
      buffer.copyToChannel(sampleWindow, 0);
      const source = render.createBufferSource(); source.buffer = buffer; source.connect(render.destination); source.start();
      const resampled = await render.startRendering();
      if (!current()) return;
      const samples = new Float32Array(resampled.getChannelData(0));
      const worker = new Worker(new URL("../workers/tilawaPrototype.worker.ts", import.meta.url), { type: "module" });
      workerRef.current = worker;
      worker.onerror = () => {
        if (current()) { setError("The local analysis worker stopped. Manual timing is still available."); cancelAnalysis(); }
      };
      worker.onmessage = async (event: MessageEvent) => {
        if (!current()) return;
        const message = event.data;
        if (message.type === "loading_status") setAnalysisStatus(message.message);
        if (message.type === "loading") setAnalysisStatus(`Downloading model · ${message.percent}%`);
        if (message.type === "error") { setError(message.message); cancelAnalysis(); }
        if (message.type !== "replay_analysis") return;
        worker.terminate(); workerRef.current = null;
        const suggestions = message.suggestions as ReplaySuggestion[];
        let savedCount = 0;
        try {
          for (const suggestion of suggestions) {
            if (!current()) return;
            // Joined-token groups need explicit manual boundaries for each printed word.
            if (suggestion.wordIds.length !== 1) continue;
            const word = context.words.find((item) => item.wordId === suggestion.wordIds[0]);
            if (!word) continue;
            const startSample = Math.max(0, inputStart + Math.floor(suggestion.startSeconds * media.sampleRate));
            const endSample = Math.min(media.sampleCount, inputStart + Math.ceil(suggestion.endSeconds * media.sampleRate));
            const existing = await loadReplayRevisions(media.sessionId);
            if (!current()) return;
            if (currentReplayOccurrences(existing).some((entry) => sameReplayMedia(entry.media, media) &&
              entry.target.kind === "word" && entry.target.wordIds.includes(word.wordId) &&
              entry.startSample < endSample && entry.endSample > startSample)) continue;
            const entry: ReplayRevision = { version: 1, id: crypto.randomUUID(), occurrenceId: crypto.randomUUID(), revision: 1,
              media, target: { kind: "word", wordIds: [word.wordId], label: word.text }, startSample, endSample,
              status: "suggested", method: "ctc-greedy-anchor-v1", reviewer: null, createdAt: new Date().toISOString(),
              model: { modelHash: message.modelHash, vocabHash: message.vocabHash, frameMapping: "window-scaled-ctc-frames-v1-unverified" } };
            await appendReplayRevision(entry);
            savedCount++;
            if (current()) setRevisions((items) => [...items, entry]);
          }
          if (current()) setNotice(`${savedCount} suggested word positions saved. Select a word and occurrence, then listen and correct its boundaries before marking it reviewed.`);
        } catch (failure) {
          if (current()) setError(replaySaveFailure(failure, savedCount));
        } finally { if (current()) setAnalysisStatus(""); }
      };
      setAnalysisStatus("Loading the on-device model…");
      worker.postMessage({ type: "analyze_replay", samples, allowedWordIds: context.words.map((word) => word.wordId) }, [samples.buffer]);
    } catch (failure) {
      if (current()) { setError(failure instanceof Error ? failure.message : "Analysis could not start."); cancelAnalysis(); }
    }
  };

  if (!decoded) return <p role={error ? "alert" : "status"}>{error ?? "Preparing recording timing…"}</p>;
  const pauseTools = () => {
    onCancelNavigation(); playWantedRef.current = false; pendingPlayRef.current = false;
    stopAtRef.current = null; continuousRef.current = false; audioRef.current?.pause(); setStarting(false);
  };
  const tappedReviewedWord = Boolean(context.playbackRequest && directChoice?.status === "reviewed" && directChoices.kind === "word");
  return <div className="replay-segment">
    <ReplayTransportSlot target={toolsOpen ? toolsTransport : context.transportTarget}><div className="replay-transport">
      <button type="button" className="session-recording-play" disabled={!ready}
        aria-label={embedded ? (playing || locating || starting ? "Pause recording" : "Play recording") : (playing || locating || starting ? "Pause word replay" : "Play word replay")}
        onClick={() => { onCancelNavigation(); stopAtRef.current = null; pendingPlayRef.current = false;
          if (playing || locating || playWantedRef.current) { playWantedRef.current = false; setStarting(false); audioRef.current?.pause(); } else play(); }}>
        <Icon name={playing || locating || starting ? "pause" : "play"} size={18} />
      </button>
      {context.playbackRequest !== undefined && <button type="button" className="session-recording-play"
        disabled={!ready} aria-label="Back 3 seconds in this recording part"
        onClick={() => {
          onCancelNavigation(); pendingPlayRef.current = false; stopAtRef.current = null;
          seek(Math.max(0, (audioRef.current?.currentTime ?? position) - 3));
        }}>−3s</button>}
        <input type="range" min="0" max={duration} step="0.01" value={position} disabled={!ready}
          onKeyDown={event => {
            if (!embedded) return;
            const delta = {ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1, PageUp: 5, PageDown: -5}[event.key];
            if (delta === undefined && event.key !== "Home" && event.key !== "End") return;
            event.preventDefault(); onCancelNavigation(); stopAtRef.current = null;
            seek(event.key === "Home" ? 0 : event.key === "End" ? duration : Math.max(0, Math.min(duration, position + (delta ?? 0))));
          }}
        aria-label="Word replay position" aria-valuetext={`${formatReplayTime(position)} of ${formatReplayTime(duration)}`} onChange={(event) => { onCancelNavigation(); stopAtRef.current = null; seek(Number(event.target.value)); }} />
        <output className="t-num" aria-live="off">{formatReplayTime(position)} / {formatReplayTime(duration)}</output>
    </div></ReplayTransportSlot>
    {embedded && !toolsOpen && context.selectedWordId && context.playbackRequest !== null && !locating && <ReplayTransportSlot target={tappedReviewedWord || answeredRequest === context.playbackRequest?.id ? null : context.feedbackTarget}>
      <section className="replay-direct" aria-label="Selected word replay"
        onKeyDown={event => { if (event.key === "Escape") { event.stopPropagation(); onCancelNavigation(); context.onCloseWordFeedback?.(); } }}>
        <div className="replay-feedback-heading"><bdi dir="rtl">{selectedWord?.text}</bdi>
          {context.onCloseWordFeedback && <button type="button" className="btn-ghost" aria-label="Close word replay choices"
            onClick={() => { onCancelNavigation(); context.onCloseWordFeedback?.(); }}>Close</button>}</div>
        {directChoices.entries.length > 1 ? <>
          <p>Choose a recorded occurrence.</p>
          <div className="replay-occurrence-choices">{directChoices.entries.map((entry, i) => <button key={entry.id}
            type="button" className="btn-secondary" disabled={!ready || busy}
            onClick={() => {
              setAnsweredRequest(context.playbackRequest?.id ?? null);
              setDirectSelection({ wordId: context.selectedWordId, id: entry.id });
              playWantedRef.current = false; pendingPlayRef.current = false; audioRef.current?.pause();
              void onNavigate(entry);
            }}>Occurrence {i + 1} · Part {entry.media.segmentIndex + 1} · {formatReplayTime(entry.startSample / entry.media.sampleRate)}
              {entry.status === "suggested" ? " · Approximate preview" : ""}</button>)}</div>
        </> : directChoice ? <>
          {tappedReviewedWord ? <p>Saved position · starts 0.5s earlier and continues.</p> : <>
            <p>{directChoices.kind === "ayah" ? "Saved ayah span, not an exact word position." : "Approximate position. Listen before relying on it."}</p>
            <button type="button" className="btn-primary" disabled={!ready || busy} onClick={() => {
              if (!media) return;
              setAnsweredRequest(context.playbackRequest?.id ?? null);
              playWantedRef.current = false; pendingPlayRef.current = false; audioRef.current?.pause();
              void onNavigate(directChoice);
            }}>{directChoices.kind === "ayah" ? "Play from recorded ayah" : "Preview approximate position"}</button>
          </>}
        </> : <p>No saved position. Use Play and the timeline.</p>}
      </section>
    </ReplayTransportSlot>}
    <audio ref={audioRef} src={url} preload="auto" playsInline
      onLoadedMetadata={(event) => {
        const actual = event.currentTarget.duration;
        const agrees = Number.isFinite(actual) && Math.abs(actual - duration) <= 0.1;
        setReady(agrees);
        if (!agrees) setTransportError("The player clock does not match the decoded recording. Word timing is disabled.");
      }}
      onError={() => { setReady(false); setTransportError("This browser could not play the review audio. Close word review to use full playback."); }}
      onSeeked={() => { if (pendingPlayRef.current) { pendingPlayRef.current = false; play(); } }}
      onPlay={event => {
        setStarting(false);
        if (!playWantedRef.current) { event.currentTarget.pause(); return; }
        setError(current => current === "Playback could not start. Press Play again." ? null : current);
        setPlaying(true);
      }} onPause={() => setPlaying(false)}
      onTimeUpdate={(event) => setPosition(event.currentTarget.currentTime)}
      onEnded={() => {
        playWantedRef.current = false;
        if (repeat && stopAtRef.current !== null) seek(loopStartRef.current, true);
        else {
          setPlaying(false);
          if (continuousRef.current && media) { continuousRef.current = false; void onContinue(media); }
        }
      }} />
    {embedded && context.playbackRequest === undefined && <p className="replay-help">{context.selectedWordId ? "Selected word · open Timing tools for saved intervals." : "Select a word to inspect its timing."}</p>}
    {embedded && !toolsOpen && error && <p role="alert" className="replay-error">{error}</p>}
    {embedded && !toolsOpen && transportError && <p role="alert" className="replay-error">{transportError}</p>}
    <ReplayToolsPanel enabled={embedded} open={toolsOpen} dirty={timingDirty} busy={busy}
      onTransportTarget={setToolsTransport}
      onOpen={() => { pauseTools(); context.onCloseWordFeedback?.(); draftBeforeEdit.current = { start, end }; setTimingDirty(false); setToolsOpen(true); }}
      onClose={() => { pauseTools(); cancelAnalysis(); setToolsOpen(false); }}
      onDiscard={() => { setStart(draftBeforeEdit.current.start); setEnd(draftBeforeEdit.current.end); setTimingDirty(false); }}>
    <p className="replay-help">{sourceLabel} · Part {segment.index + 1}. Adjusting timing does not change judge marks.</p>
    {timingDirty && <p role="status">Unsaved boundaries. Save or discard before changing the word or occurrence.
      <button type="button" className="btn-secondary" disabled={busy} onClick={() => { setStart(draftBeforeEdit.current.start); setEnd(draftBeforeEdit.current.end); setTimingDirty(false); }}>Discard boundary edits</button></p>}
    <div className="replay-choice-row">
      <label>Word<select aria-label="Replay word" value={selectedWord?.wordId ?? ""} disabled={busy || timingDirty}
        onChange={(event) => { pauseTools(); (context.onTimingWordSelect ?? context.onWordSelect)(event.target.value); }}>
        {embedded && <option value="">Select a word in the passage</option>}
        {context.words.map((word) => <option key={word.wordId} value={word.wordId}>
          {word.surah}:{word.ayah ?? "b"} · {Number(word.wordId.split(".")[2]) + 1} · {word.text}
        </option>)}
      </select></label>
      <label>Replay scope<select aria-label="Replay scope" value={kind} disabled={busy || timingDirty} onChange={(event) => setKind(event.target.value as "word" | "ayah")}>
        <option value="word">This kalimah</option><option value="ayah">This ayah in the recorded span</option>
      </select></label>
    </div>
    <label className="replay-occurrence">Occurrence<select aria-label="Replay occurrence" value={occurrenceId} disabled={busy || timingDirty}
      onChange={(event) => selectOccurrence(event.target.value)}>
      <option value="">New timing · set boundaries below</option>
      {occurrences.map((entry, index) => <option key={entry.occurrenceId} value={entry.occurrenceId}>
        {index + 1} · {formatReplayTime(entry.startSample / entry.media.sampleRate)} · {entry.status === "reviewed" ? "Reviewed" : "Needs review"}
      </option>)}
    </select></label>
    <div className="replay-interval-heading">
      <strong dir={kind === "word" ? "rtl" : undefined}>{target?.label}</strong>
      <span>{selectedOccurrence ? selectedOccurrence.status === "reviewed" ? `Reviewed · revision ${selectedOccurrence.revision}` : "Suggested · needs review" : "No saved interval selected"}</span>
    </div>
    <div className="replay-boundaries">
      <label>Start (seconds)<input type="number" aria-label="Replay start seconds" min="0" max={duration} step="0.01" value={start} disabled={busy}
        onChange={(event) => { if (!timingDirty) draftBeforeEdit.current = { start, end }; setTimingDirty(true); setStart(event.target.value); }} />
        <button type="button" disabled={!ready || busy} onClick={() => { if (!timingDirty) draftBeforeEdit.current = { start, end }; setTimingDirty(true); setStart((audioRef.current?.currentTime ?? 0).toFixed(3)); }}>Set start here</button>
      </label>
      <label>End (seconds)<input type="number" aria-label="Replay end seconds" min="0" max={duration} step="0.01" value={end} disabled={busy}
        onChange={(event) => { if (!timingDirty) draftBeforeEdit.current = { start, end }; setTimingDirty(true); setEnd(event.target.value); }} />
        <button type="button" disabled={!ready || busy} onClick={() => { if (!timingDirty) draftBeforeEdit.current = { start, end }; setTimingDirty(true); setEnd((audioRef.current?.currentTime ?? 0).toFixed(3)); }}>Set end here</button>
      </label>
    </div>
    <div className="replay-actions">
      <button type="button" className="btn-secondary" disabled={!ready || !validInterval} onClick={preview}>Preview short interval</button>
      <button type="button" className="btn-primary" disabled={!ready || !validInterval || !target || busy || conflict}
        onClick={() => void save()}>{busy ? "Saving…" : "Save as reviewed"}</button>
      <label><input type="checkbox" checked={repeat} onChange={(event) => setRepeat(event.target.checked)} /> Repeat</label>
      <label><input type="checkbox" checked={follow} onChange={(event) => setFollow(event.target.checked)} /> Follow reviewed words</label>
    </div>
    <p className="replay-help">Listen before saving. Replay includes 0.4 seconds of context. Repeated words need separate occurrences; a skipped word has no spoken interval.</p>
    {selectedOccurrence && <button type="button" className="replay-remove" disabled={busy || conflict} onClick={() => void save(true)}>Remove this timing</button>}
    <details className="replay-analysis"><summary>Experimental word suggestions</summary>
      <p>Analyze up to 20 seconds from the playhead on this device. The first use downloads an 88 MB model. Suggested positions need listening and boundary correction; they never change marks.</p>
      {analysisStatus ? <div className="replay-actions"><span role="status">{analysisStatus}</span><button type="button" className="btn-secondary" onClick={cancelAnalysis}>Cancel analysis</button></div>
        : <button type="button" className="btn-secondary" disabled={!ready || duration < 1 || context.words.length === 0}
          onClick={() => void analyze()}>Suggest word positions</button>}
      <span>{currentReplayOccurrences(matchingRevisions).filter((entry) => entry.status === "suggested").length} positions need review in this part</span>
    </details>
    <p className="replay-help">Times belong to part {segment.index + 1} of this recording. Original audio and judging records are preserved. Review history stays on this device.</p>
    {notice && <p className="replay-notice" role="status">{notice}</p>}
    {error && <p role="alert" className="replay-error">{error}</p>}
    {transportError && <p role="alert" className="replay-error">{transportError}</p>}
    {conflict && <button type="button" className="btn-secondary" disabled={busy}
      onClick={() => void reloadTimings()}>Load latest timing · keep my draft</button>}
    </ReplayToolsPanel>
  </div>;
}

function ReplayTransportSlot({ target, children }: { target?: HTMLElement | null; children: ReactNode }) {
  return target ? createPortal(children, target) : children;
}

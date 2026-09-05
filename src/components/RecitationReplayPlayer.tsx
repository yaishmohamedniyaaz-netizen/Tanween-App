import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { SessionRecordingSource } from "./SessionRecordingPlayer.tsx";
import { appendReplayRevision, loadLocalRecordingPlayback, loadReplayRevisions,
  type LocalRecordingPlayback } from "../lib/recitationAudioStorage.ts";
import { decodeReplayAudio, type DecodedReplayAudio } from "../lib/decodeReplayAudio.ts";
import { currentReplayOccurrences, formatReplayTime, replayTargetMatches, replayWordAt,
  sameReplayMedia, type ReplayMediaIdentity, type ReplayRevision, type ReplayTarget,
  type ReplayWord } from "../lib/recitationReplay.ts";
import type { ReplaySuggestion } from "../lib/recitationReplayAnalysis.ts";
import { Icon } from "./Icon.tsx";

export interface RecitationReplayContext {
  questionFingerprint: string;
  words: ReplayWord[];
  selectedWordId: string | null;
  requestedSessionId: string | null;
  onWordSelect: (wordId: string) => void;
  onPlaybackWord: (wordId: string | null) => void;
}

export function RecitationReplayPlayer({ sources, context, fallback }: {
  sources: SessionRecordingSource[];
  context: RecitationReplayContext;
  fallback: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [sourceId, setSourceId] = useState(sources[0]?.sessionId ?? "");
  const [playback, setPlayback] = useState<LocalRecordingPlayback | null>(null);
  const [part, setPart] = useState(0);
  const [error, setError] = useState<string | null>(null);
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
    if (sourceId) void loadLocalRecordingPlayback(sourceId).then((value) => {
      if (!cancelled) setPlayback(value);
    }).catch(() => { if (!cancelled) setError("Saved audio could not be opened on this device."); });
    return () => { cancelled = true; };
  }, [sourceId, open]);
  const segment = playback?.segments[part];
  const unavailable = !segment || !playback || !["ready", "paused", "interrupted"].includes(playback.manifest.state);
  return <>
    {!open && fallback}
    <section className="replay-review" aria-label="Word replay review">
      <div className="replay-review-heading">
        <div><span>Practice · on this device</span><h3>Ayah & word replay</h3></div>
        <button type="button" className="btn-secondary" aria-expanded={open}
          onClick={() => setOpen((value) => !value)}>{open ? "Close word review" : "Review words"}</button>
      </div>
      {open && <>
        <div className="replay-source-row">
          <label>Recording source<select aria-label="Word replay recording source" value={sourceId}
            onChange={(event) => setSourceId(event.target.value)}>
            {sources.map((source) => <option key={source.sessionId} value={source.sessionId}>{source.label}</option>)}
          </select></label>
          {playback && playback.segments.length > 1 && <label>Recording part<select aria-label="Recording part"
            value={part} onChange={(event) => setPart(Number(event.target.value))}>
            {playback.segments.map((item, index) => <option key={item.index} value={index}>Part {item.index + 1}</option>)}
          </select></label>}
        </div>
        {unavailable ? <p role="status">{error ?? "No finished recording part is available for this source on this device. Record a Practice recitation first."}</p>
          : <ReviewSegment key={`${sourceId}:${playback.manifest.createdAt}:${segment.index}:${context.questionFingerprint}`}
            playback={playback} part={part} context={context} />}
      </>}
    </section>
  </>;
}

function ReviewSegment({ playback, part, context }: {
  playback: LocalRecordingPlayback; part: number; context: RecitationReplayContext;
}) {
  const segment = playback.segments[part];
  const [decoded, setDecoded] = useState<DecodedReplayAudio | null>(null);
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [revisions, setRevisions] = useState<ReplayRevision[]>([]);
  const [position, setPosition] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [ready, setReady] = useState(false);
  const [kind, setKind] = useState<"word" | "ayah">("word");
  const [occurrenceId, setOccurrenceId] = useState("");
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
  const focusRef = useRef(context.onPlaybackWord);
  focusRef.current = context.onPlaybackWord;
  const duration = decoded ? decoded.samples.length / decoded.sampleRate : 0;
  const media = useMemo<ReplayMediaIdentity | null>(() => decoded ? {
    sessionId: playback.manifest.sessionId, recordingCreatedAt: playback.manifest.createdAt,
    segmentIndex: segment.index, sha256: decoded.sha256, sampleRate: decoded.sampleRate,
    sampleCount: decoded.samples.length, questionFingerprint: context.questionFingerprint,
  } : null, [decoded, playback.manifest.sessionId, playback.manifest.createdAt, segment.index, context.questionFingerprint]);
  const selectedWord = context.words.find((word) => word.wordId === context.selectedWordId) ?? context.words[0];
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
      if (document.hidden) { pendingPlayRef.current = false; audio?.pause(); }
    };
    document.addEventListener("visibilitychange", pauseWhenHidden);
    return () => {
      document.removeEventListener("visibilitychange", pauseWhenHidden);
      pendingPlayRef.current = false;
      audio?.pause();
      audio?.removeAttribute("src");
      audio?.load();
    };
  }, [url]);

  // A Quran selection never silently chooses one of several repeated occurrences.
  const targetKey = `${target?.kind}:${target?.wordIds.join("|")}`;
  useEffect(() => {
    setOccurrenceId(""); setNotice("");
    audioRef.current?.pause(); pendingPlayRef.current = false; stopAtRef.current = null;
    const at = audioRef.current?.currentTime ?? 0;
    setStart(at.toFixed(2)); setEnd(Math.min(duration, at + 1).toFixed(2));
  }, [targetKey, duration]);

  const play = () => {
    const audio = audioRef.current;
    if (!audio || !ready) return;
    audio.defaultMuted = false; audio.muted = false; audio.volume = 1;
    void audio.play().catch(() => {
      if (aliveRef.current) setError("Playback could not start. Press Play again.");
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
  const startNumber = Number(start);
  const endNumber = Number(end);
  const validInterval = start.trim() !== "" && end.trim() !== "" &&
    Number.isFinite(startNumber) && Number.isFinite(endNumber) &&
    startNumber >= 0 && endNumber > startNumber && endNumber <= duration;
  const preview = () => {
    if (!validInterval) return;
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
    setOccurrenceId(id); setNotice("");
    const occurrence = occurrences.find((entry) => entry.occurrenceId === id);
    if (occurrence && media) {
      setStart((occurrence.startSample / media.sampleRate).toFixed(3));
      setEnd((occurrence.endSample / media.sampleRate).toFixed(3));
      seek(occurrence.startSample / media.sampleRate);
    }
  };
  useEffect(() => {
    if (ready && occurrences.length === 1 && occurrences[0].status === "reviewed") {
      selectOccurrence(occurrences[0].occurrenceId);
    }
    // Selection changes may seek a single reviewed occurrence; saving/reanalysis
    // must not replace a draft or choose between repetitions behind the reviewer.
  }, [targetKey, ready]);
  const save = async (remove = false) => {
    if (!target || !media || !validInterval || busy) return;
    setBusy(true); setError(null);
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
      setRevisions((current) => [...current, entry]); setOccurrenceId(remove ? "" : entry.occurrenceId);
      setNotice(remove ? "Timing removed; its revision history is retained." : "Timing saved as reviewed on this device.");
    } catch (failure) {
      if (aliveRef.current) setError(failure instanceof Error ? failure.message : "Timing could not be saved.");
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
    setAnalysisStatus("Preparing the next 20 seconds…"); setError(null);
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
          if (current()) setError(failure instanceof Error ? failure.message : "Suggestions could not be saved.");
        } finally { if (current()) setAnalysisStatus(""); }
      };
      setAnalysisStatus("Loading the on-device model…");
      worker.postMessage({ type: "analyze_replay", samples, allowedWordIds: context.words.map((word) => word.wordId) }, [samples.buffer]);
    } catch (failure) {
      if (current()) { setError(failure instanceof Error ? failure.message : "Analysis could not start."); cancelAnalysis(); }
    }
  };

  if (!decoded) return <p role={error ? "alert" : "status"}>{error ?? "Preparing recording timing…"}</p>;
  return <div className="replay-segment">
    <div className="replay-transport">
      <button type="button" className="session-recording-play" disabled={!ready}
        aria-label={playing ? "Pause word replay" : "Play word replay"}
        onClick={() => { stopAtRef.current = null; pendingPlayRef.current = false; if (playing) audioRef.current?.pause(); else play(); }}>
        <Icon name={playing ? "pause" : "play"} size={18} />
      </button>
      <input type="range" min="0" max={duration} step="0.01" value={position} disabled={!ready}
        aria-label="Word replay position" onChange={(event) => { stopAtRef.current = null; seek(Number(event.target.value)); }} />
      <output className="t-num">{formatReplayTime(position)} / {formatReplayTime(duration)}</output>
    </div>
    <audio ref={audioRef} src={url} preload="auto" playsInline
      onLoadedMetadata={(event) => {
        const actual = event.currentTarget.duration;
        const agrees = Number.isFinite(actual) && Math.abs(actual - duration) <= 0.1;
        setReady(agrees);
        if (!agrees) setError("The player clock does not match the decoded recording. Word timing is disabled.");
      }}
      onError={() => { setReady(false); setError("This browser could not play the review audio. Close word review to use full playback."); }}
      onSeeked={() => { if (pendingPlayRef.current) { pendingPlayRef.current = false; play(); } }}
      onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)}
      onTimeUpdate={(event) => setPosition(event.currentTarget.currentTime)}
      onEnded={() => {
        if (repeat && stopAtRef.current !== null) seek(loopStartRef.current, true);
        else setPlaying(false);
      }} />
    <div className="replay-choice-row">
      <label>Word<select aria-label="Replay word" value={selectedWord?.wordId ?? ""}
        onChange={(event) => context.onWordSelect(event.target.value)}>
        {context.words.map((word) => <option key={word.wordId} value={word.wordId}>
          {word.surah}:{word.ayah ?? "b"} · {Number(word.wordId.split(".")[2]) + 1} · {word.text}
        </option>)}
      </select></label>
      <label>Replay scope<select aria-label="Replay scope" value={kind} onChange={(event) => setKind(event.target.value as "word" | "ayah")}>
        <option value="word">This kalimah</option><option value="ayah">This ayah in the recorded span</option>
      </select></label>
    </div>
    <label className="replay-occurrence">Occurrence<select aria-label="Replay occurrence" value={occurrenceId}
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
      <label>Start (seconds)<input type="number" aria-label="Replay start seconds" min="0" max={duration} step="0.01" value={start}
        onChange={(event) => setStart(event.target.value)} />
        <button type="button" disabled={!ready} onClick={() => setStart((audioRef.current?.currentTime ?? 0).toFixed(3))}>Set start here</button>
      </label>
      <label>End (seconds)<input type="number" aria-label="Replay end seconds" min="0" max={duration} step="0.01" value={end}
        onChange={(event) => setEnd(event.target.value)} />
        <button type="button" disabled={!ready} onClick={() => setEnd((audioRef.current?.currentTime ?? 0).toFixed(3))}>Set end here</button>
      </label>
    </div>
    <div className="replay-actions">
      <button type="button" className="btn-secondary" disabled={!ready || !validInterval} onClick={preview}>Replay selection</button>
      <button type="button" className="btn-primary" disabled={!ready || !validInterval || !target || busy}
        onClick={() => void save()}>{busy ? "Saving…" : "Save as reviewed"}</button>
      <label><input type="checkbox" checked={repeat} onChange={(event) => setRepeat(event.target.checked)} /> Repeat</label>
      <label><input type="checkbox" checked={follow} onChange={(event) => setFollow(event.target.checked)} /> Follow reviewed words</label>
    </div>
    <p className="replay-help">Listen before saving. Replay includes 0.4 seconds of context. Repeated words need separate occurrences; a skipped word has no spoken interval.</p>
    {selectedOccurrence && <button type="button" className="replay-remove" disabled={busy} onClick={() => void save(true)}>Remove this timing</button>}
    <details className="replay-analysis"><summary>Experimental word suggestions</summary>
      <p>Analyze up to 20 seconds from the playhead on this device. The first use downloads an 88 MB model. Suggested positions need listening and boundary correction; they never change marks.</p>
      {analysisStatus ? <div className="replay-actions"><span role="status">{analysisStatus}</span><button type="button" className="btn-secondary" onClick={cancelAnalysis}>Cancel analysis</button></div>
        : <button type="button" className="btn-secondary" disabled={!ready || duration < 1 || context.words.length === 0}
          onClick={() => void analyze()}>Suggest word positions</button>}
      <span>{currentReplayOccurrences(matchingRevisions).filter((entry) => entry.status === "suggested").length} positions need review in this part</span>
    </details>
    {notice && <p className="replay-notice" role="status">{notice}</p>}
    {error && <p role="alert" className="replay-error">{error}</p>}
    <p className="replay-help">Times belong to part {segment.index + 1} of this recording. Original audio and judging records are preserved. Review history stays on this device.</p>
  </div>;
}

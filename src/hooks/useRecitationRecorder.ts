import { useCallback, useEffect, useRef, useState } from "react";
import { createMicrophoneAttempt } from '../lib/microphoneAttempt';
import { watchRecordingInterruption } from '../lib/recordingInterruption';
import { createRecordingDiagnostics, RecordingStartupError, waitForRecordingStage } from '../lib/recordingStartupStage';
import {
  appendLocalRecordingChunk,
  beginLocalRecordingSegment,
  chooseRecordingMimeType,
  createLocalRecording,
  finalizeLocalRecordingSegment,
  recordingStateAfterWrites,
  formatRecordingDuration,
  getLocalRecording,
  markOpenLocalRecordingsInterrupted,
  requestPersistentAudioStorage,
  setLocalRecordingSoundDetected,
  setLocalRecordingState,
  supportsLocalRecitationAudio,
  type LocalRecordingManifest,
  type LocalRecordingState,
} from "../lib/recitationAudioStorage";

export type RecitationRecorderStatus =
  | "idle"
  | "requesting"
  | "armed"
  | "starting"
  | "recording"
  | "pausing"
  | "paused"
  | "resuming"
  | "finalizing"
  | "ready"
  | "interrupted"
  | "error";

type StopTarget = Extract<LocalRecordingState, "paused" | "ready" | "failed" | "interrupted">;

export interface RecitationRecorderController {
  supported: boolean;
  status: RecitationRecorderStatus;
  durationMs: number;
  durationLabel: string;
  inputLevel: number;
  lowInput: boolean;
  error: string | null;
  manifest: LocalRecordingManifest | null;
  getDiagnostics: () => string;
  prepare: () => Promise<boolean>;
  cancelPrepared: () => void;
  pause: () => Promise<void>;
  resume: () => Promise<void>;
  finish: () => Promise<void>;
}

function stopStream(stream: MediaStream | null) {
  stream?.getTracks().forEach((track) => track.stop());
}

function microphoneError(error: unknown): string {
  if (error instanceof RecordingStartupError) return error.message;
  if (error instanceof DOMException) {
    if (error.name === "NotAllowedError" || error.name === "SecurityError") {
      return "Microphone access was not allowed. You can try again or begin without recording.";
    }
    if (error.name === "NotFoundError") {
      return "No microphone was found. You can still begin judging without recording.";
    }
    if (error.name === "NotReadableError" || error.name === "AbortError") {
      return "The microphone is busy or could not start. Close other audio apps, then try again.";
    }
  }
  return "The microphone could not start. You can try again or begin without recording.";
}

async function acquireMicrophone(): Promise<MediaStream> {
  try {
    return await navigator.mediaDevices.getUserMedia({
      audio: {
        // Keep the recording mono, but let Safari choose its device-appropriate
        // voice processing. Forcing raw capture produced very weak audio on iPad.
        channelCount: { ideal: 1 },
      },
    });
  } catch (error) {
    if (
      error instanceof DOMException &&
      (error.name === "OverconstrainedError" || error.name === "TypeError")
    ) {
      return navigator.mediaDevices.getUserMedia({ audio: true });
    }
    throw error;
  }
}

export function useRecitationRecorder({
  activeSessionId,
  sessionActive,
}: {
  activeSessionId: string | null;
  sessionActive: boolean;
}): RecitationRecorderController {
  const supported = supportsLocalRecitationAudio();
  const [capture] = useState(() => createMicrophoneAttempt({ acquire: acquireMicrophone }));
  const operationRef = useRef(0);
  const currentSession = useRef({ activeSessionId, sessionActive });
  currentSession.current = { activeSessionId, sessionActive };
  const storagePendingRef = useRef(0);
  const startingSegmentRef = useRef(false);
  const [diagnostics] = useState(() => createRecordingDiagnostics(
    new URLSearchParams(window.location.search).get('recordingDiagnostics') === '1',
  ));
  const [status, setStatus] = useState<RecitationRecorderStatus>("idle");
  const [manifest, setManifest] = useState<LocalRecordingManifest | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [liveElapsedMs, setLiveElapsedMs] = useState(0);
  const [inputLevel, setInputLevel] = useState(0);
  const [segmentSoundDetected, setSegmentSoundDetected] = useState(false);
  const [recoveryChecked, setRecoveryChecked] = useState(false);
  const statusRef = useRef(status);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const segmentIndexRef = useRef<number | null>(null);
  const segmentStartedAtRef = useRef(0);
  const writeQueueRef = useRef(Promise.resolve());
  const stopTargetRef = useRef<StopTarget>("paused");
  const stopPromiseRef = useRef<Promise<void> | null>(null);
  const stopResolveRef = useRef<(() => void) | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const meterFrameRef = useRef<number | null>(null);
  const lastMeterUpdateRef = useRef(0);
  const segmentSoundDetectedRef = useRef(false);
  const soundDetectionSavedRef = useRef(false);

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  const updateFromManifest = useCallback((next: LocalRecordingManifest) => {
    if (!currentSession.current.sessionActive || currentSession.current.activeSessionId !== next.sessionId) return;
    setManifest(next);
    setError(next.error);
  }, []);

  const stopAudioMeter = useCallback(() => {
    if (meterFrameRef.current !== null) {
      window.cancelAnimationFrame(meterFrameRef.current);
      meterFrameRef.current = null;
    }
    audioSourceRef.current?.disconnect();
    analyserRef.current?.disconnect();
    audioSourceRef.current = null;
    analyserRef.current = null;
    const context = audioContextRef.current;
    audioContextRef.current = null;
    if (context && context.state !== "closed") {
      void context.close().catch(() => undefined);
    }
    setInputLevel(0);
  }, []);

  const startAudioMeter = useCallback((stream: MediaStream, sessionId: string) => {
    stopAudioMeter();
    segmentSoundDetectedRef.current = false;
    soundDetectionSavedRef.current = false;
    setSegmentSoundDetected(false);

    try {
      const context = new AudioContext();
      const source = context.createMediaStreamSource(stream);
      const analyser = context.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.72;
      source.connect(analyser);
      audioContextRef.current = context;
      audioSourceRef.current = source;
      analyserRef.current = analyser;
      void context.resume().catch(() => undefined);

      const samples = new Uint8Array(analyser.fftSize);
      const measure = (timestamp: number) => {
        analyser.getByteTimeDomainData(samples);
        let sum = 0;
        for (const sample of samples) {
          const normalized = (sample - 128) / 128;
          sum += normalized * normalized;
        }
        const rms = Math.sqrt(sum / samples.length);
        if (timestamp - lastMeterUpdateRef.current >= 120) {
          lastMeterUpdateRef.current = timestamp;
          setInputLevel(Math.min(1, rms * 12));
        }
        if (rms >= 0.012 && !segmentSoundDetectedRef.current) {
          segmentSoundDetectedRef.current = true;
          setSegmentSoundDetected(true);
          if (!soundDetectionSavedRef.current) {
            soundDetectionSavedRef.current = true;
            void setLocalRecordingSoundDetected(sessionId)
              .then(updateFromManifest)
              .catch(() => {
                soundDetectionSavedRef.current = false;
              });
          }
        }
        meterFrameRef.current = window.requestAnimationFrame(measure);
      };
      meterFrameRef.current = window.requestAnimationFrame(measure);
    } catch {
      // Audio recording remains usable even if live level analysis is unavailable.
      setInputLevel(0);
    }
  }, [stopAudioMeter, updateFromManifest]);

  useEffect(() => {
    if (
      sessionActive ||
      !sessionIdRef.current ||
      (status !== "ready" && status !== "error")
    ) return;
    sessionIdRef.current = null;
    setManifest(null);
    setError(null);
    setLiveElapsedMs(0);
    setStatus("idle");
  }, [sessionActive, status]);

  useEffect(() => {
    storagePendingRef.current++;
    const recovery = markOpenLocalRecordingsInterrupted().finally(() => { storagePendingRef.current--; });
    void waitForRecordingStage(recovery, 'checking saved audio')
      .catch(() => {
        // IndexedDB failures are surfaced if the judge opts into recording.
      })
      .finally(() => setRecoveryChecked(true));
  }, []);

  useEffect(() => {
    const beforeUnload = () => {
      if (recorderRef.current?.state === "recording") {
        try {
          recorderRef.current.requestData();
        } catch {
          // The next launch marks the remaining open segment interrupted.
        }
      }
    };
    window.addEventListener("beforeunload", beforeUnload);
    return () => window.removeEventListener("beforeunload", beforeUnload);
  }, []);

  useEffect(() => {
    if (status !== "recording") return;
    const update = () => {
      setLiveElapsedMs(Math.max(0, Date.now() - segmentStartedAtRef.current));
    };
    update();
    const timer = window.setInterval(update, 500);
    return () => window.clearInterval(timer);
  }, [status]);

  const startSegment = useCallback(async (
    sessionId: string,
    stream: MediaStream,
  ) => {
    if (startingSegmentRef.current) return;
    startingSegmentRef.current = true;
    setStatus('starting');
    statusRef.current = 'starting';
    try {
    const operation = operationRef.current;
    const assertCurrent = () => {
      if (operation !== operationRef.current) {
        stopStream(stream);
        throw new DOMException('Recording start cancelled', 'AbortError');
      }
    };
    const mimeType = chooseRecordingMimeType((candidate) =>
      MediaRecorder.isTypeSupported(candidate)
    );
    const storageStage = <T,>(task: Promise<T>, label: string) => {
      storagePendingRef.current++;
      return waitForRecordingStage(task.finally(() => { storagePendingRef.current--; }), label);
    };
    diagnostics.record('storage-read');
    let current = await storageStage(getLocalRecording(sessionId), 'opening audio storage');
    assertCurrent();
    if (!current) {
      diagnostics.record('storage-create');
      current = await storageStage(createLocalRecording(sessionId, mimeType), 'creating the recording');
      assertCurrent();
    }
    diagnostics.record('segment-create');
    const segmentIndex = await storageStage(beginLocalRecordingSegment(
      sessionId,
      mimeType || current.mimeType,
    ), 'preparing the recording segment');
    assertCurrent();
    let recorder: MediaRecorder;
    try {
      recorder = new MediaRecorder(
        stream,
        mimeType ? { mimeType, audioBitsPerSecond: 128_000 } : undefined,
      );
    } catch {
      recorder = new MediaRecorder(stream);
    }

    sessionIdRef.current = sessionId;
    streamRef.current = stream;
    recorderRef.current = recorder;
    segmentIndexRef.current = segmentIndex;
    segmentStartedAtRef.current = Date.now();
    const segmentStartedAt = segmentStartedAtRef.current;
    stopTargetRef.current = 'interrupted'; // A native stop without our explicit target is unexpected.
    writeQueueRef.current = Promise.resolve();
    setLiveElapsedMs(0);
    setError(null);

    let captureFailed = false;
    let startupFailure: string | null = null;
    let firstChunk = true;
    let chunkIndex = 0;
    let segmentWrites = Promise.resolve();
    const ownsUI = () => recorderRef.current === recorder &&
      currentSession.current.sessionActive && currentSession.current.activeSessionId === sessionId;
    const interruption = watchRecordingInterruption(stream.getAudioTracks(), document, () => {
      if (recorderRef.current !== recorder) return;
      stopTargetRef.current = 'interrupted';
      if (ownsUI()) { setStatus('finalizing'); statusRef.current = 'finalizing'; }
      if (recorder.state !== 'inactive') recorder.stop();
    });
    recorder.ondataavailable = (event) => {
      if (event.data.size === 0) return;
      const isFirstChunk = firstChunk;
      firstChunk = false;
      if (isFirstChunk) diagnostics.record('first-chunk');
      const nextChunkIndex = chunkIndex++;
      segmentWrites = segmentWrites
        .then(() => storageStage(appendLocalRecordingChunk(
          sessionId,
          segmentIndex,
          nextChunkIndex,
          event.data,
        ), 'saving audio'))
        .then(() => { if (isFirstChunk) diagnostics.record('first-chunk-saved'); })
        .catch(async () => {
          captureFailed = true;
          if (ownsUI()) {
            setError("Audio could not be saved on this device. Judging can continue safely.");
            setStatus("error");
          }
          if (recorder.state !== "inactive") {
            stopTargetRef.current = "failed";
            recorder.stop();
          }
        });
      writeQueueRef.current = segmentWrites;
    };
    recorder.onerror = () => {
      captureFailed = true;
      if (ownsUI()) {
        setError("Recording stopped unexpectedly. The audio saved so far remains on this device.");
        setStatus("error");
      }
      if (recorder.state !== "inactive") {
        stopTargetRef.current = "failed";
        recorder.stop();
      }
    };
    recorder.onstop = () => {
      interruption.dispose();
      const target = stopTargetRef.current;
      const durationMs = Math.max(0, Date.now() - segmentStartedAt);
      const ownedRecorder = recorderRef.current === recorder;
      const resolveStop = stopResolveRef.current;
      stopAudioMeter();
      stopStream(stream);
      if (streamRef.current === stream) streamRef.current = null;
      void recordingStateAfterWrites(segmentWrites, target, () => captureFailed)
        .then((settledTarget) => storageStage(finalizeLocalRecordingSegment(
          sessionId,
          segmentIndex,
          durationMs,
          settledTarget,
          settledTarget === "failed"
            ? startupFailure ?? "Recording stopped unexpectedly. The audio saved so far remains on this device."
            : null,
        ), 'finalizing saved audio'))
        .then((next) => {
          if (!ownsUI()) return;
          updateFromManifest(next);
          if (next.state === "paused") setStatus("paused");
          else if (next.state === "interrupted") setStatus("interrupted");
          else if (next.state === "ready") setStatus("ready");
          else setStatus("error");
        })
        .catch(() => {
          if (!ownsUI()) return;
          setError("Audio could not be finalized, but judging data is still safe.");
          setStatus("error");
        })
        .finally(() => {
          resolveStop?.();
          if (ownedRecorder && recorderRef.current === recorder) {
            recorderRef.current = null;
            stopResolveRef.current = null;
            stopPromiseRef.current = null;
          }
        });
    };

    diagnostics.record('recorder-start');
    const started = new Promise<void>((resolve) => {
      recorder.onstart = () => resolve();
    });
    try {
      recorder.start(1_000);
      await waitForRecordingStage(started, 'starting the audio recorder', 10_000);
      assertCurrent();
      if (recorder.state === 'inactive') return;
    } catch (startError) {
      captureFailed = true;
      startupFailure = startError instanceof RecordingStartupError ? startError.message : 'Recording could not start. Judging data is unchanged.';
      // Finish may already have stopped this recorder while its start event was pending.
      if (operation !== operationRef.current && recorder.state === 'inactive') throw startError;
      stopTargetRef.current = 'failed';
      if (recorder.state !== 'inactive') recorder.stop();
      else interruption.dispose();
      stopStream(stream);
      throw startError;
    }
    diagnostics.record('recorder-started');
    startAudioMeter(stream, sessionId);
    setManifest(current);
    setStatus("recording");
    statusRef.current = 'recording';
    interruption.check();
    } finally { startingSegmentRef.current = false; }
  }, [startAudioMeter, stopAudioMeter, updateFromManifest, diagnostics]);

  useEffect(() => {
    if (!recoveryChecked) return;
    if (!sessionActive || !activeSessionId) return;
    if (statusRef.current === "armed" && streamRef.current) {
      const operation = operationRef.current;
      void startSegment(activeSessionId, streamRef.current).catch((startError) => {
        if (operation !== operationRef.current) return;
        diagnostics.record('failed');
        stopStream(streamRef.current);
        streamRef.current = null;
        setError(startError instanceof RecordingStartupError ? startError.message :
          'The microphone was connected, but recording could not start. Saved judging data is unchanged.');
        setStatus("error");
      });
      return;
    }
    void getLocalRecording(activeSessionId).then((existing) => {
      if (!existing || statusRef.current !== "idle" || !currentSession.current.sessionActive ||
          currentSession.current.activeSessionId !== activeSessionId) return;
      updateFromManifest(existing);
      if (existing.state === "paused") setStatus("paused");
      else if (existing.state === "interrupted") setStatus("interrupted");
      else if (existing.state === "ready") setStatus("ready");
      else if (existing.state === "failed") setStatus("error");
    }).catch(() => {
      // A fresh non-recorded session should remain unaffected by storage errors.
    });
  }, [activeSessionId, recoveryChecked, sessionActive, startSegment, updateFromManifest, diagnostics]);

  const prepare = useCallback(async () => {
    if (storagePendingRef.current || startingSegmentRef.current || recorderRef.current) {
      setError('Audio storage is still busy. Wait before retrying, or begin without recording.');
      setStatus('error');
      return false;
    }
    if (['requesting', 'armed', 'starting', 'recording', 'resuming'].includes(statusRef.current)) return false;
    if (!supported) {
      setError("Local recording is not supported in this browser. You can still begin judging.");
      setStatus("error");
      return false;
    }
    setStatus("requesting");
    statusRef.current = 'requesting';
    const operation = ++operationRef.current;
    setError(null);
    try {
      void requestPersistentAudioStorage();
      diagnostics.record('microphone-request');
      const result = await capture.request();
      if (operation !== operationRef.current || result.kind === 'cancelled') return false;
      if (result.kind === 'error') throw result.error;
      if (result.kind !== 'ready') {
        setError('The microphone is still not available. You can begin without recording. If the browser keeps waiting, reopen the app before retrying; do not clear its data.');
        setStatus('error');
        statusRef.current = 'error';
        return false;
      }
      const stream = capture.take(result.attempt);
      if (!stream) return false;
      diagnostics.record('stream-received');
      streamRef.current = stream;
      setStatus("armed");
      statusRef.current = 'armed';
      return true;
    } catch (prepareError) {
      stopStream(streamRef.current);
      streamRef.current = null;
      setError(microphoneError(prepareError));
      setStatus("error");
      statusRef.current = 'error';
      return false;
    }
  }, [supported, capture, diagnostics]);

  const cancelPrepared = useCallback(() => {
    operationRef.current++;
    capture.cancel();
    stopAudioMeter();
    stopStream(streamRef.current);
    streamRef.current = null;
    if (!sessionActive) {
      setStatus("idle");
      statusRef.current = 'idle';
      setError(null);
      setManifest(null);
    }
  }, [sessionActive, stopAudioMeter, capture]);

  useEffect(() => {
    const check = () => capture.checkDeadline();
    document.addEventListener('visibilitychange', check);
    return () => document.removeEventListener('visibilitychange', check);
  }, [capture]);

  useEffect(() => () => {
    operationRef.current++;
    capture.cancel();
    stopAudioMeter();
    if (recorderRef.current?.state === 'recording') {
      stopTargetRef.current = 'interrupted';
      recorderRef.current.stop();
    }
    stopStream(streamRef.current);
  }, [stopAudioMeter, capture]);

  useEffect(() => {
    const recorder = recorderRef.current;
    if (!recorder || (sessionActive && sessionIdRef.current === activeSessionId)) return;
    operationRef.current++;
    capture.cancel();
    if (recorder.state !== 'inactive') {
      stopTargetRef.current = 'interrupted';
      recorder.stop();
    }
    stopStream(streamRef.current);
  }, [activeSessionId, sessionActive, capture]);

  const stopCurrentSegment = useCallback(async (target: StopTarget) => {
    const recorder = recorderRef.current;
    if (!recorder || recorder.state === "inactive") return;
    if (stopPromiseRef.current) return stopPromiseRef.current;
    stopTargetRef.current = target;
    setStatus(target === "paused" ? "pausing" : "finalizing");
    stopPromiseRef.current = new Promise<void>((resolve) => {
      stopResolveRef.current = resolve;
    });
    try {
      recorder.requestData();
    } catch {
      // stop() below still requests the final available data.
    }
    recorder.stop();
    return stopPromiseRef.current;
  }, []);

  const pause = useCallback(async () => {
    if (statusRef.current !== "recording") return;
    await stopCurrentSegment("paused");
  }, [stopCurrentSegment]);

  const resume = useCallback(async () => {
    if (storagePendingRef.current || startingSegmentRef.current || recorderRef.current) {
      setError('The previous audio operation is still finishing. Wait before retrying.');
      return;
    }
    const sessionId = activeSessionId ?? sessionIdRef.current;
    if (!sessionId || !["paused", "interrupted"].includes(statusRef.current)) return;
    const previousStatus = statusRef.current;
    setStatus("resuming");
    statusRef.current = 'resuming';
    const operation = ++operationRef.current;
    setError(null);
    try {
      const result = await capture.request();
      if (operation !== operationRef.current || result.kind === 'cancelled') return;
      if (result.kind === 'error') throw result.error;
      if (result.kind !== 'ready') throw new Error('Microphone startup timed out');
      const stream = capture.take(result.attempt);
      if (!stream) return;
      streamRef.current = stream;
      await startSegment(sessionId, stream);
    } catch (resumeError) {
      if (operation !== operationRef.current) return;
      stopStream(streamRef.current);
      streamRef.current = null;
      setError(microphoneError(resumeError));
      setStatus(previousStatus === "interrupted" ? "interrupted" : "paused");
      statusRef.current = previousStatus === 'interrupted' ? 'interrupted' : 'paused';
    }
  }, [activeSessionId, startSegment, capture]);

  const finish = useCallback(async () => {
    operationRef.current++;
    capture.cancel();
    if (statusRef.current === 'starting' || statusRef.current === 'armed') {
      stopStream(streamRef.current);
      streamRef.current = null;
      if (recorderRef.current) await stopCurrentSegment('failed');
      else { setStatus('error'); setError('Recording was stopped before startup completed. Judging data is unchanged.'); }
      return;
    }
    if (statusRef.current === 'resuming') {
      stopStream(streamRef.current);
      streamRef.current = null;
      statusRef.current = 'paused';
    }
    const sessionId = activeSessionId ?? sessionIdRef.current;
    if (!sessionId) return;
    if (statusRef.current === "recording") {
      await stopCurrentSegment("ready");
      return;
    }
    if (["paused", "interrupted"].includes(statusRef.current)) {
      setStatus("finalizing");
      try {
        updateFromManifest(await setLocalRecordingState(sessionId, "ready"));
        setStatus("ready");
      } catch {
        setError("Audio could not be finalized, but judging data is still safe.");
        setStatus("error");
      }
    }
  }, [activeSessionId, stopCurrentSegment, updateFromManifest, capture]);

  const durationMs = (manifest?.durationMs ?? 0) +
    (status === "recording" ? liveElapsedMs : 0);
  const lowInput = status === "recording" &&
    liveElapsedMs >= 5_000 &&
    !segmentSoundDetected;

  return {
    supported,
    status,
    durationMs,
    durationLabel: formatRecordingDuration(durationMs),
    inputLevel,
    lowInput,
    error,
    manifest,
    getDiagnostics: () => JSON.stringify({
      enabled: new URLSearchParams(window.location.search).get('recordingDiagnostics') === '1',
      build: [...document.scripts].map(script => new URL(script.src || location.href).pathname).find(path => /\/assets\/index-[^/]+\.js$/.test(path)) ?? 'local-development',
      visibility: document.visibilityState,
      stages: diagnostics.snapshot(),
      status: statusRef.current,
      browserPending: capture.isBrowserPending(),
      storagePending: storagePendingRef.current > 0,
    }),
    prepare,
    cancelPrepared,
    pause,
    resume,
    finish,
  };
}

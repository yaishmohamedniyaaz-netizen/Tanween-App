import { useCallback, useEffect, useRef, useState } from "react";
import {
  appendLocalRecordingChunk,
  beginLocalRecordingSegment,
  chooseRecordingMimeType,
  createLocalRecording,
  finalizeLocalRecordingSegment,
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
  | "recording"
  | "pausing"
  | "paused"
  | "resuming"
  | "finalizing"
  | "ready"
  | "interrupted"
  | "error";

type StopTarget = Extract<LocalRecordingState, "paused" | "ready" | "failed">;

export interface RecitationRecorderController {
  supported: boolean;
  status: RecitationRecorderStatus;
  durationMs: number;
  durationLabel: string;
  inputLevel: number;
  lowInput: boolean;
  error: string | null;
  manifest: LocalRecordingManifest | null;
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
  const chunkIndexRef = useRef(0);
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
    void markOpenLocalRecordingsInterrupted()
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
    const mimeType = chooseRecordingMimeType((candidate) =>
      MediaRecorder.isTypeSupported(candidate)
    );
    let current = await getLocalRecording(sessionId);
    if (!current) {
      current = await createLocalRecording(sessionId, mimeType);
    }
    const segmentIndex = await beginLocalRecordingSegment(
      sessionId,
      mimeType || current.mimeType,
    );
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
    chunkIndexRef.current = 0;
    writeQueueRef.current = Promise.resolve();
    setLiveElapsedMs(0);
    setError(null);

    recorder.ondataavailable = (event) => {
      if (event.data.size === 0) return;
      const chunkIndex = chunkIndexRef.current;
      chunkIndexRef.current += 1;
      writeQueueRef.current = writeQueueRef.current
        .then(() => appendLocalRecordingChunk(
          sessionId,
          segmentIndex,
          chunkIndex,
          event.data,
        ))
        .catch(async () => {
          setError("Audio could not be saved on this device. Judging can continue safely.");
          setStatus("error");
          if (recorder.state !== "inactive") {
            stopTargetRef.current = "failed";
            recorder.stop();
          }
        });
    };
    recorder.onerror = () => {
      setError("Recording stopped unexpectedly. The audio saved so far remains on this device.");
      setStatus("error");
      if (recorder.state !== "inactive") {
        stopTargetRef.current = "failed";
        recorder.stop();
      }
    };
    recorder.onstop = () => {
      const target = stopTargetRef.current;
      const durationMs = Math.max(0, Date.now() - segmentStartedAtRef.current);
      stopAudioMeter();
      stopStream(streamRef.current);
      streamRef.current = null;
      recorderRef.current = null;
      void writeQueueRef.current
        .then(() => finalizeLocalRecordingSegment(
          sessionId,
          segmentIndex,
          durationMs,
          target,
          target === "failed"
            ? "Recording stopped unexpectedly. The audio saved so far remains on this device."
            : null,
        ))
        .then((next) => {
          updateFromManifest(next);
          if (target === "paused") setStatus("paused");
          else if (target === "ready") setStatus("ready");
          else setStatus("error");
        })
        .catch(() => {
          setError("Audio could not be finalized, but judging data is still safe.");
          setStatus("error");
        })
        .finally(() => {
          stopResolveRef.current?.();
          stopResolveRef.current = null;
          stopPromiseRef.current = null;
        });
    };

    recorder.start(1_000);
    startAudioMeter(stream, sessionId);
    setManifest(await getLocalRecording(sessionId));
    setStatus("recording");
  }, [startAudioMeter, stopAudioMeter, updateFromManifest]);

  useEffect(() => {
    if (!recoveryChecked) return;
    if (!sessionActive || !activeSessionId) return;
    if (statusRef.current === "armed" && streamRef.current) {
      void startSegment(activeSessionId, streamRef.current).catch((startError) => {
        stopStream(streamRef.current);
        streamRef.current = null;
        setError(microphoneError(startError));
        setStatus("error");
      });
      return;
    }
    void getLocalRecording(activeSessionId).then((existing) => {
      if (!existing || statusRef.current !== "idle") return;
      updateFromManifest(existing);
      if (existing.state === "paused") setStatus("paused");
      else if (existing.state === "interrupted") setStatus("interrupted");
      else if (existing.state === "ready") setStatus("ready");
      else if (existing.state === "failed") setStatus("error");
    }).catch(() => {
      // A fresh non-recorded session should remain unaffected by storage errors.
    });
  }, [activeSessionId, recoveryChecked, sessionActive, startSegment, updateFromManifest]);

  const prepare = useCallback(async () => {
    if (!supported) {
      setError("Local recording is not supported in this browser. You can still begin judging.");
      setStatus("error");
      return false;
    }
    setStatus("requesting");
    setError(null);
    try {
      void requestPersistentAudioStorage();
      const stream = await acquireMicrophone();
      streamRef.current = stream;
      setStatus("armed");
      return true;
    } catch (prepareError) {
      stopStream(streamRef.current);
      streamRef.current = null;
      setError(microphoneError(prepareError));
      setStatus("error");
      return false;
    }
  }, [supported]);

  const cancelPrepared = useCallback(() => {
    stopAudioMeter();
    stopStream(streamRef.current);
    streamRef.current = null;
    if (!sessionActive) {
      setStatus("idle");
      setError(null);
      setManifest(null);
    }
  }, [sessionActive, stopAudioMeter]);

  useEffect(() => () => {
    stopAudioMeter();
    stopStream(streamRef.current);
  }, [stopAudioMeter]);

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
    const sessionId = activeSessionId ?? sessionIdRef.current;
    if (!sessionId || !["paused", "interrupted"].includes(statusRef.current)) return;
    const previousStatus = statusRef.current;
    setStatus("resuming");
    setError(null);
    try {
      const stream = await acquireMicrophone();
      await startSegment(sessionId, stream);
    } catch (resumeError) {
      stopStream(streamRef.current);
      streamRef.current = null;
      setError(microphoneError(resumeError));
      setStatus(previousStatus === "interrupted" ? "interrupted" : "paused");
    }
  }, [activeSessionId, startSegment]);

  const finish = useCallback(async () => {
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
  }, [activeSessionId, stopCurrentSegment, updateFromManifest]);

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
    prepare,
    cancelPrepared,
    pause,
    resume,
    finish,
  };
}

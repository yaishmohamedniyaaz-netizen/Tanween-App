import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type {
  VerseMatchMessage,
  WordProgressMessage,
  WorkerOutbound,
} from "@tilawa/core";
import {
  initialTilawaCursorState,
  observeTilawaProgress,
  observeTilawaVerse,
  type TilawaCursorState,
  type TilawaPassageRange,
} from "../lib/tilawaWordFocus";

export type TilawaTrackerStatus =
  | "idle"
  | "loading"
  | "ready"
  | "listening"
  | "paused"
  | "error";

type PrototypeMessage =
  | WorkerOutbound
  | { type: "loading_status"; message: string }
  | { type: "loading"; percent: number }
  | { type: "performance"; processingMs: number; queuedMs: number }
  | { type: "ready" }
  | { type: "error"; message: string };

interface TilawaPrototypePanelProps {
  open: boolean;
  judgeRailSide: "left" | "right";
  expectedPassage?: TilawaPassageRange | null;
  onOpenChange: (open: boolean) => void;
  onStatusChange?: (status: TilawaTrackerStatus) => void;
  onVerseMatch?: (match: VerseMatchMessage) => void;
  onWordProgress?: (progress: WordProgressMessage) => void;
  onTrackingClear?: () => void;
}

export function TilawaPrototypePanel({
  open,
  judgeRailSide,
  expectedPassage,
  onOpenChange,
  onStatusChange,
  onVerseMatch,
  onWordProgress,
  onTrackingClear,
}: TilawaPrototypePanelProps) {
  const panelRef = useRef<HTMLElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const workerRef = useRef<Worker | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const listeningRef = useRef(false);
  const cursorRef = useRef<TilawaCursorState<VerseMatchMessage>>(
    initialTilawaCursorState<VerseMatchMessage>(),
  );
  const [status, setStatus] = useState<TilawaTrackerStatus>("idle");
  const [statusText, setStatusText] = useState("Not prepared on this device");
  const [progress, setProgress] = useState(0);
  const [verse, setVerse] = useState<VerseMatchMessage | null>(null);
  const [lagSeconds, setLagSeconds] = useState<number | null>(null);
  const [minimized, setMinimized] = useState(false);

  useEffect(() => {
    onStatusChange?.(status);
  }, [onStatusChange, status]);

  useLayoutEffect(() => {
    if (!open) return;
    setMinimized(false);
    requestAnimationFrame(() => titleRef.current?.focus({ preventScroll: true }));
  }, [open]);

  const releaseMicrophone = async () => {
    listeningRef.current = false;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    const context = audioContextRef.current;
    audioContextRef.current = null;
    if (context && context.state !== "closed") await context.close();
    setLagSeconds(null);
  };

  const resetCursor = () => {
    cursorRef.current = initialTilawaCursorState<VerseMatchMessage>();
    setVerse(null);
    onTrackingClear?.();
  };

  const stopListening = async () => {
    await releaseMicrophone();
    workerRef.current?.postMessage({ type: "reset" });
    resetCursor();
    setStatus((current) => current === "idle" || current === "loading" || current === "error"
      ? current
      : "ready");
    setStatusText("Tracker ready");
  };

  const pauseListening = async () => {
    await releaseMicrophone();
    setStatus("paused");
    setStatusText("Tracking paused");
  };

  const closePanel = async () => {
    if (status === "loading") {
      workerRef.current?.terminate();
      workerRef.current = null;
      setProgress(0);
      setStatus("idle");
      setStatusText("Not prepared on this device");
    } else if (status === "listening" || status === "paused") {
      await stopListening();
    }
    onOpenChange(false);
    requestAnimationFrame(() => {
      document.querySelector<HTMLButtonElement>(
        '[aria-label="More actions and view controls"]',
      )?.focus({ preventScroll: true });
    });
  };

  useEffect(() => {
    if (!open) return;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      void closePanel();
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  });

  useEffect(() => () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    void audioContextRef.current?.close();
    workerRef.current?.terminate();
  }, []);

  useEffect(() => {
    resetCursor();
    workerRef.current?.postMessage({ type: "reset" });
  }, [
    expectedPassage?.startAyah.surah,
    expectedPassage?.startAyah.ayah,
    expectedPassage?.endAyah.surah,
    expectedPassage?.endAyah.ayah,
  ]);

  const loadTracker = () => {
    workerRef.current?.terminate();
    workerRef.current = null;
    setProgress(0);
    setStatus("loading");
    setStatusText("Preparing recitation tracking");
    const worker = new Worker(
      new URL("../workers/tilawaPrototype.worker.ts", import.meta.url),
      { type: "module" },
    );
    workerRef.current = worker;
    worker.onmessage = (event: MessageEvent<PrototypeMessage>) => {
      const message = event.data;
      if (message.type === "loading") {
        setProgress(message.percent);
      } else if (message.type === "loading_status") {
        setStatusText(message.message);
      } else if (message.type === "ready") {
        setStatus("ready");
        setStatusText("Tracker ready");
        setProgress(100);
      } else if (message.type === "error") {
        void releaseMicrophone();
        setStatus("error");
        setStatusText(message.message);
      } else if (message.type === "verse_match" && listeningRef.current) {
        cursorRef.current = observeTilawaVerse(
          cursorRef.current,
          message,
          expectedPassage,
        );
      } else if (message.type === "word_progress" && listeningRef.current) {
        const update = observeTilawaProgress(
          cursorRef.current,
          message,
          expectedPassage,
        );
        cursorRef.current = update.state;
        if (update.confirmedVerse) {
          setVerse(update.confirmedVerse);
          onVerseMatch?.(update.confirmedVerse);
        }
        if (update.confirmedProgress) {
          onWordProgress?.({
            ...message,
            ...update.confirmedProgress,
            type: "word_progress",
            matched_indices: update.confirmedProgress.matched_indices ?? [],
          });
        }
      } else if (message.type === "performance" && listeningRef.current) {
        const nextLag = message.queuedMs >= 1_000
          ? Math.max(1, Math.round(message.queuedMs / 1_000))
          : null;
        setLagSeconds((current) => current === nextLag ? current : nextLag);
      }
    };
    worker.onerror = () => {
      void releaseMicrophone();
      setStatus("error");
      setStatusText("The on-device tracker stopped unexpectedly.");
    };
    worker.postMessage({ type: "init" });
  };

  const startListening = async (resume = false) => {
    if (!workerRef.current || (status !== "ready" && status !== "paused")) return;
    let stream: MediaStream | null = null;
    let context: AudioContext | null = null;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { channelCount: { ideal: 1 } },
      });
      context = new AudioContext();
      await context.audioWorklet.addModule("/tilawa-audio-processor.js");
      const source = context.createMediaStreamSource(stream);
      const processor = new AudioWorkletNode(context, "tahqeeq-tilawa-audio");
      processor.port.onmessage = (event: MessageEvent<ArrayBuffer>) => {
        const samples = new Float32Array(event.data);
        workerRef.current?.postMessage({ type: "audio", samples }, [samples.buffer]);
      };
      source.connect(processor);
      streamRef.current = stream;
      audioContextRef.current = context;
      if (!resume) {
        resetCursor();
        workerRef.current.postMessage({ type: "reset" });
      }
      setLagSeconds(null);
      listeningRef.current = true;
      setStatus("listening");
      setStatusText("Listening locally");
    } catch (error) {
      stream?.getTracks().forEach((track) => track.stop());
      if (context && context.state !== "closed") await context.close();
      setStatus("error");
      setStatusText(error instanceof Error ? error.message : "The microphone could not start.");
    }
  };

  if (!open) return null;

  return (
    <section
      ref={panelRef}
      className={`tilawa-tracker-dock is-rail-${judgeRailSide} ${minimized ? "is-minimized" : ""}`}
      role="region"
      aria-labelledby="tilawa-tracker-title"
      aria-describedby="tilawa-tracker-description"
    >
      <div className="tilawa-tracker-heading">
        <div>
          <p className="dialog-kicker">On-device experiment</p>
          <h2
            className="dialog-title"
            id="tilawa-tracker-title"
            ref={titleRef}
            tabIndex={-1}
          >
            Recitation tracking
          </h2>
        </div>
        <div className="tilawa-tracker-window-actions">
          <button
            type="button"
            className="tilawa-tracker-minimize"
            aria-label={minimized ? "Expand recitation tracking" : "Minimize recitation tracking"}
            aria-expanded={!minimized}
            onClick={() => setMinimized((current) => !current)}
          >
            <span aria-hidden="true">{minimized ? "⌃" : "—"}</span>
          </button>
          <button
            type="button"
            className="dialog-close tilawa-tracker-close"
            aria-label="Close recitation tracking"
            onClick={() => void closePanel()}
          >
            <span aria-hidden="true">×</span>
          </button>
        </div>
      </div>

      {minimized ? (
        <div className="tilawa-tracker-minimized-state">
          <span className={`tilawa-tracker-indicator is-${status}`} aria-hidden="true" />
          <span>{statusText}</span>
          {status === "listening" && (
            <button type="button" onClick={() => void pauseListening()}>
              Pause
            </button>
          )}
          {status === "paused" && (
            <button type="button" onClick={() => void startListening(true)}>
              Resume
            </button>
          )}
        </div>
      ) : (
        <>
          <p className="dialog-sub" id="tilawa-tracker-description">
            {expectedPassage
              ? "Follows only the prepared passage and waits for supporting words before moving."
              : "Listening test: waits for supporting words before moving through the Quran."}
          </p>

          <p className="tilawa-tracker-status" role="status">
            {statusText}{status === "loading" && progress > 0 ? ` · ${progress}%` : ""}
            {status === "listening" && lagSeconds !== null ? ` · about ${lagSeconds}s behind` : ""}
          </p>

          {status === "idle" && (
            <button type="button" className="btn-primary" onClick={loadTracker}>
              Download tracker · about 88 MB
            </button>
          )}
          {status === "loading" && (
            <div
              className="tilawa-tracker-progress"
              role="progressbar"
              aria-label="Tracker download and preparation"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={progress}
            >
              <span style={{ width: `${progress}%` }} />
            </div>
          )}
          {status === "ready" && (
            <button type="button" className="btn-primary" onClick={() => void startListening()}>
              Start tracking
            </button>
          )}
          {status === "listening" && (
            <div className="tilawa-tracker-actions">
              <button type="button" className="btn-secondary" onClick={() => void pauseListening()}>
                Pause tracking
              </button>
              <button type="button" className="btn-ghost" onClick={() => void stopListening()}>
                Stop and clear
              </button>
            </div>
          )}
          {status === "paused" && (
            <div className="tilawa-tracker-actions">
              <button type="button" className="btn-primary" onClick={() => void startListening(true)}>
                Resume tracking
              </button>
              <button type="button" className="btn-ghost" onClick={() => void stopListening()}>
                Stop and clear
              </button>
            </div>
          )}
          {status === "error" && (
            <button type="button" className="btn-secondary" onClick={loadTracker}>
              Try preparing again
            </button>
          )}

          {verse && (
            <div className="tilawa-tracker-result">
              <small>Last confirmed ayah</small>
              <strong className="t-num">{verse.surah}:{verse.ayah}</strong>
              <span>{Math.round(verse.confidence * 100)}% recognition confidence</span>
            </div>
          )}

          <small className="tilawa-tracker-note">
            Experimental visual guide only. It never creates marks or changes scores.
          </small>
        </>
      )}
    </section>
  );
}

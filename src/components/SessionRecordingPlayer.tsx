import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  deleteLocalRecording,
  formatRecordingDuration,
  getLocalRecording,
  loadLocalRecordingPlayback,
  subscribeLocalRecordings,
  type LocalRecordingManifest,
  type LocalRecordingPlayback,
} from "../lib/recitationAudioStorage";
import { Icon } from "./Icon";
import { RecitationReplayPlayer, type RecitationReplayContext } from "./RecitationReplayPlayer.tsx";

export interface SessionRecordingSource {
  sessionId: string;
  label: string;
}

interface AvailableSource extends SessionRecordingSource {
  manifest: LocalRecordingManifest;
}

export function SessionRecordingPlayer({
  sources,
  replay,
  presentation = "default",
}: {
  sources: SessionRecordingSource[];
  replay?: RecitationReplayContext;
  presentation?: "default" | "workspace";
}) {
  const basic = <BasicSessionRecordingPlayer sources={sources} compact={presentation === "workspace"} />;
  return replay ? <RecitationReplayPlayer sources={sources} context={replay} fallback={basic} embedded={presentation === "workspace"} /> : basic;
}

function BasicSessionRecordingPlayer({ sources, compact = false }: {
  sources: SessionRecordingSource[];
  compact?: boolean;
}) {
  const uniqueSources = useMemo(() => {
    const seen = new Set<string>();
    return sources.filter((source) => {
      if (seen.has(source.sessionId)) return false;
      seen.add(source.sessionId);
      return true;
    });
  }, [sources]);
  const sourceKey = uniqueSources.map((source) => source.sessionId).join("|");
  const [available, setAvailable] = useState<AvailableSource[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState("");
  const [playback, setPlayback] = useState<LocalRecordingPlayback | null>(null);
  const [segmentPosition, setSegmentPosition] = useState(0);
  const [positionMs, setPositionMs] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [segmentUrls, setSegmentUrls] = useState<string[]>([]);
  const pendingSeekRef = useRef<number | null>(null);
  const continueAfterLoadRef = useRef(false);
  const playbackEpoch = useRef(0);
  const refreshEpoch = useRef(0);

  const refreshAvailable = useCallback(async () => {
    const epoch = ++refreshEpoch.current;
    try {
      const manifests = await Promise.all(
        uniqueSources.map(async (source) => ({
          source,
          manifest: await getLocalRecording(source.sessionId),
        })),
      );
      if (epoch !== refreshEpoch.current) return;
      const next = manifests
        .filter((entry): entry is { source: SessionRecordingSource; manifest: LocalRecordingManifest } =>
          Boolean(entry.manifest?.segments.some((segment) => segment.chunkCount > 0))
        )
        .map(({ source, manifest }) => ({ ...source, manifest }));
      setAvailable(next);
      setSelectedSessionId((current) =>
        next.some((source) => source.sessionId === current)
          ? current
          : next[0]?.sessionId ?? ""
      );
    } catch {
      if (epoch === refreshEpoch.current) setError("Saved audio could not be opened on this device.");
    } finally {
      if (epoch === refreshEpoch.current) setLoading(false);
    }
  }, [sourceKey]);

  useEffect(() => {
    setLoading(true);
    void refreshAvailable();
    const unsubscribe = subscribeLocalRecordings((sessionId) => {
      if (uniqueSources.some((source) => source.sessionId === sessionId)) {
        void refreshAvailable();
      }
    });
    return () => { refreshEpoch.current++; unsubscribe(); };
  }, [refreshAvailable, sourceKey]);

  useEffect(() => {
    let cancelled = false;
    playbackEpoch.current++;
    pendingSeekRef.current = null;
    continueAfterLoadRef.current = false;
    audioRef.current?.pause();
    setPlayback(null);
    setSegmentPosition(0);
    setPositionMs(0);
    setPlaying(false);
    setError(null);
    if (!selectedSessionId) return () => {
      cancelled = true;
    };
    void loadLocalRecordingPlayback(selectedSessionId)
      .then((next) => {
        if (cancelled) return;
        if (!next || next.segments.length === 0) {
          setError("This local recording has no playable audio.");
          return;
        }
        if (next.segments.some((segment) => segment.integrityError)) {
          setError("This recording contains an incomplete part. Full replay is unavailable; word review can open its complete parts.");
          return;
        }
        setPlayback(next);
      })
      .catch(() => {
        if (!cancelled) setError("Saved audio could not be opened on this device.");
      });
    return () => {
      cancelled = true;
      playbackEpoch.current++;
      pendingSeekRef.current = null;
      continueAfterLoadRef.current = false;
    };
  }, [selectedSessionId]);

  useEffect(() => {
    const urls = playback?.segments.map((segment) =>
      URL.createObjectURL(segment.blob)
    ) ?? [];
    setSegmentUrls(urls);
    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [playback]);

  const offsets = useMemo(() => {
    const values: number[] = [];
    let elapsed = 0;
    playback?.segments.forEach((segment) => {
      values.push(elapsed);
      elapsed += segment.durationMs;
    });
    return values;
  }, [playback]);
  const durationMs = playback?.manifest.durationMs ?? 0;
  const currentUrl = segmentUrls[segmentPosition] ?? "";

  useEffect(() => {
    const audio = audioRef.current;
    const stopWhenHidden = () => {
      if (document.hidden) {
        playbackEpoch.current++;
        continueAfterLoadRef.current = false;
        audio?.pause(); setPlaying(false);
      }
    };
    document.addEventListener("visibilitychange", stopWhenHidden);
    return () => {
      document.removeEventListener("visibilitychange", stopWhenHidden);
      playbackEpoch.current++;
      audio?.pause();
      audio?.removeAttribute("src");
      audio?.load();
    };
  }, [currentUrl]);

  const playAudio = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.defaultMuted = false;
    audio.muted = false;
    audio.volume = 1;
    const epoch = ++playbackEpoch.current;
    void audio.play().then(() => {
      if (epoch === playbackEpoch.current) setPlaying(true);
    }).catch(() => {
      if (epoch !== playbackEpoch.current) return;
      setPlaying(false);
      setError("Playback could not start. Try the play button again.");
    });
  }, []);

  const togglePlayback = () => {
    const audio = audioRef.current;
    if (!audio || !playback) return;
    if (playing) {
      playbackEpoch.current++;
      continueAfterLoadRef.current = false;
      audio.pause();
      setPlaying(false);
      return;
    }
    if (positionMs >= durationMs - 250 && durationMs > 0) {
      pendingSeekRef.current = 0;
      continueAfterLoadRef.current = true;
      setPositionMs(0);
      if (segmentPosition === 0) {
        audio.currentTime = 0;
        playAudio();
      } else {
        setSegmentPosition(0);
      }
      return;
    }
    playAudio();
  };

  const seekTo = (targetMs: number) => {
    if (!playback) return;
    const bounded = Math.max(0, Math.min(durationMs, targetMs));
    let nextSegment = playback.segments.length - 1;
    playback.segments.some((segment, index) => {
      const end = (offsets[index] ?? 0) + segment.durationMs;
      if (bounded <= end || index === playback.segments.length - 1) {
        nextSegment = index;
        return true;
      }
      return false;
    });
    const withinSegmentMs = Math.max(0, bounded - (offsets[nextSegment] ?? 0));
    pendingSeekRef.current = withinSegmentMs;
    continueAfterLoadRef.current = Boolean(audioRef.current && !audioRef.current.paused);
    setPositionMs(bounded);
    if (nextSegment === segmentPosition && audioRef.current) {
      audioRef.current.currentTime = withinSegmentMs / 1_000;
      pendingSeekRef.current = null;
    } else {
      setSegmentPosition(nextSegment);
    }
  };

  const handleDelete = async () => {
    if (!selectedSessionId) return;
    const confirmed = window.confirm(
      "Delete this local recording from this device? Scores and judging records will not be changed.",
    );
    if (!confirmed) return;
    audioRef.current?.pause();
    try {
      await deleteLocalRecording(selectedSessionId);
      setPlayback(null);
      setPlaying(false);
      setPositionMs(0);
      await refreshAvailable();
    } catch {
      setError("The local recording could not be deleted.");
    }
  };

  if (loading || (available.length === 0 && !error)) return compact
    ? <p role="status">{loading ? "Checking local recording…" : "Recording not on this device. Score imports do not include audio."}</p> : null;

  return (
    <section className="session-recording" aria-labelledby="session-recording-heading">
      <div className="session-recording-heading">
        <div>
          {!compact && <span>On-device audio</span>}
          <h3 id="session-recording-heading">{compact ? "Recording" : "Practice recitation replay"}</h3>
        </div>
        {available.length > 1 && (
          <label>
            <span>Recording source</span>
            <select
              value={selectedSessionId}
              onChange={(event) => setSelectedSessionId(event.target.value)}
            >
              {available.map((source) => (
                <option value={source.sessionId} key={source.sessionId}>
                  {source.label}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      {playback && (
        <div className="session-recording-controls">
          <button
            type="button"
            className="session-recording-play"
            aria-label={playing ? "Pause recitation replay" : "Play recitation replay"}
            onClick={togglePlayback}
          >
            <Icon name={playing ? "pause" : "play"} size={17} />
          </button>
          <span className="session-recording-time t-num">
            {formatRecordingDuration(positionMs)}
          </span>
          <input
            type="range"
            min={0}
            max={Math.max(durationMs, 1)}
            step={250}
            value={Math.min(positionMs, Math.max(durationMs, 1))}
            aria-label="Recitation replay position"
            onChange={(event) => seekTo(Number(event.target.value))}
          />
          <span className="session-recording-time t-num">
            {formatRecordingDuration(durationMs)}
          </span>
          {!compact && <button
            type="button"
            className="session-recording-delete"
            aria-label="Delete this local recording"
            title="Delete local recording"
            onClick={() => void handleDelete()}
          >
            <Icon name="trash" size={15} />
          </button>}
          <audio
            key={currentUrl}
            ref={audioRef}
            src={currentUrl}
            preload="metadata"
            playsInline
            onLoadedMetadata={() => {
              const audio = audioRef.current;
              if (!audio || audio.getAttribute("src") !== currentUrl) return;
              if (pendingSeekRef.current !== null) {
                audio.currentTime = pendingSeekRef.current / 1_000;
                pendingSeekRef.current = null;
              }
              if (continueAfterLoadRef.current) {
                continueAfterLoadRef.current = false;
                playAudio();
              }
            }}
            onError={() => {
              playbackEpoch.current++; continueAfterLoadRef.current = false; pendingSeekRef.current = null;
              setPlaying(false); setError("This browser could not play the saved audio. Other complete parts may still work in word review.");
            }}
            onTimeUpdate={(event) => {
              setPositionMs(
                (offsets[segmentPosition] ?? 0) + event.currentTarget.currentTime * 1_000,
              );
            }}
            onEnded={() => {
              if (!playback || segmentPosition >= playback.segments.length - 1) {
                setPositionMs(durationMs);
                setPlaying(false);
                return;
              }
              continueAfterLoadRef.current = true;
              setSegmentPosition((current) => current + 1);
            }}
          />
        </div>
      )}

      <div className="session-recording-meta">
        <span>
          {playback?.manifest.state === "interrupted"
            ? "Recovered after an interruption · "
            : ""}
          Stored only in this browser on this device.
        </span>
        <span>No audio is added to score exports or backups.</span>
      </div>
      {playback?.manifest.soundDetected === false && (
        <p className="session-recording-warning" role="status">
          Mic level stayed very low during capture. Test this replay before relying on it.
        </p>
      )}
      {error && <p className="session-recording-error" role="alert">{error}</p>}
    </section>
  );
}

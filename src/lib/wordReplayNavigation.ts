import { replayTargetMatches, sameReplayMedia, validateReplayRevision,
  type ReplayMediaIdentity, type ReplayRevision, type ReplayWord } from "./recitationReplay.ts";

export interface ReplaySourceIdentity {
  sessionId: string;
  recordingCreatedAt: string;
  questionFingerprint: string;
}

/** Supplied by the vault/decoder, never inferred from a saved timing itself. */
export interface ReplayPartEvidence {
  index: number;
  media: ReplayMediaIdentity | null;
}

function belongs(media: ReplayMediaIdentity, source: ReplaySourceIdentity) {
  return media.sessionId === source.sessionId &&
    media.recordingCreatedAt === source.recordingCreatedAt &&
    media.questionFingerprint === source.questionFingerprint;
}

/** Resolves across verified parts of ONE source. Does not choose an occurrence. */
export function resolveWordReplay(
  revisions: readonly ReplayRevision[], source: ReplaySourceIdentity,
  parts: readonly ReplayPartEvidence[], words: readonly ReplayWord[], wordId: string,
) {
  const word = words.find(item => item.wordId === wordId);
  const latest = new Map<string, ReplayRevision>();
  const conflicts = new Set<string>();
  for (const entry of revisions) {
    if (!entry?.media || !belongs(entry.media, source)) continue;
    const previous = latest.get(entry.occurrenceId);
    if (!previous || entry.revision > previous.revision) {
      latest.set(entry.occurrenceId, entry);
      conflicts.delete(entry.occurrenceId);
    } else if (entry.revision === previous.revision && entry.id !== previous.id) {
      conflicts.add(entry.occurrenceId);
    }
  }
  const current = [...latest.values()].filter(entry => {
    // Resolve revisions BEFORE checking media. A removed/mismatched latest
    // revision must never resurrect its older apparently usable interval.
    if (entry.status === "removed" || conflicts.has(entry.occurrenceId)) return false;
    try { validateReplayRevision(entry); } catch { return false; }
    const matches = parts.filter(part => part.index === entry.media.segmentIndex);
    return matches.length === 1 && matches[0].media !== null &&
      matches[0].index === matches[0].media.segmentIndex &&
      sameReplayMedia(matches[0].media, entry.media);
  }).sort((a, b) => a.media.segmentIndex - b.media.segmentIndex ||
    a.startSample - b.startSample || a.occurrenceId.localeCompare(b.occurrenceId));
  const exact = word ? current.filter(entry => replayTargetMatches(entry.target,
    { kind: "word", wordIds: [word.wordId], label: word.text })) : [];
  const ayahIds = word ? words.filter(item => item.surah === word.surah && item.ayah === word.ayah)
    .map(item => item.wordId) : [];
  const ayah = word ? current.filter(entry => entry.status === "reviewed" &&
    replayTargetMatches(entry.target, { kind: "ayah", wordIds: ayahIds, label: "Recorded span" })) : [];
  return {
    reviewedWords: exact.filter(entry => entry.status === "reviewed"),
    approximateWords: exact.filter(entry => entry.status === "suggested"),
    reviewedAyahSpans: ayah,
  };
}

export interface ReplayNavigationRequest {
  media: ReplayMediaIdentity;
  occurrenceId: string;
  revisionId: string;
  startSeconds: number;
  stopSeconds: number | null;
}

/** Only an explicit user action should create a playback request. */
export function makeReplayNavigationRequest(entry: ReplayRevision,
  policy: "continue" | "clip" = "continue", leadInSeconds = 0.5): ReplayNavigationRequest {
  validateReplayRevision(entry);
  if (entry.status === "removed" || !Number.isFinite(leadInSeconds) || leadInSeconds < 0) {
    throw new Error("Invalid replay navigation request.");
  }
  return { media: { ...entry.media }, occurrenceId: entry.occurrenceId, revisionId: entry.id,
    startSeconds: Math.max(0, entry.startSample / entry.media.sampleRate - leadInSeconds),
    stopSeconds: policy === "clip" ? Math.min(entry.media.sampleCount / entry.media.sampleRate,
      entry.endSample / entry.media.sampleRate + leadInSeconds) : null };
}

export interface PreparedReplayTransport {
  media: ReplayMediaIdentity;
  seek(seconds: number): Promise<void>;
  play(): Promise<void>;
  pause(): void;
  dispose(): void;
}

/** Each prepare must return a separately owned handle, never the shared live element.
 * The adapter verifies the current revision and exact media before returning it.
 * Generation checks additionally protect decoders that cannot actually abort. */
export class ReplayNavigationController {
  private generation = 0;
  private abort: AbortController | null = null;
  private active: PreparedReplayTransport | null = null;
  private disposed = false;

  private readonly prepare: (request: ReplayNavigationRequest,
    signal: AbortSignal) => Promise<PreparedReplayTransport>;

  constructor(prepare: (request: ReplayNavigationRequest,
    signal: AbortSignal) => Promise<PreparedReplayTransport>) { this.prepare = prepare; }

  pause() {
    this.generation++;
    this.abort?.abort();
    this.abort = null;
    this.active?.pause();
  }

  dispose() {
    this.pause();
    this.active?.dispose();
    this.active = null;
    this.disposed = true;
  }

  async navigate(request: ReplayNavigationRequest): Promise<"playing" | "cancelled"> {
    if (this.disposed) throw new Error("Replay controller is closed.");
    this.pause();
    this.active?.dispose();
    this.active = null;
    const generation = this.generation;
    const abort = new AbortController();
    this.abort = abort;
    // Snapshot caller-owned input across asynchronous preparation.
    const snapshot = { ...request, media: { ...request.media } };
    if (!Number.isInteger(snapshot.media.sampleRate) || snapshot.media.sampleRate < 8000 ||
      snapshot.media.sampleRate > 192000 || !Number.isInteger(snapshot.media.sampleCount) ||
      snapshot.media.sampleCount <= 0 || !snapshot.media.sessionId || !snapshot.media.questionFingerprint ||
      !Number.isFinite(Date.parse(snapshot.media.recordingCreatedAt)) ||
      !Number.isInteger(snapshot.media.segmentIndex) || snapshot.media.segmentIndex < 0 ||
      !/^[a-f0-9]{64}$/.test(snapshot.media.sha256) || !snapshot.occurrenceId || !snapshot.revisionId ||
      !Number.isFinite(snapshot.startSeconds) || snapshot.startSeconds < 0 ||
      snapshot.startSeconds >= snapshot.media.sampleCount / snapshot.media.sampleRate ||
      (snapshot.stopSeconds !== null && (!Number.isFinite(snapshot.stopSeconds) ||
        snapshot.stopSeconds <= snapshot.startSeconds ||
        snapshot.stopSeconds > snapshot.media.sampleCount / snapshot.media.sampleRate))) {
      throw new Error("Replay target is outside the recording.");
    }
    let handle: PreparedReplayTransport | null = null;
    const stale = () => this.disposed || generation !== this.generation;
    try {
      handle = await this.prepare(snapshot, abort.signal);
      if (stale()) { handle.dispose(); return "cancelled"; }
      if (!sameReplayMedia(handle.media, snapshot.media)) throw new Error("Recording identity changed.");
      this.active = handle;
      await handle.seek(snapshot.startSeconds);
      if (stale()) { handle.pause(); return "cancelled"; }
      await handle.play();
      if (stale()) { handle.pause(); return "cancelled"; }
      return "playing";
    } catch (error) {
      handle?.pause();
      handle?.dispose();
      if (this.active === handle) this.active = null;
      if (stale()) return "cancelled";
      throw error;
    }
  }
}

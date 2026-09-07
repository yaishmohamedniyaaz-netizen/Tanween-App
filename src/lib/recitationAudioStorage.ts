import { sameReplayMedia, sha256Audio, validateReplayRevision, type ReplayRevision } from "./recitationReplay.ts";

export const RECITATION_AUDIO_DB_NAME = "tahqeeq-recitation-audio";
export const RECITATION_AUDIO_DB_VERSION = 2;

const RECORDINGS_STORE = "recordings";
const CHUNKS_STORE = "chunks";
const REPLAY_STORE = "replay-revisions";

export type LocalRecordingState =
  | "recording"
  | "paused"
  | "ready"
  | "interrupted"
  | "failed";

export interface LocalRecordingSegment {
  index: number;
  startedAt: string;
  endedAt: string | null;
  durationMs: number;
  bytes: number;
  chunkCount: number;
  mimeType: string;
  captureFailed?: boolean;
}

export interface LocalRecordingManifest {
  version: 1;
  sessionId: string;
  createdAt: string;
  updatedAt: string;
  state: LocalRecordingState;
  mimeType: string;
  durationMs: number;
  bytes: number;
  segments: LocalRecordingSegment[];
  interruptionCount: number;
  soundDetected?: boolean;
  error: string | null;
}

export interface LocalRecordingChunk {
  id: string;
  sessionId: string;
  segmentIndex: number;
  chunkIndex: number;
  capturedAt: string;
  blob: Blob;
}

export interface LocalRecordingPlaybackSegment {
  index: number;
  durationMs: number;
  blob: Blob;
  /** Preserve the part's place even when its bytes are incomplete. */
  integrityError: string | null;
  sourceSnapshot: string;
}

export class ReplayRevisionConflict extends Error {
  constructor() {
    super("This timing changed in another view. Load the latest timing before saving again.");
    this.name = "ReplayRevisionConflict";
  }
}

export function recordingPartIntegrity(segment: LocalRecordingSegment, chunks: LocalRecordingChunk[]): string | null {
  if (segment.captureFailed) return "This recording part stopped before all audio could be saved. Word timing is unavailable.";
  if (!segment.endedAt) return "This recording part has not finished saving.";
  if (!Number.isSafeInteger(segment.chunkCount) || segment.chunkCount < 1 ||
      !Number.isSafeInteger(segment.bytes) || segment.bytes < 1) return "This recording part has no complete saved audio.";
  const ordered = [...chunks].sort((a, b) => a.chunkIndex - b.chunkIndex);
  if (ordered.length !== segment.chunkCount || ordered.some((chunk, index) =>
    chunk.segmentIndex !== segment.index || chunk.chunkIndex !== index || !(chunk.blob instanceof Blob) || chunk.blob.size === 0)) {
    return "Some audio is missing from this recording part. Word timing is unavailable.";
  }
  if (ordered.reduce((total, chunk) => total + chunk.blob.size, 0) !== segment.bytes) {
    return "This recording part does not match its saved size. Word timing is unavailable.";
  }
  return null;
}

export async function recordingStateAfterWrites(
  writes: Promise<void>, requested: Extract<LocalRecordingState, "paused" | "ready" | "interrupted" | "failed">,
  hasFailed: () => boolean,
): Promise<typeof requested> {
  await writes;
  return hasFailed() ? "failed" : requested;
}

function partSnapshot(segment: LocalRecordingSegment, chunks: LocalRecordingChunk[]): string {
  return JSON.stringify([segment, [...chunks].sort((a, b) => a.chunkIndex - b.chunkIndex)
    .map((chunk) => [chunk.id, chunk.sessionId, chunk.segmentIndex, chunk.chunkIndex, chunk.capturedAt, chunk.blob.size, chunk.blob.type])]);
}

export interface LocalRecordingPlayback {
  manifest: LocalRecordingManifest;
  segments: LocalRecordingPlaybackSegment[];
}

export interface StorageEstimateSummary {
  persisted: boolean | null;
  usage: number | null;
  quota: number | null;
}

const listeners = new Set<(sessionId: string) => void>();

function notify(sessionId: string) {
  listeners.forEach((listener) => listener(sessionId));
}

export function subscribeLocalRecordings(
  listener: (sessionId: string) => void,
): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function supportsLocalRecitationAudio(): boolean {
  return typeof window !== "undefined" &&
    "indexedDB" in window &&
    "MediaRecorder" in window &&
    Boolean(navigator.mediaDevices?.getUserMedia);
}

export function chooseRecordingMimeType(
  isSupported: (mimeType: string) => boolean,
): string {
  const preferred = [
    "audio/webm;codecs=opus",
    "audio/mp4;codecs=mp4a.40.2",
    "audio/mp4",
    "audio/webm",
  ];
  return preferred.find(isSupported) ?? "";
}

export function formatRecordingDuration(durationMs: number): string {
  const totalSeconds = Math.max(0, Math.floor(durationMs / 1_000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function upgradeRecitationAudioDatabase(database: IDBDatabase): void {
  if (!database.objectStoreNames.contains(RECORDINGS_STORE)) {
    database.createObjectStore(RECORDINGS_STORE, { keyPath: "sessionId" });
  }
  if (!database.objectStoreNames.contains(CHUNKS_STORE)) {
    const chunks = database.createObjectStore(CHUNKS_STORE, { keyPath: "id" });
    chunks.createIndex("by-session", "sessionId", { unique: false });
  }
  if (!database.objectStoreNames.contains(REPLAY_STORE)) {
    const replay = database.createObjectStore(REPLAY_STORE, { keyPath: "id" });
    replay.createIndex("by-session", "media.sessionId", { unique: false });
  }
}

function openDatabase(): Promise<IDBDatabase> {
  if (typeof indexedDB === "undefined") {
    return Promise.reject(new Error("On-device audio storage is unavailable."));
  }
  return new Promise((resolve, reject) => {
    let blocked = false;
    const request = indexedDB.open(
      RECITATION_AUDIO_DB_NAME,
      RECITATION_AUDIO_DB_VERSION,
    );
    request.onupgradeneeded = () => upgradeRecitationAudioDatabase(request.result);
    request.onsuccess = () => {
      if (blocked) { request.result.close(); return; }
      request.result.onversionchange = () => request.result.close();
      resolve(request.result);
    };
    request.onerror = () => reject(request.error ?? new Error("Audio storage could not be opened."));
    request.onblocked = () => {
      blocked = true;
      reject(new Error("Audio storage is blocked by another Tahqeeq tab."));
    };
  });
}

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Audio storage request failed."));
  });
}

function transactionComplete(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onabort = () => reject(transaction.error ?? new Error("Audio storage transaction was cancelled."));
    transaction.onerror = () => reject(transaction.error ?? new Error("Audio storage transaction failed."));
  });
}

async function withDatabase<T>(operation: (database: IDBDatabase) => Promise<T>): Promise<T> {
  const database = await openDatabase();
  try {
    return await operation(database);
  } finally {
    database.close();
  }
}

export async function requestPersistentAudioStorage(): Promise<StorageEstimateSummary> {
  if (typeof navigator === "undefined" || !navigator.storage) {
    return { persisted: null, usage: null, quota: null };
  }
  let persisted: boolean | null = null;
  try {
    persisted = navigator.storage.persisted
      ? await navigator.storage.persisted()
      : null;
    if (persisted === false && navigator.storage.persist) {
      persisted = await navigator.storage.persist();
    }
  } catch {
    persisted = null;
  }
  try {
    const estimate = await navigator.storage.estimate();
    return {
      persisted,
      usage: estimate.usage ?? null,
      quota: estimate.quota ?? null,
    };
  } catch {
    return { persisted, usage: null, quota: null };
  }
}

export async function createLocalRecording(
  sessionId: string,
  mimeType: string,
): Promise<LocalRecordingManifest> {
  const now = new Date().toISOString();
  const manifest: LocalRecordingManifest = {
    version: 1,
    sessionId,
    createdAt: now,
    updatedAt: now,
    state: "recording",
    mimeType,
    durationMs: 0,
    bytes: 0,
    segments: [],
    interruptionCount: 0,
    soundDetected: false,
    error: null,
  };
  await withDatabase(async (database) => {
    const transaction = database.transaction(RECORDINGS_STORE, "readwrite");
    // Replacing original audio requires explicit deletion first.
    transaction.objectStore(RECORDINGS_STORE).add(manifest);
    await transactionComplete(transaction);
  });
  notify(sessionId);
  return manifest;
}

export async function getLocalRecording(
  sessionId: string,
): Promise<LocalRecordingManifest | null> {
  return withDatabase(async (database) => {
    const transaction = database.transaction(RECORDINGS_STORE, "readonly");
    const result = await requestResult(
      transaction.objectStore(RECORDINGS_STORE).get(sessionId),
    );
    await transactionComplete(transaction);
    return (result as LocalRecordingManifest | undefined) ?? null;
  });
}

async function updateManifest(
  sessionId: string,
  update: (manifest: LocalRecordingManifest) => LocalRecordingManifest,
): Promise<LocalRecordingManifest> {
  const manifest = await withDatabase(async (database) => {
    const transaction = database.transaction(RECORDINGS_STORE, "readwrite");
    const store = transaction.objectStore(RECORDINGS_STORE);
    const current = await requestResult(store.get(sessionId)) as LocalRecordingManifest | undefined;
    if (!current) {
      transaction.abort();
      throw new Error("This recording could not be found on this device.");
    }
    const next = update(current);
    store.put(next);
    await transactionComplete(transaction);
    return next;
  });
  notify(sessionId);
  return manifest;
}

export async function beginLocalRecordingSegment(
  sessionId: string,
  mimeType: string,
  startedAt = new Date().toISOString(),
): Promise<number> {
  const manifest = await updateManifest(sessionId, (current) => {
    const index = current.segments.length;
    return {
      ...current,
      updatedAt: startedAt,
      state: "recording",
      mimeType: current.mimeType || mimeType,
      error: null,
      segments: [
        ...current.segments,
        {
          index,
          startedAt,
          endedAt: null,
          durationMs: 0,
          bytes: 0,
          chunkCount: 0,
          mimeType,
        },
      ],
    };
  });
  return manifest.segments[manifest.segments.length - 1]?.index ?? 0;
}

export async function appendLocalRecordingChunk(
  sessionId: string,
  segmentIndex: number,
  chunkIndex: number,
  blob: Blob,
  capturedAt = new Date().toISOString(),
): Promise<void> {
  if (blob.size === 0) return;
  await withDatabase(async (database) => {
    const transaction = database.transaction(
      [RECORDINGS_STORE, CHUNKS_STORE],
      "readwrite",
    );
    const recordings = transaction.objectStore(RECORDINGS_STORE);
    const current = await requestResult(recordings.get(sessionId)) as LocalRecordingManifest | undefined;
    if (!current) {
      transaction.abort();
      throw new Error("This recording could not be found on this device.");
    }
    const target = current.segments.find((segment) => segment.index === segmentIndex);
    if (!target || target.endedAt || !Number.isSafeInteger(chunkIndex) || chunkIndex !== target.chunkCount) {
      transaction.abort();
      throw new Error("Audio chunks must be saved in order to an open recording part.");
    }
    const segments = current.segments.map((segment) =>
      segment.index === segmentIndex
        ? {
            ...segment,
            bytes: segment.bytes + blob.size,
            chunkCount: Math.max(segment.chunkCount, chunkIndex + 1),
          }
        : segment,
    );
    const chunk: LocalRecordingChunk = {
      id: `${sessionId}:${segmentIndex}:${chunkIndex}`,
      sessionId,
      segmentIndex,
      chunkIndex,
      capturedAt,
      blob,
    };
    transaction.objectStore(CHUNKS_STORE).add(chunk);
    recordings.put({
      ...current,
      updatedAt: capturedAt,
      bytes: current.bytes + blob.size,
      segments,
    });
    await transactionComplete(transaction);
  });
  notify(sessionId);
}

export async function finalizeLocalRecordingSegment(
  sessionId: string,
  segmentIndex: number,
  durationMs: number,
  state: Extract<LocalRecordingState, "paused" | "ready" | "interrupted" | "failed">,
  error: string | null = null,
): Promise<LocalRecordingManifest> {
  const endedAt = new Date().toISOString();
  return updateManifest(sessionId, (current) => {
    const safeDuration = Math.max(0, Math.round(durationMs));
    const segments = current.segments.map((segment) =>
      segment.index === segmentIndex
        ? { ...segment, endedAt, durationMs: safeDuration, ...(state === "failed" ? { captureFailed: true } : {}) }
        : segment,
    );
    return {
      ...current,
      updatedAt: endedAt,
      state,
      durationMs: segments.reduce((total, segment) => total + segment.durationMs, 0),
      segments,
      interruptionCount: state === "interrupted"
        ? current.interruptionCount + 1
        : current.interruptionCount,
      error,
    };
  });
}

export async function setLocalRecordingState(
  sessionId: string,
  state: LocalRecordingState,
  error: string | null = null,
): Promise<LocalRecordingManifest> {
  const updatedAt = new Date().toISOString();
  return updateManifest(sessionId, (current) => ({
    ...current,
    updatedAt,
    state,
    error,
    interruptionCount: state === "interrupted"
      ? current.interruptionCount + 1
      : current.interruptionCount,
  }));
}

export async function setLocalRecordingSoundDetected(
  sessionId: string,
): Promise<LocalRecordingManifest> {
  const updatedAt = new Date().toISOString();
  return updateManifest(sessionId, (current) => ({
    ...current,
    updatedAt,
    soundDetected: true,
  }));
}

export async function markOpenLocalRecordingsInterrupted(): Promise<string[]> {
  return withDatabase(async (database) => {
    const transaction = database.transaction(RECORDINGS_STORE, "readwrite");
    const store = transaction.objectStore(RECORDINGS_STORE);
    const recordings = await requestResult(store.getAll()) as LocalRecordingManifest[];
    const changed: string[] = [];
    const now = new Date().toISOString();
    recordings.forEach((recording) => {
      if (recording.state !== "recording") return;
      changed.push(recording.sessionId);
      const segments = recording.segments.map((segment) => {
        if (segment.endedAt) return segment;
        const startedAt = Date.parse(segment.startedAt);
        const endedAt = Date.parse(now);
        return {
          ...segment,
          endedAt: now,
          durationMs: Number.isFinite(startedAt) && Number.isFinite(endedAt)
            ? Math.max(0, endedAt - startedAt)
            : segment.durationMs,
        };
      });
      store.put({
        ...recording,
        state: "interrupted",
        updatedAt: now,
        durationMs: segments.reduce((total, segment) => total + segment.durationMs, 0),
        interruptionCount: recording.interruptionCount + 1,
        segments,
        error: "Recording stopped because the app was closed or refreshed.",
      });
    });
    await transactionComplete(transaction);
    changed.forEach(notify);
    return changed;
  });
}

export async function loadLocalRecordingPlayback(
  sessionId: string,
): Promise<LocalRecordingPlayback | null> {
  return withDatabase(async (database) => {
    const transaction = database.transaction(
      [RECORDINGS_STORE, CHUNKS_STORE],
      "readonly",
    );
    const manifest = await requestResult(
      transaction.objectStore(RECORDINGS_STORE).get(sessionId),
    ) as LocalRecordingManifest | undefined;
    if (!manifest) {
      await transactionComplete(transaction);
      return null;
    }
    const chunks = await requestResult(
      transaction.objectStore(CHUNKS_STORE).index("by-session").getAll(sessionId),
    ) as LocalRecordingChunk[];
    await transactionComplete(transaction);
    const segments = manifest.segments
      .map((segment) => {
        const parts = chunks
          .filter((chunk) => chunk.segmentIndex === segment.index)
          .sort((a, b) => a.chunkIndex - b.chunkIndex);
        return {
          index: segment.index,
          durationMs: segment.durationMs,
          blob: new Blob(parts.map((chunk) => chunk.blob), { type: segment.mimeType || manifest.mimeType }),
          integrityError: recordingPartIntegrity(segment, parts),
          sourceSnapshot: partSnapshot(segment, parts),
        };
      });
    return { manifest, segments };
  });
}

export async function deleteLocalRecording(sessionId: string): Promise<void> {
  await withDatabase(async (database) => {
    const transaction = database.transaction(
      [RECORDINGS_STORE, CHUNKS_STORE, REPLAY_STORE],
      "readwrite",
    );
    transaction.objectStore(RECORDINGS_STORE).delete(sessionId);
    const replay = transaction.objectStore(REPLAY_STORE);
    const revisions = replay.index("by-session").openKeyCursor(IDBKeyRange.only(sessionId));
    revisions.onsuccess = () => {
      const cursor = revisions.result;
      if (!cursor) return;
      replay.delete(cursor.primaryKey);
      cursor.continue();
    };
    const chunks = transaction.objectStore(CHUNKS_STORE);
    const range = IDBKeyRange.only(sessionId);
    const request = chunks.index("by-session").openKeyCursor(range);
    request.onsuccess = () => {
      const cursor = request.result;
      if (!cursor) return;
      chunks.delete(cursor.primaryKey);
      cursor.continue();
    };
    await transactionComplete(transaction);
  });
  notify(sessionId);
}

export async function loadReplayRevisions(sessionId: string): Promise<ReplayRevision[]> {
  return withDatabase(async (database) => {
    const transaction = database.transaction(REPLAY_STORE, "readonly");
    const result = await requestResult(transaction.objectStore(REPLAY_STORE).index("by-session").getAll(sessionId));
    await transactionComplete(transaction);
    return (result as ReplayRevision[]).filter((entry) => {
      try { validateReplayRevision(entry); return true; } catch { return false; }
    });
  });
}

/** Append with optimistic concurrency in the same transaction as the source check. */
export async function appendReplayRevision(entry: ReplayRevision): Promise<void> {
  validateReplayRevision(entry);
  // Web Crypto runs outside IDB; recheck the immutable part's snapshot in the write.
  const source = await loadLocalRecordingPlayback(entry.media.sessionId);
  const checkedPart = source?.segments.find((part) => part.index === entry.media.segmentIndex);
  if (!source || source.manifest.createdAt !== entry.media.recordingCreatedAt || !checkedPart || checkedPart.integrityError ||
      checkedPart.blob.size > 12 * 1024 * 1024 || await sha256Audio(await checkedPart.blob.arrayBuffer()) !== entry.media.sha256) {
    throw new Error("The saved audio is incomplete or changed. Reopen the recording before saving timing.");
  }
  await withDatabase(async (database) => {
    const transaction = database.transaction([RECORDINGS_STORE, CHUNKS_STORE, REPLAY_STORE], "readwrite");
    const completed = transactionComplete(transaction);
    // Observe aborts even when a precondition fails before awaiting completion.
    void completed.catch(() => undefined);
    try {
      const manifest = await requestResult(transaction.objectStore(RECORDINGS_STORE).get(entry.media.sessionId)) as LocalRecordingManifest | undefined;
      if (!manifest || manifest.createdAt !== entry.media.recordingCreatedAt ||
          !["ready", "paused", "interrupted"].includes(manifest.state) ||
          !manifest.segments.some((segment) => segment.index === entry.media.segmentIndex && segment.chunkCount > 0 && segment.endedAt)) {
        throw new Error("The saved recording changed or is still recording. Reopen it before saving timing.");
      }
      const segment = manifest.segments.find((part) => part.index === entry.media.segmentIndex)!;
      const chunks = (await requestResult(transaction.objectStore(CHUNKS_STORE).index("by-session")
        .getAll(entry.media.sessionId)) as LocalRecordingChunk[]).filter((chunk) => chunk.segmentIndex === segment.index);
      if (recordingPartIntegrity(segment, chunks) || partSnapshot(segment, chunks) !== checkedPart.sourceSnapshot) {
        throw new Error("The saved audio changed while saving timing. Reopen the recording.");
      }
      const store = transaction.objectStore(REPLAY_STORE);
      const revisions = await requestResult(store.index("by-session").getAll(entry.media.sessionId)) as ReplayRevision[];
      const previous = revisions.filter((item) => item.occurrenceId === entry.occurrenceId)
        .sort((a, b) => b.revision - a.revision)[0];
      if (entry.revision !== (previous?.revision ?? 0) + 1 ||
          (previous && !sameReplayMedia(previous.media, entry.media))) {
        throw new ReplayRevisionConflict();
      }
      store.add(entry);
      await completed;
    } catch (error) {
      try { transaction.abort(); } catch { /* Already completed/aborted. */ }
      throw error;
    }
  });
}

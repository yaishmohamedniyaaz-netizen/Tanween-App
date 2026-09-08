import { decodeReplayAudio, type DecodedReplayAudio } from "./decodeReplayAudio.ts";
import type { LocalRecordingPlayback } from "./recitationAudioStorage.ts";
import { sameReplayMedia, sha256Audio, type ReplayMediaIdentity, type ReplayRevision } from "./recitationReplay.ts";
import { makeReplayNavigationRequest, type ReplayPartEvidence, type ReplaySourceIdentity } from "./wordReplayNavigation.ts";

function check(signal: AbortSignal) { signal.throwIfAborted(); }
function assertSource(playback: LocalRecordingPlayback, source: ReplaySourceIdentity) {
  if (playback.manifest.sessionId !== source.sessionId || playback.manifest.createdAt !== source.recordingCreatedAt ||
    !["ready", "paused", "interrupted"].includes(playback.manifest.state)) throw Error("Recording is unavailable or changed.");
}

/** Never hop across missing indices or failed parts, even if later audio exists. */
export function nextReplayPart(playback: LocalRecordingPlayback, currentIndex: number) {
  const later = playback.segments.filter(part => part.index > currentIndex).sort((a,b)=>a.index-b.index);
  if (!later.length) return { kind: "end" as const };
  const next = later[0];
  if (next.index !== currentIndex + 1 || later.filter(part=>part.index===next.index).length !== 1 ||
    next.integrityError || !next.blob.size) return { kind: "gap" as const };
  return { kind: "next" as const, segment: next };
}

export async function prepareReplayContinuation(current: ReplayMediaIdentity, signal: AbortSignal,
  loadRecording: (id: string) => Promise<LocalRecordingPlayback | null>, decode = decodeReplayAudio) {
  check(signal);
  const playback = await loadRecording(current.sessionId);
  check(signal);
  if (!playback) throw Error("Recording is no longer on this device.");
  assertSource(playback, current);
  const parts = playback.segments.filter(part=>part.index===current.segmentIndex);
  if (parts.length !== 1 || parts[0].integrityError ||
    await sha256Audio(await parts[0].blob.arrayBuffer()) !== current.sha256) throw Error("Recording changed; continuation stopped.");
  check(signal);
  const next = nextReplayPart(playback, current.segmentIndex);
  if (next.kind !== "next") return next;
  const audio = await decode(next.segment.blob);
  check(signal);
  return { kind: "next" as const, part: playback.segments.findIndex(part=>part.index===next.segment.index),
    media: { ...current, segmentIndex: next.segment.index, sha256: audio.sha256,
      sampleRate: audio.sampleRate, sampleCount: audio.samples.length } };
}

/** Decode sequentially and retain identities only, not a recording-sized PCM cache. */
export async function indexReplayParts(playback: LocalRecordingPlayback, source: ReplaySourceIdentity,
  revisions: readonly ReplayRevision[], signal: AbortSignal, decode = decodeReplayAudio) {
  assertSource(playback, source);
  const parts: ReplayPartEvidence[] = [];
  const unavailable: number[] = [];
  for (const part of playback.segments) {
    check(signal);
    const needed = revisions.some(entry => entry.media.sessionId === source.sessionId &&
      entry.media.recordingCreatedAt === source.recordingCreatedAt &&
      entry.media.questionFingerprint === source.questionFingerprint && entry.media.segmentIndex === part.index);
    if (!needed) continue;
    if (part.integrityError || !part.blob.size) { parts.push({index:part.index,media:null}); unavailable.push(part.index); continue; }
    try {
      const audio = await decode(part.blob);
      check(signal);
      parts.push({ index: part.index, media: { ...source, segmentIndex: part.index,
        sha256: audio.sha256, sampleRate: audio.sampleRate, sampleCount: audio.samples.length } });
    } catch (error) {
      check(signal);
      parts.push({index:part.index,media:null}); unavailable.push(part.index);
    }
  }
  return { parts, unavailable };
}

/** Recheck revisions after decoding: a stale menu choice cannot revive an old timing. */
export async function prepareSavedReplay(entry: ReplayRevision, source: ReplaySourceIdentity, signal: AbortSignal,
  access: { loadRecording: (id: string) => Promise<LocalRecordingPlayback | null>;
    loadRevisions: (id: string) => Promise<ReplayRevision[]>; decode?: typeof decodeReplayAudio }) {
  const request = makeReplayNavigationRequest(entry);
  if (entry.media.sessionId !== source.sessionId || entry.media.recordingCreatedAt !== source.recordingCreatedAt ||
    entry.media.questionFingerprint !== source.questionFingerprint) throw Error("Replay belongs to another recording source.");
  check(signal);
  const playback = await access.loadRecording(source.sessionId);
  check(signal);
  if (!playback) throw Error("Recording is no longer on this device.");
  assertSource(playback, source);
  const matches = playback.segments.filter(part => part.index === entry.media.segmentIndex);
  if (matches.length !== 1 || matches[0].integrityError || !matches[0].blob.size) throw Error("Recording part is unavailable.");
  const audio: DecodedReplayAudio = await (access.decode ?? decodeReplayAudio)(matches[0].blob);
  check(signal);
  const media = { ...source, segmentIndex: matches[0].index, sha256: audio.sha256,
    sampleRate: audio.sampleRate, sampleCount: audio.samples.length };
  if (!sameReplayMedia(media, request.media)) throw Error("Recording bytes or clock changed. Reopen replay.");
  const revisions = await access.loadRevisions(source.sessionId);
  check(signal);
  const related = revisions.filter(item => item.occurrenceId === entry.occurrenceId);
  const latest = related.filter(item => item.revision === Math.max(...related.map(value => value.revision)));
  if (latest.length !== 1 || latest[0].id !== entry.id || latest[0].status === "removed" ||
    !sameReplayMedia(latest[0].media, media) || latest[0].startSample !== entry.startSample ||
    latest[0].endSample !== entry.endSample || latest[0].status !== entry.status ||
    latest[0].target.kind !== entry.target.kind ||
    JSON.stringify(latest[0].target.wordIds) !== JSON.stringify(entry.target.wordIds)) {
    throw Error("This timing changed. Reopen the word before playing.");
  }
  return { audio, request, part: playback.segments.findIndex(part => part.index === media.segmentIndex) };
}

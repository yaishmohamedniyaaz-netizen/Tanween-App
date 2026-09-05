/** Audio evidence lives beside the media, never in a judging record. */
export interface ReplayWord {
  wordId: string;
  text: string;
  surah: number;
  ayah: number | null;
}

export interface ReplayTarget {
  kind: "word" | "ayah";
  wordIds: string[];
  label: string;
}

export interface ReplayMediaIdentity {
  sessionId: string;
  recordingCreatedAt: string;
  segmentIndex: number;
  sha256: string;
  sampleRate: number;
  sampleCount: number;
  questionFingerprint: string;
}

export interface ReplayRevision {
  version: 1;
  id: string;
  occurrenceId: string;
  revision: number;
  media: ReplayMediaIdentity;
  target: ReplayTarget;
  startSample: number;
  endSample: number;
  status: "suggested" | "reviewed" | "removed";
  method: "manual" | "ctc-greedy-anchor-v1";
  createdAt: string;
  reviewer: string | null;
  model?: { modelHash: string; vocabHash: string; frameMapping: string };
}

export function sameReplayMedia(a: ReplayMediaIdentity, b: ReplayMediaIdentity): boolean {
  return a.sessionId === b.sessionId && a.recordingCreatedAt === b.recordingCreatedAt &&
    a.segmentIndex === b.segmentIndex && a.sha256 === b.sha256 &&
    a.sampleRate === b.sampleRate && a.sampleCount === b.sampleCount &&
    a.questionFingerprint === b.questionFingerprint;
}

export function validateReplayRevision(value: ReplayRevision): void {
  const { media, target } = value;
  if (value.version !== 1 || !value.id || !value.occurrenceId ||
      !Number.isInteger(value.revision) || value.revision < 1 ||
      !["suggested", "reviewed", "removed"].includes(value.status) ||
      !["manual", "ctc-greedy-anchor-v1"].includes(value.method) ||
      !Number.isFinite(Date.parse(value.createdAt)) ||
      !media.sessionId || !Number.isFinite(Date.parse(media.recordingCreatedAt)) ||
      !Number.isInteger(media.segmentIndex) || media.segmentIndex < 0 ||
      !/^[a-f0-9]{64}$/.test(media.sha256) || !media.questionFingerprint ||
      !Number.isInteger(media.sampleRate) || media.sampleRate < 8000 || media.sampleRate > 192000 ||
      !Number.isInteger(media.sampleCount) || media.sampleCount <= 0 ||
      !["word", "ayah"].includes(target.kind) || !target.label || !target.wordIds.length ||
      target.wordIds.length > 300 || new Set(target.wordIds).size !== target.wordIds.length ||
      target.wordIds.some((id) => !/^\d+\.(?:\d+|b)\.\d+$/.test(id)) ||
      !Number.isInteger(value.startSample) || !Number.isInteger(value.endSample) ||
      value.startSample < 0 || value.endSample <= value.startSample || value.endSample > media.sampleCount ||
      (value.status === "reviewed" && !value.reviewer?.trim()) ||
      (value.method !== "manual" && (!value.model ||
        !/^[a-f0-9]{64}$/.test(value.model.modelHash) || !/^[a-f0-9]{64}$/.test(value.model.vocabHash)))) {
    throw new Error("This timing interval is incomplete or outside the recording.");
  }
}

export function currentReplayOccurrences(revisions: readonly ReplayRevision[]): ReplayRevision[] {
  const latest = new Map<string, ReplayRevision>();
  for (const entry of revisions) {
    const previous = latest.get(entry.occurrenceId);
    if (!previous || entry.revision > previous.revision) latest.set(entry.occurrenceId, entry);
  }
  return [...latest.values()].filter((entry) => entry.status !== "removed")
    .sort((a, b) => a.media.segmentIndex - b.media.segmentIndex || a.startSample - b.startSample);
}

export function replayTargetMatches(a: ReplayTarget, b: ReplayTarget): boolean {
  return a.kind === b.kind && a.wordIds.length === b.wordIds.length &&
    a.wordIds.every((id, index) => id === b.wordIds[index]);
}

/** Never highlight conflicting occurrences, suggestions, or an unspoken gap. */
export function replayWordAt(revisions: readonly ReplayRevision[], sample: number): string | null {
  const active = currentReplayOccurrences(revisions).filter((entry) =>
    entry.status === "reviewed" && entry.target.kind === "word" &&
    entry.startSample <= sample && sample < entry.endSample);
  return active.length === 1 && active[0].target.wordIds.length === 1
    ? active[0].target.wordIds[0] : null;
}

export function formatReplayTime(seconds: number): string {
  const hundredths = Math.max(0, Math.round(seconds * 100));
  return `${Math.floor(hundredths / 6000)}:${String(Math.floor(hundredths / 100) % 60).padStart(2, "0")}.${String(hundredths % 100).padStart(2, "0")}`;
}

/** A deterministic PCM container keeps review playback on the decoded sample clock. */
export function encodeReplayWav(samples: Float32Array, sampleRate: number): ArrayBuffer {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);
  const ascii = (offset: number, value: string) => [...value].forEach((c, i) => view.setUint8(offset + i, c.charCodeAt(0)));
  ascii(0, "RIFF"); view.setUint32(4, buffer.byteLength - 8, true); ascii(8, "WAVE");
  ascii(12, "fmt "); view.setUint32(16, 16, true); view.setUint16(20, 1, true);
  view.setUint16(22, 1, true); view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true); view.setUint16(32, 2, true); view.setUint16(34, 16, true);
  ascii(36, "data"); view.setUint32(40, samples.length * 2, true);
  samples.forEach((value, index) => {
    const bounded = Math.max(-1, Math.min(1, Number.isFinite(value) ? value : 0));
    view.setInt16(44 + index * 2, Math.round(bounded * (bounded < 0 ? 32768 : 32767)), true);
  });
  return buffer;
}

export async function sha256Audio(bytes: ArrayBuffer): Promise<string> {
  return [...new Uint8Array(await crypto.subtle.digest("SHA-256", bytes))]
    .map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

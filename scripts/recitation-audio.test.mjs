import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  chooseRecordingMimeType,
  formatRecordingDuration,
  RECITATION_AUDIO_DB_NAME,
  recordingPartIntegrity,
  recordingStateAfterWrites,
} from "../src/lib/recitationAudioStorage.ts";
import { replaySaveFailure } from "../src/lib/recitationReplayRecovery.ts";

const root = new URL("../", import.meta.url);
const storageSource = readFileSync(
  new URL("src/lib/recitationAudioStorage.ts", root),
  "utf8",
);
const recorderSource = readFileSync(
  new URL("src/hooks/useRecitationRecorder.ts", root),
  "utf8",
);
const appSource = readFileSync(new URL("src/App.tsx", root), "utf8");
const preparedSource = readFileSync(
  new URL("src/components/PreparedSidebar.tsx", root),
  "utf8",
);
const headerSource = readFileSync(
  new URL("src/components/Header.tsx", root),
  "utf8",
);
const playerSource = readFileSync(
  new URL("src/components/SessionRecordingPlayer.tsx", root),
  "utf8",
);

test("recording format selection prefers compressed browser-native audio", () => {
  const supported = new Set(["audio/mp4", "audio/webm"]);
  assert.equal(
    chooseRecordingMimeType((mimeType) => supported.has(mimeType)),
    "audio/mp4",
  );
  assert.equal(chooseRecordingMimeType(() => false), "");
});

test("recording time uses a stable judge-readable clock", () => {
  assert.equal(formatRecordingDuration(0), "0:00");
  assert.equal(formatRecordingDuration(65_999), "1:05");
  assert.equal(formatRecordingDuration(-1_000), "0:00");
});

test("audio uses a separate device vault and never the judging save record", () => {
  assert.equal(RECITATION_AUDIO_DB_NAME, "tahqeeq-recitation-audio");
  assert.match(storageSource, /indexedDB\.open/);
  assert.doesNotMatch(storageSource, /localStorage|SavedSession|JudgingState/);
  assert.match(appSource, /Promise\.race\(\[\s*recitationAudio\.finish\(\)/);
  assert.match(appSource, /dispatch\(\{ type: "FINISH_SESSION" \}\)/);
});

test("phase one recording is opt-in and restricted to Practice", () => {
  assert.match(appSource, /state\.competition\.isSample && recordPracticeRecitation/);
  assert.match(appSource, /recording=\{state\.competition\.isSample \?/);
  assert.match(preparedSource, /Record this practice recitation/);
  assert.match(preparedSource, /Begin without recording/);
});

test("pause recording closes a segment and resume acquires a fresh microphone stream", () => {
  assert.match(recorderSource, /stopCurrentSegment\("paused"\)/);
  assert.match(recorderSource, /const result = await capture.request\(\)/);
  assert.match(recorderSource, /const stream = capture.take\(result.attempt\)/);
  assert.match(recorderSource, /beginLocalRecordingSegment/);
  assert.match(recorderSource, /recorder\.start\(1_000\)/);
  assert.match(headerSource, /Pause recording at/);
  assert.match(headerSource, /Resume recording at/);
});

test("live recording exposes mic level evidence instead of a decorative pulse", () => {
  assert.match(recorderSource, /channelCount: \{ ideal: 1 \}/);
  assert.doesNotMatch(
    recorderSource,
    /echoCancellation:|noiseSuppression:|autoGainControl:/,
    "Safari should retain its device-default microphone processing",
  );
  assert.match(recorderSource, /createMediaStreamSource/);
  assert.match(recorderSource, /getByteTimeDomainData/);
  assert.match(recorderSource, /rms >= 0\.012/);
  assert.match(headerSource, /recording-mini-wave/);
  assert.match(headerSource, /Mic level is very low/);
  assert.match(storageSource, /soundDetected: false/);
});

test("replay explicitly restores audible element volume", () => {
  assert.match(playerSource, /audio\.defaultMuted = false/);
  assert.match(playerSource, /audio\.muted = false/);
  assert.match(playerSource, /audio\.volume = 1/);
  assert.match(playerSource, /Mic level stayed very low during capture/);
});

test("review requires every saved chunk in order, without changing part numbering", () => {
  const segment = { index: 2, endedAt: "2026-09-06T12:00:00Z", chunkCount: 3, bytes: 6 };
  const chunks = [0, 1, 2].map((chunkIndex) => ({ segmentIndex: 2, chunkIndex, blob: new Blob(["ab"]) }));
  assert.equal(recordingPartIntegrity(segment, chunks), null);
  assert.equal(recordingPartIntegrity(segment, [...chunks].reverse()), null);
  for (const missing of [0, 1, 2]) {
    assert.match(recordingPartIntegrity(segment, chunks.filter((chunk) => chunk.chunkIndex !== missing)), /missing/);
  }
  assert.match(recordingPartIntegrity(segment, [chunks[0], chunks[0], chunks[2]]), /missing/);
  assert.match(recordingPartIntegrity(segment, [...chunks, { ...chunks[0], chunkIndex: 3 }]), /missing/);
  assert.match(recordingPartIntegrity({ ...segment, bytes: 5 }, chunks), /saved size/);
  assert.match(recordingPartIntegrity({ ...segment, endedAt: null }, chunks), /not finished/);
  assert.match(recordingPartIntegrity({ ...segment, captureFailed: true }, chunks), /stopped before/);
  assert.match(recordingPartIntegrity({ ...segment, bytes: 0, chunkCount: 0 }, []), /no complete/);
  assert.match(recordingPartIntegrity({ ...segment, chunkCount: NaN }, chunks), /no complete/);
  assert.match(recordingPartIntegrity(segment, chunks.map((chunk) => ({ ...chunk, blob: new Blob([]) }))), /missing/);
});

test("a final write that fails after Stop cannot label a truncated recording ready", async () => {
  for (const intended of ["paused", "ready", "interrupted"]) {
    let rejectWrite;
    let failed = false;
    const queued = new Promise((_, reject) => { rejectWrite = reject; }).catch(() => { failed = true; });
    const stopping = recordingStateAfterWrites(queued, intended, () => failed);
    rejectWrite(new DOMException("disk full", "QuotaExceededError"));
    assert.equal(await stopping, "failed");
    assert.equal(await recordingStateAfterWrites(Promise.resolve(), intended, () => false), intended);
  }
});

test("failed timing writes describe unsaved drafts and partially persisted suggestions accurately", () => {
  const quota = new DOMException("quota detail", "QuotaExceededError");
  assert.match(replaySaveFailure(quota), /no space.*not saved; its boundaries are still here/);
  assert.doesNotMatch(replaySaveFailure(quota), /quota detail/);
  assert.match(replaySaveFailure(quota, 2), /^2 suggestions saved.*Remaining suggestions were not saved/);
  assert.match(replaySaveFailure(new Error("Storage unavailable"), 0), /^0 suggestions saved.*Storage unavailable/);
  assert.match(replaySaveFailure(null), /Timing could not be saved/);
});

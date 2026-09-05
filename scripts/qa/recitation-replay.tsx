/** Dev-only validation page. Not imported by the production app/build. */
import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import "../../src/styles/global.css";
import { SessionRecordingPlayer } from "../../src/components/SessionRecordingPlayer.tsx";
import { RecitationEvidenceSpan } from "../../src/components/RecitationEvidenceSpan.tsx";
import { appendLocalRecordingChunk, appendReplayRevision, beginLocalRecordingSegment, createLocalRecording,
  deleteLocalRecording, finalizeLocalRecordingSegment, getLocalRecording, loadReplayRevisions,
  upgradeRecitationAudioDatabase } from "../../src/lib/recitationAudioStorage.ts";
import { encodeReplayWav, sha256Audio, type ReplayRevision, type ReplayWord } from "../../src/lib/recitationReplay.ts";
import { decodeReplayAudio } from "../../src/lib/decodeReplayAudio.ts";
import { loadQuestionIndex, resolveQuestionRange, QUESTION_INDEX_VERSION } from "../../src/lib/questionBank.ts";
import { MUSHAF_LAYOUT } from "../../src/lib/mushafContract.ts";
import type { RecitationRangeSnapshot } from "../../src/types.ts";

const fixtureId = "qa-word-replay-synthetic-v1";
const fingerprint = "qa-112-recorded-span-v1";
function App() {
  const [range, setRange] = useState<RecitationRangeSnapshot | null>(null);
  const [words, setWords] = useState<ReplayWord[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [focus, setFocus] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [report, setReport] = useState("No fixtures created.");
  const [checks, setChecks] = useState("");
  useEffect(() => { void getLocalRecording(fixtureId).then((value) => {
    if (value) { setReady(true); setReport("Saved local fixture restored. No competition records are used."); }
  }); }, []);
  useEffect(() => { void loadQuestionIndex().then((index) => {
    const result = resolveQuestionRange(index, { surah: 112, ayah: 1 }, 3);
    if (!result.ok) throw new Error("Fixture range unavailable.");
    setRange({ version: 1, ...result.range, mushafLayout: MUSHAF_LAYOUT, questionIndexVersion: QUESTION_INDEX_VERSION });
  }); }, []);
  async function createFixture(blob?: Blob) {
    setReady(false);
    const existing = await getLocalRecording(fixtureId);
    // This named fixture is disposable. Never delete another session's recording.
    if (existing) await deleteLocalRecording(fixtureId);
    const rate = 48000;
    const samples = new Float32Array(rate * 12);
    for (let i = 0; i < samples.length; i++) {
      const t = i / rate;
      if (t >= 1 && t < 2 || t >= 4 && t < 5 || t >= 8 && t < 9) samples[i] = Math.sin(2 * Math.PI * 440 * t) * 0.2;
    }
    const audio = blob ?? new Blob([encodeReplayWav(samples, rate)], { type: "audio/wav" });
    await createLocalRecording(fixtureId, audio.type);
    const part = await beginLocalRecordingSegment(fixtureId, audio.type);
    await appendLocalRecordingChunk(fixtureId, part, 0, audio);
    // Intentionally wrong wall-clock duration proves review uses decoded media.
    await finalizeLocalRecordingSegment(fixtureId, part, 999000, "ready");
    setReady(true);
    setReport(blob ? "Local audio fixture loaded. No audio was uploaded." : "Synthetic 12-second tone fixture. Tones are not Quran recitation. Stored wall-clock duration deliberately differs.");
  }
  async function runChecks() {
    const results: string[] = [];
    const assert = (condition: boolean, message: string) => { if (!condition) throw new Error(message); results.push(`PASS ${message}`); };
    const testId = `qa-word-replay-check-${crypto.randomUUID()}`;
    try {
      const migrationName = `${testId}-migration`;
      await new Promise<void>((resolve, reject) => {
        const request = indexedDB.open(migrationName, 1);
        request.onupgradeneeded = () => {
          request.result.createObjectStore("recordings", { keyPath: "sessionId" }).put({ sessionId: "legacy", retained: true });
          const chunks = request.result.createObjectStore("chunks", { keyPath: "id" });
          chunks.createIndex("by-session", "sessionId");
          chunks.put({ id: "legacy:0:0", sessionId: "legacy", blob: new Blob(["original"]) });
        };
        request.onsuccess = () => { request.result.close(); resolve(); };
        request.onerror = () => reject(request.error);
      });
      await new Promise<void>((resolve, reject) => {
        const request = indexedDB.open(migrationName, 2);
        request.onupgradeneeded = () => upgradeRecitationAudioDatabase(request.result);
        request.onsuccess = () => {
          const database = request.result;
          assert(database.objectStoreNames.contains("replay-revisions"), "version 1 database gains timing store");
          const transaction = database.transaction(["recordings", "chunks"], "readonly");
          transaction.objectStore("recordings").get("legacy").onsuccess = (event) => {
            assert((event.target as IDBRequest).result.retained, "migration retains original recording manifest");
          };
          transaction.objectStore("chunks").get("legacy:0:0").onsuccess = (event) => {
            assert((event.target as IDBRequest).result.blob.size === 8, "migration retains original audio blob");
          };
          transaction.oncomplete = () => { database.close(); resolve(); };
          transaction.onerror = () => reject(transaction.error);
        };
        request.onerror = () => reject(request.error);
      });
      indexedDB.deleteDatabase(migrationName);
      for (const rate of [44100, 48000]) {
        const signal = new Float32Array(rate * 3 + 127);
        for (let i = rate; i < rate + 1000; i++) signal[i] = 0.5;
        const original = new Blob([encodeReplayWav(signal, rate)], { type: "audio/wav" });
        const decoded = await decodeReplayAudio(original);
        assert(Math.abs(decoded.samples.length / decoded.sampleRate - signal.length / rate) < 0.001, `${rate} Hz decoded duration within 1 ms`);
        assert(decoded.sha256 === await sha256Audio(await original.arrayBuffer()), `${rate} Hz original media hash retained`);
      }
      const live = new AudioContext({ sampleRate: 48000 });
      await live.resume();
      const destination = live.createMediaStreamDestination();
      const signal = live.createBuffer(1, 48000, 48000);
      const channel = signal.getChannelData(0);
      for (let i = 14400; i < 24000; i++) channel[i] = Math.sin(2 * Math.PI * 440 * i / 48000) * 0.3;
      const bufferSource = live.createBufferSource(); bufferSource.buffer = signal; bufferSource.connect(destination);
      const recorder = new MediaRecorder(destination.stream);
      const chunks: Blob[] = [];
      recorder.ondataavailable = (event) => chunks.push(event.data);
      const stopped = new Promise<void>((resolve) => { recorder.onstop = () => resolve(); });
      bufferSource.onended = () => recorder.stop();
      recorder.start(); bufferSource.start();
      await stopped;
      const compressed = await decodeReplayAudio(new Blob(chunks, { type: recorder.mimeType }));
      await live.close(); destination.stream.getTracks().forEach((track) => track.stop());
      const onset = compressed.samples.findIndex((value) => Math.abs(value) > 0.08) / compressed.sampleRate;
      assert(Math.abs(onset - 0.3) < 0.1, "MediaRecorder compressed-audio onset within 100 ms after decode");
      assert(compressed.samples.length / compressed.sampleRate >= 0.95 && compressed.samples.length / compressed.sampleRate < 1.15,
        "MediaRecorder compressed-audio duration stays within 150 ms");
      const manifest = await createLocalRecording(testId, "audio/wav");
      const index = await beginLocalRecordingSegment(testId, "audio/wav");
      await appendLocalRecordingChunk(testId, index, 0, new Blob([encodeReplayWav(new Float32Array(48000 * 3), 48000)], { type: "audio/wav" }));
      await finalizeLocalRecordingSegment(testId, index, 3000, "ready");
      const first: ReplayRevision = { version: 1, id: crypto.randomUUID(), occurrenceId: crypto.randomUUID(), revision: 1,
        media: { sessionId: testId, recordingCreatedAt: manifest.createdAt, segmentIndex: index, sha256: "a".repeat(64),
          sampleRate: 48000, sampleCount: 144000, questionFingerprint: fingerprint },
        target: { kind: "word", wordIds: ["112.1.0"], label: "قُلْ" }, startSample: 48000, endSample: 96000,
        status: "reviewed", method: "manual", createdAt: new Date().toISOString(), reviewer: "qa-reviewer" };
      await appendReplayRevision(first);
      const races = await Promise.allSettled([1, 2].map(() => appendReplayRevision({ ...first, id: crypto.randomUUID(), revision: 2 })));
      assert(races.filter((result) => result.status === "fulfilled").length === 1, "concurrent corrections cannot overwrite each other");
      assert((await loadReplayRevisions(testId)).length === 2, "original and correction revisions both retained");
      await deleteLocalRecording(testId);
      assert((await loadReplayRevisions(testId)).length === 0, "recording deletion removes associated timing revisions");
      assert((await getLocalRecording(testId)) === null, "test recording deleted");
      const late = await Promise.allSettled([appendReplayRevision({ ...first, id: crypto.randomUUID(), revision: 3 })]);
      assert(late[0].status === "rejected", "late analysis cannot resurrect deleted recording evidence");
      setChecks(results.join("\n"));
    } catch (error) { setChecks([...results, `FAIL ${String(error)}`].join("\n")); }
  }
  return <main style={{ maxWidth: 1120, margin: "0 auto", padding: "24px 16px" }}>
    <header style={{ marginBottom: 24 }}><p>TAHQEEQ · PRACTICE PROTOTYPE</p><h1 style={{ fontSize: 27 }}>Replay the exact passage</h1>
      <p>Development fixture for audio timing and word review. No competition records are changed.</p>
      <details><summary>Validation controls</summary>
      <div className="replay-actions"><button className="btn-secondary" onClick={() => void createFixture()}>Load tone fixture</button>
        <button className="btn-secondary" onClick={() => void runChecks()}>Run storage and clock checks</button>
        <label style={{ display: "block", width: "100%", minWidth: 0 }}>Use local test audio<input style={{ display: "block", maxWidth: "100%" }} type="file" accept="audio/*" onChange={(event) => {
          const file = event.target.files?.[0]; if (file) void createFixture(file);
        }} /></label></div>
      {checks && <pre style={{ whiteSpace: "pre-wrap" }} data-testid="replay-checks">{checks}</pre>}
      </details><p role="status">{report}</p>
    </header>
    {ready && <SessionRecordingPlayer sources={[{ sessionId: fixtureId, label: "Practice fixture" }]}
      replay={{ questionFingerprint: fingerprint, words, selectedWordId: selected, requestedSessionId: null,
        onWordSelect: setSelected, onPlaybackWord: setFocus }} />}
    {range && <RecitationEvidenceSpan range={range} mistakes={[]} activeMistakeKey={null} onMistakeSelect={() => {}}
      onReplayWordsReady={setWords} onReplayWordSelect={setSelected} replayWordId={focus} />}
  </main>;
}
const root = createRoot(document.getElementById("root")!);
root.render(<App />);
if (import.meta.hot) import.meta.hot.dispose(() => root.unmount());

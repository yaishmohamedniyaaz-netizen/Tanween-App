import assert from "node:assert/strict";
import test from "node:test";
import { currentReplayOccurrences, encodeReplayWav, replayWordAt, sameReplayMedia,
  validateReplayRevision } from "../src/lib/recitationReplay.ts";
import { greedyWordWindows, matchReplayAnchors, matchReplayContext } from "../src/lib/recitationReplayAnalysis.ts";

const media = { sessionId: "session-a", recordingCreatedAt: "2026-09-05T12:00:00Z", segmentIndex: 0,
  sha256: "a".repeat(64), sampleRate: 48000, sampleCount: 480000, questionFingerprint: "range-a" };
function entry(overrides = {}) {
  return { version: 1, id: "revision-a", occurrenceId: "occurrence-a", revision: 1, media,
    target: { kind: "word", wordIds: ["112.1.0"], label: "قُلْ" }, startSample: 48000, endSample: 96000,
    status: "reviewed", method: "manual", createdAt: "2026-09-05T12:01:00Z", reviewer: "local-reviewer", ...overrides };
}

test("timings reject nonfinite, reversed, empty and out-of-media intervals", () => {
  validateReplayRevision(entry());
  for (const startSample of [-1, NaN, 1.5, Infinity, 96000]) assert.throws(() => validateReplayRevision(entry({ startSample })));
  assert.throws(() => validateReplayRevision(entry({ endSample: media.sampleCount + 1 })));
  assert.throws(() => validateReplayRevision(entry({ reviewer: null })));
  assert.throws(() => validateReplayRevision(entry({ target: { kind: "word", wordIds: [], label: "word" } })));
  assert.throws(() => validateReplayRevision(entry({ method: "ctc-greedy-anchor-v1" })));
});
test("media identity binds source, bytes, segment, decoded clock and frozen question", () => {
  assert.equal(sameReplayMedia(media, { ...media }), true);
  for (const key of Object.keys(media)) {
    assert.equal(sameReplayMedia(media, { ...media, [key]: typeof media[key] === "number" ? media[key] + 1 : `${media[key]}x` }), false, key);
  }
});

test('context matching crosses only adjacent eligible ayahs',()=>{
  const heard=['a','b','c'].map((text,i)=>({text,startFrame:i*3,endFrame:i*3+1}));
  const references=[{surah:50,ayah:18,words:[{text:'a',wordIds:['50.18.0']},{text:'b',wordIds:['50.18.1']}]},
    {surah:50,ayah:19,words:[{text:'c',wordIds:['50.19.0']}]}];
  assert.equal(matchReplayContext(heard,references,10,1).length,1);
  assert.equal(matchReplayContext(heard,[references[0],{...references[1],ayah:20}],10,1).length,0);
  references[0].words[1].wordIds=[];
  assert.equal(matchReplayContext(heard,references,10,1).length,0);
});

test('optional context provenance preserves legacy records and suggested status',()=>{
  const model={modelHash:'a'.repeat(64),vocabHash:'b'.repeat(64),frameMapping:'window-scaled-ctc-frames-v1-unverified'};
  const old=entry({method:'ctc-greedy-anchor-v1',model,status:'suggested',reviewer:null});
  const next={...old,model:{...model,referenceStrategy:'tilawa-contiguous-v1'}};
  validateReplayRevision(old);validateReplayRevision(next);
  assert.equal(next.status,'suggested');assert.equal(replayWordAt([next],60000),null);
  assert.throws(()=>validateReplayRevision({...next,model:{...model,referenceStrategy:'unknown'}}));
});
test("review revisions supersede timings without losing repeated occurrences or history", () => {
  const original = entry();
  const correction = entry({ id: "revision-b", revision: 2, startSample: 50000 });
  const repetition = entry({ id: "revision-c", occurrenceId: "occurrence-b", startSample: 150000, endSample: 200000 });
  assert.deepEqual(currentReplayOccurrences([correction, original, repetition]), [correction, repetition]);
  const removed = entry({ id: "revision-d", revision: 3, status: "removed" });
  assert.deepEqual(currentReplayOccurrences([original, correction, removed, repetition]), [repetition]);
  assert.equal(original.startSample, 48000);
});
test("playback never invents focus for gaps, ambiguous overlaps, suggestions or grouped model words", () => {
  assert.equal(replayWordAt([entry()], 48000), "112.1.0");
  assert.equal(replayWordAt([entry()], 96000), null);
  assert.equal(replayWordAt([entry()], 47000), null);
  assert.equal(replayWordAt([entry({ status: "suggested" })], 50000), null);
  assert.equal(replayWordAt([entry(), entry({ occurrenceId: "other" })], 50000), null);
  assert.equal(replayWordAt([entry({ target: { kind: "word", wordIds: ["2.181.2", "2.181.3"], label: "joined" } })], 50000), null);
});
test("PCM review container preserves sample duration at 44.1 and 48 kHz without segment drift", () => {
  for (const rate of [44100, 48000]) {
    const samples = new Float32Array(rate * 3 + 127);
    samples[0] = -1; samples[1] = 1; samples[2] = NaN;
    const wav = new DataView(encodeReplayWav(samples, rate));
    assert.equal(wav.getUint32(24, true), rate);
    assert.equal(wav.getUint32(40, true) / 2, samples.length);
    assert.equal(wav.getInt16(44, true), -32768);
    assert.equal(wav.getInt16(46, true), 32767);
    assert.equal(wav.getInt16(48, true), 0);
    assert.equal(wav.getUint32(40, true) / wav.getUint32(28, true), samples.length / rate);
  }
});
test("CTC decoding keeps acoustic frames, blank separation and unknown speech", () => {
  const vocab = { 0: "▁قل", 1: "▁هو", 2: "▁الله", 3: "<unk>", 4: "<blank>" };
  const ids = [4, 0, 0, 4, 1, 4, 1, 4, 3, 4, 2, 2, 4];
  const logprobs = new Float32Array(ids.length * 5).fill(-20);
  ids.forEach((id, frame) => { logprobs[frame * 5 + id] = 0; });
  assert.deepEqual(greedyWordWindows(logprobs, ids.length, 5, vocab, 4), [
    { text: "قل", startFrame: 1, endFrame: 3 }, { text: "هو", startFrame: 4, endFrame: 5 },
    { text: "هو", startFrame: 6, endFrame: 7 }, { text: "<unmatched>", startFrame: 8, endFrame: 9 },
    { text: "الله", startFrame: 10, endFrame: 12 },
  ]);
});
const reference = ["قل", "هو", "الله", "احد"].map((text, i) => ({ text, wordIds: [`112.1.${i}`] }));
const heard = (words) => words.map((text, i) => ({ text, startFrame: i * 2, endFrame: i * 2 + 1 }));
test("unique contexts provide provisional offsets and retain repeated occurrences", () => {
  const suggestions = matchReplayAnchors(heard([...reference, ...reference].map((word) => word.text)), [reference], 16, 8);
  assert.equal(suggestions.filter((item) => item.wordIds[0] === "112.1.1").length, 2);
  assert.deepEqual(suggestions.find((item) => item.wordIds[0] === "112.1.1"), { wordIds: ["112.1.1"], startSeconds: 1, endSeconds: 1.5 });
});
test("ambiguous phrases, missing words and wrong words do not become authoritative matches", () => {
  const duplicate = reference.map((word, index) => ({ ...word, wordIds: [`999.1.${index}`] }));
  assert.deepEqual(matchReplayAnchors(heard(reference.map((word) => word.text)), [reference, duplicate], 8, 4), []);
  assert.deepEqual(matchReplayAnchors(heard(["قل", "الله", "احد"]), [reference], 6, 3), []);
  assert.deepEqual(matchReplayAnchors(heard(["قل", "غلط", "الله", "احد"]), [reference], 8, 4), []);
});

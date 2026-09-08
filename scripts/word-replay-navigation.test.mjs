import test from "node:test";
import assert from "node:assert/strict";
import { resolveWordReplay, makeReplayNavigationRequest, ReplayNavigationController } from "../src/lib/wordReplayNavigation.ts";
import { indexReplayParts, prepareSavedReplay, nextReplayPart, prepareReplayContinuation } from "../src/lib/replayRecordingIndex.ts";
import { sha256Audio } from "../src/lib/recitationReplay.ts";

const media = { sessionId: "session", recordingCreatedAt: "2026-09-08T10:00:00Z",
  questionFingerprint: "question", segmentIndex: 0, sha256: "a".repeat(64), sampleRate: 48000, sampleCount: 480000 };
const source = { sessionId: media.sessionId, recordingCreatedAt: media.recordingCreatedAt, questionFingerprint: media.questionFingerprint };
const words = [{ wordId: "112.1.0", surah: 112, ayah: 1, text: "قل" }];
const entry = (overrides = {}) => ({ version: 1, id: "r1", occurrenceId: "o1", revision: 1,
  media, target: { kind: "word", wordIds: ["112.1.0"], label: "قل" }, startSample: 48000, endSample: 96000,
  status: "reviewed", method: "manual", createdAt: "2026-09-08T10:01:00Z", reviewer: "judge", ...overrides });
const resolve = (entries, parts = [{ index: 0, media }]) => resolveWordReplay(entries, source, parts, words, "112.1.0");
const deferred = () => { let resolve, reject; const promise = new Promise((a,b) => { resolve=a; reject=b; }); return {promise,resolve,reject}; };
const handle = (identity = media) => { const calls=[]; return {media:identity,calls,
  seek:async at=>{calls.push(["seek",at]);},play:async()=>{calls.push(["play"]);},
  pause:()=>calls.push(["pause"]),dispose:()=>calls.push(["dispose"])}; };
const recording = { manifest: {...source,state:"ready",createdAt:source.recordingCreatedAt},
  segments:[{index:0,blob:new Blob(["audio"]),integrityError:null}] };
const decoded = () => ({samples:new Float32Array(media.sampleCount),sampleRate:media.sampleRate,sha256:media.sha256,blob:new Blob(["pcm"])});

test("continuation stops at missing, failed, duplicate and empty parts rather than skipping",()=>{
  const next={index:1,blob:new Blob(["next"]),integrityError:null};
  assert.equal(nextReplayPart(recording,0).kind,"end");
  assert.equal(nextReplayPart({...recording,segments:[...recording.segments,next]},0).kind,"next");
  for(const segments of [[{...next,index:2}],[{...next,integrityError:"missing"}],
    [{...next,blob:new Blob()}],[next,next]]) {
    assert.equal(nextReplayPart({...recording,segments:[...recording.segments,...segments]},0).kind,"gap");
  }
});
test("continuation reloads the source and validates current audio before advancing",async()=>{
  const current={...media,sha256:await sha256Audio(await recording.segments[0].blob.arrayBuffer())};
  const playback={...recording,segments:[...recording.segments,{index:1,blob:new Blob(["next"]),integrityError:null}]};
  const result=await prepareReplayContinuation(current,new AbortController().signal,async()=>playback,async()=>decoded());
  assert.equal(result.kind,"next");assert.equal(result.part,1);assert.equal(result.media.segmentIndex,1);
  await assert.rejects(prepareReplayContinuation(media,new AbortController().signal,async()=>playback,async()=>decoded()),/changed/);
  await assert.rejects(prepareReplayContinuation(current,new AbortController().signal,async()=>({...playback,
    manifest:{...playback.manifest,sessionId:"other"}}),async()=>decoded()),/changed/);
});

test("recording index decodes sequentially and retains unavailable part numbers", async()=>{
  let active=0,peak=0;
  const playback={...recording,segments:[...recording.segments,{index:2,blob:new Blob(["audio"]),integrityError:null},
    {index:4,blob:new Blob(),integrityError:"missing"}]};
  const revisions=[entry(),entry({media:{...media,segmentIndex:2}}),entry({media:{...media,segmentIndex:4}})];
  const result=await indexReplayParts(playback,source,revisions,new AbortController().signal,async()=>{
    active++;peak=Math.max(peak,active);await Promise.resolve();active--;return decoded();
  });
  assert.equal(peak,1);assert.deepEqual(result.parts.map(p=>p.index),[0,2,4]);
  assert.deepEqual(result.unavailable,[4]);assert.equal(result.parts[2].media,null);
});
test("prepare rechecks revision after decoding and rejects removed or replaced audio", async()=>{
  const access={loadRecording:async()=>recording,loadRevisions:async()=>[entry()],decode:async()=>decoded()};
  const result=await prepareSavedReplay(entry(),source,new AbortController().signal,access);
  assert.equal(result.request.stopSeconds,null);assert.equal(result.request.startSeconds,0.5);
  await assert.rejects(prepareSavedReplay(entry(),source,new AbortController().signal,
    {...access,loadRevisions:async()=>[entry({id:"removed",revision:2,status:"removed"})]}),/changed/);
  await assert.rejects(prepareSavedReplay(entry(),source,new AbortController().signal,
    {...access,decode:async()=>({...decoded(),sha256:"b".repeat(64)})}),/changed/);
  await assert.rejects(prepareSavedReplay(entry(),source,new AbortController().signal,
    {...access,loadRecording:async()=>null}),/no longer/);
});
test("cancelled decoder result cannot become a prepared recording request", async()=>{
  const abort=new AbortController();
  await assert.rejects(prepareSavedReplay(entry(),source,abort.signal,{loadRecording:async()=>recording,
    loadRevisions:async()=>[entry()],decode:async()=>{abort.abort();return decoded();}}),{name:"AbortError"});
});

test("word lookup spans non-contiguous verified parts without choosing a repetition", () => {
  const later = {...media, segmentIndex: 3};
  const second=entry({id:"r2",occurrenceId:"o2",media:later});
  const result=resolve([second,entry()], [{index:0,media},{index:1,media:null},{index:3,media:later}]);
  assert.deepEqual(result.reviewedWords.map(e=>e.media.segmentIndex),[0,3]);
});
test("lookup isolates source, recording, question, hash, decoded clock and unavailable parts", () => {
  for(const key of Object.keys(media)) {
    const changed={...media,[key]:typeof media[key]==="number"?media[key]+1:media[key]+"x"};
    assert.equal(resolve([entry({media:changed})]).reviewedWords.length,0,key);
  }
  assert.equal(resolve([entry()],[{index:0,media:null}]).reviewedWords.length,0);
  assert.equal(resolve([entry()],[{index:0,media},{index:0,media}]).reviewedWords.length,0);
});
test("latest removal or changed media cannot resurrect old timing", () => {
  for(const update of [{status:"removed"},{media:{...media,sha256:"b".repeat(64)}},{endSample:Infinity}]) {
    assert.equal(resolve([entry(),entry({id:"r2",revision:2,...update})]).reviewedWords.length,0);
  }
  assert.equal(resolve([entry(),entry({id:"conflict"})]).reviewedWords.length,0);
});
test("approximate words and reviewed ayah alternatives remain separate", () => {
  const ayah=entry({id:"ayah",occurrenceId:"ayah",target:{kind:"ayah",wordIds:["112.1.0"],label:"Recorded span"}});
  const result=resolve([entry({status:"suggested",reviewer:null}),ayah]);
  assert.equal(result.reviewedWords.length,0);
  assert.equal(result.approximateWords.length,1);
  assert.equal(result.reviewedAyahSpans.length,1);
  assert.equal(resolveWordReplay([entry()],source,[{index:0,media}],words,"missing").reviewedWords.length,0);
});
test("continuous requests have a lead-in and no word-end stop; correction clips stay explicit", () => {
  const request=makeReplayNavigationRequest(entry());
  assert.equal(request.startSeconds,0.5);
  assert.equal(request.stopSeconds,null);
  assert.equal(makeReplayNavigationRequest(entry(),"clip").stopSeconds,2.5);
  assert.equal(makeReplayNavigationRequest(entry({startSample:100})).startSeconds,0);
  assert.throws(()=>makeReplayNavigationRequest(entry(),"continue",NaN));
  assert.throws(()=>makeReplayNavigationRequest(entry({status:"removed"})));
});
test("latest request wins even if older preparation ignores cancellation", async () => {
  const pending=[];
  const controller=new ReplayNavigationController(()=>{const d=deferred();pending.push(d);return d.promise;});
  const first=controller.navigate(makeReplayNavigationRequest(entry()));
  const second=controller.navigate(makeReplayNavigationRequest(entry()));
  const old=handle(),current=handle();
  pending[1].resolve(current); assert.equal(await second,"playing");
  pending[0].resolve(old); assert.equal(await first,"cancelled");
  assert.deepEqual(old.calls,[["dispose"]]);
  assert.deepEqual(current.calls,[["seek",0.5],["play"]]);
  controller.dispose();
});
test("pause during preparation prevents delayed autoplay", async () => {
  const d=deferred(); const controller=new ReplayNavigationController(()=>d.promise);
  const result=controller.navigate(makeReplayNavigationRequest(entry())); controller.pause();
  const audio=handle();d.resolve(audio);
  assert.equal(await result,"cancelled");assert.deepEqual(audio.calls,[["dispose"]]);
});
test("pause while seeking prevents play; close cancels outstanding requests", async () => {
  const d=deferred(), started=deferred(),audio=handle();audio.seek=()=>{started.resolve();return d.promise;};
  const controller=new ReplayNavigationController(async()=>audio);
  const result=controller.navigate(makeReplayNavigationRequest(entry())); await started.promise;
  controller.pause(); d.resolve(); assert.equal(await result,"cancelled");
  assert.equal(audio.calls.some(c=>c[0]==="play"),false);
  controller.dispose();await assert.rejects(controller.navigate(makeReplayNavigationRequest(entry())),/closed/);
});
test("changed media and playback rejection fail safely without old audio continuing", async () => {
  const wrong=handle({...media,sha256:"b".repeat(64)});
  const controller=new ReplayNavigationController(async()=>wrong);
  await assert.rejects(controller.navigate(makeReplayNavigationRequest(entry())),/identity/);
  assert.equal(wrong.calls.some(c=>c[0]==="play"),false);
  const blocked=handle();blocked.play=async()=>{throw Error("Browser blocked playback");};
  await assert.rejects(new ReplayNavigationController(async()=>blocked).navigate(makeReplayNavigationRequest(entry())),/blocked/);
  assert.deepEqual(blocked.calls.slice(-2),[["pause"],["dispose"]]);
});

test("invalid request clocks never reach the audio adapter", async () => {
  const controller=new ReplayNavigationController(async()=>{throw Error("must not prepare");});
  for(const sampleRate of [0,NaN,Infinity,48000.5]) {
    const request=makeReplayNavigationRequest(entry());request.media.sampleRate=sampleRate;
    await assert.rejects(controller.navigate(request),/outside/);
  }
});

test("pause during a delayed play completion cannot resume the audio", async () => {
  const d=deferred(),started=deferred(),audio=handle();
  audio.play=()=>{started.resolve();return d.promise;};
  const controller=new ReplayNavigationController(async()=>audio);
  const result=controller.navigate(makeReplayNavigationRequest(entry()));await started.promise;
  controller.pause();d.resolve();assert.equal(await result,"cancelled");
  assert.equal(audio.calls.at(-1)[0],"pause");
});

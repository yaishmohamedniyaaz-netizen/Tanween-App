import test from 'node:test';
import assert from 'node:assert/strict';
import { wordReplayChoices, replayChoiceLabel } from '../src/lib/wordReplayChoices.ts';
const media={sessionId:'recording',recordingCreatedAt:'2026-09-07T00:00:00Z',segmentIndex:0,sha256:'a'.repeat(64),sampleRate:48000,sampleCount:480000,questionFingerprint:'question'};
const words=[{wordId:'112.1.0',text:'word one',surah:112,ayah:1},{wordId:'112.1.1',text:'word two',surah:112,ayah:1}];
const entry=(patch={})=>({version:1,id:'r1',occurrenceId:'o1',revision:1,media,target:{kind:'word',wordIds:['112.1.0'],label:'word one'},startSample:48000,endSample:96000,status:'reviewed',method:'manual',createdAt:'2026-09-07T00:00:00Z',reviewer:'Judge',...patch});
test('reviewed word and approximate word have distinct honest actions',()=>{
  assert.equal(replayChoiceLabel(entry()),'Play word');
  assert.equal(replayChoiceLabel(entry({status:'suggested',reviewer:null})),'Preview approximate word');
  assert.equal(wordReplayChoices([entry()],media,words,'112.1.0').kind,'word');
});
test('multiple occurrences stay separate and ordered rather than choosing first',()=>{
  const result=wordReplayChoices([entry({id:'r2',occurrenceId:'o2',startSample:144000,endSample:192000}),entry()],media,words,'112.1.0');
  assert.deepEqual(result.entries.map(e=>e.id),['r1','r2']);
});
test('reviewed exact ayah span is a labelled fallback, not a word interval',()=>{
  const ayah=entry({target:{kind:'ayah',wordIds:words.map(w=>w.wordId),label:'112:1'}});
  const result=wordReplayChoices([ayah],media,words,'112.1.1');
  assert.equal(result.kind,'ayah');assert.equal(replayChoiceLabel(result.entries[0]),'Play ayah');
  assert.equal(wordReplayChoices([{...ayah,status:'suggested'}],media,words,'112.1.1').kind,'none');
});
test('partial or differently ordered ayah intervals are not fabricated fallbacks',()=>{
  for(const ids of [['112.1.0'],['112.1.1','112.1.0']]) {
    assert.equal(wordReplayChoices([entry({target:{kind:'ayah',wordIds:ids,label:'112:1'}})],media,words,'112.1.1').kind,'none');
  }
});
test('recording identity, part, hash and question mismatches cannot play',()=>{
  for(const patch of [{sessionId:'other'},{segmentIndex:1},{sha256:'b'.repeat(64)},{questionFingerprint:'other'},{sampleRate:44100},{recordingCreatedAt:'2026-09-06T00:00:00Z'}]) {
    assert.equal(wordReplayChoices([entry({media:{...media,...patch}})],media,words,'112.1.0').entries.length,0);
  }
});
test('removed, invalid and superseded timings do not revive an older interval',()=>{
  const old=entry();
  for(const patch of [{status:'removed'},{endSample:99999999},{startSample:-1},{reviewer:''}]) {
    assert.equal(wordReplayChoices([old,entry({...patch,id:'r2',revision:2})],media,words,'112.1.0').entries.length,0);
  }
});
test('no selection or no timing does not infer any audio offset',()=>{
  for(const id of [null,'unknown','112.1.1']) assert.equal(wordReplayChoices([entry()],media,words,id).kind,'none');
  assert.equal(wordReplayChoices([],media,words,'112.1.0').kind,'none');
});
test('candidate derivation never changes original evidence',()=>{
  const values=[entry()];const before=JSON.stringify(values);
  wordReplayChoices(values,media,words,'112.1.0');assert.equal(JSON.stringify(values),before);
});

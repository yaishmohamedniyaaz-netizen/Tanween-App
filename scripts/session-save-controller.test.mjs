import test from 'node:test';
import assert from 'node:assert/strict';
import {SessionSaveController} from '../src/state/sessionSaveController.ts';
const tick=()=>new Promise(resolve=>setImmediate(resolve));
const deferred=()=>{let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return {promise,resolve,reject};};
function fixture() {
  const state={events:[],notes:''};let checkpoint={raw:'r1',revision:1};const calls=[];
  const repo={save(input,expected){const task=deferred();calls.push({input,expected,...task});return task.promise.then(receipt=>{checkpoint=receipt.checkpoint;return receipt;});},
    async inspect(){return {kind:'ready',current:{state,checkpoint}};}};
  const controller=new SessionSaveController(repo,{state,checkpoint});
  return {controller,calls,state,repo,finish(index){calls[index].resolve({checkpoint:{raw:`r${index+2}`,revision:index+2},legacyChanged:false});}};
}
test('rapid updates serialize saves and preserve all ledger entries in the latest snapshot',async()=>{
  const f=fixture();f.controller.stage({...f.state,events:['one']});
  f.controller.stage({...f.state,events:['one','two']});
  const last={...f.state,events:['one','two','three']};f.controller.stage(last);
  assert.equal(f.calls.length,1);assert.equal(f.controller.getSnapshot().phase,'saving');
  f.finish(0);await tick();assert.equal(f.calls.length,2);
  assert.deepEqual(f.calls[1].input.events,['one','two','three']);assert.equal(f.calls[1].expected.raw,'r2');
  f.finish(1);await tick();assert.deepEqual(f.controller.getSnapshot(),{phase:'saved',hasUnsaved:false,message:'Saved on this device'});
});
test('initial mount and StrictMode effect replay do not create a needless save',()=>{
  const f=fixture();f.controller.stage(f.state);f.controller.stage(f.state);assert.equal(f.calls.length,0);
});
test('failed saves retain newer work and retry it against the last committed checkpoint',async()=>{
  const f=fixture();f.controller.stage({...f.state,notes:'first'});f.calls[0].reject({code:'quota'});await tick();
  const latest={...f.state,notes:'newer unsaved work'};f.controller.stage(latest);
  assert.equal(f.calls.length,1);assert.equal(f.controller.getSnapshot().hasUnsaved,true);
  const retry=f.controller.retry();await tick();assert.equal(f.calls[1].input,latest);assert.equal(f.calls[1].expected.raw,'r1');
  f.finish(1);await retry;assert.equal(f.controller.getSnapshot().phase,'saved');
});
test('another tab never replaces this tab in memory or becomes its write checkpoint',async()=>{
  const f=fixture();const local={...f.state,notes:'local unsaved'};f.controller.stage(local);
  f.calls[0].reject({code:'stale'});await tick();
  f.repo.inspect=async()=>({kind:'ready',current:{state:{notes:'other'},checkpoint:{raw:'other',revision:99}}});
  await f.controller.retry();assert.equal(f.calls.length,1);assert.equal(f.controller.getCurrentState(),local);
  assert.equal(f.controller.getSnapshot().phase,'conflict');
});
test('focus inspection waits for this tab’s own save before comparing checkpoints',async()=>{
  const f=fixture();f.controller.stage({...f.state,notes:'changed'});await f.controller.check();
  f.finish(0);await tick();assert.equal(f.controller.getSnapshot().phase,'saved');
});
test('a focus check overlapping a later save rechecks instead of reporting a false conflict',async()=>{
  const f=fixture(),slow=deferred();const original=f.repo.inspect;let calls=0;
  f.repo.inspect=()=>++calls===1?slow.promise:original();
  const check=f.controller.check();f.controller.stage({...f.state,notes:'changed'});f.finish(0);await tick();
  slow.resolve({kind:'ready',current:{state:f.state,checkpoint:{raw:'r1',revision:1}}});
  assert.equal(await check,true);assert.equal(f.controller.getSnapshot().phase,'saved');
});
test('a post-commit legacy conflict stops queued saves but keeps both saved and unsaved work',async()=>{
  const f=fixture();f.controller.stage({...f.state,notes:'committed'});f.controller.stage({...f.state,notes:'pending'});
  f.calls[0].resolve({checkpoint:{raw:'r2',revision:2},legacyChanged:true});await tick();
  assert.equal(f.calls.length,1);assert.equal(f.controller.getCurrentState().notes,'pending');
  assert.equal(f.controller.getSnapshot().phase,'conflict');assert.equal(f.controller.getSnapshot().hasUnsaved,true);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {waitForRecordingStage, RecordingStartupError, createRecordingDiagnostics} from '../src/lib/recordingStartupStage.ts';
test('successful stage preserves result', async()=>assert.equal(await waitForRecordingStage(Promise.resolve(4),'storage'),4));
test('failure preserves its cause', async()=>{
 const error=new Error('quota');await assert.rejects(waitForRecordingStage(Promise.reject(error),'storage'),e=>e===error);
});
test('stalled stage settles while late rejection is handled', async()=>{
 let reject;const task=new Promise((_,no)=>{reject=no;});
 await assert.rejects(waitForRecordingStage(task,'storage',5),RecordingStartupError);
 reject(new Error('late'));await new Promise(resolve=>setTimeout(resolve,5));
});
test('late success cannot advance caller after timeout', async()=>{
 let resolve,advanced=false;const task=new Promise(yes=>{resolve=yes;});
 await assert.rejects(waitForRecordingStage(task,'storage',5).then(()=>{advanced=true;}),RecordingStartupError);
 resolve(1);await Promise.resolve();assert.equal(advanced,false);
});
test('diagnostics are opt-in, bounded and returned by copy',()=>{
 const off=createRecordingDiagnostics(false);off.record('first-chunk');assert.deepEqual(off.snapshot(),[]);
 const on=createRecordingDiagnostics(true);for(let i=0;i<45;i++)on.record('storage-read');
 assert.equal(on.snapshot().length,40);const copy=on.snapshot();copy[0].stage='failed';assert.equal(on.snapshot()[0].stage,'storage-read');
});

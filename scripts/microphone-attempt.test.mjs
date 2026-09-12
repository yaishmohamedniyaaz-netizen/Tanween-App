import test from 'node:test';
import assert from 'node:assert/strict';
import { createMicrophoneAttempt } from '../src/lib/microphoneAttempt.ts';

function fixture() {
  let time = 0, calls = 0, resolve, reject;
  const timers = new Map(); let timerId = 0;
  const controller = createMicrophoneAttempt({
    acquire: () => { calls++; return new Promise((yes,no) => {resolve=yes;reject=no;}); },
    now: () => time, timeoutMs: 20,
    schedule: fn => {timers.set(++timerId,fn);return timerId;},
    unschedule: id => timers.delete(id),
  });
  return {controller, timers, calls:()=>calls, resolve:s=>resolve(s), reject:e=>reject(e),
    advance:t=>{time=t;}, tick:()=>{for(const fn of [...timers.values()])fn();}};
}
const stream=()=>{let stops=0;return {getTracks:()=>[{stop:()=>stops++}],stops:()=>stops};};
const flush=()=>new Promise(resolve=>queueMicrotask(resolve));

test('acquisition begins synchronously; successful stream transfers once',async()=>{
 const f=fixture(),s=stream(),p=f.controller.request();assert.equal(f.calls(),1);
 f.resolve(s);const r=await p;assert.equal(r.kind,'ready');assert.equal(f.timers.size,0);
 assert.equal(f.controller.take(r.attempt),s);assert.equal(f.controller.take(r.attempt),null);
 f.controller.cancel();assert.equal(s.stops(),0); // Recorder owns it now.
});
test('double taps cannot create concurrent browser requests',async()=>{
 const f=fixture(),p=f.controller.request();assert.equal((await f.controller.request()).kind,'busy');
 assert.equal(f.calls(),1);f.controller.cancel();assert.equal((await p).kind,'cancelled');
 assert.equal((await f.controller.request()).kind,'busy');f.reject(new Error('late'));await flush();
 assert.equal(f.controller.isBrowserPending(),false);
});
test('cancelled late grant is stopped and cannot become current',async()=>{
 const f=fixture(),s=stream(),p=f.controller.request();f.controller.cancel();const r=await p;
 f.resolve(s);await flush();assert.equal(s.stops(),1);assert.equal(f.controller.isCurrent(r.attempt),false);
 assert.equal(f.controller.take(r.attempt),null);f.controller.cancel();assert.equal(s.stops(),1);
});
test('unresolved request times out without pretending browser cancellation',async()=>{
 const f=fixture(),p=f.controller.request();f.advance(20);f.tick();assert.equal((await p).kind,'timeout');
 assert.equal(f.controller.isBrowserPending(),true);assert.equal(f.timers.size,0);
 const s=stream();f.resolve(s);await flush();assert.equal(s.stops(),1);
});
test('late grant cannot bypass deadline when background timer did not run',async()=>{
 const f=fixture(),p=f.controller.request(),s=stream();f.advance(21);f.resolve(s);
 assert.equal((await p).kind,'timeout');assert.equal(s.stops(),1);
});
test('foreground deadline check releases caller and handles late rejection',async()=>{
 const f=fixture(),p=f.controller.request();f.advance(25);f.controller.checkDeadline();
 assert.equal((await p).kind,'timeout');f.reject(new Error('late'));await flush();
 assert.equal(f.controller.isBrowserPending(),false);
});
test('denial settles and allows explicit retry',async()=>{
 const f=fixture(),p=f.controller.request(),error=new Error('denied');f.reject(error);
 assert.equal((await p).error,error);const next=f.controller.request();assert.equal(f.calls(),2);
 f.controller.cancel();assert.equal((await next).kind,'cancelled');f.reject(error);await flush();
});
test('cancel after resolution but before recorder ownership stops held stream',async()=>{
 const f=fixture(),p=f.controller.request(),s=stream();f.resolve(s);const r=await p;
 f.controller.cancel();assert.equal(s.stops(),1);assert.equal(f.controller.take(r.attempt),null);
});
test('synchronous browser exceptions settle without leaked timers',async()=>{
 const c=createMicrophoneAttempt({acquire:()=>{throw new Error('unsupported');}});
 assert.equal((await c.request()).kind,'error');assert.equal(c.isBrowserPending(),false);
});

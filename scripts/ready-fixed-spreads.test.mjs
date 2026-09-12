import test from 'node:test';
import assert from 'node:assert/strict';
import {createReadyFixedSpreads} from '../src/lib/readyFixedSpreads.ts';
const tick=()=>new Promise(r=>setImmediate(r));
function fixture(){
 const jobs=[],disposed=[];
 const owner=createReadyFixedSpreads((page,signal)=>new Promise((resolve,reject)=>jobs.push({page,signal,reject,resolve:()=>resolve({geometry:{page},semantic:{page},dispose:()=>disposed.push(page)})})));
 owner.subscribe(()=>assert.ok(owner.ownedPages()<=6));
 return {owner,jobs,disposed,async finish(){jobs.at(-1).resolve();await tick();}};
}
test('ready adjacent spread switches atomically without new loads and stays pinned until commit',async()=>{
 const f=fixture();f.owner.request([100,101]);await f.finish();
 assert.equal(f.owner.getSnapshot().displayed,null);
 await f.finish();f.owner.committed(f.owner.getSnapshot().displayed);
 await f.finish();await f.finish();await f.finish();await f.finish();
 assert.equal(f.owner.ownedPages(),6);
 f.owner.request([102,103]);
 const shown=f.owner.getSnapshot().displayed;
 assert.deepEqual([...shown.pages.keys()],[102,103]);
 assert.deepEqual([...shown.semantic.values()].map(p=>p.page),[102,103]);
 assert.equal(f.jobs.filter(j=>j.page===102).length,1);
 assert.equal(f.jobs.filter(j=>j.page===103).length,1);assert.ok(!f.disposed.includes(100));
 f.owner.committed(shown);assert.ok(f.owner.ownedPages()<=6);
 f.owner.clear();f.jobs.at(-1).resolve();await tick();assert.equal(f.owner.ownedPages(),0);
});
test('rapid requests dispose stale decode and only admit latest whole spread',async()=>{
 const f=fixture();f.owner.request([100,101]);const old=f.jobs[0];
 f.owner.request([300,301]);f.owner.request([500,501]);
 old.resolve();await tick();assert.deepEqual(f.disposed,[100]);
 assert.equal(f.jobs.at(-1).page,500);await f.finish();await f.finish();
 assert.equal(f.owner.getSnapshot().displayed.page,500);f.owner.clear();await f.finish();
 assert.equal(f.owner.ownedPages(),0);
});
test('failed second page cannot replace old spread; retry and partial cleanup work',async()=>{
 const f=fixture();f.owner.request([100,101]);await f.finish();await f.finish();
 const shown=f.owner.getSnapshot().displayed;f.owner.committed(shown);
 f.owner.request([400,401]);await f.finish();await f.finish();
 assert.equal(f.jobs.at(-1).page,401);f.jobs.at(-1).reject(new Error('offline'));await tick();
 assert.equal(f.owner.getSnapshot().displayed,shown);assert.equal(f.owner.getSnapshot().error,'offline');
 assert.ok(f.disposed.includes(400));f.owner.retry();
 // Finish/abort any background neighbour before the requested retry.
 while(f.jobs.at(-1).page!==400){await f.finish();}
 await f.finish();await f.finish();assert.equal(f.owner.getSnapshot().displayed.page,400);
 f.owner.clear();await f.finish();
});
test('single pages and book ends never request outside 1–604; clear supports reuse',async()=>{
 const f=fixture();f.owner.request([604]);await f.finish();f.owner.committed(f.owner.getSnapshot().displayed);await f.finish();
 assert.deepEqual(f.jobs.map(j=>j.page),[604,603]);
 f.owner.clear();f.owner.request([1,2]);await f.finish();await f.finish();
 assert.equal(f.owner.getSnapshot().displayed.page,1);
 f.owner.clear();await f.finish();assert.ok(f.jobs.every(j=>j.page>=1&&j.page<=604));
});

test('background failure stays silent; visiting that spread retries it',async()=>{
 const f=fixture();f.owner.request([100,101]);await f.finish();await f.finish();
 const shown=f.owner.getSnapshot().displayed;f.owner.committed(shown);
 assert.equal(f.jobs.at(-1).page,102);
 f.jobs.at(-1).reject(new Error('background offline'));await tick();
 assert.equal(f.owner.getSnapshot().error,null);assert.equal(f.owner.getSnapshot().displayed,shown);
 f.owner.request([102,103]);await f.finish();
 assert.equal(f.jobs.at(-1).page,102);await f.finish();await f.finish();
 assert.equal(f.owner.getSnapshot().displayed.page,102);
 f.owner.clear();await f.finish();assert.equal(f.owner.ownedPages(),0);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { createReadyFixedPages } from '../src/lib/readyFixedPages.ts';
const tick = () => new Promise(resolve => setImmediate(resolve));
function fixture() {
  const jobs = [], disposed = [];
  const owner = createReadyFixedPages((page, signal) => new Promise((resolve, reject) => {
    jobs.push({ page, signal, reject, resolve: () => resolve({ geometry: { page }, semantic: { page }, dispose: () => disposed.push(page) }) });
  }));
  return { owner, jobs, disposed, async finish() { jobs.at(-1).resolve(); await tick(); } };
}
test('ready neighboring page is admitted synchronously with matching maps, no reload', async () => {
  const f = fixture(); f.owner.request(100); await f.finish(); f.owner.committed(100);
  await f.finish(); await f.finish();
  assert.equal(f.owner.ownedPages(), 3);
  f.owner.request(99);
  assert.equal(f.owner.getSnapshot().displayed.page, 99);
  assert.equal(f.owner.getSnapshot().displayed.pages.get(99).page, 99);
  assert.equal(f.owner.getSnapshot().displayed.semantic.get(99).page, 99);
  assert.equal(f.jobs.filter(job => job.page === 99).length, 1);
  assert.ok(!f.disposed.includes(100));
  f.owner.committed(99);
  assert.ok(f.owner.ownedPages() <= 3);
  f.owner.clear();
});
test('cold jump pins the old artwork until replacement commit and bounds admission', async () => {
  const f = fixture(); f.owner.request(100); await f.finish(); f.owner.committed(100);
  await f.finish(); await f.finish();
  f.owner.request(255);
  assert.equal(f.owner.getSnapshot().displayed.page, 100);
  assert.ok(!f.disposed.includes(100)); assert.ok(f.owner.ownedPages() <= 3);
  await f.finish();
  assert.equal(f.owner.getSnapshot().displayed.page, 255);
  assert.ok(!f.disposed.includes(100)); assert.ok(f.owner.ownedPages() <= 3);
  f.owner.committed(255);
  assert.ok(f.disposed.includes(100)); f.owner.clear();
});
test('late cancelled decode cannot replace the latest request or leak its URL', async () => {
  const f = fixture(); f.owner.request(100); const stale = f.jobs[0];
  f.owner.request(255); f.owner.request(601);
  assert.ok(stale.signal.aborted); assert.equal(f.jobs.length, 1);
  stale.resolve(); await tick();
  assert.deepEqual(f.disposed, [100]); assert.equal(f.jobs.at(-1).page, 601);
  await f.finish(); assert.equal(f.owner.getSnapshot().displayed.page, 601);
  f.owner.clear();
});
test('failed target preserves the displayed page and retries explicitly', async () => {
  const f = fixture(); f.owner.request(100); await f.finish(); f.owner.committed(100);
  f.owner.request(255); await f.finish(); // abort the neighbor already in flight
  f.jobs.at(-1).reject(new Error('Missing asset')); await tick();
  assert.equal(f.owner.getSnapshot().displayed.page, 100);
  assert.equal(f.owner.getSnapshot().error, 'Missing asset');
  f.owner.retry(); await f.finish(); // finish existing background work
  assert.equal(f.jobs.at(-1).page, 255);
  await f.finish(); assert.equal(f.owner.getSnapshot().displayed.page, 255);
  f.owner.clear();
});
test('clear and restart invalidate previous work, including StrictMode cleanup', async () => {
  const f = fixture(); f.owner.request(1); const stale = f.jobs[0];
  f.owner.clear(); f.owner.request(604); stale.resolve(); await tick();
  assert.deepEqual(f.disposed, [1]); assert.equal(f.jobs.at(-1).page, 604);
  await f.finish(); f.owner.committed(604); await f.finish();
  assert.deepEqual(f.jobs.map(j => j.page), [1, 604, 603]);
  f.owner.clear(); assert.equal(f.owner.getSnapshot().displayed, null);
  assert.deepEqual(f.disposed.sort((a,b)=>a-b), [1, 603, 604]);
});

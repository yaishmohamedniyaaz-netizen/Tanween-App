import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { createHash, webcrypto } from 'node:crypto';
import vm from 'node:vm';
import worker from '../worker/index.js';

const html = '<!doctype html><html><body>new app</body></html>';
const origin = 'https://example.test';
const sha = value => createHash('sha256').update(value).digest('hex');
const assets = { fetch: async request => new Response(
  new URL(request.url).pathname === '/missing' ? 'missing' : html,
  { status: new URL(request.url).pathname === '/missing' ? 404 : 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=0, must-revalidate' } }) };

test('HTML delivery preserves exact bytes and existing cache policy on root and SPA fallback', async () => {
  for (const path of ['/', '/index.html', '/?release=1', '/missing']) {
    const response = await worker.fetch(new Request(origin + path, { headers: { Accept: 'text/html' } }), { ASSETS: assets });
    assert.equal(response.status, 200);
    assert.equal(await response.text(), html);
    assert.equal(response.headers.get('Cache-Control'), 'public, max-age=0, must-revalidate, no-transform');
  }
});

test('assets and real non-document 404s remain unchanged', async () => {
  const response = new Response('asset', { status: 404, headers: { 'Content-Type': 'application/json' } });
  assert.equal(await worker.fetch(new Request(origin + '/missing.json'), { ASSETS: { fetch: async () => response } }), response);
});

async function lifecycle({ transformed = false, corrupt = false, pinned = false } = {}) {
  const handlers = new Map();
  const stored = new Map([['tahqeeq-static-old', new Map([['/', new Response('old app')]])],
    ['tahqeeq-mushaf-artwork-preserved', new Map([['saved', new Response('saved page')]])]]);
  const keyOf = request => new URL(typeof request === 'string' ? request : request.url, origin).pathname;
  const network = async request => {
    if (keyOf(request) === '/app-shell-test.bin') return new Response(html + (corrupt ? 'corrupt' : ''));
    if (keyOf(request) !== '/') return new Response('asset');
    const response = await worker.fetch(new Request(origin), { ASSETS: assets });
    // Model the documented edge injection: only HTML without no-transform changes.
    const inject = transformed || !response.headers.get('Cache-Control')?.includes('no-transform');
    return new Response(html + (inject ? '<script>edge injection</script>' : corrupt ? 'corrupt' : ''));
  };
  const cacheStorage = {
    open: async name => {
      if (!stored.has(name)) stored.set(name, new Map());
      const values = stored.get(name);
      return {
        addAll: async requests => { for (const request of requests) values.set(keyOf(request), await network(request)); },
        match: async request => values.get(keyOf(request))?.clone(),
        put: async (request, response) => values.set(keyOf(request), response.clone()),
      };
    },
    keys: async () => [...stored.keys()],
    delete: async name => stored.delete(name),
  };
  let claimed = 0;
  class RelativeRequest extends Request { constructor(input, init) { super(typeof input === 'string' ? new URL(input, origin) : input, init); } }
  const source = readFileSync(new URL('../public/sw.js', import.meta.url), 'utf8')
    .replace('/* __TAHQEEQ_BUILD_PRECACHE__ */ []', '["/"]')
    .replace('/* __TAHQEEQ_FIXED_PACKAGE__ */ null', JSON.stringify({ version: 'test', ...(pinned ? { shellUrl: '/app-shell-test.bin' } : {}), core: [], shellHashes: { '/': sha(html) } }));
  vm.runInNewContext(source, { self: { location: { origin }, addEventListener: (name, fn) => handlers.set(name, fn),
    clients: { matchAll: async () => [], claim: async () => { claimed++; } } },
    caches: cacheStorage, fetch: network, Request: RelativeRequest, Response, URL, crypto: webcrypto, console: { log() {} } });
  let pending;
  const run = async name => { handlers.get(name)({ waitUntil: promise => { pending = promise; } }); await pending; };
  return { stored, run, claimed: () => claimed };
}

test('transformed or corrupt HTML rejects the new worker while retaining old app and saved Mushaf', async () => {
  for (const options of [{ transformed: true }, { corrupt: true }]) {
    const state = await lifecycle(options);
    await assert.rejects(state.run('install'), /App shell does not match/);
    assert.equal(state.stored.has('tahqeeq-static-app-v30'), false);
    assert.equal(await state.stored.get('tahqeeq-static-old').get('/').text(), 'old app');
    assert.equal(state.stored.has('tahqeeq-mushaf-artwork-preserved'), true);
    assert.equal(state.claimed(), 0);
  }
});

test('unchanged HTML installs; old windows retain control until natural activation', async () => {
  const state = await lifecycle({ transformed: true, pinned: true });
  await state.run('install');
  assert.equal(state.claimed(), 0);
  assert.equal(await state.stored.get('tahqeeq-static-old').get('/').text(), 'old app');
  await state.run('activate');
  assert.equal(state.claimed(), 1);
  assert.equal(state.stored.has('tahqeeq-static-old'), true);
  assert.equal(state.stored.has('tahqeeq-mushaf-artwork-preserved'), true);
  assert.equal(await state.stored.get('tahqeeq-static-app-v30').get('/').text(), html);
  assert.equal(state.stored.get('tahqeeq-static-app-v30').get('/').headers.get('Content-Type'), 'text/html; charset=utf-8');
});

test('a corrupted pinned document is rejected even when normal HTML is available', async () => {
  const state = await lifecycle({ pinned: true, corrupt: true });
  await assert.rejects(state.run('install'), /App shell does not match/);
  assert.equal(state.stored.has('tahqeeq-static-app-v30'), false);
  assert.equal(state.stored.has('tahqeeq-static-old'), true);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createFixedMushafLoader, validateFixedManifest, verifyFixedAsset } from '../src/lib/fixedMushafPackage.ts';

const descriptor = JSON.parse(fs.readFileSync(new URL('../src/data/fixedMushafPackage.json', import.meta.url)));
const file = asset => fs.readFileSync(new URL(`../public${asset.url}`, import.meta.url));
const bytes = asset => { const raw = file(asset); return raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.byteLength); };
const manifest = JSON.parse(file(descriptor.manifest));
async function withBrowser(callback) {
  const originals = { fetch: globalThis.fetch, Image: globalThis.Image,
    create: URL.createObjectURL, revoke: URL.revokeObjectURL };
  const live = new Set(), requests = [];
  let sequence = 0;
  globalThis.fetch = async url => {
    requests.push(url);
    return new Response(fs.readFileSync(new URL(`../public${url}`, import.meta.url)));
  };
  globalThis.Image = class { naturalWidth = 1920; naturalHeight = 3106; async decode() {} };
  URL.createObjectURL = () => { const url = `blob:test-${++sequence}`; live.add(url); return url; };
  URL.revokeObjectURL = url => live.delete(url);
  try { await callback({ live, requests }); }
  finally { globalThis.fetch = originals.fetch; globalThis.Image = originals.Image;
    URL.createObjectURL = originals.create; URL.revokeObjectURL = originals.revoke; }
}

test('the complete package index is versioned and has truthful byte totals', async () => {
  await verifyFixedAsset(bytes(descriptor.manifest), descriptor.manifest);
  assert.equal(validateFixedManifest(manifest, descriptor).pages.length, 604);
  const swapped = structuredClone(manifest);
  swapped.pages[0].image = swapped.pages[1].image;
  assert.throws(() => validateFixedManifest(swapped, descriptor));
  assert.throws(() => validateFixedManifest({ ...manifest, dataVersion: 'different' }, descriptor));
  assert.throws(() => validateFixedManifest(manifest, { ...descriptor, totalBytes: 1 }));
});

test('all shipped geometry and semantic bytes match the manifest', async () => {
  for (const page of manifest.pages) {
    await verifyFixedAsset(bytes(page.geometry), page.geometry);
    await verifyFixedAsset(bytes(page.semantic), page.semantic);
  }
});

test('arbitrary pages load without fetching or decoding the full corpus', async () => withBrowser(async ({ live, requests }) => {
  const loader = createFixedMushafLoader(descriptor);
  for (const number of [4, 178, 400, 602]) {
    const page = await loader.load(number);
    assert.equal(page.geometry.page, number);
    assert.equal(page.semantic.page, number);
    assert.equal(live.size, 1);
    page.dispose(); page.dispose();
    assert.equal(live.size, 0);
  }
  assert.equal(requests.length, 13); // One manifest and exactly three files per requested page.
}));

test('corrupt manifest fails closed and retry uses a fresh response', async () => withBrowser(async () => {
  const original = fetch;
  let corrupt = true;
  globalThis.fetch = url => corrupt && url === descriptor.manifest.url
    ? Promise.resolve(new Response('{}')) : original(url);
  const loader = createFixedMushafLoader(descriptor);
  await assert.rejects(loader.load(1), /incomplete/);
  corrupt = false;
  const page = await loader.load(1); page.dispose();
}));

test('real loader replaces stale packaged regions without changing cached assets', async () => withBrowser(async () => {
  const entry=manifest.pages[256];
  const original=file(entry.geometry);
  const baked=JSON.parse(original);
  assert.equal(baked.words.find(w=>w.wid==='14.14.0').region[2],1135.75);
  const page=await createFixedMushafLoader(descriptor).load(257);
  assert.equal(page.geometry.words.find(w=>w.wid==='14.14.0').region[2],1243.5);
  assert.deepEqual(file(entry.geometry),original);
  page.dispose();
}));

test('same-size corrupt artwork is rejected before a blob is allocated', async () => withBrowser(async ({ live }) => {
  const original = fetch;
  globalThis.fetch = url => url.endsWith('/p4.png')
    ? Promise.resolve(new Response(new Uint8Array(manifest.pages[3].image.bytes))) : original(url);
  await assert.rejects(createFixedMushafLoader(descriptor).load(4), /does not match/);
  assert.equal(live.size, 0);
}));

test('abort during decoding and wrong dimensions both release the image', async () => withBrowser(async ({ live }) => {
  const abort = new AbortController();
  globalThis.Image = class { naturalWidth = 1920; naturalHeight = 3106; async decode() { abort.abort(); } };
  await assert.rejects(createFixedMushafLoader(descriptor).load(4, abort.signal), { name: 'AbortError' });
  assert.equal(live.size, 0);
  globalThis.Image = class { naturalWidth = 1; naturalHeight = 1; async decode() {} };
  await assert.rejects(createFixedMushafLoader(descriptor).load(4), /image size/);
  assert.equal(live.size, 0);
}));

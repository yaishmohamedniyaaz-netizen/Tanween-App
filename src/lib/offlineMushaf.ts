import descriptor from '../data/fixedMushafPackage.json';
import { createFixedMushafLoader, fetchFixedAsset, type FixedAsset, type FixedPackagePage } from './fixedMushafPackage.ts';
import { FIXED_MUSHAF_CACHE, FIXED_MUSHAF_CHANGED, readCachedFixedAsset, readFixedAsset, storeFixedAsset } from './fixedMushafStorage.ts';

export const OFFLINE_MUSHAF_TOTAL_PAGES = 604;
export const OFFLINE_MUSHAF_APPROX_BYTES = descriptor.totalBytes;
export const OFFLINE_MUSHAF_PACKAGE_VERSION = descriptor.version;
export const OFFLINE_MUSHAF_SIZE_LABEL = `${Math.ceil(descriptor.totalBytes / 1_000_000)} MB`;
export type OfflineMushafPhase = 'checking' | 'available' | 'downloading' | 'paused' | 'complete' | 'error' | 'unsupported';
export interface OfflineMushafState { phase: OfflineMushafPhase; readyPages: number; totalPages: number; error: string | null }
const loader = createFixedMushafLoader(descriptor, readFixedAsset);
const listeners = new Set<() => void>();
let initialized = false, pauseRequested = false;
let controller: AbortController | null = null;
let downloadPromise: Promise<void> | null = null;
let scanGeneration = 0;
let state: OfflineMushafState = { phase: 'checking', readyPages: 0, totalPages: 604, error: null };
const assetsOf = (page: FixedPackagePage) => [page.image, page.geometry, page.semantic];
function updateState(patch: Partial<OfflineMushafState>) {
  const next = { ...state, ...patch };
  if (JSON.stringify(next) === JSON.stringify(state)) return;
  state = next; listeners.forEach(listener => listener());
}
export function getOfflineMushafState() { return state; }
export function subscribeOfflineMushaf(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; }
function supported() { return typeof window !== 'undefined' && typeof caches !== 'undefined' && typeof fetch === 'function'; }

/** The controlling worker must prove the current shell is cached, not just installed. */
export async function offlineShellReady(repair = false): Promise<boolean> {
  const worker = navigator.serviceWorker?.controller;
  if (!worker) return false;
  return new Promise(resolve => {
    const channel = new MessageChannel();
    const finish = (ready: boolean) => { clearTimeout(timer); channel.port1.close(); resolve(ready); };
    const timer = setTimeout(() => finish(false), repair ? 30000 : 3000);
    channel.port1.onmessage = event => finish(event.data?.ready === true && event.data?.version === descriptor.version);
    worker.postMessage({ type: 'VERIFY_OFFLINE_SHELL', repair }, [channel.port2]);
  });
}
async function scan(signal?: AbortSignal) {
  const manifest = await loader.manifest();
  const ready = new Set<number>(), missing: FixedAsset[] = [];
  for (const page of manifest.pages) {
    signal?.throwIfAborted();
    const present = await Promise.all(assetsOf(page).map(asset => readCachedFixedAsset(asset)));
    present.forEach((bytes, i) => { if (!bytes) missing.push(assetsOf(page)[i]); });
    if (present.every(Boolean)) ready.add(page.page);
  }
  const manifestSaved = Boolean(await readCachedFixedAsset(descriptor.manifest));
  return { manifest, ready, missing, manifestSaved };
}
export async function refreshOfflineMushaf(): Promise<void> {
  if (downloadPromise || !supported()) return;
  const generation = ++scanGeneration;
  try {
    const result = await scan();
    const shell = result.manifestSaved && result.ready.size === 604 && await offlineShellReady();
    if (generation !== scanGeneration || downloadPromise) return;
    updateState({ readyPages: result.ready.size, phase: shell ? 'complete' : 'available', error: null });
  } catch {
    if (generation === scanGeneration && !downloadPromise) updateState({ phase: 'error', error: 'Offline files could not be checked. Reconnect and retry.' });
  }
}
export function initializeOfflineMushaf() {
  if (initialized) return;
  initialized = true;
  if (!supported()) { updateState({ phase: 'unsupported' }); return; }
  window.addEventListener(FIXED_MUSHAF_CHANGED, () => {
    if (state.phase === 'complete') {
      updateState({ phase: 'checking' });
      void refreshOfflineMushaf();
    }
  });
  window.addEventListener('online', () => { void refreshOfflineMushaf(); });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && state.phase === 'complete') void refreshOfflineMushaf();
  });
  navigator.serviceWorker?.addEventListener('controllerchange', () => { void refreshOfflineMushaf(); });
  void refreshOfflineMushaf();
}
async function assertEnoughStorage(bytes: number) {
  if (!navigator.storage?.estimate) return;
  let estimate: StorageEstimate;
  try { estimate = await navigator.storage.estimate(); } catch { return; }
  if (Number.isFinite(estimate.quota) && Number.isFinite(estimate.usage) && estimate.quota! - estimate.usage! < bytes * 1.2) {
    throw new Error('There is not enough device storage. Existing judging records and downloads have been kept.');
  }
}
async function installAsset(asset: FixedAsset, signal: AbortSignal) {
  if (await readCachedFixedAsset(asset)) return;
  const bytes = await fetchFixedAsset(asset, signal);
  signal.throwIfAborted();
  await storeFixedAsset(asset, bytes);
}
async function performDownload(signal: AbortSignal) {
  const { manifest, ready, missing } = await scan(signal);
  updateState({ readyPages: ready.size });
  await assertEnoughStorage(missing.reduce((sum, asset) => sum + asset.bytes, 0) + descriptor.manifest.bytes);
  await installAsset(descriptor.manifest, signal);
  const pages = manifest.pages.filter(page => !ready.has(page.page));
  let cursor = 0;
  const worker = async () => {
    while (cursor < pages.length) {
      signal.throwIfAborted();
      const page = pages[cursor++];
      for (const asset of assetsOf(page)) await installAsset(asset, signal);
      signal.throwIfAborted();
      ready.add(page.page); updateState({ readyPages: ready.size });
    }
  };
  let firstFailure: unknown;
  await Promise.allSettled(Array.from({ length: 3 }, async () => {
    try { await worker(); } catch (error) { firstFailure ??= error; controller?.abort(); }
  }));
  if (firstFailure) throw firstFailure;
  signal.throwIfAborted();
  const verified = await scan(signal);
  if (verified.ready.size !== 604 || !verified.manifestSaved) throw new Error('Some Mushaf files are missing. Retry to repair them.');
  if (!await offlineShellReady(true)) throw new Error('Pages are downloaded. Reconnect, close all Tahqeeq windows, reopen, then retry to finish offline setup.');
  updateState({ phase: 'complete', readyPages: 604, error: null });
}
export function startOfflineMushafDownload(): Promise<void> {
  if (downloadPromise) return downloadPromise;
  if (!supported()) { updateState({ phase: 'unsupported' }); return Promise.resolve(); }
  scanGeneration++;
  pauseRequested = false; controller = new AbortController();
  const signal = controller.signal;
  updateState({ phase: 'downloading', error: null });
  void navigator.storage?.persist?.().catch(() => false);
  const run = () => performDownload(signal);
  const pending = (async () => {
    if (navigator.locks) await navigator.locks.request('tahqeeq-mushaf-install', { signal }, run);
    else await run();
  })()
    .catch((error: unknown) => {
      updateState(pauseRequested ? { phase: 'paused', error: null } : {
        phase: 'error', error: error instanceof Error ? error.message : 'Download interrupted. Retry to continue.',
      });
    }).finally(() => { controller = null; downloadPromise = null; });
  downloadPromise = pending;
  return pending;
}
export function pauseOfflineMushafDownload() {
  if (state.phase !== 'downloading') return;
  pauseRequested = true; controller?.abort(); updateState({ phase: 'paused', error: null });
}
export async function removeOfflineMushafDownload() {
  const pending = downloadPromise; pauseOfflineMushafDownload(); await pending; scanGeneration++;
  updateState({ phase: 'checking', error: null });
  const remove = async () => {
    const manifest = await loader.manifest();
    const cache = await caches.open(FIXED_MUSHAF_CACHE);
    for (const page of manifest.pages) if (page.page !== 604) {
      for (const asset of assetsOf(page)) await cache.delete(asset.url);
    }
  };
  try {
    if (navigator.locks) await navigator.locks.request('tahqeeq-mushaf-install', remove); else await remove();
    await refreshOfflineMushaf();
  } catch {
    updateState({ phase: 'error', error: 'The downloaded files could not be removed. Judging records have not been changed.' });
  }
}

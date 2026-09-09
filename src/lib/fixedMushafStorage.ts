import descriptor from '../data/fixedMushafPackage.json';
import { fetchFixedAsset, verifyFixedAsset, type FixedAsset, type FixedAssetReader } from './fixedMushafPackage.ts';

export const FIXED_MUSHAF_CACHE = `tahqeeq-mushaf-artwork-${descriptor.version}`;
export const FIXED_MUSHAF_CHANGED = 'tahqeeq:artwork-cache-changed';

export async function readCachedFixedAsset(asset: FixedAsset): Promise<ArrayBuffer | null> {
  if (typeof caches === 'undefined') return null;
  const cache = await caches.open(FIXED_MUSHAF_CACHE);
  const response = await cache.match(asset.url, { ignoreVary: true });
  if (!response) {
    if (typeof window !== 'undefined') window.dispatchEvent(new Event(FIXED_MUSHAF_CHANGED));
    return null;
  }
  try {
    const bytes = await response.arrayBuffer();
    await verifyFixedAsset(bytes, asset);
    return bytes;
  } catch {
    await cache.delete(asset.url);
    if (typeof window !== 'undefined') window.dispatchEvent(new Event(FIXED_MUSHAF_CHANGED));
    return null;
  }
}

export async function storeFixedAsset(asset: FixedAsset, bytes: ArrayBuffer) {
  const cache = await caches.open(FIXED_MUSHAF_CACHE);
  await cache.put(asset.url, new Response(bytes, { headers: {
    'Content-Type': asset.url.endsWith('.png') ? 'image/png' : 'application/json',
  } }));
}

/** Online viewing tolerates full/unavailable storage; explicit downloads do not. */
export const readFixedAsset: FixedAssetReader = async (asset, signal) => {
  signal?.throwIfAborted();
  let cached: ArrayBuffer | null = null;
  try { cached = await readCachedFixedAsset(asset); } catch { /* Online remains usable. */ }
  if (cached) { signal?.throwIfAborted(); return cached; }
  const bytes = await fetchFixedAsset(asset, signal);
  signal?.throwIfAborted();
  try { await storeFixedAsset(asset, bytes); } catch { /* Download UI reports storage failure separately. */ }
  return bytes;
};

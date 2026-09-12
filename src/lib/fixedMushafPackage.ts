import type { FixedPageGeometry } from './fixedMushafGeometry.ts';
import { assertFixedPageMatches, buildFixedPageGeometry } from './fixedMushafGeometry.ts';
import type { MushafPage } from './page.ts';
import { MUSHAF_DATA_VERSION } from './mushafAssets.ts';

export interface FixedAsset { url: string; bytes: number; sha256: string }
export interface FixedPackageDescriptor { version: string; manifest: FixedAsset; totalBytes: number }
export interface FixedPackagePage {
  page: number;
  width: number;
  height: number;
  image: FixedAsset;
  geometry: FixedAsset;
  semantic: FixedAsset;
}
export interface FixedPackageManifest {
  schema: 1;
  version: string;
  dataVersion: string;
  totalAssetBytes: number;
  pages: FixedPackagePage[];
}
export interface LoadedFixedPage {
  geometry: FixedPageGeometry;
  semantic: MushafPage;
  dispose(): void;
}

export async function verifyFixedAsset(bytes: ArrayBuffer, asset: FixedAsset): Promise<void> {
  if (bytes.byteLength !== asset.bytes) throw new Error('Mushaf file is incomplete');
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  const actual = Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('');
  if (actual !== asset.sha256) throw new Error('Mushaf file does not match this edition');
}

/** Shared online reader. The offline package manager can supply a verified cache reader. */
export type FixedAssetReader = (asset: FixedAsset, signal?: AbortSignal) => Promise<ArrayBuffer>;
export const fetchFixedAsset: FixedAssetReader = async (asset, signal) => {
  const response = await fetch(asset.url, { signal });
  if (!response.ok) throw new Error('Mushaf page unavailable. Check your connection and retry.');
  const bytes = await response.arrayBuffer();
  await verifyFixedAsset(bytes, asset);
  return bytes;
};

export function validateFixedManifest(value: FixedPackageManifest, descriptor: FixedPackageDescriptor) {
  if (value.schema !== 1 || value.version !== descriptor.version || value.dataVersion !== MUSHAF_DATA_VERSION || value.pages?.length !== 604) {
    throw new Error('Incorrect Mushaf package');
  }
  const prefix = `/mushaf/${descriptor.version}/`;
  let total = 0;
  const paths = new Set<string>();
  value.pages.forEach((page, i) => {
    if (page.page !== i + 1 || page.width !== 1920 || page.height !== 3106) throw new Error('Incorrect Mushaf page index');
    if (page.image?.url !== `${prefix}p${page.page}.png` ||
        page.geometry?.url !== `${prefix}p${page.page}.json` ||
        page.semantic?.url !== `${prefix}p${page.page}.text.json`) throw new Error('Incorrect Mushaf page assets');
    for (const asset of [page.image, page.geometry, page.semantic]) {
      if (!asset || !asset.url.startsWith(prefix) || asset.url.slice(prefix.length).includes('/') ||
          !/^p\d+\.(?:png|json|text\.json)$/.test(asset.url.slice(prefix.length)) ||
          paths.has(asset.url) || !Number.isSafeInteger(asset.bytes) || asset.bytes <= 0 ||
          !/^[a-f0-9]{64}$/.test(asset.sha256)) throw new Error('Incorrect Mushaf asset index');
      paths.add(asset.url); total += asset.bytes;
    }
  });
  if (total !== value.totalAssetBytes || total + descriptor.manifest.bytes !== descriptor.totalBytes) {
    throw new Error('Incorrect Mushaf package size');
  }
  return value;
}

/** No global decoded-image cache: the owner explicitly releases each visible page. */
export function createFixedMushafLoader(descriptor: FixedPackageDescriptor, read: FixedAssetReader = fetchFixedAsset) {
  let manifestPromise: Promise<FixedPackageManifest> | undefined;
  function manifest() {
    return manifestPromise ??= read(descriptor.manifest).then(bytes =>
      validateFixedManifest(JSON.parse(new TextDecoder().decode(bytes)), descriptor)
    ).catch(error => { manifestPromise = undefined; throw error; });
  }
  async function load(page: number, signal?: AbortSignal): Promise<LoadedFixedPage> {
    if (!Number.isInteger(page) || page < 1 || page > 604) throw new Error('Invalid Mushaf page');
    signal?.throwIfAborted();
    const index = await manifest();
    signal?.throwIfAborted();
    const entry = index.pages[page - 1];
    const [imageBytes, geometryBytes, semanticBytes] = await Promise.all(
      [entry.image, entry.geometry, entry.semantic].map(asset => read(asset, signal)),
    );
    signal?.throwIfAborted();
    const source = JSON.parse(new TextDecoder().decode(geometryBytes));
    const semantic = JSON.parse(new TextDecoder().decode(semanticBytes)) as MushafPage;
    if (source.page !== page || source.width !== entry.width || source.height !== entry.height) {
      throw new Error('Page image and word regions do not match');
    }
    assertFixedPageMatches(source, semantic);
    // Cached package bytes are immutable and verified above. Derive current
    // runtime partitions from their original bounds, not baked-in old regions.
    const geometry = buildFixedPageGeometry(source);
    const url = URL.createObjectURL(new Blob([imageBytes], { type: 'image/png' }));
    try {
      const image = new Image(); image.src = url;
      await image.decode();
      signal?.throwIfAborted();
      if (image.naturalWidth !== entry.width || image.naturalHeight !== entry.height) throw new Error('Incorrect Mushaf image size');
      let disposed = false;
      return { geometry: { ...geometry, image: url, imageSha256: entry.image.sha256 }, semantic,
        // Retain the decoded image while its owner holds this page.
        dispose() { if (!disposed) { disposed = true; image.src = ''; URL.revokeObjectURL(url); } } };
    } catch (error) { URL.revokeObjectURL(url); throw error; }
  }
  async function text(page: number, signal?: AbortSignal): Promise<MushafPage> {
    if (!Number.isInteger(page) || page < 1 || page > 604) throw new Error('Invalid Mushaf page');
    const index = await manifest();
    signal?.throwIfAborted();
    const bytes = await read(index.pages[page - 1].semantic, signal);
    const result = JSON.parse(new TextDecoder().decode(bytes)) as MushafPage;
    if (result.page !== page) throw new Error('Incorrect Mushaf semantic page');
    return result;
  }
  return { manifest, load, text, descriptor };
}

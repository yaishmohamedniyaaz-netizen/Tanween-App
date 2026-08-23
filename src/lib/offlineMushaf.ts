import { pageAssetUrl, validateMushafPageAsset } from "./page";
import { qcfFontUrl } from "./qcfFont";
import {
  OFFLINE_MUSHAF_APPROX_BYTES,
  OFFLINE_MUSHAF_FONT_CACHE,
  OFFLINE_MUSHAF_PAGE_CACHE,
  OFFLINE_MUSHAF_TOTAL_PAGES,
  offlineMushafAssetPage,
  offlineMushafAssetPairs,
  readyOfflineMushafPages,
} from "./mushafAssets.ts";

export {
  OFFLINE_MUSHAF_APPROX_BYTES,
  OFFLINE_MUSHAF_FONT_CACHE,
  OFFLINE_MUSHAF_PACKAGE_VERSION,
  OFFLINE_MUSHAF_PAGE_CACHE,
  OFFLINE_MUSHAF_TOTAL_PAGES,
  offlineMushafAssetPairs,
  readyOfflineMushafPages,
} from "./mushafAssets.ts";

export type OfflineMushafPhase =
  | "checking"
  | "available"
  | "downloading"
  | "paused"
  | "complete"
  | "error"
  | "unsupported";

export interface OfflineMushafState {
  phase: OfflineMushafPhase;
  readyPages: number;
  totalPages: number;
  error: string | null;
}

const DOWNLOAD_CONCURRENCY = 4;
const CORE_OFFLINE_PAGE = 604;

let initialized = false;
let downloadController: AbortController | null = null;
let downloadPromise: Promise<void> | null = null;
let pauseRequested = false;
let state: OfflineMushafState = {
  phase: "checking",
  readyPages: 0,
  totalPages: OFFLINE_MUSHAF_TOTAL_PAGES,
  error: null,
};

const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function updateState(patch: Partial<OfflineMushafState>) {
  const next = { ...state, ...patch };
  if (
    next.phase === state.phase &&
    next.readyPages === state.readyPages &&
    next.totalPages === state.totalPages &&
    next.error === state.error
  ) {
    return;
  }
  state = next;
  emit();
}

function supportsOfflineMushaf(): boolean {
  return typeof window !== "undefined" &&
    typeof navigator !== "undefined" &&
    typeof caches !== "undefined" &&
    typeof fetch === "function";
}

async function scanReadyPages(): Promise<number[]> {
  const [pageCache, fontCache] = await Promise.all([
    caches.open(OFFLINE_MUSHAF_PAGE_CACHE),
    caches.open(OFFLINE_MUSHAF_FONT_CACHE),
  ]);
  const [pageRequests, fontRequests] = await Promise.all([
    pageCache.keys(),
    fontCache.keys(),
  ]);
  return readyOfflineMushafPages(
    pageRequests.map((request) => request.url),
    fontRequests.map((request) => request.url),
  );
}

export function getOfflineMushafState(): OfflineMushafState {
  return state;
}

export function subscribeOfflineMushaf(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function initializeOfflineMushaf(): void {
  if (initialized) return;
  initialized = true;
  if (!supportsOfflineMushaf()) {
    updateState({ phase: "unsupported", error: null });
    return;
  }

  void scanReadyPages()
    .then((readyPages) => {
      updateState({
        phase: readyPages.length === OFFLINE_MUSHAF_TOTAL_PAGES
          ? "complete"
          : "available",
        readyPages: readyPages.length,
        error: null,
      });
    })
    .catch(() => {
      updateState({
        phase: "error",
        error: "Offline storage could not be checked.",
      });
    });
}

async function assertEnoughStorage(missingPages: number): Promise<void> {
  if (!navigator.storage?.estimate || missingPages <= 0) return;
  let estimate: StorageEstimate;
  try {
    estimate = await navigator.storage.estimate();
  } catch {
    return;
  }
  if (!Number.isFinite(estimate.quota) || !Number.isFinite(estimate.usage)) return;
  const available = Math.max(0, estimate.quota! - estimate.usage!);
  const remainingPayload =
    OFFLINE_MUSHAF_APPROX_BYTES * (missingPages / OFFLINE_MUSHAF_TOTAL_PAGES);
  if (available < remainingPayload * 1.2) {
    throw new Error("There is not enough available device storage for the Mushaf download.");
  }
}

async function fetchAndValidatePage(
  page: number,
  request: Request,
  signal: AbortSignal,
): Promise<Response> {
  const response = await fetch(request, { signal });
  if (!response.ok) throw new Error(`Page ${page} returned HTTP ${response.status}.`);
  let data: unknown;
  try {
    data = await response.clone().json();
  } catch {
    throw new Error(`Page ${page} did not return valid JSON.`);
  }
  validateMushafPageAsset(data, page);
  return response;
}

async function fetchAndValidateFont(
  page: number,
  request: Request,
  signal: AbortSignal,
): Promise<Response> {
  const response = await fetch(request, { signal });
  if (!response.ok) throw new Error(`Font ${page} returned HTTP ${response.status}.`);
  if ((await response.clone().arrayBuffer()).byteLength < 1_000) {
    throw new Error(`Font ${page} was empty or incomplete.`);
  }
  return response;
}

async function cachePagePair(page: number, signal: AbortSignal): Promise<void> {
  const [pageCache, fontCache] = await Promise.all([
    caches.open(OFFLINE_MUSHAF_PAGE_CACHE),
    caches.open(OFFLINE_MUSHAF_FONT_CACHE),
  ]);
  const pageRequest = new Request(
    new URL(pageAssetUrl(page), window.location.origin).href,
    { cache: "no-store" },
  );
  const fontRequest = new Request(qcfFontUrl(page), {
    cache: "no-store",
    mode: "cors",
  });
  const [cachedPage, cachedFont] = await Promise.all([
    pageCache.match(pageRequest),
    fontCache.match(fontRequest),
  ]);

  const [pageResponse, fontResponse] = await Promise.all([
    cachedPage ?? fetchAndValidatePage(page, pageRequest, signal),
    cachedFont ?? fetchAndValidateFont(page, fontRequest, signal),
  ]);
  if (!cachedPage) await pageCache.put(pageRequest, pageResponse);
  if (!cachedFont) await fontCache.put(fontRequest, fontResponse);
}

async function performDownload(signal: AbortSignal): Promise<void> {
  const ready = new Set(await scanReadyPages());
  const missing = offlineMushafAssetPairs()
    .map(({ page }) => page)
    .filter((page) => !ready.has(page));
  updateState({ readyPages: ready.size });
  await assertEnoughStorage(missing.length);

  let cursor = 0;
  const worker = async () => {
    while (cursor < missing.length) {
      if (signal.aborted) throw new DOMException("Paused", "AbortError");
      const page = missing[cursor++];
      await cachePagePair(page, signal);
      ready.add(page);
      updateState({ readyPages: ready.size });
    }
  };

  await Promise.all(
    Array.from(
      { length: Math.min(DOWNLOAD_CONCURRENCY, Math.max(1, missing.length)) },
      worker,
    ),
  );

  const verified = await scanReadyPages();
  if (verified.length !== OFFLINE_MUSHAF_TOTAL_PAGES) {
    throw new Error("The Mushaf download finished with missing pages.");
  }
  updateState({
    phase: "complete",
    readyPages: verified.length,
    error: null,
  });
}

export function startOfflineMushafDownload(): Promise<void> {
  if (downloadPromise) return downloadPromise;
  if (!supportsOfflineMushaf()) {
    updateState({ phase: "unsupported", error: null });
    return Promise.resolve();
  }
  if (state.phase === "complete") return Promise.resolve();

  pauseRequested = false;
  downloadController = new AbortController();
  updateState({ phase: "downloading", error: null });
  // Call persistence while the initiating click still owns user activation.
  void navigator.storage?.persist?.().catch(() => false);
  downloadPromise = performDownload(downloadController.signal)
    .catch((error: unknown) => {
      if (pauseRequested || (error instanceof DOMException && error.name === "AbortError")) {
        updateState({ phase: "paused", error: null });
        return;
      }
      downloadController?.abort();
      updateState({
        phase: "error",
        error: error instanceof Error
          ? error.message
          : "The Mushaf download was interrupted.",
      });
    })
    .finally(() => {
      downloadController = null;
      downloadPromise = null;
    });
  return downloadPromise;
}

export function pauseOfflineMushafDownload(): void {
  if (state.phase !== "downloading") return;
  pauseRequested = true;
  downloadController?.abort();
  updateState({ phase: "paused", error: null });
}

export async function removeOfflineMushafDownload(): Promise<void> {
  const pendingDownload = downloadPromise;
  pauseOfflineMushafDownload();
  await pendingDownload;
  const [pageCache, fontCache] = await Promise.all([
    caches.open(OFFLINE_MUSHAF_PAGE_CACHE),
    caches.open(OFFLINE_MUSHAF_FONT_CACHE),
  ]);
  const [pageRequests, fontRequests] = await Promise.all([
    pageCache.keys(),
    fontCache.keys(),
  ]);
  await Promise.all([
    ...pageRequests
      .filter((request) => offlineMushafAssetPage(request.url, "page") !== CORE_OFFLINE_PAGE)
      .map((request) => pageCache.delete(request)),
    ...fontRequests
      .filter((request) => offlineMushafAssetPage(request.url, "font") !== CORE_OFFLINE_PAGE)
      .map((request) => fontCache.delete(request)),
  ]);
  const readyPages = await scanReadyPages();
  updateState({
    phase: "available",
    readyPages: readyPages.length,
    error: null,
  });
}

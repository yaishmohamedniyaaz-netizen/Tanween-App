/**
 * Tahqeeq Service Worker
 * Hand-rolled (no Workbox). Precaches only the small app essentials; mushaf
 * pages are cached as they are opened so first load stays fast on phones.
 * NOTE: this file is served verbatim from /public — it must stay plain
 * JavaScript (no TypeScript annotations; browsers parse it directly).
 */

// App-shell releases and Mushaf source data have separate version contracts.
// Updating the interface must never relabel or invalidate the 1405H page data.
const APP_CACHE_VERSION = "app-v26";
const MUSHAF_DATA_VERSION = "v1-1405-r2";
const STATIC_CACHE = "tahqeeq-static-" + APP_CACHE_VERSION;

const QCF_DEFAULT_FONT =
  "https://static-cdn.tarteel.ai/qul/fonts/quran_fonts/v1-optimized/woff2/p604.woff2?v=3.1";
const FONT_URLS = [
  "/fonts/hafs.18.woff2",
  "/fonts/InterVariable.woff2",
  QCF_DEFAULT_FONT,
];

const PRECACHE_URLS = FONT_URLS.concat([
  "/pages/p604.json?v=" + MUSHAF_DATA_VERSION,
  "/question-index.json?v=qpc-v1-1405h-question-index-v1",
]);

// Install: precache everything; individual failures are logged, not fatal.
self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(STATIC_CACHE);
      const results = await Promise.allSettled(
        PRECACHE_URLS.map(async (url) => {
          const response = await fetch(url, { cache: "no-store" });
          if (!response.ok) throw new Error("HTTP " + response.status);
          await cache.put(url, response);
        }),
      );
      const ok = results.filter((r) => r.status === "fulfilled").length;
      console.log("[SW] Precached " + ok + "/" + PRECACHE_URLS.length + " assets");
      const clients = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      for (const client of clients) {
        client.postMessage({ type: "SW_PRECACHED", ok, total: PRECACHE_URLS.length });
      }
    })(),
  );
  self.skipWaiting();
});

// Activate: claim clients and clean old cache versions.
self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      for (const key of keys) {
        if (key !== STATIC_CACHE) await caches.delete(key);
      }
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);

  if (request.method !== "GET") return;

  const isQcfFont =
    url.origin === "https://static-cdn.tarteel.ai" &&
    url.pathname.startsWith("/qul/fonts/quran_fonts/v1-optimized/woff2/");
  if (isQcfFont) {
    event.respondWith(cacheFirst(request));
    return;
  }

  if (url.origin !== self.location.origin) return;

  // Fonts, page JSONs and the generated question index are immutable per
  // version and can safely use cache-first delivery.
  if (
    url.pathname.startsWith("/fonts/") ||
    url.pathname.startsWith("/pages/") ||
    url.pathname === "/question-index.json"
  ) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // App shell → network-first with cache fallback
  if (url.pathname === "/" || url.pathname === "/index.html") {
    event.respondWith(networkFirst(request));
    return;
  }

  // Hashed build assets → stale-while-revalidate
  event.respondWith(staleWhileRevalidate(request));
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "GET_STATUS") {
    (async () => {
      const cache = await caches.open(STATIC_CACHE);
      const cachedPages = await cache.keys();
      const ok = cachedPages.length;
      if (event.source) {
        event.source.postMessage({
          type: "SW_PRECACHED",
          ok,
          total: PRECACHE_URLS.length,
        });
      }
    })();
  }
});

async function cacheFirst(request) {
  const cache = await caches.open(STATIC_CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;
  try {
    const network = await fetch(request);
    if (network.ok) cache.put(request, network.clone());
    return network;
  } catch (e) {
    return new Response("Offline", { status: 503, statusText: "Service Unavailable" });
  }
}

async function networkFirst(request) {
  const cache = await caches.open(STATIC_CACHE);
  try {
    const network = await fetch(request);
    if (network.ok) cache.put(request, network.clone());
    return network;
  } catch (e) {
    const cached = await cache.match(request);
    if (cached) return cached;
    return new Response("Offline", { status: 503, statusText: "Service Unavailable" });
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(STATIC_CACHE);
  const cached = await cache.match(request);
  const update = fetch(request)
    .then((network) => {
      if (network.ok) cache.put(request, network.clone());
      return network;
    })
    .catch(() => undefined);
  if (cached) {
    update.catch(() => {});
    return cached;
  }
  const network = await update;
  if (network) return network;
  return new Response("Offline", { status: 503, statusText: "Service Unavailable" });
}

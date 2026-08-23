/**
 * Tahqeeq Service Worker
 * Hand-rolled (no Workbox). Precaches only the small app essentials; mushaf
 * pages are cached as they are opened so first load stays fast on phones.
 * NOTE: this file is served verbatim from /public — it must stay plain
 * JavaScript (no TypeScript annotations; browsers parse it directly).
 */

// App-shell releases and Mushaf source data have separate version contracts.
// Updating the interface must never relabel or invalidate the 1405H page data.
const APP_CACHE_VERSION = "app-v28";
const MUSHAF_DATA_VERSION = "v1-1405-r2";
const QCF_FONT_VERSION = "3.1";
const STATIC_CACHE = "tahqeeq-static-" + APP_CACHE_VERSION;
const MUSHAF_PAGE_CACHE = "tahqeeq-mushaf-pages-" + MUSHAF_DATA_VERSION;
const MUSHAF_FONT_CACHE = "tahqeeq-mushaf-fonts-qcf-v1-" + QCF_FONT_VERSION;

const QCF_DEFAULT_FONT =
  "https://static-cdn.tarteel.ai/qul/fonts/quran_fonts/v1-optimized/woff2/p604.woff2?v=3.1";
const FONT_URLS = [
  "/fonts/hafs.18.woff2",
  "/fonts/InterVariable.woff2",
  QCF_DEFAULT_FONT,
];

const STATIC_PRECACHE_URLS = FONT_URLS.slice(0, 2).concat([
  "/manifest.webmanifest",
  "/icons/tahqeeq-192.png",
  "/icons/tahqeeq-512.png",
  "/icons/tahqeeq-maskable-512.png",
  "/icons/tahqeeq-apple-touch-180.png",
  "/question-index.json?v=qpc-v1-1405h-question-index-v1",
]);
const MUSHAF_PRECACHE = [
  { cacheName: MUSHAF_PAGE_CACHE, url: "/pages/p604.json?v=" + MUSHAF_DATA_VERSION },
  { cacheName: MUSHAF_FONT_CACHE, url: QCF_DEFAULT_FONT },
];
const PRECACHE_TOTAL = STATIC_PRECACHE_URLS.length + MUSHAF_PRECACHE.length;

// Install: precache everything; individual failures are logged, not fatal.
self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const entries = STATIC_PRECACHE_URLS
        .map((url) => ({ cacheName: STATIC_CACHE, url }))
        .concat(MUSHAF_PRECACHE);
      const results = await Promise.allSettled(
        entries.map(async ({ cacheName, url }) => {
          const cache = await caches.open(cacheName);
          const response = await fetch(url, { cache: "no-store" });
          if (!response.ok) throw new Error("HTTP " + response.status);
          await cache.put(url, response);
        }),
      );
      const ok = results.filter((r) => r.status === "fulfilled").length;
      console.log("[SW] Precached " + ok + "/" + PRECACHE_TOTAL + " assets");
      const clients = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      for (const client of clients) {
        client.postMessage({ type: "SW_PRECACHED", ok, total: PRECACHE_TOTAL });
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
        const staleStatic = key.startsWith("tahqeeq-static-") && key !== STATIC_CACHE;
        const stalePages =
          key.startsWith("tahqeeq-mushaf-pages-") && key !== MUSHAF_PAGE_CACHE;
        const staleFonts =
          key.startsWith("tahqeeq-mushaf-fonts-") && key !== MUSHAF_FONT_CACHE;
        if (staleStatic || stalePages || staleFonts) {
          await caches.delete(key);
        }
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
    event.respondWith(cacheFirst(request, MUSHAF_FONT_CACHE));
    return;
  }

  if (url.origin !== self.location.origin) return;

  // Fonts, page JSONs and the generated question index are immutable per
  // version and can safely use cache-first delivery.
  if (
    url.pathname.startsWith("/fonts/") ||
    url.pathname === "/question-index.json"
  ) {
    event.respondWith(cacheFirst(request));
    return;
  }

  if (url.pathname.startsWith("/pages/")) {
    event.respondWith(cacheFirst(request, MUSHAF_PAGE_CACHE));
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
      const [staticCache, pageCache, fontCache] = await Promise.all([
        caches.open(STATIC_CACHE),
        caches.open(MUSHAF_PAGE_CACHE),
        caches.open(MUSHAF_FONT_CACHE),
      ]);
      const [staticAssets, corePage, coreFont] = await Promise.all([
        staticCache.keys(),
        pageCache.match("/pages/p604.json?v=" + MUSHAF_DATA_VERSION),
        fontCache.match(QCF_DEFAULT_FONT),
      ]);
      const ok = staticAssets.length + Number(Boolean(corePage)) + Number(Boolean(coreFont));
      if (event.source) {
        event.source.postMessage({
          type: "SW_PRECACHED",
          ok,
          total: PRECACHE_TOTAL,
        });
      }
    })();
  }
});

async function cacheFirst(request, cacheName = STATIC_CACHE) {
  const cache = await caches.open(cacheName);
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

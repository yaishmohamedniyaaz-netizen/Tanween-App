/**
 * Tahqeeq Service Worker
 * Hand-rolled (no Workbox). Precaches only the small app essentials; mushaf
 * pages are cached as they are opened so first load stays fast on phones.
 * NOTE: this file is served verbatim from /public — it must stay plain
 * JavaScript (no TypeScript annotations; browsers parse it directly).
 */

// App-shell releases and Mushaf source data have separate version contracts.
// Updating the interface must never relabel or invalidate the 1405H page data.
// HTML delivery now uses no-transform; retry the previously rejected update.
const APP_CACHE_VERSION = "app-v30";
const FIXED_PACKAGE = /* __TAHQEEQ_FIXED_PACKAGE__ */ null;
const MUSHAF_DATA_VERSION = "v1-1405-r2";
const QCF_FONT_VERSION = "3.1";
const STATIC_CACHE = "tahqeeq-static-" + APP_CACHE_VERSION;
const MUSHAF_PAGE_CACHE = "tahqeeq-mushaf-pages-" + MUSHAF_DATA_VERSION;
const MUSHAF_FONT_CACHE = "tahqeeq-mushaf-fonts-qcf-v1-" + QCF_FONT_VERSION;

// Vite's hashed production assets are injected into the built copy of this
// worker by scripts/pwa-precache.mjs. Keep the source marker intact: an empty
// list is valid for local development, while production gets one complete,
// version-matched application shell.
const BUILD_PRECACHE_URLS = /* __TAHQEEQ_BUILD_PRECACHE__ */ [];

const QCF_DEFAULT_FONT =
  "https://static-cdn.tarteel.ai/qul/fonts/quran_fonts/v1-optimized/woff2/p604.woff2?v=3.1";
const FONT_URLS = [
  "/fonts/hafs.18.woff2",
  "/fonts/InterVariable.woff2",
  QCF_DEFAULT_FONT,
];

const STATIC_PRECACHE_URLS = BUILD_PRECACHE_URLS.concat(FONT_URLS.slice(0, 2), [
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

// Install: the same-origin application shell is one required unit. The core
// Mushaf page/font remain best-effort so a temporary cross-origin font failure
// cannot prevent an otherwise usable application update from installing.
self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const staticCache = await caches.open(STATIC_CACHE);
      await staticCache.addAll(
        STATIC_PRECACHE_URLS.map(
          (url) => new Request(url, { cache: "reload" }),
        ),
      );
      for (const url of STATIC_PRECACHE_URLS) {
        if (!await shellFileValid(url, await staticCache.match(url, { ignoreVary: true }))) throw new Error("App shell does not match this build");
      }
      if (FIXED_PACKAGE) {
        const artworkCache = await caches.open("tahqeeq-mushaf-artwork-" + FIXED_PACKAGE.version);
        for (const asset of FIXED_PACKAGE.core) {
          const response = await fetch(asset.url, { cache: "reload" });
          if (!response.ok) throw new Error("Core Mushaf file unavailable");
          const bytes = await response.arrayBuffer();
          const digest = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)), b => b.toString(16).padStart(2, "0")).join("");
          if (bytes.byteLength !== asset.bytes || digest !== asset.sha256) throw new Error("Core Mushaf file mismatch");
          await artworkCache.put(asset.url, new Response(bytes, { headers: { "Content-Type": asset.url.endsWith(".png") ? "image/png" : "application/json" } }));
        }
      }
      const results = await Promise.allSettled(
        MUSHAF_PRECACHE.map(async ({ cacheName, url }) => {
          const cache = await caches.open(cacheName);
          const response = await fetch(url, { cache: "no-store" });
          if (!response.ok) throw new Error("HTTP " + response.status);
          await cache.put(url, response);
        }),
      );
      const ok =
        STATIC_PRECACHE_URLS.length +
        results.filter((r) => r.status === "fulfilled").length;
      console.log("[SW] Precached " + ok + "/" + PRECACHE_TOTAL + " assets");
      const clients = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      for (const client of clients) {
        client.postMessage({ type: "SW_PRECACHED", ok, total: PRECACHE_TOTAL });
      }
    })().catch(async error => {
      // Failed installs must not leave a cache that looks like a usable rollback.
      await caches.delete(STATIC_CACHE);
      throw error;
    }),
  );
  // No forced activation: the previous app owns its open judging windows.
});

// Activate: claim clients and clean old cache versions.
self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      // Natural activation means old windows have closed. Keep one prior shell
      // for rollback; do not remove a user's previous Mushaf installation.
      const priorShells = keys.filter(key => key.startsWith("tahqeeq-static-") && key !== STATIC_CACHE);
      for (const key of priorShells.slice(0, -1)) await caches.delete(key);
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
  const artwork = url.pathname.match(/^\/mushaf\/(1405-artwork-[a-f0-9]+)\//);
  if (artwork) {
    event.respondWith((async () => {
      const cache = await caches.open("tahqeeq-mushaf-artwork-" + artwork[1]);
      const stored = request.cache === "reload" || request.cache === "no-store" ? null : await cache.match(request, { ignoreVary: true });
      // Only the validating loader/installer writes these assets.
      return stored || fetch(request).catch(() => new Response("Offline", { status: 503 }));
    })());
    return;
  }

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
    event.respondWith((async () => {
      // Existing migration/export consumers keep their canonical semantic URL.
      // Reuse the verified text in the artwork package without another download.
      const page = url.pathname.match(/^\/pages\/p([1-9][0-9]{0,2})\.json$/);
      if (FIXED_PACKAGE && page && Number(page[1]) <= 604 && url.searchParams.get("v") === MUSHAF_DATA_VERSION) {
        const artworkCache = await caches.open("tahqeeq-mushaf-artwork-" + FIXED_PACKAGE.version);
        const text = await artworkCache.match("/mushaf/" + FIXED_PACKAGE.version + "/p" + page[1] + ".text.json", { ignoreVary: true });
        if (text) return text;
      }
      return cacheFirst(request, MUSHAF_PAGE_CACHE);
    })());
    return;
  }

  // App shell → network-first with cache fallback
  if (
    request.mode === "navigate" ||
    url.pathname === "/" ||
    url.pathname === "/index.html"
  ) {
    event.respondWith(networkFirstNavigation(request));
    return;
  }

  // Hashed build assets → stale-while-revalidate
  event.respondWith(staleWhileRevalidate(request));
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "VERIFY_OFFLINE_SHELL") {
    event.waitUntil((async () => {
      const cache = await caches.open(STATIC_CACHE);
      if (event.data.repair === true) {
        for (const url of STATIC_PRECACHE_URLS) {
          if (await shellFileValid(url, await cache.match(url, { ignoreVary: true }))) continue;
          try {
            const response = await fetch(url, { cache: "reload" });
            if (await shellFileValid(url, response)) await cache.put(url, response);
          } catch { /* The readiness response remains false until files return. */ }
        }
      }
      const matches = await Promise.all(STATIC_PRECACHE_URLS.map(async url => shellFileValid(url, await cache.match(url, { ignoreVary: true }))));
      event.ports[0]?.postMessage({ ready: Boolean(FIXED_PACKAGE && BUILD_PRECACHE_URLS.length && matches.every(Boolean)), version: FIXED_PACKAGE?.version });
    })());
    return;
  }
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
  // Static assets are immutable/versioned by their URL. Hosts commonly add
  // `Vary: Origin`; install-time requests have no page Origin header, while
  // later document requests do. Ignoring that response header keeps the exact
  // same URL usable offline without broadening the cache key.
  const cached = await cache.match(request, { ignoreVary: true });
  if (cached) return cached;
  try {
    const network = await fetch(request);
    if (network.ok) cache.put(request, network.clone());
    return network;
  } catch (e) {
    return new Response("Offline", { status: 503, statusText: "Service Unavailable" });
  }
}

async function shellFileValid(url, response) {
  if (!response || !response.ok) return false;
  const expected = FIXED_PACKAGE?.shellHashes?.[url];
  if (!expected) return true;
  const bytes = await response.clone().arrayBuffer();
  const digest = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)), b => b.toString(16).padStart(2, "0")).join("");
  return digest === expected;
}

async function networkFirstNavigation(request) {
  const cache = await caches.open(STATIC_CACHE);
  // Serve the shell bound to this worker. A network-first HTML response could
  // combine a new application with the previous worker while an update waits.
  const installed = await cache.match("/", { ignoreVary: true });
  if (installed) return installed;
  try {
    const network = await fetch(request);
    if (network.ok) await cache.put("/", network.clone());
    return network;
  } catch (e) {
    const cached =
      (await cache.match(request)) ||
      (await cache.match("/")) ||
      (await cache.match("/index.html"));
    if (cached) return cached;
    return new Response("Offline", { status: 503, statusText: "Service Unavailable" });
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(STATIC_CACHE);
  const cached = await cache.match(request, { ignoreVary: true });
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

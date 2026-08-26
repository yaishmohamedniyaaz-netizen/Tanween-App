import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  OFFLINE_MUSHAF_APPROX_BYTES,
  OFFLINE_MUSHAF_FONT_CACHE,
  OFFLINE_MUSHAF_PAGE_CACHE,
  OFFLINE_MUSHAF_TOTAL_PAGES,
  offlineMushafAssetPairs,
  readyOfflineMushafPages,
} from "../src/lib/mushafAssets.ts";

const root = new URL("../", import.meta.url);
const workerSource = readFileSync(new URL("public/sw.js", root), "utf8");
const pageNavSource = readFileSync(new URL("src/components/PageNav.tsx", root), "utf8");
const appSource = readFileSync(new URL("src/App.tsx", root), "utf8");
const promptSource = readFileSync(
  new URL("src/components/OfflineMushafPrompt.tsx", root),
  "utf8",
);

test("the offline Mushaf manifest covers every immutable page and font once", () => {
  const assets = offlineMushafAssetPairs();
  assert.equal(OFFLINE_MUSHAF_TOTAL_PAGES, 604);
  assert.equal(assets.length, 604);
  assert.equal(new Set(assets.map(({ pageUrl }) => pageUrl)).size, 604);
  assert.equal(new Set(assets.map(({ fontUrl }) => fontUrl)).size, 604);
  assert.deepEqual(assets[0], {
    page: 1,
    pageUrl: "/pages/p1.json?v=v1-1405-r2",
    fontUrl:
      "https://static-cdn.tarteel.ai/qul/fonts/quran_fonts/v1-optimized/woff2/p1.woff2?v=3.1",
  });
  assert.equal(assets.at(-1)?.page, 604);
  assert.equal(OFFLINE_MUSHAF_APPROX_BYTES, 50_085_077);
});

test("a page is ready only when matching-version data and font are both cached", () => {
  assert.deepEqual(
    readyOfflineMushafPages(
      [
        "https://app.test/pages/p3.json?v=v1-1405-r2",
        "https://app.test/pages/p255.json?v=v1-1405-r2",
        "https://app.test/pages/p604.json?v=old",
      ],
      [
        "https://static-cdn.tarteel.ai/qul/fonts/quran_fonts/v1-optimized/woff2/p3.woff2?v=3.1",
        "https://static-cdn.tarteel.ai/qul/fonts/quran_fonts/v1-optimized/woff2/p604.woff2?v=3.1",
      ],
    ),
    [3],
  );
});

test("ordinary shell releases retain current Mushaf data and font caches", () => {
  assert.equal(OFFLINE_MUSHAF_PAGE_CACHE, "tahqeeq-mushaf-pages-v1-1405-r2");
  assert.equal(OFFLINE_MUSHAF_FONT_CACHE, "tahqeeq-mushaf-fonts-qcf-v1-3.1");
  assert.match(workerSource, /const MUSHAF_DATA_VERSION = "v1-1405-r2"/);
  assert.match(workerSource, /const QCF_FONT_VERSION = "3\.1"/);
  assert.match(
    workerSource,
    /const MUSHAF_PAGE_CACHE = "tahqeeq-mushaf-pages-" \+ MUSHAF_DATA_VERSION/,
  );
  assert.match(
    workerSource,
    /const MUSHAF_FONT_CACHE = "tahqeeq-mushaf-fonts-qcf-v1-" \+ QCF_FONT_VERSION/,
  );
  assert.match(workerSource, /cacheFirst\(request, MUSHAF_PAGE_CACHE\)/);
  assert.match(workerSource, /cacheFirst\(request, MUSHAF_FONT_CACHE\)/);
  assert.match(workerSource, /stalePages[\s\S]*key !== MUSHAF_PAGE_CACHE/);
  assert.match(workerSource, /staleFonts[\s\S]*key !== MUSHAF_FONT_CACHE/);
});

test("intent prefetch and judging protection stay attached to existing navigation", () => {
  assert.match(pageNavSource, /preloadPage\(targetPage\)/);
  assert.match(pageNavSource, /preloadQcfPageFont\(targetPage\)/);
  assert.match(pageNavSource, /onPointerEnter=.*scheduleIntentPrefetch/);
  assert.match(pageNavSource, /setTimeout\(\(\) => prefetchTarget\(targetPage\), 180\)/);
  assert.match(appSource, /state\.sessionActive && offlineMushaf\.phase === "downloading"/);
  assert.match(appSource, /pauseOfflineMushafDownload\(\)/);
});

test("an accepted installed-app package resumes only from real saved progress", () => {
  assert.match(promptSource, /handled === "downloaded"/);
  assert.match(promptSource, /offline\.phase === "available"/);
  assert.match(promptSource, /offline\.readyPages > 1/);
  assert.match(promptSource, /void startOfflineMushafDownload\(\)/);
  assert.match(promptSource, /The download is about 48 MB/);
});

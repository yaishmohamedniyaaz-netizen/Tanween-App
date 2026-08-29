import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import test from "node:test";
import { createTilawaSession } from "@tilawa/core";
import siteWorker from "../worker/index.js";
import {
  initialTilawaCursorState,
  observeTilawaProgress,
  observeTilawaVerse,
  tilawaMushafWordId,
} from "../src/lib/tilawaWordFocus.ts";

const root = new URL("../", import.meta.url);
const appSource = readFileSync(new URL("src/App.tsx", root), "utf8");
const panelSource = readFileSync(
  new URL("src/components/TilawaPrototypePanel.tsx", root),
  "utf8",
);
const workerSource = readFileSync(
  new URL("src/workers/tilawaPrototype.worker.ts", root),
  "utf8",
);
const moreActionsSource = readFileSync(
  new URL("src/components/MoreActionsPopover.tsx", root),
  "utf8",
);
const hostedWorkerSource = readFileSync(new URL("worker/index.js", root), "utf8");
const prepareSitesSource = readFileSync(new URL("scripts/prepare-sites.mjs", root), "utf8");
const localCorpusAvailable = existsSync(new URL("public/tilawa/quran.json", root));

test("Tilawa stays behind an explicit prototype query and More actions", () => {
  assert.match(appSource, /get\("tilawaPrototype"\) === "1"/);
  assert.match(appSource, /tilawaTracking=\{showTilawaPrototype/);
  assert.match(appSource, /showTilawaPrototype && view === "judge"/);
  assert.match(moreActionsSource, /Recitation tracking/);
  assert.match(panelSource, /Experimental visual guide only\. It never creates marks or changes scores/);
  assert.doesNotMatch(panelSource + workerSource, /useJudging|dispatch\(|SavedSession/);
});

test("tracking opens as a non-modal dock with reachable pause and close controls", () => {
  assert.match(panelSource, /className=\{`tilawa-tracker-dock/);
  assert.match(panelSource, /role="region"/);
  assert.match(panelSource, /Minimize recitation tracking/);
  assert.match(panelSource, /Pause tracking/);
  assert.match(panelSource, /Resume tracking/);
  assert.doesNotMatch(panelSource, /showModal\(|<dialog/);
});

test("prototype uses the published pinned SDK and on-device model contract", () => {
  assert.match(workerSource, /MODEL_URL = "\/tilawa\/fastconformer_full_mixed\.onnx"/);
  assert.match(workerSource, /createTilawaSession/);
  assert.match(workerSource, /ort\.env\.wasm\.numThreads = 1/);
  assert.match(workerSource, /wasm: "\/tilawa\/ort-wasm-simd-threaded\.wasm"/);
  assert.match(workerSource, /MODEL_CACHE_KEY = "tilawa-v0\.2\.0/);
  assert.match(workerSource, /config: CONSERVATIVE_STREAMING_CONFIG/);
});

test("Sites serves fixed Tilawa v0.2.0 assets without bundling local model files", () => {
  assert.match(hostedWorkerSource, /releases\/download\/v0\.2\.0/);
  assert.match(hostedWorkerSource, /fastconformer_full_mixed\.onnx/);
  assert.match(hostedWorkerSource, /onnxruntime-web@1\.24\.2/);
  assert.match(hostedWorkerSource, /fetchTilawaAsset\(request\)/);
  assert.match(hostedWorkerSource, /max-age=31536000, immutable/);
  assert.match(prepareSitesSource, /rm\(resolve\(distDir, "tilawa"\)/);
});

test("the hosted Tilawa route streams the pinned release before static assets", async () => {
  const originalFetch = globalThis.fetch;
  let requestedUrl = "";
  let staticAssetRequests = 0;
  globalThis.fetch = async (url) => {
    requestedUrl = String(url);
    return new Response("model", {
      headers: { "Content-Type": "application/octet-stream" },
    });
  };

  try {
    const response = await siteWorker.fetch(
      new Request("https://example.test/tilawa/fastconformer_full_mixed.onnx"),
      { ASSETS: { fetch: async () => { staticAssetRequests += 1; return new Response(null, { status: 404 }); } } },
    );
    assert.equal(response.status, 200);
    assert.match(requestedUrl, /yazinsai\/tilawa\/releases\/download\/v0\.2\.0/);
    assert.equal(response.headers.get("cache-control"), "public, max-age=31536000, immutable");
    assert.equal(staticAssetRequests, 0);
    assert.equal(await response.text(), "model");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("live prototype sends 16 kHz chunks and consumes ayah and word progress", () => {
  assert.match(panelSource, /tilawa-audio-processor\.js/);
  assert.match(panelSource, /message\.type === "verse_match" && listeningRef\.current/);
  assert.match(panelSource, /message\.type === "word_progress" && listeningRef\.current/);
  assert.match(workerSource, /tilawaSession\?\.feed\(samples\)/);
});

test("prototype coalesces inference backlog and follows confirmed ayahs in the Mushaf", () => {
  assert.match(workerSource, /concatenateAudio\(pendingAudio\.splice\(0\)\)/);
  assert.doesNotMatch(workerSource, /feedQueue/);
  assert.match(panelSource, /onVerseMatch\?\.\(update\.confirmedVerse\)/);
  assert.match(appSource, /lookup\.byKey\.get\(`\$\{match\.surah\}:\$\{match\.ayah\}`\)/);
  assert.match(appSource, /detected\.startPage/);
});

test("word progress maps its one-based count onto the latest printed Mushaf word", () => {
  assert.equal(tilawaMushafWordId({ surah: 112, ayah: 1, word_index: 1, total_words: 8 }), "112.b.0");
  assert.equal(tilawaMushafWordId({ surah: 112, ayah: 1, word_index: 4, total_words: 8 }), "112.b.3");
  assert.equal(tilawaMushafWordId({ surah: 112, ayah: 1, word_index: 5, total_words: 8 }), "112.1.0");
  assert.equal(tilawaMushafWordId({ surah: 1, ayah: 1, word_index: 1, total_words: 4 }), "1.1.0");
  assert.equal(tilawaMushafWordId({ surah: 9, ayah: 1, word_index: 1, total_words: 10 }), "9.1.0");
  assert.equal(tilawaMushafWordId({ surah: 2, ayah: 181, word_index: 3, total_words: 13 }), "2.181.3");
  assert.equal(tilawaMushafWordId({ surah: 8, ayah: 6, word_index: 4, total_words: 11 }), "8.6.4");
  assert.equal(tilawaMushafWordId({ surah: 13, ayah: 37, word_index: 8, total_words: 19 }), "13.37.8");
  assert.equal(tilawaMushafWordId({ surah: 1, ayah: 1, word_index: 0, total_words: 4 }), null);
});

test("every Tilawa progress address resolves to the pinned 6,236-ayah Mushaf corpus", {
  skip: localCorpusAvailable ? false : "local Tilawa release assets are not installed",
}, () => {
  const mushafWordIds = new Set();
  const finalWordByVerse = new Map();
  const pageDirectory = new URL("public/pages/", root);
  for (const filename of readdirSync(pageDirectory)) {
    if (!/^p\d+\.json$/.test(filename)) continue;
    const page = JSON.parse(readFileSync(new URL(filename, pageDirectory), "utf8"));
    for (const line of page.lines) {
      for (const word of line.words ?? []) {
        if (word.role !== "letter") continue;
        mushafWordIds.add(word.wid);
        if (word.ayah !== null) finalWordByVerse.set(`${word.surah}:${word.ayah}`, word.wid);
      }
    }
  }

  const vocab = JSON.parse(readFileSync(new URL("public/tilawa/vocab.json", root), "utf8"));
  const quranCtcTokens = JSON.parse(readFileSync(new URL("public/tilawa/quran_ctc_tokens.json", root), "utf8"));
  const quran = JSON.parse(readFileSync(new URL("public/tilawa/quran.json", root), "utf8"));
  const session = createTilawaSession(
    { run: async () => ({ logprobs: new Float32Array(), timeSteps: 0, vocabSize: 0 }) },
    { vocab, quranCtcTokens, quran, blankId: 1024 },
  );

  assert.equal(session.db.verses.length, 6_236);
  for (const verse of session.db.verses) {
    for (let progress = 1; progress <= verse.phoneme_words.length; progress += 1) {
      const wid = tilawaMushafWordId({
        surah: verse.surah,
        ayah: verse.ayah,
        word_index: progress,
        total_words: verse.phoneme_words.length,
      });
      assert.ok(wid && mushafWordIds.has(wid), `${verse.surah}:${verse.ayah} progress ${progress} -> ${wid}`);
    }
    assert.equal(
      tilawaMushafWordId({
        surah: verse.surah,
        ayah: verse.ayah,
        word_index: verse.phoneme_words.length,
        total_words: verse.phoneme_words.length,
      }),
      finalWordByVerse.get(`${verse.surah}:${verse.ayah}`),
      `${verse.surah}:${verse.ayah} final word`,
    );
  }
});

test("the live word cursor stays visual-only and clears when listening stops", () => {
  assert.match(appSource, /tilawaWordFocus=\{tilawaWordFocus\}/);
  assert.match(panelSource, /onWordProgress\?\.\(\{/);
  assert.match(panelSource, /onTrackingClear\?\.\(\)/);
  assert.match(panelSource, /Close recitation tracking/);
  assert.match(panelSource, /Pause tracking/);
  assert.match(panelSource, /Resume tracking/);
  assert.match(panelSource, /void releaseMicrophone\(\)/);
  assert.match(panelSource, /stream\?\.getTracks\(\)\.forEach\(\(track\) => track\.stop\(\)\)/);
  assert.doesNotMatch(appSource + panelSource, /dispatch\([^)]*tilawa/i);
});

test("conservative cursor ignores weak, out-of-range, backward, and unsupported jumps", () => {
  const passage = {
    startAyah: { surah: 112, ayah: 1 },
    endAyah: { surah: 112, ayah: 4 },
  };
  let state = initialTilawaCursorState();

  state = observeTilawaVerse(state, {
    surah: 113,
    ayah: 1,
    confidence: 0.99,
  }, passage);
  assert.equal(state.candidate, null, "rejects a confident result outside the prepared passage");

  state = observeTilawaVerse(state, {
    surah: 112,
    ayah: 1,
    confidence: 0.7,
  }, passage);
  assert.equal(state.candidate, null, "rejects weak initial guesses");

  state = observeTilawaVerse(state, {
    surah: 112,
    ayah: 1,
    confidence: 0.82,
  }, passage);
  let update = observeTilawaProgress(state, {
    surah: 112,
    ayah: 1,
    word_index: 6,
    total_words: 8,
    matched_indices: [5],
  }, passage);
  assert.equal(update.confirmedProgress, undefined, "does not jump to a lone look-ahead match");

  update = observeTilawaProgress(state, {
    surah: 112,
    ayah: 1,
    word_index: 3,
    total_words: 8,
    matched_indices: [0, 1, 2],
  }, passage);
  assert.equal(update.confirmedVerse?.ayah, 1);
  assert.equal(update.confirmedProgress?.word_index, 2, "caps the first visual move to two words");
  state = update.state;

  update = observeTilawaProgress(state, {
    surah: 112,
    ayah: 1,
    word_index: 1,
    total_words: 8,
    matched_indices: [0],
  }, passage);
  assert.equal(update.confirmedProgress, undefined, "never moves the cursor backward");

  state = observeTilawaVerse(state, {
    surah: 112,
    ayah: 4,
    confidence: 0.99,
  }, passage);
  assert.equal(state.candidate?.ayah, 1, "blocks non-adjacent ayah jumps after confirmation");
});

test("conservative cursor confirms an adjacent ayah only after prefix evidence", () => {
  const first = {
    surah: 112,
    ayah: 1,
    confidence: 0.9,
  };
  let state = observeTilawaVerse(initialTilawaCursorState(), first);
  state = observeTilawaProgress(state, {
    surah: 112,
    ayah: 1,
    word_index: 2,
    total_words: 8,
    matched_indices: [0, 1],
  }).state;

  const second = {
    surah: 112,
    ayah: 2,
    confidence: 0.84,
  };
  state = observeTilawaVerse(state, second);
  let update = observeTilawaProgress(state, {
    surah: 112,
    ayah: 2,
    word_index: 1,
    total_words: 4,
    matched_indices: [0],
  });
  assert.equal(update.confirmedVerse, undefined, "one low-confidence prefix word is not enough");

  update = observeTilawaProgress(state, {
    surah: 112,
    ayah: 2,
    word_index: 2,
    total_words: 4,
    matched_indices: [0, 1],
  });
  assert.equal(update.confirmedVerse?.ayah, 2);
  assert.equal(update.confirmedProgress?.word_index, 2);
});

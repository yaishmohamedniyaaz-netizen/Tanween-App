import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import {
  CANONICAL_MUSHAF_HEIGHT,
  CANONICAL_MUSHAF_SOURCE,
  CANONICAL_MUSHAF_WIDTH,
  canonicalMushafImageUrl,
} from "../src/lib/canonicalMushaf.ts";

const mushafSource = fs.readFileSync(
  new URL("../src/components/Mushaf.tsx", import.meta.url),
  "utf8",
);
const mushafStyles = fs.readFileSync(
  new URL("../src/styles/global.css", import.meta.url),
  "utf8",
);
const serviceWorkerSource = fs.readFileSync(
  new URL("../public/sw.js", import.meta.url),
  "utf8",
);

test("compact pages use the canonical Quran Android Madani image contract", () => {
  assert.equal(CANONICAL_MUSHAF_WIDTH, 1260);
  assert.equal(CANONICAL_MUSHAF_HEIGHT, 2038);
  assert.equal(
    canonicalMushafImageUrl(1),
    "https://files.quran.app/hafs/madani/width_1260/page001.png",
  );
  assert.equal(
    canonicalMushafImageUrl(604),
    "https://files.quran.app/hafs/madani/width_1260/page604.png",
  );
  assert.match(mushafSource, /canonicalReady = compact/);
  assert.match(mushafSource, /page-canonical-madani/);
  assert.match(mushafStyles, /aspect-ratio: 1260 \/ 2038/);
});

test("all canonical page coordinates match the semantic ayah word addresses", () => {
  const coordinateFiles = fs
    .readdirSync("public/madani-coordinates")
    .filter((name) => /^p\d+\.json$/.test(name));
  assert.equal(coordinateFiles.length, 604);

  let coordinateWords = 0;
  for (let pageNumber = 1; pageNumber <= 604; pageNumber += 1) {
    const page = JSON.parse(
      fs.readFileSync(path.join("public/pages", `p${pageNumber}.json`), "utf8"),
    );
    const coordinates = JSON.parse(
      fs.readFileSync(
        path.join("public/madani-coordinates", `p${pageNumber}.json`),
        "utf8",
      ),
    );

    assert.equal(coordinates.page, pageNumber);
    assert.equal(coordinates.width, CANONICAL_MUSHAF_WIDTH);
    assert.equal(coordinates.height, CANONICAL_MUSHAF_HEIGHT);
    assert.equal(coordinates.source, CANONICAL_MUSHAF_SOURCE);

    for (const line of page.lines) {
      for (const word of line.words ?? []) {
        if (line.type !== "ayah" || word.role !== "letter") continue;
        const bounds = coordinates.words[word.wid];
        assert.ok(bounds, `missing canonical bounds for ${word.wid}`);
        assert.equal(bounds.length, 4, word.wid);
        assert.ok(bounds[0] >= 0 && bounds[0] < bounds[2], word.wid);
        assert.ok(bounds[1] >= 0 && bounds[1] < bounds[3], word.wid);
        assert.ok(bounds[2] <= CANONICAL_MUSHAF_WIDTH, word.wid);
        assert.ok(bounds[3] <= CANONICAL_MUSHAF_HEIGHT, word.wid);
        coordinateWords += 1;
      }
    }
  }

  assert.equal(coordinateWords, 77_433);
});

test("canonical images and coordinates are cached as opened", () => {
  assert.match(serviceWorkerSource, /files\.quran\.app/);
  assert.match(serviceWorkerSource, /madani-coordinates/);
  assert.match(serviceWorkerSource, /network\.type === "opaque"/);
});

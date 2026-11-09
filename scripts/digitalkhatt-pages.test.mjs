import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import { judgingTargetsOf, TARGET_RULE_VERSION } from "../src/lib/judgingUnits.ts";
import { nextRecitedWords } from "../src/lib/recitedNeighbours.ts";
import { buildFixedPageGeometry } from "../src/lib/fixedMushafGeometry.ts";
import { DK_ASSET_VERSION, dkPageGeometry, dkGlyphUnits } from "../src/lib/digitalKhattPages.ts";

const DIR = `public/mushaf-dk/${DK_ASSET_VERSION}`;
const ART = "public/mushaf/1405-artwork-5a5f9f3846158475";
const read = (path) => JSON.parse(fs.readFileSync(path, "utf8"));
const glyphs = read(`${DIR}/glyphs.json`);

test("DigitalKhatt pages: every selectable word and every letter unit of all 604 pages has its own ink", () => {
  assert.equal(TARGET_RULE_VERSION, "qpc-hafs-v1-targets-4.0.0");
  let words = 0, units = 0;
  for (let page = 1; page <= 604; page++) {
    const data = read(`public/pages/p${page}.json`);
    const dk = read(`${DIR}/p${page}.json`);
    const next = nextRecitedWords(data);
    const expected = data.lines.flatMap((line) => "words" in line
      ? line.words.filter((w) => w.role === "letter").map((w) => ({ ...w, line: line.n })) : []);
    assert.deepEqual(dk.words.map((w) => [w.wid, w.line]), expected.map((w) => [w.wid, w.line]), `p${page} words`);
    const inked = new Map();
    for (const line of dk.lines) {
      for (const glyph of line.g) {
        assert.ok(glyphs[glyph[0]], `p${page} glyph ${glyph[0]} has an outline`);
        if (glyph[3] < 0) continue;
        const wid = dk.words[glyph[3]].wid;
        for (const tid of dkGlyphUnits(dk, glyph)) {
          assert.ok(tid.startsWith(`${wid}@`), `p${page} ${tid} belongs to ${wid}`);
          inked.set(tid, (inked.get(tid) ?? 0) + 1);
        }
      }
    }
    for (const word of expected) {
      words++;
      for (const unit of judgingTargetsOf(word.text, "letter", word.wid, { nextWord: next.get(word.wid) })) {
        units++;
        assert.ok(inked.get(unit.tid) > 0, `p${page} ${unit.tid} (${unit.fullGlyph}) has ink`);
      }
    }
  }
  assert.equal(words, 77881);
  assert.equal(units, 300447);
});

test("DigitalKhatt pages: word boxes build valid tap regions on every page, in the artwork frame", () => {
  for (let page = 1; page <= 604; page++) {
    const source = read(`${ART}/p${page}.json`);
    const fixed = buildFixedPageGeometry({ ...source, image: `${ART}/p${page}.png` });
    const data = read(`public/pages/p${page}.json`);
    const dk = read(`${DIR}/p${page}.json`);
    const geometry = dkPageGeometry(fixed, data, dk);
    assert.equal(geometry.words.length, dk.words.length);
    for (const word of geometry.words) {
      const [x0, y0, x1, y1] = word.region;
      assert.ok(x0 >= 0 && y0 >= 0 && x1 <= 1920 && y1 <= 3106 && x0 < x1 && y0 < y1, `p${page} ${word.wid}`);
    }
    for (const header of dk.headers) {
      assert.ok(header.art[0] < header.art[1] && header.slot[0] < header.slot[1], `p${page} header ${header.n}`);
    }
  }
});

test("DigitalKhatt drawing: the print stays default; marks colour letters with no underline or count circle", () => {
  const mushaf = fs.readFileSync("src/components/Mushaf.tsx", "utf8");
  const surface = fs.readFileSync("src/components/FixedMushafPageSurface.tsx", "utf8");
  assert.match(mushaf, /const underlineFor = \(box: WordHitbox, tid: string\) => dkMode \? null :/);
  assert.match(mushaf, /letterMarks=\{letterMarks\}/);
  assert.match(surface, /<DkMarkedLetters dk=\{dk\}/);
  // The artwork shows until the page's DigitalKhatt data has loaded.
  assert.match(surface, /\{dk && dkGeometry \? <>/);
});

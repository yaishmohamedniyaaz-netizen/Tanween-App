import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const mushafSource = fs.readFileSync(
  new URL("../src/components/Mushaf.tsx", import.meta.url),
  "utf8",
);
const qcfFontSource = fs.readFileSync(
  new URL("../src/lib/qcfFont.ts", import.meta.url),
  "utf8",
);

test("the source Mushaf selects one whole kalimah before exact rail choice", () => {
  assert.match(mushafSource, /interface WordHitbox/);
  assert.match(mushafSource, /data-word-hit=/);
  assert.match(mushafSource, /semanticText/);
  assert.doesNotMatch(mushafSource, /buildClusterGeometry/);
  assert.doesNotMatch(mushafSource, /document\.createRange/);
  assert.match(mushafSource, /closest\("\.page-marginalia"\)/);
});

test("QCF page fonts are loaded before a page is declared ready", () => {
  assert.match(qcfFontSource, /new FontFace/);
  assert.match(qcfFontSource, /await face\.load\(\)/);
  assert.match(qcfFontSource, /document\.fonts\.add/);
  assert.doesNotMatch(qcfFontSource, /document\.fonts\.check/);
});

test("all 604 pages use fixed KFGQPC V1 1405H glyph and QUL line metadata", () => {
  const pageFiles = fs
    .readdirSync("public/pages")
    .filter((name) => /^p\d+\.json$/.test(name));
  assert.equal(pageFiles.length, 604);

  let semanticWords = 0;
  let glyphWords = 0;
  let centeredLines = 0;
  let ornaments = 0;
  for (const pageFile of pageFiles) {
    const page = JSON.parse(
      fs.readFileSync(path.join("public/pages", pageFile), "utf8"),
    );
    assert.equal(page.font, "qcf-v1", pageFile);
    assert.equal(page.layout, "KFGQPC V1 1405H", pageFile);
    assert.ok(page.lines.length > 0 && page.lines.length <= 15, pageFile);
    assert.equal(
      new Set(page.lines.map((line) => line.n)).size,
      page.lines.length,
      pageFile,
    );

    for (const line of page.lines) {
      assert.ok(line.n >= 1 && line.n <= 15, `${pageFile} line ${line.n}`);
      if (line.type === "ayah") {
        assert.equal(typeof line.centered, "boolean", `${pageFile} line ${line.n}`);
        if (line.centered) centeredLines += 1;
      }
      for (const word of line.words ?? []) {
        if (word.role === "ornament") {
          ornaments += 1;
          continue;
        }
        if (word.role !== "letter") continue;
        semanticWords += 1;
        assert.ok(word.text, `${pageFile} ${word.wid} semantic text`);
        assert.doesNotMatch(word.text, /\s/u, `${pageFile} ${word.wid} kalimah`);
        if (line.type === "ayah") {
          glyphWords += 1;
          assert.ok(word.glyph, `${pageFile} ${word.wid} QCF glyph`);
        }
      }
    }
  }

  assert.ok(semanticWords > 77_000);
  assert.ok(glyphWords > 77_000);
  assert.equal(centeredLines, 20);
  assert.equal(ornaments, 208);
});

test("opening and closing Mushaf pages preserve their authoritative structures", () => {
  const page1 = JSON.parse(fs.readFileSync("public/pages/p1.json", "utf8"));
  const page2 = JSON.parse(fs.readFileSync("public/pages/p2.json", "utf8"));
  const page604 = JSON.parse(fs.readFileSync("public/pages/p604.json", "utf8"));

  assert.deepEqual(page1.lines.map((line) => line.n), [1, 2, 3, 4, 5, 6, 7, 8]);
  assert.deepEqual(page2.lines.map((line) => line.n), [1, 2, 3, 4, 5, 6, 7, 8]);
  assert.equal(page1.lines[0].type, "surah-header");
  assert.equal(page2.lines[0].type, "surah-header");
  assert.equal(page2.lines[1].type, "basmala");
  assert.deepEqual(page604.lines.map((line) => line.n), [
    1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15,
  ]);
  assert.equal(page604.lines.find((line) => line.n === 9).centered, true);
  assert.equal(page604.lines.find((line) => line.n === 14).centered, true);
  assert.equal(page604.lines.find((line) => line.n === 15).centered, true);
});

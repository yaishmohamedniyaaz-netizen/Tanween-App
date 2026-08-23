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
const pageSource = fs.readFileSync(
  new URL("../src/lib/page.ts", import.meta.url),
  "utf8",
);
const mushafContractSource = fs.readFileSync(
  new URL("../src/lib/mushafContract.ts", import.meta.url),
  "utf8",
);
const mushafAssetsSource = fs.readFileSync(
  new URL("../src/lib/mushafAssets.ts", import.meta.url),
  "utf8",
);
const serviceWorkerSource = fs.readFileSync(
  new URL("../public/sw.js", import.meta.url),
  "utf8",
);
const mushafStyleSource = fs.readFileSync(
  new URL("../src/styles/global.css", import.meta.url),
  "utf8",
);
const mushafViewportSource = fs.readFileSync(
  new URL("../src/components/MushafViewport.tsx", import.meta.url),
  "utf8",
);
const appSource = fs.readFileSync(
  new URL("../src/App.tsx", import.meta.url),
  "utf8",
);
const headerSource = fs.readFileSync(
  new URL("../src/components/Header.tsx", import.meta.url),
  "utf8",
);
const pageNavSource = fs.readFileSync(
  new URL("../src/components/PageNav.tsx", import.meta.url),
  "utf8",
);

test("the source Mushaf selects one whole kalimah before exact rail choice", () => {
  assert.match(mushafSource, /interface WordHitbox/);
  assert.match(mushafSource, /data-word-hit=/);
  assert.match(mushafSource, /semanticText/);
  assert.doesNotMatch(mushafSource, /buildClusterGeometry/);
  assert.doesNotMatch(mushafSource, /document\.createRange/);
  assert.match(mushafSource, /closest\("\.page-marginalia"\)/);
  assert.match(mushafSource, /page-opening-layout/);
  assert.match(mushafStyleSource, /\.page-opening-layout/);
  assert.doesNotMatch(mushafStyleSource, /\.page-split/);
});

test("shared Mushaf geometry protects Arabic ink and cartouche titles", () => {
  assert.match(mushafStyleSource, /--mark-wash-pad-bottom:/);
  assert.doesNotMatch(mushafStyleSource, /--mark-underline-gap:/);
  assert.doesNotMatch(mushafStyleSource, /\.glyph-ink\.marked::after/);
  assert.match(
    mushafStyleSource,
    /\.glyph-ink\.marked[\s\S]*background: transparent/,
  );
  assert.match(mushafStyleSource, /--surah-band-title-size:/);
  assert.match(
    mushafStyleSource,
    /\.surah-band-title[\s\S]*font-size: var\(--surah-band-title-size\)/,
  );
  assert.match(
    mushafStyleSource,
    /\.page-opening-layout[\s\S]*repeat\(8, calc\(100% \/ 15\)\)/,
  );
  assert.match(
    mushafStyleSource,
    /\.page-surahs[\s\S]*line-height: 1\.35/,
  );
});

test("portrait Mushaf density is one scoped adjustment, not mobile spacing", () => {
  assert.match(mushafStyleSource, /--mushaf-line-fluid-size: 5\.55cqi/);
  assert.match(mushafStyleSource, /--mushaf-basmala-fluid-size: 5cqi/);
  assert.match(mushafStyleSource, /--surah-band-title-fluid-size: 4\.2cqi/);
  assert.match(
    mushafStyleSource,
    /\.m-line[\s\S]*font-size: clamp\(18px, var\(--mushaf-line-fluid-size\), 33px\)/,
  );
  assert.match(
    mushafStyleSource,
    /\.m-line-basmala[\s\S]*font-size: clamp\(17px, var\(--mushaf-basmala-fluid-size\), 29px\)/,
  );

  const portraitStart = mushafStyleSource.indexOf(
    "@media (max-width: 600px) and (orientation: portrait)",
  );
  const nextCompactBlock = mushafStyleSource.indexOf(
    "@media (max-width: 600px) {",
    portraitStart,
  );
  assert.notEqual(portraitStart, -1);
  assert.notEqual(nextCompactBlock, -1);

  const portraitDensityBlock = mushafStyleSource.slice(
    portraitStart,
    nextCompactBlock,
  );
  assert.match(
    portraitDensityBlock,
    /\.app\.view-judge \.mushaf-composition \.page/,
  );
  assert.match(
    portraitDensityBlock,
    /\.app\.view-judge \.mushaf-composition[\s\S]*-webkit-text-size-adjust: 100%[\s\S]*text-size-adjust: 100%/,
  );
  assert.match(portraitDensityBlock, /--mushaf-line-fluid-size: 5\.74cqi/);
  assert.match(portraitDensityBlock, /--mushaf-basmala-fluid-size: 5\.17cqi/);
  assert.match(portraitDensityBlock, /--surah-band-title-fluid-size: 4\.34cqi/);
  assert.doesNotMatch(portraitDensityBlock, /\.m-word|\.m-line-ayah/);
  assert.doesNotMatch(
    portraitDensityBlock,
    /word-spacing|letter-spacing|justify-content|\bgap\s*:/,
  );
});

test("compact header reserves stable controls while the reciter name truncates", () => {
  assert.match(headerSource, /className="header-context"/);
  assert.match(headerSource, /className="reciter-name"/);
  assert.match(
    mushafStyleSource,
    /grid-template-columns: auto minmax\(0, 1fr\) 44px 44px 44px/,
  );
  assert.match(
    mushafStyleSource,
    /@media \(max-width: 600px\) \{[\s\S]*?\.app-header \{[\s\S]*?z-index: 40;/,
  );
  assert.match(
    mushafStyleSource,
    /\.reciter-name[\s\S]*text-overflow: ellipsis/,
  );
});

test("compact live controls expose 44px targets without enlarging their visual surfaces", () => {
  assert.match(pageNavSource, /className="page-nav-ink"/);
  assert.match(
    mushafStyleSource,
    /\.view-toggle \{[\s\S]*?min-width: 44px;[\s\S]*?height: 44px;/,
  );
  assert.match(
    mushafStyleSource,
    /\.app-header > \.btn-icon,[\s\S]*?width: 44px;[\s\S]*?height: 44px;/,
  );
  assert.match(
    mushafStyleSource,
    /\.view-toggle::before,[\s\S]*?inset: 5px;/,
  );
  assert.match(
    mushafStyleSource,
    /\.page-nav-btn,[\s\S]*?\.page-nav-page \{[\s\S]*?height: 44px;/,
  );
  assert.match(
    mushafStyleSource,
    /\.page-nav-btn::before \{[\s\S]*?inset: 8px;/,
  );
  assert.match(mushafStyleSource, /\.page-nav-page::before \{[\s\S]*?inset: 8px 0;/);
});

test("desktop Fit is owned by a measured frame instead of another viewport guess", () => {
  assert.match(appSource, /className=\{`app view-\$\{view\}`\}/);
  assert.match(appSource, /<MushafViewport/);
  assert.match(mushafViewportSource, /new ResizeObserver\(measure\)/);
  assert.match(mushafViewportSource, /frame\.clientWidth/);
  assert.match(mushafViewportSource, /frame\.clientHeight/);
  assert.match(mushafStyleSource, /\.app\.view-judge[\s\S]*height: 100svh/);
  assert.match(
    mushafStyleSource,
    /\.mushaf-shell\[data-stage-fit="ready"\] \.mushaf-composition[\s\S]*--mushaf-fit-inline-size/,
  );
  assert.match(mushafStyleSource, /zoom: var\(--page-zoom\)/);
  assert.match(mushafStyleSource, /--mushaf-render-block-size/);
  assert.match(mushafSource, /value \/ renderScale/);
  assert.match(mushafStyleSource, /\.mushaf-shell[\s\S]*overflow: auto/);
  assert.match(
    mushafStyleSource,
    /@media \(max-width: 900px\)[\s\S]*\.workspace\.is-idle[\s\S]*grid-template-columns: 1fr/,
  );
  assert.doesNotMatch(mushafViewportSource, /transform: scale/);
});

test("QCF page fonts are loaded before a page is declared ready", () => {
  assert.match(qcfFontSource, /new FontFace/);
  assert.match(qcfFontSource, /await face\.load\(\)/);
  assert.match(qcfFontSource, /document\.fonts\.add/);
  assert.doesNotMatch(qcfFontSource, /document\.fonts\.check/);
  assert.match(mushafAssetsSource, /QCF_FONT_VERSION = "3\.1"/);
  assert.match(mushafAssetsSource, /p\$\{page\}\.woff2\?v=\$\{QCF_FONT_VERSION\}/);
});

test("V1 page data cannot collide with legacy cached V2 assets", () => {
  assert.match(mushafContractSource, /MUSHAF_DATA_VERSION/);
  assert.match(mushafAssetsSource, /MUSHAF_DATA_VERSION = "v1-1405-r2"/);
  assert.match(pageSource, /pageAssetUrl\(page\)/);
  assert.match(pageSource, /fetch\(pageAssetUrl\(page\)\)/);
  assert.match(pageSource, /data\.font !== "qcf-v1"/);
  assert.match(pageSource, /data\.layout !== MUSHAF_LAYOUT/);

  assert.match(serviceWorkerSource, /MUSHAF_DATA_VERSION = "v1-1405-r2"/);
  assert.match(serviceWorkerSource, /STATIC_CACHE = "tahqeeq-static-" \+ APP_CACHE_VERSION/);
  assert.match(serviceWorkerSource, /pages\/p604\.json\?v=" \+ MUSHAF_DATA_VERSION/);
  assert.match(
    serviceWorkerSource,
    /static-cdn\.tarteel\.ai.*v1-optimized\/woff2/s,
  );
  assert.doesNotMatch(serviceWorkerSource, /static\.qurancdn\.com/);
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

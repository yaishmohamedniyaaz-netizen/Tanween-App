// Lay out old Madina pages with DigitalKhatt's own web justification (MIT) and
// HarfBuzz justification fork (hb.wasm, Old MIT), the OFL font. Mirrors
// hbmedina/page_view.ts draw() + renderLine(), with no DOM.
// Usage: node layout.mjs <website-checkout> <out-dir> [pages...]
import fs from 'node:fs';
import path from 'node:path';
import * as B from './bundle.mjs';
import hbjsFactory from './node_modules/harfbuzzjs/hb.js';

const [site, out, ...pageArgs] = process.argv.slice(2);
const assets = path.join(site, 'ClientApp/src/assets');
const { hbmod, analyzeLineForJust, justifyLine, FONTSIZE, OldMadinahQuranTextService: Q } = B;

// --- load wasm + font (loadHarfbuzz/loadAndCacheFont without fetch) ---
const wasm = fs.readFileSync(path.join(assets, 'hb.wasm'));
globalThis.fetch = async (url) => {
  const buf = fs.readFileSync(path.join(assets, url.replace(/^assets\//, '')));
  return { arrayBuffer: async () => buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) };
};
await hbmod.loadHarfbuzz('assets/hb.wasm');
for (let i = 0; i < 200 && !hbmod.hb; i++) await new Promise((r) => setTimeout(r, 10));
if (!hbmod.hb) throw new Error('hb.wasm did not load');
await hbmod.loadAndCacheFont('oldmadina', 'assets/fonts/hb/oldmadina.otf');
const font = hbmod.harfbuzzFonts.get('oldmadina');
const HB = hbmod.hb;

// --- page geometry at viewport scale 1 (DEFAULT_PAGE_SIZE 255 x 410) ---
const VIEW_W = 255, VIEW_H = 410;
const fontSizePx = VIEW_W / (16400 / 1000);
const glyphScale = fontSizePx / FONTSIZE;          // px per font unit
const U = (px) => px / glyphScale;                   // px -> font units
const PAGE_W = U(VIEW_W), PAGE_H = U(VIEW_H);
const scalePx = VIEW_W / 17000;
const MARGIN = U(400 * scalePx);
const LINE_H = U(1800 * scalePx);
const lineWidthPx = VIEW_W - 2 * 400 * scalePx;
const fontSizeLineWidthRatio = fontSizePx / lineWidthPx;
const spaceWidth = hbmod.getWidth(' ', font, FONTSIZE, null);

const paths = new Map();
function glyphPath(gid) {
  if (!paths.has(gid)) paths.set(gid, font.glyphToSvgPath(gid));
  return paths.get(gid);
}

function shapeLine(page, lineIndex, lineTextInfo, justResult) {
  const lineText = Q.quranText[page][lineIndex];
  const features = lineTextInfo.features ? [...lineTextInfo.features] : [];
  for (const f of justResult.globalFeatures || []) features.push({ tag: f.name, value: f.value, start: 0, end: -1 });
  if (justResult.fontFeatures?.size > 0) {
    for (const w of lineTextInfo.wordInfos) {
      for (let i = w.startIndex; i <= w.endIndex; i++) {
        for (const f of justResult.fontFeatures.get(i) || []) features.push({ tag: f.name, value: f.value, start: i, end: i + 1 });
      }
    }
  }
  const buffer = new hbmod.HarfBuzzBuffer();
  buffer.setDirection('rtl');
  buffer.setLanguage(HB.arabLanguage);
  buffer.setScript(HB.arabScript);
  buffer.setClusterLevel(1);
  buffer.addText(lineText);
  buffer.shape(font, features);
  const result = buffer.json();
  buffer.destroy();
  const glyphs = [];
  let x = 0;
  for (let gi = result.length - 1; gi >= 0; gi--) {
    const g = result[gi];
    const space = lineTextInfo.spaces.get(g.Cluster);
    if (space === 2) x -= justResult.ayaSpacing;
    else if (space === 1) x -= justResult.simpleSpacing;
    else x -= g.XAdvance;
    const d = glyphPath(g.GlyphId);
    glyphs.push({ g: g.GlyphId, c: g.Cluster, x: Math.round(x + g.XOffset), y: Math.round(g.YOffset), ink: d.length > 0 });
  }
  return { text: lineText, glyphs, advance: -x };
}

function layoutPage(page) {
  const lines = [];
  const count = Q.quranText[page].length;
  for (let li = 0; li < count; li++) {
    const info = Q.getLineInfo(page, li);
    const text = Q.quranText[page][li];
    const top = li * LINE_H;
    const justified = info.lineType === 0 || (info.lineType === 2 && (page === 0 || page === 1));
    if (justified) {
      let margin = MARGIN;
      const lineWidthU = U(lineWidthPx);
      if (info.lineWidthRatio !== 1) margin += (lineWidthU - lineWidthU * info.lineWidthRatio) / 2;
      const lti = analyzeLineForJust(Q, page, li);
      const jr = justifyLine(lti, font, fontSizeLineWidthRatio / info.lineWidthRatio, spaceWidth, Q.mushafType, 2 /* XScale */);
      const s = shapeLine(page, li, lti, jr);
      lines.push({ type: 'text', top, right: PAGE_W - margin, xScale: jr.xScale, scale: 1, ...s });
    } else if (info.lineType === 2) {
      const lti = analyzeLineForJust(Q, page, li);
      const jr = { globalFeatures: [{ name: 'basm', value: 1 }], fontFeatures: new Map(), simpleSpacing: spaceWidth, ayaSpacing: spaceWidth, xScale: 1 };
      const s = shapeLine(page, li, lti, jr);
      // Basmala: 0.9 size, centred on the page.
      const w = s.advance * 0.9;
      lines.push({ type: 'basmala', top, right: PAGE_W / 2 + w / 2, xScale: 1, scale: 0.9, ...s });
    } else {
      lines.push({ type: 'sura', top, text, glyphs: [] });
    }
  }
  return { page: page + 1, width: Math.round(PAGE_W), height: Math.round(PAGE_H), lineHeight: LINE_H, lines };
}

fs.mkdirSync(out, { recursive: true });
const pages = pageArgs.length ? pageArgs.map(Number) : Array.from({ length: Q.quranText.length }, (_, i) => i + 1);
for (const p of pages) {
  const lay = layoutPage(p - 1);
  fs.writeFileSync(path.join(out, `layout-p${p}.json`), JSON.stringify(lay));
}
const atlas = {};
for (const [gid, d] of [...paths].sort((a, b) => a[0] - b[0])) atlas[gid] = d;
fs.writeFileSync(path.join(out, `atlas-${pages.length === 604 ? 'all' : pages.join('-')}.json`), JSON.stringify(atlas));
console.log(JSON.stringify({ pages: pages.length, glyphKinds: paths.size, PAGE_W, PAGE_H, MARGIN, LINE_H, spaceWidth, nPagesText: Q.quranText.length }));

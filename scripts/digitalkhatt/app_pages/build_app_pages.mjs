// Build the app's DigitalKhatt page files from layout.mjs + map_hb.py output.
// Usage: node build_app_pages.mjs <layout-dir> <owners-dir> <targets.json> <out-dir>
//
// Output (all coordinates in the 1920 x 3106 artwork frame the app already uses):
//   glyphs.json  { gid: "svg path in font units" }        (shared by all pages)
//   p{N}.json    {
//     page, scale, lines: [{ n, type, base, right, sx, sy, g: [[gid, x, y, word, unit, unit2?]] }],
//     words: [{ wid, line, body: [x0,y0,x1,y1], band: [...] }],   // ink box and line-height box
//     units: ["tid", ...],                                         // unit index -> tid
//     headers: [{ n, slot: [y0, y1], art: [y0, y1] }]              // surah header strips from the artwork
//   }
//   Glyph x/y are font units inside the line group; the line group is
//   translate(right, base) scale(sx, -sy) in artwork px (sx, sy include the page scale).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const [layoutDir, ownersDir, targetsPath, outDir] = process.argv.slice(2);
const targets = JSON.parse(fs.readFileSync(targetsPath, 'utf8'));
const atlasFile = fs.readdirSync(layoutDir).find((f) => f.startsWith('atlas-all'));
const atlasRaw = JSON.parse(fs.readFileSync(path.join(layoutDir, atlasFile), 'utf8'));

// Integer font units: 1 unit = 0.117 artwork px, far below one screen pixel.
const atlas = {};
const bbox = {};
for (const [gid, d] of Object.entries(atlasRaw)) {
  const rounded = d.replace(/-?\d+(?:\.\d+)?(?:e-?\d+)?/g, (n) => String(Math.round(Number(n))));
  atlas[gid] = rounded;
  const nums = (rounded.match(/-?\d+/g) || []).map(Number);
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (let i = 0; i + 1 < nums.length; i += 2) {
    x0 = Math.min(x0, nums[i]); x1 = Math.max(x1, nums[i]);
    y0 = Math.min(y0, nums[i + 1]); y1 = Math.max(y1, nums[i + 1]);
  }
  bbox[gid] = nums.length ? [x0, y0, x1, y1] : null;
}

const ART_W = 1920, ART_H = 3106;
const TOP = 400; // first-line padding of the DigitalKhatt web page (0.4 em)
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'glyphs.json'), JSON.stringify(atlas));

const round1 = (v) => Math.round(v * 10) / 10;
let maxBottom = 0;
for (let page = 1; page <= 604; page++) {
  const layout = JSON.parse(fs.readFileSync(path.join(layoutDir, `layout-p${page}.json`), 'utf8'));
  const owners = JSON.parse(fs.readFileSync(path.join(ownersDir, `owners-p${page}.json`), 'utf8'));
  const appWords = targets.pages[page - 1].words;
  const s = ART_W / layout.width;
  const contentH = TOP + layout.lines.length * layout.lineHeight;
  const oy = (ART_H - contentH * s) / 2;
  const Y = (v) => oy + v * s;

  const wordIndex = new Map(appWords.map((w, i) => [w.wid, i]));
  const unitIndex = new Map();
  const units = [];
  const unitOf = (tid) => {
    if (!unitIndex.has(tid)) { unitIndex.set(tid, units.length); units.push(tid); }
    return unitIndex.get(tid);
  };
  const ink = appWords.map(() => [Infinity, Infinity, -Infinity, -Infinity]);
  const lines = [];
  const headers = [];
  layout.lines.forEach((L, li) => {
    const n = li + 1;
    const slotTop = Y(TOP + L.top), slotBottom = Y(TOP + L.top + layout.lineHeight);
    if (L.type === 'sura') { headers.push({ n, slot: [round1(slotTop), round1(slotBottom)] }); return; }
    const base = TOP + L.top + layout.lineHeight / 2;
    const sx = L.xScale * L.scale * s, sy = L.scale * s;
    const right = L.right * s, baseY = Y(base);
    const g = [];
    L.glyphs.forEach((gl, gi) => {
      if (!gl.ink) return;
      const [wid, tids] = owners[li][gi];
      const w = wid == null ? -1 : wordIndex.get(wid);
      if (wid != null && w === undefined) throw new Error(`Unknown word ${wid} p${page}`);
      const entry = [gl.g, gl.x, gl.y, w, tids.length ? unitOf(tids[0]) : -1];
      if (tids.length > 1) entry.push(unitOf(tids[1]));
      g.push(entry);
      const b = bbox[gl.g];
      if (b && w >= 0) {
        const X0 = right + (gl.x + b[0]) * sx, X1 = right + (gl.x + b[2]) * sx;
        const Y0 = baseY - (gl.y + b[3]) * sy, Y1 = baseY - (gl.y + b[1]) * sy;
        const box = ink[w];
        box[0] = Math.min(box[0], X0); box[1] = Math.min(box[1], Y0);
        box[2] = Math.max(box[2], X1); box[3] = Math.max(box[3], Y1);
        maxBottom = Math.max(maxBottom, Y1);
      }
    });
    lines.push({ n, type: L.type, base: round1(baseY), right: round1(right), sx: +sx.toFixed(6), sy: +sy.toFixed(6), g });
  });
  const lineSlot = new Map(layout.lines.map((L, li) => [li + 1, [Y(TOP + L.top), Y(TOP + L.top + layout.lineHeight)]]));
  const words = appWords.map((w, i) => {
    const b = ink[i];
    if (!(b[0] < b[2])) throw new Error(`No ink for ${w.wid} p${page}`);
    const [t, bt] = lineSlot.get(w.line);
    return { wid: w.wid, line: w.line, body: b.map(round1), band: [round1(b[0]), round1(t), round1(b[2]), round1(bt)] };
  });

  // Surah header strips: where that line sits on the printed artwork.
  if (headers.length) {
    const art = JSON.parse(fs.readFileSync(path.join(root, `public/mushaf/1405-artwork-5a5f9f3846158475/p${page}.json`), 'utf8'));
    const centres = new Map();
    for (const w of art.words) {
      if (!centres.has(w.line)) centres.set(w.line, []);
      centres.get(w.line).push((w.band[1] + w.band[3]) / 2);
    }
    const pts = [...centres].map(([line, cs]) => [line, cs.sort((a, b) => a - b)[cs.length >> 1]]);
    let a = 0, b = ART_H / 15;
    if (pts.length >= 2) {
      const mx = pts.reduce((t, p) => t + p[0], 0) / pts.length, my = pts.reduce((t, p) => t + p[1], 0) / pts.length;
      const sxx = pts.reduce((t, p) => t + (p[0] - mx) ** 2, 0), sxy = pts.reduce((t, p) => t + (p[0] - mx) * (p[1] - my), 0);
      b = sxy / sxx; a = my - b * mx;
    } else if (pts.length === 1) a = pts[0][1] - b * pts[0][0];
    for (const h of headers) {
      const c = a + b * h.n;
      h.art = [round1(Math.max(0, c - b / 2)), round1(Math.min(ART_H, c + b / 2))];
    }
  }
  fs.writeFileSync(path.join(outDir, `p${page}.json`), JSON.stringify({ page, version: 1, lines, words, units, headers }));
}
console.log(JSON.stringify({ pages: 604, glyphs: Object.keys(atlas).length, maxInkBottomPx: Math.round(maxBottom) }));

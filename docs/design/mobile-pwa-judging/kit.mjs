import fs from "node:fs";

const here = (f) => new URL(f, import.meta.url);
export const HAFS = fs.readFileSync(here("./hafs.b64"), "utf8").trim();
const WORDS = JSON.parse(fs.readFileSync(here("./words.json"), "utf8"));
const PAGE = JSON.parse(fs.readFileSync(here("../../../public/pages/p562.json"), "utf8"));

/* Flat word stream of Surah al-Mulk, Mushaf page 562, verbatim from
   public/pages/p562.json. The app renders the per-page QCF font, whose glyphs
   fill each printed line exactly; HafsUthmanic is ~1.7x wider, so the printed
   line breaks cannot be reproduced. Words, order and text are unchanged —
   only where the lines break differs. */
const AYAH_WORDS = PAGE.lines
  .filter((l) => l.type === "ayah")
  .flatMap((l) => l.words.map((w) => w.text));
export const BASMALA = PAGE.lines.find((l) => l.type === "basmala").words.map((w) => w.text);
export const SURAH_AR = PAGE.lines.find((l) => l.type === "surah-header").nameAr;

/* Words carrying a mark, by their position in the stream. */
const MARKED = new Map();
{
  const norm = (t) => t.normalize("NFC");
  const at = (text, nth = 0) => {
    const hits = AYAH_WORDS.reduce((f, w, i) => (norm(w) === norm(text) ? (f.push(i), f) : f), []);
    if (hits[nth] === undefined) throw new Error(`mark target not on page 562: ${text}`);
    return hits[nth];
  };
  MARKED.set(at("تَفَٰوُتٖۖ"), "khafi");
  MARKED.set(at("كَرَّتَيۡنِ"), "jali");
  MARKED.set(at("بِمَصَٰبِيحَ"), "fasaha");
}

/** The three marked words, taken from the page itself. */
export const markedWords = Object.fromEntries(
  [...MARKED].map(([index, cat]) => [cat, AYAH_WORDS[index]]),
);

/** Greedy line packing: fills each line to the page's own text width. */
export function packLines(width, rows = 13) {
  const size = Math.min(33, Math.max(13, 0.0555 * width));
  const padX = Math.min(44, Math.max(16, 0.065 * width));
  /* 4% headroom: glyph advances do not scale perfectly linearly as the page
     narrows, and space-between absorbs the slack as wider word gaps. */
  const box = (width - 2 * padX) * 0.96;
  const gap = 0.2 * size;
  const lines = [];
  let line = [], w = 0;
  for (let i = 0; i < AYAH_WORDS.length && lines.length < rows; i += 1) {
    const word = AYAH_WORDS[i];
    const ww = (WORDS[word] ?? 2) * size;
    const next = line.length ? w + gap + ww : ww;
    if (line.length && next > box) {
      lines.push(line);
      line = [{ text: word, cat: MARKED.get(i) }];
      w = ww;
    } else {
      line.push({ text: word, cat: MARKED.get(i) });
      w = next;
    }
  }
  if (line.length && lines.length < rows) lines.push(line);
  return { lines, size };
}

export const CSS = `
@font-face{font-family:"HafsUthmanic";src:url(data:font/woff2;base64,${HAFS}) format("woff2");font-display:block}
*{box-sizing:border-box}
body{margin:0;background:#e7e5e0}
a{color:#5566e6}a:hover{color:#2f3aa3}
.f{
  --bg:#f2f1ee;--surface:#ffffff;--page-paper:#fbfaf7;
  --ink:#1a1a1c;--ink-2:#62626a;--ink-3:#6a6a73;
  --line:rgba(26,26,28,0.08);--line-2:rgba(26,26,28,0.16);
  --mushaf-ink:#1c1b16;--gold:#b3892f;
  --shadow-rest:0 1px 2px rgba(26,26,28,0.05);
  --shadow-float:0 12px 32px rgba(26,26,28,0.14),0 2px 8px rgba(26,26,28,0.08);
  --scrim:rgba(26,26,28,0.28);
  --ui:"Inter",system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;
  --quran:"HafsUthmanic",serif;
  font-family:var(--ui);color:var(--ink);background:var(--bg);
  -webkit-font-smoothing:antialiased;
}
.f[data-t="dark"]{
  --bg:#131316;--surface:#1c1c20;--page-paper:#211f1c;
  --ink:#ebebed;--ink-2:#a4a4ac;--ink-3:#8b8b95;
  --line:rgba(255,255,255,0.08);--line-2:rgba(255,255,255,0.16);
  --mushaf-ink:#eae7de;--gold:#c9a052;
  --shadow-rest:0 1px 2px rgba(0,0,0,0.4);
  --shadow-float:0 16px 40px rgba(0,0,0,0.5),0 3px 10px rgba(0,0,0,0.35);
  --scrim:rgba(0,0,0,0.46);
}
.cat-jali{--c:#d8453d;--c-strong:#9e2820;--c-tint:#fcecea;--c-wash:rgba(216,69,61,.14)}
.cat-khafi{--c:#c0892a;--c-strong:#7c540e;--c-tint:#faf2dc;--c-wash:rgba(192,137,42,.16)}
.cat-fasaha{--c:#5566e6;--c-strong:#2f3aa3;--c-tint:#eceefb;--c-wash:rgba(85,102,230,.13)}
.cat-adu{--c:#377b60;--c-strong:#26624b;--c-tint:#eef8f3;--c-wash:rgba(55,123,96,.14)}
.f[data-t="dark"] .cat-jali{--c-tint:rgba(216,69,61,.18);--c-strong:#f0a8a2}
.f[data-t="dark"] .cat-khafi{--c-tint:rgba(192,137,42,.2);--c-strong:#e6c07a}
.f[data-t="dark"] .cat-fasaha{--c-tint:rgba(110,124,240,.2);--c-strong:#aeb8f6}
.f[data-t="dark"] .cat-adu{--c-tint:rgba(55,123,96,.22);--c-strong:#a5cfbc}
.num{font-variant-numeric:tabular-nums}
.lbl{font-size:11px;font-weight:500;letter-spacing:.08em;text-transform:uppercase;color:var(--ink-3)}

/* Mushaf page — geometry from .page / .mushaf-lines / .m-line in global.css */
.page{
  position:relative;display:grid;grid-template-rows:auto minmax(0,1fr);
  container-type:inline-size;aspect-ratio:.68;flex:0 0 auto;
  background:var(--page-paper);border:1px solid var(--line);border-radius:20px;
  padding:12px 0 8px;box-shadow:var(--shadow-rest);overflow:hidden;
}
.page-marginalia{
  display:grid;grid-template-columns:minmax(0,1fr) auto minmax(0,1fr);align-items:center;gap:8px;
  min-height:24px;padding-inline:clamp(16px,6.5cqi,44px);color:var(--ink-2);font-size:10px;
}
.page-surahs{font-family:var(--quran);font-size:1.35em;line-height:1.35;text-align:right;justify-self:end}
.mushaf-lines{
  position:relative;display:grid;grid-template-rows:repeat(15,minmax(0,1fr));min-height:0;
  padding:clamp(6px,1.4cqi,12px) clamp(16px,6.5cqi,44px) clamp(4px,1cqi,9px);
}
.m-line{
  direction:rtl;align-self:center;min-width:0;font-family:var(--quran);
  font-weight:400;line-height:1;color:var(--mushaf-ink);white-space:nowrap;
}
.m-line-ayah{display:flex;align-items:center;justify-content:space-between}
.m-line-basmala{display:flex;align-items:center;justify-content:center;gap:.4em;
  color:color-mix(in srgb,var(--mushaf-ink) 82%,var(--page-paper))}
.m-word{position:relative;display:inline-block;line-height:1}
.m-word.marked::before{content:"";position:absolute;inset:-3px -1px -5px;border-radius:3px;
  background:var(--c-wash);mix-blend-mode:multiply}
.f[data-t="dark"] .m-word.marked::before{mix-blend-mode:screen}
.m-word.marked>span{position:relative}
.surah-band{position:relative;display:flex;align-items:center;justify-content:center;align-self:center;height:100%;color:var(--mushaf-ink)}
.surah-band::before{content:"";position:absolute;inset:0;border:2px solid currentColor;border-radius:2px;opacity:.9}
.surah-band::after{content:"";position:absolute;inset:clamp(3px,.9cqi,4px);border:1px solid currentColor;border-radius:1px;opacity:.65}
.surah-band-title{position:relative;font-family:var(--quran);font-size:clamp(11px,4.2cqi,26px);line-height:1.15;padding:clamp(1px,.25cqi,2px) clamp(12px,3.8cqi,24px)}
`;

/** Icon paths lifted verbatim from src/components/Icon.tsx (24px, stroke 2). */
const P = {
  fileCheck: ["M14 2H6a2 2 0 0 0 -2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2 -2V8z", "M14 2v6h6", "M9 15l2 2l4 -4"],
  moon: ["M12 3c.132 0 .263 0 .393 0a7.5 7.5 0 0 0 7.92 12.446a9 9 0 1 1 -8.313 -12.454z"],
  dots: [
    "M5 12m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0",
    "M12 12m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0",
    "M19 12m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0",
  ],
  chevron: ["M9 6l6 6l-6 6"],
  back: ["M5 12l14 0", "M5 12l6 6", "M5 12l6 -6"],
  minus: ["M5 12l14 0"],
  plus: ["M12 5l0 14", "M5 12l14 0"],
  refresh: ["M20 12a8 8 0 1 1 -2.34 -5.66", "M20 4v6h-6"],
  marks: [
    "M14 6m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0", "M4 6l8 0", "M16 6l4 0",
    "M8 12m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0", "M4 12l2 0", "M10 12l10 0",
    "M17 18m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0", "M4 18l11 0", "M19 18l1 0",
  ],
  check: ["M5 12l5 5l10 -10"],
  close: ["M6 6l12 12", "M18 6l-12 12"],
};
export const icon = (name, size = 17, extra = "") =>
  `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"${extra ? ` style="${extra}"` : ""}>${P[name].map((d) => `<path d="${d}"></path>`).join("")}</svg>`;

/** The Mushaf page at a fixed CSS width. Page nav floats in its centre slot. */
export function mushafPage(width, opts = {}) {
  const { lines } = packLines(width);
  const size = "clamp(13px, 5.55cqi, 33px)";
  const basmalaSize = "clamp(12px, 5cqi, 29px)";
  const body = [
    `<div class="m-line" style="font-size:${size}"><div class="surah-band"><span class="surah-band-title">${SURAH_AR}</span></div></div>`,
    `<div class="m-line m-line-basmala" style="font-size:${basmalaSize}">${BASMALA.map((w) => `<span class="m-word">${w}</span>`).join("")}</div>`,
    ...lines.map(
      (line) =>
        `<div class="m-line m-line-ayah" style="font-size:${size}">${line
          .map((w) =>
            w.cat
              ? `<span class="m-word marked cat-${w.cat}"><span>${w.text}</span></span>`
              : `<span class="m-word">${w.text}</span>`,
          )
          .join("")}</div>`,
    ),
  ].join("\n        ");
  return `<div class="page" style="width: min(${width}px, 100%)">
      <div class="page-marginalia">
        <span>Juz 29</span>
        <span style="min-width: 52px"></span>
        <span class="page-surahs">${SURAH_AR}</span>
      </div>
      <div class="mushaf-lines">
        ${body}
      </div>
      ${opts.nav ?? ""}
    </div>`;
}

export function dc({ body, props, logic, css = "" }) {
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <script src="./support.js"></script>
</head>
<body>
<x-dc>
<helmet>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@100..900&display=swap">
  <style>${CSS}${css}</style>
</helmet>
${body}
</x-dc>
<script data-dc-script data-props='${props}'>
${logic}
</script>
</body>
</html>
`;
}

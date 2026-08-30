import fs from "node:fs";

export const HAFS = fs.readFileSync(new URL("./hafs.b64", import.meta.url), "utf8").trim();

/* Surah al-Mulk, Mushaf page 562 — text lifted verbatim from public/pages/p562.json */
export const PAGE562 = [
  { t: "surah", ar: "الملك" },
  { t: "basmala", w: ["بِسۡمِ", "ٱللَّهِ", "ٱلرَّحۡمَٰنِ", "ٱلرَّحِيمِ"] },
  { t: "ayah", w: ["تَبَٰرَكَ","ٱلَّذِي","بِيَدِهِ","ٱلۡمُلۡكُ","وَهُوَ","عَلَىٰ","كُلِّ","شَيۡءٖ","قَدِيرٌ","١","ٱلَّذِي","خَلَقَ"] },
  { t: "ayah", w: ["ٱلۡمَوۡتَ","وَٱلۡحَيَوٰةَ","لِيَبۡلُوَكُمۡ","أَيُّكُمۡ","أَحۡسَنُ","عَمَلٗاۚ","وَهُوَ","ٱلۡعَزِيزُ","ٱلۡغَفُورُ","٢"] },
  { t: "ayah", w: ["ٱلَّذِي","خَلَقَ","سَبۡعَ","سَمَٰوَٰتٖ","طِبَاقٗاۖ","مَّا","تَرَىٰ","فِي","خَلۡقِ","ٱلرَّحۡمَٰنِ","مِن"] },
  { t: "ayah", w: ["تَفَٰوُتٖۖ","فَٱرۡجِعِ","ٱلۡبَصَرَ","هَلۡ","تَرَىٰ","مِن","فُطُورٖ","٣","ثُمَّ","ٱرۡجِعِ","ٱلۡبَصَرَ","كَرَّتَيۡنِ"] },
  { t: "ayah", w: ["يَنقَلِبۡ","إِلَيۡكَ","ٱلۡبَصَرُ","خَاسِئٗا","وَهُوَ","حَسِيرٞ","٤","وَلَقَدۡ","زَيَّنَّا","ٱلسَّمَآءَ"] },
  { t: "ayah", w: ["ٱلدُّنۡيَا","بِمَصَٰبِيحَ","وَجَعَلۡنَٰهَا","رُجُومٗا","لِّلشَّيَٰطِينِۖ","وَأَعۡتَدۡنَا","لَهُمۡ","عَذَابَ"] },
  { t: "ayah", w: ["ٱلسَّعِيرِ","٥","وَلِلَّذِينَ","كَفَرُواْ","بِرَبِّهِمۡ","عَذَابُ","جَهَنَّمَۖ","وَبِئۡسَ","ٱلۡمَصِيرُ"] },
  { t: "ayah", w: ["٦","إِذَآ","أُلۡقُواْ","فِيهَا","سَمِعُواْ","لَهَا","شَهِيقٗا","وَهِيَ","تَفُورُ","٧","تَكَادُ","تَمَيَّزُ"] },
  { t: "ayah", w: ["مِنَ","ٱلۡغَيۡظِۖ","كُلَّمَآ","أُلۡقِيَ","فِيهَا","فَوۡجٞ","سَأَلَهُمۡ","خَزَنَتُهَآ","أَلَمۡ","يَأۡتِكُمۡ","نَذِيرٞ","٨"] },
  { t: "ayah", w: ["قَالُواْ","بَلَىٰ","قَدۡ","جَآءَنَا","نَذِيرٞ","فَكَذَّبۡنَا","وَقُلۡنَا","مَا","نَزَّلَ","ٱللَّهُ","مِن","شَيۡءٍ","إِنۡ","أَنتُمۡ"] },
  { t: "ayah", w: ["إِلَّا","فِي","ضَلَٰلٖ","كَبِيرٖ","٩","وَقَالُواْ","لَوۡ","كُنَّا","نَسۡمَعُ","أَوۡ","نَعۡقِلُ","مَا","كُنَّا","فِيٓ","أَصۡحَٰبِ"] },
  { t: "ayah", w: ["ٱلسَّعِيرِ","١٠","فَٱعۡتَرَفُواْ","بِذَنۢبِهِمۡ","فَسُحۡقٗا","لِّأَصۡحَٰبِ","ٱلسَّعِيرِ","١١"] },
  { t: "ayah", w: ["إِنَّ","ٱلَّذِينَ","يَخۡشَوۡنَ","رَبَّهُم","بِٱلۡغَيۡبِ","لَهُم","مَّغۡفِرَةٞ","وَأَجۡرٞ","كَبِيرٞ","١٢"] },
];

/* word index -> mark, keyed "lineIndex:wordIndex" */
export const MARKS = { "5:11": { cat: "jali", n: 1 }, "10:5": { cat: "khafi", n: 1 }, "12:8": { cat: "fasaha", n: 1 } };

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

/* ---- Mushaf page: geometry copied from .page / .mushaf-lines / .m-line ---- */
.page{
  --fluid:5.55cqi;
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
  font-size:clamp(13px,var(--fluid),33px);font-weight:400;line-height:1;color:var(--mushaf-ink);white-space:nowrap;
}
.m-line-ayah{display:flex;align-items:center;justify-content:space-between}
.m-line-basmala{display:flex;align-items:center;justify-content:center;gap:.4em;
  font-size:clamp(12px,5cqi,29px);color:color-mix(in srgb,var(--mushaf-ink) 82%,var(--page-paper))}
.m-word{position:relative;display:inline-block;line-height:1}
.m-word.marked::before{content:"";position:absolute;inset:-3px -1px -5px;border-radius:3px;background:var(--c-wash)}
.m-word.marked>span{position:relative}
.mark-count{position:absolute;top:-7px;right:-6px;min-width:14px;height:14px;padding:0 3px;border-radius:999px;
  background:var(--c);color:#fff;font-family:var(--ui);font-size:9.5px;font-weight:500;display:grid;place-items:center;
  font-variant-numeric:tabular-nums;line-height:1}
.surah-band{position:relative;display:flex;align-items:center;justify-content:center;align-self:center;height:100%;color:var(--mushaf-ink)}
.surah-band::before{content:"";position:absolute;inset:0;border:2px solid currentColor;border-radius:2px;opacity:.9}
.surah-band::after{content:"";position:absolute;inset:clamp(3px,.9cqi,4px);border:1px solid currentColor;border-radius:1px;opacity:.65}
.surah-band-title{position:relative;font-family:var(--quran);font-size:clamp(11px,4.2cqi,26px);line-height:1.15;padding:clamp(1px,.25cqi,2px) clamp(12px,3.8cqi,24px)}

/* ---- safe-area guides (tweak) ---- */
.guide{position:absolute;left:0;right:0;pointer-events:none;display:flex;align-items:center;justify-content:center}
.guide::before{content:"";position:absolute;inset:0;border:1px dashed rgba(85,102,230,.42)}
.guide i{font-style:normal;font-size:9px;letter-spacing:.08em;text-transform:uppercase;color:#5566e6;opacity:.8;font-family:var(--ui)}
`;

export const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Renders the Mushaf page at a fixed CSS width, aspect 0.68, with marks baked in. */
export function mushafPage(width, opts = {}) {
  const marks = opts.marks === false ? {} : MARKS;
  const lines = PAGE562.map((ln, li) => {
    if (ln.t === "surah") {
      return `<div class="m-line"><div class="surah-band"><span class="surah-band-title">${ln.ar}</span></div></div>`;
    }
    const words = ln.w
      .map((w, wi) => {
        const m = marks[`${li}:${wi}`];
        if (!m) return `<span class="m-word">${w}</span>`;
        return `<span class="m-word marked cat-${m.cat}"><span>${w}</span><i class="mark-count">${m.n}</i></span>`;
      })
      .join("");
    const cls = ln.t === "basmala" ? "m-line m-line-basmala" : "m-line m-line-ayah";
    return `<div class="${cls}">${words}</div>`;
  }).join("\n        ");
  return `<div class="page" style="width: ${width}px">
      <div class="page-marginalia">
        <span>Juz 29</span>
        <span style="min-width: 28px; text-align: center; visibility: hidden">562</span>
        <span class="page-surahs">الملك</span>
      </div>
      <div class="mushaf-lines">
        ${lines}
      </div>
    </div>`;
}

/** Inline SVG icons — stroke-based, 20px grid. */
export const icon = {
  back: `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12.5 4.5 7 10l5.5 5.5"/></svg>`,
  chevR: `<svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M7.5 4.5 13 10l-5.5 5.5"/></svg>`,
  chevL: `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12.5 4.5 7 10l5.5 5.5"/></svg>`,
  chevUp: `<svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M4.5 12.5 10 7l5.5 5.5"/></svg>`,
  chevDown: `<svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M4.5 7.5 10 13l5.5-5.5"/></svg>`,
  pause: `<svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><path d="M7.5 4.5v11M12.5 4.5v11"/></svg>`,
  more: `<svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor"><circle cx="4" cy="10" r="1.5"/><circle cx="10" cy="10" r="1.5"/><circle cx="16" cy="10" r="1.5"/></svg>`,
  undo: `<svg width="17" height="17" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9h8.5a3.5 3.5 0 0 1 0 7H8"/><path d="M6.8 5.6 3.6 9l3.2 3.4"/></svg>`,
  close: `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><path d="M5.5 5.5l9 9M14.5 5.5l-9 9"/></svg>`,
  note: `<svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4.5 3.5h11v13h-11z"/><path d="M7.5 7h5M7.5 10h5M7.5 13h3"/></svg>`,
};

/** Wraps a body in the .dc.html envelope. */
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

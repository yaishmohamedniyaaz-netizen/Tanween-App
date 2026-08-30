/* Renders .dc.html artboards to plain HTML so the design can be screenshotted
   without the canvas runtime. Resolution only — it never edits the artboards. */
import fs from "node:fs";

function findEnd(s, from) {
  const re = /<\/?sc-(if|for)\b/g;
  re.lastIndex = from;
  let depth = 0, m;
  while ((m = re.exec(s))) {
    if (m[0][1] === "/") {
      depth--;
      if (depth === 0) return { inner: [from, m.index], after: s.indexOf(">", m.index) + 1 };
    } else depth++;
  }
  throw new Error("unbalanced sc- tag");
}

const get = (ctx, path) =>
  path.trim().split(".").reduce((o, k) => (o == null ? o : o[k]), ctx);

function render(html, ctx) {
  let out = "";
  let i = 0;
  for (;;) {
    const open = html.slice(i).search(/<sc-(if|for)\b/);
    if (open < 0) { out += resolveHoles(html.slice(i), ctx); break; }
    const start = i + open;
    out += resolveHoles(html.slice(i, start), ctx);
    const tagEnd = html.indexOf(">", start) + 1;
    const tag = html.slice(start, tagEnd);
    const { inner, after } = findEnd(html, start);
    const body = html.slice(tagEnd, inner[1]);
    if (tag.startsWith("<sc-if")) {
      const key = /value="\{\{([^}]+)\}\}"/.exec(tag)[1];
      if (get(ctx, key)) out += render(body, ctx);
    } else {
      const key = /list="\{\{([^}]+)\}\}"/.exec(tag)[1];
      const as = /as="([^"]+)"/.exec(tag)[1];
      for (const item of get(ctx, key) || []) out += render(body, { ...ctx, [as]: item });
    }
    i = after;
  }
  return out;
}

const resolveHoles = (s, ctx) =>
  s
    .replace(/\s*onClick="\{\{[^}]*\}\}"/g, "")
    .replace(/\{\{([^}]+)\}\}/g, (_, p) => {
      const v = get(ctx, p);
      return v === undefined || typeof v === "function" ? "" : String(v);
    });

/* the shared score model, mirrored from chrome.mjs MODEL */
const criteria = (u) => [
  { id: "jali", cls: "cat-jali", name: "Laḥn Jalī", short: "Jalī", score: 48, max: 50, ded: "−2" },
  { id: "khafi", cls: "cat-khafi", name: "Laḥn Khafī", short: "Khafī", score: 29, max: 30, ded: "−1" },
  { id: "fasaha", cls: "cat-fasaha", name: "Faṣāḥa", short: "Faṣ", score: u ? 10 : 9.5, max: 10, ded: u ? "—" : "−0.5" },
  { id: "adu", cls: "cat-adu", name: "Adu / Raagu", short: "Adu", score: 8.5, max: 10, ded: "−1.5" },
];
const rowsOf = (u) => criteria(u).map((c) => ({
  cls: c.cls, name: c.name, ded: c.ded, score: c.score, max: c.max,
  dedInk: c.ded === "—" ? "var(--ink-3)" : "var(--ink-2)",
  editable: c.id === "adu", readonly: c.id !== "adu",
}));
const markList = (u) => {
  const all = [
    { cls: "cat-fasaha", glyph: "نَذِيرٞ", amt: "−0.5", detail: "Faṣāḥa · 67:8 · 2:14" },
    { cls: "cat-khafi", glyph: "لَهَا", amt: "−1", detail: "Laḥn Khafī · 67:7 · 1:52" },
    { cls: "cat-jali", glyph: "كَرَّتَيۡنِ", amt: "−2", detail: "Laḥn Jalī · 67:4 · 1:09" },
  ];
  return u ? all.slice(1) : all;
};
const base = (u, dark, guides) => ({
  theme: dark ? "dark" : "light", guides,
  rows: rowsOf(u), total: criteria(u).reduce((s, c) => s + c.score, 0),
  marks: markList(u), markCount: markList(u).length, chips: criteria(u), undone: u,
});

const STATES = {
  "Main.dc.html": [
    ["A · after a mark lands", (d) => ({ ...base(false, d, true), showLast: true, showStrip: false })],
    ["A · resting", (d) => ({ ...base(false, d, false), showLast: false, showStrip: true })],
    ["A · score sheet open", (d) => ({ ...base(false, d, false), showLast: false, showStrip: true, anySheet: true, sheetScore: true })],
    ["A · mistakes sheet open", (d) => ({ ...base(false, d, false), showLast: false, showStrip: true, anySheet: true, sheetMarks: true })],
  ],
  "DirectionB.dc.html": [
    ["B · expanded", (d) => ({ ...base(false, d, true), open: true })],
    ["B · collapsed", (d) => ({ ...base(false, d, false), open: false })],
  ],
  "DirectionC.dc.html": [
    ["C · live, after a mark", (d) => ({ ...base(false, d, true), showLast: true, showIdle: false, review: false })],
    ["C · live, resting", (d) => ({ ...base(false, d, false), showLast: false, showIdle: true, review: false })],
    ["C · review & finish", (d) => ({ ...base(false, d, false), showLast: false, showIdle: true, review: true })],
  ],
  "DirectionD.dc.html": [
    ["D · bento deck", (d) => ({ ...base(false, d, true), sheetMarks: false, anySheet: false })],
  ],
  "Parts.dc.html": [["Shared parts", (d) => base(false, d, false)]],
};

function extract(file) {
  const src = fs.readFileSync(file, "utf8");
  const css = /<style>([\s\S]*?)<\/style>/.exec(src)[1];
  const link = /<link[^>]*fonts\.googleapis[^>]*>/.exec(src)[0];
  const body = src.slice(src.indexOf("</helmet>") + 9, src.indexOf("</x-dc>"));
  return { css, link, body };
}

const dark = process.argv.includes("--dark");
let cards = "", css = "", link = "";
for (const [file, states] of Object.entries(STATES)) {
  const e = extract(file);
  if (!css) { css = e.css; link = e.link; }
  for (const [label, mk] of states) {
    cards += `<figure style="margin:0;display:flex;flex-direction:column;gap:10px;align-items:flex-start">
      <figcaption style="font:500 12px/1 Inter,system-ui;letter-spacing:.06em;text-transform:uppercase;color:#6a6a73">${label}</figcaption>
      <div style="box-shadow:0 8px 28px rgba(0,0,0,.14);border-radius:20px;overflow:hidden">${render(e.body, mk(dark))}</div>
    </figure>`;
  }
}
fs.writeFileSync(dark ? "/tmp/pv-dark.html" : "/tmp/pv.html",
  `<!doctype html><meta charset="utf-8">${link}<style>${css}
   body{margin:0;padding:40px;background:${dark ? "#0d0d10" : "#e7e5e0"};display:flex;flex-wrap:wrap;gap:40px;align-items:flex-start}</style>${cards}`);
console.log("preview written");

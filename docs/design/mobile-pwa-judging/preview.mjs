/* Renders .dc.html artboards to plain HTML for screenshotting, without the
   canvas runtime. Resolution only — it never edits the artboards. */
import fs from "node:fs";

function findEnd(s, from) {
  const re = /<\/?sc-(if|for)\b/g;
  re.lastIndex = from;
  let depth = 0, m;
  while ((m = re.exec(s))) {
    if (m[0][1] === "/") { depth--; if (depth === 0) return { inner: [from, m.index], after: s.indexOf(">", m.index) + 1 }; }
    else depth++;
  }
  throw new Error("unbalanced sc- tag");
}
const get = (ctx, path) => path.trim().split(".").reduce((o, k) => (o == null ? o : o[k]), ctx);

function render(html, ctx) {
  let out = "", i = 0;
  for (;;) {
    const open = html.slice(i).search(/<sc-(if|for)\b/);
    if (open < 0) { out += holes(html.slice(i), ctx); break; }
    const start = i + open;
    out += holes(html.slice(i, start), ctx);
    const tagEnd = html.indexOf(">", start) + 1;
    const tag = html.slice(start, tagEnd);
    const { inner, after } = findEnd(html, start);
    const body = html.slice(tagEnd, inner[1]);
    if (tag.startsWith("<sc-if")) {
      if (get(ctx, /value="\{\{([^}]+)\}\}"/.exec(tag)[1])) out += render(body, ctx);
    } else {
      const as = /as="([^"]+)"/.exec(tag)[1];
      for (const item of get(ctx, /list="\{\{([^}]+)\}\}"/.exec(tag)[1]) || []) out += render(body, { ...ctx, [as]: item });
    }
    i = after;
  }
  return out;
}
const holes = (s, ctx) => s
  .replace(/\s*onClick="\{\{[^}]*\}\}"/g, "")
  .replace(/\{\{([^}]+)\}\}/g, (_, p) => {
    const v = get(ctx, p);
    return v === undefined || typeof v === "function" ? "" : String(v);
  });

const GLYPH = JSON.parse(fs.readFileSync("/tmp/marked.json", "utf8"));

/* mirrors MODEL in chrome.mjs */
const ALL = (u) => [
  { id: "jali", cls: "cat-jali", name: "Laḥn Jalī", short: "Jalī", score: 48, max: 50, ded: "−2" },
  { id: "khafi", cls: "cat-khafi", name: "Laḥn Khafī", short: "Khafī", score: 29, max: 30, ded: "−1" },
  { id: "fasaha", cls: "cat-fasaha", name: "Faṣāḥa", short: "Faṣāḥa", score: u ? 10 : 9.5, max: 10, ded: u ? "—" : "−0.5" },
  { id: "adu", cls: "cat-adu", name: "Adu / Raagu", short: "Adu / Raagu", score: 8.5, max: 10, ded: "−1.5" },
];
const crit = (u, n = 4, tint = "earned") => ALL(u).slice(0, n).map((c) => ({
  ...c, dot: tint === "off",
  bg: tint === "always" || (tint === "earned" && c.ded !== "—") ? "var(--c-wash)" : "var(--surface)",
}));
const marksOf = (u, n = 4) => {
  const all = [
    { id: "fasaha", cls: "cat-fasaha", glyph: GLYPH.fasaha, amt: "−0.5", detail: "Faṣāḥa · 67:5 · 2:14" },
    { id: "jali", cls: "cat-jali", glyph: GLYPH.jali, amt: "−2", detail: "Laḥn Jalī · 67:4 · 1:52" },
    { id: "khafi", cls: "cat-khafi", glyph: GLYPH.khafi, amt: "−1", detail: "Laḥn Khafī · 67:3 · 1:09" },
  ];
  const owned = new Set(crit(u, n).map((c) => c.id));
  return all.filter((m) => owned.has(m.id) && !(u && m.id === "fasaha"));
};
const base = (d, { u = false, n = 4, tint = "earned", chip = "deduction" } = {}) => {
  const cs = crit(u, n, tint);
  return {
    theme: d ? "dark" : "light",
    rows: cs.map((c) => ({ cls: c.cls, name: c.name, ded: c.ded, score: c.score, max: c.max,
      dedInk: c.ded === "—" ? "var(--ink-3)" : "var(--ink-2)", editable: c.id === "adu", readonly: c.id !== "adu" })),
    total: cs.reduce((s, c) => s + c.score, 0),
    totalMax: cs.reduce((s, c) => s + c.max, 0),
    criteriaLabel: cs.map((c) => c.name).join(" + "),
    marks: marksOf(u, n), markCount: marksOf(u, n).length,
    markWord: marksOf(u, n).length === 1 ? "mistake" : "mistakes",
    dedTotal: (() => { const t = marksOf(u, n).reduce((s, m) => s + Number(m.amt.replace("−", "")), 0);
      return t === 0 ? "—" : "−" + Math.round(t * 10) / 10; })(),
    chips: cs.map((c) => ({ ...c, val: chip === "score" ? c.score : c.ded })),
    blocked: false, notBlocked: true,
  };
};

const STATES = {
  "Main.dc.html": [
    ["A · after a mark", (d) => ({ ...base(d), showLast: true, showStrip: false })],
    ["A · resting", (d) => ({ ...base(d), showLast: false, showStrip: true })],
    ["A · one criterion", (d) => ({ ...base(d, { n: 1 }), showLast: false, showStrip: true })],
    ["A · score sheet", (d) => ({ ...base(d), showStrip: true, anySheet: true, sheetScore: true })],
    ["A · mistakes sheet", (d) => ({ ...base(d), showStrip: true, anySheet: true, sheetMarks: true })],
  ],
  "DirectionB.dc.html": [
    ["B · expanded", (d) => ({ ...base(d), open: true })],
    ["B · collapsed", (d) => ({ ...base(d), open: false })],
  ],
  "DirectionC.dc.html": [
    ["C · after a mark", (d) => ({ ...base(d), showLast: true, showIdle: false })],
    ["C · resting", (d) => ({ ...base(d), showLast: false, showIdle: true })],
  ],
  "Review.dc.html": [
    ["Review and save", (d) => base(d)],
    ["Review · Adu not entered", (d) => {
      const b = base(d);
      b.blocked = true; b.notBlocked = false;
      b.rows = b.rows.filter((r) => !r.editable);
      b.total = b.total - 8.5;
      return b;
    }],
  ],
  "NextReciter.dc.html": [["Next reciter", (d) => base(d)]],
  "Parts.dc.html": [["Shared parts", (d) => ({ theme: d ? "dark" : "light" })]],
};

function extract(file) {
  const src = fs.readFileSync(file, "utf8");
  return {
    css: /<style>([\s\S]*?)<\/style>/.exec(src)[1],
    link: /<link[^>]*fonts\.googleapis[^>]*>/.exec(src)[0],
    body: src.slice(src.indexOf("</helmet>") + 9, src.indexOf("</x-dc>")),
  };
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

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import assert from "node:assert/strict";
import postcss from "postcss";
const root = postcss.parse(readFileSync("src/styles/global.css", "utf8"));
const vars = (selector) => {
  const result = {};
  root.walkRules((rule) => {
    if (rule.selector === selector)
      rule.walkDecls(/^--/, (d) => (result[d.prop] = d.value));
  });
  return result;
};
const rgb = (color) =>
  color.startsWith("#")
    ? color
        .slice(1)
        .match(/../g)
        .map((n) => parseInt(n, 16))
    : [...color.matchAll(/[\d.]+/g)].map((n) => Number(n[0]));
const blend = (color, bg) => {
  const c = rgb(color);
  return c.length === 4
    ? c.slice(0, 3).map((v, i) => v * c[3] + bg[i] * (1 - c[3]))
    : c;
};
const luminance = (c) =>
  c
    .map((n) => n / 255)
    .map((n) => (n <= 0.04045 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4))
    .reduce((s, n, i) => s + n * [0.2126, 0.7152, 0.0722][i], 0);
const contrast = (a, b) => {
  const [x, y] = [luminance(a), luminance(b)].sort((a, b) => b - a);
  return (x + 0.05) / (y + 0.05);
};
const results = [];
for (const theme of ["light", "dark"]) {
  const tokens = {
    ...vars(":root"),
    ...(theme === "dark" ? vars('[data-theme="dark"]') : {}),
  };
  const add = (role, fg, bg, minimum) => {
    const ratio = contrast(blend(fg, rgb(bg)), rgb(bg));
    results.push({
      theme,
      role,
      foreground: fg,
      background: bg,
      ratio: Number(ratio.toFixed(2)),
      minimum,
    });
    assert(
      ratio >= minimum,
      `${theme} ${role}: ${ratio.toFixed(2)} < ${minimum}`,
    );
  };
  for (const background of ["--surface", "--bg"])
    for (const foreground of ["--ink", "--ink-2", "--ink-3", "--ring"])
      add(
        `${foreground} on ${background}`,
        tokens[foreground],
        tokens[background],
        foreground === "--ring" ? 3 : 4.5,
      );
  for (const category of ["jali", "khafi", "fasaha", "adu-raagu"]) {
    const t = {
      ...vars(".cat-" + category),
      ...(theme === "dark" ? vars(`[data-theme="dark"] .cat-${category}`) : {}),
    };
    add(`${category} chosen chip`, t["--c-on"] || "#ffffff", t["--c"], 4.5);
    const tint = blend(t["--c-tint"], rgb(tokens["--surface"]));
    const ratio = contrast(rgb(t["--c-strong"]), tint);
    results.push({
      theme,
      role: `${category} text on tint`,
      foreground: t["--c-strong"],
      background: tint,
      ratio: Number(ratio.toFixed(2)),
      minimum: 4.5,
    });
    assert(ratio >= 4.5);
  }
  for (const status of ["needs-review", "ready", "finalized"]) {
    const selector =
      (theme === "dark" ? '[data-theme="dark"] ' : "") +
      ".results-status-card.is-" +
      status;
    let color;
    root.walkRules((r) => {
      if (
        r.selector
          .split(",")
          .map((s) => s.trim())
          .includes(selector)
      )
        r.walkDecls("--status", (d) => (color = d.value));
    });
    if (color) add(`${status} status marker`, color, tokens["--surface"], 3);
  }
}
mkdirSync("outputs/claude-completion", { recursive: true });
writeFileSync(
  "outputs/claude-completion/contrast.json",
  JSON.stringify(results, null, 2),
);
console.table(
  results.map(({ theme, role, ratio, minimum }) => ({
    theme,
    role,
    ratio,
    minimum,
  })),
);

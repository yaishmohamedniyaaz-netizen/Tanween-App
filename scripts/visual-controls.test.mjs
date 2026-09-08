import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");

const judgeRoleSource = read("../src/components/JudgeRoleStrip.tsx");
const headerSource = read("../src/components/Header.tsx");
const scorePanelSource = read("../src/components/ScorePanel.tsx");
const cssSource = read("../src/styles/global.css");

test("recording spacing is not disabled by a stray patch marker", () => {
  assert.doesNotMatch(cssSource, /^\+\/\* Phase 1 local practice audio/m);
  assert.match(cssSource, /\.prepared-recording \{\s*margin-block: 0 12px;\s*padding: 12px;/);
});

test("score borders resize independently of their touch targets and numbers", () => {
  assert.match(cssSource, /\.sidebar \.sc-row-impression \.mark-picker::before \{ inset: 7px 0; \}/);
  assert.match(cssSource, /\.finish-score-value \.mark-picker::before \{[^}]*inset: 8px 0;[^}]*pointer-events: none;/);
  assert.match(cssSource, /\.finish-score-value > \.score-value-layout:not\(\.mark-picker\) \{[^}]*padding-right: 8px;[^}]*justify-content: flex-end;/);
});

test("Finish ruler overlays its row without changing dialog height", () => {
  assert.match(cssSource, /\.finish-inline-picker \{\s*position: absolute;/);
  assert.match(cssSource, /\.finish-score-value \.mark-picker \{[^}]*width: max-content;[^}]*min-width: 44px;/);
  assert.match(cssSource, /\.finish-inline-picker \.mark-bar.is-inline \{[^}]*padding: 0;[^}]*border: 0;/);
  assert.match(cssSource, /\.finish-inline-picker \.mark-bar.is-inline \{ animation: none; \}/);
});

test("the judge strip keeps criteria semantic while showing only the judge name", () => {
  assert.match(judgeRoleSource, /const criteria = categoryListLabel/);
  assert.match(judgeRoleSource, /aria-label={`Current judge assignment: \$\{judgeName\}\. Criteria: \$\{criteria\}\.`}/);
  assert.match(judgeRoleSource, /<strong>\{judgeName\}<\/strong>/);
  assert.match(judgeRoleSource, /assignment\.categories\.map/);
  assert.doesNotMatch(judgeRoleSource, /<span aria-hidden="true">·<\/span>/);
});

test("the compact Results control centers its icon without hidden text layout", () => {
  assert.match(headerSource, /className="view-toggle-label">Results<\/span>/);
  assert.match(cssSource, /\.view-toggle \{[\s\S]*?justify-content: center;/);
  assert.match(cssSource, /\.view-toggle-label,\s*\.view-toggle-count \{\s*display: none;/);
  assert.match(cssSource, /\.view-toggle svg \{\s*display: block;\s*flex: 0 0 auto;\s*margin: 0;/);
});

test("category swatches are square while score rows stay neutral", () => {
  for (const selector of [
    ".sc-dot",
    ".log-dot",
    ".mobile-criterion-label i",
    ".mobile-category-mark",
  ]) {
    const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const match = cssSource.match(new RegExp(`${escaped} \\{([\\s\\S]*?)\\}`));
    assert.ok(match, `${selector} rule exists`);
    assert.match(match[1], /width: 8px/);
    assert.match(match[1], /height: 8px/);
    assert.match(match[1], /border-radius: 2px/);
  }
  assert.doesNotMatch(scorePanelSource, /is-earned/);
  assert.doesNotMatch(cssSource, /\.sc-row\.is-earned|--c-score-fill/);
  assert.doesNotMatch(cssSource, /\.mobile-criterion-chip\.is-tinted/);
  assert.match(
    cssSource,
    /\.mobile-last-action \{[\s\S]*background: var\(--c-feedback-fill\)/,
  );
  assert.equal(
    (cssSource.match(/--c-feedback-fill:/g) ?? []).length,
    2,
    "the category group has separate light and dark feedback fills",
  );
});

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");

const judgeRoleSource = read("../src/components/JudgeRoleStrip.tsx");
const headerSource = read("../src/components/Header.tsx");
const cssSource = read("../src/styles/global.css");

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

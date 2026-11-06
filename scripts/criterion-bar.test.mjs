import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const mushaf = read("src/components/Mushaf.tsx");
const bar = read("src/components/CriterionBar.tsx");
const gesture = read("src/hooks/useMushafPageGesture.ts");
const tray = read("src/components/DragMenu.tsx");

test("a finger on the criterion bar never counts as a second finger on the page", () => {
  assert.match(gesture, /closest\('\[data-criterion-bar\]'\)\) return;[\s\S]{0,80}contacts\.current\.add/);
  assert.match(bar, /data-criterion-bar=""/);
  assert.match(mushaf, /!event\.isPrimary && !barPressRef\.current/);
});

test("the bar is shown only with two or more pinpoint criteria and not in word-first order", () => {
  assert.match(mushaf, /barEnabled = judgingEnabled && marking\.order !== "word-first" && barCategories\.length > 1/);
});

test("a criterion chosen first arms the tray, a slide to a letter marks it, and criterion-first order blocks the word", () => {
  assert.match(mushaf, /setArmed\(barEnabled \? preselectRef\.current\?\.category \?\? null : null\)/);
  assert.match(mushaf, /if \(armed && !hovered && start\?\.moved && validFinalTid\)/);
  assert.match(mushaf, /marking\.order === "criterion-first" && !preselectRef\.current\) \{\s*if \(pinned\) closeAll\(\);\s*setBarNudge/);
});

test("keys 1 · 2 · 3 stay out of text fields and other dialogs, but work with the letter tray open", () => {
  assert.match(mushaf, /input, textarea, select, \[contenteditable='true'\], \[role='slider'\]/);
  assert.match(mushaf, /\[aria-modal="true"\]:not\(\.drag-menu\), dialog\[open\]/);
});

test("pen only ignores finger touches on the page; the tray keeps clear of the bar column", () => {
  assert.match(mushaf, /marking\.penOnly && event\.pointerType === "touch"\) return;/);
  assert.match(tray, /keepClear\?\.left \?\? 0/);
  assert.match(mushaf, /keepClear=\{barEnabled \? trayClearance\(\) : undefined\}/);
});

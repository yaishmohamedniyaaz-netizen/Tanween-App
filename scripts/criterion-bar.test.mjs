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

test("a criterion chosen first arms the tray, a slide to a letter marks it, and nothing chosen shakes the island", () => {
  assert.match(mushaf, /setArmed\(barEnabled \? preselectRef\.current\?\.category \?\? null : null\)/);
  assert.match(mushaf, /if \(armed && !hovered && start\?\.moved && validFinalTid\)/);
  // A word with the judge's mark still opens, so undo stays one tap away.
  assert.match(mushaf, /if \(barEnabled && !preselectRef\.current && !latestMarkedTid\(box\)\) \{\s*if \(pinned\) closeAll\(\);\s*setBarNudge/);
  assert.match(bar, /is-nudged/);
  assert.doesNotMatch(bar, /Choose a criterion first/);
});

test("no word tint with the island: only the Mushaf frame shows the chosen colour", () => {
  assert.match(mushaf, /hovered \|\| \(armed && !barEnabled\)/);
  assert.match(mushaf, /frame\.dataset\.criterionFrame = preselect\.category/);
});

test("drag and hold: lift on a letter marks, lift on the word keeps the tray, anywhere else cancels", () => {
  assert.match(mushaf, /Lifted on a letter: mark it\.\s*commit\(category, tid\)/);
  assert.match(mushaf, /Lifted on a word[\s\S]{0,300}setPinned\(true\)/);
  assert.match(mushaf, /Lifted anywhere else: nothing is marked\.\s*closeAll\(\);\s*setPreselect\(null\)/);
  assert.match(read("src/components/CriterionPressable.tsx"), /DRAG_START = 8/);
});

test("the settings opener is its own button in the bottom-right corner", () => {
  assert.match(bar, /className="criterion-corner"/);
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

test("with the bar on, the tray shows letters only by default; a setting brings the criteria back", () => {
  assert.match(mushaf, /hideTrayCriteria = barEnabled && !marking\.trayCriteria/);
  assert.match(tray, /\{!hideCategories && categoryStack\}/);
  assert.match(tray, /Now choose a criterion on the bar/);
});

test("the scorecard rows can be the criterion buttons; the island is then not shown", () => {
  const panel = read("src/components/ScorePanel.tsx");
  assert.match(panel, /picking = choice\.active && presentation === "rail"/);
  assert.match(panel, /className=\{`sc-row sc-row-pick/);
  assert.match(mushaf, /active: barEnabled && marking\.look\.place === "scorecard"/);
  assert.match(mushaf, /showButtons=\{islandShown\}/);
});

test("a word whose marked letters all have underlines drops its count circle", () => {
  assert.match(mushaf, /summary\?\.marker && !lettersUnderlined\(box\)/);
  assert.match(mushaf, /marked\.every\(\(unit\) =>\s*letterBarGeometry\(/);
});

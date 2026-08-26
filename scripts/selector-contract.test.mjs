import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { CATEGORIES } from "../src/config.ts";

const dragMenuSource = readFileSync(
  new URL("../src/components/DragMenu.tsx", import.meta.url),
  "utf8",
);
const selectorStyles = readFileSync(
  new URL("../src/styles/global.css", import.meta.url),
  "utf8",
);
const mushafSource = readFileSync(
  new URL("../src/components/Mushaf.tsx", import.meta.url),
  "utf8",
);
const storeSource = readFileSync(
  new URL("../src/state/store.tsx", import.meta.url),
  "utf8",
);

test("the pinpoint path is Jali, then Khafi, then Fasaha", () => {
  assert.deepEqual(
    CATEGORIES.filter((category) => category.kind === "pinpoint").map(
      (category) => category.id,
    ),
    ["jali", "khafi", "fasaha"],
  );
});

test("whole-recitation criteria never enter the letter tray", () => {
  assert.match(dragMenuSource, /category\.kind === "pinpoint"/);
  assert.match(mushafSource, /\.filter\(isPinpointCategory\)/);
  assert.match(
    mushafSource,
    /judgingEnabled = state\.sessionActive && allowedCategories\.length > 0/,
  );
});

test("the selector is one connected, letter-only runway", () => {
  assert.match(dragMenuSource, /className="selector-runway"/);
  assert.match(dragMenuSource, /CATEGORIES\.filter/);
  assert.match(dragMenuSource, /categoryDefs\.map\(\(c, index\)/);
  assert.doesNotMatch(dragMenuSource, /unit-picker-word/);
  assert.doesNotMatch(dragMenuSource, /word:\s*string/);
});

test("assigned categories filter the tray and one category gets a fixed action", () => {
  assert.match(dragMenuSource, /allowedCategories\.includes\(category\.id\)/);
  assert.match(dragMenuSource, /categoryDefs\.length === 1/);
  assert.match(dragMenuSource, /fixedCategory && pinned \? "Mark " : ""/);
  assert.match(mushafSource, /allowedCategories\.length === 1 && start\?\.moved && validFinalTid/);
  assert.match(mushafSource, /allowedCategories\.includes\(category\)/);
});

test("an upward runway keeps Jali physically nearest to the source", () => {
  assert.match(
    selectorStyles,
    /\.drag-menu\.up \.selector-runway\s*\{[^}]*flex-direction:\s*column-reverse;/s,
  );
  assert.match(
    selectorStyles,
    /\.drag-menu\.up \.category-stack\s*\{[^}]*flex-direction:\s*column-reverse;/s,
  );
});

test("opening a word never implies a target or enables a category", () => {
  assert.match(mushafSource, /tid:\s*null/);
  assert.match(dragMenuSource, /disabled=\{!targetSelected\}/);
  assert.match(dragMenuSource, /aria-disabled=\{!targetSelected\}/);
  assert.match(dragMenuSource, /role="radiogroup"/);
  assert.match(dragMenuSource, /role="radio"/);
  assert.match(dragMenuSource, /aria-checked=\{unit\.selected\}/);
});

test("the rail shows clean primary ink while retaining exact source evidence", () => {
  assert.match(dragMenuSource, /unit\.primaryGlyph/);
  assert.match(dragMenuSource, /Exact source \$\{unit\.fullGlyph\}/);
  assert.match(mushafSource, /primaryGlyph:\s*unit\.primaryGlyph/);
  assert.match(mushafSource, /fullGlyph:\s*unit\.fullGlyph/);
});

test("touch targets cannot flex-shrink below 44px", () => {
  assert.match(selectorStyles, /\.unit-choice\s*\{[^}]*flex:\s*0 0 44px;/s);
  assert.match(selectorStyles, /\.unit-choice\s*\{[^}]*min-width:\s*44px;/s);
  assert.match(selectorStyles, /\.unit-choice\s*\{[^}]*min-height:\s*44px;/s);
  assert.match(selectorStyles, /\.pill\s*\{[^}]*min-height:\s*44px;/s);
});

test("one target is centered and category rings inherit their exposed corners", () => {
  assert.match(dragMenuSource, /units\.length === 1 \? "single-unit"/);
  assert.match(selectorStyles, /\.unit-picker-row\.single-unit\s*\{[^}]*justify-content:\s*center;/s);
  assert.match(dragMenuSource, /pill-inner/);
  assert.match(dragMenuSource, /pill-outer/);
  assert.match(selectorStyles, /\.pill\.active::after/);
  assert.match(selectorStyles, /border-radius:\s*inherit/);
});

test("tray keyboard input is isolated from page navigation", () => {
  assert.match(mushafSource, /event\.defaultPrevented \|\| active/);
  assert.match(dragMenuSource, /e\.stopPropagation\(\)/);
  assert.match(mushafSource, /useEffect\(\(\) => closeAll\(\), \[closeAll, currentPage, pageLayout, renderScale\]\)/);
});

test("legacy browser state receives a non-destructive one-time backup", () => {
  assert.match(storeSource, /tahqeeq\.session\.v1\.backup\.pre-target-v2/);
  assert.match(storeSource, /tahqeeq\.session\.v1\.backup\.pre-ledger-v1/);
  assert.match(storeSource, /localStorage\.setItem\(key, raw\)/);
  assert.match(storeSource, /backup quota failure must never prevent/i);
});

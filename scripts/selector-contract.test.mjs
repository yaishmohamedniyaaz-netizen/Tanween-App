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

test("the semantic category path is Jali, then Khafi, then Fasaha", () => {
  assert.deepEqual(
    CATEGORIES.map((category) => category.id),
    ["jali", "khafi", "fasaha"],
  );
});

test("the selector is one connected, letter-only runway", () => {
  assert.match(dragMenuSource, /className="selector-runway"/);
  assert.match(dragMenuSource, /CATEGORIES\.map\(\(c, index\)/);
  assert.doesNotMatch(dragMenuSource, /unit-picker-word/);
  assert.doesNotMatch(dragMenuSource, /word:\s*string/);
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

test("tray keyboard input is isolated from page navigation", () => {
  assert.match(mushafSource, /event\.defaultPrevented \|\| active/);
  assert.match(dragMenuSource, /e\.stopPropagation\(\)/);
  assert.match(mushafSource, /useEffect\(\(\) => closeAll\(\), \[closeAll, currentPage, pageLayout\]\)/);
});

test("legacy browser state receives a non-destructive one-time backup", () => {
  assert.match(storeSource, /tahqeeq\.session\.v1\.backup\.pre-target-v2/);
  assert.match(storeSource, /localStorage\.setItem\(PRE_TARGET_V2_BACKUP_KEY, raw\)/);
  assert.match(storeSource, /backup quota failure must never prevent/i);
});

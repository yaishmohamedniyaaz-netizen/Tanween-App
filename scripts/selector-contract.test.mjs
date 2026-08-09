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

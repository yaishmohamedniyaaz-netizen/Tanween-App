import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  moveMushafView,
  mushafPageRangeLabel,
  pageIsVisible,
  spreadAnchorPage,
  visibleMushafPages,
} from "../src/lib/mushafSpread.ts";

const mushafSource = readFileSync(
  new URL("../src/components/Mushaf.tsx", import.meta.url),
  "utf8",
);
const moreSource = readFileSync(
  new URL("../src/components/MoreActionsPopover.tsx", import.meta.url),
  "utf8",
);
const settingsSource = readFileSync(
  new URL("../src/components/SettingsWorkspace.tsx", import.meta.url),
  "utf8",
);
const stylesSource = readFileSync(
  new URL("../src/styles/global.css", import.meta.url),
  "utf8",
);

test("two-page view keeps the selected page on the right and the following page on the left", () => {
  assert.deepEqual(visibleMushafPages(1, "spread"), [1, 2]);
  assert.deepEqual(visibleMushafPages(2, "spread"), [2, 3]);
  assert.deepEqual(visibleMushafPages(199, "spread"), [199, 200]);
  assert.deepEqual(visibleMushafPages(603, "spread"), [603, 604]);
  assert.deepEqual(visibleMushafPages(604, "spread"), [603, 604]);
  assert.equal(spreadAnchorPage(604), 603);
});

test("spread navigation moves by a complete visible pair and clamps the Quran boundaries", () => {
  assert.equal(moveMushafView(199, "spread", 1), 201);
  assert.equal(moveMushafView(201, "spread", -1), 199);
  assert.equal(moveMushafView(1, "spread", -1), 1);
  assert.equal(moveMushafView(603, "spread", 1), 603);
  assert.equal(moveMushafView(604, "spread", 1), 603);
  assert.equal(moveMushafView(199, "full", 1), 200);
});

test("compact screens render one page without destroying the stored desktop preference", () => {
  assert.deepEqual(visibleMushafPages(200, "spread", true), [200]);
  assert.equal(moveMushafView(200, "spread", 1, true), 201);
});

test("range labels and evidence lookup cover both visible pages", () => {
  assert.equal(mushafPageRangeLabel([199]), "199");
  assert.equal(mushafPageRangeLabel([199, 200]), "199\u2013200");
  assert.equal(pageIsVisible(200, [199, 200]), true);
  assert.equal(pageIsVisible(201, [199, 200]), false);
});

test("the renderer loads and swaps both page assets as one spread", () => {
  assert.match(mushafSource, /Promise\.all\(\s*requestedPages\.map/);
  assert.match(mushafSource, /setPageData\(readyPages\.map/);
  assert.match(mushafSource, /active\.meta\.page/);
  assert.match(mushafSource, /data-visible-pages=/);
  assert.match(stylesSource, /\.mushaf-spread/);
  assert.match(stylesSource, /\.mushaf-spread > \.page:first-child/);
  assert.match(mushafSource, /mushaf-scroll.*is-spread/);
  assert.match(stylesSource, /\.mushaf-scroll\.is-spread \.mushaf-shared-nav/);
  assert.match(stylesSource, /position: relative/);
  assert.match(stylesSource, /--mushaf-stage-block-size/);
  assert.doesNotMatch(stylesSource, /\.page-split/);
});

test("view choice lives beside live size controls and not in Settings", () => {
  assert.match(moreSource, /Mushaf view/);
  assert.match(moreSource, /Full page/);
  assert.match(moreSource, /Two pages/);
  assert.doesNotMatch(settingsSource, /Page view/);
});

test("question focus is a device view control and stays range-aware in both page layouts", () => {
  assert.match(moreSource, /Question focus/);
  assert.match(moreSource, /\["off", "fade", "shade", "shade-fade"\]/);
  assert.match(moreSource, /Shade \+ fade/);
  assert.match(mushafSource, /rangeDisplayForPage/);
  assert.match(mushafSource, /data-question-focus-mode=/);
  assert.match(mushafSource, /question-context-line/);
  assert.match(mushafSource, /question-context-word/);
  assert.match(mushafSource, /question-context-band/);
  assert.match(mushafSource, /contextAyahSegments/);
  assert.match(mushafSource, /data-context-ayah/);
  assert.match(stylesSource, /--question-context-ink/);
  assert.match(stylesSource, /--question-shade-context-ink/);
  assert.match(stylesSource, /--question-shade-fill/);
  assert.match(stylesSource, /\.question-context-line/);
  assert.match(stylesSource, /\.question-context-band/);
  assert.doesNotMatch(settingsSource, /Question focus/);
});

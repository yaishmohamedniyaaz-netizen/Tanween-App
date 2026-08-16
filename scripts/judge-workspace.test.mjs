import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const moreSource = readFileSync(
  new URL("../src/components/MoreActionsPopover.tsx", import.meta.url),
  "utf8",
);
const sizeSource = readFileSync(
  new URL("../src/components/MushafSizeControl.tsx", import.meta.url),
  "utf8",
);
const settingsSource = readFileSync(
  new URL("../src/components/SettingsWorkspace.tsx", import.meta.url),
  "utf8",
);
const viewportSource = readFileSync(
  new URL("../src/components/MushafViewport.tsx", import.meta.url),
  "utf8",
);
const styleSource = readFileSync(
  new URL("../src/styles/global.css", import.meta.url),
  "utf8",
);

test("More controls is a nonmodal controls popover rather than an ARIA menu", () => {
  assert.match(moreSource, /aria-haspopup="dialog"/);
  assert.match(moreSource, /role="dialog"/);
  assert.match(moreSource, /aria-modal="false"/);
  assert.doesNotMatch(moreSource, /role="menu"/);
  assert.match(moreSource, /triggerRef\.current\?\.focus/);
});

test("live Mushaf sizing has native and discrete input paths plus Fit", () => {
  assert.match(sizeSource, /type="range"/);
  assert.match(sizeSource, /aria-valuetext=\{valueText\}/);
  assert.match(sizeSource, /Icon name="minus"/);
  assert.match(sizeSource, /Icon name="plus"/);
  assert.match(sizeSource, /Fit page/);
  assert.doesNotMatch(settingsSource, /Page scale/);
  assert.doesNotMatch(settingsSource, /Mushaf page scale/);
});

test("the desktop workbench uses the researched canvas, rail, and safe scroll canvas", () => {
  assert.match(styleSource, /max-width: 1520px/);
  assert.match(styleSource, /clamp\(336px, 23vw, 376px\)/);
  assert.match(styleSource, /padding: 16px/);
  assert.match(viewportSource, /mushaf-scroll-canvas|mushaf-render-block-size|renderedBlockSize/);
  assert.match(viewportSource, /viewportCenterRef/);
  assert.match(styleSource, /overscroll-behavior: contain/);
});

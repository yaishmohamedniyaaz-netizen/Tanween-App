import assert from "node:assert/strict";
import test from "node:test";
import {
  computeMushafFitInlineSize,
  computeMushafRenderedBlockSize,
  computeMushafRenderedInlineSize,
  MUSHAF_FRAME_INSET,
  STABLE_MUSHAF_STAGE_QUERY,
} from "../src/lib/mushafFit.ts";

test("full-page Fit respects the print maximum and both frame axes", () => {
  assert.equal(computeMushafFitInlineSize({
    frameInlineSize: 1200,
    frameBlockSize: 1400,
    layout: "full",
  }), 760);
  assert.equal(computeMushafFitInlineSize({
    frameInlineSize: 900,
    frameBlockSize: 610,
    layout: "full",
  }), 403);
});

test("two-page spread Fit is width- or height-limited without changing either page ratio", () => {
  assert.equal(computeMushafFitInlineSize({
    frameInlineSize: 640,
    frameBlockSize: 900,
    layout: "spread",
  }), 624);
  assert.equal(computeMushafFitInlineSize({
    frameInlineSize: 1200,
    frameBlockSize: 700,
    layout: "spread",
  }), 942);
});

test("Fit retains clearance and rejects unusable measurements", () => {
  assert.equal(MUSHAF_FRAME_INSET, 8);
  assert.equal(computeMushafFitInlineSize({
    frameInlineSize: 16,
    frameBlockSize: 500,
    layout: "full",
  }), 0);
  assert.equal(computeMushafFitInlineSize({
    frameInlineSize: Number.NaN,
    frameBlockSize: 500,
    layout: "full",
  }), 0);
  assert.equal(computeMushafFitInlineSize({
    frameInlineSize: 500,
    frameBlockSize: 500,
    layout: "full",
    inset: -1,
  }), 0);
});

test("stored view scales remain uniform magnifications of Fit", () => {
  assert.equal(computeMushafRenderedInlineSize(403, 100), 403);
  assert.equal(computeMushafRenderedInlineSize(403, 85), 343);
  assert.equal(computeMushafRenderedInlineSize(403, 10), 302);
  assert.equal(computeMushafRenderedInlineSize(403, 140), 564);
  assert.equal(computeMushafRenderedInlineSize(403, 190), 605);
  assert.equal(computeMushafRenderedBlockSize(403, "full", 110), 652);
  assert.equal(computeMushafRenderedBlockSize(620, "spread", 150), 671);
  assert.equal(computeMushafRenderedInlineSize(0, 100), 0);
});

test("stable desktop mode stays aligned with the existing responsive boundary", () => {
  assert.equal(
    STABLE_MUSHAF_STAGE_QUERY,
    "(min-width: 901px) and (min-height: 620px)",
  );
});

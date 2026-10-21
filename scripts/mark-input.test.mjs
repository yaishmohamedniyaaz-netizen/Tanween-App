import assert from "node:assert/strict";
import test from "node:test";

import {
  clampMark,
  isInCancelBand,
  MARK_CANCEL_BAND_PX,
  MARK_TAP_SLOP_PX,
  markFromHorizontalPoint,
  passedTapSlop,
  stepperMark,
} from "../src/lib/markInput.ts";

test("the shared controller clamps and snaps every committed mark", () => {
  assert.equal(clampMark(-2, 10, 0.5), 0);
  assert.equal(clampMark(10.8, 10, 0.5), 10);
  assert.equal(clampMark(3.26, 10, 0.5), 3.5);
  assert.equal(clampMark(3.24, 10, 0.5), 3);
  assert.equal(clampMark(4.6, 10, 1), 5);
});

test("horizontal position maps to the same shared half-mark values", () => {
  assert.equal(markFromHorizontalPoint(50, 50, 200, 10, 0.5), 0);
  assert.equal(markFromHorizontalPoint(150, 50, 200, 10, 0.5), 5);
  assert.equal(markFromHorizontalPoint(260, 50, 200, 10, 0.5), 10);
  assert.equal(markFromHorizontalPoint(115, 50, 200, 10, 0.5), 3.5);
});

test("an unmarked stepper starts from the maximum only after a deliberate step", () => {
  assert.equal(stepperMark(0, false, -0.5, 10, 0.5), 9.5);
  assert.equal(stepperMark(0, false, -1, 10, 0.5), 9);
  assert.equal(stepperMark(0, false, 0, 10, 0.5), 10);
});

test("subsequent stepper adjustments use the committed value and clamp at limits", () => {
  assert.equal(stepperMark(9.5, true, 0.5, 10, 0.5), 10);
  assert.equal(stepperMark(4, true, -1, 10, 0.5), 3);
  assert.equal(stepperMark(0, true, -0.5, 10, 0.5), 0);
  assert.equal(stepperMark(10, true, 1, 10, 0.5), 10);
});

test("a press that wanders less than the tap slop is still a tap", () => {
  assert.equal(MARK_TAP_SLOP_PX, 8);
  assert.equal(passedTapSlop({ x: 100, y: 100 }, { x: 102, y: 101 }), false);
  assert.equal(passedTapSlop({ x: 100, y: 100 }, { x: 105, y: 105 }), false);
  assert.equal(passedTapSlop({ x: 100, y: 100 }, { x: 108, y: 100 }), true);
  assert.equal(passedTapSlop({ x: 100, y: 100 }, { x: 100, y: 92 }), true);
});

test("releasing far above or below the ruler and its box cancels", () => {
  const band = { top: 200, bottom: 340 };
  assert.equal(MARK_CANCEL_BAND_PX, 48);
  assert.equal(isInCancelBand(200 - 48, band), false);
  assert.equal(isInCancelBand(200 - 49, band), true);
  assert.equal(isInCancelBand(340 + 48, band), false);
  assert.equal(isInCancelBand(340 + 49, band), true);
  assert.equal(isInCancelBand(270, band), false);
});

test("only left and right choose the mark, and past either end is that end", () => {
  assert.equal(markFromHorizontalPoint(-50, 100, 400, 10, 0.5), 0);
  assert.equal(markFromHorizontalPoint(900, 100, 400, 10, 0.5), 10);
});

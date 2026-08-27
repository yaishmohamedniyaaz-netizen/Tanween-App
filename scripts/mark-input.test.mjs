import assert from "node:assert/strict";
import test from "node:test";

import {
  clampMark,
  MARK_WHEEL_ROW_HEIGHT,
  markFromHorizontalPoint,
  markSupportsHalf,
  wheelMark,
  wheelWholeFromDelta,
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

test("vertical travel changes whole marks and respects both limits", () => {
  assert.equal(wheelWholeFromDelta(5.5, -MARK_WHEEL_ROW_HEIGHT, 10), 6);
  assert.equal(wheelWholeFromDelta(5.5, MARK_WHEEL_ROW_HEIGHT * 2, 10), 3);
  assert.equal(wheelWholeFromDelta(9.5, -MARK_WHEEL_ROW_HEIGHT * 4, 10), 10);
  assert.equal(wheelWholeFromDelta(0, MARK_WHEEL_ROW_HEIGHT * 3, 10), 0);
});

test("the side branch adds a half only when the competition step allows it", () => {
  assert.equal(markSupportsHalf(4, 10, 0.5), true);
  assert.equal(markSupportsHalf(4, 10, 1), false);
  assert.equal(markSupportsHalf(10, 10, 0.5), false);
  assert.equal(wheelMark(4, true, 10, 0.5), 4.5);
  assert.equal(wheelMark(4, true, 10, 1), 4);
  assert.equal(wheelMark(10, true, 10, 0.5), 10);
});

import assert from "node:assert/strict";
import test from "node:test";
import {
  SELECTOR_VIEWPORT_GUTTER,
  getSelectorPlacement,
  getSelectorVerticalPlacement,
  getSelectorWidths,
} from "../src/lib/selectorLayout.ts";

test("short words keep a compact picker without squeezing categories", () => {
  assert.deepEqual(getSelectorWidths(2, 390), {
    availableWidth: 360,
    pickerWidth: 104,
    categoryWidth: 164,
    menuWidth: 164,
  });
});

test("one target gets one centered compact surface", () => {
  assert.deepEqual(getSelectorWidths(1, 390), {
    availableWidth: 360,
    pickerWidth: 52,
    categoryWidth: 164,
    menuWidth: 164,
  });
  assert.deepEqual(getSelectorPlacement(195, 390, 164, 52), {
    centerX: 195,
    pointerX: 26,
  });
});

test("every typical unit keeps its full 44px target", () => {
  assert.equal(getSelectorWidths(4, 390).pickerWidth, 190);
  assert.equal(getSelectorWidths(5, 390).pickerWidth, 236);
  assert.equal(getSelectorWidths(6, 390).pickerWidth, 282);
  assert.equal(getSelectorWidths(7, 390).pickerWidth, 328);
});

test("only genuinely long words become a 360px scrolling rail", () => {
  assert.equal(getSelectorWidths(8, 390).pickerWidth, 360);
  assert.equal(getSelectorWidths(11, 390).pickerWidth, 360);
});

test("every selector surface stays inside a narrow viewport", () => {
  for (const viewportWidth of [240, 280, 320, 360]) {
    for (const unitCount of [1, 2, 4, 7, 11]) {
      const widths = getSelectorWidths(unitCount, viewportWidth);
      const safeWidth = viewportWidth - SELECTOR_VIEWPORT_GUTTER;
      assert.ok(widths.pickerWidth <= safeWidth);
      assert.ok(widths.categoryWidth <= safeWidth);
      assert.ok(widths.menuWidth <= safeWidth);
    }
  }
});

test("invalid unit counts degrade to one compact unit", () => {
  assert.equal(getSelectorWidths(0, 390).pickerWidth, 52);
  assert.equal(getSelectorWidths(Number.NaN, 390).pickerWidth, 52);
});

test("a centered callout points directly back to its source", () => {
  assert.deepEqual(getSelectorPlacement(195, 390, 190, 190), {
    centerX: 195,
    pointerX: 95,
  });
});

test("edge callouts clamp the surface and preserve a corner-safe pointer", () => {
  assert.deepEqual(getSelectorPlacement(5, 390, 190, 190), {
    centerX: 107,
    pointerX: 18,
  });
  assert.deepEqual(getSelectorPlacement(385, 390, 190, 190), {
    centerX: 283,
    pointerX: 172,
  });
});

test("a narrow picker remains centered inside its wider category stack", () => {
  assert.deepEqual(getSelectorPlacement(195, 390, 164, 104), {
    centerX: 195,
    pointerX: 52,
  });
});

test("vertical placement chooses room and clamps the entire runway", () => {
  assert.deepEqual(getSelectorVerticalPlacement(500, 530, 844), {
    openUp: true,
    top: 305,
  });
  assert.deepEqual(getSelectorVerticalPlacement(80, 110, 844), {
    openUp: false,
    top: 119,
  });
  assert.deepEqual(getSelectorVerticalPlacement(100, 120, 260), {
    openUp: false,
    top: 62,
  });
});

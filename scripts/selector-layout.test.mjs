import assert from "node:assert/strict";
import test from "node:test";
import {
  SELECTOR_VIEWPORT_GUTTER,
  getSelectorPlacement,
  getSelectorWidths,
} from "../src/lib/selectorLayout.ts";

test("short words keep a compact picker without squeezing the categories", () => {
  assert.deepEqual(getSelectorWidths(2, 390), {
    availableWidth: 304,
    pickerWidth: 104,
    categoryWidth: 164,
    menuWidth: 164,
  });
});

test("typical words expand by one stable touch target per judging unit", () => {
  assert.equal(getSelectorWidths(4, 390).pickerWidth, 192);
  assert.equal(getSelectorWidths(5, 390).pickerWidth, 236);
  assert.equal(getSelectorWidths(6, 390).pickerWidth, 280);
});

test("long words cap at the safe rail width", () => {
  assert.equal(getSelectorWidths(7, 390).pickerWidth, 304);
  assert.equal(getSelectorWidths(11, 390).pickerWidth, 304);
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
  assert.equal(getSelectorWidths(0, 390).pickerWidth, 104);
  assert.equal(getSelectorWidths(Number.NaN, 390).pickerWidth, 104);
});

test("a centered callout points directly back to its source", () => {
  assert.deepEqual(getSelectorPlacement(195, 390, 192, 192), {
    centerX: 195,
    pointerX: 96,
  });
});

test("edge callouts clamp the surface and preserve a corner-safe pointer", () => {
  assert.deepEqual(getSelectorPlacement(5, 390, 192, 192), {
    centerX: 108,
    pointerX: 18,
  });
  assert.deepEqual(getSelectorPlacement(385, 390, 192, 192), {
    centerX: 282,
    pointerX: 174,
  });
});

test("a narrow picker remains centered inside its wider category stack", () => {
  assert.deepEqual(getSelectorPlacement(195, 390, 164, 104), {
    centerX: 195,
    pointerX: 52,
  });
});

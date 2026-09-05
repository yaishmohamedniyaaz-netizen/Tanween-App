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
    availableWidth: 366,
    pickerWidth: 104,
    categoryWidth: 164,
    menuWidth: 164,
  });
});

test("one target gets one centered compact surface", () => {
  assert.deepEqual(getSelectorWidths(1, 390), {
    availableWidth: 366,
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

test("desktop rails fit every target in the longest source words", () => {
  for (let count = 1; count <= 11; count++) {
    const { pickerWidth } = getSelectorWidths(count, 1400);
    assert.ok(pickerWidth >= count * 44 + (count - 1) * 2 + 8);
  }
  assert.equal(getSelectorWidths(8, 1400).pickerWidth, 374);
  assert.equal(getSelectorWidths(11, 1400).pickerWidth, 512);
  assert.equal(getSelectorWidths(11, 390).pickerWidth, 366);
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

test("measured tray heights stay attached for every judge assignment", () => {
  for (const height of [97.2, 139.2, 183.2, 229.2]) {
    const above = getSelectorVerticalPlacement(500, 530, 844, height);
    assert.equal(above.openUp, true);
    assert.ok(Math.abs(500 - (above.top + height) - 9) <= 0.5);
    const below = getSelectorVerticalPlacement(30, 60, 844, height);
    assert.equal(below.openUp, false);
    assert.equal(below.top - 60, 9);
  }
});

test("panned visual viewports contain the entire tray and preserve its pointer", () => {
  const left = 120, top = 200, width = 320, height = 568;
  const sizes = getSelectorWidths(11, width);
  for (const anchor of [left + 4, left + width / 2, left + width - 4]) {
    const position = getSelectorPlacement(anchor, width, sizes.menuWidth, sizes.pickerWidth, left);
    assert.ok(position.centerX - sizes.menuWidth / 2 >= left + 12);
    assert.ok(position.centerX + sizes.menuWidth / 2 <= left + width - 12);
  }
  for (const anchor of [top + 4, top + height / 2, top + height - 40]) {
    const position = getSelectorVerticalPlacement(anchor, anchor + 30, height, 183.2, top);
    assert.ok(position.top >= top + 12);
    assert.ok(position.top + 183.2 <= top + height - 12.0 + 0.5);
  }
});

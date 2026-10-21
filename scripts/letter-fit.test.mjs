import assert from "node:assert/strict";
import test from "node:test";
import {
  HAFS_ASCENT,
  HAFS_DESCENT,
  HAFS_UNITS_PER_EM,
  LETTER_INK,
  TAILED_LETTERS,
} from "../src/lib/letterFitData.ts";
import { LETTER_FIT, LETTER_TILE_STYLE, placeLetter } from "../src/lib/letterFit.ts";

const TILE = 40;
// Same browser model the module relies on: line box centred in the tile.
function inkCentreInTile(glyph, { fontSize, dx, dy }) {
  const s = fontSize / HAFS_UNITS_PER_EM;
  const baseline = TILE / 2 + ((HAFS_ASCENT - HAFS_DESCENT) / 2) * s + dy;
  const [advance, xMin, yMin, xMax, yMax] = LETTER_INK[glyph];
  const left = (TILE - advance * s) / 2 + dx;
  return { x: left + ((xMin + xMax) / 2) * s, y: baseline - ((yMin + yMax) / 2) * s };
}

test("defaults match the 13 Oct 2026 review", () => {
  assert.equal(LETTER_FIT, "optical");
  assert.equal(LETTER_TILE_STYLE, "tonal");
});

test("every letter the tray can show has measured ink", () => {
  for (const ch of "ءابتثجحخدذرزسشصضطظعغفقكلمنهوىيةٱ") assert.ok(LETTER_INK[ch], ch);
});

test("optical fit puts each letter's ink centre on the tile centre", () => {
  for (const ch of Object.keys(LETTER_INK)) {
    const c = inkCentreInTile(ch, placeLetter(ch, "optical"));
    assert.ok(Math.abs(c.x - TILE / 2) <= 0.06, `${ch} x ${c.x}`);
    assert.ok(Math.abs(c.y - TILE / 2) <= 0.06, `${ch} y ${c.y}`);
  }
});

test("optical fit lifts tailed letters, e.g. ع by about 9px", () => {
  assert.equal(placeLetter("ع", "optical").dy, -8.7);
  assert.equal(placeLetter("ح", "optical").dy, -11.2);
});

test("lift-tailed moves only tailed letters, all by one amount", () => {
  const lifts = new Set(TAILED_LETTERS.map((ch) => placeLetter(ch, "lift-tailed").dy));
  assert.equal(lifts.size, 1);
  assert.ok([...lifts][0] < 0);
  assert.deepEqual(placeLetter("ا", "lift-tailed"), { fontSize: 33, dx: 0, dy: 0 });
});

test("shared baseline uses one size and one shift for every letter", () => {
  const all = new Set(Object.keys(LETTER_INK).map((ch) => JSON.stringify(placeLetter(ch, "shared-baseline"))));
  assert.equal(all.size, 1);
  assert.equal(placeLetter("ب", "shared-baseline").fontSize, 27);
});

test("unknown glyphs are left where the font puts them", () => {
  for (const glyph of ["—", "بِ", "constructor", "toString", ""]) {
    for (const fit of ["optical", "lift-tailed", "shared-baseline", "none"]) {
      assert.deepEqual(placeLetter(glyph, fit), { fontSize: 33, dx: 0, dy: 0 });
    }
  }
});

test("every tile letter stays inside the 40px tile after the optical fit", () => {
  for (const ch of Object.keys(LETTER_INK)) {
    const p = placeLetter(ch, "optical");
    const s = p.fontSize / HAFS_UNITS_PER_EM;
    const [, , yMin, , yMax] = LETTER_INK[ch];
    const half = ((yMax - yMin) / 2) * s;
    assert.ok(half <= TILE / 2, `${ch} ink is ${2 * half}px tall`);
  }
});

import assert from "node:assert/strict";
import test from "node:test";
import { tileGlyph } from "../src/lib/tileGlyph.ts";

const TATWEEL = "ـ";

test("a dagger alif after a haraka gets its own short stroke on joining letters", () => {
  // مَٰ in ٱلرَّحۡمَٰنِ: fatha and dagger alif collide when the meem stands alone.
  assert.equal(tileGlyph("مَٰ"), `مَ${TATWEEL}ٰ`);
  // shadda + fatha + dagger alif (ٱلصَّٰلِحَٰتِ)
  assert.equal(tileGlyph("صَّٰ"), `صَّ${TATWEEL}ٰ`);
  // maddah stays after the dagger alif
  assert.equal(tileGlyph("لَٰٓ"), `لَ${TATWEEL}ٰٓ`);
});

test("letters that do not join forward keep the dagger alif as written", () => {
  for (const glyph of ["ذَٰ", "رَٰ", "وَٰ", "دَّٰ", "زَٰٓ", "ءَٰ"]) {
    assert.equal(tileGlyph(glyph), glyph);
  }
});

test("a dagger alif with no haraka before it is left alone", () => {
  assert.equal(tileGlyph("وٰ"), "وٰ");
  assert.equal(tileGlyph("ىٰٓ"), "ىٰٓ");
});

test("pause signs are not part of the letter and are left off the tile", () => {
  assert.equal(tileGlyph("كَۖ"), "كَ");
  assert.equal(tileGlyph("مۡۚ"), "مۡ");
  assert.equal(tileGlyph("هِۗ"), "هِ");
  assert.equal(tileGlyph("نَّۖ"), "نَّ");
});

test("other signs that belong to the letter stay", () => {
  assert.equal(tileGlyph("نۢ"), "نۢ");
  assert.equal(tileGlyph("هُۥ"), "هُۥ");
  assert.equal(tileGlyph("نَا۠"), "نَا۠");
  assert.equal(tileGlyph("رِۭ"), "رِۭ");
});

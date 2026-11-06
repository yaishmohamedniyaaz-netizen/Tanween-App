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

test("kaf gets a longer tatweel so the dagger alif clears its top stroke", () => {
  assert.equal(tileGlyph("كَٰ"), `كَ${TATWEEL}${TATWEEL}ٰ`);
});

test("ain, ghain and kaf keep the fatha clear of a madd alif", () => {
  assert.equal(tileGlyph("عَا"), `عَ${TATWEEL}ا`);
  assert.equal(tileGlyph("غَا"), `غَ${TATWEEL}ا`);
  assert.equal(tileGlyph("كَا"), `كَ${TATWEEL}ا`);
  assert.equal(tileGlyph("عٗا"), `عٗ${TATWEEL}ا`);
  // other letters and lam-alif already draw cleanly
  assert.equal(tileGlyph("مَا"), "مَا");
  assert.equal(tileGlyph("لَا"), "لَا");
});

test("ya-hamza with a kasra shows its joined form so the kasra is not hidden", () => {
  assert.equal(tileGlyph("ئِ"), "ئِ\u200D");
  assert.equal(tileGlyph("ئَ"), "ئَ");
});

test("hamza on a tatweel is shown as a plain hamza", () => {
  // QPC order: tatweel, hamza above, haraka (خَطِيٓـَٔتُهُۥ)
  assert.equal(tileGlyph("\u0640\u0654\u064E"), "\u0621\u064E");
  assert.equal(tileGlyph("\u0640\u0654\u064F"), "\u0621\u064F");
  assert.equal(tileGlyph("\u0640\u0654\u064E\u0627"), "\u0621\u064E\u0627");
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

test("alif-hamza with the open tanween keeps the tanween above (joined form)", () => {
  assert.equal(tileGlyph("أٞ"), "‍أٞ");
  assert.equal(tileGlyph("أَ"), "أَ");
});

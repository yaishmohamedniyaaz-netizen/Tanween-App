import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { judgingUnitsOf } from "../src/lib/judgingUnits.ts";
import { graphemesOf, isNonRecitationWord } from "../src/lib/tokenize.ts";

const glyphs = (word) => judgingUnitsOf(word, "letter").map((unit) => unit.glyph);

test("Allah is exposed as alif, one lam target, and ha", () => {
  const units = judgingUnitsOf("ٱللَّهُ", "letter");
  assert.deepEqual(units.map((unit) => unit.base), ["ٱ", "ل", "ه"]);
  assert.equal(units[1].kind, "allah-lam");
  assert.equal(units[1].glyph, "لَّ");
  assert.deepEqual(units[1].legacyGraphemeIndices, [1, 2]);
});

test("attached prefixes remain separate from the three Allah targets", () => {
  const units = judgingUnitsOf("وَٱللَّهُ", "letter");
  assert.deepEqual(units.map((unit) => unit.base), ["و", "ٱ", "ل", "ه"]);
});

test("ordinary joined and doubled letters remain independently judgeable", () => {
  assert.deepEqual(glyphs("بِرَبِّ"), ["بِ", "رَ", "بِّ"]);
  assert.equal(judgingUnitsOf("لَا", "letter").length, 2);
});

test("small vowel letters and Quranic marks stay with their host", () => {
  assert.deepEqual(glyphs("لَهُۥ"), ["لَ", "هُۥ"]);
  assert.equal(judgingUnitsOf("هُۥۚ", "letter").length, 1);
});

test("the KFGQPC tatweel plus combining hamza is a real unit", () => {
  const units = judgingUnitsOf("يَسۡـَٔلُونَ", "letter");
  assert.deepEqual(units.map((unit) => unit.base), ["ي", "س", "ء", "ل", "و", "ن"]);
  assert.equal(units[2].kind, "hamza");
});

test("ayah ornaments never become judging targets", () => {
  assert.deepEqual(judgingUnitsOf("۞", "letter"), []);
  assert.deepEqual(judgingUnitsOf("۩", "letter"), []);
});

test("all 604 pages produce complete, ordered and legacy-compatible units", () => {
  const pageFiles = fs
    .readdirSync("public/pages")
    .filter((name) => /^p\d+\.json$/.test(name));
  assert.equal(pageFiles.length, 604);

  let auditedWords = 0;
  let mergedAllahForms = 0;
  let encodedHamzas = 0;
  for (const pageFile of pageFiles) {
    const page = JSON.parse(
      fs.readFileSync(path.join("public/pages", pageFile), "utf8"),
    );
    for (const line of page.lines) {
      for (const word of line.words ?? []) {
        if (word.role !== "letter") continue;
        const units = judgingUnitsOf(word.text, "letter");
        if (isNonRecitationWord(word.text)) {
          assert.equal(units.length, 0, `${pageFile} ${word.wid}`);
          continue;
        }

        auditedWords += 1;
        assert.ok(units.length > 0, `${pageFile} ${word.wid}`);
        mergedAllahForms += units.filter((unit) => unit.kind === "allah-lam").length;
        encodedHamzas += units.filter((unit) => unit.kind === "hamza").length;
        assert.equal(units[0].start, 0, `${pageFile} ${word.wid}`);
        assert.equal(units.at(-1).end, word.text.length, `${pageFile} ${word.wid}`);
        for (let index = 1; index < units.length; index += 1) {
          assert.equal(
            units[index - 1].end,
            units[index].start,
            `${pageFile} ${word.wid}`,
          );
        }

        const legacy = units.flatMap((unit) => unit.legacyGraphemeIndices).sort((a, b) => a - b);
        const expected = graphemesOf(word.text, "letter").map((_, index) => index);
        assert.deepEqual(legacy, expected, `${pageFile} ${word.wid}`);
      }
    }
  }
  assert.ok(auditedWords > 77_000);
  assert.ok(mergedAllahForms > 2_600);
  assert.equal(encodedHamzas, 491);
});

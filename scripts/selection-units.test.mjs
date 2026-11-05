import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import {
  judgingTargetsOf,
  judgingUnitsOf,
  resolvesTargetId,
} from "../src/lib/judgingUnits.ts";
import { graphemesOf, isNonRecitationWord } from "../src/lib/tokenize.ts";

const primaryGlyphs = (word) =>
  judgingUnitsOf(word, "letter").map((unit) => unit.primaryGlyph);

test("Allah exposes alif, one lam locus, and ha without losing source ink", () => {
  const word = "\u0671\u0644\u0644\u0651\u064e\u0647\u064f";
  const units = judgingUnitsOf(word, "letter");
  assert.deepEqual(units.map((unit) => unit.base), ["ٱ", "ل", "ه"]);
  assert.equal(units[1].kind, "allah-lam");
  assert.equal(units[1].primaryGlyph, "ل");
  assert.equal(units[1].fullGlyph, "للَّ");
  assert.deepEqual(units[1].legacyGraphemeIndices, [1, 2]);
});

test("attached waw and written-lam prefixes stay outside the Allah lam locus", () => {
  assert.deepEqual(
    primaryGlyphs("\u0648\u064e\u0671\u0644\u0644\u0651\u064e\u0647\u064f"),
    ["و", "ٱ", "ل", "ه"],
  );
  assert.deepEqual(
    primaryGlyphs("\u0644\u0650\u0644\u0644\u0651\u064e\u0647\u0650"),
    ["ل", "ل", "ه"],
  );
});

test("madd and silent plural alifs belong to their audible host target", () => {
  const la = judgingUnitsOf("\u0644\u064e\u0627", "letter");
  assert.equal(la.length, 1);
  assert.equal(la[0].primaryGlyph, "ل");
  assert.equal(la[0].fullGlyph, "لَا");
  assert.ok(la[0].features.includes("madd-alif"));

  const tawasaw = judgingUnitsOf(
    "\u0648\u064e\u062a\u064e\u0648\u064e\u0627\u0635\u064e\u0648\u06e1\u0627\u0652",
    "letter",
  );
  assert.deepEqual(tawasaw.map((unit) => unit.primaryGlyph), [
    "و",
    "ت",
    "و",
    "ص",
    "و",
  ]);
  assert.equal(tawasaw[2].fullGlyph, "وَا");
  assert.equal(tawasaw[4].orthographyRole, "silent-plural-alif");
  assert.ok(tawasaw[4].features.includes("sukun"));
  assert.ok(!tawasaw[4].features.includes("pause-mark"));
});

test("crowded tashkeel remains exact evidence but not crowded rail ink", () => {
  const word =
    "\u0671\u0644\u0646\u0651\u064e\u0641\u0651\u064e\u0670\u062b\u064e\u0670\u062a\u0650";
  // The silent lam joins the shadda nun (lam shamsiyyah), so find fa by its base.
  const fa = judgingUnitsOf(word, "letter").find((unit) => unit.base === "ف");
  assert.equal(fa.primaryGlyph, "ف");
  assert.equal(fa.fullGlyph, "فَّٰ");
  assert.deepEqual(fa.features, ["fatha", "shadda", "dagger-alif"]);
});

test("hamza-on-carrier remains one hamza locus with transparent metadata", () => {
  const units = judgingUnitsOf("\u0633\u064f\u0626\u0650\u0644\u064e", "letter");
  assert.deepEqual(units.map((unit) => unit.primaryGlyph), ["س", "ء", "ل"]);
  assert.equal(units[1].kind, "hamza");
  assert.equal(units[1].carrier, "ya");
  assert.equal(units[1].fullGlyph, "ئِ");
});

test("the KFGQPC tatweel plus combining hamza is a real hamza locus", () => {
  const units = judgingUnitsOf(
    "\u064a\u064e\u0633\u06e1\u0640\u0654\u064e\u0644\u064f\u0648\u0646\u064e",
    "letter",
  );
  assert.deepEqual(units.map((unit) => unit.base), ["ي", "س", "ء", "ل", "و", "ن"]);
  assert.equal(units[2].carrier, "tatweel");
});

test("legacy ordinal and grapheme ids resolve after a many-to-one merge", () => {
  const targets = judgingTargetsOf(
    "\u0648\u064e\u062a\u064e\u0648\u064e\u0627\u0635\u064e\u0648\u06e1\u0627\u0652",
    "letter",
    "103.3.5",
  );
  assert.equal(targets.length, 5);
  assert.ok(resolvesTargetId(targets[2], "103.3.5@u2"));
  assert.ok(resolvesTargetId(targets[2], "103.3.5@u3"));
  assert.ok(resolvesTargetId(targets[4], "103.3.5#6"));
  assert.equal(targets[2].tid, "103.3.5@r4");
});

test("ayah ornaments never become judging targets", () => {
  assert.deepEqual(judgingUnitsOf("\u06DE", "letter"), []);
  assert.deepEqual(judgingUnitsOf("\u06E9", "letter"), []);
});

test("all 604 pages produce ordered, source-complete, alias-safe targets", () => {
  const pageFiles = fs
    .readdirSync("public/pages")
    .filter((name) => /^p\d+\.json$/.test(name));
  assert.equal(pageFiles.length, 604);

  let auditedWords = 0;
  let groupedAlifs = 0;
  let mergedAllahForms = 0;
  let encodedTatweelHamzas = 0;
  let tawasawFixtures = 0;
  for (const pageFile of pageFiles) {
    const page = JSON.parse(
      fs.readFileSync(path.join("public/pages", pageFile), "utf8"),
    );
    for (const line of page.lines) {
      for (const word of line.words ?? []) {
        if (word.role !== "letter") continue;
        const units = judgingUnitsOf(word.text, "letter");
        const targets = judgingTargetsOf(word.text, "letter", word.wid);
        if (isNonRecitationWord(word.text)) {
          assert.equal(units.length, 0, `${pageFile} ${word.wid}`);
          continue;
        }

        auditedWords += 1;
        assert.ok(units.length > 0, `${pageFile} ${word.wid}`);
        assert.equal(targets.length, units.length, `${pageFile} ${word.wid}`);
        assert.equal(units[0].start, 0, `${pageFile} ${word.wid}`);
        assert.equal(units.at(-1).end, word.text.length, `${pageFile} ${word.wid}`);

        const tids = new Set();
        const aliases = new Set();
        for (let index = 0; index < units.length; index += 1) {
          const unit = units[index];
          const target = targets[index];
          assert.equal(unit.fullGlyph, word.text.slice(unit.start, unit.end));
          assert.ok(unit.primaryGlyph.length > 0, `${pageFile} ${word.wid}`);
          assert.ok(!tids.has(target.tid), `${pageFile} ${word.wid} ${target.tid}`);
          tids.add(target.tid);
          for (const alias of target.aliases) {
            assert.ok(!aliases.has(alias), `${pageFile} ${word.wid} ${alias}`);
            aliases.add(alias);
          }
          if (index > 0) {
            assert.equal(units[index - 1].end, unit.start, `${pageFile} ${word.wid}`);
          }
        }

        const legacy = units
          .flatMap((unit) => unit.legacyGraphemeIndices)
          .sort((a, b) => a - b);
        const expected = graphemesOf(word.text, "letter").map((_, index) => index);
        assert.deepEqual(legacy, expected, `${pageFile} ${word.wid}`);

        groupedAlifs += units.filter(
          (unit) =>
            unit.orthographyRole === "madd-support" ||
            unit.orthographyRole === "silent-plural-alif",
        ).length;
        mergedAllahForms += units.filter((unit) => unit.kind === "allah-lam").length;
        encodedTatweelHamzas += units.filter(
          (unit) => unit.carrier === "tatweel",
        ).length;
        if (word.text === "وَتَوَاصَوۡاْ") {
          tawasawFixtures += 1;
          assert.equal(page.page, Number(pageFile.slice(1, -5)));
          assert.equal(units.length, 5, `${pageFile} ${word.wid}`);
        }
      }
    }
  }
  assert.ok(auditedWords > 77_000);
  assert.ok(groupedAlifs > 15_000);
  assert.ok(mergedAllahForms > 2_600);
  assert.equal(encodedTatweelHamzas, 495);
  assert.equal(tawasawFixtures, 4);
});

// Letters that are written but never pronounced join the sound that carries them.
const RAHMAN = "ٱلرَّحۡمَٰنِ";
const ULAIKA = "أُوْلَٰٓئِكَ";
const MIN = "مِّن";
const RABBIHIM = "رَّبِّهِمۡۖ";

test("a silent lam before a sun letter joins the shadda letter", () => {
  const units = judgingUnitsOf(RAHMAN, "letter");
  assert.deepEqual(units.map((unit) => unit.primaryGlyph), ["ٱ", "ر", "ح", "م", "ن"]);
  assert.equal(units[1].fullGlyph, RAHMAN.slice(1, 5));
  assert.equal(units[1].audibleGlyph, RAHMAN.slice(2, 5));
  assert.equal(units[1].orthographyRole, "idgham-absorbed");
  assert.ok(units[1].features.includes("idgham-absorbed"));
  const targets = judgingTargetsOf(RAHMAN, "letter", "1.1.2");
  assert.equal(targets[1].tid, "1.1.2@r1");
  assert.ok(resolvesTargetId(targets[1], "1.1.2@r2"), "the old ra id still resolves");
});

test("complete idgham inside a word and round-zero letters join their sound", () => {
  assert.deepEqual(
    primaryGlyphs("أَرَدتُّمۡ"),
    ["ء", "ر", "ت", "م"],
  );
  const units = judgingUnitsOf(ULAIKA, "letter");
  assert.deepEqual(units.map((unit) => unit.primaryGlyph), ["ء", "ل", "ء", "ك"]);
  assert.equal(units[0].fullGlyph, ULAIKA.slice(0, 4));
  assert.ok(units[0].features.includes("silent-letter"));
  const targets = judgingTargetsOf(ULAIKA, "letter", "2.5.0");
  assert.ok(resolvesTargetId(targets[0], "2.5.0@r2"), "the old waw id still resolves");
});

test("a final letter absorbed by the next word joins its own word's last sound", () => {
  const alone = judgingUnitsOf(MIN, "letter");
  assert.deepEqual(alone.map((unit) => unit.primaryGlyph), ["م", "ن"]);
  const units = judgingUnitsOf(MIN, "letter", { nextWord: RABBIHIM });
  assert.deepEqual(units.map((unit) => unit.primaryGlyph), ["م"]);
  assert.equal(units[0].fullGlyph, MIN);
  assert.equal(units[0].audibleGlyph, MIN.slice(0, 3));
  const targets = judgingTargetsOf(MIN, "letter", "2.5.3", { nextWord: RABBIHIM });
  assert.ok(!resolvesTargetId(targets[0], "2.5.3@r3"), "the silent nun keeps no id of its own");
});

test("a nun kept as ghunna (no shadda on the next letter) stays a target", () => {
  assert.deepEqual(
    judgingUnitsOf("مَن", "letter", { nextWord: "يَقُولُ" })
      .map((unit) => unit.primaryGlyph),
    ["م", "ن"],
  );
});

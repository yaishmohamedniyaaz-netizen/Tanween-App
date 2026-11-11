import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { judgingTargetsOf, TARGET_RULE_VERSION } from "../src/lib/judgingUnits.ts";
import { nextRecitedWords } from "../src/lib/recitedNeighbours.ts";
import { fromDkBars, letterBarGeometry, LETTER_BAR_ARTWORK_PX, underlineGeometry } from "../src/lib/letterBorders.ts";

const page = (words, ruleVersion = TARGET_RULE_VERSION) => ({ page: 2, ruleVersion, words });
const MIN = { tids: ["2.5.3@r0", "2.5.3@r3"], x: [966, 931, 891] };
const REGION = [880, 1150, 980, 1300];

test("a letter bar spans that letter's approved borders inside the word region", () => {
  const nun = letterBarGeometry(page({ "2.5.3": MIN }), "2.5.3", "2.5.3@r3", REGION);
  assert.deepEqual(nun, { left: 0.11, width: 0.4, thickness: LETTER_BAR_ARTWORK_PX / 100 });
  const meem = letterBarGeometry(page({ "2.5.3": MIN }), "2.5.3", "2.5.3@r0", REGION);
  assert.equal(meem.left, 0.51);
  assert.equal(meem.width, 0.35);
});

test("no bar without an approved border: unknown word, other letter units, or old rules", () => {
  assert.equal(letterBarGeometry(page({}), "2.5.3", "2.5.3@r3", REGION), null);
  assert.equal(letterBarGeometry(page({ "2.5.3": MIN }), "2.5.3", "2.5.3@r9", REGION), null);
  assert.equal(letterBarGeometry(page({ "2.5.3": MIN }, "qpc-hafs-v1-targets-3.0.0"), "2.5.3", "2.5.3@r3", REGION), null);
  assert.equal(letterBarGeometry(null, "2.5.3", "2.5.3@r3", REGION), null);
  assert.equal(letterBarGeometry(page({ "2.5.3": MIN }), "2.5.3", "2.5.3@r3", undefined), null);
});

test("the shipped borders match the app's current letters and sit inside each word", () => {
  const index = JSON.parse(fs.readFileSync("public/letter-borders/index.json", "utf8"));
  assert.equal(index.ruleVersion, TARGET_RULE_VERSION);
  let words = 0;
  for (const p of index.pages) {
    const data = JSON.parse(fs.readFileSync(`public/letter-borders/p${p}.json`, "utf8"));
    const art = JSON.parse(fs.readFileSync(`public/mushaf/1405-artwork-5a5f9f3846158475/p${p}.json`, "utf8"));
    const text = JSON.parse(fs.readFileSync(`public/pages/p${p}.json`, "utf8"));
    const next = nextRecitedWords(text);
    // Ink can reach past the reading-order region (a final letter under the next
    // word), so borders are checked against the word body, with the review
    // screen's 8 px crop margin.
    const bodies = new Map(art.words.map((word) => [word.wid, word.body]));
    const semantic = new Map(text.lines.flatMap((line) => line.words ?? []).map((word) => [word.wid, word]));
    assert.equal(data.ruleVersion, TARGET_RULE_VERSION);
    for (const [wid, word] of Object.entries(data.words)) {
      const source = semantic.get(wid);
      const tids = judgingTargetsOf(source.text, source.role, wid, { nextWord: next.get(wid) }).map((t) => t.tid);
      assert.deepEqual(word.tids, tids, `${wid} letters`);
      for (let i = 1; i < word.x.length; i += 1) assert.ok(word.x[i] < word.x[i - 1], `${wid} borders go right to left`);
      const body = bodies.get(wid);
      assert.ok(word.x[0] <= body[2] + 8 && word.x.at(-1) >= body[0] - 8, `${wid} inside its body`);
      words += 1;
    }
  }
  assert.ok(words >= 65);
});

test("guessed underlines: approved first, then guesses by the prototype switch", () => {
  const approved = page({ "2.5.3": MIN });
  const guess = page({ "2.6.0": { ...MIN, tids: ["2.6.0@r0", "2.6.0@r3"], confidence: "low" } });
  // An approved word ignores the guesses.
  assert.equal(underlineGeometry(approved, guess, "full", "2.5.3", "2.5.3@r3", REGION).width, 0.4);
  // Off: no guesses; "high": only high-confidence guesses.
  assert.equal(underlineGeometry(approved, guess, "off", "2.6.0", "2.6.0@r3", REGION), null);
  assert.equal(underlineGeometry(approved, guess, "high", "2.6.0", "2.6.0@r3", REGION), null);
  // Full bar: the whole guessed letter. Short bar: 40% of it, centred.
  const full = underlineGeometry(approved, guess, "full", "2.6.0", "2.6.0@r3", REGION);
  assert.deepEqual([full.left, full.width], [0.11, 0.4]);
  const short = underlineGeometry(approved, guess, "short", "2.6.0", "2.6.0@r3", REGION);
  assert.ok(Math.abs(short.width - 0.16) < 1e-9 && Math.abs(short.left - 0.23) < 1e-9);
});

test("DigitalKhatt-guided bars: checked words are high confidence, others low, known-wrong and broken words dropped", () => {
  const raw = page({
    "2.6.0": { tids: ["2.6.0@r0", "2.6.0@r3"], bars: [[935, 966], [891, 931]], status: "ok", checks: [] },
    "2.6.1": { tids: ["2.6.1@r0"], bars: [[900, 950]], status: "review", checks: ["fit"] },
    "2.6.2": { tids: ["2.6.2@r0"], bars: [[900, 950]], status: "review", checks: ["visual-v3-wrong"] },
    "2.6.3": { tids: ["2.6.3@r0", "2.6.3@r1"], bars: [[900, 950]], status: "review", checks: ["error: invalid bar geometry"] },
    "2.6.4": { tids: ["2.6.4@r0"], bars: [null], status: "review", checks: ["coverage"] },
    "2.6.5": { tids: ["2.6.5@r0"], bars: [[950, 900]], status: "review", checks: ["overlap"] },
  });
  const guesses = fromDkBars(raw);
  assert.deepEqual(Object.keys(guesses.words), ["2.6.0", "2.6.1"]);
  assert.equal(guesses.words["2.6.0"].confidence, "high");
  assert.equal(guesses.words["2.6.1"].confidence, "low");
  // A bar is the letter's own span, so gaps between letters stay gaps.
  const nun = underlineGeometry(null, guesses, "full", "2.6.0", "2.6.0@r3", REGION);
  assert.deepEqual([nun.left, nun.width], [0.11, 0.4]);
  const meem = underlineGeometry(null, guesses, "full", "2.6.0", "2.6.0@r0", REGION);
  assert.deepEqual([meem.left, meem.width], [0.55, 0.31]);
  assert.equal(underlineGeometry(null, guesses, "high", "2.6.1", "2.6.1@r0", REGION), null);
  assert.ok(underlineGeometry(null, guesses, "full", "2.6.1", "2.6.1@r0", REGION));
});

test("the shipped DigitalKhatt-guided bars match the app's current letters", () => {
  const index = JSON.parse(fs.readFileSync("public/letter-bars-dk/index.json", "utf8"));
  assert.equal(index.ruleVersion, TARGET_RULE_VERSION);
  assert.equal(index.pages.length, 604);
  let high = 0;
  for (const p of index.pages) {
    const data = fromDkBars(JSON.parse(fs.readFileSync(`public/letter-bars-dk/p${p}.json`, "utf8")));
    assert.equal(data.page, p);
    const text = JSON.parse(fs.readFileSync(`public/pages/p${p}.json`, "utf8"));
    const next = nextRecitedWords(text);
    const semantic = new Map(text.lines.flatMap((line) => line.words ?? []).map((word) => [word.wid, word]));
    for (const [wid, word] of Object.entries(data.words)) {
      const source = semantic.get(wid);
      const tids = judgingTargetsOf(source.text, source.role, wid, { nextWord: next.get(wid) }).map((t) => t.tid);
      assert.deepEqual(word.tids, tids, `${wid} letters`);
      if (word.confidence === "high") high += 1;
    }
  }
  assert.ok(high > 68000, `${high} checked words`);
});

test("printed Basmala bars: the app's letters, inside each word, never overlapping", async () => {
  const { printedBasmalaBars, printedBasmalaWords } = await import("../src/lib/printedBasmala.ts");
  let rows = 0;
  for (let p = 1; p <= 604; p += 1) {
    const bars = printedBasmalaBars(p);
    if (!Object.keys(bars).length) continue;
    const text = JSON.parse(fs.readFileSync(`public/pages/p${p}.json`, "utf8"));
    const regions = new Map(printedBasmalaWords(text).map((word) => [word.wid, word]));
    for (const [wid, word] of Object.entries(bars)) {
      const source = regions.get(wid);
      assert.ok(source, `${wid} is a printed Basmala word`);
      const tids = judgingTargetsOf(source.text, source.role, wid, {}).map((t) => t.tid);
      assert.deepEqual(word.tids, tids, `${wid} letters`);
      word.bars.forEach(([left, right], i) => {
        assert.ok(right > left && left >= source.region[0] - 1 && right <= source.region[2] + 1, `${wid} bar ${i} inside its word`);
        if (i) assert.ok(right <= word.bars[i - 1][0], `${wid} bars go right to left without overlap`);
      });
    }
    rows += Object.keys(bars).length / 4;
    // The guesses loader adds them to every page's bars.
    const guesses = fromDkBars(JSON.parse(fs.readFileSync(`public/letter-bars-dk/p${p}.json`, "utf8")));
    assert.ok(Object.keys(bars).every((wid) => guesses.words[wid]?.confidence === "high"));
  }
  assert.equal(rows, 111);
});

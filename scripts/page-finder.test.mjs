import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { JUZ_START, latinKey, normalizeArabic, pageFinderItems } from "../src/lib/pageFinder.ts";

const surahs = JSON.parse(readFileSync(new URL("../src/data/surah-index.json", import.meta.url), "utf8"));
const find = (query, questionPage = null) =>
  pageFinderItems(surahs, query, questionPage).map((item) => `${item.kind}:${item.kind === "juz" ? item.juz : item.surah}:${item.page}`);

test("a number finds the page, the surah and the juz", () => {
  assert.deepEqual(find("50"), ["page:3:50", "surah:50:518"]);
  assert.deepEqual(find("30"), ["page:2:30", "surah:30:404", "juz:30:582"]);
  assert.deepEqual(find("605"), []);
  assert.deepEqual(find("٥٠"), ["page:3:50", "surah:50:518"], "Arabic-Indic digits");
});

test("Latin names forgive spelling and the article", () => {
  assert.deepEqual(find("yaseen"), ["surah:36:440"]);
  assert.deepEqual(find("al-fatiha"), ["surah:1:1"]);
  assert.equal(find("ala")[0], "surah:87:591");
  assert.equal(latinKey("Ali 'Imran"), latinKey("ali imran"));
  // Meanings are searchable even though they are not shown.
  assert.deepEqual(find("cow"), ["surah:2:2"]);
});

test("Arabic names match with or without vowel marks and the article", () => {
  assert.deepEqual(find("البقرة"), ["surah:2:2"]);
  assert.deepEqual(find("بقره"), ["surah:2:2"]);
  assert.equal(normalizeArabic("آل عِمۡرَان"), "ال عمران");
});

test("juz uses the Mushaf's own juz table", () => {
  assert.equal(JUZ_START.length, 30);
  assert.equal(JUZ_START[0], 1);
  assert.equal(JUZ_START[1], 22);
  assert.equal(JUZ_START[25], 503);
  assert.equal(JUZ_START[29], 582);
  assert.deepEqual(find("juz 26"), ["juz:26:503"]);
  assert.deepEqual(find("جزء 3"), ["juz:3:42"]);
  assert.deepEqual(find("juz 31"), []);
});

test("the question page leads the empty list", () => {
  assert.equal(find("", 440)[0], "question:36:440");
  assert.equal(find("")[0], "surah:1:1");
  assert.equal(find("", 440).length, 115);
  assert.ok(!find("50", 440).some((item) => item.startsWith("question")));
});

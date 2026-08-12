import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import {
  createQuestionIndexLookup,
  resolveQuestionRange,
} from "../src/lib/questionBank.ts";

const asset = JSON.parse(fs.readFileSync("public/question-index.json", "utf8"));
const lookup = createQuestionIndexLookup(asset);

test("all 604 pages produce one stable boundary for every ayah", () => {
  assert.equal(asset.pageCount, 604);
  assert.equal(asset.entryCount, 6236);
  assert.equal(asset.entries.length, 6236);
  assert.equal(new Set(asset.entries.map((entry) => `${entry[0]}:${entry[1]}`)).size, 6236);
  assert.equal(lookup.byKey.get("2:181")?.endMarkerId, "2.181.14");

  const page27 = JSON.parse(fs.readFileSync("public/pages/p27.json", "utf8"));
  const marker = page27.lines
    .flatMap((line) => line.words ?? [])
    .find((word) => word.wid === "2.181.14");
  assert.equal(marker?.role, "ayah-end");
});

test("seven printed lines resolve to the first complete ayah ending", () => {
  const fatiha = resolveQuestionRange(lookup, { surah: 1, ayah: 1 }, 7);
  assert.equal(fatiha.ok, true);
  assert.deepEqual(fatiha.ok && fatiha.range.endAyah, { surah: 1, ayah: 7 });
  assert.equal(fatiha.ok && fatiha.range.resolvedLines, 7);
  assert.equal(fatiha.ok && fatiha.range.extensionLines, 0);

  const page27 = resolveQuestionRange(lookup, { surah: 2, ayah: 177 }, 7);
  assert.equal(page27.ok, true);
  assert.deepEqual(page27.ok && page27.range.endAyah, { surah: 2, ayah: 177 });
  assert.equal(page27.ok && page27.range.endMarkerId, "2.177.51");
});

test("the resolver crosses pages and reports extensions without hiding them", () => {
  const crossPage = resolveQuestionRange(lookup, { surah: 2, ayah: 180 }, 7);
  assert.equal(crossPage.ok, true);
  assert.ok(crossPage.ok && crossPage.range.endPage > crossPage.range.startPage);
  assert.ok(crossPage.ok && crossPage.range.resolvedLines >= 7);

  const extendedStart = lookup.ayahs.find((start, startOrdinal) => {
    const targetLine = start.startGlobalLine + 6;
    const end = lookup.ayahs
      .slice(startOrdinal)
      .find((ayah) => ayah.endGlobalLine >= targetLine);
    return end && end.endGlobalLine > targetLine;
  });
  assert.ok(extendedStart);
  const extended = resolveQuestionRange(lookup, extendedStart, 7);
  assert.equal(extended.ok, true);
  assert.ok(extended.ok && extended.range.extensionLines > 0);
});

test("invalid and Quran-end starts fail explicitly", () => {
  assert.deepEqual(resolveQuestionRange(lookup, { surah: 1, ayah: 1 }, 0), {
    ok: false,
    reason: "invalid-target",
  });
  assert.deepEqual(resolveQuestionRange(lookup, { surah: 115, ayah: 1 }, 7), {
    ok: false,
    reason: "start-not-found",
  });
  const finalAyah = resolveQuestionRange(lookup, { surah: 114, ayah: 6 }, 7);
  assert.equal(finalAyah.ok, false);
  assert.equal(!finalAyah.ok && finalAyah.reason, "insufficient-lines");
  assert.equal(!finalAyah.ok && finalAyah.availableLines, 1);
});


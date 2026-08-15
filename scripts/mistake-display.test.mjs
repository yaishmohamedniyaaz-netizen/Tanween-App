import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  mistakeFullGlyph,
  mistakePrimaryGlyph,
} from "../src/lib/mistakeDisplay.ts";
import { computeRecords } from "../src/lib/stats.ts";

const mistakeLogSource = readFileSync(
  new URL("../src/components/MistakeLog.tsx", import.meta.url),
  "utf8",
);
const historySource = readFileSync(
  new URL("../src/components/JudgingHistory.tsx", import.meta.url),
  "utf8",
);
const recordsSource = readFileSync(
  new URL("../src/components/RecordsView.tsx", import.meta.url),
  "utf8",
);
const resultSheetSource = readFileSync(
  new URL("../src/components/ResultSheet.tsx", import.meta.url),
  "utf8",
);
const exportSource = readFileSync(
  new URL("../src/lib/exportSession.ts", import.meta.url),
  "utf8",
);
const cssSource = readFileSync(
  new URL("../src/styles/global.css", import.meta.url),
  "utf8",
);

function ruleBody(selector) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = cssSource.match(new RegExp(`${escaped}\\s*\\{([^}]*)\\}`));
  assert.ok(match, `missing CSS rule ${selector}`);
  return match[1];
}

function finding(overrides = {}) {
  return {
    id: "m-1",
    tid: "9.75.4@r2",
    targetVersion: 2,
    wordId: "9.75.4",
    surah: 9,
    ayah: 75,
    page: 199,
    glyph: "\u0626\u0650",
    primaryGlyph: "\u0621",
    fullGlyph: "\u0626\u0650",
    wordText: "\u0644\u064e\u0626\u0650\u0646\u06e1",
    label: "9:75 · letter 2",
    category: "jali",
    amount: 2,
    ts: 1,
    ...overrides,
  };
}

test("page 199 carried hamza uses the semantic label and preserves exact Quran evidence", () => {
  const mistake = finding();
  assert.equal(mistakePrimaryGlyph(mistake), "\u0621");
  assert.equal(mistakeFullGlyph(mistake), "\u0626\u0650");
  assert.equal(mistake.wordText, "\u0644\u064e\u0626\u0650\u0646\u06e1");
});

test("every carried-hamza family keeps one primary label and its distinct full form", () => {
  const forms = [
    "\u0623\u064e",
    "\u0624\u064f",
    "\u0626\u0650",
    "\u0640\u0654\u064e",
  ];
  for (const fullGlyph of forms) {
    const mistake = finding({ fullGlyph, glyph: fullGlyph });
    assert.equal(mistakePrimaryGlyph(mistake), "\u0621");
    assert.equal(mistakeFullGlyph(mistake), fullGlyph);
  }
});

test("ordinary, legacy, empty, and decomposed evidence use deterministic fallbacks", () => {
  const ordinary = finding({ primaryGlyph: "\u0641", fullGlyph: "\u0641\u064e", glyph: "\u0641\u064e" });
  assert.equal(mistakePrimaryGlyph(ordinary), "\u0641");
  assert.equal(mistakeFullGlyph(ordinary), "\u0641\u064e");

  const legacy = finding({ primaryGlyph: undefined, fullGlyph: undefined, glyph: "\u0626\u0650" });
  assert.equal(mistakePrimaryGlyph(legacy), "\u0626\u0650");
  assert.equal(mistakeFullGlyph(legacy), "\u0626\u0650");

  const empty = finding({ primaryGlyph: "   ", fullGlyph: "", glyph: "" });
  assert.equal(mistakePrimaryGlyph(empty), "—");
  assert.equal(mistakeFullGlyph(empty), "—");

  const decomposed = "\u0640\u0654";
  assert.equal(mistakeFullGlyph(finding({ fullGlyph: decomposed })), decomposed);
});

test("records statistics group semantic letters but preserve stable locations", () => {
  const history = [
    {
      participant: { ageGroup: "Under 14" },
      total: 96,
      totalMax: 100,
      mistakes: [
        finding({ id: "ya", tid: "9.75.4@r2", fullGlyph: "\u0626\u0650", glyph: "\u0626\u0650" }),
        finding({ id: "waw", tid: "2.6.1@r1", fullGlyph: "\u0624\u064f", glyph: "\u0624\u064f" }),
      ],
    },
  ];
  const stats = computeRecords(history, null);
  assert.deepEqual(stats.topLetters[0], { glyph: "\u0621", count: 2 });
  assert.equal(stats.topLocations.length, 2);
  assert.deepEqual(
    stats.topLocations.map((location) => location.tid).sort(),
    ["2.6.1@r1", "9.75.4@r2"],
  );
  assert.ok(stats.topLocations.every((location) => location.glyph === "\u0621"));
});

test("compact and review surfaces share the semantic display helper", () => {
  assert.doesNotMatch(mistakeLogSource, /slice\(0,\s*5\)/);
  assert.match(mistakeLogSource, /ordered\.map\(\(mistake\)/);
  assert.equal((mistakeLogSource.match(/>\s*View all\s*</g) ?? []).length, 1);
  assert.match(mistakeLogSource, /mistakePrimaryGlyph\(mistake\)/);
  assert.match(mistakeLogSource, /mistakeFullGlyph\(mistake\)/);
  assert.match(historySource, /mistakePrimaryGlyph\(mistake\)/);
  assert.match(recordsSource, /mistakePrimaryGlyph\(mistake\)/);
  assert.match(resultSheetSource, /mistakePrimaryGlyph\(m\)/);
  assert.doesNotMatch(historySource, /history-glyph[^\n]*mistake\.glyph/);
  assert.doesNotMatch(recordsSource, /drill-glyph[^\n]*mistake\.glyph/);
  assert.doesNotMatch(resultSheetSource, /rs-glyph[^\n]*m\.glyph/);
});

test("exports retain immutable full-form snapshots", () => {
  assert.equal((exportSource.match(/\bglyph:\s*m\.glyph\b/g) ?? []).length, 1);
  assert.match(exportSource, /\n\s*m\.glyph,\s*\n/);
  assert.doesNotMatch(exportSource, /mistakePrimaryGlyph/);
});

test("CSS locks scrolling and Arabic ink", () => {
  assert.match(ruleBody(".mistake-panel .log"), /flex:\s*1 1 auto/);
  assert.match(ruleBody(".mistake-panel .log"), /overflow-y:\s*auto/);
  assert.match(ruleBody(".log-row-wrap"), /flex:\s*0 0 auto/);

  const wordRule = ruleBody(".log-detail-line .log-kalimah-word");
  assert.doesNotMatch(wordRule, /overflow:\s*hidden/);
  assert.doesNotMatch(wordRule, /text-overflow:\s*ellipsis/);
  assert.match(wordRule, /line-height:\s*1\.55/);

});

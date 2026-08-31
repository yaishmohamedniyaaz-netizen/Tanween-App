import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  buildMobileCriterionChips,
  formatRecitationElapsed,
  latestMobileMistakeAction,
  mistakeCountLabel,
  mobileJudgeDeckFlagEnabled,
} from "../src/lib/mobileJudgeDeck.ts";

const categories = ["jali", "khafi", "fasaha", "adu-raagu"];
const scores = {
  jali: { start: 50, deducted: 2, score: 48, count: 1, marked: true },
  khafi: { start: 30, deducted: 0, score: 30, count: 0, marked: false },
  fasaha: { start: 10, deducted: 0.5, score: 9.5, count: 1, marked: true },
  "adu-raagu": { start: 10, deducted: 10, score: 0, count: 0, marked: false },
};

test("the mobile judge deck only opts in through its exact query flag", () => {
  assert.equal(mobileJudgeDeckFlagEnabled("?mobileJudgeDeck=1"), true);
  assert.equal(mobileJudgeDeckFlagEnabled("?mobileJudgeDeck=0"), false);
  assert.equal(mobileJudgeDeckFlagEnabled("?mobilejudgedeck=1"), false);
  assert.equal(mobileJudgeDeckFlagEnabled(""), false);
});

test("one to four assignment criteria render in canonical order without abbreviations", () => {
  for (let count = 1; count <= 4; count += 1) {
    const chips = buildMobileCriterionChips(
      categories.slice(0, count),
      scores,
      ["adu-raagu"],
      "earned",
    );
    assert.equal(chips.length, count);
    assert.deepEqual(chips.map((chip) => chip.category), categories.slice(0, count));
  }
  assert.deepEqual(
    buildMobileCriterionChips(categories, scores, ["adu-raagu"], "earned")
      .map((chip) => chip.label),
    ["Laḥn Jalī", "Laḥn Khafī", "Faṣāḥa", "Adu / Raagu"],
  );
});

test("criterion chips show deductions and tint only under the chosen policy", () => {
  const earned = buildMobileCriterionChips(categories, scores, ["adu-raagu"], "earned");
  assert.deepEqual(earned.map((chip) => chip.deduction), ["−2", "—", "−0.5", "—"]);
  assert.deepEqual(earned.map((chip) => chip.tinted), [true, false, true, false]);
  assert.equal(earned.every((chip) => chip.showDot === false), true);

  const off = buildMobileCriterionChips(categories, scores, ["adu-raagu"], "off");
  assert.equal(off.every((chip) => chip.tinted === false), true);
  assert.equal(off.every((chip) => chip.showDot === true), true);

  const always = buildMobileCriterionChips(categories, scores, ["adu-raagu"], "always");
  assert.equal(always.every((chip) => chip.tinted === true), true);
});

test("mistake copy is unambiguous and elapsed timestamps are stable", () => {
  assert.equal(mistakeCountLabel(0), "0 mistakes");
  assert.equal(mistakeCountLabel(1), "1 mistake");
  assert.equal(mistakeCountLabel(3), "3 mistakes");
  assert.equal(formatRecitationElapsed(134_999), "2:14");
});

test("the last-action strip follows the latest live ledger action and retires on Undo", () => {
  const mistake = {
    id: "m1",
    tid: "1:1:1",
    surah: 1,
    ayah: 1,
    glyph: "ب",
    label: "1:1 · letter 1",
    category: "jali",
    amount: 2,
    ts: 120,
  };
  const started = { id: "e1", at: 100, type: "session_started" };
  const added = { id: "e2", at: 120, type: "mistake_added", mistake };
  assert.deepEqual(latestMobileMistakeAction([started, added], [mistake]), {
    mistake,
    at: 120,
  });
  const undone = { id: "e3", at: 130, type: "mistake_undone", mistake };
  assert.equal(latestMobileMistakeAction([started, added, undone], []), null);
});

test("last-action feedback uses the five-second window and a pre-mounted atomic status", () => {
  const deck = readFileSync(new URL("../src/components/MobileJudgeDeck.tsx", import.meta.url), "utf8");
  const css = readFileSync(new URL("../src/styles/global.css", import.meta.url), "utf8");
  assert.match(deck, /LAST_ACTION_VISIBLE_MS = 5_000/);
  assert.doesNotMatch(deck, /LAST_ACTION_VISIBLE_MS = 12000/);
  assert.match(
    deck,
    /className="mobile-judge-status"[\s\S]*role="status"[\s\S]*aria-atomic="true"/,
  );
  assert.ok(
    deck.indexOf('className="mobile-judge-status"') <
      deck.indexOf('className="mobile-judge-dock"'),
  );
  assert.doesNotMatch(deck, /mobile-last-action cat-\$\{[\s\S]{0,120}aria-live=/);
  assert.match(css, /\.mobile-judge-status \{[\s\S]*clip-path: inset\(50%\)/);
});

test("the portrait deck reuses the existing score, mistake, notes and judge components", () => {
  const app = readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");
  const deck = readFileSync(new URL("../src/components/MobileJudgeDeck.tsx", import.meta.url), "utf8");
  const css = readFileSync(new URL("../src/styles/global.css", import.meta.url), "utf8");
  assert.match(app, /mobileJudgeDeckPrototype && view === "judge" && state\.sessionActive/);
  assert.match(deck, /<ScorePanel inputMode=\{inputMode\}/);
  assert.match(deck, /<MistakeLog[\s\S]*presentation="mobile-sheet"/);
  assert.match(deck, /<NotesBox \/>/);
  assert.match(deck, /<JudgeRoleStrip onChange=/);
  assert.match(css, /@media \(max-width: 600px\) and \(orientation: portrait\)/);
  assert.match(css, /\.app\[data-mobile-judge-deck="true"\] \.sidebar \{[\s\S]*display: none/);
});

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  buildMobileCriterionChips,
  formatRecitationElapsed,
  latestMobileMistakeAction,
  mistakeCountLabel,
  mobileJudgeDeckEnabled,
} from "../src/lib/mobileJudgeDeck.ts";

const categories = ["jali", "khafi", "fasaha", "adu-raagu"];
const scores = {
  jali: { start: 50, deducted: 2, score: 48, count: 1, marked: true },
  khafi: { start: 30, deducted: 0, score: 30, count: 0, marked: false },
  fasaha: { start: 10, deducted: 0.5, score: 9.5, count: 1, marked: true },
  "adu-raagu": { start: 10, deducted: 1.5, score: 8.5, count: 0, marked: true },
};

test("the mobile judge deck defaults on and keeps an exact emergency opt-out", () => {
  assert.equal(mobileJudgeDeckEnabled(""), true);
  assert.equal(mobileJudgeDeckEnabled("?mobileJudgeDeck=1"), true);
  assert.equal(mobileJudgeDeckEnabled("?mobileJudgeDeck=0"), false);
  assert.equal(mobileJudgeDeckEnabled("?mobilejudgedeck=0"), true);
});

test("one to four assignment criteria render in canonical order without abbreviations", () => {
  for (let count = 1; count <= 4; count += 1) {
    const chips = buildMobileCriterionChips(
      categories.slice(0, count),
      scores,
      ["adu-raagu"],
    );
    assert.equal(chips.length, count);
    assert.deepEqual(chips.map((chip) => chip.category), categories.slice(0, count));
  }
  assert.deepEqual(
    buildMobileCriterionChips(categories, scores, ["adu-raagu"])
      .map((chip) => chip.label),
    ["Laḥn Jalī", "Laḥn Khafī", "Faṣāḥa", "Adu / Raagu"],
  );
});

test("criterion chips keep colour in blocks while Adu and Raagu shows awarded marks", () => {
  const pending = buildMobileCriterionChips(categories, scores, ["adu-raagu"]);
  assert.deepEqual(pending.map((chip) => chip.value), ["−2", "—", "−0.5", "— / 10"]);
  assert.equal(pending.every((chip) => !("tinted" in chip) && !("showDot" in chip)), true);

  const marked = buildMobileCriterionChips(categories, scores, []);
  assert.equal(marked.at(-1)?.value, "8.5 / 10");
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
  assert.match(app, /mobileJudgeDeckOn && view === "judge" && state\.sessionActive/);
  assert.match(deck, /<ScorePanel inputMode=\{inputMode\} presentation="compact"/);
  assert.match(deck, /<MistakeLog[\s\S]*presentation="mobile-sheet"/);
  assert.match(deck, /<NotesBox \/>/);
  assert.match(deck, /<JudgeRoleStrip onChange=/);
  assert.match(css, /@media \(max-width: 600px\) and \(orientation: portrait\),/);
  assert.match(css, /\(max-device-width: 600px\) and \(pointer: coarse\) and \(orientation: portrait\)/);
  assert.match(css, /\.app\[data-mobile-judge-deck="true"\] \.sidebar \{[\s\S]*display: none/);
});

test("portrait sheets expose explicit close controls and the score ruler clears the sheet layer", () => {
  const deck = readFileSync(new URL("../src/components/MobileJudgeDeck.tsx", import.meta.url), "utf8");
  const log = readFileSync(new URL("../src/components/MistakeLog.tsx", import.meta.url), "utf8");
  const score = readFileSync(new URL("../src/components/ScorePanel.tsx", import.meta.url), "utf8");
  const editor = readFileSync(new URL("../src/components/CompactTextEditor.tsx", import.meta.url), "utf8");
  const css = readFileSync(new URL("../src/styles/global.css", import.meta.url), "utf8");
  assert.match(deck, /className="mobile-sheet-close"[\s\S]*aria-label="Close score"/);
  assert.match(log, /className="mobile-sheet-close"[\s\S]*aria-label="Close mistakes"/);
  assert.doesNotMatch(deck, /mobile-sheet-handle/);
  assert.doesNotMatch(log, /mobile-sheet-handle/);
  assert.doesNotMatch(score, /sc-compact-judge/);
  assert.match(score, /layer=\{presentation === "compact" \? "dialog" : "workspace"\}/);
  assert.match(css, /\.mark-bar\.is-dialog-layer \{[\s\S]*z-index: 90/);
  assert.match(css, /\.mobile-sheet-close \{[\s\S]*min-height: 44px/);
  assert.doesNotMatch(deck, /<span className="t-label">Score<\/span>/);
  assert.match(deck, /className="mobile-score-sheet-context"[\s\S]*<JudgeRoleStrip/);
  assert.match(score, /presentation="inline"/);
  assert.doesNotMatch(editor, /<label/);
  assert.match(editor, /aria-label=\{label\}/);
  assert.match(css, /\.judge-role-colors i \{[\s\S]*width: 8px;[\s\S]*height: 8px/);
});

test("prepared portrait mode shares the live dock footprint without covering the Mushaf", () => {
  const app = readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");
  const prepared = readFileSync(new URL("../src/components/PreparedSidebar.tsx", import.meta.url), "utf8");
  const css = readFileSync(new URL("../src/styles/global.css", import.meta.url), "utf8");
  assert.match(app, /mobilePreparedActive[\s\S]*Boolean\(state\.preparedRecitation\)/);
  assert.match(app, /data-mobile-prepared=\{mobilePreparedActive \? "true" : undefined\}/);
  assert.match(prepared, /className="prepared-sidebar-details"/);
  assert.match(prepared, /className="prepared-sidebar-actions"/);
  assert.match(css, /\.app\[data-mobile-prepared="true"\] \.workspace \{[\s\S]*display: block;[\s\S]*overflow: hidden/);
  assert.match(css, /\.app\[data-mobile-prepared="true"\] \.stage \{[\s\S]*height: calc\(100% - 114px - env\(safe-area-inset-bottom, 0px\)\)/);
  assert.match(css, /\.app\[data-mobile-prepared="true"\] \.mushaf-scroll \{[\s\S]*calc\(68dvh - 115px\)/);
  assert.match(css, /\.app\[data-mobile-prepared="true"\] \.sidebar \{[\s\S]*position: fixed;[\s\S]*bottom: 0;[\s\S]*height: calc\(114px \+ env\(safe-area-inset-bottom, 0px\)\)[\s\S]*padding: 8px 8px calc\(12px \+ env\(safe-area-inset-bottom, 0px\)\)/);
  assert.match(css, /\.app\[data-mobile-prepared="true"\] \.prepared-sidebar \{[\s\S]*grid-template-rows: 44px 48px/);
  assert.match(css, /\.app\[data-mobile-prepared="true"\] \.prepared-sidebar-details \{[\s\S]*overflow: hidden/);
  assert.match(css, /\.app\[data-mobile-prepared="true"\] \.prepared-sidebar-actions \{[\s\S]*grid-template-columns: 84px 84px minmax\(0, 1fr\)/);
});

test("phone portrait reciter queue stays inside the PWA safe area", () => {
  const dialog = readFileSync(new URL("../src/components/StartDialog.tsx", import.meta.url), "utf8");
  const css = readFileSync(new URL("../src/styles/global.css", import.meta.url), "utf8");
  assert.match(dialog, /dialog-backdrop reciter-start-backdrop stage-\$\{stage\}/);
  assert.match(css, /\.reciter-start-backdrop\.stage-participant \{[\s\S]*padding: max\(8px, env\(safe-area-inset-top, 0px\)\) 8px\s+max\(8px, env\(safe-area-inset-bottom, 0px\)\)/);
  assert.match(css, /\.reciter-start-backdrop\.stage-participant \.reciter-start-dialog \{[\s\S]*height: 100%;[\s\S]*max-height: none/);
  assert.match(css, /\.reciter-start-backdrop\.stage-participant \.dialog-close \{[\s\S]*width: 44px;[\s\S]*height: 44px/);
  assert.match(css, /\.reciter-start-backdrop\.stage-participant \.next-reciter-main \{[\s\S]*min-height: 56px/);
  assert.match(css, /\.reciter-start-backdrop\.stage-participant \.reciter-selection-screen \.queue-scroll \{[\s\S]*margin-top: 6px/);
  assert.match(css, /\.reciter-start-backdrop\.stage-participant \.reciter-selection-screen \.queue-participant-button \{[\s\S]*min-height: 48px/);
});

test("phone portrait Finish is a bounded sheet rather than a full-screen panel", () => {
  const css = readFileSync(new URL("../src/styles/global.css", import.meta.url), "utf8");
  const mobileFinish = css.match(
    /\.app\[data-mobile-judge-deck="true"\] \.finish-dialog \{([\s\S]*?)\n  \}/,
  );
  assert.ok(mobileFinish, "expected the mobile Finish dialog override");
  assert.match(mobileFinish[1], /width: calc\(100vw - 16px\)/);
  assert.match(mobileFinish[1], /max-height: min\(78dvh, 680px\)/);
  assert.match(mobileFinish[1], /inset: max\(8px, env\(safe-area-inset-top, 0px\)\) 8px\s+max\(8px, env\(safe-area-inset-bottom, 0px\)\)/);
  assert.match(mobileFinish[1], /margin: auto/);
  assert.doesNotMatch(mobileFinish[1], /height: 100dvh/);
});

test("phone portrait reserves a stable return row while page navigation stays on the Mushaf", () => {
  const css = readFileSync(new URL("../src/styles/global.css", import.meta.url), "utf8");
  assert.match(
    css,
    /\.app\[data-mobile-judge-deck="true"\] \.mushaf-scroll\.is-single,[\s\S]*display: grid;[\s\S]*width: min\(377px, calc\(100vw - 16px\), calc\(68dvh - 152px\)\)[\s\S]*grid-template-rows: 44px auto/,
  );
  assert.match(
    css,
    /\.app\[data-mobile-judge-deck="true"\] \.mushaf-scroll\.is-single \.mushaf-shared-nav,[\s\S]*position: relative;[\s\S]*grid-template-columns: minmax\(0, 1fr\) auto minmax\(0, 1fr\)[\s\S]*grid-row: 1/,
  );
  assert.match(css, /\.mushaf-scroll\.is-single \.question-return-bubble,[\s\S]*min-height: 44px;[\s\S]*transform: none/);
  assert.match(
    css,
    /\.mushaf-scroll\.is-single \.mushaf-shared-nav > \.page-nav,[\s\S]*transform: translateY\(48px\)/,
  );
  assert.match(css, /\.mushaf-scroll\.is-single \.mushaf-composition,[\s\S]*grid-row: 2/);
});

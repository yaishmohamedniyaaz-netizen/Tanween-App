import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const readSource = (path) => readFileSync(new URL(path, import.meta.url), "utf8");

const appSource = readSource("../src/App.tsx");
const viewportSource = readSource("../src/components/MushafViewport.tsx");
const mushafSource = readSource("../src/components/Mushaf.tsx");
const scoreSource = readSource("../src/components/ScorePanel.tsx");
const mistakesSource = readSource("../src/components/MistakeLog.tsx");
const notesSource = readSource("../src/components/NotesBox.tsx");
const editorSource = readSource("../src/components/CompactTextEditor.tsx");
const mediaSource = readSource("../src/hooks/useMediaQuery.ts");
const styleSource = readSource("../src/styles/global.css");

test("the portrait deck is an explicit active-session prototype", () => {
  assert.match(appSource, /get\("mobileJudgeDeck"\) === "1"/);
  assert.match(appSource, /showMobileJudgeDeckPrototype[\s\S]*compactJudgeDeckViewport[\s\S]*view === "judge"[\s\S]*state\.sessionActive/);
  assert.match(appSource, /is-compact-judge-deck/);
  assert.match(mediaSource, /matchMedia\(query\)/);
  assert.match(mediaSource, /addEventListener\("change", update\)/);
});

test("the measured phone stage stays independent from one-page rendering", () => {
  assert.match(appSource, /forceStableStage=\{compactJudgeDeck\}/);
  assert.match(appSource, /forceCompactPages=\{compactJudgeDeck\}/);
  assert.match(appSource, /layout=\{compactJudgeDeck \? "full" : preferences\.mushafLayout\}/);
  assert.match(viewportSource, /forceStableStage \|\| stableStageMatches\(\)/);
  assert.match(viewportSource, /const compactPages = forceCompactPages \|\| !stableStage/);
  assert.match(viewportSource, /value=\{\{ renderScale, stableStage, compactPages \}\}/);
  assert.match(mushafSource, /const compact = useCompactMushafPages\(\)/);
});

test("compact scoring reuses the assignment and scoring contracts", () => {
  assert.match(scoreSource, /computeScores\(state\)/);
  assert.match(scoreSource, /state\.activeAssignment \?\?\s*makeAssignmentSnapshot/);
  assert.match(scoreSource, /data-category-count=\{categories\.length\}/);
  assert.match(scoreSource, /presentation\?: ScorePanelPresentation/);
  assert.match(scoreSource, /SET_IMPRESSION/);
  assert.match(scoreSource, /SET_IMPRESSION_NOTE/);
  assert.match(appSource, /inputMode=\{preferences\.aduRaaguInputMode\}/);
});

test("compact notes and mistakes are alternate views of the existing evidence", () => {
  assert.match(notesSource, /presentation\?: "rail" \| "compact"/);
  assert.match(notesSource, /dispatch\(\{ type: "SET_NOTES", notes \}\)/);
  assert.match(mistakesSource, /presentation\?: "rail" \| "compact"/);
  assert.match(mistakesSource, /openCompactMistake/);
  assert.match(mistakesSource, /setExpanded\(true\)/);
  assert.match(mistakesSource, /new CustomEvent\(JUMP_EVENT/);
  assert.doesNotMatch(mistakesSource, /localStorage|sessionStorage|indexedDB/);
});

test("compact text editing uses a labelled modal and returns focus", () => {
  assert.match(editorSource, /<dialog/);
  assert.match(editorSource, /aria-labelledby=\{titleId\}/);
  assert.match(editorSource, /aria-haspopup="dialog"/);
  assert.match(editorSource, /aria-expanded=\{open\}/);
  assert.match(editorSource, /onCancel=/);
  assert.match(editorSource, /triggerRef\.current\?\.focus\(\)/);
});

test("the judge deck is portrait-scoped, connected, and target-sized", () => {
  const prototypeStart = styleSource.indexOf("/* ---- Portrait judge-deck prototype ----");
  assert.notEqual(prototypeStart, -1);
  const prototype = styleSource.slice(prototypeStart);

  assert.match(prototype, /@media \(max-width: 600px\) and \(orientation: portrait\)/);
  assert.match(prototype, /\.workspace\.is-compact-judge-deck[\s\S]*grid-template-rows: minmax\(0, 1fr\) 252px/);
  assert.match(prototype, /padding: 8px 10px max\(4px, env\(safe-area-inset-bottom\)\)/);
  assert.match(prototype, /grid-template-areas:[\s\S]*"score mistakes"[\s\S]*"finish notes"/);
  assert.match(prototype, /\.sc-rows[\s\S]*repeat\(2, minmax\(0, 1fr\)\)/);
  assert.match(prototype, /\.app:has\(\.workspace\.is-compact-judge-deck\) \.app-header[\s\S]*48px 48px 48px/);
  assert.match(prototype, /\.page-nav-btn,[\s\S]*height: 48px/);
  assert.match(prototype, /\.log-row[\s\S]*min-height: 48px/);
  assert.match(prototype, /\.next-btn[\s\S]*min-height: 44px/);
  assert.match(prototype, /max-height: 760px[\s\S]*236px/);
});

test("rail-side preference mirrors the compact deck without affecting landscape", () => {
  const prototypeStart = styleSource.indexOf("/* ---- Portrait judge-deck prototype ----");
  const prototype = styleSource.slice(prototypeStart);
  assert.match(prototype, /\.workspace\.is-compact-judge-deck\.rail-right \.sidebar[\s\S]*"mistakes score"[\s\S]*"notes finish"/);
  assert.match(prototype, /\.workspace\.is-compact-judge-deck\.rail-right \.scorecard/);
  assert.doesNotMatch(prototype, /@media[^\{]*orientation: landscape/);
});

test("the listening prototype moves above the fixed judge deck", () => {
  assert.match(styleSource, /\.app:has\(\.workspace\.is-compact-judge-deck\) \.tilawa-tracker-dock[\s\S]*inset: 66px 8px auto/);
});

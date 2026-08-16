import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const coachSource = readFileSync(
  new URL("../src/components/MarkingCoachTip.tsx", import.meta.url),
  "utf8",
);
const appSource = readFileSync(
  new URL("../src/App.tsx", import.meta.url),
  "utf8",
);
const styleSource = readFileSync(
  new URL("../src/styles/global.css", import.meta.url),
  "utf8",
);
const moreActionsSource = readFileSync(
  new URL("../src/components/MoreActionsPopover.tsx", import.meta.url),
  "utf8",
);

test("first-use marking guidance overlays the measured viewport instead of taking stage space", () => {
  assert.match(appSource, /overlay=\{/);
  assert.match(appSource, /<MarkingCoachTip/);
  assert.doesNotMatch(appSource, /<HintBanner/);
  assert.match(styleSource, /\.marking-coach-tip\s*\{[\s\S]*?position: absolute/);
  assert.doesNotMatch(styleSource, /\.hint-banner\s*\{/);
});

test("the coach retires immediately after the first successful mark", () => {
  assert.match(coachSource, /const hasMarks = state\.mistakes\.length > 0/);
  assert.match(coachSource, /if \(!hasMarks\) return;[\s\S]*retireCoach\(\);[\s\S]*setHidden\(true\)/);
});

test("dismissal and a new reciter safely re-read the existing retirement key", () => {
  assert.match(coachSource, /tahqeeq\.hintSeen\.assignedRail\.v1/);
  assert.match(coachSource, /setHidden\(coachRetired\(\)\)/);
  assert.match(coachSource, /\[onForcedOpenChange, sessionId\]/);
  assert.match(coachSource, /function coachRetired\(\)[\s\S]*?catch[\s\S]*?return false/);
  assert.match(coachSource, /function retireCoach\(\)[\s\S]*?catch/);
});

test("the guide remains replayable from More controls", () => {
  assert.match(moreActionsSource, /Show marking guide/);
  assert.match(moreActionsSource, /runAction\(onShowMarkingGuide\)/);
  assert.match(appSource, /suppressed=\{moreControlsOpen\}/);
  assert.match(coachSource, /const visible = !suppressed/);
});

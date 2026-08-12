import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) =>
  readFileSync(new URL(path, import.meta.url), "utf8");

const appSource = read("../src/App.tsx");
const headerSource = read("../src/components/Header.tsx");
const idleSource = read("../src/components/CompetitionIdlePanel.tsx");
const setupSource = read("../src/components/CompetitionSetup.tsx");
const mushafSource = read("../src/components/Mushaf.tsx");

test("opening Tahqeeq remains a free Mushaf instead of auto-starting a session", () => {
  assert.match(appSource, /const \[startOpen, setStartOpen\] = useState\(false\)/);
  assert.match(appSource, /<CompetitionIdlePanel/);
  assert.match(appSource, /onStartReciter=\{\(\) => setStartOpen\(true\)\}/);
  assert.match(appSource, /state\.competition\.status === "live"/);
  assert.doesNotMatch(appSource, /!state\.sessionActive && <StartDialog/);
});

test("competition preparation is a dedicated task workspace", () => {
  for (const label of [
    "Competition details",
    "Divisions and portions",
    "Participants",
    "Judging panel",
    "Marks and deductions",
    "Question rules",
    "Review and start",
  ]) {
    assert.match(setupSource, new RegExp(label));
  }
  assert.match(setupSource, /Start competition/);
  assert.match(setupSource, /Close competition/);
  assert.match(headerSource, /Competition setup/);
});

test("the foundation exposes the agreed ayah rule without pretending the bank exists", () => {
  assert.match(setupSource, /Every official question starts at an ayah/);
  assert.match(setupSource, /first complete ayah ending on or after line/);
  assert.match(setupSource, /No AI, OCR or paid API is used/);
  assert.match(setupSource, /Coming next: reviewed questions, frozen sets and tiles/);
});

test("judging hit targets remain disabled outside an active reciter session", () => {
  assert.match(mushafSource, /judgingEnabled = state\.sessionActive/);
  assert.match(mushafSource, /\{judgingEnabled && <div className="hit-layer">/);
  assert.match(mushafSource, /onPointerDown=\{judgingEnabled \? onPointerDown : undefined\}/);
  assert.match(idleSource, /Official marks stay disabled/);
});

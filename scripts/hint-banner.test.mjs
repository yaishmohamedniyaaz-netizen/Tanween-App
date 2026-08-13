import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(
  new URL("../src/components/HintBanner.tsx", import.meta.url),
  "utf8",
);

const renderGuard = source.slice(
  source.indexOf("if (!state.sessionActive"),
  source.indexOf("return (", source.indexOf("if (!state.sessionActive")),
);

test("the banner does not disappear the moment a mistake is recorded", () => {
  // It sits above the Mushaf in normal flow, so unmounting it mid-session
  // pulled the page 68px up while the judge's hand was still on it. Anything
  // that puts the mistake count back into the render guard reintroduces that.
  assert.doesNotMatch(
    renderGuard,
    /mistakes/,
    "the render guard must not depend on the mistake count",
  );
});

test("the render guard only depends on the session and the retired flag", () => {
  assert.match(renderGuard, /!state\.sessionActive/);
  assert.match(renderGuard, /hidden/);
});

test("marking a letter still retires the tip, for the next reciter", () => {
  assert.match(
    source,
    /if \(hasMarks\) retireHint\(\);/,
    "the flag should be written as soon as the judge marks something",
  );
  assert.match(
    source,
    /const hasMarks = state\.mistakes\.length > 0;/,
    "the retire effect should key off the mistake count",
  );
});

test("a new reciter re-reads the flag so a retired tip stays gone", () => {
  assert.match(source, /setHidden\(hintRetired\(\)\);/);
  assert.match(source, /\}, \[sessionId\]\);/);
});

test("dismissing by hand still retires the tip permanently", () => {
  assert.match(source, /setHidden\(true\);\s*\n\s*retireHint\(\);/);
});

test("the retired flag survives storage being unavailable", () => {
  // Private browsing and locked-down devices throw on localStorage access;
  // the tip is not worth breaking the judging screen over.
  assert.match(source, /function hintRetired\(\)[\s\S]*?catch[\s\S]*?return false;/);
  assert.match(source, /function retireHint\(\)[\s\S]*?catch/);
});

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  SETTINGS_GUIDE_KEY,
  completeSettingsGuide,
  hasCompletedSettingsGuide,
} from "../src/lib/settingsGuide.ts";

function memoryStorage() {
  const values = new Map();
  return {
    getItem(key) {
      return values.has(key) ? values.get(key) : null;
    },
    setItem(key, value) {
      values.set(key, String(value));
    },
  };
}

test("the Settings guide uses isolated versioned completion state", () => {
  const storage = memoryStorage();
  assert.equal(SETTINGS_GUIDE_KEY, "tahqeeq:guide.settings.v1");
  assert.equal(hasCompletedSettingsGuide(storage), false);
  completeSettingsGuide(storage);
  assert.equal(hasCompletedSettingsGuide(storage), true);
  assert.equal(storage.getItem(SETTINGS_GUIDE_KEY), "complete");
});

test("unavailable browser storage never blocks Settings", () => {
  const brokenStorage = {
    getItem() {
      throw new Error("blocked");
    },
    setItem() {
      throw new Error("blocked");
    },
  };
  assert.equal(hasCompletedSettingsGuide(null), false);
  assert.equal(hasCompletedSettingsGuide(brokenStorage), false);
  assert.doesNotThrow(() => completeSettingsGuide(null));
  assert.doesNotThrow(() => completeSettingsGuide(brokenStorage));
});

test("the guide is a replayable two-step dialog, not permanent Settings copy", () => {
  const workspace = readFileSync(
    new URL("../src/components/SettingsWorkspace.tsx", import.meta.url),
    "utf8",
  );
  const guide = readFileSync(
    new URL("../src/components/SettingsGuide.tsx", import.meta.url),
    "utf8",
  );
  const preferences = readFileSync(
    new URL("../src/lib/devicePreferences.ts", import.meta.url),
    "utf8",
  );

  assert.match(workspace, /hasCompletedSettingsGuide/);
  assert.match(workspace, /aria-haspopup="dialog"/);
  assert.match(workspace, />\s*Help\s*</);
  assert.match(workspace, /<SettingsGuide onDismiss=\{dismissGuide\}/);
  assert.doesNotMatch(workspace, /On this device|Saved automatically|These choices affect this judge device only/);
  assert.match(guide, /showModal\(\)/);
  assert.match(guide, /onCancel=/);
  assert.match(guide, /Your view, saved here/);
  assert.match(guide, /Keep a backup of competition data/);
  assert.match(guide, /Skip/);
  assert.match(guide, /Back/);
  assert.match(guide, /Next/);
  assert.match(guide, /Done/);
  assert.doesNotMatch(preferences, /SETTINGS_GUIDE_KEY|guide\.settings/);
});

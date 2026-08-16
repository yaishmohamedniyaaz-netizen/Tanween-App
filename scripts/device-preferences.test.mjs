import assert from "node:assert/strict";
import test from "node:test";
import {
  DEFAULT_DEVICE_PREFERENCES,
  DEVICE_PREFERENCES_KEY,
  LEGACY_JUDGE_RAIL_SIDE_KEY,
  LEGACY_PAGE_LAYOUT_KEY,
  LEGACY_PAGE_ZOOM_KEY,
  LEGACY_THEME_KEY,
  normalizeDevicePreferences,
  readDevicePreferences,
  writeDevicePreferences,
} from "../src/lib/devicePreferences.ts";

function memoryStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem: (key) => values.has(key) ? values.get(key) : null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
    clear: () => values.clear(),
    key: (index) => [...values.keys()][index] ?? null,
    get length() { return values.size; },
  };
}

test("device preferences normalize invalid values without losing valid choices", () => {
  assert.deepEqual(normalizeDevicePreferences({
    theme: "dark",
    mushafLayout: "split",
    mushafZoom: 83,
    judgeRailSide: "right",
  }), {
    version: 1,
    theme: "dark",
    mushafLayout: "split",
    mushafZoom: 85,
    judgeRailSide: "right",
  });
  assert.deepEqual(normalizeDevicePreferences({ mushafZoom: 140 }), DEFAULT_DEVICE_PREFERENCES);
});

test("legacy device keys migrate into the versioned settings object", () => {
  const storage = memoryStorage({
    [LEGACY_THEME_KEY]: "dark",
    [LEGACY_PAGE_LAYOUT_KEY]: "split",
    [LEGACY_PAGE_ZOOM_KEY]: "75",
    [LEGACY_JUDGE_RAIL_SIDE_KEY]: "right",
  });
  assert.deepEqual(readDevicePreferences(storage), {
    version: 1,
    theme: "dark",
    mushafLayout: "split",
    mushafZoom: 75,
    judgeRailSide: "right",
  });
});

test("writing settings keeps the rollback-compatible legacy keys in sync", () => {
  const storage = memoryStorage();
  const written = writeDevicePreferences({
    version: 1,
    theme: "dark",
    mushafLayout: "split",
    mushafZoom: 65,
    judgeRailSide: "right",
  }, storage);
  assert.equal(JSON.parse(storage.getItem(DEVICE_PREFERENCES_KEY)).mushafZoom, 65);
  assert.equal(storage.getItem(LEGACY_THEME_KEY), "dark");
  assert.equal(storage.getItem(LEGACY_PAGE_LAYOUT_KEY), "split");
  assert.equal(storage.getItem(LEGACY_PAGE_ZOOM_KEY), "65");
  assert.equal(storage.getItem(LEGACY_JUDGE_RAIL_SIDE_KEY), "right");
  assert.equal(written.version, 1);
});

test("unavailable storage never prevents an in-memory preference change", () => {
  const storage = memoryStorage();
  storage.setItem = () => { throw new Error("quota"); };
  assert.doesNotThrow(() => writeDevicePreferences({
    version: 1,
    theme: "dark",
    mushafLayout: "full",
    mushafZoom: 90,
    judgeRailSide: "left",
  }, storage));
});

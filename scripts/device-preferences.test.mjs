import assert from "node:assert/strict";
import test from "node:test";
import {
  DEFAULT_DEVICE_PREFERENCES,
  DEVICE_PREFERENCES_KEY,
  LEGACY_JUDGE_RAIL_SIDE_KEY,
  LEGACY_PAGE_LAYOUT_KEY,
  LEGACY_PAGE_ZOOM_KEY,
  LEGACY_THEME_KEY,
  MUSHAF_ZOOM_DEFAULT,
  MUSHAF_ZOOM_FIT,
  MUSHAF_ZOOM_MAX,
  MUSHAF_ZOOM_MIN,
  MUSHAF_ZOOM_STEP,
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
    mushafLayout: "spread",
    mushafZoom: 83,
    judgeRailSide: "right",
    questionFocusEnabled: false,
  }), {
    version: 1,
    theme: "dark",
    mushafLayout: "spread",
    mushafZoom: 85,
    judgeRailSide: "right",
    questionFocusEnabled: false,
  });
  assert.equal(normalizeDevicePreferences({ mushafZoom: 140 }).mushafZoom, 140);
  assert.equal(normalizeDevicePreferences({ mushafZoom: 61 }).mushafZoom, MUSHAF_ZOOM_MIN);
  assert.equal(normalizeDevicePreferences({ mushafZoom: 190 }).mushafZoom, MUSHAF_ZOOM_MAX);
  assert.equal(normalizeDevicePreferences({ mushafZoom: "invalid" }).mushafZoom, MUSHAF_ZOOM_DEFAULT);
  assert.equal(normalizeDevicePreferences({ mushafZoom: null }).mushafZoom, MUSHAF_ZOOM_DEFAULT);
  assert.equal(normalizeDevicePreferences({}).questionFocusEnabled, true);
  assert.deepEqual(
    [MUSHAF_ZOOM_MIN, MUSHAF_ZOOM_FIT, MUSHAF_ZOOM_DEFAULT, MUSHAF_ZOOM_MAX, MUSHAF_ZOOM_STEP],
    [75, 100, 100, 150, 5],
  );
});

test("Fit is the fresh-device default and saved zoom choices remain explicit", () => {
  const freshStorage = memoryStorage();
  assert.equal(readDevicePreferences(freshStorage).mushafZoom, 100);
  const fitStorage = memoryStorage({
    [DEVICE_PREFERENCES_KEY]: JSON.stringify({
      ...DEFAULT_DEVICE_PREFERENCES,
      mushafZoom: 100,
    }),
  });
  assert.equal(readDevicePreferences(fitStorage).mushafZoom, 100);
  const enlargedStorage = memoryStorage({
    [DEVICE_PREFERENCES_KEY]: JSON.stringify({
      ...DEFAULT_DEVICE_PREFERENCES,
      mushafZoom: 110,
    }),
  });
  assert.equal(readDevicePreferences(enlargedStorage).mushafZoom, 110);
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
    mushafLayout: "spread",
    mushafZoom: 75,
    judgeRailSide: "right",
    questionFocusEnabled: true,
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
    questionFocusEnabled: false,
  }, storage);
  assert.equal(JSON.parse(storage.getItem(DEVICE_PREFERENCES_KEY)).mushafZoom, 75);
  assert.equal(storage.getItem(LEGACY_THEME_KEY), "dark");
  assert.equal(storage.getItem(LEGACY_PAGE_LAYOUT_KEY), "spread");
  assert.equal(storage.getItem(LEGACY_PAGE_ZOOM_KEY), "75");
  assert.equal(storage.getItem(LEGACY_JUDGE_RAIL_SIDE_KEY), "right");
  assert.equal(JSON.parse(storage.getItem(DEVICE_PREFERENCES_KEY)).questionFocusEnabled, false);
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
    questionFocusEnabled: true,
  }, storage));
});

import assert from "node:assert/strict";
import test from "node:test";
import {
  DEFAULT_DEVICE_PREFERENCES,
  DEVICE_PREFERENCES_KEY,
  LEGACY_DEVICE_PREFERENCES_KEY,
  LEGACY_DEVICE_PREFERENCES_V2_KEY,
  LEGACY_DEVICE_PREFERENCES_V3_KEY,
  LEGACY_DEVICE_PREFERENCES_V4_KEY,
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
import {
  DEFAULT_MARKING_PREFERENCES,
  afterMark,
  categoryForKey,
  normalizeMarkingPreferences,
  pressCriterion,
  releaseCriterion,
  resolvedBarSide,
} from "../src/lib/markingPreferences.ts";

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

test("tashkeel is opt-in and survives a device preference round trip", () => {
  assert.equal(normalizeDevicePreferences({}).selectorTashkeel, false);
  assert.equal(normalizeDevicePreferences({ selectorTashkeel: "true" }).selectorTashkeel, false);
  const storage = memoryStorage();
  writeDevicePreferences({ ...DEFAULT_DEVICE_PREFERENCES, selectorTashkeel: true, theme: "dark" }, storage);
  assert.equal(readDevicePreferences(storage).selectorTashkeel, true);
  assert.equal(readDevicePreferences(storage).theme, "dark");
  writeDevicePreferences({ ...readDevicePreferences(storage), selectorTashkeel: false }, storage);
  assert.equal(readDevicePreferences(storage).selectorTashkeel, false);
});

test("device preferences normalize invalid values without losing valid choices", () => {
  assert.deepEqual(normalizeDevicePreferences({
    theme: "dark",
    mushafLayout: "spread",
    mushafZoom: 83,
    judgeRailSide: "right",
    questionFocusMode: "shade-fade",
    aduRaaguInputMode: "stepper",
    lastMarkStrip: "on",
    scoreChipTint: "earned",
  }), {
    version: 5,
    theme: "dark",
    mushafLayout: "spread",
    mushafZoom: 100,
    judgeRailSide: "right",
    questionFocusMode: "shade-fade",
    aduRaaguInputMode: "stepper",
    lastMarkStrip: "on",
    scoreChipTint: "earned",
    selectorTashkeel: false,
    slimScorePanel: false,
    marking: DEFAULT_MARKING_PREFERENCES,
  });
  assert.equal(normalizeDevicePreferences({ mushafZoom: 140 }).mushafZoom, 140);
  assert.equal(normalizeDevicePreferences({ mushafZoom: 61 }).mushafZoom, MUSHAF_ZOOM_MIN);
  assert.equal(normalizeDevicePreferences({ mushafZoom: 190 }).mushafZoom, MUSHAF_ZOOM_MAX);
  assert.equal(normalizeDevicePreferences({ mushafZoom: "invalid" }).mushafZoom, MUSHAF_ZOOM_DEFAULT);
  assert.equal(normalizeDevicePreferences({ mushafZoom: null }).mushafZoom, MUSHAF_ZOOM_DEFAULT);
  assert.equal(normalizeDevicePreferences({}).questionFocusMode, "fade");
  assert.equal(normalizeDevicePreferences({}).aduRaaguInputMode, "ruler");
  assert.equal(normalizeDevicePreferences({}).lastMarkStrip, "on");
  assert.equal(normalizeDevicePreferences({}).scoreChipTint, "earned");
  assert.equal(
    normalizeDevicePreferences({ aduRaaguInputMode: "invalid" }).aduRaaguInputMode,
    "ruler",
  );
  assert.equal(
    normalizeDevicePreferences({ version: 3, questionFocusMode: "shade" }).questionFocusMode,
    "shade",
  );
  assert.equal(
    normalizeDevicePreferences({ questionFocusEnabled: false }).questionFocusMode,
    "off",
  );
  assert.equal(
    normalizeDevicePreferences({ questionFocusEnabled: true }).questionFocusMode,
    "fade",
  );
  assert.deepEqual(
    [MUSHAF_ZOOM_MIN, MUSHAF_ZOOM_FIT, MUSHAF_ZOOM_DEFAULT, MUSHAF_ZOOM_MAX, MUSHAF_ZOOM_STEP],
    [100, 100, 100, 150, 5],
  );
});

test("Fit and Two pages are fresh-device defaults while saved choices remain explicit", () => {
  const freshStorage = memoryStorage();
  assert.equal(readDevicePreferences(freshStorage).mushafZoom, 100);
  assert.equal(readDevicePreferences(freshStorage).mushafLayout, "spread");
  assert.equal(readDevicePreferences(freshStorage).aduRaaguInputMode, "ruler");
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
    version: 5,
    theme: "dark",
    mushafLayout: "spread",
    mushafZoom: 100,
    judgeRailSide: "right",
    questionFocusMode: "fade",
    aduRaaguInputMode: "ruler",
    lastMarkStrip: "on",
    scoreChipTint: "earned",
    selectorTashkeel: false,
    slimScorePanel: false,
    marking: DEFAULT_MARKING_PREFERENCES,
  });
});

test("the version-one focus boolean migrates without losing other preferences", () => {
  const storage = memoryStorage({
    [LEGACY_DEVICE_PREFERENCES_KEY]: JSON.stringify({
      version: 1,
      theme: "dark",
      mushafLayout: "spread",
      mushafZoom: 115,
      judgeRailSide: "right",
      questionFocusEnabled: false,
    }),
  });
  assert.deepEqual(readDevicePreferences(storage), {
    version: 5,
    theme: "dark",
    mushafLayout: "spread",
    mushafZoom: 115,
    judgeRailSide: "right",
    questionFocusMode: "off",
    aduRaaguInputMode: "ruler",
    lastMarkStrip: "on",
    scoreChipTint: "earned",
    selectorTashkeel: false,
    slimScorePanel: false,
    marking: DEFAULT_MARKING_PREFERENCES,
  });
});

test("the version-two combined shade migrates to Shade + fade", () => {
  const storage = memoryStorage({
    [LEGACY_DEVICE_PREFERENCES_V2_KEY]: JSON.stringify({
      version: 2,
      theme: "light",
      mushafLayout: "full",
      mushafZoom: 100,
      judgeRailSide: "left",
      questionFocusMode: "shade",
    }),
  });
  assert.equal(readDevicePreferences(storage).questionFocusMode, "shade-fade");
});

test("the version-three settings migrate with the horizontal input default", () => {
  const storage = memoryStorage({
    [LEGACY_DEVICE_PREFERENCES_V3_KEY]: JSON.stringify({
      version: 3,
      theme: "dark",
      mushafLayout: "full",
      mushafZoom: 125,
      judgeRailSide: "right",
      questionFocusMode: "shade",
    }),
  });
  assert.deepEqual(readDevicePreferences(storage), {
    version: 5,
    theme: "dark",
    mushafLayout: "full",
    mushafZoom: 125,
    judgeRailSide: "right",
    questionFocusMode: "shade",
    aduRaaguInputMode: "ruler",
    lastMarkStrip: "on",
    scoreChipTint: "earned",
    selectorTashkeel: false,
    slimScorePanel: false,
    marking: DEFAULT_MARKING_PREFERENCES,
  });
});

test("the retired vertical preference migrates to explicit step buttons", () => {
  const storage = memoryStorage({
    [LEGACY_DEVICE_PREFERENCES_V4_KEY]: JSON.stringify({
      version: 4,
      theme: "dark",
      mushafLayout: "spread",
      mushafZoom: 110,
      judgeRailSide: "left",
      questionFocusMode: "fade",
      aduRaaguInputMode: "wheel",
    }),
  });
  const migrated = readDevicePreferences(storage);
  assert.equal(migrated.version, 5);
  assert.equal(migrated.aduRaaguInputMode, "stepper");
});

test("writing settings keeps the rollback-compatible legacy keys in sync", () => {
  const storage = memoryStorage();
  const written = writeDevicePreferences({
    version: 5,
    theme: "dark",
    mushafLayout: "split",
    mushafZoom: 65,
    judgeRailSide: "right",
    questionFocusMode: "shade-fade",
    aduRaaguInputMode: "stepper",
  }, storage);
  const current = JSON.parse(storage.getItem(DEVICE_PREFERENCES_KEY));
  const rollbackV4 = JSON.parse(storage.getItem(LEGACY_DEVICE_PREFERENCES_V4_KEY));
  const rollbackV3 = JSON.parse(storage.getItem(LEGACY_DEVICE_PREFERENCES_V3_KEY));
  const rollbackV2 = JSON.parse(storage.getItem(LEGACY_DEVICE_PREFERENCES_V2_KEY));
  const rollback = JSON.parse(storage.getItem(LEGACY_DEVICE_PREFERENCES_KEY));
  assert.equal(current.mushafZoom, 100);
  assert.equal(current.questionFocusMode, "shade-fade");
  assert.equal(current.aduRaaguInputMode, "stepper");
  assert.equal(current.lastMarkStrip, "on");
  assert.equal(current.scoreChipTint, "earned");
  assert.equal(rollbackV4.version, 4);
  assert.equal(rollbackV4.aduRaaguInputMode, "wheel");
  assert.equal(rollbackV3.version, 3);
  assert.equal(rollbackV3.aduRaaguInputMode, undefined);
  assert.equal(rollbackV2.questionFocusMode, "shade");
  assert.equal(rollback.questionFocusEnabled, true);
  assert.equal(storage.getItem(LEGACY_THEME_KEY), "dark");
  assert.equal(storage.getItem(LEGACY_PAGE_LAYOUT_KEY), "spread");
  assert.equal(storage.getItem(LEGACY_PAGE_ZOOM_KEY), "100");
  assert.equal(storage.getItem(LEGACY_JUDGE_RAIL_SIDE_KEY), "right");
  assert.equal(written.version, 5);

  writeDevicePreferences({ ...written, questionFocusMode: "off" }, storage);
  assert.equal(
    JSON.parse(storage.getItem(LEGACY_DEVICE_PREFERENCES_KEY)).questionFocusEnabled,
    false,
  );
});

test("unavailable storage never prevents an in-memory preference change", () => {
  const storage = memoryStorage();
  storage.setItem = () => { throw new Error("quota"); };
  assert.doesNotThrow(() => writeDevicePreferences({
    version: 5,
    theme: "dark",
    mushafLayout: "full",
    mushafZoom: 90,
    judgeRailSide: "left",
    questionFocusMode: "fade",
    aduRaaguInputMode: "stepper",
  }, storage));
});
test("slim score preference defaults off and preserves other device settings", () => {
  assert.equal(normalizeDevicePreferences({}).slimScorePanel, false);
  assert.equal(normalizeDevicePreferences({ slimScorePanel: "true" }).slimScorePanel, false);
  const storage = memoryStorage();
  writeDevicePreferences({ ...DEFAULT_DEVICE_PREFERENCES, slimScorePanel: true, selectorTashkeel: true, theme: "dark" }, storage);
  const restored = readDevicePreferences(storage);
  assert.equal(restored.slimScorePanel, true);
  assert.equal(restored.selectorTashkeel, true);
  assert.equal(restored.theme, "dark");
});

test("marking preferences: recommended defaults, invalid values fall back, valid ones survive", () => {
  assert.deepEqual(DEFAULT_DEVICE_PREFERENCES.marking, {
    order: "both", barTap: "next", holdToKeep: true, keys: true,
    penDoubleTap: false, penOnly: false, barSide: "auto", barSize: "standard", trayCriteria: false,
  });
  assert.deepEqual(normalizeMarkingPreferences({ order: "sideways", keys: "yes", penOnly: true, barSide: "right" }), {
    ...DEFAULT_MARKING_PREFERENCES, penOnly: true, barSide: "right",
  });
  const storage = memoryStorage();
  writeDevicePreferences({ ...DEFAULT_DEVICE_PREFERENCES, marking: { ...DEFAULT_MARKING_PREFERENCES, order: "criterion-first" } }, storage);
  assert.equal(readDevicePreferences(storage).marking.order, "criterion-first");
  assert.equal(resolvedBarSide("auto", "left"), "right");
  assert.equal(resolvedBarSide("auto", "right"), "left");
  assert.equal(resolvedBarSide("left", "left"), "left");
});

test("criterion bar: tap arms the next mark, tap again turns it off, hold keeps it only while held", () => {
  const prefs = { holdToKeep: true, barTap: "next" };
  // Tap: down + up without a mark arms the next mark.
  let { next, before } = pressCriterion(null, "jali", prefs);
  let state = releaseCriterion(next, before, "jali", prefs);
  assert.deepEqual(state, { category: "jali", held: false, used: false, sticky: false });
  state = afterMark(state, "jali");
  assert.equal(state, null, "next-mark criterion turns off after one mark");
  // Tap the armed criterion again: off.
  state = { category: "khafi", held: false, used: false, sticky: false };
  ({ next, before } = pressCriterion(state, "khafi", prefs));
  assert.equal(releaseCriterion(next, before, "khafi", prefs), null);
  // Tap another criterion: replaces.
  ({ next, before } = pressCriterion(state, "jali", prefs));
  assert.equal(releaseCriterion(next, before, "jali", prefs).category, "jali");
  // Hold while marking twice: stays on during the hold, off at release.
  ({ next, before } = pressCriterion(null, "fasaha", prefs));
  state = afterMark(afterMark(next, "fasaha"), "fasaha");
  assert.deepEqual(state, { category: "fasaha", held: true, used: true, sticky: false });
  assert.equal(releaseCriterion(state, before, "fasaha", prefs), null);
  // Sticky: stays after marks until tapped again.
  const sticky = { holdToKeep: true, barTap: "sticky" };
  ({ next, before } = pressCriterion(null, "jali", sticky));
  state = releaseCriterion(next, before, "jali", sticky);
  assert.equal(afterMark(state, "jali"), state);
  // Hold disabled: the press does nothing until release.
  const noHold = { holdToKeep: false, barTap: "next" };
  ({ next, before } = pressCriterion(null, "jali", noHold));
  assert.equal(next, null);
  assert.equal(releaseCriterion(next, before, "jali", noHold).category, "jali");
  // A mark with another criterion leaves the bar choice alone.
  state = { category: "jali", held: false, used: false, sticky: false };
  assert.equal(afterMark(state, "khafi"), state);
});

test("keys 1 · 2 · 3 follow the bar's visible order", () => {
  assert.equal(categoryForKey("1", ["jali", "khafi", "fasaha"]), "jali");
  assert.equal(categoryForKey("3", ["jali", "khafi", "fasaha"]), "fasaha");
  assert.equal(categoryForKey("2", ["khafi"]), null);
  assert.equal(categoryForKey("j", ["jali"]), null);
});

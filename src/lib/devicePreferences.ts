export type AppTheme = "light" | "dark";
export type MushafLayout = "full" | "spread";
export type JudgeRailSide = "left" | "right";
export type QuestionFocusMode = "off" | "fade" | "shade" | "shade-fade";
export type AduRaaguInputMode = "ruler" | "wheel";

export interface DevicePreferencesV4 {
  version: 4;
  theme: AppTheme;
  mushafLayout: MushafLayout;
  mushafZoom: number;
  judgeRailSide: JudgeRailSide;
  questionFocusMode: QuestionFocusMode;
  aduRaaguInputMode: AduRaaguInputMode;
}

export const DEVICE_PREFERENCES_KEY = "tahqeeq:devicePreferences.v4";
export const LEGACY_DEVICE_PREFERENCES_V3_KEY = "tahqeeq:devicePreferences.v3";
export const LEGACY_DEVICE_PREFERENCES_V2_KEY = "tahqeeq:devicePreferences.v2";
export const LEGACY_DEVICE_PREFERENCES_KEY = "tahqeeq:devicePreferences.v1";
export const LEGACY_THEME_KEY = "tahqeeq.theme";
export const LEGACY_PAGE_ZOOM_KEY = "tahqeeq:pageZoom.v2";
export const LEGACY_PAGE_LAYOUT_KEY = "tahqeeq:pageLayout";
export const LEGACY_JUDGE_RAIL_SIDE_KEY = "tahqeeq:judgeRailSide";

export const MUSHAF_ZOOM_FIT = 100;
export const MUSHAF_ZOOM_MIN = MUSHAF_ZOOM_FIT;
export const MUSHAF_ZOOM_DEFAULT = MUSHAF_ZOOM_FIT;
export const MUSHAF_ZOOM_MAX = 150;
export const MUSHAF_ZOOM_STEP = 5;

export const DEFAULT_DEVICE_PREFERENCES: DevicePreferencesV4 = {
  version: 4,
  theme: "light",
  mushafLayout: "spread",
  mushafZoom: MUSHAF_ZOOM_DEFAULT,
  judgeRailSide: "left",
  questionFocusMode: "fade",
  aduRaaguInputMode: "ruler",
};

export function normalizeMushafZoom(
  value: unknown,
  fallback = MUSHAF_ZOOM_DEFAULT,
): number {
  if (value === null || value === undefined || value === "") return fallback;
  const numericValue = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numericValue)) return fallback;
  const stepped = Math.round(numericValue / MUSHAF_ZOOM_STEP) * MUSHAF_ZOOM_STEP;
  return Math.min(MUSHAF_ZOOM_MAX, Math.max(MUSHAF_ZOOM_MIN, stepped));
}

function storageOrNull(storage?: Storage | null): Storage | null {
  if (storage) return storage;
  if (typeof localStorage === "undefined") return null;
  return localStorage;
}

export function normalizeDevicePreferences(
  value: unknown,
  fallback: DevicePreferencesV4 = DEFAULT_DEVICE_PREFERENCES,
): DevicePreferencesV4 {
  const candidate = value && typeof value === "object"
    ? value as Record<string, unknown>
    : {};
  const mushafLayout = candidate.mushafLayout === "split"
    ? "spread"
    : candidate.mushafLayout;
  const rawQuestionFocusMode = candidate.questionFocusMode;
  const questionFocusMode = rawQuestionFocusMode === "shade" && candidate.version === 2
    ? "shade-fade"
    : rawQuestionFocusMode === "off" ||
        rawQuestionFocusMode === "fade" ||
        rawQuestionFocusMode === "shade" ||
        rawQuestionFocusMode === "shade-fade"
      ? rawQuestionFocusMode
    : typeof candidate.questionFocusEnabled === "boolean"
      ? candidate.questionFocusEnabled ? "fade" : "off"
      : fallback.questionFocusMode;
  return {
    version: 4,
    theme: candidate.theme === "dark" || candidate.theme === "light"
      ? candidate.theme
      : fallback.theme,
    mushafLayout: mushafLayout === "spread" || mushafLayout === "full"
      ? mushafLayout
      : fallback.mushafLayout,
    mushafZoom: normalizeMushafZoom(
      candidate.mushafZoom,
      normalizeMushafZoom(fallback.mushafZoom),
    ),
    judgeRailSide: candidate.judgeRailSide === "right" || candidate.judgeRailSide === "left"
      ? candidate.judgeRailSide
      : fallback.judgeRailSide,
    questionFocusMode,
    aduRaaguInputMode: candidate.aduRaaguInputMode === "wheel" ||
        candidate.aduRaaguInputMode === "ruler"
      ? candidate.aduRaaguInputMode
      : fallback.aduRaaguInputMode,
  };
}

function legacyPreferences(storage: Storage): DevicePreferencesV4 {
  const legacyZoom = storage.getItem(LEGACY_PAGE_ZOOM_KEY);
  return normalizeDevicePreferences({
    theme: storage.getItem(LEGACY_THEME_KEY),
    mushafLayout: storage.getItem(LEGACY_PAGE_LAYOUT_KEY),
    mushafZoom: legacyZoom === null ? undefined : Number(legacyZoom),
    judgeRailSide: storage.getItem(LEGACY_JUDGE_RAIL_SIDE_KEY),
  });
}

function readStoredPreferences(
  storage: Storage,
  key: string,
  fallback: DevicePreferencesV4,
): DevicePreferencesV4 {
  try {
    const raw = storage.getItem(key);
    return raw ? normalizeDevicePreferences(JSON.parse(raw), fallback) : fallback;
  } catch {
    return fallback;
  }
}

export function readDevicePreferences(storage?: Storage | null): DevicePreferencesV4 {
  const target = storageOrNull(storage);
  if (!target) return { ...DEFAULT_DEVICE_PREFERENCES };
  const legacy = legacyPreferences(target);
  const migratedV1 = readStoredPreferences(
    target,
    LEGACY_DEVICE_PREFERENCES_KEY,
    legacy,
  );
  const migratedV2 = readStoredPreferences(
    target,
    LEGACY_DEVICE_PREFERENCES_V2_KEY,
    migratedV1,
  );
  const migratedV3 = readStoredPreferences(
    target,
    LEGACY_DEVICE_PREFERENCES_V3_KEY,
    migratedV2,
  );
  return readStoredPreferences(target, DEVICE_PREFERENCES_KEY, migratedV3);
}

export function writeDevicePreferences(
  preferences: DevicePreferencesV4,
  storage?: Storage | null,
): DevicePreferencesV4 {
  const normalized = normalizeDevicePreferences(preferences);
  const target = storageOrNull(storage);
  if (!target) return normalized;
  try {
    target.setItem(DEVICE_PREFERENCES_KEY, JSON.stringify(normalized));
    // Keep the previous settings object and individual keys synchronized so a
    // rollback build continues to honor the closest equivalent choices.
    target.setItem(LEGACY_DEVICE_PREFERENCES_V3_KEY, JSON.stringify({
      version: 3,
      theme: normalized.theme,
      mushafLayout: normalized.mushafLayout,
      mushafZoom: normalized.mushafZoom,
      judgeRailSide: normalized.judgeRailSide,
      questionFocusMode: normalized.questionFocusMode,
    }));
    target.setItem(LEGACY_DEVICE_PREFERENCES_V2_KEY, JSON.stringify({
      version: 2,
      theme: normalized.theme,
      mushafLayout: normalized.mushafLayout,
      mushafZoom: normalized.mushafZoom,
      judgeRailSide: normalized.judgeRailSide,
      questionFocusMode: normalized.questionFocusMode === "shade-fade"
        ? "shade"
        : normalized.questionFocusMode,
    }));
    target.setItem(LEGACY_DEVICE_PREFERENCES_KEY, JSON.stringify({
      version: 1,
      theme: normalized.theme,
      mushafLayout: normalized.mushafLayout,
      mushafZoom: normalized.mushafZoom,
      judgeRailSide: normalized.judgeRailSide,
      questionFocusEnabled: normalized.questionFocusMode !== "off",
    }));
    target.setItem(LEGACY_THEME_KEY, normalized.theme);
    target.setItem(LEGACY_PAGE_LAYOUT_KEY, normalized.mushafLayout);
    target.setItem(LEGACY_PAGE_ZOOM_KEY, String(normalized.mushafZoom));
    target.setItem(LEGACY_JUDGE_RAIL_SIDE_KEY, normalized.judgeRailSide);
  } catch {
    // Preference persistence must never take down judging when storage is full
    // or unavailable. The in-memory choice remains active for this visit.
  }
  return normalized;
}

export function applyDeviceTheme(theme: AppTheme): void {
  if (typeof document === "undefined") return;
  document.documentElement.setAttribute("data-theme", theme);
  document
    .querySelector<HTMLMetaElement>('meta[name="theme-color"]')
    ?.setAttribute("content", theme === "dark" ? "#131316" : "#f2f1ee");
}

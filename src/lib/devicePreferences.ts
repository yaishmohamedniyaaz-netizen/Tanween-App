export type AppTheme = "light" | "dark";
export type MushafLayout = "full" | "spread";
export type JudgeRailSide = "left" | "right";

export interface DevicePreferencesV1 {
  version: 1;
  theme: AppTheme;
  mushafLayout: MushafLayout;
  mushafZoom: number;
  judgeRailSide: JudgeRailSide;
}

export const DEVICE_PREFERENCES_KEY = "tahqeeq:devicePreferences.v1";
export const LEGACY_THEME_KEY = "tahqeeq.theme";
export const LEGACY_PAGE_ZOOM_KEY = "tahqeeq:pageZoom.v2";
export const LEGACY_PAGE_LAYOUT_KEY = "tahqeeq:pageLayout";
export const LEGACY_JUDGE_RAIL_SIDE_KEY = "tahqeeq:judgeRailSide";

export const MUSHAF_ZOOM_MIN = 75;
export const MUSHAF_ZOOM_FIT = 100;
export const MUSHAF_ZOOM_DEFAULT = MUSHAF_ZOOM_FIT;
export const MUSHAF_ZOOM_MAX = 150;
export const MUSHAF_ZOOM_STEP = 5;

export const DEFAULT_DEVICE_PREFERENCES: DevicePreferencesV1 = {
  version: 1,
  theme: "light",
  mushafLayout: "full",
  mushafZoom: MUSHAF_ZOOM_DEFAULT,
  judgeRailSide: "left",
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
  fallback: DevicePreferencesV1 = DEFAULT_DEVICE_PREFERENCES,
): DevicePreferencesV1 {
  const candidate = value && typeof value === "object"
    ? value as Partial<Omit<DevicePreferencesV1, "mushafLayout">> & { mushafLayout?: unknown }
    : {};
  const mushafLayout = candidate.mushafLayout === "split"
    ? "spread"
    : candidate.mushafLayout;
  return {
    version: 1,
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
  };
}

function legacyPreferences(storage: Storage): DevicePreferencesV1 {
  const legacyZoom = storage.getItem(LEGACY_PAGE_ZOOM_KEY);
  return normalizeDevicePreferences({
    theme: storage.getItem(LEGACY_THEME_KEY),
    mushafLayout: storage.getItem(LEGACY_PAGE_LAYOUT_KEY),
    mushafZoom: legacyZoom === null ? undefined : Number(legacyZoom),
    judgeRailSide: storage.getItem(LEGACY_JUDGE_RAIL_SIDE_KEY),
  });
}

export function readDevicePreferences(storage?: Storage | null): DevicePreferencesV1 {
  const target = storageOrNull(storage);
  if (!target) return { ...DEFAULT_DEVICE_PREFERENCES };
  const legacy = legacyPreferences(target);
  try {
    const raw = target.getItem(DEVICE_PREFERENCES_KEY);
    if (!raw) return legacy;
    return normalizeDevicePreferences(JSON.parse(raw), legacy);
  } catch {
    return legacy;
  }
}

export function writeDevicePreferences(
  preferences: DevicePreferencesV1,
  storage?: Storage | null,
): DevicePreferencesV1 {
  const normalized = normalizeDevicePreferences(preferences);
  const target = storageOrNull(storage);
  if (!target) return normalized;
  try {
    target.setItem(DEVICE_PREFERENCES_KEY, JSON.stringify(normalized));
    // Mirror existing keys during the V1 migration so the pre-React theme script
    // and a rollback build continue to honor the same choices.
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
}

export type AppTheme = "light" | "dark";
export type MushafLayout = "full" | "split";
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

export const DEFAULT_DEVICE_PREFERENCES: DevicePreferencesV1 = {
  version: 1,
  theme: "light",
  mushafLayout: "full",
  mushafZoom: 100,
  judgeRailSide: "left",
};

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
    ? value as Partial<DevicePreferencesV1>
    : {};
  const zoom = Number(candidate.mushafZoom);
  return {
    version: 1,
    theme: candidate.theme === "dark" || candidate.theme === "light"
      ? candidate.theme
      : fallback.theme,
    mushafLayout: candidate.mushafLayout === "split" || candidate.mushafLayout === "full"
      ? candidate.mushafLayout
      : fallback.mushafLayout,
    mushafZoom: Number.isFinite(zoom) && zoom >= 45 && zoom <= 100
      ? Math.round(zoom / 5) * 5
      : fallback.mushafZoom,
    judgeRailSide: candidate.judgeRailSide === "right" || candidate.judgeRailSide === "left"
      ? candidate.judgeRailSide
      : fallback.judgeRailSide,
  };
}

function legacyPreferences(storage: Storage): DevicePreferencesV1 {
  return normalizeDevicePreferences({
    theme: storage.getItem(LEGACY_THEME_KEY),
    mushafLayout: storage.getItem(LEGACY_PAGE_LAYOUT_KEY),
    mushafZoom: Number(storage.getItem(LEGACY_PAGE_ZOOM_KEY)),
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

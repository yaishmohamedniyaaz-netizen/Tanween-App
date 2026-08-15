export const SETTINGS_GUIDE_KEY = "tahqeeq:guide.settings.v1";

const COMPLETE_VALUE = "complete";

function storageOrNull(storage?: Storage | null): Storage | null {
  if (storage !== undefined) return storage;
  try {
    return typeof localStorage === "undefined" ? null : localStorage;
  } catch {
    return null;
  }
}

export function hasCompletedSettingsGuide(storage?: Storage | null): boolean {
  const target = storageOrNull(storage);
  if (!target) return false;
  try {
    return target.getItem(SETTINGS_GUIDE_KEY) === COMPLETE_VALUE;
  } catch {
    return false;
  }
}

export function completeSettingsGuide(storage?: Storage | null): void {
  const target = storageOrNull(storage);
  if (!target) return;
  try {
    target.setItem(SETTINGS_GUIDE_KEY, COMPLETE_VALUE);
  } catch {
    // The guide must never block Settings when browser storage is unavailable.
  }
}

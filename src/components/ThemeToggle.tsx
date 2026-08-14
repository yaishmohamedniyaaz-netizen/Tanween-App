import { Icon } from "./Icon";

import type { AppTheme } from "../lib/devicePreferences";

export function ThemeToggle({
  theme,
  onChange,
}: {
  theme: AppTheme;
  onChange: (theme: AppTheme) => void;
}) {

  const next: AppTheme = theme === "dark" ? "light" : "dark";
  return (
    <button
      type="button"
      className="btn-icon"
      aria-label={`Switch to ${next} mode`}
      title={`Switch to ${next} mode`}
      onClick={() => onChange(next)}
    >
      <Icon name={theme === "dark" ? "sun" : "moon"} size={17} />
    </button>
  );
}

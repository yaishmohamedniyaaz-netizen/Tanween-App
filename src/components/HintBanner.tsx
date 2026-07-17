import { useState } from "react";
import { useJudging } from "../state/store";
import { Icon } from "./Icon";

const KEY = "tahqeeq.hintSeen";

/** A subtle, dismissible coach tip for the press-hold-drag-release gesture.
 *  Shows only on a clean slate (no marks yet) until dismissed once. */
export function HintBanner() {
  const { state } = useJudging();
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem(KEY) === "1";
    } catch {
      return false;
    }
  });

  if (dismissed || state.mistakes.length > 0) return null;

  return (
    <div className="hint-banner" role="note">
      <span className="hint-banner-icon" aria-hidden="true">
        <Icon name="pointer" size={16} />
      </span>
      <span className="hint-banner-copy">
        <strong>Press and hold</strong> a letter, drag onto a category, and release
        to mark a mistake — or tap a letter to open the menu.
      </span>
      <button
        type="button"
        className="btn-ghost hint-banner-dismiss"
        onClick={() => {
          setDismissed(true);
          try {
            localStorage.setItem(KEY, "1");
          } catch {
            /* ignore */
          }
        }}
      >
        Got it
      </button>
    </div>
  );
}

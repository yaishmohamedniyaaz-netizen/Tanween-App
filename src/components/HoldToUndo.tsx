import { useEffect, useRef, useState } from "react";

const HOLD_MS = 700;

/** Arm while held, commit on release. Leaving the control cancels the gesture. */
export function HoldToUndo({ onUndo }: { onUndo: () => void }) {
  const started = useRef<number | null>(null);
  const input = useRef<number | string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const [phase, setPhase] = useState<"idle" | "holding" | "ready">("idle");
  const cancel = () => {
    started.current = null;
    input.current = null;
    clearTimeout(timer.current);
    setPhase("idle");
  };
  const begin = (source: number | string) => {
    if (started.current !== null) return;
    input.current = source;
    started.current = performance.now();
    setPhase("holding");
    timer.current = setTimeout(() => setPhase("ready"), HOLD_MS);
  };
  const finish = () => {
    const complete = started.current !== null && performance.now() - started.current >= HOLD_MS;
    cancel();
    if (complete) onUndo();
  };
  useEffect(() => {
    const interrupt = () => cancel();
    window.addEventListener("blur", interrupt);
    document.addEventListener("visibilitychange", interrupt);
    return () => {
      clearTimeout(timer.current);
      window.removeEventListener("blur", interrupt);
      document.removeEventListener("visibilitychange", interrupt);
    };
  }, []);

  return (
    <button
      type="button"
      className={`selector-undo ${phase}`}
      data-selector-undo
      aria-label="Hold to undo selected mistake"
      onBlur={cancel}
      onContextMenu={(event) => event.preventDefault()}
      onPointerDown={(event) => {
        if (event.button !== 0 || !event.isPrimary) return;
        event.stopPropagation();
        event.currentTarget.setPointerCapture(event.pointerId);
        begin(event.pointerId);
      }}
      onPointerMove={(event) => {
        if (input.current !== event.pointerId) return;
        const box = event.currentTarget.getBoundingClientRect();
        if (event.clientX < box.left || event.clientX > box.right ||
            event.clientY < box.top || event.clientY > box.bottom) cancel();
      }}
      onPointerUp={(event) => {
        event.stopPropagation();
        if (input.current !== event.pointerId) return;
        const box = event.currentTarget.getBoundingClientRect();
        if (event.clientX >= box.left && event.clientX <= box.right &&
            event.clientY >= box.top && event.clientY <= box.bottom) finish();
        else cancel();
      }}
      onPointerCancel={cancel}
      onLostPointerCapture={cancel}
      onKeyDown={(event) => {
        if (event.key !== " " && event.key !== "Enter") return;
        event.preventDefault();
        event.stopPropagation();
        if (!event.repeat) begin(event.key);
      }}
      onKeyUp={(event) => {
        if (event.key !== " " && event.key !== "Enter") return;
        event.preventDefault();
        event.stopPropagation();
        if (input.current === event.key) finish();
      }}
      // Assistive technology can activate a button without a physical hold.
      onClick={(event) => { if (event.detail === 0) onUndo(); }}
    >
      <span aria-hidden="true">↶</span>
      <span aria-live="polite">{phase === "ready" ? "Release to undo" : "Hold to undo"}</span>
      <span className="selector-undo-progress" aria-hidden="true" />
    </button>
  );
}

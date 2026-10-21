import { useEffect, useMemo, useState } from "react";
import "./scorecardTuner.css";

/**
 * Dev-only score card size tuner. Open the app with `?tune=scorecard`
 * (dev server only; it is not in production builds).
 *
 * Each control writes one CSS custom property on <html>. The score card CSS in
 * global.css reads these with the shipped value as fallback, so "Reset" means
 * "what ships today". Values are kept in this browser only, for convenience.
 * "Copy CSS" gives the changed values to paste into global.css.
 */

type Control = {
  key: string; // CSS custom property
  label: string;
  min: number;
  max: number;
  step: number;
  value: number; // shipped value
  unit: "px" | "";
  group: "Text" | "Numbers" | "Shape";
};

export const SCORECARD_CONTROLS: Control[] = [
  { key: "--sc-name-fs", label: "Criterion name", min: 12, max: 22, step: 1, value: 17, unit: "px", group: "Text" },
  { key: "--sc-name-w", label: "Criterion name weight", min: 400, max: 700, step: 10, value: 500, unit: "", group: "Text" },
  { key: "--sc-label-fs", label: "SCORE / MISTAKES label", min: 11, max: 18, step: 1, value: 15, unit: "px", group: "Text" },
  { key: "--sc-total-fs", label: "Total", min: 22, max: 44, step: 1, value: 34, unit: "px", group: "Numbers" },
  { key: "--sc-total-of-fs", label: "Total “/ 100”", min: 11, max: 22, step: 1, value: 16, unit: "px", group: "Numbers" },
  { key: "--sc-num-fs", label: "Marks (44, Adu box)", min: 13, max: 26, step: 1, value: 19, unit: "px", group: "Numbers" },
  { key: "--sc-num-w", label: "Marks weight", min: 400, max: 700, step: 10, value: 520, unit: "", group: "Numbers" },
  { key: "--sc-of-fs", label: "“/ 50”", min: 11, max: 20, step: 1, value: 15, unit: "px", group: "Numbers" },
  { key: "--sc-dd-fs", label: "Deduction (−6)", min: 11, max: 22, step: 1, value: 17, unit: "px", group: "Numbers" },
  { key: "--sc-row-h", label: "Row height", min: 28, max: 52, step: 1, value: 36, unit: "px", group: "Shape" },
  { key: "--sc-dot", label: "Colour marker", min: 6, max: 16, step: 1, value: 12, unit: "px", group: "Shape" },
  { key: "--sc-dot-r", label: "Marker corners", min: 0, max: 8, step: 1, value: 3, unit: "px", group: "Shape" },
  { key: "--sc-box-r", label: "Adu box corners", min: 0, max: 22, step: 1, value: 12, unit: "px", group: "Shape" },
  { key: "--sc-dd-col", label: "Deduction column", min: 28, max: 64, step: 1, value: 42, unit: "px", group: "Shape" },
  { key: "--sc-num-col", label: "Marks column", min: 56, max: 100, step: 1, value: 76, unit: "px", group: "Shape" },
  { key: "--sc-gap", label: "Column gap", min: 2, max: 16, step: 1, value: 8, unit: "px", group: "Shape" },
];

const STORE_KEY = "tanween.dev.scorecardTuner.v1";
type Values = Record<string, number>;

function readStored(): Values {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    return raw ? (JSON.parse(raw) as Values) : {};
  } catch {
    return {};
  }
}

function writeStored(values: Values) {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(values));
  } catch {
    /* private mode or blocked storage: tuning still works for this visit */
  }
}

const css = (c: Control, v: number) => `${v}${c.unit}`;

export function ScorecardTuner() {
  const [values, setValues] = useState<Values>(readStored);
  const [open, setOpen] = useState(true);
  const [comparing, setComparing] = useState(false);
  const [copied, setCopied] = useState(false);

  // Apply to <html>; while "Hold to compare" is pressed, show the shipped values.
  useEffect(() => {
    const root = document.documentElement;
    for (const c of SCORECARD_CONTROLS) {
      const v = values[c.key];
      if (v === undefined || comparing) root.style.removeProperty(c.key);
      else root.style.setProperty(c.key, css(c, v));
    }
  }, [values, comparing]);

  useEffect(() => writeStored(values), [values]);

  useEffect(
    () => () => {
      for (const c of SCORECARD_CONTROLS) document.documentElement.style.removeProperty(c.key);
    },
    [],
  );

  const changed = SCORECARD_CONTROLS.filter(
    (c) => values[c.key] !== undefined && values[c.key] !== c.value,
  );
  const cssText = useMemo(
    () =>
      changed.length
        ? changed.map((c) => `  ${c.key}: ${css(c, values[c.key])}; /* was ${css(c, c.value)} — ${c.label} */`).join("\n")
        : "  /* No changes from the shipped values. */",
    [changed, values],
  );

  const copy = async () => {
    const text = `/* Score card values from the tuner. Change the fallback in each var() in global.css. */\n:root {\n${cssText}\n}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      window.prompt("Copy these values", text);
    }
  };

  const groups = ["Text", "Numbers", "Shape"] as const;

  return (
    <aside className={`sc-tuner ${open ? "is-open" : ""}`} aria-label="Score card size tuner (dev only)">
      <header className="sc-tuner-head">
        <strong>Score card sizes</strong>
        <span className="sc-tuner-count">{changed.length ? `${changed.length} changed` : "shipped values"}</span>
        <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
          {open ? "Hide" : "Show"}
        </button>
      </header>
      {open && (
        <>
          <div className="sc-tuner-body">
            {groups.map((g) => (
              <section key={g}>
                <h3>{g}</h3>
                {SCORECARD_CONTROLS.filter((c) => c.group === g).map((c) => {
                  const v = values[c.key] ?? c.value;
                  const isChanged = v !== c.value;
                  return (
                    <div className={`sc-tuner-row ${isChanged ? "is-changed" : ""}`} key={c.key}>
                      <label htmlFor={`tune${c.key}`}>{c.label}</label>
                      <input
                        id={`tune${c.key}`}
                        type="range"
                        min={c.min}
                        max={c.max}
                        step={c.step}
                        value={v}
                        onChange={(e) => setValues((cur) => ({ ...cur, [c.key]: Number(e.target.value) }))}
                      />
                      <output htmlFor={`tune${c.key}`}>{css(c, v)}</output>
                      <button
                        type="button"
                        className="sc-tuner-reset"
                        disabled={!isChanged}
                        title={`Back to ${css(c, c.value)}`}
                        aria-label={`Reset ${c.label} to ${css(c, c.value)}`}
                        onClick={() =>
                          setValues((cur) => {
                            const next = { ...cur };
                            delete next[c.key];
                            return next;
                          })
                        }
                      >
                        ↺
                      </button>
                    </div>
                  );
                })}
              </section>
            ))}
          </div>
          <footer className="sc-tuner-foot">
            <button
              type="button"
              onPointerDown={() => setComparing(true)}
              onPointerUp={() => setComparing(false)}
              onPointerLeave={() => setComparing(false)}
              onKeyDown={(e) => { if (e.key === " " || e.key === "Enter") setComparing(true); }}
              onKeyUp={() => setComparing(false)}
            >
              {comparing ? "Showing shipped…" : "Hold to compare"}
            </button>
            <button type="button" onClick={() => setValues({})} disabled={!changed.length}>
              Reset all
            </button>
            <button type="button" className="is-primary" onClick={copy}>
              {copied ? "Copied" : "Copy CSS"}
            </button>
          </footer>
          {changed.length > 0 && <pre className="sc-tuner-css">{cssText}</pre>}
        </>
      )}
    </aside>
  );
}

import type { RefObject } from "react";
import {
  MUSHAF_ZOOM_FIT,
  MUSHAF_ZOOM_MAX,
  MUSHAF_ZOOM_MIN,
  MUSHAF_ZOOM_STEP,
} from "../lib/devicePreferences";
import { Icon } from "./Icon";

interface MushafSizeControlProps {
  value: number;
  onChange: (value: number) => void;
  inputRef?: RefObject<HTMLInputElement>;
  constrained?: boolean;
}

export function MushafSizeControl({
  value,
  onChange,
  inputRef,
  constrained = false,
}: MushafSizeControlProps) {
  const atFit = value === MUSHAF_ZOOM_FIT;
  const valueText = constrained ? `Fit to screen, ${value} percent requested` : atFit ? "Fit, 100 percent" : `${value} percent`;
  const setBoundedValue = (next: number) => {
    onChange(Math.min(MUSHAF_ZOOM_MAX, Math.max(MUSHAF_ZOOM_MIN, next)));
  };

  return (
    <section className="more-view-controls" aria-labelledby="mushaf-size-label">
      <div className="more-view-controls-head">
        <span id="mushaf-size-label">Mushaf size</span>
        <strong className="t-num">{constrained ? `${value}% · Fitted` : atFit ? "100% · Fit" : `${value}%`}</strong>
      </div>
      <div className="mushaf-size-row">
        <button
          type="button"
          className="mushaf-size-step"
          aria-label={`Decrease Mushaf size from ${valueText}`}
          disabled={value <= MUSHAF_ZOOM_MIN}
          onClick={() => setBoundedValue(value - MUSHAF_ZOOM_STEP)}
        >
          <Icon name="minus" size={16} />
        </button>
        <input
          ref={inputRef}
          className="mushaf-size-range"
          type="range"
          min={MUSHAF_ZOOM_MIN}
          max={MUSHAF_ZOOM_MAX}
          step={MUSHAF_ZOOM_STEP}
          value={value}
          aria-label="Mushaf size"
          aria-valuetext={valueText}
          onChange={(event) => setBoundedValue(Number(event.target.value))}
        />
        <button
          type="button"
          className="mushaf-size-step"
          aria-label={`Increase Mushaf size from ${valueText}`}
          disabled={value >= MUSHAF_ZOOM_MAX}
          onClick={() => setBoundedValue(value + MUSHAF_ZOOM_STEP)}
        >
          <Icon name="plus" size={16} />
        </button>
      </div>
      <button
        type="button"
        className="mushaf-fit-action"
        disabled={atFit}
        onClick={() => onChange(MUSHAF_ZOOM_FIT)}
      >
        Fit page
      </button>
    </section>
  );
}

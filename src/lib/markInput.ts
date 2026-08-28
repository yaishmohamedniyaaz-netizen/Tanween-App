const round2 = (value: number) => Math.round(value * 100) / 100;

export const MARK_INPUT_WHEEL_DELTA_THRESHOLD = 24;

export function clampMark(value: number, max: number, step: number): number {
  const safeStep = step > 0 ? step : 1;
  return round2(
    Math.min(max, Math.max(0, Math.round(value / safeStep) * safeStep)),
  );
}

export function markFromHorizontalPoint(
  clientX: number,
  left: number,
  width: number,
  max: number,
  step: number,
): number {
  if (width <= 0) return clampMark(max, max, step);
  const ratio = Math.min(1, Math.max(0, (clientX - left) / width));
  return clampMark(ratio * max, max, step);
}

/** Resolve one explicit step-button or focused-wheel adjustment.
 *
 * An unmarked category starts from its configured maximum in the UI only.
 * Calling this function represents a deliberate interaction and therefore
 * returns the first value that may be committed to judging state. */
export function stepperMark(
  value: number,
  marked: boolean,
  delta: number,
  max: number,
  step: number,
): number {
  const baseline = marked ? value : max;
  return clampMark(baseline + delta, max, step);
}

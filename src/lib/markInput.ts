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

/** How far a press may wander before it counts as a drag (Android "touch slop" is the same idea). */
export const MARK_TAP_SLOP_PX = 8;
/** How far above or below the ruler and its box the pointer may go before releasing cancels. */
export const MARK_CANCEL_BAND_PX = 48;
/** Holding − or + in the stepper: first repeat after this delay, then at this interval. */
export const MARK_REPEAT_DELAY_MS = 400;
export const MARK_REPEAT_INTERVAL_MS = 90;

/** Whether a press has become a drag. Once it has, it stays a drag. */
export function passedTapSlop(
  start: { x: number; y: number },
  point: { x: number; y: number },
  slop = MARK_TAP_SLOP_PX,
): boolean {
  return Math.hypot(point.x - start.x, point.y - start.y) >= slop;
}

/** A release this far outside the control's vertical band changes nothing (WCAG 2.5.2). */
export function isInCancelBand(
  clientY: number,
  band: { top: number; bottom: number },
  margin = MARK_CANCEL_BAND_PX,
): boolean {
  return clientY < band.top - margin || clientY > band.bottom + margin;
}

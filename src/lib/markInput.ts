const round2 = (value: number) => Math.round(value * 100) / 100;

export const MARK_WHEEL_HOLD_MS = 320;
export const MARK_WHEEL_MOVE_TOLERANCE = 10;
export const MARK_WHEEL_ROW_HEIGHT = 38;
export const MARK_WHEEL_HALF_ENTER = 30;
export const MARK_WHEEL_HALF_EXIT = 16;

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

export function wheelWholeFromDelta(
  startingValue: number,
  deltaY: number,
  max: number,
): number {
  const startingWhole = Math.floor(Math.max(0, Math.min(max, startingValue)));
  const wholeSteps = Math.round(-deltaY / MARK_WHEEL_ROW_HEIGHT);
  return Math.min(Math.floor(max), Math.max(0, startingWhole + wholeSteps));
}

export function markSupportsHalf(whole: number, max: number, step: number): boolean {
  if (whole + 0.5 > max) return false;
  return clampMark(whole + 0.5, max, step) === round2(whole + 0.5);
}

export function wheelMark(
  whole: number,
  half: boolean,
  max: number,
  step: number,
): number {
  return clampMark(
    whole + (half && markSupportsHalf(whole, max, step) ? 0.5 : 0),
    max,
    step,
  );
}

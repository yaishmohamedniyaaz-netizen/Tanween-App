export interface ClusterMeasurement {
  rawLeft: number;
  rawTop: number;
  rawRight: number;
  rawBottom: number;
  boundaryAfter: number | null;
}

export interface ClusterGeometry {
  inkLeft: number;
  inkTop: number;
  inkRight: number;
  inkBottom: number;
  hitLeft: number;
  hitRight: number;
}

const MIN_USABLE_CLUSTER_WIDTH = 0.5;

function fallbackBoundaries(
  measurements: ClusterMeasurement[],
  wordLeft: number,
  wordRight: number,
  rtl: boolean,
): number[] {
  const weights = measurements.map((measurement) =>
    Math.max(
      MIN_USABLE_CLUSTER_WIDTH,
      measurement.rawRight - measurement.rawLeft,
    ),
  );
  const totalWeight = weights.reduce((total, width) => total + width, 0);
  const span = Math.max(MIN_USABLE_CLUSTER_WIDTH, wordRight - wordLeft);
  const boundaries = [rtl ? wordRight : wordLeft];
  let consumed = 0;

  for (const weight of weights) {
    consumed += (weight / totalWeight) * span;
    boundaries.push(rtl ? wordRight - consumed : wordLeft + consumed);
  }

  boundaries[boundaries.length - 1] = rtl ? wordLeft : wordRight;
  return boundaries;
}

/**
 * Turn contextual caret positions into non-overlapping per-letter regions.
 *
 * Arabic glyphs can overlap visually and a DOM Range may return the same
 * selection rectangle for two joined letters. Caret boundaries, however,
 * describe where the browser considers one shaped grapheme to end and the
 * next to begin. When a font does not expose internal ligature carets, the
 * fallback apportions the word by the measured cluster advances instead.
 */
export function buildClusterGeometry(
  measurements: ClusterMeasurement[],
  wordLeft: number,
  wordRight: number,
  rtl = true,
): ClusterGeometry[] {
  if (!measurements.length || wordRight <= wordLeft) return [];

  const start = rtl ? wordRight : wordLeft;
  const end = rtl ? wordLeft : wordRight;
  const boundaries = [
    start,
    ...measurements.map((measurement) => measurement.boundaryAfter),
  ];
  boundaries[boundaries.length - 1] = end;

  const direction = rtl ? -1 : 1;
  const contextualBoundariesAreUsable = boundaries.every(
    (boundary, index) =>
      Number.isFinite(boundary) &&
      (index === 0 ||
        direction * (boundary! - boundaries[index - 1]!) >=
          MIN_USABLE_CLUSTER_WIDTH),
  );
  const resolved = contextualBoundariesAreUsable
    ? (boundaries as number[])
    : fallbackBoundaries(measurements, wordLeft, wordRight, rtl);

  return measurements.map((measurement, index) => {
    const cellLeft = Math.min(resolved[index], resolved[index + 1]);
    const cellRight = Math.max(resolved[index], resolved[index + 1]);
    const clippedLeft = Math.max(cellLeft, measurement.rawLeft);
    const clippedRight = Math.min(cellRight, measurement.rawRight);
    const hasClippedInk =
      clippedRight - clippedLeft >= MIN_USABLE_CLUSTER_WIDTH;

    return {
      inkLeft: hasClippedInk ? clippedLeft : cellLeft,
      inkTop: measurement.rawTop,
      inkRight: hasClippedInk ? clippedRight : cellRight,
      inkBottom: measurement.rawBottom,
      hitLeft: cellLeft,
      hitRight: cellRight,
    };
  });
}

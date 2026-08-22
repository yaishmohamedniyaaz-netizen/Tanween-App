export const CANONICAL_MUSHAF_WIDTH = 1260;
export const CANONICAL_MUSHAF_HEIGHT = 2038;
export const CANONICAL_MUSHAF_SOURCE =
  "quran-android-madani-v8-ayahinfo-1260";

export type CanonicalWordBounds = readonly [
  minX: number,
  minY: number,
  maxX: number,
  maxY: number,
];

export interface CanonicalPageCoordinates {
  page: number;
  width: typeof CANONICAL_MUSHAF_WIDTH;
  height: typeof CANONICAL_MUSHAF_HEIGHT;
  source: typeof CANONICAL_MUSHAF_SOURCE;
  words: Record<string, CanonicalWordBounds>;
}

const coordinateCache = new Map<number, CanonicalPageCoordinates>();
const imageCache = new Map<number, Promise<void>>();

function pageFileName(page: number): string {
  return `page${String(page).padStart(3, "0")}.png`;
}

export function canonicalMushafImageUrl(page: number): string {
  return `https://files.quran.app/hafs/madani/width_1260/${pageFileName(page)}`;
}

export function canonicalCoordinateUrl(page: number): string {
  return `/madani-coordinates/p${page}.json?v=${CANONICAL_MUSHAF_SOURCE}`;
}

function assertCoordinates(
  value: unknown,
  expectedPage: number,
): asserts value is CanonicalPageCoordinates {
  const data = value as Partial<CanonicalPageCoordinates> | null;
  if (
    !data ||
    data.page !== expectedPage ||
    data.width !== CANONICAL_MUSHAF_WIDTH ||
    data.height !== CANONICAL_MUSHAF_HEIGHT ||
    data.source !== CANONICAL_MUSHAF_SOURCE ||
    !data.words ||
    typeof data.words !== "object"
  ) {
    throw new Error(`Unsupported canonical Mushaf coordinates for page ${expectedPage}`);
  }
}

export async function loadCanonicalCoordinates(
  page: number,
): Promise<CanonicalPageCoordinates> {
  const cached = coordinateCache.get(page);
  if (cached) return cached;
  const response = await fetch(canonicalCoordinateUrl(page));
  if (!response.ok) {
    throw new Error(`Failed to load canonical coordinates for page ${page}`);
  }
  const data: unknown = await response.json();
  assertCoordinates(data, page);
  coordinateCache.set(page, data);
  return data;
}

export function preloadCanonicalCoordinates(page: number): void {
  loadCanonicalCoordinates(page).catch(() => {});
}

export function loadCanonicalMushafImage(page: number): Promise<void> {
  const cached = imageCache.get(page);
  if (cached) return cached;
  const promise = new Promise<void>((resolve, reject) => {
    const image = new Image();
    image.decoding = "async";
    image.onload = () => resolve();
    image.onerror = () => reject(new Error(`Failed to load canonical page ${page}`));
    image.src = canonicalMushafImageUrl(page);
  });
  imageCache.set(page, promise);
  promise.catch(() => imageCache.delete(page));
  return promise;
}

export function preloadCanonicalMushafImage(page: number): void {
  loadCanonicalMushafImage(page).catch(() => {});
}

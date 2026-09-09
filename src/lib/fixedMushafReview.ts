/** Artwork is the default. The explicit legacy route is retained for rollback checks. */
export function fixedMushafReviewEnabled(): boolean {
  return typeof window === 'undefined' ||
    new URLSearchParams(window.location.search).get('fixedMushaf') !== '0';
}

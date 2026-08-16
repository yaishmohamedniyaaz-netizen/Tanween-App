import type { MushafLayout } from "./devicePreferences";

export const FIRST_MUSHAF_PAGE = 1;
export const LAST_MUSHAF_PAGE = 604;

export function clampMushafPage(page: number): number {
  if (!Number.isFinite(page)) return FIRST_MUSHAF_PAGE;
  return Math.min(
    LAST_MUSHAF_PAGE,
    Math.max(FIRST_MUSHAF_PAGE, Math.round(page)),
  );
}

export function spreadAnchorPage(page: number): number {
  const clamped = clampMushafPage(page);
  return clamped === LAST_MUSHAF_PAGE ? LAST_MUSHAF_PAGE - 1 : clamped;
}

export function visibleMushafPages(
  anchorPage: number,
  layout: MushafLayout,
  compact = false,
): number[] {
  const clamped = clampMushafPage(anchorPage);
  if (layout === "full" || compact) return [clamped];
  const anchor = spreadAnchorPage(clamped);
  return [anchor, anchor + 1];
}

export function moveMushafView(
  anchorPage: number,
  layout: MushafLayout,
  direction: -1 | 1,
  compact = false,
): number {
  const step = layout === "spread" && !compact ? 2 : 1;
  const current = layout === "spread" && !compact
    ? spreadAnchorPage(anchorPage)
    : clampMushafPage(anchorPage);
  const target = current + direction * step;
  if (layout === "spread" && !compact) return spreadAnchorPage(target);
  return clampMushafPage(target);
}

export function pageIsVisible(
  targetPage: number,
  visiblePages: readonly number[],
): boolean {
  return visiblePages.includes(clampMushafPage(targetPage));
}

export function mushafPageRangeLabel(visiblePages: readonly number[]): string {
  if (!visiblePages.length) return "";
  if (visiblePages.length === 1) return String(visiblePages[0]);
  return `${visiblePages[0]}\u2013${visiblePages[visiblePages.length - 1]}`;
}

/** Immutable delivery versions shared by runtime loading and offline storage. */
export const MUSHAF_DATA_VERSION = "v1-1405-r2";
export const QCF_FONT_VERSION = "3.1";
export const QCF_FONT_BASE =
  "https://static-cdn.tarteel.ai/qul/fonts/quran_fonts/v1-optimized/woff2";

export const OFFLINE_MUSHAF_TOTAL_PAGES = 604;
export const OFFLINE_MUSHAF_APPROX_BYTES = 50_085_077;
export const OFFLINE_MUSHAF_PACKAGE_VERSION =
  `${MUSHAF_DATA_VERSION}:qcf-v1-${QCF_FONT_VERSION}`;
export const OFFLINE_MUSHAF_PAGE_CACHE =
  `tahqeeq-mushaf-pages-${MUSHAF_DATA_VERSION}`;
export const OFFLINE_MUSHAF_FONT_CACHE =
  `tahqeeq-mushaf-fonts-qcf-v1-${QCF_FONT_VERSION}`;

export interface OfflineMushafAssetPair {
  page: number;
  pageUrl: string;
  fontUrl: string;
}

export function mushafPageAssetUrl(page: number): string {
  return `/pages/p${page}.json?v=${MUSHAF_DATA_VERSION}`;
}

export function qcfFontAssetUrl(page: number): string {
  return `${QCF_FONT_BASE}/p${page}.woff2?v=${QCF_FONT_VERSION}`;
}

export function offlineMushafAssetPairs(): OfflineMushafAssetPair[] {
  return Array.from({ length: OFFLINE_MUSHAF_TOTAL_PAGES }, (_, index) => {
    const page = index + 1;
    return {
      page,
      pageUrl: mushafPageAssetUrl(page),
      fontUrl: qcfFontAssetUrl(page),
    };
  });
}

function pageNumberFromAssetUrl(url: string, kind: "page" | "font"): number | null {
  let parsed: URL;
  try {
    parsed = new URL(url, "https://tahqeeq.invalid");
  } catch {
    return null;
  }

  const match = kind === "page"
    ? parsed.pathname.match(/^\/pages\/p(\d+)\.json$/)
    : parsed.pathname.match(/\/quran_fonts\/v1-optimized\/woff2\/p(\d+)\.woff2$/);
  const version = kind === "page" ? MUSHAF_DATA_VERSION : QCF_FONT_VERSION;
  if (!match || parsed.searchParams.get("v") !== version) return null;
  const page = Number(match[1]);
  return page >= 1 && page <= OFFLINE_MUSHAF_TOTAL_PAGES ? page : null;
}

export function offlineMushafAssetPage(
  url: string,
  kind: "page" | "font",
): number | null {
  return pageNumberFromAssetUrl(url, kind);
}

export function readyOfflineMushafPages(
  pageUrls: readonly string[],
  fontUrls: readonly string[],
): number[] {
  const pageAssets = new Set(
    pageUrls.map((url) => pageNumberFromAssetUrl(url, "page")).filter(
      (page): page is number => page !== null,
    ),
  );
  const fontAssets = new Set(
    fontUrls.map((url) => pageNumberFromAssetUrl(url, "font")).filter(
      (page): page is number => page !== null,
    ),
  );
  return [...pageAssets].filter((page) => fontAssets.has(page)).sort((a, b) => a - b);
}

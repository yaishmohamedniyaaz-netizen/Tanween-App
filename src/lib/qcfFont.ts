const QCF_FONT_BASE =
  "https://static-cdn.tarteel.ai/qul/fonts/quran_fonts/v1-optimized/woff2";
const QCF_FONT_VERSION = "3.1";

const fontPromises = new Map<number, Promise<string>>();

export function qcfFontFamily(page: number): string {
  return `TahqeeqQCFV1Page${page}`;
}

export function qcfFontUrl(page: number): string {
  return `${QCF_FONT_BASE}/p${page}.woff2?v=${QCF_FONT_VERSION}`;
}

/** Load one immutable KFGQPC V1 (1405H) page font and return its CSS family. */
export function loadQcfPageFont(page: number): Promise<string> {
  const cached = fontPromises.get(page);
  if (cached) return cached;

  const family = qcfFontFamily(page);
  const promise = (async () => {
    if (typeof document === "undefined" || !("fonts" in document)) {
      return family;
    }

    const face = new FontFace(
      family,
      `url("${qcfFontUrl(page)}") format("woff2")`,
      { display: "swap", style: "normal", weight: "400" },
    );
    const loaded = await face.load();
    document.fonts.add(loaded);
    return family;
  })().catch((error) => {
    fontPromises.delete(page);
    throw error;
  });

  fontPromises.set(page, promise);
  return promise;
}

export function preloadQcfPageFont(page: number): void {
  if (page < 1 || page > 604) return;
  loadQcfPageFont(page).catch(() => {});
}

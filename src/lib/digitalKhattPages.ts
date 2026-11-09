import { useEffect, useState, useSyncExternalStore } from "react";
import type { PageDrawing } from "./markingPreferences.ts";
import { readDevicePreferences } from "./devicePreferences.ts";
import { buildFixedPageGeometry, type FixedPageGeometry, type FixedRect, type FixedSourceWord, type FixedWordRegion } from "./fixedMushafGeometry.ts";
import type { MushafPage, PageWord } from "./page.ts";

/**
 * Pages drawn with the DigitalKhatt old Madina font (prototype).
 *
 * Built by scripts/digitalkhatt/app_pages/ from DigitalKhatt's own web layout
 * (digitalkhatt.org, MIT) with its HarfBuzz justification build (Old MIT) and
 * the old Madina font (SIL OFL 1.1, DigitalKhatt, sponsored by Tarteel).
 * Every glyph carries the app word id and letter unit (tid) it belongs to, so a
 * mistaken letter can be coloured exactly. Coordinates are in the same
 * 1920 x 3106 frame as the printed artwork.
 */
export const DK_ASSET_VERSION = "dk-web-4213fab-v1";
const DK_BASE = `/mushaf-dk/${DK_ASSET_VERSION}`;

/** [glyph id, x, y, word index, unit index, second unit index?] in font units. */
export type DkGlyph = [number, number, number, number, number, number?];
export interface DkLine {
  n: number;
  type: "text" | "basmala";
  /** Baseline and right edge, artwork px. */
  base: number;
  right: number;
  /** Font units to artwork px (x includes the line's justification scale). */
  sx: number;
  sy: number;
  g: DkGlyph[];
}
export interface DkWord { wid: string; line: number; body: FixedRect; band: FixedRect }
export interface DkHeader { n: number; slot: [number, number]; art: [number, number] }
export interface DkPage {
  page: number;
  version: 1;
  lines: DkLine[];
  words: DkWord[];
  units: string[];
  headers: DkHeader[];
}

// ---------- the drawing choice (one store for every page surface) ----------
let drawing: PageDrawing | null = null;
const listeners = new Set<() => void>();
function currentDrawing(): PageDrawing {
  if (drawing === null) {
    try { drawing = readDevicePreferences().marking.pageDrawing; } catch { drawing = "print"; }
  }
  return drawing;
}
/** The app publishes the saved setting here; replay and results surfaces read it too. */
export function publishPageDrawing(value: PageDrawing) {
  if (value === currentDrawing()) return;
  drawing = value;
  for (const listener of listeners) listener();
}
export function usePageDrawing(): PageDrawing {
  return useSyncExternalStore(
    (listener) => { listeners.add(listener); return () => listeners.delete(listener); },
    currentDrawing, currentDrawing,
  );
}

// ---------- assets ----------
let glyphsPromise: Promise<void> | null = null;
/** All 890 glyph outlines, once, as <path id="dkg{gid}"> in one hidden SVG. */
export function loadDkGlyphs(): Promise<void> {
  glyphsPromise ??= fetch(`${DK_BASE}/glyphs.json`)
    .then((response) => {
      if (!response.ok) throw new Error(`DigitalKhatt glyphs: ${response.status}`);
      return response.json() as Promise<Record<string, string>>;
    })
    .then((glyphs) => {
      const ns = "http://www.w3.org/2000/svg";
      const svg = document.createElementNS(ns, "svg");
      svg.setAttribute("aria-hidden", "true");
      svg.setAttribute("width", "0");
      svg.setAttribute("height", "0");
      svg.style.position = "absolute";
      svg.dataset.dkGlyphs = DK_ASSET_VERSION;
      const defs = document.createElementNS(ns, "defs");
      for (const [gid, d] of Object.entries(glyphs)) {
        if (!d) continue;
        const path = document.createElementNS(ns, "path");
        path.setAttribute("id", `dkg${gid}`);
        path.setAttribute("d", d);
        defs.appendChild(path);
      }
      svg.appendChild(defs);
      document.body.appendChild(svg);
    })
    .catch((error) => { glyphsPromise = null; throw error; });
  return glyphsPromise;
}

const pageCache = new Map<number, DkPage>();
const pagePromises = new Map<number, Promise<DkPage>>();
export function loadDkPage(page: number): Promise<DkPage> {
  const cached = pageCache.get(page);
  if (cached) return Promise.resolve(cached);
  let promise = pagePromises.get(page);
  if (!promise) {
    promise = Promise.all([
      fetch(`${DK_BASE}/p${page}.json`).then((response) => {
        if (!response.ok) throw new Error(`DigitalKhatt page ${page}: ${response.status}`);
        return response.json() as Promise<DkPage>;
      }),
      loadDkGlyphs(),
    ]).then(([data]) => {
      if (data.page !== page || data.version !== 1) throw new Error(`DigitalKhatt page ${page} mismatch`);
      pageCache.set(page, data);
      return data;
    }).finally(() => pagePromises.delete(page));
    pagePromises.set(page, promise);
  }
  return promise;
}
export function cachedDkPage(page: number): DkPage | null {
  return pageCache.get(page) ?? null;
}

/** The page's DigitalKhatt data once loaded; null while loading, off, or failed. */
export function useDkPage(page: number | null): DkPage | null {
  const [loaded, setLoaded] = useState<DkPage | null>(() => page === null ? null : cachedDkPage(page));
  useEffect(() => {
    if (page === null) { setLoaded(null); return; }
    const cached = cachedDkPage(page);
    if (cached) { setLoaded(cached); return; }
    setLoaded(null);
    let cancelled = false;
    loadDkPage(page).then((data) => { if (!cancelled) setLoaded(data); }).catch(() => {});
    return () => { cancelled = true; };
  }, [page]);
  return loaded && loaded.page === page ? loaded : null;
}

/**
 * The page's selectable words with DigitalKhatt boxes, in the same shape the
 * artwork surface uses. Word ids, text and order are unchanged; only the boxes move.
 */
export function dkPageGeometry(fixed: FixedPageGeometry, data: MushafPage, dk: DkPage): FixedPageGeometry {
  const semantic = new Map<string, PageWord>();
  for (const line of data.lines) if ("words" in line) for (const word of line.words) semantic.set(word.wid, word);
  const words: FixedSourceWord[] = dk.words.map((box) => {
    const word = semantic.get(box.wid);
    if (!word) throw new Error(`DigitalKhatt word ${box.wid} is not on page ${data.page}`);
    return { ...word, line: box.line, body: box.body, band: box.band };
  });
  words.sort((a, b) => a.line - b.line || b.body[2] - a.body[2]);
  const geometry = buildFixedPageGeometry({ ...fixed, contentBounds: undefined, words });
  return geometry;
}

/** Letter unit ids of every glyph, resolved once per page. */
export function dkGlyphUnits(dk: DkPage, glyph: DkGlyph): string[] {
  const units: string[] = [];
  if (glyph[4] >= 0) units.push(dk.units[glyph[4]]);
  if (glyph[5] !== undefined && glyph[5] >= 0) units.push(dk.units[glyph[5]]);
  return units;
}

export type { FixedWordRegion };

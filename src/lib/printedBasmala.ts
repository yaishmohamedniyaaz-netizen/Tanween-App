import { useSyncExternalStore } from 'react';
import regions from '../data/printedBasmalaRegions.json' with { type: 'json' };
import stamp from '../data/printedBasmalaBars.json' with { type: 'json' };
import regular from '../data/regularBasmala.json' with { type: 'json' };
import descriptor from '../data/fixedMushafPackage.json' with { type: 'json' };
import type { FixedRect, FixedWordRegion } from './fixedMushafGeometry';
import type { BasmalaStyle } from './markingPreferences';
import type { MushafPage } from './page';
import { readDevicePreferences } from './devicePreferences.ts';

// ---------- the Basmala choice (one store for every page surface) ----------
let style: BasmalaStyle | null = null;
const listeners = new Set<() => void>();
export function currentBasmalaStyle(): BasmalaStyle {
  if (style === null) {
    try { style = readDevicePreferences().marking.basmala; } catch { style = 'regular'; }
  }
  return style;
}
/** The app publishes the saved setting here; replay and results surfaces read it too. */
export function publishBasmalaStyle(value: BasmalaStyle) {
  if (value === currentBasmalaStyle()) return;
  style = value;
  for (const listener of listeners) listener();
}
export function useBasmalaStyle(): BasmalaStyle {
  return useSyncExternalStore(
    (listener) => { listeners.add(listener); return () => listeners.delete(listener); },
    currentBasmalaStyle, currentBasmalaStyle,
  );
}

type Row = (typeof regions.rows)[number];
/** Rows printed with the stretched stamp: all 111 are the same image at the same size (page 2's row is not). */
const isStamp = (row: Row) => row.bounds[2] - row.bounds[0] === stamp.stampWidth;
/** The regular Basmala replaces a stamp row only. */
const useRegular = (row: Row, chosen: BasmalaStyle) => chosen === 'regular' && isStamp(row);

/** Where the regular Basmala image goes on each stamp row of a page, in artwork px. */
export function regularBasmalaPlacements(page: number, chosen: BasmalaStyle = currentBasmalaStyle()) {
  if (regions.packageVersion !== descriptor.version) return [];
  return regions.rows.filter(row => row.page === page && useRegular(row, chosen)).map(row => ({
    row: row.bounds as FixedRect,
    image: regular.image,
    left: row.bounds[0] + regular.place[0], top: row.bounds[1] + regular.place[1],
    width: regular.place[2], height: regular.place[3],
  }));
}

/** Supplemental input regions over the unchanged, pinned printed artwork.
 * These use the existing surah.b.word addresses, never recital phrase IDs.
 */
export function printedBasmalaWords(data: MushafPage, chosen: BasmalaStyle = currentBasmalaStyle()): FixedWordRegion[] {
  if (regions.packageVersion !== descriptor.version) return [];
  return regions.rows.filter(row => row.page === data.page).flatMap(row => {
    const line = data.lines.find(line => line.n === row.line && line.type === 'basmala');
    if (!line || line.type !== 'basmala' || line.surah !== row.surah || line.words.length !== 4 ||
      line.words.some((word, i) => word.wid !== `${row.surah}.b.${i}` || word.ayah !== null || word.role !== 'letter')) return [];
    return line.words.map((word, i) => {
      const region: FixedRect = useRegular(row, chosen)
        ? [row.bounds[0] + regular.words[i].region[0], row.bounds[1], row.bounds[0] + regular.words[i].region[1], row.bounds[3]]
        : [row.edges[i+1], row.bounds[1], row.edges[i], row.bounds[3]];
      return { ...word, line: line.n, body: region, band: region, region };
    });
  });
}

/**
 * Letter bars for the Basmalas of one page, in artwork px, for the chosen
 * style. Each style has one set of bars measured from the row's left edge.
 * Rows of another width (page 2) get none and keep the word highlight.
 */
export function printedBasmalaBars(page: number, chosen: BasmalaStyle = currentBasmalaStyle()): Record<string, { tids: string[]; bars: [number, number][] }> {
  if (regions.packageVersion !== descriptor.version) return {};
  const words: Record<string, { tids: string[]; bars: [number, number][] }> = {};
  for (const row of regions.rows) {
    if (row.page !== page || !isStamp(row)) continue;
    const set = useRegular(row, chosen) ? regular.words : stamp.words;
    set.forEach((word, i) => {
      const wid = `${row.surah}.b.${i}`;
      words[wid] = {
        tids: word.tids.map(tid => `${wid}@${tid}`),
        bars: word.bars.map(([left, right]) => [row.bounds[0] + left, row.bounds[0] + right] as [number, number]),
      };
    });
  }
  return words;
}

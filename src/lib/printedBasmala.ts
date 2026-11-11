import regions from '../data/printedBasmalaRegions.json' with { type: 'json' };
import stamp from '../data/printedBasmalaBars.json' with { type: 'json' };
import descriptor from '../data/fixedMushafPackage.json' with { type: 'json' };
import type { FixedRect, FixedWordRegion } from './fixedMushafGeometry';
import type { MushafPage } from './page';

/** Supplemental input regions over the unchanged, pinned printed artwork.
 * These use the existing surah.b.word addresses, never recital phrase IDs.
 */
export function printedBasmalaWords(data: MushafPage): FixedWordRegion[] {
  if (regions.packageVersion !== descriptor.version) return [];
  return regions.rows.filter(row => row.page === data.page).flatMap(row => {
    const line = data.lines.find(line => line.n === row.line && line.type === 'basmala');
    if (!line || line.type !== 'basmala' || line.surah !== row.surah || line.words.length !== 4 ||
      line.words.some((word, i) => word.wid !== `${row.surah}.b.${i}` || word.ayah !== null || word.role !== 'letter')) return [];
    return line.words.map((word, i) => {
      const region: FixedRect = [row.edges[i+1], row.bounds[1], row.edges[i], row.bounds[3]];
      return { ...word, line: line.n, body: region, band: region, region };
    });
  });
}

/**
 * Letter bars for the printed Basmalas of one page, in artwork px. Every
 * Basmala row of the stamp width is the same image at the same scale, so one
 * set of bars (measured from the row's left edge) serves all of them. Rows of
 * another width (page 2) get none and keep the word highlight.
 */
export function printedBasmalaBars(page: number): Record<string, { tids: string[]; bars: [number, number][] }> {
  if (regions.packageVersion !== descriptor.version) return {};
  const words: Record<string, { tids: string[]; bars: [number, number][] }> = {};
  for (const row of regions.rows) {
    if (row.page !== page || row.bounds[2] - row.bounds[0] !== stamp.stampWidth) continue;
    stamp.words.forEach((word, i) => {
      const wid = `${row.surah}.b.${i}`;
      words[wid] = {
        tids: word.tids.map(tid => `${wid}@${tid}`),
        bars: word.bars.map(([left, right]) => [row.bounds[0] + left, row.bounds[0] + right] as [number, number]),
      };
    });
  }
  return words;
}

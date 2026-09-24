import regions from '../data/printedBasmalaRegions.json' with { type: 'json' };
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

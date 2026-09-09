import type { MushafPage, PageWord } from "./page.ts";

export type FixedRect = [number, number, number, number];
export interface FixedSourceWord extends PageWord {
  line: number;
  body: FixedRect;
  band: FixedRect;
}
export interface FixedSourcePage {
  page: number;
  width: number;
  height: number;
  image: string;
  imageSha256: string;
  /** Measured alpha bounds, used only to center the two sparse opening pages. */
  contentBounds?: FixedRect;
  words: FixedSourceWord[];
}
export interface FixedWordRegion extends FixedSourceWord { region: FixedRect }
export interface FixedPageGeometry extends Omit<FixedSourcePage, "words"> {
  words: FixedWordRegion[];
}

/** Practical reading-order partitions. Does not attempt detached-ink ownership. */
export function buildFixedPageGeometry(source: FixedSourcePage): FixedPageGeometry {
  if (!Number.isInteger(source.page) || source.page < 1 || source.page > 604 ||
      source.width !== 1920 || source.height !== 3106) throw new Error("Invalid fixed page");
  const ids = new Set<string>();
  const words: FixedWordRegion[] = source.words.map(word => {
    if (ids.has(word.wid)) throw new Error(`Duplicate word ${word.wid}`);
    ids.add(word.wid);
    if (![...word.body, ...word.band].every(Number.isFinite)) throw new Error(`Invalid region ${word.wid}`);
    return { ...word, region: [...word.band] };
  });
  const lines = new Map<number, FixedWordRegion[]>();
  for (const word of words) {
    const row = lines.get(word.line) ?? [];
    row.push(word); lines.set(word.line, row);
  }
  for (const row of lines.values()) {
    for (let i = 0; i < row.length - 1; i++) {
      const right = row[i], left = row[i + 1];
      const rc = (right.body[0] + right.body[2]) / 2;
      const lc = (left.body[0] + left.body[2]) / 2;
      if (rc <= lc) throw new Error(`Reversed body centers ${right.wid}/${left.wid}`);
      const edge = right.body[0] >= left.body[2]
        ? (right.body[0] + left.body[2]) / 2 : (rc + lc) / 2;
      right.region[0] = edge; left.region[2] = edge;
    }
    for (const word of row) {
      const [x0, y0, x1, y1] = word.region;
      const cx = (word.body[0] + word.body[2]) / 2;
      if (x0 < 0 || y0 < 0 || x1 > source.width || y1 > source.height ||
          x0 >= x1 || y0 >= y1 || cx < x0 || cx > x1) {
        throw new Error(`Unusable word region ${word.wid}`);
      }
    }
  }
  return { ...source, words };
}

/** Verify every semantic field against the existing page before enabling input. */
export function assertFixedPageMatches(geometry: FixedPageGeometry, data: MushafPage) {
  const expected = data.lines.flatMap(line => line.type === "ayah"
    ? line.words.map(word => ({ ...word, line: line.n })) : []);
  if (data.page !== geometry.page || expected.length !== geometry.words.length) throw new Error("Page correspondence mismatch");
  expected.forEach((word, i) => {
    const actual = geometry.words[i];
    for (const key of ["wid", "text", "role", "surah", "ayah", "line"] as const) {
      if (actual[key] !== word[key]) throw new Error(`Word correspondence mismatch ${word.wid}`);
    }
  });
}

/** Marker cells and whitespace stay inactive; shared edges have one owner. */
export function pickFixedWord(page: FixedPageGeometry, x: number, y: number) {
  return page.words.find(word => word.role === "letter" && x >= word.region[0] &&
    x < word.region[2] && y >= word.region[1] && y < word.region[3]) ?? null;
}

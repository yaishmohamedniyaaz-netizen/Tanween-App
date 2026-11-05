// Prints every distinct letter-tile text (tashkeel on) in the Quran as JSON:
// { "<tile text>": { n: uses, src: source letter, ex: example word } }.
// Used by scripts/tile-glyph-overlap.py.
import fs from "node:fs";
import { judgingUnitsOf } from "../src/lib/judgingUnits.ts";
import { nextRecitedWords } from "../src/lib/recitedNeighbours.ts";
import { tileGlyph } from "../src/lib/tileGlyph.ts";

const raw = process.argv.includes("--raw");
const tiles: Record<string, { n: number; src: string; ex: string }> = {};
for (let p = 1; p <= 604; p += 1) {
  const page = JSON.parse(fs.readFileSync(`public/pages/p${p}.json`, "utf8"));
  const next = nextRecitedWords(page);
  for (const line of page.lines) for (const word of line.words ?? []) {
    if (word.role !== "letter") continue;
    for (const unit of judgingUnitsOf(word.text, "letter", { nextWord: next.get(word.wid) })) {
      const text = raw ? unit.fullGlyph : tileGlyph(unit.fullGlyph);
      tiles[text] ??= { n: 0, src: unit.fullGlyph, ex: word.text };
      tiles[text].n += 1;
    }
  }
}
process.stdout.write(JSON.stringify(tiles));

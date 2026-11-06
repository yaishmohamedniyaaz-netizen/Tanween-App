import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { judgingTargetsOf } from '../../src/lib/judgingUnits.ts';
import { nextRecitedWords } from '../../src/lib/recitedNeighbours.ts';
const out: Record<string, unknown> = {};
const args = process.argv.slice(2);
const outputIndex = args.indexOf('--out');
const outputPath = outputIndex >= 0 ? args.splice(outputIndex, 2)[1] : 'units.json';
if (!outputPath) throw new Error('--out requires a path');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
for (const p of args.map(Number)) {
  if (!Number.isInteger(p) || p < 1 || p > 604) throw new Error(`Invalid page: ${p}`);
  const page = JSON.parse(fs.readFileSync(path.join(root, `public/pages/p${p}.json`), 'utf8')); const nx = nextRecitedWords(page);
  for (const line of page.lines) for (const w of line.words ?? []) { if (w.role !== 'letter') continue;
    const units = judgingTargetsOf(w.text, 'letter', w.wid, { nextWord: nx.get(w.wid) });
    // Ids under rule 3.0.0, which merged silent letters into their sound: reviews
    // saved then are converted by the review screen.
    const mergedTids = units.filter((u, i) => !(u.silent && u.ruleId !== 'silent-idgham-v4') &&
      !(i > 0 && units[i - 1].ruleId === 'silent-idgham-v4')).map(u => u.tid);
    out[w.wid] = { text: w.text, mergedTids, units: units
      .map(u => ({ start: u.start, end: u.end, primary: u.primaryGlyph, show: u.fullGlyph, silent: !!u.silent, tid: u.tid })) }; }
}
fs.writeFileSync(outputPath, JSON.stringify(out));
console.log(Object.keys(out).length);

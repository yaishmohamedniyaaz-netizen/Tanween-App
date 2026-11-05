import fs from 'node:fs';
import { judgingTargetsOf } from '../../src/lib/judgingUnits.ts';
import { nextRecitedWords } from '../../src/lib/recitedNeighbours.ts';
const out: Record<string, unknown> = {};
for (const p of process.argv.slice(2).map(Number)) {
  const page = JSON.parse(fs.readFileSync(`../../public/pages/p${p}.json`, 'utf8')); const nx = nextRecitedWords(page);
  for (const line of page.lines) for (const w of line.words ?? []) { if (w.role !== 'letter') continue;
    out[w.wid] = { text: w.text, units: judgingTargetsOf(w.text, 'letter', w.wid, { nextWord: nx.get(w.wid) })
      .map(u => ({ start: u.start, end: u.end, primary: u.primaryGlyph, show: u.audibleGlyph ?? u.fullGlyph, tid: u.tid })) }; }
}
fs.writeFileSync('units.json', JSON.stringify(out));
console.log(Object.keys(out).length);

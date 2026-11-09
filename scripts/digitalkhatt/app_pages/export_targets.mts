// Export every selectable word of every page (recited words and printed
// Basmala words) with the app's own letter units. Runs the unchanged app
// rules: judgingTargetsOf with the same next-word context the Mushaf uses.
// Usage: node --experimental-strip-types export_targets.mts > targets.json
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { judgingTargetsOf, TARGET_RULE_VERSION } from '../../../src/lib/judgingUnits.ts';
import { nextRecitedWords } from '../../../src/lib/recitedNeighbours.ts';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const pages = [];
for (let page = 1; page <= 604; page++) {
  const data = JSON.parse(fs.readFileSync(path.join(root, `public/pages/p${page}.json`), 'utf8'));
  const next = nextRecitedWords(data);
  const words = [];
  for (const line of data.lines) {
    if (!('words' in line)) continue;
    for (const w of line.words) {
      if (w.role !== 'letter') continue;
      words.push({
        wid: w.wid, line: line.n, text: w.text, basmala: line.type === 'basmala',
        targets: judgingTargetsOf(w.text, 'letter', w.wid, { nextWord: next.get(w.wid) }),
      });
    }
  }
  pages.push({ page, words });
}
process.stdout.write(JSON.stringify({ ruleVersion: TARGET_RULE_VERSION, pages }));

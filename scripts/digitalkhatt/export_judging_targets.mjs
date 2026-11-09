// Research only: execute the app's unchanged rules, never reproduce them.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { judgingTargetsOf, TARGET_RULE_VERSION } from '../../src/lib/judgingUnits.ts';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const pages = [];
for (let page = 1; page <= 604; page++) {
  const data = JSON.parse(fs.readFileSync(path.join(root, `public/mushaf/1405-artwork-5a5f9f3846158475/p${page}.json`), 'utf8'));
  const words = data.words.filter(w => w.role === 'letter');
  const nextWords = new Map();
  data.words.forEach((w, i) => {
    const next = data.words[i+1];
    if (w.role === 'letter' && next?.role === 'letter' && w.surah === next.surah && w.ayah === next.ayah) nextWords.set(w.wid, next.text);
  });
  pages.push({ page, words: words.map((w, i) => ({wid:w.wid, line:w.line, text:w.text,
    targets:judgingTargetsOf(w.text, 'letter', w.wid, {nextWord:nextWords.get(w.wid)})})) });
}
process.stdout.write(JSON.stringify({ruleVersion:TARGET_RULE_VERSION, context:'next word on same page and within same ayah; stop at ayah boundaries', pages}));

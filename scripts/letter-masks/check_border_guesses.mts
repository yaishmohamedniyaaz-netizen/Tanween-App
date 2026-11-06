/** Independent corpus check against current app units and immutable word boxes. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { judgingTargetsOf, TARGET_RULE_VERSION } from '../../src/lib/judgingUnits.ts';
import { nextRecitedWords } from '../../src/lib/recitedNeighbours.ts';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const read = (p: string) => JSON.parse(fs.readFileSync(path.join(root, p), 'utf8'));
const index = read('public/letter-borders-guess/index.json');
assert.equal(index.ruleVersion, TARGET_RULE_VERSION);
assert.deepEqual(index.pages, Array.from({ length: 604 }, (_, i) => i + 1));
const counts = { words: 0, approved: 0, guessed: 0, high: 0, medium: 0, low: 0, letters: 0, silentLetters: 0 };
const approvedExceptions: { wid: string; kind: string }[] = [];
const pages = [];
const seen = new Set<string>();
let minWidth = Infinity;
for (const p of index.pages) {
  const guesses = read(`public/letter-borders-guess/p${p}.json`);
  assert.equal(guesses.page, p); assert.equal(guesses.ruleVersion, TARGET_RULE_VERSION);
  assert.equal(guesses.method, index.method);
  const approvedPath = `public/letter-borders/p${p}.json`;
  const approved = fs.existsSync(path.join(root, approvedPath)) ? read(approvedPath).words : {};
  const artwork = read(`public/mushaf/1405-artwork-5a5f9f3846158475/p${p}.json`);
  const body = new Map<string, number[]>(artwork.words.map((w: any) => [w.wid, w.body]));
  const page = read(`public/pages/p${p}.json`);
  const nx = nextRecitedWords(page);
  // The 448 synthetic printed-basmala targets have no registered artwork boxes.
  // This task covers the 77,433 letter words in the immutable artwork geometry.
  const artworkIds = new Set(artwork.words.filter((w: any) => w.role === 'letter').map((w: any) => w.wid));
  const words = page.lines.flatMap((l: any) => l.words ?? []).filter((w: any) => artworkIds.has(w.wid));
  const pc = { page: p, words: words.length, approved: 0, guessed: 0, high: 0, medium: 0, low: 0 };
  assert.equal(Object.keys(guesses.words).length + Object.keys(approved).length, words.length, `p${p} complete`);
  const expected = new Set(words.map((w: any) => w.wid));
  for (const wid of [...Object.keys(guesses.words), ...Object.keys(approved)]) assert.ok(expected.has(wid), `unexpected ${wid}`);
  for (const w of words) {
    assert.ok(!seen.has(w.wid), `duplicate ${w.wid}`); seen.add(w.wid);
    assert.ok(!(approved[w.wid] && guesses.words[w.wid]), `approved overlap ${w.wid}`);
    const isApproved = !!approved[w.wid];
    const value = approved[w.wid] ?? guesses.words[w.wid];
    const units = judgingTargetsOf(w.text, 'letter', w.wid, { nextWord: nx.get(w.wid) });
    assert.deepEqual(value.tids, units.map(u => u.tid), `${w.wid} tids`);
    assert.equal(value.x.length, units.length + 1, `${w.wid} cut count`);
    assert.ok(value.x.every(Number.isInteger), `${w.wid} integers`);
    const box = body.get(w.wid)!;
    const inBox = value.x.at(-1) >= box[0] && value.x[0] <= box[2];
    const widths = value.x.slice(1).map((x: number, i: number) => value.x[i] - x);
    assert.ok(widths.every((x: number) => x > 0), `${w.wid} strictly decreasing`);
    if (isApproved) {
      pc.approved++; counts.approved++;
      if (!inBox) approvedExceptions.push({ wid: w.wid, kind: 'outside body' });
      if (widths.some((x: number) => x < 2)) approvedExceptions.push({ wid: w.wid, kind: 'width below 2' });
    } else {
      assert.ok(inBox, `${w.wid} inside body`);
      assert.ok(widths.every((x: number) => x >= 2), `${w.wid} minimum width`);
      minWidth = Math.min(minWidth, ...widths);
      assert.ok(['high','medium','low'].includes(value.confidence), `${w.wid} confidence`);
      assert.ok(['copy','shape','joint','fallback'].includes(value.source), `${w.wid} source`);
      const level = value.confidence as 'high' | 'medium' | 'low';
      pc.guessed++; pc[level]++; counts.guessed++; counts[level]++;
      counts.letters += units.length;
      counts.silentLetters += units.filter(u => u.silent).length;
    }
    counts.words++;
  }
  pages.push(pc);
}
const queue = read('scripts/letter-masks/review-queue.json').words;
assert.equal(queue.length, counts.low);
assert.equal(new Set(queue.map((w: any) => w.wid)).size, queue.length);
const guessedPages = new Map(index.pages.map((p: number) => [p,read(`public/letter-borders-guess/p${p}.json`)]));
for (let i = 0; i < queue.length; i++) {
  const w = queue[i];
  assert.equal((guessedPages.get(w.page) as any).words[w.wid].confidence, 'low');
  if (i) assert.ok(queue[i-1].occurrences >= w.occurrences);
}
const generated = read('scripts/letter-masks/full-mushaf-report.json');
assert.deepEqual(generated.pages, pages, 'reported per-page counts');
const report = { passed: true, pages: 604, counts, minGuessedLetterWidth: minWidth, approvedExceptions };
fs.writeFileSync(path.join(root,'scripts/letter-masks/validation-report.json'), JSON.stringify(report) + '\n');
console.log(JSON.stringify(report, null, 2));

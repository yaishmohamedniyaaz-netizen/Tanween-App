// Validate captured browser measurements against the independent Quran fixtures.
// Run after capturing desktop-audit.json and compact-audit.json via browser UI.
import { readFileSync, writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';

const dir = new URL('./evidence/', import.meta.url);
const read = name => JSON.parse(readFileSync(new URL(name, dir), 'utf8'));
const desktop = read('desktop-audit.json');
const compact = read('compact-audit.json');
let sourceTokens = 0, maxCrossViewportDrift = 0;
for (const report of [desktop, compact]) {
  assert.equal(report.summary.fonts, 'loaded');
  assert.deepEqual(report.summary.failures, []);
  assert.ok(report.summary.maxWordDrift < .001);
  assert.ok(report.summary.maxLineDrift < .001);
  for (const row of report.canonical) {
    const source = JSON.parse(readFileSync(new URL(`../../public/pages/p${row.page}.json`, import.meta.url), 'utf8'));
    const expected = source.lines.flatMap(line => line.words ?? []).map(word => ({ id: word.wid, glyph: word.glyph ?? word.text, role: word.role }));
    assert.deepEqual(row.words.map(({ id, glyph, role }) => ({ id, glyph, role })), expected);
    assert.equal(row.lines.length, source.lines.length);
    if (report === desktop) sourceTokens += expected.length;
  }
}
for (const row of compact.canonical) {
  const base = desktop.canonical.find(other => other.page === row.page);
  for (const kind of ['words', 'lines']) row[kind].forEach((value, index) => {
    const rect = kind === 'words' ? value.box : value;
    const original = kind === 'words' ? base[kind][index].box : base[kind][index];
    rect.forEach((number, axis) => {
      maxCrossViewportDrift = Math.max(maxCrossViewportDrift, Math.abs(number - original[axis]));
    });
  });
}
assert.ok(maxCrossViewportDrift < .001);
const interactions = read('compact-interactions.json');
for (const test of interactions) {
  assert.deepEqual(test.before.missedCenters, []);
  assert.equal(test.before.overflowX, 0);
  assert.equal(test.after.selected, test.after.last);
  assert.equal(test.before.width, test.after.width);
  assert.equal(test.before.height, test.after.height);
}
const summary = {
  sourcePages: desktop.canonical.map(row => row.page), sourceTokens,
  scaleCases: desktop.summary.cases + compact.summary.cases,
  geometryComparisons: desktop.summary.checks + compact.summary.checks,
  maxScaleDriftCanonicalPx: Math.max(desktop.summary.maxWordDrift, desktop.summary.maxLineDrift, compact.summary.maxWordDrift, compact.summary.maxLineDrift) * 532,
  maxCrossViewportDriftCanonicalPx: maxCrossViewportDrift * 532,
  selectableWordCenters: interactions.reduce((sum, test) => sum + test.before.targets, 0),
  clickAndKeyboardPairs: interactions.length,
  note: 'Browser viewport and CSS scale checks. Native browser zoom and production overlay interactions are not covered.',
};
writeFileSync(new URL('verified-summary.json', dir), JSON.stringify(summary, null, 2) + '\n');
console.log(JSON.stringify(summary, null, 2));

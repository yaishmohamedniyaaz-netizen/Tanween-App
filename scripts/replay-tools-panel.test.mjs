import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = path => readFileSync(new URL(path, import.meta.url), 'utf8');
const panel = read('../src/components/ReplayToolsPanel.tsx');
const player = read('../src/components/RecitationReplayPlayer.tsx');
test('timing dialog uses native modality, explicit discard and focus return', () => {
  assert.match(panel, /node\.showModal\(\)/);
  assert.match(panel, /event\.preventDefault\(\); requestClose\(\)/);
  assert.match(panel, /if \(busy\) return; if \(dirty\) setConfirm\(true\)/);
  assert.match(panel, /trigger\.current\?\.focus\(\{ preventScroll: true \}\)/);
  assert.match(panel, /onDiscard\(\); finish\(\)/);
});
test('tools relocate controls only and retain revision persistence', () => {
  assert.equal((player.match(/<audio /g) || []).length, 1);
  assert.match(player, /toolsOpen \? toolsTransport : context\.transportTarget/);
  assert.match(player, /onClose=\{\(\) => \{ pauseTools\(\); cancelAnalysis\(\); setToolsOpen\(false\)/);
  assert.match(player, /await appendReplayRevision\(entry\)/);
  assert.match(player, /disabled=\{busy \|\| timingDirty\}/);
  assert.match(player, /context\.onTimingWordSelect \?\? context\.onWordSelect/);
  assert.match(player, /Preview short interval/);
});
test('discard confirmation disables editor actions and cannot dismiss during save', () => {
  assert.match(panel, /<fieldset className="replay-tools-content" disabled=\{confirm\}/);
  assert.match(panel, /const finish = \(\) => \{\s*if \(busy\) return;/);
  assert.match(panel, /disabled=\{busy\} onClick=\{\(\) => \{ if \(busy\) return; onDiscard\(\); finish\(\); \}\}>Discard changes/);
});
test('dock off state supplies both theme foreground and background', () => {
  const css = read('../src/styles/replayPlayerLayout.css');
  assert.match(css, /button\[aria-pressed="false"\] \{ background: var\(--surface\); color: var\(--ink\);/);
});

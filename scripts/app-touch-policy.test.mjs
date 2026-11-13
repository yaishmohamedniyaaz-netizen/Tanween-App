import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { installAppTouchPolicy } from '../src/lib/appTouchPolicy.ts';

const css = (path) => readFileSync(path, 'utf8');
const allCss = () => [
  ...readdirSync('src/styles').filter((f) => f.endsWith('.css')).map((f) => `src/styles/${f}`),
  ...readdirSync('src/components').filter((f) => f.endsWith('.css')).map((f) => `src/components/${f}`),
];

test('the browser cannot zoom the app interface', () => {
  assert.match(readFileSync('index.html', 'utf8'), /maximum-scale=1\.0, user-scalable=no, viewport-fit=cover/);
  assert.match(css('src/styles/global.css'), /html,\nbody \{\n  overscroll-behavior: none;\n  touch-action: pan-x pan-y;/);
  for (const file of allCss()) {
    // One element that allows pinch-zoom re-enables zoom for that region (and iOS field auto-zoom).
    assert.doesNotMatch(css(file).replace(/\/\*[\s\S]*?\*\//g, ''), /pinch-zoom|touch-action:\s*manipulation/, file);
  }
});

test('touch screens do not select labels but fields stay editable', () => {
  const source = css('src/styles/global.css');
  assert.match(source, /@media \(pointer: coarse\) \{\n  body \{\n    -webkit-user-select: none;\n    user-select: none;\n    -webkit-touch-callout: none;/);
  assert.match(source, /input,\n  textarea,\n  select,\n  \[contenteditable\]:not\(\[contenteditable="false"\]\) \{\n    -webkit-user-select: text;/);
});

test('full-screen judging is pinned to the viewport and the Mushaf does not bounce', () => {
  const source = css('src/styles/global.css');
  const pinned = source.match(/position: fixed;\n    top: 0;\n    right: 0;\n    left: 0;\n    height: 100svh;/g) ?? [];
  assert.equal(pinned.length, 2, 'phone deck and wide judge layouts');
  assert.match(css('src/components/fixedMushaf.css'), /\.app\.view-judge \.mushaf-shell \{ overscroll-behavior: none; \}/);
});

test('Safari pinch gesture events are cancelled and can be removed', () => {
  const target = new EventTarget();
  const remove = installAppTouchPolicy(target);
  for (const name of ['gesturestart', 'gesturechange', 'gestureend']) {
    const event = new Event(name, { cancelable: true });
    target.dispatchEvent(event);
    assert.equal(event.defaultPrevented, true, name);
  }
  remove();
  const after = new Event('gesturestart', { cancelable: true });
  target.dispatchEvent(after);
  assert.equal(after.defaultPrevented, false);
});

test('drag and hold: the resting word fills from its middle, timed to the dwell', () => {
  const mushaf = readFileSync('src/components/Mushaf.tsx', 'utf8');
  assert.match(mushaf, /const DRAG_FILL_MS = DRAG_DWELL_MS - DRAG_FILL_WAIT_MS;/);
  assert.match(mushaf, /data-drag-fill=\{marking\.order === "drag-hold" \? "" : undefined\}/);
  assert.match(mushaf, /\$\{isDwell \? " dwell" : ""\}/);
  const source = css('src/styles/global.css');
  assert.match(source, /\.hit-layer\[data-drag-fill\] \.hit::before \{\n  transform: scale\(0\);/);
  assert.match(source, /\.hit-layer\[data-drag-fill\] \.hit\.dwell::before \{\n  background: var\(--hold-wash-strong\);\n  transform: none;/);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fixedPaperPresentation, mobileMushafFit, boundedMobileZoom } from '../src/lib/mobileMushafPresentation.ts';
import { readDevicePreferences, DEVICE_PREFERENCES_KEY, LEGACY_PAGE_ZOOM_KEY } from '../src/lib/devicePreferences.ts';

test('compact paper removes margins without changing artwork or word-coordinate scale', () => {
  const old = fixedPaperPresentation(), mobile = fixedPaperPresentation(true);
  assert.equal(old.width, 532);
  assert.equal(old.height, 28 + 3106 * 508 / 1920);
  assert.equal(mobile.artScale, old.artScale);
  assert.equal(old.width - mobile.width, 16);
  assert.equal(old.height - mobile.height, 16);
  for (const paper of [old, mobile]) {
    assert.equal(paper.inset * 2 + 1920 * paper.artScale, paper.width);
    assert.equal(paper.top + 3106 * paper.artScale + paper.bottom, paper.height);
  }
});

test('requested zoom keeps the full paper and 44px navigation inside both axes', () => {
  const ratio = fixedPaperPresentation(true).aspectRatio;
  // Includes reduced usable heights representing browser chrome / PWA safe areas.
  for (const [width, height] of [[386,691],[382,590],[312,407],[422,733],[386,598]]) {
    const {base, maximum} = mobileMushafFit(width,height);
    for (const requested of [100,105,110,125,150]) {
      const result = boundedMobileZoom(base,maximum,requested);
      assert.ok(result.width <= width);
      assert.ok(result.width/ratio + 48 + 8 <= height + 0.01);
      assert.ok(result.scale > 0);
      if (result.constrained) assert.ok(result.scale < requested / 100);
    }
  }
});

test('mobile 110 fallback never overwrites a saved current or legacy zoom', () => {
  const storage = entries => ({getItem:key => entries[key] ?? null});
  assert.equal(readDevicePreferences(storage({}),110).mushafZoom,110);
  assert.equal(readDevicePreferences(storage({})).mushafZoom,100);
  assert.equal(readDevicePreferences(storage({[DEVICE_PREFERENCES_KEY]:JSON.stringify({mushafZoom:100})}),110).mushafZoom,100);
  assert.equal(readDevicePreferences(storage({[LEGACY_PAGE_ZOOM_KEY]:'125'}),110).mushafZoom,125);
});

test('touch ownership, rotation cancellation and fitted disclosure are explicit', () => {
  const css = readFileSync('src/components/fixedMushaf.css','utf8');
  const mushaf = readFileSync('src/components/Mushaf.tsx','utf8');
  assert.match(css,/\.app\.view-judge \.page-fixed-mushaf \.hit \{ touch-action: pinch-zoom; \}/);
  assert.match(mushaf,/window\.addEventListener\('resize', closeAll\)/);
  assert.match(mushaf,/onPointerCancel=\{judgingEnabled \? closeAll/);
  assert.match(readFileSync('src/components/MushafSizeControl.tsx','utf8'),/Fit to screen, \$\{value\} percent requested/);
});

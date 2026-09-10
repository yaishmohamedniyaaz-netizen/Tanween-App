import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fixedPaperPresentation, mobileMushafFit, boundedMobileZoom, MOBILE_MUSHAF_DEFAULT_ZOOM, MOBILE_MUSHAF_TOP_GAP, MOBILE_MUSHAF_NAV_SPACE } from '../src/lib/mobileMushafPresentation.ts';
import { readDevicePreferences, DEVICE_PREFERENCES_KEY, LEGACY_PAGE_ZOOM_KEY } from '../src/lib/devicePreferences.ts';

test('compact paper removes margins without changing artwork or word-coordinate scale', () => {
  const old = fixedPaperPresentation(), mobile = fixedPaperPresentation(true);
  assert.equal(old.width, 532);
  assert.equal(old.height, 28 + 3106 * 508 / 1920);
  assert.equal(mobile.artScale, old.artScale);
  assert.equal(old.width - mobile.width, 20);
  assert.equal(old.height - mobile.height, 18);
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
      assert.ok(result.width/ratio + MOBILE_MUSHAF_NAV_SPACE + MOBILE_MUSHAF_TOP_GAP <= height + 0.01);
      assert.ok(result.scale > 0);
      if (result.constrained) assert.ok(result.scale < requested / 100);
    }
  }
});

test('100 percent is maximal Fit and the default without overwriting saved zoom', () => {
  assert.equal(MOBILE_MUSHAF_DEFAULT_ZOOM,100);
  for (const [w,h] of [[386,602],[312,407],[422,775]]) {
    const {base,maximum}=mobileMushafFit(w,h);
    assert.equal(base,maximum);
    assert.equal(boundedMobileZoom(base,maximum,100).width,maximum);
    assert.equal(boundedMobileZoom(base,maximum,100).constrained,false);
    assert.ok(maximum+1>w || (maximum+1)/fixedPaperPresentation(true).aspectRatio+MOBILE_MUSHAF_TOP_GAP+MOBILE_MUSHAF_NAV_SPACE>h);
  }
  const storage = entries => ({getItem:key => entries[key] ?? null});
  assert.equal(readDevicePreferences(storage({}),110).mushafZoom,110);
  assert.equal(readDevicePreferences(storage({})).mushafZoom,100);
  assert.equal(readDevicePreferences(storage({[DEVICE_PREFERENCES_KEY]:JSON.stringify({mushafZoom:100})}),110).mushafZoom,100);
  assert.equal(readDevicePreferences(storage({[LEGACY_PAGE_ZOOM_KEY]:'125'}),110).mushafZoom,125);
});

test('touch ownership, rotation cancellation and fitted disclosure are explicit', () => {
  const css = readFileSync('src/components/fixedMushaf.css','utf8');
  assert.equal(MOBILE_MUSHAF_TOP_GAP, 14, 'retain the accepted pre-release top-gap baseline');
  assert.equal(MOBILE_MUSHAF_NAV_SPACE, 44, 'reserve touch targets, not extra gray padding');
  assert.match(css, /\[data-mobile-paper="true"\] \.page-nav-btn::before \{\s*inset: 4px;/);
  assert.match(css, /\[data-mobile-paper="true"\] \.page-nav-page::before \{\s*inset: 4px 2px;/);
  assert.match(css, /padding: 14px 0 0; gap: 0/);
  assert.match(css, /--mobile-judge-dock-space: calc\(94px \+ var\(--mobile-judge-safe-bottom\)\)/);
  const mushaf = readFileSync('src/components/Mushaf.tsx','utf8');
  assert.match(css,/\.app\.view-judge \.page-fixed-mushaf \.hit \{ touch-action: pinch-zoom; \}/);
  assert.match(mushaf,/window\.addEventListener\('resize', closeAll\)/);
  assert.match(mushaf,/onPointerCancel=\{judgingEnabled \? closeAll/);
  assert.match(readFileSync('src/components/MushafSizeControl.tsx','utf8'),/Fit to screen, \$\{value\} percent requested/);
});

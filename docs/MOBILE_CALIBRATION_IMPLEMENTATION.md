# Owner-selected portrait calibration — local comparison

## Status

Implemented behind `?mobileCalibration=1`; not committed, pushed or published.
The default remains unchanged. Existing uncommitted artwork geometry, offline
checks and fixed-paper corrections were retained, not reset or staged.

Retained: real App, Header, PageNav behavior, MobileJudgeDeck state, recording,
Finish validation, preferences, scoring and fixed artwork/word associations.
Recomposed: portrait paper margins, joined selector and Ready/Live dock sizing.
Removed in this opt-in view: individual selector faces and redundant spacing.

## Chosen settings

- Visible selector 84 × 28; row 37; radius 10; no dividers.
- Page number 15; arrows 20; nominal inset 15.8.
- Top gray gap 6; selector extra top gap 1; extra bottom gap 0.
- Minimum outer sides 4; paper ink-to-edge top/bottom 8.
- Dock sides 6; criteria row 44; label 12; value 14; padding 6.
- Footer 42; score 20; metadata 11; mistakes 14; Finish 15; equal thirds.

The 6/5 visible selector gaps are rounded readouts. Fit floors page width to a
whole pixel, so height-limited pages can leave less than two extra pixels above
the selector. Width-limited pages necessarily leave more space; do not stretch
the Quran disproportionately to consume it.

## Geometry and provenance

`mobile-artwork-bounds.json` contains alpha bounding boxes from all 604 original
1920 × 3106 PNGs in package `1405-artwork-5a5f9f3846158475`. Measured with Pillow
`Image.open(...).convert('RGBA').getchannel('A').getbbox()`. No image bytes changed.
Bounds use exclusive right/bottom coordinates. The source package version is
checked; a different future package falls back to retaining the entire image.
The two sparse opening pages retain their existing centered composition.

Paper margins are in screen pixels, not scaled reference padding. Artwork,
context masks and semantic word regions receive the same offset and scale.
Fit uses the actual parent dimensions after the real safe-area/header/dock
allowance. Production does not hard-code simulated iPhone system insets.

## Verified in this slice

- TypeScript and production build passed; full existing suite: 381 passed,
  one skipped because local Tilawa release assets are absent.
- Eight focused tests passed, including all 604 geometry bounds at three sizes.
- Browser checks: 390×844, 430×932 and 320×568 with explicitly simulated safe
  areas; Ready/Live page stability, page jump menu containment, page 601 jump,
  light/dark stability, word marking, Undo and Finish dialog opening passed.
- 390×844 page 601 measured 362×577.95 (owner target 362×578).
- 430×932 page 601 measured 410×652.45 (prototype approx. 411×654); deliberate
  floor-to-fit difference, not a second device-specific design.
- Jump menu originally inherited a transform-changing animation that displaced
  it transiently. The opt-in menu now uses opacity-only motion and honors
  reduced motion. Its center element uses the same 37px row as the selector.
- Browser screenshot evidence: `outputs/mobile-calibration/`.

## Not yet cleared

Follow-up safety audit: see `MOBILE_CALIBRATION_SAFETY_REPORT.md`. It supersedes
the pending list below for tests now performed and records a confirmed compact/
enlarged-text clipping issue. Core checks passed, but broad release is not cleared.

- Live desktop screenshots match byte-for-byte at 1024×768, 1280×800,
  1400×900. Ready screenshots still have differences; geometry is identical,
  but these must be diagnosed before claiming the full no-diff release gate.
- Landscape baseline itself has an extremely small page in the fixture.
  No landscape geometry changes were made. Do not claim landscape is healthy.
- Enlarged text, long-name/half-mark extremes, recording errors, pointer drag
  cancellation after rotation, physical iOS/PWA, and native keyboard need their
  remaining checks. The prototype checks do not substitute for real-app tests.
- Touch-safe variant and explicit approval of typography/touch exceptions are
  outstanding. See UNDECIDED_DECISIONS item 29.

## Reproduce

Use the existing Vite server on 5296 for isolated Playwright contexts:

    node --experimental-strip-types --test scripts/mobile-calibration.test.mjs scripts/mobile-mushaf-presentation.test.mjs
    node scripts/qa/mobile-calibration-browser.mjs baseline
    node scripts/qa/mobile-calibration-browser.mjs after
    node scripts/qa/mobile-calibration-interactions.mjs

The disposable browser handoff runs on 5320 at
`/scripts/qa/mobile-paper.html?mobileCalibration=1&simulateSafeAreas=1`.
That fixture only initializes a pristine sample or resumes its own known sample.
Safe-area simulation exists only in the fixture, not the product.

Before release: resolve the gates above, obtain visual approval, review the
combined dependency diff, then commit/push/publish and verify the hosted PWA.

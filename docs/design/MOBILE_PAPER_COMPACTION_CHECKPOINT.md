# Mobile paper compaction checkpoint

Scope: fixed Mushaf, portrait mobile, prepared/live judging. Results/replay,
scoring, saved preference format, and desktop composition are retained.

## Implemented

- Lower the prepared/live dock by 8px, retaining safe-area padding.
- Place the shared page selector below the paper in this scope only. Keep
  its 44px interaction height; desktop/landscape navigation stays above.
- Remove only added paper margins: reference width 532 to 516, horizontal
  inset 12 to 4, top 16 to 8, bottom 12 to 4. Artwork scale and coordinate
  mapping remain identical; no Quran image, ornament, or text is cropped.
- Request 110% for fresh mobile preferences; preserve existing preferences
  and desktop default 100%. Bound rendered size to the available rectangle.
  Display “Fitted” when the requested size cannot fit without clipping.
- Word hit regions own one-finger gestures, with pinch allowed by CSS.
  Existing pointer cancellation remains; resizing also dismisses selection.
  No global body-scroll lock is introduced.

## Evidence (2026-09-10)

- Full main suite: 380 passed, one optional asset test skipped.
- Final focused presentation/fixed geometry/package/integration command: 15 passed.
- Final production build and TypeScript build passed; existing large-bundle
  warning remains.
- Settled desktop screenshots are byte-identical before/after at 1024x768,
  1280x800, and 1400x900, using the same page/theme/zoom/session.
- Browser portrait inspection: 320x568, 393x852, 430x932, and a shortened
  approximately 393x759 viewport. No horizontal document overflow observed.
  The browser rounded one shortened width to 394 CSS pixels.
- At 393x852, the page is 386px wide and 623.725px tall; top 64.638px.
  Prepared and live states have identical size and vertical position; their
  horizontal centering differs by 0.2px because of fractional container size.
- At 393x852, navigation begins at y692.363 and is 44px tall, below the
  paper, above the dock. Dark and light presentations inspected.
- Opening a word selector works; mouse drag off a word leaves scroll at zero
  and does not record a mistake. Resize/rotation dismisses selection.
- Landscape keeps the ordinary non-compact presentation and scrolling.

## Acceptance still required

Browser mouse tests are not native iPhone touch tests. Physical Safari/PWA
safe areas, long-press/drag/release, pinch cancellation, and accessibility
remain device acceptance checks. Very short screens fit a smaller page;
110% is a request, not permission to crop religious text.

The isolated prepared/live fixture is scripts/qa/mobile-paper.html on
127.0.0.1:5296. It only allows seeding a sample competition without an active
session or saved results. It is not a production route.

Status: implemented and locally validated; not committed or published.
Confidence: practicality 94/100; architecture/data safety 95/100; visual
certainty 86/100 for inspected browser states, pending physical-device review.

# Mobile true Fit and spacing

Scope: fixed Mushaf, portrait prepared/live judging. No changes to score data,
results/replay, artwork files, word coordinates, or preference formats.

## Changes

- Fresh mobile default is 100; 100 now means the largest complete-page Fit,
  not a percentage of the superseded layout. Saved values remain intact.
  Values above Fit remain capped as before; their next design is deferred.
- Reserve 16px above the page, 4px between page and navigation, and a 44px
  navigation hit row. Those buttons paint inside their hit boxes, so the
  visible page-to-button gap is approximately 14px.
- Remove the last 4px of added dock bottom padding, preserving the full
  safe-area inset. Prepared/live reserved dock height becomes 102px + inset.
- Reduce only added reference-space side/bottom paper margins from 4 to 2.
  Image scale, top inset, artwork pixels and word-coordinate transforms retain
  their shared geometry. Do not crop blank-looking portions of page images.
- Align the page/selector group to the deliberate top gap instead of centering
  it. Width-limited screens can still have extra space below: no distortion or
  text clipping is allowed to consume it.

## Validation

Browser at approximately 393x759 (usable-height approximation, not native PWA):

| Measurement | Before, 100 Fit | After, 100 Fit |
| --- | ---: | ---: |
| Page width | 323px | 331px |
| Page height | 521.925px | 537.737px |
| Page top below header | 14.138px | 16px |
| Navigation bottom | 639.063px | 656.737px |
| Dock container top | about 653.6px | 657.6px |

The complete page is about 3% taller; visible selector-to-card separation is
about 19px including the 10px internal button inset and 8px card top padding.
Navigation touch boxes do not overlap the dock.

- Inspected 320x568, 393x759, 393x852 and 430x932 portrait; no horizontal
  overflow in measured compact cases. At 320x568 deliberate top spacing can
  require a smaller page. At 430x932 page width limits further growth.
- Inspected pages 388, 604 and 1; opening ornament complete. Word selection
  opens and rotation dismisses it without recording a mistake.
- Desktop screenshots at 1280x800 and 1400x900 are byte-identical to baseline.
  At 1024x768 the captured horizontal scroll position differed after navigation;
  no vertical/layout change was observed. Do not claim a zero-diff image there.
- Landscape remains outside the mobile paper branch and retains its existing
  navigation and scrolling presentation.
- Main suite: 380 pass, one optional model-asset skip. Focused fit/artwork/PWA
  suites: 20 pass. Production build passes with existing large-chunk warning.
- Prepared/live share the same spacing rules; a fresh prepared-to-live browser
  transition was not re-run in this pass. Physical iPhone acceptance remains open.

Local implementation only; awaiting visual approval before commit/publication.
Confidence: practicality 94/100, data safety 97/100, visual certainty 86/100 for
inspected browser states. Exact iPhone safe-area feel requires device review.

# Mobile calibration follow-up — owner clarification

Planning notes only, 11 September 2026. No implementation or publication.
Baseline: publicly released opt-in `?mobileCalibration=1` layout.

## Corrected interpretation

- The criteria boxes are not reported as uneven. Remove that inferred defect
  from the investigation; retain equal-width criteria as the preferred baseline.
- Adu / Raagu can feel slightly cramped, but this is a minor concern, not a
  request to widen it independently. Check realistic half-mark values.
- The bottom action row may be taller than necessary; investigate rather than
  automatically shrink it. Preserve usable touch targets and enlarged-text fallback.
- The reported numbers-too-close-to-divider issue remains in scope.

## Next research priorities

1. Page changes interrupt reading with "Loading Mushaf". User expects ready
   pages to appear immediately. Reproduce separately for adjacent/revisited
   pages, distant jumps, first download and fully downloaded/offline operation.
   Trace image fetch, stored asset lookup, decoding, geometry readiness and
   loading-placeholder behavior before attributing the delay to the network.
   Explore bounded nearby-page preparation and atomic page swaps. Never present
   old artwork as a new page or allow old/new word-hit geometry to disagree.
   Genuine first-load or missing-asset failures still require honest feedback;
   hiding a loading label alone is not a performance fix.
2. Portrait page scrolling/bounce and keyboard-induced jump-menu behavior.
3. Criteria value/divider spacing and compact selector dimensions. A joined
   selector silhouette is optional; the requested compactness is the priority.
4. Optional restrained countdown for temporary mistake feedback. The countdown
   represents dismissal time, not AI confidence or judging severity.

Leave the upper spacing unchanged pending evidence. These are research questions,
not confirmed technical causes. Existing audit findings remain applicable.

## Deferred explicitly

Hold and drag the mobile page number to scrub through page numbers, analogous
to the desktop navigation control. Do not implement in this correction pass.
Future research must decide drag direction, speed, preview versus commit,
tap-to-jump coexistence, cancellation, accessibility and page-loading behavior.
See UNDECIDED_DECISIONS item 30.

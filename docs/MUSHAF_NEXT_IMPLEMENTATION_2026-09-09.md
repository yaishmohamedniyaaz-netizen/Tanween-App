# Next implementation: reliable interactions before migration

> Historical plan and results. The active direction is now
> [Practical completion plan](./MUSHAF_PRACTICAL_COMPLETION_PLAN_2026-09-09.md).
> Exact ink-fragment ownership and closing every overlap are no longer gates.
> Ordinary word selection, intact artwork and judging-data safety remain gates.

Owner asks to plan and implement the next stages. Current public six-word
preview is accepted for this stage. Work stays in the isolated proof until
complete-page and real-ledger gates pass; this is not a request to publish
every intermediate change.

1. Extend the existing interaction regression to p412 at all four desktop/
   compact sizes, including actual browser coordinates for tiny fragment
   precedence and nearby clicks. Preserve data integrity, cancellation,
   independent findings and reload checks.
2. Encode fragment decisions as evidence-backed build data. Isolated exact
   masks may override a neighboring body only in reviewed cases. A connected
   mark must not become a remote word's hit target merely because it touches
   its predicted contour window. Keep overlapping/uncertain cases visibly
   unresolved; do not erase source ink or silently guess ownership.
3. Produce complete-page review data and an isolated read-only page inspector
   for p254, p293 and p412. Review all words together, shared line bands,
   markers, line endpoints and unresolved overlapping intervals. Complete
   coverage in the inspector is not approval to activate all words.
4. Enable complete test pages only after all target ownership checks pass.
   Then adapt the actual page surface and judging interaction owners, with
   ledger/undo/export checks and the retained bottom navigation layout.

Retain fixed original artwork, the current paper color, and uniform scaling.
No typography reshaping, new zoom controls or further layout alternatives.
Later lower the desktop artwork slightly and center the two special opening
page compositions against the physical reference.

Confidence in this sequence: practicality 95/100, architecture/data safety
93/100, visual direction 85/100. Actual completion evidence is recorded in
the results section below; readiness is not inferred from these scores.

## Implemented and checked

- Expanded six-word regression passed 262 checks over three cases and four
  viewports: 1400x900, 1024x768, 390x844 and 844x390. Exact browser-coordinate
  clicks on the p412 fragment selected `31.17.1`; nearby clicks selected
  `31.17.2`. Independent IDs, joining, recategorization, pointer/touch
  cancellation, keyboard recovery, scrolling, persistence and integrity
  failure handling passed. Browser touch emulation is not physical-device QA.
- Fixed the regression harness's scroll test: p412 at 390px width could
  already be at the bottom, so adding eight pixels did not scroll. The test
  now chooses an available direction and explicitly asserts actual movement.
  No product gesture change was needed for that failure.
- Built `CompletePageReview.tsx` at `?layout=page-review`, with one hash-bound
  package for three complete pages: 413 recited words, 29 ayah markers,
  472 source coordinate records. p254's original combined glyph maps to
  both preserved local word IDs using the established split.
- All imported source coordinates on the three pages are accounted for;
  page/line/ayah and role assertions pass. Line bands do not interpolate
  across explicit surah-header/basmala rows. Markers can be shown as geometry
  but cannot receive a mark. The inspector creates no judging records.
- The read-only inspector passed 74 browser checks: complete region counts,
  no marking targets, fixed aspect ratio, no horizontal overflow, marker
  visibility, line filtering, artwork-only mode and invalid-data rejection.
  Desktop and compact screenshots were inspected. The inspector is a
  diagnostic surface, not a replacement product layout.
- Pixel review of 31 overlapping horizontal intervals found transparent
  column candidates in 26; five remain unresolved. Inspected close-up crops
  show why a full-height empty-column criterion can be too conservative
  around overhanging diacritics and surrounding marks. Do not silently
  clip those five or equate an envelope overlap with a text defect.
- Scoped strict TypeScript and isolated Vite build passed. Production source,
  public assets, judging ledger and device preferences were not modified.
  The public site still serves the previously published six-word probe;
  the complete-page inspector is local and was not published in this slice.

## What remains before complete-page activation

The five intervals are p293 `17.107.15/17.107.16`,
`17.107.16/17.107.17`, `18.1.10/18.1.11`; p412
`31.12.8/31.12.9`, `31.18.4/31.18.5`.
These complete-page flags are separate from the earlier p11/p53/p485 remote
contour attribution questions. Full-page review coverage is implemented;
full-page marking and production integration are not yet approved/implemented.

Evidence files: `interaction-results.json`, `complete-review-results.json`,
`complete-page-review-summary.json`, `complete-page-overlap-gaps.json`, and
`remaining-page-overlaps.png` in the boundary evidence folder. Reproduce
data with `build_complete_page_review.py`, then `check_page_overlap_gaps.py`;
build the isolated Vite proof and run `test_complete_review.mjs`.

Confidence after this slice: practicality 95/100, architecture/data safety
94/100, visual certainty 84/100 for full-page activation. Further ink ownership
evidence is still required; the higher interaction-test coverage does not
raise uncertain geometry to production readiness.

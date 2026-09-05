# Accepted judging interface release — 2026-09-05

User requested shipping the accepted work without the rejected word-count
card feature. No count badges are rendered on words or in the selector.
Mistake highlights, ledger entries and their accessible total counts remain.

Included: dot-free per-target mistake fills; guarded hold-to-undo; wrapped
letter selector; opt-in source tashkeel in the More menu; aligned, tighter
score rail with optional Slim preference; square marking-menu swatches;
refined native mistake scrolling and keyboard access; slim reason dialog.

Validation: 369 tests passed after removing the six experimental card tests;
production build passed. Actual desktop preview confirmed zero card/count
badge elements and retained score and highlight display. Prior selector
fixture passed ten undo gesture checks and source-span fit checks. Latest
rail alignment measured matching label x and score centres across all four
criteria. Mobile preference/editor contract tests pass; latest density and
badge-removal changes were not visually certified on physical phones.

Experimental card components, card research and unrelated results-planning
work remain outside this release. No scoring, Quran text, target identity,
assignment or evidence reducer changes were made.

Confidence: practicality 95, architecture/data safety 98, desktop appearance
90; physical-phone behaviour remains unverified. User explicitly authorized
shipping this scope after visual review.

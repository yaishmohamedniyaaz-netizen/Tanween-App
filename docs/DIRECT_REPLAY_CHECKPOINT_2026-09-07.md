# Direct word replay — experimental checkpoint

Continues the participant workspace slice on `codex/results-overview-first`.
Not committed, pushed, published, or physically accepted on iOS.

## Retained, recomposed, removed

- Retained original recordings, audio controller, revision validation, source attribution, scoring, evidence and exports.
- Recomposed saved timing into an explicit selected-word playback action. Selecting a word does not autoplay or seek.
- Removed the requirement to open Timing tools merely to play an available saved interval. Timing tools remain available for inspection/correction.

## Behavior

- One reviewed word interval: Play word with 0.4 seconds of context.
- Suggested interval: Preview approximate word, explicitly not confirmed timing.
- Repeated occurrences: require an explicit occurrence choice before playback.
- No word interval: offer Play ayah only for an exact, reviewed ayah target in the recorded span.
- No suitable interval: explain the absence; keep whole-recording playback and Timing tools available.
- Resolve current revisions before validation; reject mismatched media and do not revive superseded timing.
- Competition recordings are now enabled in this experimental workspace, superseding the previous checkpoint's deferral.

## Verified

- Full suite: 407 tests, 406 passed, one skipped because local Tilawa release assets are absent.
- Production build and git diff whitespace checks passed. Existing large-chunk build warning remains.
- Browser fixtures use synthetic tones, explicitly not Quran recitation.
- Reviewed word selection remained paused at time zero; Play word started at 0.6 seconds and stopped around 1.9 seconds for the stored 1–1.5 second interval.
- Suggested word showed the approximate warning.
- Repeated word disabled playback until a choice; second occurrence started at 1.6 seconds for the stored 2–2.5 second interval.
- Ayah-only and missing-timing labels were verified in the browser.
- Compact dark view (requested 393x852; runtime innerWidth 394) and desktop dark 1024x768 were visually inspected.
- Phone passage dimensions and document position were identical before and after closing the panel: 350.4 x 515.288, document top 286.8 CSS pixels.

## Remaining gates

- This uses the currently selected recording part; automatic discovery across parts is not implemented.
- Automatic coverage shading is not implemented. Recognition guesses must not imply verified recitation or grading.
- Real Quran audio accuracy, physical iOS/Safari/PWA playback, accessibility acceptance and user visual approval are still outstanding.
- No claim of desktop pixel identity across all viewports for this checkpoint; previous workspace viewport checks are documented separately.
- Commit/push/publication require the release and approval workflow, including reviewing newer remote changes before integration.

Confidence: practicality 90/100; architecture/data safety 92/100; visual certainty 78/100 pending real-device and user review.

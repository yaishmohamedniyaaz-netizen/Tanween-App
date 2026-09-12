# Fade boundary diagnosis — read-only investigation

Reproduced with existing geometry and artwork in
scripts/qa/fade-boundary-audit.html (page 257, Ibrāhīm 14:14 selected).
Browser comparison visibly fades the right-hand part of the first selected
word, 14.14.0, وَلَنُسْكِنَنَّكُمُ.

Source: buildFixedPageGeometry in src/lib/fixedMushafGeometry.ts. Adjacent
ayah-end 14.13.16 body is [1243,1462,1396,1604]; next word 14.14.0 body is
[660,1455,1244,1631]. A one-pixel overlap takes the midpoint-of-centres branch,
placing the shared region edge at 1135.75 instead of near 1243–1244. The
context marker's Fade rectangle consequently extends 108.25 pixels into the
selected word's declared body. FixedMushafPageSurface uses these selection
regions for visual Fade masks, so semantic membership can be right while the
painted coverage is wrong. Reversing selection across this boundary can leave
part of a context word dark for the same reason.

Current user's 7:193–198 question was inspected on pages 175–176: inspected
boundary word classes were consistent with the question. No verified semantic
range bug established there. Original Off preference and page 9 view restored.
No marks, question assignments or production source changed.

Corpus scan found 4687 cross-ayah neighbour pairs whose computed partition
cuts into at least one declared body bound. These are geometry candidates,
NOT 4687 visually confirmed defects; bounds can include whitespace/ornaments.
Other high-displacement candidates include pages 422 and 472.

Next: assess a narrow near-edge tolerance for tiny overlaps versus separate
visual Fade geometry. Preserve hit-testing contracts; compare real ink and
test both selection directions before broad changes. Do not move the question
boundaries or hide the issue by adjusting Fade opacity. Heading/basmala and
dark/mobile checks remain open. No implementation or publication.

Confidence: reproduction 95; fix practicality 90; architecture/data safety 85;
visual certainty for a proposed fix 75 until prototyped.

## Implemented shared correction — local, not released

Replaced the discontinuous center-midpoint overlap fallback with the midpoint
of facing body bounds, clamped between word centers. This applies to every
page and to both Fade coverage and hit regions; no page-specific exceptions,
opacity changes, artwork changes or semantic selection changes.

Regression checks: all 604 pages have contiguous same-line boundaries and
retain word-center ownership (markers remain inactive); source objects are
not mutated. The 1px-overlap regression now partitions at 1243.5 rather than
1135.75. Fixed package/geometry tests: 13 passed. Full suite: 381 passed,
1 existing skipped. Production build passed, with existing chunk-size warning.

Browser diagnostic visual checks: page 257 selecting 14:14 and the opposite
side 14:13; page 422 selecting 33:34. These verify corrected masks over real
artwork, not full live-session or physical-device acceptance. Dark-mode,
mobile, heading/basmala and unusual detached-ink overlaps remain visual gates.
No scoring or assignment data modified; no commit or publication.

Confidence: practicality 95; architecture/data safety 95; visual certainty 82
pending those remaining checks and user review.

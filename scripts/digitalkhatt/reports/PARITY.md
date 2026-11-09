# DigitalKhatt Phase 0 parity

**STOP: the task's Phase 0 gate is triggered. Checkpoint 1 is not complete.**

The line and word order is promising, but literal full-page geometry does not meet the requested overlap check. Do not treat the PDF as a drop-in match to the artwork frame or start the page-mode UI without the owner's decision.

Measure | Result
--- | ---
Pages audited | 604/604
App / DigitalKhatt words | 77,433 / 77,433
Same physical line IDs and words per line | 604/604 pages
Exact skeleton matches | 77,140/77,433 words; 382/604 complete pages
Strict skeleton notation differences | 293 words on 222 pages
Extra hamza-notation diagnostic | 604/604 pages equal; diagnostic only, not an approved mapping rule
Position comparisons | 77,433/77,433 words
Zero-overlap at full-frame scale | 1,851 words on 537 pages
Full pass, strict text plus every word overlapping | 41/604 pages

## What differs

- All 604 pages have the same physical corpus rows and per-row word counts. Headers, ayah markers and 112 standalone basmala rows are excluded; Al-Fatiha's judged basmala is retained.
- All strict text differences fall within the explicitly listed hamza-notation diagnostic. For example, app `ٱلۡأٓخِرِ` versus PDF `ٱلْـٔ͏َاخِرِ` and below-seat versus above-seat hamza. This does not show different recited words or prove identical drawn glyphs. Nothing in the app's text or letter-unit rules is changed.
- Whole-frame scaling is 1920/256 horizontally and 3106/410 vertically. No fitted transform is applied. All 29 words on page 1 and all 36 on page 2 fail overlap. On most affected later pages only a few words fail; it is incorrect to say all words on 537 pages differ.
- A nonzero overlap is only a rough geometry condition, not visual approval or proof of exact glyph shape.

## Sample pages

Page | Words | Median IoU | Worst IoU | Zero-overlap words
--- | --- | --- | --- | ---
1 | 29 | 0.0 | 0.0 | 29
2 | 36 | 0.0 | 0.0 | 36
3 | 127 | 0.268585 | 0.0 | 9
50 | 135 | 0.307073 | 0.0 | 5
187 | 121 | 0.356548 | 0.0 | 2
293 | 127 | 0.505161 | 0.0 | 1
582 | 105 | 0.365897 | 0.054741 | 0
600 | 73 | 0.359111 | 0.0 | 1
604 | 58 | 0.292302 | 0.0 | 2

## Full-pass pages

8, 58, 62, 94, 127, 146, 167, 177, 196, 197, 234, 256, 265, 267, 297, 369, 427, 433, 435, 437, 455, 457, 481, 504, 506, 518, 522, 523, 529, 531, 532, 533, 559, 581, 582, 586, 590, 591, 597, 601, 602

Every other page has at least one strict text or position difference. [PARITY_DETAILS.md](PARITY_DETAILS.md) has all 604 page metrics and every exact text difference, including app word IDs. [parity.json](parity.json) additionally lists every zero-overlap word and its two boxes, per-page worst-word examples, source checksums and extraction counts.

## Method and evidence limits

The PDF's `/ActualText` supplies Unicode. All 848,524 text-show glyphs are checked against PyMuPDF traces by font and glyph code. This verifies extraction alignment, not that every glyph visibly represents its supplied Unicode. Glyph-to-letter ownership remains Phase 2 work.

Physical rows are counted from the PDF's text matrices. This is specific to the pinned source, not a generic PDF line detector. FontMatrix, text matrix, rotation, supported operators and untagged glyphs are checked; an unsupported input fails rather than silently continuing.

Geometry uses declared Type3 d1 bounds, not raster-measured ink. Every equal-count line slot is paired for geometry, even when its spelling differs; such pairs are labeled as ordinal comparisons. Zero overlap is decided before rounding.

The input PDF's SHA256 is verified before parsing. It is used for research only. No PDF, outlines, contact sheets, runtime assets or production font pipeline are published by this audit. See [LICENSING.md](LICENSING.md) for the unresolved PDF grant and the separate source-generation route.

## Decision needed

May a DigitalKhatt mode intentionally use its own page geometry, with separate handling/fallback for pages 1–2, even though it does not overlap the existing artwork boxes everywhere? Also review the hamza-notation policy before mapping app letter units. The prescribed overlap test has not been waived or silently replaced.

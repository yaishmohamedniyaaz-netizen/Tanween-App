# Main Mushaf geometry implementation — 6 September 2026

Status: implemented and checked locally in the actual judging UI. The user subsequently authorized committing this slice and opening localhost. No remote push or deployment is included in that request. The fidelity limitations below remain open.

## Scope and behavior

- Retained: original Quran text, QCF page glyphs, word/letter identities, scoring and evidence contracts, saved preferences, marking gestures, undo, and small neutral mistake-count circles.
- Recomposed: each page has a fixed 532-unit reference composition. Its outer frame scales the whole page together, including letters, gaps, margins, headers and overlays. Full lines fit intact glyph ink rather than distributing unused advance-box space between undersized words.
- Replaced: independent responsive font sizing within the shared page, advance-box highlight measurement, and selection priority that could let a neighboring word's invisible padding take a short word's hit.
- Desktop page-selector controls are separately sized to 35px with a 13px central label, approximating the preferred 110% chrome size.
- App zoom remains available and retains its saved preference. Its page content now scales as one composition.
- The segmented-letter experiment remains separate.

## Implementation

`src/lib/mushafGeometry.ts` owns the reference dimensions, intact-glyph fitting, font metric cache and word selection priority. `MushafPageSurface.tsx` supplies the uniformly scaled page and baseline sentinels. `Mushaf.tsx` measures actual ink after layout/font readiness and converts screen coordinates through the actual page scale. The visual highlight has 1 reference pixel of horizontal padding, 1.25 vertical pixels and a 1px corner radius. Logical pointer padding remains separate from visible DOM hit rectangles.

The shared page renderer is also used in Results. Its wrapper retains the caller's class for existing visibility rules. Live judging received full browser checks; the Results list was opened read-only, but a recorded Results Mushaf was not available in the inspected record and was not visually certified.

## Validation

- Full suite: **381 passed, 0 failed** (`tmp/mushaf-all-checks-final.txt`).
- TypeScript and production build passed (`tmp/mushaf-build-final.txt`). Build retains the existing large-bundle warning.
- Scoped diff whitespace check passed. Quran source/data and font files were not edited.
- All **604 page fonts**, **83,877 tokens** and **8,820 full lines** passed the font/fitting calculation sweep. This is calculation coverage, not visual approval of 604 pages.
- **14 pages × 3 widths = 42 page cases**, with **4,362 word checks**, zero overlay-bound misses and zero wrong visible-word-center DOM targets. Pages: 1, 2, 3, 4, 255, 256, 269, 270, 293, 294, 589, 590, 603 and 604. Page widths: 320, 522 and 760 pixels. Maximum coordinate drift relative to page width was 0.00000054; glyph identities were unchanged across sizes.
- Independent raster checks on **494 words** across pages 3, 4, 589 and 590 tested **2,584,929 painted pixels**: zero pixels outside the final rounded highlights at the stated alpha threshold. This does not prove every glyph on every page.
- Real component marking in the isolated QA origin: two letters of the same word received different criteria; hover color preview appeared; neutral count became 2; list undo changed it to 1 and then 0. A short tap on Hold to undo did not delete. A complete physical hold was not tested with the browser API.
- Actual app screenshots at **1400×900** and **390×844** were inspected. Neither viewport had horizontal document overflow. The existing live score (69) and 14 mistakes were preserved. Browser error log was empty.

Evidence: `outputs/mushaf-main-geometry/summary.json`, `corpus.json`, `final-size-matrix.json`, `final-pixel-checks.json`, `compact-geometry.json`, `scan-comparison.json`, `main-desktop.png`, and `main-compact.png`. Earlier intermediate outputs in that folder include failures that were fixed; use the final-prefixed checks above.

## Fidelity boundary and release gate

The implementation fixes proportional behavior and measured highlight coverage. It does **not** certify an exact printed facsimile. Six sampled horizontal scan comparisons ranged from about -4.35% to +1.72%, substantially closer to the studied reference than the prior layout. These are provisional word-to-anchor ratios; they are not full-page physical measurements. Centered lines, vertical geometry, ornaments and basmala still need source-matched visual judgment before an exact 1:1 claim.

Native browser zoom at precisely 110% and 125% was not exercised: the available embedded-browser controls supplied viewport resizing and app zoom, not verified native zoom. Physical iPhone/Safari/Android testing is also outstanding. These checks and the user's visual acceptance remain release gates.

Confidence: **practicality 95/100; architecture/data safety 96/100; visual certainty 82/100**. Visual certainty is intentionally lower because exact print matching and user acceptance remain unresolved; these scores are judgments, not success probabilities.

The disposable QA fixture uses port 5198 with a guard against the live app origin. It uses real components with separate browser storage. No real competition record was modified for testing. Unrelated dirty replay work was preserved.

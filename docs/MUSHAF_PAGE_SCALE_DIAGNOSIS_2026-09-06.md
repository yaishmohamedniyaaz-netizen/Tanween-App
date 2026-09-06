# Mushaf page proportions investigation — 6 September 2026

Status: investigation only. No application source, preferences, judging data, Quran data, commits, or deployment changed. The segmented-letter experiment remains parked. Page proportions should be settled before implementing the highlight-fit proposal.

Follow-up: [the isolated scaling proof](MUSHAF_PAGE_SCALE_PROOF_2026-09-06.md) verifies stable page proportions and identifies a printed scan reference linked by QUL. It also confirms that the measured QUL preview width below must not be adopted as a universal calibration constant.

## Finding

The current renderer does not preserve one page composition across its full size range. It combines proportional font sizing with independent font limits, margins, header dimensions, and responsive modes. The same line can therefore become crowded or widely spaced as available page size changes.

Browser zoom normally magnifies content. The intended correction is to keep word shapes, internal gaps, line rhythm and margins in the same proportions while the page gets larger or smaller. It should not attempt to cancel the user's browser zoom.

## Current source evidence

Inspected checkout HEAD: `0bdfda9`. Existing unrelated audio/replay edits and research files were preserved.

- `src/styles/global.css:5109,5212`: ayah text prefers `5.55cqi` but is clamped between 18px and 33px. The page can continue resizing outside those limits.
- `src/styles/global.css:5218–5221`: flex `space-between` distributes the width remaining after the word advances. Independent limits on text size change that remaining width. Flex justification alone is not proof of a defect; the independently changing proportions are the defect demonstrated here.
- `src/styles/global.css:5136,5157,5190–5197`: fixed page padding, a minimum header height, and clamped internal padding change the vertical proportions too.
- `src/styles/global.css:9956–9974,13858–13865`: selected mobile layouts use a different preferred font size and remove font clamps.
- `src/lib/mushafFit.ts:3–4`: the stable stage requires at least 901 CSS pixels wide and 620 high. `MushafViewport.tsx:137`, `Mushaf.tsx:154–157`, and `mushafSpread.ts:25` make compact mode display one page even when the saved preference is a spread. Browser zoom can cross this breakpoint.
- `src/lib/page.ts:9–39` preserves page, row, glyph and semantic word identity. It does not provide original printed x/y positions. `MushafPageSurface.tsx:159–188` reconstructs the page with CSS. Authentic QCF V1 glyphs and correct rows alone do not prove exact original spacing.

## Hands-on browser measurements

Live app: `http://127.0.0.1:5195/`, pages 589–590, app zoom at Fit/100%. Font status was loaded. Seven controlled viewport cases were measured, with up to 275 ayah-line tokens including verse endings per case. Phone emulation was also visually inspected; this was not a physical-phone test.

The table follows the **same first line of page 589**, including its two verse endings. “Word share” is summed layout advances divided by line width, not a count of painted black pixels. Gaps are average layout gaps; QCF ink can extend beyond those advances.

| Measured CSS viewport | Visible pages | Page width | Font size | Word share of line | Mean gap |
| --- | ---: | ---: | ---: | ---: | ---: |
| 2000 × 1400 | 2 | 760px | 33px | 70.47% | 19.80px |
| 1400 × 900 | 2 | 532px | 29.44px | 91.30% | 4.01px |
| 1120 × 720 | 2 | 392px | 21.67px | 91.32% | 2.95px |
| 934 × 600 | 1 | 342.71px | 18.93px | 91.31% | 2.58px |
| 946 × 698 | 2 | 305px | 18px | 97.63% | 0.63px |
| 758 × 558 | 1 | 314.43px | 18px | 94.69% | 1.45px |
| 390 × 844 | 1 | 374.39px | 21.40px | 94.43% | 1.81px |

The middle three cases retain nearly identical horizontal proportions. The large-page font ceiling, small-page font floor and mobile rule produce substantial deviations. This is not a universal failure at every size and should not be addressed with an arbitrary overall font increase.

### Native zoom limitation

The available in-app browser did not change its native zoom in response to `Ctrl+=`: device pixel ratio and CSS viewport stayed unchanged. The 1120×720 and approximately 933×600 cases model the CSS viewport reductions expected from a 1400×900 window at 125% and 150%; they are **viewport tests, not native browser zoom tests**. Some requested odd viewport dimensions rounded up by one pixel; the table records measured values.

The browser's original 946×698 viewport and 1.25 device pixel ratio were restored. Actual native zoom at75%,100%,125%,150% and200% remains a release check. Browser zoom, app CSS zoom and phone pinch zoom must be recorded separately. [MDN describes their different effect on devicePixelRatio](https://developer.mozilla.org/en-US/docs/Web/API/Window/devicePixelRatio).

## The matching 1405 reference

Compared the same page in the live [QUL KFGQPC V1 1405H preview](https://qul.tarteel.ai/resources/mushaf-layout/15?page=589), after fonts loaded. Its first line had a 563.29px content width, 30px font and 76.24% word share. The first glyph advance divided by font size was 0.8513, consistent with the app's approximately 0.851 values. The mismatch is therefore visible in layout proportions without needing to replace that glyph.

QUL documents the selected edition as 604 pages with 15 lines, and requires a matching layout, script and font. Its layout schema specifies rows, alignment and word ranges. [Source and rendering guidance](https://qul.tarteel.ai/resources/mushaf-layout/15).

**Boundary:** this is a digital reference preview, not an independently authenticated scan of a printed 1405 copy. Do not blindly adopt its website margins, colors or page frame, or claim pixel-perfect printed fidelity from this comparison. A matching printed-page reference is still needed for final calibration. The current middle-size composition is more tightly packed than this QUL preview, so “copy the 125% appearance” and “match 1405” cannot be assumed equivalent.

## Recommended next slice

1. Establish a single reference-calibrated 1405 composition: text-to-line-width ratio, line rhythm, internal margins, centered lines and opening-page exceptions. Compare pages 1,2,3,255,589,590 and604 to matching references before choosing final constants.
2. Scale that composition as one unit. Keep responsive toolbars, scoring panels and the decision to show one/two pages outside the page typography. Retain the original word glyphs, tashkeel, semantic IDs, source rows and judging actions. Replace the independent internal sizing rules with a shared scale.
3. Validate the geometry at every size before applying highlight changes. Then measure actual word ink in that stable composition, including right-side overhangs and long meem tails.

The first proof should be a small isolated comparison, not a broad change to the live judging screen. A fixed internal page with a uniform scale is the clearest model; consistently proportional CSS may achieve the same with fewer structural changes. Choose based on measured layout and interaction accuracy, not implementation preference.

Do not make all gaps identical across different source lines, stretch Arabic glyphs horizontally, reflow source word membership, or introduce manual per-word nudges. Centered/short lines must retain their own source structure. A full-page view on a narrower screen necessarily has smaller text; larger reading size can use the existing page zoom/pan behavior while preserving proportions.

### Checks before approval

- Normalize every word's x/y/width/height and line spacing by page size: the same page should retain those normalized values to within rounding, including through layout transitions. Record page numbers so a spread-to-single transition does not contaminate comparisons.
- Check native desktop browser zoom 75/100/125/150/200%, app Fit/125/150%, large desktop windows and compact 360/390/430px widths. Font readiness is mandatory.
- Check opening and centered lines, adjacent-page navigation, verse ornaments, tashkeel and long descenders. Inspect actual screenshots; numerical invariants alone do not prove faithful calligraphy.
- Update overlay coordinate conversion coherently if a new scale is introduced. `Mushaf.tsx:308–339,746` already measures screen rectangles and applies app renderScale; it must not double-apply browser zoom. Test marking and undo on first and later lines and near page edges. Neutral count circles intentionally have screen-relative sizing and need a separate legibility check.
- Review the same source page in live judging and Results, which share `MushafPageSurface`.
- Preserve score/evidence/preference contracts. Require user visual approval before commit or publication.

## Confidence

- **Practicality 94/100:** demonstrated scaling cause and bounded correction. Ready for the isolated geometry proof.
- **Architecture/data safety 97/100:** no Quran content or scoring changes needed; transformed interaction coordinates are the main implementation risk.
- **Visual certainty 76/100:** the proportion defect is visibly confirmed and a matching digital source was inspected. Final 1405 calibration and actual native zoom still need validation; not production-ready visually.

## Reproducible evidence

`outputs/mushaf-scale-study/viewport-metrics.json` contains raw live-app measurements. `qul-589-metrics.json` records the matching source DOM geometry. `summary.json` is generated by `node outputs/mushaf-scale-study/summarize.mjs`. PNG files capture large/normal/compact app views and the source page. These files are investigation artifacts, not production assets.

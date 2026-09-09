# Compact Mushaf alternatives: bounded visual proof

2026-09-09. Three isolated alternatives are available at `http://127.0.0.1:5294/?layout=compact&revision=4`. Use A/B/C in the study header to compare at identical page scale. This is a read-only layout study, not a production renderer migration. No commit or publication was performed.

## What changed

- Retained: original source artwork, paper `#fbfaf7`, centered composition, consecutive-page sample convention, existing zoom range and scrolling behavior. The ten source pages and word geometry were not edited.
- Recomposed: the bottom selector follows the previous PageNav number/range and chevron pattern, with an upward page-jump disclosure. This is an isolated adaptation with sample navigation, not the complete production PageNav component.
- Removed: visible Page/Pages labels, default surah/juz metadata, large selector housing and shadow. Page numbers remain at the outside bottom corners. Optional metadata can be added later without an empty reserved band now.
- Added: 10px top padding (11px including border), 6px side padding and 8px top corner radius. Artwork is neither cropped nor internally repositioned. Main-app integration must apply the same outer transform to the artwork and its interaction layer.

Desktop footer height is 44px instead of 64px. The selector's visual number field is 78 by 30px; its clickable area is 82 by 44px. Arrow targets are 38 by 44px. These targets stay below the artwork.

## Alternatives and provisional judgment

| Direction | Benefit | Cost / uncertainty |
| --- | --- | --- |
| A: rounded joins | Small paper connection at the seam; closest to the requested compact control | The curved join is deliberately subtle; user review must determine whether it reads as sufficiently connected |
| B: slim bridge | More explicit connection between the pages | Still has a visible tray outline and can retain some of the rejected housing's visual weight |
| C: open seam | Least connecting decoration | Control sits slightly lower and appears less integrated with the pages |

Provisional preference: A. B and C are comparison controls, not approved alternatives. All three preserve exactly the same image size at each tested viewport. Screenshots are in `outputs/mushaf-bounded-proof-2026-09-09/compact-{A,B,C}-p50.png`, with additional p576 and p604 captures. Compact A captures cover 1024px, 390px and 844px widths.

## Research basis

Removing metadata and repeated labels follows [NN/g's aesthetic and minimalist design guidance](https://www.nngroup.com/articles/aesthetic-minimalist-design/): information should justify the attention it takes from the primary task. Maintaining recognizable arrows, a bounded number field and focus/hover feedback follows [NN/g's flat-design guidance](https://www.nngroup.com/articles/flat-design-best-practices/); removing decoration must not remove indications that a control is interactive.

The jump form uses a button with expanded state and an associated panel, consistent with the [WAI-ARIA disclosure pattern](https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/). It is not an application menu. Visually small controls retain larger activation areas, exceeding the [WCAG 2.2 minimum target size](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum). These principles do not prescribe the bridge shape or radius; those remain visual judgments governed by the local design grammar and owner review.

## Measured trade-offs

| Chromium viewport | Previous image width | Compact image width | Previous / compact footer |
| --- | ---: | ---: | ---: |
| 1400 x 900 | 439.36px | 445.53px | 64 / 44px |
| 1024 x 768 | 357.77px | 363.94px | 64 / 44px |
| 390 x 844 | 356px | 344px | 90 / 44px |
| 844 x 390 | 758px | 746px | 60 / 44px |

Desktop gains roughly 1.4-1.7% in image width while improving top clearance. A width-limited phone gives up 12px, about 3.4%, to the two new side insets. This is an explicit comfort-versus-reading-size trade-off; the layout does not recover arbitrary size while also adding padding. Existing short-landscape scrolling remains; it is not a new zoom proposal. Fit dimensions change with the shell, but zoom controls and page proportions are preserved.

## Validation and limits

- Isolated Vite build and strict TypeScript check passed.
- 48 compact cases passed: four viewports, four sample selections (2, 50, 576, 604), three directions. Verified equal image scale across directions, centering, no document overflow, original image aspect ratio, paper color, footer-only numerals, top inset, radii and unobstructed navigation targets below the artwork.
- 20 interaction checks passed across those viewports: keyboard opening/input focus, Escape focus restoration, unavailable-page handling, sample navigation and existing zoom availability.
- An initial short-viewport popup collision with the header was corrected by bounding the disclosure height and allowing it to scroll. Pointer-based page jumps passed afterward.
- The existing marking proof regression passed 54 cases and 11 interaction checks, with no browser errors. Its limited cached-page offline checks also passed. This does not certify the ten-page layout study or all 604 pages for offline use.
- Reviewed fresh desktop, portrait and short-landscape Chromium screenshots. These are separate browser contexts, not the user's exact live tab and not physical iOS/Android acceptance.
- Production tracked source, scripts, public assets and package files have no content diff from this work. Existing unrelated/untracked work was preserved.

This study does not fix the known p254 combined-word mismatch or the p293 overlapping word rectangles. It does not establish exact physical-edition provenance, all-page annotation correctness, performance for the full asset collection or production accessibility. Sample pairs follow the current app's consecutive-page convention; they are not a certification of physical binding order.

Next decision: visually choose or refine the compact shell. Then resume source-to-word correspondence research for those two blocked cases, followed by bounded adoption checks. Cosmetic shell approval must not bypass that geometry gate.

Confidence: practicality **94/100**; architecture/data safety **95/100** for the isolated study; visual certainty **82/100**, pending owner review. These scores are not production acceptance.

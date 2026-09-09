# Mushaf fidelity and highlight calibration

Follow-up: the user's screenshots resolve the visible-highlight direction in favor of shared line bands. Ink anatomy still explains the existing irregular rectangles, but it should no longer dictate the proposed wash height. The [reuse-options report](MUSHAF_REUSE_AND_LINE_HIGHLIGHT_OPTIONS_2026-09-09.md) supersedes this document's next-step recommendation with a proof of existing Quran.com 1405 page assets and paired coordinates. The measurements below remain unchanged.

The current QCF word forms remain a credible foundation, but changing the spacing formula alone has not demonstrated a proportional match to the 1405 printed Mushaf. A fresh comparison across three source-linked scans finds that native font advances improve typical word placement while leaving material errors. The recommended direction is to derive and approve page geometry against a fixed reference, then use that same geometry for text, highlights and interactions.

The highlight complaint has a partly independent cause. The current implementation already measures visible word ink. Different calligraphic heights, stopping signs, tails and remote contours therefore produce different rectangles even at an identical font size. A layout correction should remove arbitrary scaling and positioning errors; it should not promise identical rectangles around anatomically different words.

This is a research decision record. It supersedes neither the religious source assets nor the existing judging rules. The application remains unchanged by this investigation. The broader [stability feasibility plan](MUSHAF_STABILITY_FEASIBILITY_PLAN_2026-09-08.md) remains the release framework; the findings below narrow its next typography decision.

## Evidence and its authority

The inspected repository HEAD is `b753d559abab2b00a8bc397111f5e87164f92805`. The evidence package records SHA-256 hashes for the four relevant source files, thirteen page JSON files and thirteen QCF font samples. The analysis used existing local assets and did not download or modify Quran text or fonts.

QUL labels the selected resource “KFGQPC V1 layout (1405H print).” Its published schema specifies page and line membership, alignment and word ranges. It does not supply original printed word origins or measured page proportions.^1 Its pinned Mushaf model points the V1 edition to the old Madinah collection on tafsir.app.^2

That linkage makes the three existing scans useful research references. It does not independently authenticate every scan against the colophon and dimensions of a particular physical copy. The study used pages 3, 589 and 604, stored locally as 759 × 1100 pixel images. Their remote source locations are listed below.^3 The scan page is offset by two in those URLs. This must remain an explicit manifest rule rather than an assumption applied to another collection.

The existing font files were shaped with HarfBuzz for geometric measurements. On the three pages used for raster matching, the fonts have no GSUB/GPOS tables; the script verifies that the previous TTF conversion has the same glyph, advance and character-map tables as the measured WOFF2. Thirteen-font anatomy measurements include fonts that do have shaping tables and use complete shaped word strings.

The original three scan images were visually inspected. The automatically detected word matches have not received complete human proofreading. There is no new browser screenshot, physical-device test, full-page rendered facsimile comparison or 604-page certification in this evidence.

## What the current code actually does

The earlier highlight diagnosis from 6 September concerned an older implementation. It should not be repeated as if all its defects still exist.

Current source findings:

| Responsibility | Current behavior | Consequence |
| --- | --- | --- |
| Full-line composition | `fitMushafLine` sums word ink widths, adds a 0.04em gap and fits each line to the available width. | Different rows can receive different font sizes. Ink packing replaces natural font bearings. |
| Word placement | `MushafPageSurface` adjusts each word's margins using its measured bearings. | A stable layout can differ from the printed inter-word distribution. |
| Centered lines | Use a median full-line font size, or a 33px fallback, constrained by advance width. | Opening and closing compositions require separate reference checks. |
| Page fitting | A 532-unit reference page with aspect ratio 0.68 scales as a whole. | Useful stability mechanism; these constants are not a certified print measurement. |
| Visible word rectangle | `Mushaf.tsx` measures ink relative to an explicit baseline and adds 1 reference unit on each horizontal side and 1.25 on each vertical side. | Ordinary padding is already balanced. Rectangle height still follows actual word anatomy. |
| Overlay origin | Uses the actual hit-layer offset relative to the page. | The older integer-border subtraction diagnosis no longer describes the normal current path. |
| Highlight styling | The page overrides the older extra top/bottom wash allowances to zero. | Do not accidentally count the old stylesheet allowances again. |
| Touch selection | Stores separate expanded hit bounds and gives ink candidates priority. | Preserve this separation when replacing visual geometry. |

These are source observations. Browser agreement with offline font metrics still needs testing. The current measurement fallback also uses the DOM rectangle when a metric or baseline is unavailable; a production geometry package must define how readiness/failure works before a highlight becomes active.

## Fresh scan comparison

The study attempted every `letter` token on the ayah rows of the three pages, including words composed of multiple glyph codepoints. Decorative headers, standalone basmala and ayah-end ornaments were not matched. The result is broader than the previous eighteen anchors but remains a small diagnostic sample of the corpus.

Each template was rendered from the unchanged font and searched across a broad, visually identified row window. Horizontal search was not restricted by either layout model. The procedure excluded weak correlations, ambiguous alternatives, size-search boundary hits, repeated glyphs within a row and non-monotonic matches. In this run, sixteen detections failed the correlation threshold; the other exclusion rules did not remove additional detections.

| Page | Attempted word matches | Retained matches | Full-row training / validation words |
| --- | ---: | ---: | ---: |
| 3 | 127 | 120 | 64 / 56 |
| 589 | 116 | 107 | 52 / 55 |
| 604 | 58 | 58 | 23 / 22 |
| Total | 301 | 285 | 139 / 133 |

Thirteen retained page-604 words belong to centered rows and are excluded from the full-row model comparison. Retained means “passed the automated match filters,” not “approved religious-text coordinates.”

For each page, the study fitted horizontal scale and translation using odd-numbered full rows, then evaluated even-numbered full rows. The current composition was modeled as equal ink gaps with each row fitted to the same width. The alternative used native shaped advances and one page-level font scale. Both models received two horizontal fitting parameters. Neither could fit a new translation separately for every validation row.

| Page | Current-model median error | Native-model median error | Current-model 90th percentile | Native-model 90th percentile | Native-model maximum |
| --- | ---: | ---: | ---: | ---: | ---: |
| 3 | 4.75 px | 2.37 px | 13.97 px | 7.85 px | 12.71 px |
| 589 | 3.28 px | 2.69 px | 8.99 px | 6.06 px | 8.39 px |
| 604 | 2.75 px | 0.93 px | 6.67 px | 3.11 px | 5.00 px |

These are absolute horizontal word-center residuals in the existing scan pixels, not screen pixels and not fidelity percentages. The “current” column is an offline model of the source formula, not a fresh screenshot measurement. Both models were given the benefit of calibration to their training rows; the comparison does not measure the application's actual overall margin or page height error.

The native model improves both the median and the 90th percentile on every sampled page. It does not eliminate the larger deviations. On page 3, the largest retained validation discrepancies cluster in line 4, including source word `2.8.7`; this identifies a concrete place to inspect before a global spacing change is accepted.

### Word size and placement must agree together

A position model can appear better by making every glyph slightly smaller. To check this tradeoff, a second calculation fixes the native font size at the median size estimated from training-row raster templates and fits translation only.

| Page | Native scale fitted from positions, relative to training-template size | Median placement error with template-derived size | 90th percentile with template-derived size |
| --- | ---: | ---: | ---: |
| 3 | −1.41% | 3.79 px | 8.94 px |
| 589 | −4.91% | 6.92 px | 14.83 px |
| 604 | −2.03% | 2.72 px | 5.00 px |

Page 589 is the strongest warning: the native model's best placement scale is about 4.9% below the training-template size estimate. This is not a production font multiplier. It indicates that natural advances alone have not simultaneously reproduced the observed scale and spacing.

Raster matching itself has uncertainty: scan quality, low resolution, font hinting, antialiasing and the supersampling method affect estimated sizes. The fresh templates use a different rasterization method from the older integer-size study, so raw font sizes from the two studies should not be treated as directly interchangeable. The size disagreement must be checked against better references, rather than hidden by shrinking the text.

### Vertical placement

A separate baseline-ladder calculation estimated row pitches of 56.44, 55.80 and 56.30 scan pixels for pages 3, 589 and 604. On held-out rows, median baseline residuals were 1.05, 0.62 and 0.63 pixels; the largest were 4.66, 1.98 and 3.19 pixels.

These measurements support a broadly regular row rhythm in the sampled text, with residual variation. They do not validate the app's current page ratio, top/bottom margins, openings or header height. Horizontal and vertical fits are diagnostic estimates, not a combined globally registered facsimile. A final comparison must use a documented whole-page alignment and retain local disagreements.

## Why highlight boxes differ

The current rectangle is calculated from the extreme bounds of the shaped word. Browser text measurement explicitly distinguishes advance width from ink extents, and actual ascent/descent from the font's common vertical metrics.^4

The new outline study covers **1,354 word occurrences on thirteen pages**. At one deliberately common 33-unit font size, with the current 2.5-unit total vertical padding, the resulting box heights are:

| Statistic | Height in reference units |
| --- | ---: |
| Minimum | 18.48 |
| 10th percentile | 30.73 |
| Median | 37.14 |
| 90th percentile | 44.09 |
| Maximum | 56.90 |

The variation remains when line fitting is removed from the calculation. A same-font-size layout therefore cannot, by itself, make all highlights the same height. These counts exclude standalone basmala; they do not describe every word in all 604 pages.

The [outline evidence figure](../outputs/mushaf-calibration-study-2026-09-09/highlight-anatomy.svg) shows four actual source word shapes at the same nominal size. It is a geometric diagram, not a UI mockup. For example, page-3 word `2.6.0` has a 37.71-unit padded height, while `2.6.8` reaches 47.89 because its ink extends farther vertically. Equal padding produces unequal outer dimensions.

### The page-293 outlier

Source word `17.111.17` is short, but its outline begins approximately 0.93em to the left of its nominal origin. At size 33, the shaped advance is about 26.93 units while the padded bounding rectangle is 60.06 units wide. The source contains a remote tiny contour; a rectangle enclosing all contours necessarily spans the space between that contour and the main word.

This explains a specific unusually wide box without blaming viewport scaling. It does not establish that the remote contour is disposable. Its status must be resolved against the intended reference and source history. The religious outline should not be edited or the contour dropped merely because the rectangle looks awkward.

### Three different visual contracts

| Desired appearance | What would change | Limitation |
| --- | --- | --- |
| Consistent padding around each word | Use the approved word ink geometry with one padding policy; review collisions and remote contours. | Heights and widths still vary with the calligraphy. |
| Same-height boxes on each line | Define a shared line band and word-specific horizontal extents. | Small words gain more blank space; very tall marks can collide with neighboring lines or require larger bands. |
| Highlight follows the word's ink | Use the same glyph paths or a deterministic mask to derive a contour-following wash. | Requires a distinct rendering/performance and visual proof; it is not a rectangle adjustment. |

The choice is a presentation decision and does not alter scoring. It remains open pending preference and visual comparison. No highlight shape can safely be declared correct before its treatment of neighboring words, diacritics, markers and saved/active states is evaluated.

## Recommended fundamental correction

Use a fixed, reviewed page composition as the authority. Preserve existing semantic word IDs and QCF display strings. Use native shaping as a starting point for calibration, then record justified deviations against the reference instead of making fresh font-size and spacing decisions inside the runtime component.

The runtime should display that approved composition and apply a uniform outer scale. Text origins, baselines, glyph geometry and semantic target mapping should come from the same versioned package. The renderer should fail clearly on mismatched assets instead of displaying a font from one version beneath coordinates from another.

Retain the current shared page surface, outer scaling concept, judging identities, category meanings, touch arbitration and evidence contracts. Recompose the source of internal font sizes, word origins, row baselines and visible highlight geometry. Remove superseded runtime ink-packing and bearing overrides only during an approved migration; do not leave competing typography systems active.

This would address the underlying ownership problem: page composition would be a reviewed artifact derived from an edition reference. It would also make future regressions detectable. A deterministic package generated from the wrong placement formula would only freeze the wrong result, so reference review is indispensable.

Tarteel's own engineering account describes separating data, fonts and presentation, recording interaction coordinates, capturing every rendered page, specialist proofreading and subsequent image diffs.^5 That verification discipline is applicable here. It does not establish that Tahqeeq needs Tarteel's entire font engine or that a small prototype has reached its released quality.

## What can be promised about 1405 proportions

**Feasible target:** the same accepted page geometry at every viewport, with uniform scaling preserving all relative dimensions. The current evidence supports continued work toward this target.

**Not established:** that the present fonts and any single native-spacing formula are anatomically identical to the original print across all pages. The new errors are a reason to calibrate and inspect, not to make that claim.

**Literal facsimile option:** an authenticated page image preserves that image's composition under uniform scaling. It remains subject to scan distortion and resolution and requires accurate word overlays. It does not automatically establish the geometry of an undistorted physical original or solve word-level styling.

**Physical size:** preserving proportions on a phone produces a smaller physical page. Matching centimeters to a physical copy requires a known print size and device calibration; CSS pixels and the scanned image's outside dimensions are insufficient. Full decorative borders, marginalia and surah bands also need explicit scope before “identical page” can describe the result.

## The next bounded proof

The research has enough evidence to stop broad engine comparisons. The next proof should focus on an approved 1405 reference and the discrepancies already found:

1. Confirm reference identity, text-area boundaries and what “identical” includes. Keep provenance, crop and page-number mapping in a manifest.
2. Inspect page 3 line 4, page 589 lines 8/10, page 604 transitions/centered endings and page 293's remote contour. Obtain better reference resolution where matching uncertainty could explain the result.
3. Produce isolated comparisons that preserve glyph shape and show current, native and calibrated placement at the same registered scale. Do not silently adjust each word to make an image diff disappear.
4. Pair those comparisons with the chosen highlight treatment. Test semantic mapping, crowded neighbors, long tails, stopping signs, ornaments and adjacent lines.
5. Proceed to corpus generation only if the proposed representation meets the agreed visual tolerance and reviewer acceptance. If QCF geometry cannot meet it without unjustified distortions, evaluate the image-based facsimile route before adopting a larger font engine.

This proof is not an authorization to change the live renderer. It is the concrete next reviewable deliverable after reference and highlight preferences are resolved. Complete approval of a reference baseline needs qualified Mushaf review; model reasoning and automated correlations cannot substitute for it.

## Effort and confidence

The automated measurement pass completed in approximately 77 seconds on this desktop once the analysis script existed. This is evidence that measurements can be batched efficiently, not an implementation-time estimate. It uses no AI call per word. Runtime rendering would not require AI tokens; the work lies in preparing, verifying and maintaining the geometry and semantic mapping.

Manual review capacity, the quality of the available reference and the number of genuine exceptions will determine the larger workload. Avoid a 604-page migration estimate until the bounded proof establishes those constraints. One primary agent can maintain the design; an additional agent is optional for an independent evidence audit and is not required for this study.

Confidence for the recommended calibrated-composition direction: **practicality 88/100; architecture/data safety 94/100; visual certainty 76/100**. These are engineering judgments, not accuracy measurements. The architecture is promising enough for a bounded proof; the visual score does not support production implementation without that proof. Confidence that native spacing alone already achieves anatomical identity is **below 70**, so that shortcut is rejected.

## Reproduction and limitations

The [study package](../outputs/mushaf-calibration-study-2026-09-09/README.md) contains the scripts, full candidate records, exclusions, input hashes, derived summaries and original vector diagram. The scripts write only within that research folder. No application tests were rerun because the application was not modified; this does not constitute browser or release validation.

The analysis has several deliberate limitations: three low-resolution scans; manually chosen broad row windows; a finite nominal-size search; non-random page selection; automated matches without complete proofreading; no matched ayah-end decorations or basmala; independent horizontal/vertical diagnostic fits; and no browser-shaping comparison. A correlation threshold is a filtering choice, not a confidence probability. Both the source-file hashes and all exclusions are retained so another reviewer can audit the conclusions.

## Sources

1. Quranic Universal Library, [KFGQPC V1 layout (1405H print)](https://qul.tarteel.ai/resources/mushaf-layout/15), resource schema and edition label, accessed 9 September 2026.
2. TarteelAI, [QUL Mushaf model, pinned commit 2049f3c](https://github.com/TarteelAI/quranic-universal-library/blob/2049f3cee9cfb3a6dde2bfaf883aac4ee37e5ffc/app/models/mushaf.rb), V1 reference linkage.
3. Tafsir.app, old Madinah scan assets: [page 3](https://tafsir.app/scans/m-madinah-old/5.png), [page 589](https://tafsir.app/scans/m-madinah-old/591.png), [page 604](https://tafsir.app/scans/m-madinah-old/606.png). Existing local copies inspected and hashed in this study; the containing tafsir.app page was not retrievable through the research browser. These are source-linked research references, not independently authenticated print masters.
4. MDN contributors, [TextMetrics](https://developer.mozilla.org/en-US/docs/Web/API/TextMetrics), updated 11 May 2026, accessed 9 September 2026; distinction between advance and ink bounds.
5. Mohamed Moussa / Tarteel, [From Page to Screen: Rethinking Quran Rendering for the Digital Age](https://tarteel.ai/blog/from-page-to-screen-rethinking-quran-rendering-for-the-digital-age/amp/), 7 January 2026, especially rendering and proofreading. Product claims are the publisher's account, not independent Tahqeeq benchmarks.

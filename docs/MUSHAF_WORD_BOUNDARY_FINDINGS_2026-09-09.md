# Word-boundary investigation: source diagnosis and correction path

Follow-up: the [corrected four-target interaction proof](./MUSHAF_BOUNDARY_INTERACTION_PROOF_2026-09-09.md) now enables the investigated pairs on a separate route. It expands the remaining contour inspection and tests a corpus-wide counterfactual. The original comparison guards and production renderer remain unchanged. The findings below record the earlier diagnostic stage.

2026-09-09. Read-only investigation of the source corpus, original font outlines and unchanged source PNGs. No production text, IDs, geometry, judging state or artwork was changed. No marking guard was removed. Revision 6's layout regressions are recorded separately below.

## Decision

Proceed with a revised isolated interaction proof, not a production migration. The two known failures now have concrete explanations, and page 254 has a source-supported separation candidate. The current generic bounding-box partition rule is unsuitable as the final interaction model. Repairing only pages 254 and 293 would leave other flagged cases unexamined.

The image remains a promising stable presentation source. The next correction belongs in the build-time mapping/interaction data and the highlight policy, not in letter spacing or image editing.

## Page 254: exact contour correspondence, not a guessed split

The old glyph 40903 / codepoint 64399 contains eight contours. Comparing original `QCF_P254.TTF` with the current `p254.woff2` shows an exact one-to-one match for every point, curve flag and contour sequence:

- Five contours belong to existing word `13.37.7` and have translation **(+1441, 0)** in font units relative to the current separated glyph.
- Three contours belong to `13.37.8`, with translation **(0, 0)**.
- Every contour is accounted for exactly once. No contour was deleted, simplified or newly drawn.

The first word begins at x=1445 in the old glyph's coordinates; the second ends at x=1372. This gives a genuine empty interval between those groups. Raster registration against the source PNG places that interval at approximately **176.06–180.37 source pixels**. Independently reading the image alpha confirms that columns **176, 177, 178 and 179** are entirely transparent in the inspected word-height window; columns on either side contain ink.

**Candidate shared edge: x=178.** This is supported by exact shape correspondence and actual source pixels, not equal-width division. The registered template correlation was 0.956; that is a matching score, not a 95.6% correctness probability. The absolute transform remains a raster-fit estimate; the transparent pixel interval is directly observed.

The old combined group still requires the documented page-wide mapping shift adjustment. Two distinct existing word IDs and findings must remain. Candidate data has not yet been installed into the interactive proof or accepted for production.

## Page 293: two remote pixels inflate the word rectangle

The original and current outline for `17.111.17` contains a tiny detached contour at font x=-1907…-1893, well left of its main body at x=212…1696. The detached contour has three points. Source-image inspection confirms its rendered footprint: **two opaque pixels at (618,1822) and (618,1823)**.

Those pixels are inside the imported full bounding rectangle, so its 617–831 horizontal span reaches across the neighboring word. The proof then chooses x=617 as an internal edge and squeezes the neighboring wash. The earlier explanation of the overlap is now grounded in the actual source contour and pixels; it is not a general defect in hamzatul-wasl rendering.

Registration of the main body gives correlation 0.951. Columns **736–742** in the inspected main-word-height window are transparent between the two main bodies. **x=739** is a candidate body-separation edge. It is not a complete replacement target definition: the distant fragment's ownership and its treatment in the wash/hit layer remain explicit review items.

The source artwork is untouched, including those two pixels. Calling the fragment a removable religious-text artifact would exceed this evidence. A word's display wash does not have to enclose every detached ink pixel in one giant rectangle. Its semantic identity, full source ink and principal activation region can be represented separately.

See the [annotated evidence](../outputs/mushaf-word-boundary-2026-09-09/boundary-evidence.png) and [inspectable HTML](../outputs/mushaf-word-boundary-2026-09-09/boundary-evidence.html). The visual is a Chromium rendering of unchanged source PNGs with diagnostic overlays, not edited Quran artwork.

## Full-corpus structural and semantic audit

The new audit covers all **604 pages** and **88,246 source coordinate rows**. Applying only the previously demonstrated p254 combined-group adjustment diagnostically yields:

| Check | Result |
| --- | ---: |
| Page/line/surah/ayah association failures | 0 |
| Word-versus-ayah-marker role failures | 0 |
| Coordinate rows associated | 88,246 |
| Out-of-page or degenerate grouped rectangles | 0 |
| Reversed coordinate pieces normalized diagnostically | 2,971 |

These are structural association checks, not certification of all word boundaries. Matching page and ayah labels does not by itself establish correct printed-word ownership.

The semantic comparison accounts for 77,432 diagnostic groups representing the existing 77,433 recited-word occurrences; only the documented p254 pair is grouped:

| Classification | Groups |
| --- | ---: |
| Equivalent under the preceding conservative comparison rules | 77,095 |
| Equivalent under additional explicitly recorded encoding rules | 331 |
| Source word text spans two already separate glyph regions, pages 27 and 177 | 2 |
| Second word's source text is covered by the preceding row, pages 27 and 177 | 2 |
| Remaining source text-annotation differences, both page 240 | 2 |

The encoding checks cover representations such as alif/hamza, small yeh/waw and hamza seating. They are diagnostic classifications, not permission to normalize saved Quran text or a substitute for qualified orthographic review. Pages 27 and 177 already have separate coordinate rows for the two local words; their missing source word-text rows must not be treated as missing selection geometry.

For the two page-240 occurrences (`12.39.0`, `12.41.0`), the old/current glyph points, contour ends, flags and advances are identical. The outstanding discrepancy is in the upstream Arabic annotation, not a detected glyph-shape change. Preserve Tahqeeq's existing text and IDs; retain the annotation differences in the import report rather than silently rewriting either text source.

## Broader geometry findings

| Diagnostic | Result | Meaning |
| --- | ---: | --- |
| Same-line horizontal bounding-range intersections | 6,872 across 603 pages | Many may be legitimate overhangs; not 6,872 confirmed defects |
| Adjacent semantic units whose min-x order reverses | 25 | Sorting full bounds by min-x can reorder semantic units; preserve reading order |
| Generated partitions retaining less than half their own supplied width | 59: 58 words, 1 marker, across 46 pages | Prioritize for review; the threshold is diagnostic, not a visual tolerance |

Original fonts were inspected on the **53 flagged lines**, covering **582 glyph pieces on 46 pages**. A diagnostic scan found **47 glyph pieces with tiny distant contours across 40 pages**. It flags contours at most 50x50 font units and separated horizontally from the remaining body by more than 500 units. These thresholds are not an approved contour-removal algorithm.

52 of the 59 narrowed targets occur on lines with such contours. This is co-occurrence, not proof that each narrowing has the same cause. Seven narrowed targets occur on lines without a flagged tiny remote contour: pages 11, 32, 53, 345, 365, 412 and 441. Those need distinct inspection for legitimate overhang, containment, glyph grouping and partition behavior. Only the page-293 fragment was independently confirmed at the pixel level in this pass; the other 46 findings are font-outline evidence.

## Proposed correction for the next isolated proof

1. Preserve semantic reading order. Do not sort words by their extreme min-x as an identity/partition step.
2. Keep source artwork and source ink geometry immutable. Add reviewed principal word-body/activation geometry and an explicit representation for detached fragments where necessary. Do not make a tiny detached contour enlarge one continuous wash across another word.
3. Use shared row bands for wash height and reviewed word-body separation for horizontal extent. Touch regions and visual washes may differ, but both map to the existing semantic target. Neighboring records remain independent even when their same-style washes touch.
4. Introduce the p254 split as versioned mapping data supported by the exact eight-contour correspondence and source gap. Test both words, the following row and the remainder of the page for correct mapping and separate findings.
5. Test the p293 body-region proposal while preserving the detached pixels. Compare the ordinary bodies, the detached fragment and neighboring selections explicitly. Decide the fragment activation/wash policy before enabling that pair for real judging.
6. Inspect the seven other flagged lines and representative remote-contour cases before adopting a common data-generation rule. Use reviewed inputs and regression evidence; do not accumulate runtime `if page == ...` geometry guesses. Expand checks to the remaining corpus before release.

A universal rectangular ink-envelope strategy cannot satisfy every calligraphic overhang case. This investigation supports a more explicit interaction model; it does not yet prove a fully automatic corpus-wide replacement generator.

## Source and validation evidence

The pinned [Quran image generator](https://github.com/quran/quran.com-images/blob/dbda5689691defc7e3b28314cc2d035ff027795c/lib/Quran/Image/Page.pm) measures glyph bounding boxes and stores coordinates alongside image rendering. The pinned [Quran iOS word-frame processor](https://github.com/quran/quran-ios/blob/422ece54cee15d474654dc11466f8e2f0e39c3e6/Domain/WordFrameService/Sources/WordFrameProcessor.swift) normalizes, aligns and joins frames. Those operations explain the supplied geometry's intended presentation use; they do not prove its suitability for Tahqeeq's word-by-word judging targets. Applicable artwork redistribution terms and physical-master acceptance remain unchanged gates.

Reproducible artifacts under `outputs/mushaf-word-boundary-2026-09-09/`:

- `audit.py`, `corpus-audit.json`: all-page association/semantic/geometry diagnostics.
- `register.py`, `registration.json`: exact contour matching, full raster candidate search and source hashes.
- `inspect_flags.py`, `flagged-contours.json`: bounded original-font inspection and download manifest/hashes (46 fonts, 7,294,420 bytes).
- `verify.py`, `verification.json`, `pixel-evidence.json`, `page240-shape-check.json`: 13 passing independent evidence checks, including original pixel gaps, fragment presence, source hashes and p240 glyph identity.
- `boundary-evidence.html/.png`: visually inspected diagnostic diagram.

Run the Python scripts with the existing bundled Python runtime; they use the previously installed analysis dependencies in `tmp/mushaf-study-python`. No new app dependency was installed. Production tracked source/scripts/public/package content diff remained empty. This pass did not rerun unrelated full-app tests or claim new device/offline acceptance.

## Preview feedback and confidence

Owner reports revision 6 introduced unwanted scrolling, poor horizontal space and too much padding inside the page bottom. The separate-bottom-selector direction remains the intent, but revision 6 is **not visually accepted**. Record and reproduce those regressions during the later viewport slice. This investigation did not modify that preview or treat earlier mechanical checks as visual approval.

Confidence in these bounded findings: practicality **94/100**, architecture/data safety **94/100**, visual certainty **84/100**. Exact p254 contour identity and inspected pixels are verified facts; corpus-wide body/fragment policy remains a proposal. The decision is go for a corrected isolated interaction proof, no-go for production adoption of the existing box-partition rule.

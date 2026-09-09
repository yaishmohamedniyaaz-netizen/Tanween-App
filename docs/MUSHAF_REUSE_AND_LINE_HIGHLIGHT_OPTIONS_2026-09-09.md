# 1405 Mushaf: reuse options and consistent line highlights

9 September 2026. Research and planning only. Application source, dependencies, Quran assets, judging rules and deployment were not changed.

Subsequent owner-authorized work: the [bounded proof results](MUSHAF_BOUNDED_PROOF_RESULTS_2026-09-09.md) now provide browser evidence, a specific page-254 split-glyph diagnosis and measured tradeoffs. This document remains the research record preceding that isolated prototype; it does not imply main-app migration approval.

## Recommendation

Evaluate Quran.com's existing **1405 page images with their paired coordinate database** before spending more on custom typography. Put a small Tahqeeq interaction layer over those pages, preserving our word identities and judging records. Use a shared highlight band for each line instead of fitting the visible highlight to each word's ink.

This revises the earlier preference for calibrating our QCF composition first. The user's screenshots establish the desired highlight behavior, and a concrete, complete upstream image/coordinate package makes reuse substantially more promising. The earlier diagnosis remains useful; its proposed next investment changes.

There are two distinct fidelity targets:

- **Established digital 1405 composition:** the candidate aligns closely with the supplied Quran.com and GTAF screenshots. Reproducing its relative positions with uniform page scaling is practical.
- **Facsimile of an identified physical 1405 printing:** not established. These digital images originate from font-based composition. A source-linked scan inspected in this research has different verse ornaments. Exact print proportions and decoration require an authenticated reference comparison before making that claim.

An expert approach is to choose the edition and master first, preserve that composition, verify its word mapping, and prevent unreviewed changes to the master. It does not require an AI to redraw or adjust every kalimah.

## What the screenshots establish

The four attachments were inspected locally. App names below follow the user's identification. Screenshot 2's lower page is obscured by a sheet; it cannot support a complete page comparison or identify the installed rendering engine.

| Attachment | Observation | Meaning for Tahqeeq |
| --- | --- | --- |
| 1: Quran.com, page 576 | Purple selection has shared top/bottom edges along a line. Adjacent selected content appears continuous. | The visible wash is a line band, not a separate tight ink rectangle for every word. |
| 2: Tarteel, page 513 | Familiar page composition is visible above an ayah menu. | Useful visual reference; insufficient for full-page proportional measurement. |
| 3: GTAF, page 50 | Blue ayah selection follows line segments. An ornamental surah header remains part of the page. | Traditional presentation and unobtrusive line highlights can coexist. |
| 4: GTAF, page 576 | Same 15-line content as attachment 1, displayed larger within different surrounding UI. | Compare the page after scaling; screen margins and app chrome are not typesetting differences. |

For a stronger comparison, the study registered the original screenshots against pinned Quran.com `hafs_1405` PNGs. It allowed one uniform scale and translation for the whole page, with no individual word/line fitting. Only outer horizontal whitespace was removed from the source for numeric comparison; no screenshot or source image file was edited.

| Screenshot | Source page | Whole-page ink correlation | Inference |
| --- | --- | --- | --- |
| 1 | 576 | 0.951 | Strong agreement with the candidate composition. |
| 4 | 576 | 0.881 | Strong agreement at a larger display size. |
| 3 | 50 | 0.859 | Supports the same candidate family on a surah opening too. |

These are normalized correlation measurements, **not percentages of fidelity or probabilities**. JPEG compression, raster sampling, overlays and partially covered content affect the scores. Integer output dimensions also introduce rounding. The evidence supports close composition agreement; it does not prove pixel identity, the apps' internal implementations, or physical print identity. The initial search that could not fit GTAF's wider page was discarded as constrained and inconclusive. The final search found interior optima for all three cases.

GTAF's own documentation lists classic King Fahd 1405 and newer 1440 as separate Mushaf options. That supports treating the edition as explicit data, rather than treating all Madani appearances as interchangeable. [GTAF's Mushaf documentation](https://gtaf.org/blog/mushaf-mode-in-quran-app/).

## The current regression has a concrete cause

At repository HEAD `b753d559abab2b00a8bc397111f5e87164f92805`, `Mushaf.tsx` builds the normal word rectangle from measured ink ascent/descent, with 1.25 reference units of vertical padding on each side. Naturally short and tall calligraphy therefore produce short and tall visible rectangles. The earlier calibration measured substantial variation even at one font size.

Commit `f57a0504b683fc0a1a0235e96fb9be8cadaf0035` bundled that ink-based geometry with new line fitting and page scaling. This supports the user's recollection of when the behavior changed. It does not mean uniform page scaling itself is the cause: the **choice to use ink height for the visible wash** is separate from scaling.

There is also a composition issue: `fitMushafLine` fits rows from summed ink widths and a small gap; `MushafPageSurface` compensates word bearings. This can change relative word spacing and font size between rows. Authentic QCF outlines and correct line membership alone do not certify the resulting composition.

The revised proposal keeps whole-page scaling, replaces custom page composition with an approved upstream master if it passes the reference gate, and stops using individual ink height to draw the wash. Ink bounds can still help choose the intended word without dictating the visible highlight shape.

Repository pointers: [highlight geometry](../src/components/Mushaf.tsx), [line fitting](../src/lib/mushafGeometry.ts), [page surface](../src/components/MushafPageSurface.tsx), [asset versions](../src/lib/mushafAssets.ts), [QUL import](../scripts/build-data.mjs).

## Reuse options examined

| Route | What it supplies | Assessment for this requirement |
| --- | --- | --- |
| Quran.com iOS 1405 images + coordinate DB | Existing 604-page composition, glyph bounds and reference highlight/scaling logic. | **First proof candidate.** A web adapter is required; the Swift engine is not a React dependency. |
| Re-import Tarteel QUL V1 | Fonts, script, page/line membership and metadata. | Already our source family. Re-importing it does not remove our runtime spacing decisions. Retain semantic data; do not expect re-import alone to fix the appearance. |
| `open-quran-view` | React/Web Component with word interaction and verse/word highlights. | Convenient interface, but its documented layouts are V2, V4 and Unicode. No documented V1/1405 contract was found. Defer as a drop-in solution for this target. |
| `quran-madina-html` | Ready web/React presentation, including a Madina05 option. | Inspected source applies per-line horizontal `scaleX` and interpolation corrections. That conflicts with the proposed intact, fixed reference composition; its fidelity claims need independent proof. |
| NedaaDevs image generator | Generates images and associated coordinates for several font editions. | Useful tooling, but its README explicitly says the output has not been proofread against a printed Mushaf. It is not an already approved master. |
| Tarteel's full engine / DigitalKhatt | Substantial shaping and typesetting foundations. | Technically credible, but a larger integration and verification commitment. No verified drop-in package for Tarteel's released web engine was found. |
| Authenticated King Fahd print/PDF/vector master | Strongest possible physical facsimile reference, potentially including full decoration. | Preferred if exact print identity is mandatory. A matching semantic word-coordinate package still needs to be established. |
| Embed another complete web reader | Existing reading interface, e.g. KSU. | No verified contract for Tahqeeq's fine-grained judging interactions, offline ownership and word identities. A whole external app is not a substitute for an embeddable page package. |

Sources: [QuranEngine](https://github.com/quran/quran-ios/blob/422ece54cee15d474654dc11466f8e2f0e39c3e6/README.md), [QUL layout tutorial](https://qul.tarteel.ai/docs/tutorial-mushaf-layout-end-to-end), [open-quran-view API](https://github.com/adelpro/open-quran-view), [Madina HTML source](https://github.com/tarekeldeeb/quran-madina-html/blob/bed882fc8e54c801daffd3f0763c6a84ea1822a9/src/quran-madina-html.js), [generator warning](https://github.com/NedaaDevs/quran-image-generator/blob/c69888cfd1978aeaa988e3bd537db16224b0ea09/README.md), [Tarteel engineering account](https://tarteel.ai/blog/from-page-to-screen-rethinking-quran-rendering-for-the-digital-age/amp/), [DigitalKhatt viewer](https://github.com/DigitalKhatt/digitalkhatt.org), [King Fahd technical guide](https://qurancomplex.gov.sa/wp-content/uploads/isdarat/booklets/complextechguide.pdf), [KSU reader](https://quran.ksu.edu.sa/).

The King Fahd digital-master portal could not be inspected successfully in this round. Its technical guide is a discovery source, not authentication of a particular downloadable 1405 master. No primary source was found establishing that every current Saudi tournament mandates the same printing or decorative application frame. Here 1405 is the user's explicit product target.

## Why the Quran.com package is the stronger candidate

Pinned `quran/quran-ios` commit: `422ece54cee15d474654dc11466f8e2f0e39c3e6`.

Its example resources contain 604 PNG pages under `hafs_1405/images_1920/width_1920`, paired with `images_1920/databases/ayahinfo_1920.db`. Seven sampled pages were downloaded, together with the complete database and relevant source. All seven PNGs are 1920 × 3106. The complete image inventory was checked using repository metadata; all 604 images were not downloaded or proofread. [Pinned resource package](https://github.com/quran/quran-ios/tree/422ece54cee15d474654dc11466f8e2f0e39c3e6/Example/QuranEngineApp/Resources/hafs_1405).

The source's image service loads the image and paired geometry. `WordFrameProcessor` groups bounds by line. Its extension assigns shared vertical bounds within each line and adjusts neighboring horizontal boundaries to meet. The vertical joining routine considers surah continuity. This is direct source evidence for the smooth highlight behavior, rather than a guess from screenshots. It does not guarantee one identical pixel height for every special row throughout the Quran. [Image loading](https://github.com/quran/quran-ios/blob/422ece54cee15d474654dc11466f8e2f0e39c3e6/Domain/ImageService/Sources/ImageDataService.swift), [frame processing](https://github.com/quran/quran-ios/blob/422ece54cee15d474654dc11466f8e2f0e39c3e6/Domain/WordFrameService/Sources/WordFrameProcessor.swift), [boundary rules](https://github.com/quran/quran-ios/blob/422ece54cee15d474654dc11466f8e2f0e39c3e6/Domain/WordFrameService/Sources/WordFrame%2BExtension.swift).

`WordFrameScale` applies an aspect-preserving scale and centering offset to the image geometry. The proposed browser adapter should have the same responsibility: transform an existing composition and its coordinates together. [Scale implementation](https://github.com/quran/quran-ios/blob/422ece54cee15d474654dc11466f8e2f0e39c3e6/Model/QuranGeometry/Sources/WordFrameScale.swift).

The upstream image-generator README says its pages are generated from old Madani fonts and that the fonts/pages belong to the King Fahd Quran Complex. The iOS code license does not by itself settle asset redistribution terms. Record the exact asset provenance and applicable terms before distributing a Tahqeeq package. This is a bounded acquisition check, not a reason to rebuild the artwork. [Image provenance](https://github.com/quran/quran.com-images/blob/master/README.md).

## Kalimah mapping is the important integration gate

The paired database contains **88,246 glyph rows across 604 pages**. Its positions cannot be blindly substituted for Tahqeeq's semantic word IDs: one kalimah can contain several glyph pieces or an associated stopping sign.

The read-only corpus comparison found:

- 13,766 page/line/surah/ayah groups in each dataset.
- 3,745 groups whose database-row count differs from Tahqeeq's token count.
- After counting the constituent QCF codepoints, 13,765 groups have matching counts.
- One remaining discrepancy: page 254, line 6, 13:37 has nine coordinate rows versus ten local glyph codepoints.

These counts make a small deterministic mapping adapter plausible. They **do not prove semantic identity or correct touch ownership**. The one exception must be explained against its source before acceptance; it is not evidence of an error in Quran text. No correction or mapping was applied during research.

The adapter must associate coordinate pieces with the existing `wid`, retain the existing distinction between recited words and markers, and preserve letter/target IDs, saved marks, assignments, evidence and exports. The letter-selection tray may continue to use our semantic/QCF data even if the page itself becomes an image. Do not import another reader's synthetic segment IDs as judging identities. [Upstream coordinate persistence](https://github.com/quran/quran-ios/blob/422ece54cee15d474654dc11466f8e2f0e39c3e6/Data/WordFramePersistence/Sources/GRDBWordFramePersistence.swift).

## Proposed highlight and page behavior

**Retained:** Quran word/target identities, the judged passage, colors and category meanings, saved findings, score/evidence behavior, deliberate marking gestures, page navigation and one uniform zoom transform.

**Recomposed:** page artwork from the approved master; hit areas from its mapped coordinates; visible highlight geometry from shared line bands; surrounding page framing only after the core proof.

**Removed from the page-rendering path if the candidate passes:** runtime ink-width packing, per-line font-size correction and per-word ink-height washes. Do not remove metrics still needed by another selection surface without inspecting that dependency.

At a given zoom, ordinary rows should present a consistent vertical filling rhythm, and every marked kalimah within a row must share its top and bottom. Preserve the source's line positions; special opening/header rows need explicit boundaries. Word widths remain different because words occupy different horizontal space.

Use the upstream boundary normalization as the first proof. If absolutely equal band height across regular rows is required, evaluate one common display-band height on that fixed grid. Do not refit the lettering to achieve it. The acceptance image must show short/tall words side by side and successive rows, so the user's intended consistency is visible.

Adjacent marked words can either share a continuous wash or have a thin separator at their boundary. This is a small overlay presentation choice, not a new typesetter. The first comparison should show both. Recommendation for judging: try the separator so individual marked kalimahs remain readable; retain continuous fill if that looks cleaner. Separate interaction regions and records remain in either case. Different categories/states must retain their meaning; visual merging must never merge findings or bridge an unmarked word.

An image alone is insufficient for accessibility and word interaction. Keep a semantic interaction layer with stable focus, labels and selection behavior, all using the same page transform. Test dragging, hit priority, zoom and page changes on actual target browsers.

## Physical familiarity and decoration

The candidate already includes edition-specific surah headings and verse ornament artwork. Those can provide the familiar appearance seen in attachment 3. A full surrounding border is an additional choice; adding one does not fix bad spacing or prove print authenticity.

First approve the text composition. Then compare the same page with an appropriate restrained frame at the same available viewport. Account for the border in page fitting, so it neither covers text nor causes independent font changes. Tahqeeq's design grammar reserves saturated color for judging categories; a colored decorative frame would need an explicit visual-direction change. A neutral frame can be explored without changing verdict meanings.

For literal physical identity, acquire or identify the correct master and verify its colophon, page numbering, line breaks, verse ornaments, text-area aspect, baselines and representative internal word positions. The older source-linked page-3 scan and candidate PNG visibly differ in verse ornaments. Therefore this research cannot label the candidate an exact facsimile of that scan. If the authenticated master materially differs, retain the fixed-page architecture but reassess the artwork and coordinate pairing before integrating it.

Proportional fidelity means every distance in the accepted artwork scales by the same factor. It does not mean a phone displays the same number of physical millimetres as a printed book. Exact physical size would require a separate display-calibration requirement.

## Efficient next work and stop conditions

1. **Settle the master before implementation.** Authenticate the physical target if literal facsimile is required; compare the candidate on the supplied pages and representative ordinary/opening/closing pages. Confirm asset terms. Reject claims of exact physical identity if the evidence does not support them.
2. **Prove the mapping independently.** Explain page 254's discrepancy and verify glyph-piece ownership across the corpus. Require no unexplained unmapped recited words, no accidental marker-as-word targets, and unchanged semantic judging IDs. Do not silently repair either source.
3. **Build one isolated browser proof only after implementation authorization.** Use pages 1, 3, 50, 254, 293, 513, 576 and 604; compare continuous and separated line washes. Test desktop and compact sizes, actual browser zoom, short-word selection, adjacent categories, multi-line selection and surah boundaries. Show the result for visual approval.
4. **Check operational costs before migration.** Measure page decoding, navigation, offline installation/reload, cache loss and high zoom on real mobile browsers. Confirm the semantic layer and letter tray still work. Source inspection is not runtime proof.
5. **Migrate one page-rendering slice and protect it.** Pin images, coordinates and mapping together with hashes. Use one transform for artwork and overlays. Add corpus identity/geometry checks and approved visual references. Any future asset or layout change must produce a reviewable comparison. Follow scoped validation, visual approval, commit, push, publish and hosted verification in that order.

Storage is the main concrete tradeoff discovered so far: repository metadata totals **118,203,707 bytes** for the 604 PNGs, plus a **5,926,912-byte** database, about 124.1 MB before Tahqeeq's remaining data. The existing source estimates its current full offline package at about 50.1 MB. These are not equivalent measured browser installations, and keeping fonts for the letter tray may add further cost. Lower-resolution or compressed delivery may help but must preserve legibility and matched coordinates; it has not been evaluated here.

This route should require less typography research than custom calibration, because the visual positions already exist. The remaining work is deterministic mapping and browser integration, not per-word AI generation. No credible token or duration total can be inferred from this research alone. Keep one bounded proof and a clear stop decision; more agents are not required for it.

## Confidence and current status

Scores are judgments about the stated scope, not measured probabilities or release approval.

| Scope | Practicality | Architecture/data safety | Visual certainty |
| --- | ---: | ---: | ---: |
| Proceed to a bounded proof of the image/coordinate route | 93 | 88 | 88 for the supplied digital references |
| Consistent line washes while preserving separate findings | 96 | 94 | 86; final separator treatment needs visual review |
| Production readiness of a Tahqeeq integration today | 78 | 74 | 78; no browser integration has been built |
| Claim of exact physical-print facsimile today | 65 | 75 | 55; narrow/defer this claim pending authenticated comparison |

Completed: source/history inspection, primary-source option research, seven sample-image acquisitions, complete coordinate-database count audit, and local screenshot registration. No source screenshot was changed or sent to an external service.

Not completed: authenticated physical-master acceptance, complete semantic mapping, asset-distribution clearance, browser prototype, physical-device/offline performance testing, user visual approval, implementation or release.

## Reproducible evidence

- [Research inputs, pinned commits, URLs, hashes and image inventory](../outputs/mushaf-options-2026-09-09/sources.json).
- [Database inspection and all count discrepancies](../outputs/mushaf-options-2026-09-09/data-inspection.json).
- [Screenshot registration results](../outputs/mushaf-options-2026-09-09/screenshot-registration.json).
- [Research scripts and reproduction notes](../outputs/mushaf-options-2026-09-09/README.md).
- [Earlier calibration findings](MUSHAF_CALIBRATION_FINDINGS_2026-09-09.md) and [broader stability/release framework](MUSHAF_STABILITY_FEASIBILITY_PLAN_2026-09-08.md).

The evidence archive is local research output, not an application asset package. Source input checks and a zero application diff are the appropriate validation for this planning round; no application test run or browser acceptance is claimed.

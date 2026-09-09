# 1405 Mushaf bounded proof: results and professional decision

Latest: [revision 2 findings](./MUSHAF_PROOF_REFINEMENT_2026-09-09.md) correct endpoint expansion and paper tone, add page 2, and identify a further coordinate blocker at 17:111. The results below describe the original eight-page proof.
9 September 2026. An isolated prototype was authorized, built and tested. The live application, Quran corpus, judging rules, dependencies and deployment remain unchanged.

## Decision

**Proceed with the fixed-master direction; do not migrate the live judge yet.** For familiar full-page reading and moderate zoom, the benefits outweigh the measured costs. The proof demonstrates a clearer route to the established digital 1405 appearance and consistent line highlights. The remaining costs are identifiable: larger assets, decoded image memory, limited raster detail at high zoom, and a small but mandatory mapping correction.

Correct Quran/word identity is a pass/fail requirement, not something that can be offset by an attractive page or a good average score. Page 254 remains disabled for marking in the proof. Its cause is now understood, but a guessed split must not become a production coordinate.

This is a conditional choice of architecture and asset family, not certification that the candidate exactly reproduces a particular physical 1405 printing. Authenticating that master remains necessary for a literal facsimile claim.

## Open and compare

The built local proof runs at [http://127.0.0.1:5294/](http://127.0.0.1:5294/). It is separate from Tahqeeq's normal origin and cannot open on an unrelated host or port. Sample findings use a dedicated storage key.

Start with page 576, Side by side, 100%. Then compare Continuous line segments and Fine word separators. Page 50 shows a surah opening and the optional neutral outer frame. Pages 1, 3, 293, 513 and 604 broaden the sample; page 254 exposes the mapping limitation explicitly. A fixed-page word opens the existing Tahqeeq letter tray. Choose a letter and category to create a disposable sample finding.

The comparison uses the actual `MushafPageSurface`/`MushafWord` components for current lettering. Its sample washes reproduce the current ink-height calculation. The candidate uses unchanged upstream PNGs and mapped coordinate regions. Both columns have the same outer available width; their internal margins and total page aspect differ. Therefore apparent text-size improvement is partly an inset difference, not a standalone font-quality measurement. No physical-print equivalence is inferred from this comparison.

Screenshots: [desktop comparison](../outputs/mushaf-bounded-proof-2026-09-09/desktop-comparison.png), [phone-sized joined bands](../outputs/mushaf-bounded-proof-2026-09-09/mobile-joined.png), [phone-sized separated bands](../outputs/mushaf-bounded-proof-2026-09-09/mobile-separated.png), [surah opening with frame](../outputs/mushaf-bounded-proof-2026-09-09/opening-framed.png).

## What was retained, changed and excluded

Retained: the existing page/word data, semantic target function and IDs, actual letter tray, category definitions and current baseline page component. The proof never changes those imported files or production records.

Recomposed inside the proof: fixed image artwork, line-band overlays, mapped word buttons, uniform page zoom, RTL horizontal scrolling, an optional frame and a disposable findings list. The image and overlays share the same measured page rectangle. Fonts are included to support the baseline comparison and semantic tray, not to determine the image's word coordinates.

Excluded from the candidate page path: per-line ink packing, runtime font-size adjustments and word-specific wash heights. A complete production judging integration was not built: its ledger, competition ownership, scoring amounts, full press-drag-release coordinator, Results overlays and exports were not replaced or tested through a new image renderer. The sample finding uses an explicitly disposable amount; its purpose is target association, selection and persistence, not score validation.

## Browser evidence

The installed Chromium engine was tested at 1400 × 1100 and 390 × 844. An additional touch context used 390 × 844 at device-pixel ratio 3. These are real browser-engine executions on this Windows machine, with mobile emulation; they are not physical iPhone, Android or Safari tests.

| Check | Result | Scope |
| --- | --- | --- |
| Page/viewport/app-zoom matrix | 48 cases completed | Eight pages × two viewports × 100%, 150%, 300%. Seven pages interactive; page 254 deliberately has no word interaction layer. |
| Word-region geometry | 4,626 region instances checked | Maximum deviation from the fixed source geometry: 0.168 source-image pixels, attributable to layout rounding. |
| Visible region-center ownership | 1,634 checked, zero wrong centers | This does not certify every edge, diacritic or ambiguous touch point. |
| Highlight consistency within a line | Zero height variation | Every displayed word region in a given line shares the same top and bottom. Heights between different lines follow the fixed source bands; special rows are not forced into one universal height. |
| Overflow / invalid bands | Zero page-level horizontal overflow cases; zero negative band cases | Intentional zoom scrolling is contained within the page viewport. |
| Keyboard / finding behavior | 10 of 10 checks passed | Open without a preselected letter, Escape/focus return, RTL arrow movement, existing target selection, adjacent independent findings, joined-wash identity, recategorization, reload persistence, page-change dismissal, quarantine. |
| Emulated touch | Three checks passed | Tap opens without recording a mark, existing tray records the chosen target, a vertical touch scroll does not record a mark. |
| Offline | Passed after one proof-only fix | Install eight pages, fresh offline reload, switch to another cached page, create a sample finding offline, show a clear failure after cache deletion, retain marks, recover online. |
| Type/build validation | Passed | Strict TypeScript check of the isolated proof and its imports; isolated Vite production build. |

The first offline run failed because the local preview server adds `Vary: Origin`; precached module/style requests did not match the browser's later requests. The fix uses URL matching that ignores that header only inside this proof's dedicated cache of public same-origin static assets. It is not a recommendation to ignore `Vary` for authenticated application responses. Fresh offline reload was then reproduced successfully. [Cache matching semantics](https://developer.mozilla.org/en-US/docs/Web/API/Cache/match).

An initial keyboard assertion also ran before focus-induced scrolling had settled. The existing tray correctly dismisses when its anchor moves. Waiting for the scroll/layout frames before pressing Enter made the intended keyboard test reproducible; the application tray was not modified. Full rapid scroll/gesture integration remains a separate acceptance check.

App zoom and a 1.5× browser-pinch emulation preserved the page aspect. Sending a native browser zoom shortcut to this headless context did not change browser zoom; **native browser-chrome zoom remains unverified**. Firefox and WebKit binaries were not installed, and no dependency/browser installation was performed.

## The mapping exception is now explained

The earlier count-only comparison was insufficient. This round downloaded the pinned upstream generator's SQL as source data and parsed it without executing any SQL statements. It links `glyph_id` to its page font character, glyph type, ayah membership and source word. [Pinned generator data](https://github.com/quran/quran.com-images/blob/dbda5689691defc7e3b28314cc2d035ff027795c/sql/02-database.sql), [schema](https://github.com/quran/quran.com-images/blob/dbda5689691defc7e3b28314cc2d035ff027795c/sql/01-schema.sql).

Across the 604-page local corpus, the audit examined 83,877 ayah-row token occurrences, including 77,433 recited-word occurrences. It associated all 88,246 coordinate rows with local glyph pieces. Direct character-code matching exposed one missing glyph code, 12 page/line/ayah metadata mismatches and 11 word/verse-marker type mismatches, all on page 254. There were also 2,971 reversed bounds, largely associated with unusual metrics; these were normalized as the upstream processor does, not treated as negative-width targets.

The page-254 cause is specific: old glyph **40903** represents **بَعْدَمَا** as one source word/region. Tahqeeq's corresponding entries are `13.37.7` **بَعْدَ** and `13.37.8` **مَا**. The current font has a separate glyph piece for the second kalimah, shifting subsequent character-code associations in that page's font.

A separate diagnostic grouped only that documented pair, then compared the resulting 163 groups against all 163 upstream page regions. **All page/line/ayah and word/marker type mismatches then disappeared.** That narrows the correction substantially; it does not provide an internal x-coordinate separating the two kalimahs inside the old region. The runtime therefore still excludes page 254 from marking and shows artwork only. No equal-width split, target merger or silent index shift was installed.

The source-word sanity check is deliberately separate from geometry. With documented orthography normalization, 77,007 of 77,433 words match directly, 418 differ and eight lack a directly associated upstream word row under naive code matching. Eighty-three differences and six missing word rows are consequences of the page-254 shift; other examples include alternate hamza/ya encoding and upstream word grouping on pages 27 and 177. These are **not 418 established text errors or wrong-coordinate findings**. They are retained for classification before claiming a complete semantic import audit. The upstream text must not replace Tahqeeq's source text or judging targets.

This result supports a versioned adapter with explicit exceptions. It does not support blindly importing a database and assuming that “word position” means our semantic word number. The pinned iOS source is itself explicit about frame normalization and shared scaling. [Frame processor](https://github.com/quran/quran-ios/blob/422ece54cee15d474654dc11466f8e2f0e39c3e6/Domain/WordFrameService/Sources/WordFrameProcessor.swift), [scale model](https://github.com/quran/quran-ios/blob/422ece54cee15d474654dc11466f8e2f0e39c3e6/Model/QuranGeometry/Sources/WordFrameScale.swift).

## Benefits versus costs

| Dimension | Benefit | Cost or limit | Professional assessment |
| --- | --- | --- | --- |
| Familiar page composition | Artwork is the accepted master at every viewport; no runtime spacing decisions. Prior registration matched the supplied Quran.com/GTAF references closely. | The exact physical master and full decorative scope are not authenticated. | Strongest reason to proceed; settle the reference before migration. |
| Highlights | Same-height bands within each line; joining and separators need no typography changes. | Fine separators can look busy on small screens; hit geometry still needs edge/overlap validation. | Clear improvement. Prefer continuous same-state washes by default, with restrained separators where judging distinctions need them, subject to user review. |
| Judging identities | Existing word IDs and actual letter tray work in the prototype. Adjacent marks stay separate even when the wash joins. | Split glyphs and existing data conventions require an explicit mapping adapter. Full ledger integration is not yet tested. | Feasible, mandatory gate. Never merge findings to make an image import easier. |
| Download/offline size | Static files can be packaged and cached predictably; the eight-page proof works offline. | Upstream 604 PNGs + DB total about 124.1 MB, before final application packaging. Current source estimates its old offline package at about 50.1 MB. | Acceptable tradeoff if offline installation and storage handling are sound; not a reason alone to keep distorted composition. |
| Decode/memory | Page layout requires no font measurement once the image and coordinates are ready. | Raster decode and decoded surfaces are heavier. One 1920 × 3106 RGBA surface represents about 22.75 MiB; two about 45.5 MiB, before other browser resources. Actual allocation can differ. | Keep a small bounded decoded-page window. Do not mount/predecode the whole Mushaf. |
| Zoom | Relative lettering/spacing stay stable; normal phone reading has ample source pixels in the tested case. | Raster detail runs out at high magnification, especially on dense displays. | Suitable for normal/moderate zoom; a high-zoom requirement needs a genuine higher-resolution master or another fixed-composition representation. |
| Accessibility | Semantic word buttons, RTL keyboard movement and the existing tray can coexist with image artwork. | An image does not supply native text selection, continuous screen-reader reading or accessible copy by itself. Those are not completed in this proof. | Preserve a real semantic layer; do not call the prototype fully accessible. |
| Maintenance | Immutable artwork and coordinate versions make accidental spacing drift easier to prevent. | Upstream asset changes and exceptions still need controlled review. | Simpler rendering responsibility, provided we maintain one authoritative geometry source. |
| Decorative frame | Surah headers already provide a traditional appearance; a neutral outer frame is possible. | The tested 16px frame inset reduces a 364px phone text width by about 8.8%. | Keep the outer frame optional; avoid paying that legibility cost by default on phones. |

Measured resource details: the eight sample PNGs total 1,451,867 bytes, versus 464,640 bytes for their eight QCF fonts. The complete offline proof cached about 3.17 MB including both representations, semantic geometry and its shell. That is not a projected all-604 production installation size.

On this machine, 32 bitmap decodes had a median of 16.85 ms and maximum of 34.30 ms. Font decoding had a median of 1.95 ms and maximum of 2.40 ms. The font timing excludes DOM shaping, layout and geometry measurement, so it is not an end-to-end renderer speed comparison. No network throttling, sustained-device memory profiling or low-end phone benchmark was performed.

At 364 CSS pixels wide and DPR 3, the page needs 1,092 device pixels at 100% zoom, 2,184 at 200%, and 4,368 at 400%. The candidate has 1,920 source pixels across. It therefore begins magnifying source pixels before 200%, and the inspected 400% capture is visibly softer. [200% capture](../outputs/mushaf-bounded-proof-2026-09-09/zoom-200-dpr3.png), [400% capture](../outputs/mushaf-bounded-proof-2026-09-09/zoom-400-dpr3.png). Upscaling the same PNG would not create additional detail. Switching to a differently composed font renderer at high zoom would undermine the consistency being sought.

## What a production implementation should look like

One approved master package should own page artwork, dimensions, word-piece mapping and exceptions. A build-time adapter can produce compact per-page geometry; shipping the generator SQL or adding a runtime SQLite engine is unnecessary for this design.

The shared page renderer should expose those coordinates to live judging and Results through one geometry contract. Keep semantic Quran text and stable target IDs independent of the image. Keep image and overlays on one uniform transform. **Do not retain an invisible copy of the old typesetter to measure positions over the new image.** That would reintroduce two conflicting sources of geometry.

Retain a small neighboring-page decode window, version cache installation as one asset package, make missing/corrupt pages visibly non-markable, and check that queued page loads cannot place old overlays over a new image. Add approved visual references and corpus mapping checks to future changes. These are specific stability controls, not a promise that asset reuse automatically supplies Tarteel-level operational reliability.

## Remaining gates and stopping point

The bounded proof is complete. The next work should be a focused asset/adapter acceptance slice, not another broad library search or full rewrite:

1. Resolve and independently check the internal boundary for the page-254 pair against the chosen artwork; finish classifying the source-word comparison differences without changing religious text or target rules.
2. Accept the exact visual master. If literal physical 1405 identity is required, authenticate that reference and compare it before approving this digital package. Confirm applicable artwork redistribution terms; code licenses alone do not establish them.
3. Decide the required high-zoom quality and test representative physical iOS/Android devices, including native browser zoom, offline installation/cache loss, memory pressure and prolonged navigation.
4. Only after those gates, integrate one shared page-rendering slice with the actual judging ledger, gesture coordinator and Results overlay paths. Run their scoped contract tests and visual review before any commit or publication.

A smaller line-wash-only change to the current renderer remains a low-risk option if an immediate cosmetic fix is needed. It would address irregular box heights but leave the composition problem intact. Given the user's stated priority of hifz familiarity, the fixed-master route remains the preferred longer-term choice.

## Confidence and release status

| Scope | Practicality | Architecture/data safety | Visual certainty |
| --- | ---: | ---: | ---: |
| Fixed-master direction for normal/moderate zoom | 92 | 88 | 90 for the tested digital reference pages |
| This exact package as a production judging replacement today | 80 | 76 | 83; mapping and device/reference acceptance remain |
| Exact physical-print facsimile claim today | 65 | 75 | 55; unchanged and deferred |

These are calibrated judgments, not statistical probabilities. Prototype success does not override a failed or unverified release gate.

Built and verified: isolated eight-page comparison, seven-page word interaction, actual letter tray reuse, joined/separated washes, optional frame, source mapping diagnosis, Chromium geometry/keyboard/touch/offline checks, strict type check and isolated build. Screenshots were visually inspected.

Not done: main-app implementation, competition/ledger migration, physical-device/Safari/native browser-zoom acceptance, authenticated print certification, complete accessibility acceptance, user visual approval, commit, push or publication. Existing dirty work was preserved; the application-source diff remains zero.

Evidence: [mapping audit](../outputs/mushaf-bounded-proof-2026-09-09/mapping-audit.json), [page-254 explanation](../outputs/mushaf-bounded-proof-2026-09-09/page254-diagnosis.json), [semantic sanity check](../outputs/mushaf-bounded-proof-2026-09-09/semantic-audit.json), [browser results](../outputs/mushaf-bounded-proof-2026-09-09/browser-results.json), [touch/zoom/decode results](../outputs/mushaf-bounded-proof-2026-09-09/advanced-results.json), [measurements and source/build hashes](../outputs/mushaf-bounded-proof-2026-09-09/decision-metrics.json), [reproduction instructions](../outputs/mushaf-bounded-proof-2026-09-09/README.md).

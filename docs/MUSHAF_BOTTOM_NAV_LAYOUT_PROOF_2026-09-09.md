# Bottom navigation and page details: isolated layout alternative

2026-09-09. Preview: `http://127.0.0.1:5294/?layout=spread&revision=3`.

The prior URL opened a comparison, with the current renderer at left and the new fixed artwork at right. A fresh 1400-pixel browser reproduced that arrangement: candidate x=730, baseline x=48. It was not a centered two-page book. This explains the reproduced right-side placement; the user's exact in-app viewport was not inspected through the disconnected browser bridge.

## What changed

- Added a separate centered viewing alternative, with two consecutive pages in the app's existing right-to-left order. It offers five sample pairs: 2–3, 50–51, 292–293, 576–577, 603–604. These are evaluation anchors following the existing application convention, not newly certified physical binding pairs.
- Put surah names, juz and page labels beneath each page. Names come from the existing surah index; the surahs and juz ranges are derived from the actual semantic words on each page. Mixed-surah pages list every surah, rather than carrying one label across a transition.
- Added one bottom-center selector in a curved bridge spanning the narrow gap. It sits below the image viewport, with metadata toward the outer sides. The former comparison's page selector is not duplicated above this alternative.
- Retained `--page-paper` (`#fbfaf7`), source artwork, source image proportions and original surah headings. Reused the existing app font/color foundations. No added decorative outer frame or re-typesetting.
- Portrait phone mode shows one centered page with its details and selector below. Landscape shows a wider single-page scroll window. The three-dot menu offers a live image-size slider and Fit page/Fit width as appropriate; these are layout-study controls, not a production preference migration.

The study is deliberately read-only: it evaluates composition, navigation, metadata and viewing. The header links back to the existing marking comparison. The known page-254 and page-293 word-boundary guards remain in that comparison; this layout does not resolve or bypass them.

## Validation and limits

`test-layout.mjs` passed 30 sample/viewport cases across 1400×1000, 1024×768, 390×844 and 844×390 in Chromium. It checks horizontal/vertical book centering, bridge centering, viewport fit, document overflow, page ratio, unchanged paper color, metadata below the artwork viewport and no metadata under the bridge. Fifteen additional checks passed for slider enlargement, reachable navigation while zoomed, Escape/focus handling, navigation and independently specified mixed-surah expectations for pages 577, 293 and 604. No browser exceptions occurred.

Strict TypeScript and build passed. The existing marking proof also passed its 54 layout cases and 11 interaction checks after the alternative was added; its nine-page offline regression passed with approximately 3.29 MB cached. The new layout's extra image/data set has **not** been added to the offline installer and must not be advertised as offline-ready. Physical-device gestures, screen-reader completeness and user visual acceptance remain open.

Screenshots `bridge-final-1400.png`, `bridge-final-1024.png`, `bridge-final-390.png`, `bridge-final-844.png` and `layout-results.json` are under `outputs/mushaf-bounded-proof-2026-09-09/`. The alternative stages ten unchanged PNGs (approximately 1.83 MB total, overlapping the earlier proof's assets); provenance and SHA-256 hashes are in `layout-source-manifest.json`.

Implementation is confined to the proof folder. Nothing committed, pushed or published. Main app content is unchanged. The additional study does not establish a pixel-for-pixel physical-print match or prove better text size than the real judging workspace; that requires comparing the same available viewport and surrounding judging controls.

Confidence for this layout alternative: practicality **94/100**, architecture/data safety **94/100**, visual certainty **82/100**. The visual score reflects actual browser review with user acceptance and real device work still pending.

## Next research phase: ordered, bounded deliverables

1. Reproduce the page-254 split mismatch and the page-293 `مِنَ ٱلذُّلِّ` boundary failure in the paired upstream renderer/data and our adapter. Deliver a cause trace separating source geometry, glyph-to-word mapping, legitimate calligraphic overhang and our rectangle partitioning. Do not assume overlapping raw rectangles are inherently defective.
2. Produce a corpus-wide exception inventory for page/line/role/word correspondence and suspicious overlaps/narrow targets. Inspect flagged examples and ordinary controls against the accepted master. Deliver verified correction options and their coverage, not guessed midpoints or an expanding list of visual patches.
3. Choose a dependable interaction source/adapter, with master provenance and reuse terms established. If evidence is insufficient, retain the fixed artwork as a candidate but do not migrate production marking.
4. Once correspondence passes, place the real marking interaction into the selected viewing shell. Validate zoom/scroll/pinch cancellation, exact question-line return, persistence and offline installation on target devices. Use this layout alternative for visual review; additional border and Unicode modes remain optional later work.

The earlier next-phase brief remains the broader trade-off record. Its viewing-layout portion now has a preliminary browser proof; its correspondence, actual judging gestures and integration gates remain unfinished. No new full-corpus research was claimed as completed in this layout turn.

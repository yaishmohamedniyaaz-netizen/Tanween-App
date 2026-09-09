# 1405 proof refinement: endpoints, paper and coordinate limits

Revision 2, 2026-09-09. This updates the isolated proof only. The main application, Quran text, judging ledger, target IDs and deployment are unchanged.

## Decision

Keep the fixed artwork candidate under evaluation, but do not adopt its supplied coordinate database as production-ready. The user's line-end and paper observations have simple fixes. The wasl investigation exposed a separate, material coordinate problem that the earlier rectangle tests did not detect.

The professional acceptance test must ask both **does the browser follow the coordinates consistently?** and **do those coordinates identify the correct printed word?** The earlier successful tests established the first, not the second.

## Changes in this revision

| Observation | Finding and revision | Remaining limit |
|---|---|---|
| Opening-page side highlights extend too far | Removed the generator's expansion of every row to the whole page's widest left/right boundaries. Each row now ends at its own supplied outer bounds. Added page 2, alongside page 3, to cover both Baqarah opening references. | Supplied bounds still need ink-level verification. |
| Uneven vertical or lateral filling | Retained shared vertical bands within each row and a single proportional page transform. No extra font spacing or per-word vertical fitting was introduced. | Exact row top/bottom inset and application viewport fitting remain visual-review decisions. |
| Stark white paper | The source PNGs have transparent backgrounds. Set the page background to existing `--page-paper` (`#fbfaf7`) and surrounding proof background to `--bg`. | No physical-device performance claim. This is the light-theme proof. |
| Outer frame unnecessary | Removed the experimental frame checkbox and inset frame/padding. Retained the simple container boundary and original surah header artwork. | No source-image cropping or decoration removal. |
| Ayah markers should not be selectable | They already had no word buttons. This revision also excludes them from sample washes; tested marker centers cannot target a word. | A rectangle near a marker is not a per-pixel ornament mask. |
| Wasl overlap | Found a demonstrably bad boundary at `مِنَ ٱلذُّلِّ`, 17:111, page 293. Disabled this pair's sample marking and washes, with a visible explanation. | Not fixed by CSS. Verified coordinates or another source-backed interaction representation are required. |

Retained: unchanged source artwork, page proportions, existing letter tray, semantic IDs, independent sample findings, joined/separated highlight options and offline proof. Recomposed: line-end extent and paper background. Removed: decorative outer-frame experiment and coloring on verse markers.

## Reproducible endpoint evidence

On page 2's bottom row, the former expansion added **305 source pixels to the right** of `2.5.6`, and **300 to the left** of the row's ending marker. The preceding row inherited 140/147 pixels. A 305-pixel extension is about 58 CSS pixels at a 364-pixel page width, enough to explain the user's conspicuous overhang.

The new generator changes outer horizontal band edges only. It leaves the word artwork, raw source rectangles, internal partition rule and vertical bands unchanged. Every inspected row now has zero page-wide excess beyond its own supplied endpoints. This is not a claim that raw source rectangles perfectly trace every glyph.

Browser captures under `outputs/mushaf-bounded-proof-2026-09-09/`:

- `previous-p2-edges-1400.png`: previous geometry and white paper reconstructed over the same unchanged source image.
- `refined-p2-edges-1400.png` and `refined-p2-edges-390.png`: corrected endpoints and app paper color.
- `refined-p2-wasl-1400.png` and `refined-p3-wasl-390.png`: focused wasl inspection.
- `unverified-p293-wasl-1400.png`: captured failure before disabling the unverified pair.

These are real Chromium captures. Full-page capture uses an uncapped proof scroll container to avoid photographing clipped content; the normal interactive preview retains its scroll limit.

## The coordinate problem is substantive

For page 293, line 9, the supplied horizontal rectangles are:

| Tahqeeq word ID | Text | Source horizontal bounds |
|---|---|---|
| `17.111.17` | مِنَ | 617–831 |
| `17.111.18` | ٱلذُّلِّ | 583–731 |

They overlap by **114 source pixels**. The proof's existing collision rule chose 617 as the shared edge, leaving the latter wash only 37 pixels wide after its other neighbor boundary. Visual inspection confirmed an obviously narrow stripe instead of a credible word highlight.

The rectangles can therefore be disjoint and stable at every zoom while still being anatomically wrong. This finding lowers confidence in a plug-in migration using these bounds unchanged. It does not show that the page artwork itself has changed, or that every wasl occurrence is wrong. Smaller raw intersections in other inspected pages also require source/ink review; their mere presence is not proof of a visible defect.

No half-split, letter-spacing repair, word-ID merge or religious text substitution was made. The page-254 split incompatibility remains separately blocked. Pausing two words on page 293 is a proof guard, not an acceptable final production solution. Existing sample records are retained, not deleted.

The next substantive gate is an independent visual/source audit of overlapping and narrow word regions across the corpus, then verified replacements for failures. Do not continue adding page-specific guesses. If a reliable coordinate source cannot be established, narrow or reject this interaction substrate while retaining the option to reuse the artwork.

## Validation and practical cost

- Strict TypeScript checking and isolated production build passed.
- Nine pages × two viewports (1400 and 390 pixels) × three app zoom levels: **54 cases**, 4,830 word-region instances, 1,711 visible center checks, zero wrong center targets, zero horizontal document overflow, zero negative bands, zero within-row height spread. Maximum DOM/reference discrepancy: 0.170 source pixels rounded up.
- **11/11 interaction checks**, including separate adjacent findings, existing letter target identity, recategorization, keyboard behavior, saved sample reload and both known mapping guards.
- Focused endpoint/paper/marker checks: **16 cases**, 196 marker-center checks, no marker word targets, no marker washes, no overlapping generated adjacent bands and no page-wide endpoint excess. The raw-bound intersection count is retained as diagnostic data, not treated as a passing anatomy test.
- Fresh offline reload, another page, marking, cache-loss error and recovery passed. The nine-page proof cache is approximately **3.28 MB**; this is not the full 604-page deployment budget.
- An old-worker/old-geometry-cache upgrade test passed. The revision URL reloads offline, and newly included page 2 remains available. Geometry URLs are revisioned to prevent the previous cached endpoints from returning.
- The PNGs remain unchanged. The paper adjustment adds no image-processing pass, filter, replacement asset or image blend layer. Existing highlight overlays remain. No new benchmark is presented as a measured speed improvement.

Reproduction scripts: `test-proof.mjs`, `refinement-check.mjs`, `cache-upgrade-check.mjs`. Reports: `browser-results.json`, `refinement-results.json`, `cache-upgrade-results.json`. The previous geometry and key evidence are preserved in `revision1/`; previous advanced device/decode metrics remain historical, not newly rerun results.

Physical devices, native browser zoom, qualified print comparison, complete word-boundary correctness and full application layout/ledger integration remain unverified. The page aspect ratio is preserved; fitting the full page into every screen necessarily trades text size against scrolling. This revision does not stretch the artwork to fill a viewport or establish physical-print identity.

## Confidence and Spark scope

For this isolated revision: **practicality 94/100; architecture/data safety 90/100; visual certainty 78/100**. The first two reflect reversible isolation and tested contracts; the visual score remains below implementation-ready because source geometry and user/device acceptance are unresolved. Production migration remains blocked regardless of the passing mechanical checks.

Spark is suitable for tightly specified, reviewable tasks such as a known CSS token substitution, proof labels, running an existing test command, or summarizing a diff. Official OpenAI guidance explicitly describes it for focused UI iterations with browser verification: [Make granular UI changes](https://learn.chatgpt.com/use-cases/make-granular-ui-changes).

Engineering recommendation: give it one bounded task and named files, prohibit changes to Quran data/IDs/scoring/dependencies, require the relevant existing checks and review its diff before accepting it. Keep source-coordinate diagnosis, correspondence decisions and release acceptance with the primary reviewer. No model makes those tasks safe automatically. No Spark task was dispatched and no usage allowance was verified.

Local review: `http://127.0.0.1:5294/?revision=2`. Select Page 2 and Example “Line endings” or “Wasl words”; use Page 293 to inspect the explicit boundary limitation. Nothing committed, pushed or published; user visual approval remains pending.

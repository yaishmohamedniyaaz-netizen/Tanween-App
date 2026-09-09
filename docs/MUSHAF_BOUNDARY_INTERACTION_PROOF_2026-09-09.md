# Corrected word-boundary interaction proof

Latest continuation: [registered corpus boundary evidence](./MUSHAF_REGISTERED_BOUNDARIES_2026-09-09.md).
All 54 flagged pieces and 46 controls now have source-PNG registration;
fragment ownership remains open. The four-target probe was subsequently
published on its own review site. The owner accepts the hosted layout for
this stage, with later small vertical positioning adjustments.

2026-09-09. Local route: `http://127.0.0.1:5294/?layout=boundaries&revision=1`.

## Outcome

Four experimentally corrected word targets now work with the existing letter tray and semantic target IDs. The old nine-page comparison and its original guards remain available. Production rendering, Quran text, scoring, evidence and device preferences are unchanged; nothing was committed or published.

This is an interaction test surface, not the intended final Mushaf layout. Only the two investigated words on each of pages 254 and 293 are interactive. The remaining words and ayah markers are not enabled here. The page selector/scrolling/padding regressions in layout revision 6 remain unresolved and unaccepted.

## Implemented corrections

### Page 254

The two existing targets `13.37.7` and `13.37.8` use the source-supported x=178 separation described in the [boundary findings](./MUSHAF_WORD_BOUNDARY_FINDINGS_2026-09-09.md). Neither the image nor the glyph shapes were changed.

Before deriving the highlight row, the data builder rechecks all 163 upstream glyph-region associations on this page against the corrected local grouping. This also fixes an earlier vertical contamination: the misassociated second word had stretched row 6 to y=1340.5. The corrected shared band is **1048.5–1257.5**. Both words use that same height and keep separate identities and findings.

The probe uses body activation bands `[178,1048.5,336,1257.5]` and `[108,1048.5,178,1257.5]`. The inner x=178 division has exact contour and transparent-pixel support. Outer band ends and row treatment are bounded presentation candidates, not universal print-geometry certification.

### Page 293

The main activation/wash bands are `[739,1639,832,1837]` and `[580,1639,739,1837]`. The original two-pixel fragment remains in the PNG. Its small extra activation region `[618,1822,619,1824]` retains `17.111.17` as its semantic owner and takes precedence over the neighboring broad body region at that exact fragment.

The visible wash stays around the main word body rather than expanding across its neighbor to enclose the fragment. This is an explicit experimental policy; it does not delete the fragment or assert a new religious-text interpretation. The fragment is not given enlarged invisible touch padding or a duplicate keyboard stop. Keyboard focus and the letter tray return to the word's main body.

Washes can touch visually, but records remain independent. Different categories retain distinct colors. Imported source boxes can be shown as a read-only comparison; this mode exposes no target buttons.

## Integrity and interaction behavior

- The build pins the geometry JSON hash. Its manifest binds the exact image hash, dimensions, page identity and the four expected semantic IDs. No target is enabled before geometry and artwork both verify and the image decodes.
- A selected-page/loaded-page identity check prevents old artwork from momentarily receiving the new page's targets. Aborted/delayed loads cannot replace a newer selection. Failed integrity checks show a retryable error with no marking layer.
- The real `DragMenu` and `judgingTargetsOf` are reused. Sample records use a separate proof storage key; malformed existing proof records are left untouched and marking is disabled instead of overwriting them.
- Pointer movement, cancellation, a second pointer and scrolling cancel unfinished activation. An immediate cancellation reference also prevents a stale category callback from committing an already-selected letter during a second-touch sequence. Keyboard activation recovers afterward.
- Opening the tray waits for focus-driven scrolling to finish before taking its anchor. This fixes a reproduced short-viewport race in which the existing tray received an already-queued scroll event and closed immediately. A pending opening can be cancelled by Escape or a new gesture/navigation action.

These are isolated proof behaviors. Integration must still use and validate the production judging gesture/ledger flow; copying the proof's disposable store or treating simulated gesture checks as device acceptance would be incorrect.

## Expanded inspection: the seven remaining flags

The previous 50x50-font-unit diagnostic threshold missed slightly larger remote contours and degenerate line segments. The remaining flagged rows were inspected in the unchanged source images and original font outlines:

| Page | Responsible word | Remote contour dimensions in font units |
| --- | --- | --- |
| 11 | `2.70.13` | 61 x 103 |
| 32 | `2.204.13` | 79 x 0 |
| 53 | `3.26.2` | 60 x 141 |
| 345 | `23.46.4` | 101 x 0 |
| 365 | `25.62.1` | 0 x 118 |
| 412 | `31.17.1` | 29 x 68; the following word's partition narrows |
| 441 | `36.18.11` | 69 x 0; the following ayah marker's partition narrows |

Using a 150-unit maximum dimension for **diagnosis only** identifies 54 affected glyph pieces across all 53 flagged lines on 46 pages. The four zero-width/height entries above are degenerate source contours. None was removed from a font or image. The original threshold report is preserved separately from the expanded report.

The [seven-row comparison](../outputs/mushaf-word-boundary-2026-09-09/remaining-flags.png) shows how the previous partitions collapse even though the source artwork remains legible. Page 441 is the one marker flag, not another recited-word failure.

## Counterfactual corpus check

A separate offline model replaces only these 54 glyph envelopes with approximate main-body horizontal bounds derived from their font coordinates. It then reruns the same corpus diagnostics. Raw source files remain untouched, and the model's coordinates are not loaded by the interactive probe.

| Diagnostic | Original envelope model | Main-body counterfactual |
| --- | ---: | ---: |
| Partitions retaining less than half their supplied width | 59 (58 words, 1 marker) | 0 |
| Adjacent min-x order inversions | 25 | 0 |
| Same-line horizontal intersections | 6,872 | 6,802 |
| Metadata / role association failures | 0 / 0 | 0 / 0 |

This supports a shared correction mechanism. It does not prove all 604 pages correct. The model uses an affine approximation from the old envelope, rather than registration of each proposed body bound against its page pixels. The flagged examples were used to construct the model; there is no independent holdout validation of a general corpus generator yet. Remaining intersections can include legitimate calligraphic overhangs and still require appropriate ownership handling.

Do not ship the 150-unit scan threshold as an automatic religious-contour filter. Next data work should register and review the actual source-body regions, preserve detached fragments explicitly, examine independent unflagged controls and rebuild the corpus checks before enabling more targets.

## Validation

- **166/166 browser checks passed**, covering both cases at 1400x900, 1024x768, 390x844 and 844x390. Includes independent word/letter IDs, different categories, joined washes, recategorization, removal, reload, keyboard navigation/focus, browser touch taps, cancelled movement, synthetic pointer cancellation/second-pointer sequences, prevention of selected-letter commits after cancellation, investigated-word visibility, invalid geometry/image rejection, retry and delayed-page loading.
- Strict scoped TypeScript and isolated Vite build passed. The final build is still only the disposable localhost proof.
- Existing comparison regression passed **54 cases and 11 interaction checks**. Its original p254 and p293 guards remain in place. Its nine-page offline checks passed; the new four-target probe is not advertised as offline-ready.
- The earlier **13 source/shape/pixel checks** passed again. Original source image hashes remain unchanged.
- Fresh viewport screenshots were inspected. Prefer `interaction-*-viewport.png` for visual assessment. Full-document captures made during the sequential harness did not consistently show the scrolled region; they are not used as visual acceptance evidence.
- Production tracked source, scripts, public assets and package content diff remained empty. Unrelated work was preserved.

Physical iOS/Android behavior, practical finger accuracy on short words, the full judging ledger, production offline packaging and qualified print-reference acceptance remain separate gates. Browser touch emulation and dispatched multi-pointer events do not substitute for those checks.

## Next slice

Retain this four-target probe as the interaction regression reference. Register the 54 affected glyph bodies against unchanged source pages, add independently chosen unflagged controls, and decide how all detached fragments participate in hit testing and washes. Expand enabled targets only when those candidate regions have direct evidence. Integrate the real judging flow and repair the accepted separate-bottom-selector layout afterward; do not reopen the rejected bridge designs.

Confidence for the bounded interaction proof: practicality **95/100**, architecture/data safety **95/100**, visual certainty **84/100**, pending owner/device review. For a corpus-wide automatic generator, confidence remains lower: practicality **90/100**, architecture/data safety **88/100**, visual certainty **75/100**. The counterfactual clears diagnostic flags, not production acceptance.

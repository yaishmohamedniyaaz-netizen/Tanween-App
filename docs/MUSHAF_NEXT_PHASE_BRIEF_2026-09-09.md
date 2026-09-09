# Mushaf: current position and next bounded phase

Latest direction: the owner selected a separate bottom selector with minimal spacing and no page-footer numerals. The [fixed-master implementation plan](./MUSHAF_FIXED_MASTER_IMPLEMENTATION_PLAN_2026-09-09.md) supersedes the bridge/layout exploration below. Next work is source correspondence, followed by real judging integration; zoom expansion remains deferred.

Latest owner steering: [compact shell planning](./MUSHAF_COMPACT_LAYOUT_DIRECTION_2026-09-09.md) rejects revision 3's large footer and bridge, defaults to page numbers only, and freezes zoom work. Apply that scope to the next visual research phase; the broader zoom/landscape options below are deferred context, not current work.

Subsequent layout update: [bottom navigation proof](./MUSHAF_BOTTOM_NAV_LAYOUT_PROOF_2026-09-09.md) now demonstrates the centered spread, bottom metadata/selector and portrait/landscape viewing in Chromium. It is a read-only layout study; correspondence and real marking integration remain the next gates. The planning inspection described below predates that implementation.

Planning update, 2026-09-09. No new UI implementation or browser test was performed for this brief. Repository code and prior proof evidence were reinspected; browser platform guidance was checked. The proof remains separate from the live application.

## Status without a misleading completion percentage

We are finishing feasibility/proof evaluation, before renderer integration. Appearance and stable scaling are demonstrated in the nine-page proof; production correspondence and full judging interaction are unfinished.

| Concern | What is established | What remains |
|---|---|---|
| Letter spacing and page stability | Fixed artwork scales as one surface; no runtime rejustification. Source PNG bytes are unchanged. | Authenticate the required physical 1405 master. Digital source identity alone does not prove physical facsimile identity. |
| Highlight heights and ends | Shared height within each row; excessive page-wide endpoint expansion removed. | Final vertical insets and correct boundaries for all printed words. |
| Color | Existing app paper token `#fbfaf7` is used behind transparent artwork. No image processing/filter added. | Preserve this token through the real viewport integration. No new palette is proposed. |
| Judging identity | Existing letter tray/target IDs and independent sample findings work in proof. | Page 254 split mismatch; page 293 intersecting-word case; complete source mapping and ledger integration. |
| Zoom | App zoom preserves proportions in tested Chromium cases; earlier emulated pinch retained the page ratio. | Real iOS/Android marking-versus-pinch behavior; high-zoom visual quality; scroll-position anchoring. |
| Navigation/layout | Existing live app has a size slider, Fit, page navigation and return-to-question. | Integrate the fixed master into that viewport; evaluate optional footer bridge and landscape presentation. |

The previous 54 layout cases and 11 interaction checks are meaningful mechanical checks, not 54 independent print-fidelity approvals. Two known coordinate failures do not mean the rest of the corpus is certified. Do not report a percentage of the Quran as visually verified.

## Reuse available foundations

- `MushafSizeControl.tsx`, used by `MoreActionsPopover.tsx`, already provides a live range slider and Fit action. Current app preference limits are 100–150%; the isolated proof's larger zoom range is a different evaluation setting. Extending production range requires explicit normalization/migration review, not just a wider slider.
- `MushafViewport.tsx` already owns fit sizing and scroll restoration. Its current restoration preserves a fraction of scroll range; an exact question/word anchor is a stronger requirement to test when resizing or rotating.
- `App.tsx` already exposes Return to question when the selected passage is off the visible pages. It currently changes to the opening page. It does not establish visibility of the exact question line when zoomed on the same page. `Mushaf.tsx` also has a target-based reveal mechanism that can inform this extension.
- `mushafFit.ts` reserves 40 pixels for the top shared navigation row. It assumes page aspect ratio 0.68; the source images are 1920/3106, approximately 0.618. The new surface needs its own truthful dimensions. Blindly reusing the old ratio would distort or misfit it. At equal full-page height the new outer canvas is approximately 9.1% narrower; this is a canvas calculation, not a measured 9.1% text-size loss.

## Navigation bridge: feasible, optional

The proposed arrangement is a two-page spread with separate page surfaces, joined visually only by a small curved bottom-center control area. Page-number labels can remain at the top initially; the selector can move independently. Neither is part of Arabic word layout.

Retain original page artwork and paper tone. Recompose the shared navigation wrapper as a bottom-center control. Remove the now-redundant top row only if the candidate passes fit and reachability checks. A lightweight CSS shape can make the bridge; it should not bend, crop or stretch Quran artwork.

Moving a 40-pixel row from top to bottom alone saves no height. An actual gain requires using confirmed blank margins/gutter space, or making the rest of the layout more compact. Compare full-page text size, visible line count and control hit area with the old arrangement. Never accept overlap with the last Quran line or ayah ornaments as a space saving.

For one-page phone mode, use one compact bottom control, not an artificial two-page spine. When zoomed, controls should remain reachable in the viewport; a selector attached only to the far-away bottom of the enlarged page could be inaccessible. Keep control size independent of page zoom. Test whether a persistent footer's height outweighs its navigation benefit in landscape.

The design grammar currently documents the top-row arrangement. This is a proposed revision to evaluate, not a reason to prevent the owner's requested experiment. Update that rule only after the new composition is accepted.

## Zoom, touch and landscape

Recommended evaluation order:

1. Reuse the existing slider and Fit action to scale the whole page plus every overlay with one scale. Preserve the chosen word/line in view as the value changes. Keep the menu compact enough to see the page respond; no typesetting occurs during slider movement.
2. Support a landscape, single-page, width-fitted reading window. Show fewer lines at a larger size and scroll vertically through the unchanged page. Do not skew/rotate the glyphs or force two pages on a phone. Extend Return to question to reveal the exact selected line even when its page is already open. A neutral arrow may indicate the offscreen direction; it must not use mistake colors or assert unverified live-recitation tracking.
3. Evaluate pinch alongside marking. Touch sensitivity does not prohibit pinch. Native browser pinch is simpler but may magnify the whole interface; a page-only pinch can keep controls fixed but requires custom multi-touch arbitration. Prefer the simpler browser behavior if real-device tests meet judging requirements. Do not promise custom gestures before that comparison.

The gesture contract is non-negotiable: adding a second finger, browser gesture cancellation, or beginning a scroll must cancel the pending mark; after either finger lifts, no residual category selection may commit. Test starting a pinch directly on a word and on a tray, scroll-to-pinch transitions, rotation, and resuming deliberate marking. Existing `pointercancel` handling and `touch-action` are useful foundations, not proof of this contract.

Native pan/pinch behavior is determined by the target and its ancestors; changing `touch-action` after a gesture starts does not change that gesture. [MDN touch-action](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/touch-action).

Zoom preserves positions and proportions, but raster sharpness is finite. In the existing DPR3 phone study, a 364-CSS-pixel page used 1,092 display pixels at 100%, 2,184 at 200%, and 4,368 at 400%, against a 1,920-pixel source width. These are sampling ratios, not universal usability thresholds. Landscape width-fit can reach the same limit even without a high slider percentage. Upscaling cannot restore absent detail. [MDN image rendering](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/image-rendering).

If device review finds softness unacceptable, investigate a verified higher-resolution or vector master of the same composition before changing layout or script. Such an asset has not been established yet. Doubling each raster dimension quadruples its decoded pixel surface; compressed download size does not necessarily quadruple.

## Other options and accepted trade-offs

- **124 MB:** the owner accepts approximately this download scale for the judging product. Treat it as an acceptable planning budget, not the main architecture objection. The estimate covers upstream images and DB before final packaging. Keep compressed files cached, decode only a bounded nearby-page set, and verify completed offline installation before competition use. Browser storage retention and decoded working memory remain separate from bandwidth. [MDN storage quotas and eviction](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria).
- **Authentic border:** optional. Use a verified border belonging to the accepted edition if explored; a generic ornament would be a styling choice, not proof of 1405 authenticity. Keep it outside text and allow plain presentation on small screens. Extra border area may reduce text size at Fit. The owner's reopening of this option is not approval to replace the current plain treatment.
- **Unicode/Uthmani reading view:** defer. Uthmani orthography does not itself guarantee the physical edition's exact word positions, line breaks and spacing. A reflowable reading mode can improve large-text accessibility, but needs a separate clearly named presentation and preserved semantic IDs. It should not silently replace the fixed judging master when zoom increases.

We can plausibly retain familiar composition, paper color, page navigation, zoom, independent findings and offline operation. We cannot promise unlimited sharpness from this raster, a whole page plus arbitrarily large letters on a small screen, or correct word boundaries merely because the artwork is stable.

## Next bounded phase and stop conditions

**A. Resolve correspondence first.** Reproduce page 254 and `مِنَ ٱلذُّلِّ` on page 293 against the paired upstream renderer/data and our adapter. Distinguish source metadata, legitimate ink overhang and our rectangle-partition choices. Enumerate suspicious narrow/overlapping regions across 604 pages, check all page/line/role/semantic associations, and visually inspect exceptions plus representative ordinary regions against the accepted master. A flag is diagnostic, not an automatic correction. Deliver a source-backed explanation and proposed correction path; reject guessed word splits or growing page-specific patches. Asset/master provenance and applicable reuse terms remain part of this gate.

**B. One layout/interaction proof.** Use existing controls with the fixed surface: current top row versus optional bottom bridge, plain paper, live slider, and phone landscape with exact question return. Pinch must use the same marking interaction that production uses; the disposable proof's simple click handlers are insufficient to certify it. Start with pages 2, 293, 576 and 604 across desktop, tablet, portrait and landscape. Keep this proof reversible and isolated.

**C. Acceptance before integration.** Require source-correct targets, zero unintended marks through touch/zoom/navigation, no text/control overlap, reviewable high-zoom quality, and actual target-device/offline behavior. Then seek visual acceptance of the selected shell and implement a bounded adapter with existing scoring/evidence/preferences untouched. Do not commit to migration before the correspondence gate passes.

Research deliverables are the defect explanation, exception coverage, source choice and a clear go/no-go recommendation. The optional footer/border/Unicode ideas must not turn this into another broad redesign before that decision.

Confidence in this next-phase plan: practicality **92/100**, architecture/data safety **90/100**, visual certainty **75/100**. Visual certainty stays at prototype level: the bridge, full judging gestures and physical-device landscape have not been tried. These scores describe the plan, not production readiness.

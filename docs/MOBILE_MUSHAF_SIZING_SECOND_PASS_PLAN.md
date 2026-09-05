# Mobile Mushaf sizing: second pass

Date: 2026-09-05
Status: implemented locally; browser evidence recorded in MOBILE_MUSHAF_SIZING_SECOND_PASS_QA.md.
Awaiting visual approval and physical iPhone acceptance; not committed or published.
Baseline: cb07ca6, experimental branch claude/interactive-design-iterations-10qwpf.

## Outcome

Give the complete Mushaf the largest safe, proportional footprint in portrait
judging, with a stable position through Ready, Begin, marking, and Undo. Resolve
the remaining participant/chrome spacing in separate reviewable slices.

Retain the published compact question label, Review and Save composition, existing
page navigation on the Mushaf, and the five-second feedback behavior. Desktop,
phone landscape, Quran data, scoring, evidence, exports, and preference formats
are protected.

## Source findings and limits

- global.css caps portrait page width at 377px, even on wider phones.
- The effective single-page width also uses `68dvh - 152px`. This height-derived
  estimate does not include the safe-area terms subtracted from the actual stage.
- The single-page group reserves 44px plus a 4px gap above the paper for the
  return control. Page navigation is translated 48px down into the marginalia.
  Centering the whole group therefore does not center the paper itself.
- Prepared and active layouts duplicate stage/dock sizing rules. Their identical
  dimensions currently preserve the successful zero-movement handoff.
- The optional raised query is a 12px translation only; it does not fix sizing.
- MushafViewport already measures a frame for desktop, but its fit calculation
  does not model the mobile return row. Its input layout also comes from the saved
  preference, although mobile can display one page. Simply enabling that desktop
  path on mobile would be insufficient.
- Some mobile dock labels/actions remain 10–11px, below DESIGN_GRAMMAR's 12px
  floor. This is a readability concern to examine without enlarging all chrome.

These are current source findings. Previous browser measurements are historical;
no new physical iPhone or installed-PWA measurements were taken for this plan.

## Slice 1: reproduce and measure

Use the actual React page and loaded QCF font, at 100% browser zoom. Record the
header, safe areas, paper, complete page group, return target, stage, and dock
rectangles. Capture Ready and active judging with the return control hidden and
visible, and before/after the last-action strip appears.

Measure paper whitespace separately from the empty return row and stage centering.
Compare the default and existing 12px-raised option; do not promote the raised
option by assumption. Include the apparent participant outline in default, hover,
pointer-focus, and keyboard-focus states before removing any border.

Gate: identify which constraint limits page size at each viewport, and reproduce
any clipping. Report visible defects separately from source-level risks.

## Slice 2: one mobile fit calculation

Define one shared frame contract for Prepared and active portrait judging:

1. Establish usable space after the actual header, dock, safe areas, and clearance.
2. Reserve a stable return-control target above the paper. Keep its visible pill
   compact and its touch area at least 44px. It may occupy measured surrounding
   whitespace, but may never overlap Quran ink or header controls.
3. Fit the complete page proportionally within the remaining width and height.
   Remove the phone-specific 377px ceiling only where measured space permits.
4. Supply the effective displayed single-page layout to the fit calculation,
   without overwriting the saved desktop spread preference.
5. Keep one result through Ready → Begin and all feedback/return visibility
   changes. Recompute for real viewport/orientation changes, not mark events.

Implementation refinement: use CSS size containment at the existing mobile shell
instead of adding another JavaScript fit input. The independently sized parent
supplies actual available width/height through container units. The effective
single-page selector owns the return-row allowance without touching the saved
desktop spread preference or desktop fit path. Verify glyph hitboxes after scale
changes. This refinement avoids another resize observer and state update loop.

Installed PWA is the primary target. For ordinary Safari, use a stable available
height policy so toolbar animation does not repeatedly scale the Quran. Handle
keyboard-driven sheets separately. Validate safe areas in both environments.

Gate: full paper visible; no crop, reflow, stretched glyphs, moving page on Begin,
or occluded navigation. A wider phone may gain size; a height-limited phone may
not. Do not promise a larger page before measuring these constraints.

## Slice 3: remaining chrome

- Put the participant number before the name in the mobile Ready row using the
  existing identity presentation. Keep the question/page label and Record clear.
- Remove only a confirmed redundant decorative outline; retain visible keyboard
  focus and the participant control's affordance.
- Bring undersized labels to the existing type scale. First adjust label space
  and secondary action arrangement within the current dock footprint.
- If readable controls demonstrably need a taller dock, compare that separately
  with exact page-size cost. Do not repeat the rejected blanket 130px dock.
- Keep the published Finish layout; revisit only defects reproduced during this
  matrix, not a further results redesign.

Retained: Quran composition, navigation, shared judging state, published fixes.
Recomposed: mobile fit ownership and Ready identity placement.
Removed after verification: redundant mobile sizing estimates and any proven
duplicate decorative outline. The raised experiment is retired only after the
replacement placement is accepted.

## Verification and release

- Phones: 320×568, 360×800, 390×844, 393×852, 430×932; light and dark.
- PWA safe-area simulation plus physical iPhone acceptance. Browser simulation
  alone is not an installed iOS validation.
- Pages 1, 2, 300, 585, 601, 602, 604, including dense and multi-surah pages.
- Ready, Begin, first/last-line word selection, mark, Undo, return to question,
  queue, recording error, Notes keyboard, Adu/Raagu, invalid Finish, save/next.
- At a fixed viewport/font/page, Ready → active and feedback visibility changes
  must produce zero paper movement or size change (allow measurement rounding
  up to 0.5 CSS px). All essential chrome remains reachable.
- Verify true page/word geometry and selection at page edges; do not substitute
  regex/source-presence assertions for interaction or visual checks.
- Capture before/after desktop screenshots at 1024×768, 1280×800, 1400×900 and
  phone landscape at 852×393, with identical state, font, and scale. Require no
  intended visual difference; inspect any pixel difference before accepting.
- Run relevant fit/selection/interaction checks, then the suite and build once
  the final implementation is stable. Keep experimental release reversible.
- Present the concrete comparison for review, then commit/publish the approved
  result under the repository's release agreement.

## Evidence and confidence

- [MDN viewport units](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Values/length):
  dynamic viewport units can resize as browser controls change; small viewport
  units provide stable sizing until the viewport itself changes.
- [Apple UI design guidance](https://developer.apple.com/design/tips/):
  readable type, spacing, and at least 44×44pt touch targets. Web implementation
  follows Tahqeeq's corresponding 44 CSS-pixel control policy.
- [W3C Reflow](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html):
  preserve essential two-dimensional content while surrounding controls adapt.
  Applying that principle to this fixed Mushaf is a product interpretation.

Confidence: practicality 90/100; architecture/data safety 92/100; visual certainty
75/100. The approach is ready for a bounded prototype; exact size and vertical
placement require the measured comparison before production acceptance.

Outside this pass: Focus/zoom mode, Tilawa changes, new scoring gestures, new
preferences, results overhaul, and the older plan's 36–42% screen-height dock.
This scoped plan supersedes those older screen-allocation recommendations for
the current iteration.

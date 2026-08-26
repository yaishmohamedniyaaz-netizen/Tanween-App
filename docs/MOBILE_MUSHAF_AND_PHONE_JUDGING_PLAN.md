# Mobile Mushaf Fidelity and Phone Judging Plan

Status: Planned for later; not implemented
Prepared: 2026-08-15
Product boundary: Tahqeeq judge-facing web application
Mushaf scope: Hafs, KFGQPC/QPC V1, 1405H Madani Mushaf, 604 pages

## 1. Direct recommendation

Mobile judging is achievable, but the Mushaf must not be redesigned as ordinary
responsive text. The 1405H Mushaf should remain one composed page whose glyphs,
line breaks, centered-line decisions, spacing proportions, and aspect ratio scale
together. The judging interface should adapt around that fixed visual source.

The recommended phone layout is:

- a compact application header;
- the complete Mushaf page in the upper portion of the screen;
- a persistent judging dock in the lower portion;
- a contained mistake/history sheet instead of a long sidebar below the page;
- an optional magnified Focus mode added only after the full-page version is
  approved.

Desktop is visually protected. This plan does not authorize changes to Quran
source data, QCF glyphs, line assignments, judging targets, scores, or saved
evidence.

## 2. Current deployed findings

The deployed build was inspected at:

- 1280 x 800 desktop;
- 390 x 844 phone;
- 360 x 800 narrow phone;
- 320 x 720 minimum-width phone check.

### 2.1 What works

- The 604-page source remains the correct QPC V1 1405H page layout.
- QCF page fonts load correctly.
- Printed line breaks remain intact on mobile.
- At 390 CSS pixels, the page, font, and inter-kalimah gaps scale at almost the
  same ratio as the desktop rendering.
- The phone layout does not create page-level horizontal overflow.

### 2.2 Confirmed spacing failure

The Mushaf page continues to shrink with the phone width, but `.m-line` uses:

```css
font-size: clamp(18px, 5.55cqi, 33px);
```

The page padding also contains fixed minimums such as `16px`. Once a narrow phone
causes the proportional font size to fall below 18px, the page keeps shrinking
while the glyphs stop shrinking. The fixed-size glyphs consume the line measure,
and `justify-content: space-between` is left with progressively less space.

Observed on representative dense page 300:

| Viewport | Result |
| --- | --- |
| 390 x 844 | Scaling remains close to proportional |
| 360 x 800 | Font reaches 18px; common gaps compress to about 2-3px |
| 320 x 720 | Font remains 18px; many dense lines have effectively zero gap |

This is the principal reason mobile kalimah spacing looks unlike the desktop
Mushaf. It is a geometry/clamping issue, not a Quran-data or line-break issue.

### 2.3 Current judging-layout problem

At phone widths, `.workspace` becomes a single column and the complete desktop
sidebar is placed after the Mushaf. The rendered document becomes roughly
950-1000px tall, so active judging requires scrolling between the page and the
controls. The earlier mobile QA only confirmed stacking, lack of horizontal
overflow, and one page transition; it did not verify Mushaf spacing or a complete
phone judging workflow.

## 3. Authoritative rendering contract

QUL identifies this edition as the KFGQPC V1 layout printed in 1405H, with 604
pages and 15 lines per page. Its layout resource provides the printed line number,
line type, first and last word, and whether the line is centered or fully
justified.

Tahqeeq must therefore continue to preserve:

- all 604 page boundaries;
- all printed line boundaries;
- centered versus justified line decisions;
- QCF V1 page-specific glyphs and fonts;
- surah headings, basmalahs, ayah markers, and tashkeel;
- semantic word IDs and judging-target mappings;
- the separation between the visible QCF glyph and semantic judging data.

Source: [QUL KFGQPC V1 layout (1405H print)](https://qul.tarteel.ai/resources/mushaf-layout/15)

## 4. Proposed Mushaf architecture

### 4.1 One renderer, not desktop and mobile copies

Do not create a separate mobile Mushaf component. Use the existing page data,
font loading, glyph rendering, measured word hitboxes, mistake highlighting, and
page navigation.

Separate only these presentation responsibilities:

1. **Composed page canvas**: owns the canonical 1405H page geometry.
2. **Viewing frame**: decides how much of the page fits in the available screen.
3. **Judging overlay**: measures and maps touch input without changing the glyphs.
4. **Phone judging dock**: owns phone controls outside the page.

### 4.2 Uniform inner-page scaling

Use one width-derived scale relationship for every inner-page measurement:

- Quran font size;
- left and right page padding;
- line rhythm;
- basmalah size and spacing;
- surah-band geometry;
- marginalia spacing;
- selection wash geometry.

Do not allow the font, page padding, or cartouche measurements to reach unrelated
minimum clamps while the rest of the page continues shrinking. The first bounded
implementation should preferably replace the mobile-breaking floors with
proportional container measurements rather than introduce a second layout engine.

The page scale should be driven primarily by available width. It should not change
continually as mobile browser chrome expands or retracts.

### 4.3 Default Full-page mode

The initial phone mode should show the complete page, preserving its aspect ratio
and spacing proportions.

Recommended screen allocation:

- application header: approximately 48-52px;
- Mushaf stage: approximately 58-64% of usable height;
- judging dock: approximately 36-42% of usable height.

At 390 x 844, the current full page is about 510px tall. With a compact header,
approximately 280px remains for a well-composed judging dock.

### 4.4 Optional Focus mode

Full-page fitting necessarily makes dense text smaller on narrow phones. A later
Focus mode may provide:

- 125% or 140% magnification of the same page;
- contained pan inside the Mushaf stage;
- a clear `Fit page` action;
- centering the selected kalimah when jumping from the mistake log;
- no automatic movement while the judge is touching the page.

Focus mode must magnify or crop the existing page. It must never reflow, wrap, or
redistribute Quran words.

Recommended default: Full page. Focus remains optional until the faithful
full-page implementation is approved on real phones.

## 5. Proposed phone judging workspace

The screen-filling phone workspace should activate only when judging is active.
Idle Mushaf browsing, competition setup, settings, roster work, and records can
retain normal page scrolling.

### 5.1 Screen structure

```text
┌──────────────────────────────────┐
│ Compact app/session header       │
├──────────────────────────────────┤
│                                  │
│       Faithful Mushaf page       │
│       Full page by default       │
│                                  │
├──────────────────────────────────┤
│ Score · criterion status · tabs  │
│ Active letter/category controls  │
│ Mistakes / Notes / Finish        │
└──────────────────────────────────┘
```

### 5.2 Compact score summary

The dock header should show:

- total score and total available marks;
- one concise status item for each criterion assigned to this device;
- the Adu/Raagu value as its existing clean mark control;
- no duplicated category labels or decorative explanatory copy.

The full desktop scorecard must not simply be squeezed into 280px. Scoring logic
should be reused while the phone presentation is recomposed.

### 5.3 Kalimah and exact-target interaction

On phone:

1. The judge taps or holds a source kalimah.
2. The complete printed kalimah remains highlighted on the Mushaf.
3. The exact-letter rail and permitted categories open in the lower dock.
4. The judge chooses an exact target and category through large controls.
5. The result commits on release or an explicit tap.
6. Cancellation and undo remain available.

The existing hold-drag-release path can remain as a fast path, but every result
must also be possible with untimed taps. The phone should not require precise
dragging.

Sources:

- [WCAG dragging-movement alternatives](https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements.html)
- [WCAG pointer cancellation](https://www.w3.org/WAI/WCAG22/Understanding/pointer-cancellation)

### 5.4 Mistakes and history

The current inline/expanded log should become a contained phone sheet:

- `Mistakes` and `History` remain tabs;
- only the sheet scrolls;
- opening a mistake centres and flashes the corresponding kalimah;
- the sheet never changes the Mushaf page geometry;
- expanded deduction controls retain the highlighted kalimah, reference, amount,
  plus, minus, and undo actions;
- closing the sheet returns to the judging dock without losing page position.

### 5.5 Notes and finish

- Notes should be a dock tab or a short expandable region, not a permanently
  visible textarea.
- `Finish recitation` should remain persistent and reachable.
- Finish must be visually separated from frequent marking controls and retain its
  existing confirmation flow.

## 6. Touch and accessibility rules

The source Mushaf is a dense, dimension-sensitive document. Enlarging every
visible glyph into a conventional button would alter its layout. The correct
approach is to preserve the page while providing a forgiving invisible hit layer
and a large confirmation surface in the dock.

Rules:

- provide at least a 24 x 24 CSS-pixel effective kalimah target wherever adjacent
  printed geometry permits;
- retain nearest-word disambiguation where neighbouring hit regions overlap;
- use at least 44px for dock buttons, tabs, score controls, plus/minus controls,
  letter chips, category pills, close actions, and finish actions;
- preserve visible press, selected, committed, cancelled, and disabled states;
- support tap, pointer, keyboard, and undo paths;
- never depend exclusively on dragging;
- commit consequential pointer actions on release, not pointer-down;
- keep focus visible and unobscured when sheets or the virtual keyboard appear.

Sources:

- [WCAG 2.2 target size minimum](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html)
- [Apple UI design guidance](https://developer.apple.com/design/tips/)

## 7. Viewport and scrolling policy

### 7.1 Active phone judging

- Use a screen-filling judge shell.
- Prevent page/body scrolling while the active judge shell is open.
- Allow controlled scrolling only inside the mistake/history sheet or another
  explicitly scrollable dock panel.
- Keep the Mushaf page stationary while a mark is being chosen.
- Respect top, bottom, left, and right safe-area insets.

### 7.2 Height units

Dynamic viewport units account for changing browser chrome but can also resize
content while the browser interface changes. Therefore:

- keep Mushaf scale width-driven;
- use stable height allocation for the main judge shell;
- use the visual viewport only when an overlay, magnified view, or keyboard must
  remain visible;
- do not continuously recompute Quran typography from `dvh`.

Sources:

- [MDN viewport length units](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Values/length)
- [MDN VisualViewport](https://developer.mozilla.org/en-US/docs/Web/API/VisualViewport)

### 7.3 Reflow boundary

WCAG permits two-dimensional content whose dimensions are essential to meaning to
retain its layout, while adjacent controls and commentary should adapt. The fixed
Mushaf page is the dimension-sensitive region; the scorecard, mistake log, notes,
and navigation are the responsive interface around it.

Source: [W3C understanding reflow](https://www.w3.org/WAI/WCAG21/Understanding/reflow)

## 8. Phased implementation plan

### Phase 0 - Rollback checkpoint and baseline

1. Create a rollback branch or tag before visual edits.
2. Capture desktop and phone screenshots of pages 1, 2, 300, 601, 602, and 604.
3. Record page rectangles, font sizes, line widths, normalized glyph positions,
   and inter-kalimah gaps.
4. Capture the active desktop judging workspace and its phone-stacked equivalent.
5. Confirm that `.private/`, `tmp/`, and unrelated user changes remain untouched.

Gate: the current visual and interaction baseline is reproducible.

### Phase 1 - Mushaf geometry repair only

Likely files:

- `src/styles/global.css`
- `src/components/Mushaf.tsx`
- focused Mushaf geometry/browser tests

Work:

1. Separate the outer viewing frame from the inner composed page.
2. Remove mobile-breaking minimum clamps from inner-page proportional geometry.
3. Scale font, padding, cartouches, basmalah, and line rhythm from one canonical
   page measure.
4. Keep page line data, QCF font loading, hitbox measurement, and saved word IDs
   unchanged.
5. Ensure the page does not resize because browser chrome changes height.
6. Re-measure hitboxes after a true page-width change only.

Gate:

- pages 1, 2, 300, 601, 602, and 604 preserve desktop-normalized geometry;
- page 300 no longer collapses its gaps at 360px or 320px;
- desktop screenshots remain visually unchanged;
- all existing Mushaf and judging tests pass.

This phase must be reviewed before the mobile judging dock is implemented.

### Phase 2 - Screen-filling phone judge shell

Likely files:

- `src/App.tsx`
- `src/styles/global.css`
- a focused responsive-layout helper or component if needed

Work:

1. Activate a phone judge-shell class only for active recitations.
2. Allocate the upper stage and lower dock within the usable phone height.
3. Prevent body scrolling inside active judging.
4. Keep normal scrolling in idle, setup, settings, roster, and records views.
5. Add safe-area and phone-landscape behavior.

Gate:

- the complete page and essential judge controls are usable without document
  scrolling at 360 x 800 and 390 x 844;
- no frozen scroll, hidden finish action, or horizontal overflow occurs;
- desktop remains unchanged.

### Phase 3 - Recompose judge controls

Likely files:

- `src/components/ScorePanel.tsx`
- `src/components/MistakeLog.tsx`
- `src/components/NotesBox.tsx`
- `src/components/DragMenu.tsx`
- a new `MobileJudgeDock.tsx` only if presentation cannot remain cleanly shared

Work:

1. Extract shared score data from desktop presentation where necessary.
2. Build the compact score summary without duplicating scoring calculations.
3. Place mobile exact-target/category controls in the dock.
4. Convert mistakes/history into a contained phone sheet.
5. Make Notes an on-demand panel.
6. Keep Finish persistent and protected.
7. Retain desktop panel order and appearance.

Gate:

- identical actions produce identical scores, mistakes, history, and exports on
  desktop and phone;
- all mobile controls meet the target-size policy;
- no source kalimah is obscured when choosing a mark.

### Phase 4 - Optional Focus mode

Implement only after the default full-page layout is approved.

1. Add `Fit` and `Focus` controls.
2. Magnify the existing page without reflow.
3. Keep panning inside the Mushaf stage.
4. Centre a selected/jumped-to kalimah when requested.
5. Preserve page and dock position when returning to Fit mode.

Gate: Focus improves legibility without changing line geometry, causing accidental
page navigation, or trapping the judge in two-dimensional scrolling.

### Phase 5 - Full verification and controlled release

1. Run all automated tests and the production build.
2. Run geometry comparisons across the page corpus fixtures.
3. Rehearse a complete recitation on real iOS and Android phones if available.
4. Compare before/after desktop and mobile screenshots.
5. Publish only the exact approved build.
6. Retain the rollback checkpoint until real competition rehearsal is accepted.

## 9. Verification matrix

### 9.1 Minimum viewports

- 320 x 720 portrait;
- 360 x 800 portrait;
- 390 x 844 portrait;
- 412 x 915 portrait;
- representative phone landscape;
- 768px tablet;
- existing 1280px and 1366px desktop layouts.

### 9.2 Representative pages

- page 1: opening-page special layout;
- page 2: second opening-page case;
- page 300: dense 15-line page;
- page 601: long-word and exact-target fixture;
- page 602: multiple short surahs and cartouches;
- page 604: final page and centered-line cases;
- at least one ordinary full 15-line page with no surah band;
- at least one multi-surah page.

### 9.3 Geometry acceptance

- identical page and line boundaries at every viewport;
- identical word order and word IDs;
- identical centered/justified classification;
- font scale matches page-content scale within an agreed tolerance;
- normalized word positions and gap proportions match desktop within an agreed
  pixel tolerance after scaling;
- no overlapping visible glyphs;
- no zero-gap compression caused by CSS minimum clamps;
- no source text, tashkeel, glyph, or semantic-target mutation.

### 9.4 Interaction acceptance

- tap word;
- hold word;
- drag to target/category;
- tap-only alternative;
- pointer cancellation;
- undo and deduction adjustment;
- page navigation and five rapid page changes;
- word selection near all four page edges;
- long exact-letter rails;
- mistake-log page jump and flash;
- Adu/Raagu picker and half-step allocation;
- Finish confirmation;
- dark mode;
- browser zoom and orientation change;
- no stuck pointer capture, frozen scroll, or hidden tray.

### 9.5 Accessibility acceptance

- dock controls are at least 44px in both dimensions;
- effective source hit regions meet 24px where the printed geometry permits;
- every drag function has a tap alternative;
- completion happens on pointer-up or explicit activation;
- keyboard focus is visible and restored after sheets close;
- active controls have accessible names, selected states, and live score updates;
- focus is not obscured by the dock, sheet, or on-screen keyboard.

## 10. Protected behavior

The update must not change:

- Quran or Mushaf source data;
- the KFGQPC V1 1405H edition;
- 604-page or 15-line layout contracts;
- QCF page-font mapping;
- word IDs, target IDs, aliases, or target versions;
- mistake amounts, category ownership, scoring calculations, or history;
- question anchors or printed-line policy;
- saved sessions, results, exports, or judge assignments;
- desktop interaction semantics;
- the principle that AI cannot determine official marks.

Do not reintroduce kashida/tatweel generation or a measure-render-measure loop.
That earlier approach was removed because it changed display forms and could make
the Mushaf component unstable.

## 11. Risks and mitigations

| Risk | Mitigation |
| --- | --- |
| Phone fix changes desktop | Mobile-scoped presentation plus screenshot comparison gate |
| Smaller faithful page makes tapping difficult | Forgiving invisible hit layer plus large dock confirmation |
| Hitboxes become stale after scaling | Re-measure only after committed page-width/layout changes |
| Bottom dock obscures selected word | Keep source stage above dock; centre only on explicit jumps |
| Browser chrome changes page size | Width-driven page geometry and stable shell allocation |
| Virtual keyboard covers Notes | VisualViewport-aware Notes panel, tested separately |
| Duplicate mobile scoring logic drifts | Share selectors/calculations; vary presentation only |
| Nested scrolling feels frozen | Body locked only in active judge mode; one explicit inner scroll region |
| Focus mode causes disorientation | Default to Fit; visible reset; no automatic movement during touch |
| Quran layout is accidentally simplified | Geometry regression tests and protected source-contract checks |

## 12. Decisions recorded and still open

### Recommended direction recorded by this plan

- Preserve one Mushaf implementation.
- Default mobile view is a faithful complete page.
- Active phone judging uses a top Mushaf and lower judging dock.
- Desktop remains protected.
- Mistakes/history use a contained phone sheet.
- Dragging retains a tap alternative.
- Focus mode is optional and comes after the full-page review.
- No OCR, AI, backend, or scoring-rule work belongs in this update.

### Still requires approval before implementation

1. Exact phone breakpoint for the screen-filling judge shell.
2. Final upper-stage/lower-dock height split after visual prototypes.
3. Whether Focus mode ships in the same release or a later pass.
4. Whether mobile mode is automatic only or also exposed as a device preference.
5. Final compact score-summary hierarchy.
6. Whether Notes remains a dock tab or opens as a separate sheet.

## 13. Expected implementation order

The safest review path is:

1. checkpoint and baseline;
2. Mushaf geometry repair;
3. visual approval of pages at phone widths;
4. phone judge shell;
5. compact score and selection controls;
6. mistake/history sheet;
7. interaction and accessibility QA;
8. optional Focus mode;
9. real-phone rehearsal;
10. approved publication.

The geometry repair and phone-control overhaul should remain separate reviewable
passes. If the first pass does not reproduce the desired 1405H spacing, it can be
reverted before any judging workspace is rearranged.

## 14. Deferred state

This document is a complete implementation plan for later work. As of its date:

- no mobile Mushaf code has been changed;
- no mobile judging dock has been built;
- no tests have been added for this plan;
- no commit or deployment has been made for this plan;
- optional choices are recommendations, not approved product decisions.

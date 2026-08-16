# Judge workspace layout and guidance — detailed implementation plan

Status: implemented and locally verified; publication pending

Prepared: 16 August 2026

Parent plan: [`INTERFACE_SIMPLIFICATION_AND_JUDGING_FLOW_PLAN.md`](./INTERFACE_SIMPLIFICATION_AND_JUDGING_FLOW_PLAN.md)

Supersedes the provisional values in:
[`JUDGE_WORKSPACE_LAYOUT_AND_GUIDANCE_SURFACE_PLAN.md`](./JUDGE_WORKSPACE_LAYOUT_AND_GUIDANCE_SURFACE_PLAN.md)

Depends on: the implemented measured desktop Mushaf frame at commit `a842eb9`

Implementation result, 16 August 2026:

- the balanced workbench, 75–150% view contract, uniform magnification, safe
  scroll canvas, nonmodal More controls, and non-displacing coach tip are in
  production code;
- an existing explicit 100% Fit choice is preserved while new devices start at
  110%;
- the active 1280×720 page measures about 461×678px at 110%, compared with
  about 419×616px at Fit, while the document body remains 1280×720;
- the 1440×900 page measures about 595×875px at 110%;
- full and split layouts reach every edge at 150% through frame-owned scrolling;
- guidance shown versus suppressed produces identical page, frame, and rail
  rectangles; and
- the 390×844 fallback remains unscaled by desktop CSS magnification and has no
  horizontal document overflow.

The full automated suite and production build are release gates. Browser
geometry was checked in the available in-app Chromium surface; Firefox and
Safari remain post-publication compatibility checks rather than claims made by
this local pass.

## 1. Decision

Use the **balanced wide workbench** for the next judge-workspace release.

The release will:

- retain one permanently visible scoring rail;
- increase the default Mushaf from Fit to 110% uniform magnification;
- let the desktop canvas grow to 1520px instead of stopping at 1280px;
- recover space through tighter outer chrome rather than hiding controls;
- replace the normal-flow marking instruction with a non-displacing coach tip;
- move live Mushaf size control from Settings into a small nonmodal surface
  opened by the existing three-dot button;
- preserve Fit as a dependable reset and allow deliberate contained scrolling
  above Fit;
- keep the current one-page and split-line layouts unchanged; and
- prepare geometry ownership for, but not implement, a later true two-page
  spread.

Do not add a collapsible rail, a bottom dock, zoom presets, wheel-to-zoom,
additional dashboard cards, or a second Mushaf renderer in this release.

## 2. Why this direction wins

### 2.1 Current measured baseline

The deployed active judging screen was measured with real data and the current
renderer:

| Viewport | Workspace | Mushaf frame | Full page at Fit | Scoring rail |
| --- | ---: | ---: | ---: | ---: |
| 1280×720 | 1280×661 | 892×613 | 405×596 | 316×613 |
| 1366×768 | 1280×709 | 892×661 | 438×644 | 316×661 |
| 1440×900 | 1280×841 | 892×793 | 528×776 | 316×793 |
| 1600×900 | 1280×841 | 892×793 | 528×776 | 316×793 |

The page is height-limited on ordinary laptop screens. On wider screens the
1280px workspace cap leaves useful space outside the workbench. The current
instruction strip consumes vertical room before the frame is measured, so the
Mushaf becomes smaller for the very user who needs guidance.

### 2.2 Options considered

| Direction | Benefit | Failure in this context | Decision |
| --- | --- | --- | --- |
| Balanced wide workbench | More page and more legible rail without changing the judge's scan path | Requires careful contained zoom geometry | Select |
| Mushaf-first collapsible rail | Maximum document area | Hides live score state and adds repeated rail-opening work | Defer |
| Extra-wide control rail | Comfortable category inspection | Compresses the document on normal laptops and weakens future spread space | Reject as default |

The scoring rail contains category state, mistakes, notes, totals, and Finish.
It is essential working context, not supplementary navigation. Fluent's inline
drawer guidance and Carbon's fixed UI-shell regions support keeping content and
controls visible together when both must be consulted during the task. The
rail therefore remains inline and persistent.

### 2.3 Visual character

The screen should remain professional and slightly sharp, not decorative:

- one strong document plane and one quiet control plane;
- existing off-white Mushaf and dark page frame remain the focal contrast;
- squared or modestly rounded controls, not soft nested cards;
- thin dividers and spacing establish groups; no gradients, floating badges,
  tinted icon tiles, or permanent helper captions;
- current judging-category colors remain reserved for judging meaning;
- coach-tip and view-control surfaces use neutral colors so they do not compete
  with scoring states.

## 3. External research translated into Tahqeeq rules

1. [Apple onboarding guidance](https://developer.apple.com/design/human-interface-guidelines/onboarding)
   and [Fluent onboarding guidance](https://fluent2.microsoft.design/onboarding/)
   favor short, optional, just-in-time instruction near the relevant feature.
   Tahqeeq will show one marking tip only when marking is first relevant and
   keep it replayable.
2. [Apple TipKit](https://developer.apple.com/documentation/tipkit/highlightingappfeatureswithtipkit)
   explicitly uses a popover tip when changing underlying layout is undesirable.
   The marking tip must therefore overlay the stage and have zero effect on its
   measured dimensions.
3. [Apple popover guidance](https://developer.apple.com/design/human-interface-guidelines/popovers/)
   and [Fluent popover guidance](https://fluent2.microsoft.design/components/web/react/core/popover/usage)
   support small, contextual, nonblocking tasks, avoiding essential content and
   remaining open for multiple selections. The More surface can contain live
   view controls, but it must not cover the page's active reading area.
4. A true [ARIA menu](https://www.w3.org/WAI/ARIA/apg/patterns/menubar/) is a
   list of `menuitem` actions with a specific arrow-key model. A range slider is
   not a menu item. Once zoom is added, the three-dot surface must become a
   labelled nonmodal controls popover rather than retaining `role="menu"`.
5. The [ARIA slider pattern](https://www.w3.org/WAI/ARIA/apg/patterns/slider/)
   defines arrows, Home, End, and value text, while warning about touch
   assistive-technology gestures. Use a native range input plus Minus, Plus,
   and Fit alternatives.
6. [WCAG 2.2 Target Size](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html)
   sets a 24px minimum; its
   [enhanced criterion](https://www.w3.org/WAI/WCAG22/Understanding/target-size-enhanced)
   uses 44px. Frequent judge controls should be 40px, with at least 24px for
   low-frequency pointer targets.
7. [Adobe's document-view controls](https://helpx.adobe.com/acrobat/using/adjusting-pdf-views.html)
   and the [PDF.js viewer](https://github.com/mozilla/pdf.js/blob/master/web/viewer.html)
   distinguish Fit from magnification and keep plus/minus available. Tahqeeq
   should do the same, without importing their large preset lists.
8. [CSS Box Alignment](https://www.w3.org/TR/css-align-3/) defines safe
   alignment for overflow. The enlarged page must live in an explicit scroll
   canvas so its top/start edge can never become unreachable through centring.
9. CSS [`zoom`](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/zoom)
   now provides uniform visual magnification while affecting layout, and
   `getBoundingClientRect()` includes the accumulated zoom described by
   [`currentCSSZoom`](https://developer.mozilla.org/en-US/docs/Web/API/Element/currentCSSZoom).
   It is the preferred technical spike because Tahqeeq's printed composition
   must scale uniformly rather than reflow at larger widths.
10. [WCAG reflow guidance](https://www.w3.org/WAI/WCAG21/Understanding/reflow.html)
    recognizes two-dimensional content that requires spatial relationships.
    The Mushaf may use contained two-axis scrolling when enlarged, while the
    header, score rail, and completion action remain usable without document
    scrolling.

## 4. Desktop workspace specification

### 4.1 Supported layout boundary

- Keep the stable desktop query: `min-width: 901px` and `min-height: 620px`.
- Preserve the existing narrow/mobile fallback below that boundary.
- Treat phone judging as a separate planned release; this pass only performs a
  regression check at 390×844.

### 4.2 Workbench tokens

| Property | Current | New contract |
| --- | ---: | ---: |
| Workspace maximum | 1280px | 1520px |
| Workspace inline padding | 24px | 16px |
| Stage/rail gap | 24px | 20px |
| Active scoring rail | 316px | `clamp(336px, 23vw, 376px)` |
| Header inline padding | 24px | 16px |
| Header block padding | 12px | 10px |
| Rail panel padding | 13–14px | 15–16px |
| Category-row minimum | 34px | 38px |
| Frequent icon/control target | varies | 40×40px |

At 1280px, the wider rail is paid for by the reduced padding and gap, so the
stage remains approximately 892px wide. At 1366px the stage grows to about
978px; at 1440px to about 1052px. At 1600px the raised workspace maximum lets
the stage grow to roughly 1100px instead of remaining fixed at 892px.

These are design-model values, not hard-coded page sizes. The existing
measurement function remains authoritative at runtime.

### 4.3 Scoring rail

- Keep the rail visible for the full active judging task.
- Keep its existing logical-side placement preference.
- Increase category names to approximately 13.5px and numeric values to
  approximately 14.5px, using the existing type family and weight hierarchy.
- Increase the total to approximately 30px without adding a decorative card.
- Preserve internal scrolling for the mistake log and notes rather than
  growing the document.
- Keep Finish in the visible action region at supported desktop heights.
- Do not change category order, colors, labels, point arithmetic, or enabled
  state.

### 4.4 Header alignment

- Preserve the one-row header.
- Tighten only outer padding; do not compress 40px actions.
- Align the utility cluster to the rail edge in both rail positions through
  logical properties.
- Do not introduce a permanent zoom bar or helper text in the header.

## 5. Mushaf size contract

### 5.1 Values

Centralize these constants in `devicePreferences.ts` or a dedicated shared
view-preference module:

```text
minimum       75%
Fit           100%
new default  110%
maximum      150%
step           5%
```

Fit means the largest faithful page composition wholly contained by the
measured frame. It is a reference point and reset, not the maximum.

At common laptop viewports, 110% is modelled to show approximately 92–94% of
the page height, leaving only about 46–64px of contained vertical overflow. It
raises the visible page from roughly 405px to 461px at 1280×720, 438px to 497px
at 1366×768, and 528px to 596px at 1440×900. These exact values must be
re-measured in the implementation browser pass.

### 5.2 Stored preference migration

- A newly initialized preference uses 110%.
- An explicitly saved 100% remains 100%; do not silently change an existing
  judge's chosen Fit value.
- Existing saved values from 75% through 100% remain valid.
- Existing values below 75% normalize to 75%.
- Invalid, missing, or nonnumeric values normalize to 110%.
- Continue storing the preference locally and outside competition state.
- Keep legacy mirrored keys only as long as the current adapter requires them;
  this release does not redesign storage.

### 5.3 Why width reflow is rejected

The page's QCF line sizes use container-query values with upper `clamp()`
limits. Increasing the page width above Fit eventually stops increasing some
internal values while other geometry continues to grow. That is not faithful
magnification and can change word spacing, cartouche proportions, and hitbox
relationships.

The page must instead be composed once at its Fit width and uniformly
magnified. The preferred implementation is CSS `zoom`; a browser spike is an
explicit first gate. If one supported browser fails that gate, use a scaled
wrapper with `transform: scale()` and explicit rendered wrapper dimensions.
Do not fall back to changing the composed page width above Fit.

## 6. Magnification and scroll architecture

### 6.1 Ownership

Split the current combined frame into three responsibilities:

```text
mushaf-viewport                 relative overlay host
├── marking-coach-tip           does not affect measurement
└── mushaf-shell                visible overflow frame
    └── mushaf-scroll-canvas    explicit rendered extents
        └── mushaf-page          Fit composition + uniform magnification
```

- `mushaf-viewport` owns coach-tip positioning only.
- `mushaf-shell` remains the scrollport measured by `ResizeObserver`.
- `mushaf-scroll-canvas` is at least 100% of the shell in each axis and grows
  to the rendered page size plus insets.
- `mushaf-page` keeps its Fit composition width. Apply `zoomPercent / 100` as
  uniform magnification.
- Use safe alignment or explicit canvas padding so top/start page content can
  always be reached.
- Set `overscroll-behavior: contain` on the shell.
- Fit is centred and has no shell scrollbars. Above Fit, only the shell may
  overflow; the document body must not.

### 6.2 Scroll-position behavior

- Before changing size, record the normalized visual centre of the shell.
- After layout settles, restore that normalized centre within the new extents.
- When choosing Fit, reset to the centred, non-overflowing page.
- Do not animate the page scale or scroll restoration.
- Do not intercept browser `Ctrl`/`Cmd` zoom and do not add wheel-to-zoom.
- Page navigation resets the new page to the existing intended start position.
- Mistake jumps continue to bring the word into view inside the shell.

### 6.3 Hitboxes and selection geometry

QCF word rectangles are read with `getBoundingClientRect()`. Those rectangles
already include CSS magnification and remain suitable for pointer comparison,
tray anchoring, and viewport collision checks.

However, values written back as `left`, `top`, `width`, and `height` inside the
magnified page must be normalized by `renderScale` before assignment, or the
browser will magnify them twice. The implementation must:

- pass the effective render scale into `Mushaf`;
- normalize page-local overlay coordinates by that scale;
- explicitly close an open marking tray when scale changes;
- schedule one post-scale hitbox measurement through the existing animation
  frame path;
- include scale in the relevant measurement and cleanup effects instead of
  relying only on `ResizeObserver` side effects; and
- prove word, letter, glyph, tray, and jump alignment at every supported scale.

## 7. First-use marking coach tip

### 7.1 Content

Use one short instruction:

> Hold a word, then slide to the exact letter. Release over the mistake type.

For a judge with one assigned mistake category, the final phrase may use that
category name. Do not add a title, illustration, progress step, or permanent
instruction row.

Actions:

- `Got it` — retires the tip;
- `Show marking guide` in More controls — replays it.

### 7.2 Placement and collision rules

- Render the tip inside `mushaf-viewport` but outside `mushaf-shell`.
- Prefer the free stage gutter opposite the scoring rail.
- Maximum width: approximately 204px.
- Point its beak toward the page without overlapping Quran ink.
- Use a neutral surface, one border, and restrained shadow.
- Never cover page navigation, selection trays, the rail, or Finish.
- If the measured safe gutter is insufficient, do not cover the page. Show a
  small Help affordance and open the tip only on request.
- Showing, hiding, dismissing, or retiring the tip must produce a zero-pixel
  change in page, frame, rail, and header rectangles.

### 7.3 State and accessibility

- Reuse `tahqeeq.hintSeen.assignedRail.v1` so judges who dismissed the current
  instruction are not forced through it again.
- Auto-retire immediately after the first successful mark. The current delayed
  removal is no longer needed because the overlay cannot move layout.
- Do not autofocus the tip or trap focus.
- Announce it once with a polite live region when it first appears.
- `Got it` is a real button with a minimum 40px height.
- Replay is always available from More controls.
- Opening replay first closes More controls so only one popover-like surface is
  present.

## 8. More controls popover

### 8.1 Semantic correction

The current three-dot surface is marked as `role="menu"` but contains ordinary
buttons without a complete menu keyboard model. Adding a slider would make
that mismatch worse.

Convert it to a small nonmodal controls popover:

- trigger: `aria-haspopup="dialog"`, `aria-expanded`, and `aria-controls`;
- surface: `role="dialog"`, `aria-modal="false"`, and
  `aria-label="More actions and view controls"`;
- width: approximately 280px;
- one neutral surface, no nested card and no second popover;
- Escape and outside pointer close it;
- explicit actions close it after activation;
- zoom input leaves it open for live comparison;
- closing returns focus to the three-dot trigger;
- do not make the rest of the application inert.

When opened from the keyboard, focus the first interactive control — the range
input in the judge view. Pointer opening may retain trigger focus until the user
chooses a control. Tab follows normal document order within and then beyond the
nonmodal surface; Escape remains the reliable close path.

### 8.2 Contents in judge view

```text
Mushaf size                         110%
[ − ] [ native range input       ] [ + ]
[ Fit page ]
----------------------------------------
Show marking guide
Settings
Competition setup
Print / Export     (only when available)
```

Control rules:

- Minus and Plus are 40×40px and change one 5% step.
- The native range supports Arrow keys, Page Up/Down browser behavior, Home,
  and End.
- `aria-valuetext` says `Fit, 100 percent` at Fit and otherwise announces the
  numeric percentage.
- Disable Minus and Plus at their bounds.
- `Fit page` is text, not an unexplained target icon.
- Do not add 75/100/125/150 preset chips; they add noise without improving the
  judge's task.
- Remove the separate Page scale field from Settings. Page view and panel side
  remain Settings preferences.
- Show the zoom group only in the judge view, where the result is visible.

## 9. Component and file ownership

| File | Required responsibility |
| --- | --- |
| `src/lib/devicePreferences.ts` | Central size constants, 110 default, migration normalization, unchanged local persistence boundary |
| `src/lib/mushafFit.ts` | Keep Fit calculation; expose composed and rendered extents separately |
| `src/App.tsx` | Own effective preference, guide replay state, and callbacks; pass view controls to Header and scale to viewport |
| `src/components/Header.tsx` | Keep the trigger and routing actions; delegate the expanded surface rather than growing Header logic |
| `src/components/MoreActionsPopover.tsx` | New nonmodal popover semantics, focus return, click-away/Escape, action grouping |
| `src/components/MushafSizeControl.tsx` | Optional focused component for native range, Minus, Plus, Fit, labels, and bounds |
| `src/components/HintBanner.tsx` | Replace/rename with `MarkingCoachTip.tsx`; preserve the existing retirement key |
| `src/components/MushafViewport.tsx` | Separate viewport/shell/canvas, uniform magnification, rendered extents, normalized-centre restoration |
| `src/components/Mushaf.tsx` | Accept render scale, normalize page-local overlay coordinates, close/remeasure transient selection state |
| `src/components/SettingsWorkspace.tsx` | Remove Page scale control only; keep page layout and rail-side preferences |
| `src/styles/global.css` | Workbench tokens, rail typography, coach-tip positioning, popover, scroll canvas, scale behavior |
| `src/styles/settings.css` | Remove scale-only styles if no longer used |

There is currently unused-looking CSS for overflow zoom and preset controls
without a matching React component. Remove confirmed dead selectors during the
implementation rather than reviving them as a second design system.

No file in competition state, scoring rules, Quran source data, exports, or
records needs a behavior change.

## 10. Implementation sequence and gates

### Gate 0 — uniform-scale spike

Before restyling the workbench:

1. Render protected pages at Fit and 75/110/125/150% through CSS `zoom`.
2. Verify Chrome/Edge, Firefox, and a recent Safari.
3. Compare line, glyph, word, and page rect ratios against the requested scale.
4. Verify pointer marking and tray anchors after coordinate normalization.
5. If one supported browser fails, prove the transform-wrapper fallback before
   moving on.

Gate: no internal Mushaf reflow or overlay drift above 0.5px at the measured
test points.

### Gate 1 — preferences and controls

1. Centralize the range and migration.
2. Build `MushafSizeControl` and the nonmodal More controls surface.
3. Remove Page scale from Settings.
4. Prove keyboard, focus return, outside click, Escape, and live persistence.

Gate: all zoom paths change only device preference and do not dispatch a
competition action.

### Gate 2 — scroll canvas and geometry

1. Separate viewport, shell, and scroll canvas.
2. Add uniform magnification and rendered extents.
3. Preserve normalized viewport centre.
4. Normalize overlays and remeasure after changes.
5. Verify Fit has no document or shell scroll; enlarged sizes use shell scroll
   only when necessary.

Gate: every page corner is reachable and no start-side content is trapped.

### Gate 3 — workbench proportions and coach tip

1. Apply the 1520/16/20 workspace contract and responsive rail width.
2. Improve rail spacing and typography without changing information.
3. Replace `HintBanner` with the overlay tip and replay path.
4. Confirm zero geometry delta with the tip shown and hidden.

Gate: the default page is materially larger than the deployed baseline and the
rail remains fully operable at 1280×720.

### Gate 4 — integration and publication readiness

Run the full matrix below, inspect the final diff for protected-data changes,
then commit and publish only after the user approves the visual checkpoint.

## 11. Visual checkpoint

Use a disposable Claude artifact or equivalent comparison only to confirm the
locked architecture, not to invent a new application.

Create two variants:

- **A1:** selected tokens with the rail at its responsive value;
- **A2:** the same architecture with a 376px rail on wide viewports and the
  coach tip adjusted to the remaining gutter.

Both variants must use the same real page and score data at 1280×720 and
1440×900, show both rail sides, and include:

- coach tip visible and retired;
- More controls open;
- Fit, 110%, and 150% page states;
- a populated mistake log and enabled Finish state.

The checkpoint may tune only rail width within 336–376px, coach-tip offset,
popover offset, and spacing by one 4px step. It must not reopen the persistent
rail, non-displacing guidance, Fit/default/range, or uniform-scale decisions
unless the real Mushaf fails an acceptance gate.

## 12. Verification matrix

### Automated contracts

- `scripts/device-preferences.test.mjs`: 75–150 range, 5 step, 110 default,
  preservation of saved 100, invalid and legacy normalization.
- `scripts/mushaf-fit.test.mjs`: Fit remains frame-derived; rendered extents
  are Fit multiplied by scale; narrow fallback unchanged.
- Rename/update `scripts/hint-banner.test.mjs`: no normal-flow banner,
  retirement after mark, dismissal persistence, replay path, unchanged storage
  key.
- `scripts/solid-mushaf.test.mjs`: fixed source lines and page identities,
  scale-aware overlay math, protected page fixtures.
- Add a focused workspace/popover contract test for roles, labels, range
  bounds, Fit, focus return, and Settings removal.
- Run existing reducer, scoring, Adu/Raagu, results, setup, export, TypeScript,
  lint, and production build checks.

### Browser geometry

Test 1024×768, 1280×720, 1366×768, 1440×900, 1600×900, and 900×620 boundary
behavior in both themes and both rail positions.

For pages 1, 2, 199, 300, 601, 602, and 604, test full and split layouts at
75, 100, 110, 125, and 150%:

- page and every printed line scale uniformly;
- word/letter hit areas differ from their visual targets by no more than 0.5px;
- long-press/slide/release selects the intended letter and category;
- trays stay within the shell or flip safely;
- mistake jumps reveal the intended word;
- navigation and layout changes close stale trays;
- all page edges are reachable at maximum magnification;
- Fit has no document scrolling and intentional enlargement never grows the
  document body.

### Interaction and accessibility

- More controls opens by pointer and keyboard.
- Range, Minus, Plus, and Fit update the visible page immediately.
- Home/End, arrows, bound disabling, value text, Escape, outside click, and
  focus return work.
- Coach tip is readable, dismissible, replayable, announced once, and never
  autofocuses.
- Coach tip visible/hidden page, frame, rail, and header rectangles are exactly
  equal.
- Targets meet the specified dimensions at 100% browser zoom.
- Windows high contrast and reduced motion retain visible state and focus.
- 200% browser zoom still exposes application controls even when the spatial
  document itself needs contained scrolling.

### Regression boundary

- competition data and action logs are byte-for-byte behaviorally unchanged;
- scoring arithmetic, category colors, Finish requirements, and exports are
  unchanged;
- QCF fonts, page metadata, source word IDs, sajdah markers, basmala rules, and
  end ornaments are unchanged;
- print/export rendering ignores the judge's viewing magnification;
- the 390×844 phone view receives no new desktop coach or popover obstruction.

## 13. Release acceptance

The slice is complete only when all of the following are true:

1. The active Mushaf is visibly and measurably larger by default at 1280×720,
   1366×768, and 1440×900.
2. Fit remains one action away and displays the whole page without shell or
   document scrolling.
3. Enlarged rendering is a uniform magnification of the Fit composition, not a
   container-query reflow.
4. Every page edge, marking target, tray, and mistake jump remains reachable
   and aligned at 150%.
5. Guidance causes exactly zero workspace movement and can be replayed.
6. The scoring rail remains visible, more legible, and operational at the
   smallest supported desktop viewport.
7. The More surface has correct nonmodal semantics and complete keyboard paths.
8. Settings no longer contains a size control whose result cannot be previewed.
9. No competition, scoring, Quran-source, records, or export behavior changes.
10. The visual checkpoint is approved before commit and publication.

## 14. Deferred work

### True two-page spread

The current `split` mode reformats one printed page's 15 lines into two columns;
it is not a pair of consecutive printed pages. A later `spread` mode requires:

- two page renderer instances with isolated source IDs and hitboxes;
- right-to-left physical ordering;
- paired navigation and question-range awareness;
- mistake-jump routing to the correct page and scrollport;
- a width/readability gate and single-page fallback.

PDF.js and Adobe both treat spread as a separate document-view mode. Keep the
new viewport/canvas geometry able to host more than one page later, but do not
add a dormant `spread` union value or incomplete preference now.

### Other deferred decisions

- collapsible or resizable scoring rail;
- per-judge zoom presets;
- keyboard shortcuts beyond the focused native controls;
- phone-specific judging dock and phone Mushaf composition;
- synchronizing view preferences across devices.

These require their own evidence and approval; none is necessary to make this
release complete.

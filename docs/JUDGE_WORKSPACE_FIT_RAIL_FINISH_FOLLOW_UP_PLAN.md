# Judge workspace fit, rail, and finish follow-up plan

Status: implementation in progress; score-readout alignment completed; wide
workspace and More-menu rail control implemented locally, pending visual
approval

Prepared: 17 August 2026

Scope: Adu / Raagu score alignment, wide judge-workspace rhythm, panel-side
access, finish-review hierarchy, Windows installation, and an optional Mushaf
alignment prototype

Related implemented plans:
[`INTERFACE_SIMPLIFICATION_AND_JUDGING_FLOW_PLAN.md`](./INTERFACE_SIMPLIFICATION_AND_JUDGING_FLOW_PLAN.md),
[`ADU_RAAGU_REQUIRED_ENTRY_IMPLEMENTATION_PLAN.md`](./ADU_RAAGU_REQUIRED_ENTRY_IMPLEMENTATION_PLAN.md),
and
[`TRUE_TWO_PAGE_MUSHAF_SPREAD_PLAN.md`](./TRUE_TWO_PAGE_MUSHAF_SPREAD_PLAN.md).

Detailed next-slice plan:
[`FINISH_REVIEW_AND_ADU_RAAGU_EXIT_PLAN.md`](./FINISH_REVIEW_AND_ADU_RAAGU_EXIT_PLAN.md).

## 1. Decision boundary

This is a regression-correction and follow-up plan, not approval for a new
workspace architecture. The current Mushaf source, scoring arithmetic, explicit
zero behavior, required-entry guard, true two-page renderer, and device-local
preference boundary remain protected.

The next implementation should correct the score readout first, then improve
wide-screen rhythm and expose the already-supported Left/Right rail choice,
then strengthen the Finish review. Installability is a separate bounded shell
release. A Mushaf-alignment control remains an optional prototype pending
visual approval.

### 1.1 Confidence gate used for this plan

- **85-100:** implementation-ready after the named verification gates.
- **70-84:** plausible, but a bounded browser prototype is required before the
  production implementation is approved.
- **Below 70:** not approved for implementation; research, narrow, or defer it.

The confidence scores in section 9 describe the current plan, not the eventual
quality of an unreviewed implementation.

## 2. Verified current facts

### 2.1 Adu / Raagu score alignment

- The current `.score-value-layout` flex layout centres the whole ink group
  rather than assigning stable internal score and denominator slots.
- Browser measurement at 1528 x 732 showed one-digit `0 / 10`, which has the
  same tabular width as `1 / 10`, approximately 4.7 CSS px left of two-digit
  score rows.
- `.mark-picker-of` also uses a different line-height/baseline from ordinary
  score readouts.
- A non-persistent browser prototype used shared fixed internal slots. It
  aligned the score and denominator cells exactly across ordinary rows and the
  picker, while `10.5 / 20` still fit inside the existing 72 px score box.

### 2.2 Fit and two-page rhythm

- `100%` means Fit and must keep that meaning. `105%` must not be relabelled as
  Fit.
- Wide Two pages currently uses compact workspace padding of 8 px vertically
  and 12 px horizontally. Full page retains the 16 px base padding.
- The observed wide judge header height was approximately 54.8 CSS px.
- At 1528 x 732, Two pages measured a 1160 x 661.2 stage, approximately 8.35 px
  top and bottom inset, a 136.26 x 28 selector, a 4 px selector-to-pages gap,
  and two 416.5 x 612.5 papers.
- The measured spread is mathematically balanced, but the selector does not
  have an intentional visual relationship to the application header.

### 2.3 Judge rail architecture

- `judgeRailSide: left | right`, persistence, CSS grid areas, Settings
  controls, mistake expansion behavior, and coach direction already exist.
- The easiest useful extension is to expose Left/Right as a live segmented
  control in More.
- Changing grid gap alone does not solve perceived Mushaf-to-rail distance. The
  height-limited Mushaf can remain centred inside a much wider stage.

### 2.4 Finish review

- The Finish dialog already opens when a required Adu / Raagu mark is missing,
  includes the shared embedded `MarkPicker`, and keeps the App and reducer hard
  guards.
- Explicit zero is already a deliberate, valid entry and must remain so.
- The current low-salience missing-input text plus grey disabled confirmation
  is too passive even though the functional guard is sound.

### 2.5 Windows and PWA baseline

- The repository already registers a production service worker in
  `src/lib/sw-register.ts`, and `public/sw.js` exists.
- Sites serves the application over HTTPS.
- `index.html` has no web app manifest link, and the repository has no install
  icon set or manifest.

### 2.6 Browser-audit caveat

A hidden WebBridge tab initially reported `data-stage-fit="fallback"` even
though its media query matched. The deployed source schedules frame measurement
through `requestAnimationFrame`; requesting a visual frame allowed that work to
run and the same page entered measured Fit at once. At 1528 x 732, the real
ready state measured a 427 x 627.94 page inside a 645.2 px-high stage with no
stage overflow.

This was an automation-throttling artifact, not evidence of a production Fit
failure. Geometry QA must activate or capture the tab and then wait for
`data-stage-fit="ready"` before recording measurements.

## 3. Recommended next implementation

### 3.1 Correct the score readout contract

Use one shared internal grid/slot contract for every score readout in
`ScorePanel.tsx`, `MarkPicker.tsx`, and the Finish review:

- right-align the score within a stable score slot;
- left-align the denominator within a stable denominator slot;
- use one slash/spacing and baseline contract;
- keep the complete readout centred inside the existing 72 px score column;
- do not add a one-off offset for `1 / 10` or any other single value.

Required value matrix:

| Allocation | Values |
| --- | --- |
| 10 | `0 / 10`, `1 / 10`, `9.5 / 10`, `10 / 10` |
| 20 | `0 / 20`, `1.5 / 20`, `10.5 / 20`, `20 / 20` |

Each value must be checked pending, marked, and picker-open; on left and right
rails; in light and dark themes; and in both the scoring rail and Finish
dialog.

### 3.2 Reclaim wide-screen vertical space without weakening Fit

- Compact only the wide judge header. Do not globally compress headers on
  Settings, Results, setup, or compact layouts.
- Give Full page the same deliberate compact stage-padding discipline as Two
  pages.
- Define an explicit header -> page selector -> paper rhythm for Two pages.
- Recompute Fit from the final observed frame after header and padding changes.
- Use reclaimed chrome height to improve the rhythm and page size. Never gain
  space by allowing Fit itself to overflow.
- Preserve contained Mushaf-stage scrolling at `105%` and above.

A non-persistent deployed-page trial at 1528 x 732 changed only the wide judge
header padding and workspace padding. It reduced the header from 54.8 to 46.8
px, enlarged the stage from 645.2 to 669.2 px, and enlarged measured Fit from
427 x 627.94 to 444 x 652.94 without overflow. This validates the direction;
the trial values remain tuning candidates until the complete viewport matrix
and visual review pass.

Browser gates:

- 1280 x 720, 1366 x 768, 1440 x 900, 1528 x 675, 1528 x 732, and
  1600 x 900;
- Full page and Two pages;
- Fit and `105%`;
- both rail sides;
- no body or shell overflow at Fit;
- all intentional overflow contained inside the Mushaf stage at `105%` and
  above.

### 3.3 Put the existing panel-side choice in More

Expose the existing Left/Right preference as a live segmented control in
`MoreActionsPopover.tsx`. It must write through `devicePreferences.ts`, update
the current workspace immediately, retain keyboard and screen-reader meaning,
and remain consistent with the existing Settings control until the duplicate
ownership is deliberately resolved.

This is a discoverability improvement, not a new rail-placement model.

### 3.4 Strengthen the Finish review

The detailed information architecture, exit-state machine, inline picker
design, geometry matrix, and confidence gate are specified in
[`FINISH_REVIEW_AND_ADU_RAAGU_EXIT_PLAN.md`](./FINISH_REVIEW_AND_ADU_RAAGU_EXIT_PLAN.md).

Preserve the shared embedded picker and both hard guards. Improve hierarchy:

- keep the initial review calm, with the required Adu / Raagu row and its picker
  visibly available;
- keep the final Save action visually actionable instead of permanently grey;
- when the judge attempts Save with a missing required mark, cancel submission,
  focus and open the first missing picker, and enter an attempted-validation
  state;
- in that state, give the required row a restrained validation border/tint and
  state `Required: choose a mark to finish` in text;
- reserve red for an actual invalid value or system error;
- update the summary immediately, clear the attempted-validation state after a
  deliberate selection, and allow the next Save attempt to finish.

The final review should contain at most four compact category rows,
score/allocation, total, mistake count, and only non-empty general notes or Adu
/ Raagu reason. Give its body a viewport-safe maximum height and a contained
scroll region so the action row remains reachable at 1280 x 720 and
1528 x 675. Do not expand the complete mistake history inside this dialog; that
belongs in the existing detailed review/history surfaces.

## 4. Installable Windows application shell

Phase 1 is a bounded installability release:

- add a manifest with `name`, `short_name`, `start_url`, `display: standalone`,
  `theme_color`, and `background_color`;
- add 192 px and 512 px icons, including a valid maskable icon where the source
  artwork supports the safe zone;
- add the manifest link and relevant metadata to `index.html`;
- use browser-provided installation and show `Install Tahqeeq` in More only
  while an installation prompt is actually available;
- detect standalone display so an installed app does not offer installation
  again;
- use the dedicated standalone window to remove browser tab/address chrome,
  while retaining the operating system's normal window controls;
- do not add Window Controls Overlay in the first pass.

The browser-hosted judge view must still pass every Fit gate. Extra height in
an installed window is a benefit, not a layout dependency or a substitute for
the header/stage correction.

Installability is not the same as offline reliability. Installing the app does
not protect device-local data if the user clears site data. The current runtime
caching behavior is not evidence that every Mushaf page is available offline.
Any broader page/font cache and offline-release claim requires a separate cache
budget and failure-mode audit.

Primary references:

- [Microsoft Edge: build a PWA](https://learn.microsoft.com/en-us/microsoft-edge/progressive-web-apps/how-to/)
- [MDN: making PWAs installable](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable)
- [MDN: create a standalone app](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/How_to/Create_a_standalone_app)

## 5. Optional prototype: Mushaf alignment near the scorecard

Do not implement continuous rail-distance sliders or free drag-and-drop. The
scorecard already has two legitimate docking regions, Left and Right. A real
draggable desktop panel requires explicit drop targets, grouping, undocking,
reset, keyboard alternatives, persistence, and collision behavior; a range
slider that merely moves the rail would imitate that complexity without a clear
judge task.

If the scorecard still feels too distant after Left/Right becomes easy to reach,
build an isolated comparison with two Mushaf-alignment modes:

1. **Centered:** preserve the current stage-centred Mushaf composition.
2. **Near scorecard:** use the safe horizontal gutter to move the Mushaf
   composition toward the docked scorecard without changing its Fit scale.

When the rail moves sides, Near scorecard must mirror logically. The prototype
must move the Mushaf composition, not merely increase the CSS grid gap. It must
then re-run Fit and verify page hitboxes, coach placement, popovers, mistake
expansion, both rail sides, `105%+` scrolling, responsive fallbacks, and reset to
Centered.

This mode is not approved as a persisted preference. Its confidence is below
the implementation threshold, so it requires side-by-side browser evidence and
explicit visual approval first.

## 6. Parallel-solution findings

- [VS Code's official layout guidance](https://code.visualstudio.com/docs/configure/custom-layout)
  separates discrete Primary Side Bar placement from editor/content alignment.
  That supports shipping Left/Right and treating perceived Mushaf distance as a
  separate alignment question.
- [Adobe Photoshop's official docking guidance](https://helpx.adobe.com/photoshop/desktop/get-started/learn-the-basics/dock-undock-panels.html)
  shows that credible drag-and-drop needs visible drop regions, panel grouping,
  docking and floating states. Tahqeeq does not need that panel-management
  system for a single judging scorecard.
- [GOV.UK validation guidance](https://design-system.service.gov.uk/patterns/validation/)
  recommends showing validation after a user tries to continue or submit, and
  its [error summary guidance](https://design-system.service.gov.uk/components/error-summary/)
  requires errors to be actionable and focusable. This is why the missing mark
  becomes prominent after attempted Save, not on dialog mount.
- [W3C error-identification guidance](https://www.w3.org/WAI/WCAG21/Understanding/error-identification.html)
  requires a text identification of the error. Tint alone is not sufficient,
  so the focused picker also receives a concise required message.

## 7. Implementation order and ownership

1. **Score alignment regression**: `ScorePanel.tsx`, `MarkPicker.tsx`,
   `FinishDialog.tsx`, `global.css`, and relevant existing scripts.
2. **Wide judge-workspace rhythm and live side control**: `Header.tsx`,
   `MushafViewport.tsx`, `MoreActionsPopover.tsx`, `App.tsx`,
   `devicePreferences.ts`, `mushafFit.ts`, `global.css`, and relevant existing
   scripts.
3. **Finish-review hierarchy**: `FinishDialog.tsx`, `MarkPicker.tsx`,
   `App.tsx`, `global.css`, and relevant existing scripts.
4. **Installable PWA shell**: `index.html`, `public/sw.js`, manifest and icon
   assets, and relevant existing scripts.
5. **Optional Mushaf-alignment prototype**: only if easy Left/Right placement
   still leaves a practical distance problem, and only within the verified
   workspace/preference files above.

Each slice requires scoped source review, focused tests, repository tests,
TypeScript/production build, `git diff --check`, browser geometry checks, and a
visual approval checkpoint before commit and publication.

## 8. Release gates

### Score alignment

- Every value in the required matrix has stable score and denominator columns.
- Picker-open and closed rows share the same baseline.
- No clipping, wrapping, column-width growth, or hardcoded value-specific
  correction occurs.

### Fit and workspace

- Fit remains the canonical `100%` state.
- Full and Two pages use the available frame more effectively without body or
  shell overflow.
- `105%` remains an intentional contained-scroll state.
- The header, selector, and paper form a deliberate rhythm at every wide gate.
- Left/Right changes are immediate, persistent, and keyboard-accessible.

### Finish

- A missing assigned Adu / Raagu mark is visible initially, then becomes
  prominent and receives focus after attempted Save.
- Explicit zero remains valid.
- The reducer/App guards cannot be bypassed.
- The compact review reflects the committed marks, total, mistake count, and
  non-empty remarks without becoming a second history screen.
- At 1280 x 720 and 1528 x 675, the dialog and its post-attempt opened mark bar
  remain reachable without clipping; any necessary overflow belongs to the
  dialog, never the document behind it.

### Installability

- Supported Chromium browsers can install the Sites-hosted build and launch it
  in standalone display mode.
- The install action appears only while actionable and disappears in standalone
  mode.
- The UI makes no unverified full-offline or data-preservation claim.

## 9. Confidence assessment

| Slice | Confidence | Decision |
| --- | ---: | --- |
| Shared Adu / Raagu score slots | 96 / 100 | Implementation-ready |
| Compact wide header and stage padding | 92 / 100 | Ready after viewport matrix |
| Two-page selector rhythm | 86 / 100 | Ready; exact spacing needs visual approval |
| More-menu Left/Right control | 96 / 100 | Implementation-ready |
| Submit-time missing-mark validation | 91 / 100 | Implementation-ready with both hard guards |
| Compact final score and remarks review | 87 / 100 | Ready with low-height dialog proof |
| Windows PWA installation shell | 93 / 100 | Ready for supported Chromium browsers |
| Full offline Mushaf guarantee | 58 / 100 | Not approved; requires separate audit |
| Continuous/free-drag scorecard rail | 42 / 100 | Rejected for production |
| Centered/Near scorecard Mushaf prototype | 76 / 100 | Prototype only |

Excluding the rejected/deferred items, the core plan is **91 / 100** overall:
practicality **92**, architecture and data safety **94**, and visual certainty
**86**. The remaining uncertainty is predominantly visual tuning at the named
viewport gates, not scoring or state architecture.

## 10. Unresolved and deferred

- Whether Near scorecard is useful after Left/Right becomes easy to reach.
- Whether the More control should become the sole long-term owner of rail side
  or coexist with Settings.
- The exact final-review wording and row density after browser comparison.
- Full offline Mushaf caching, cache budgets, install education, and recovery
  messaging.
- Window Controls Overlay, desktop packaging beyond PWA installation, and
  platform-specific installers.

These items remain proposals until separately reviewed. They must not be
silently treated as competition or application rules.

## 11. Implementation record

### 17 August 2026: score-readout alignment

- Replaced the fixed internal score slots with one shared, content-centred
  readout contract for ordinary scores, the Adu / Raagu picker, and the Finish
  review.
- The complete visible score is centred horizontally and vertically inside the
  existing 72 px column; no value-specific offset was introduced.
- Browser checks covered `1 / 10`, the complete 10- and 20-mark value matrix,
  picker-open state, both themes, both rail sides, and the Finish review.
- `10.5 / 20` fits without clipping or overflow.
- Forty focused Adu / Raagu and mistake-display tests passed, followed by the
  TypeScript production build and whitespace validation.

The wide-workspace, Finish-validation, PWA, and optional prototype slices remain
pending under the gates above.

### 17 August 2026: wide workspace and live rail-side control

- Scoped the compact header to the wide judging view and gave Full page the
  same 8 x 12 px stage-padding discipline already used by Two pages. Settings,
  Results, setup, print, and compact layouts retain their existing headers.
- Added a `Scorecard side` Left/Right segmented control to More. It writes
  through the existing versioned `judgeRailSide` device preference, updates the
  workspace immediately, and keeps native radio semantics.
- Verified the full Cartesian browser matrix at 1280 x 720, 1366 x 768,
  1440 x 900, 1528 x 675, 1528 x 732, and 1600 x 900: Full/Two pages,
  Fit/105%, and Left/Right. Fit produced no body or Mushaf-shell overflow;
  105% produced only contained Mushaf-shell scrolling.
- At 1528 x 732, Full Fit increased from 427 x 628 px to 444 x 653 px. Two-page
  Fit renders two real 422 x 621 px pages with a 4 px selector-to-paper gap.
- Reload retained `layout-spread`, `rail-right`, and Fit. The browser console
  reported no warnings or errors.
- All 265 repository tests, the TypeScript production build, and
  `git diff --check` passed.

This slice still requires explicit visual approval before commit and
publication. Finish validation, PWA installability, and the optional alignment
prototype remain pending.

# Desktop Mushaf stage implementation plan

Status: implemented and verified

Prepared: 16 August 2026

Parent plan: [`INTERFACE_SIMPLIFICATION_AND_JUDGING_FLOW_PLAN.md`](./INTERFACE_SIMPLIFICATION_AND_JUDGING_FLOW_PLAN.md)

Later, separate work: [`MOBILE_MUSHAF_AND_PHONE_JUDGING_PLAN.md`](./MOBILE_MUSHAF_AND_PHONE_JUDGING_PLAN.md) and the judge-screen zoom slice

## Implementation outcome

- The two-column judge view now uses a stable app-shell grid at viewports of at
  least 901px by 620px. The intrinsic header occupies its own row and the
  workspace receives the actual remaining height.
- A pure full/split fit helper preserves the existing `0.68`/`1.24` aspect
  ratios, 760px/1100px maxima, and an 8px minimum frame clearance.
- `MushafViewport` observes only the frame, commits rounded width changes, and
  leaves the existing page observer to remeasure word hitboxes once the page
  settles. The dependency remains frame -> page, never page -> frame.
- The frame owns centering and `overflow: auto`; at Fit the measured frame and
  document have no overflow. The rail stretches to the same workspace height.
- Short-height, 900px-and-narrower, and print layouts return to document flow.
  The narrow idle-workspace selector was also reset so its higher specificity
  cannot collapse the Mushaf column.
- Browser QA passed at 1440 x 900, 1280 x 720, 1024 x 768, 768 x 1024, 390 x
  844, and the 1280 x 600 short-height fallback. It covered idle and active
  judging, the hint-reduced frame, a visible Finish action, opening and safely
  closing a word-marking tray, full/split pages, light/dark themes, both rail
  sides, pages 1, 2, 199, 300, 601, 602, and 604, the 604 -> 603 navigation
  boundary, and console errors.
- All 253 repository tests pass, the production Sites build succeeds, and
  `git diff --check` is clean. The existing large ExcelJS chunk warning remains
  unchanged.
- Rollback checkpoint: `checkpoint/pre-desktop-mushaf-stage-20260816`.

## 1. Decision

Implement a bounded, remaining-height Mushaf stage for the two-column judge
view. At the current default `100%`, the complete composed page will be fitted
and centred inside that stage using the stage's measured content box. The page
will no longer size itself from a guessed browser-viewport subtraction.

This is a geometry correction, not a redesign of the 1405H Mushaf and not the
zoom-control release. It will:

- make the desktop judge view use the available screen without unnecessary
  document scrolling;
- keep the full page or split spread completely visible at the default Fit
  state;
- keep the Mushaf as the visual focus, without adding another card, caption,
  toolbar, or permanent helper text;
- preserve QCF glyphs, line composition, Quran source data, target IDs,
  pointer marking, page navigation, and score behavior;
- establish the contained viewing frame that the later zoom control can reuse.

The implementation should not be approved if it merely swaps one viewport
constant for another. The frame must become the source of truth.

## 2. Why the current composition is unstable

The current architecture contains four independent geometry decisions:

1. `.workspace` is a normal document-flow grid with 24px outer padding.
2. `.sidebar` separately uses `height: calc(100vh - 108px)`, a sticky offset,
   and a 760px maximum.
3. `.page` separately uses `calc((100dvh - 96px) * aspect-ratio)`.
4. `HintBanner` and `PreparedRecitationStrip` occupy stage height without being
   included in the page calculation.

That is why a page can be individually height-limited and the document can
still scroll: no element owns the actual remaining rectangle. It also means a
banner, a different header height, browser chrome, the idle rail width, or the
split layout can change the real available area without changing the page's
assumption.

The existing Mushaf internals are not the cause. The page already uses an
inline-size container and `cqi` values to keep its line, cartouche, marginalia,
and mark geometry proportional to the composed page. That internal contract
should remain intact.

## 3. Research translated into UI rules

### 3.1 Treat this as a document pane

[Adobe Acrobat's current viewing model](https://helpx.adobe.com/acrobat/using/adjusting-pdf-views.html)
distinguishes a single-page view from continuous scrolling and provides a
specific page-level fit that shows the entire page. [PDF.js likewise exposes
`page-fit`](https://github.com/mozilla/pdf.js/wiki/Viewer-options), and its
[single-page example](https://github.com/mozilla/pdf.js/blob/master/examples/components/singlepageviewer.html)
puts the viewer inside a dedicated full-size, `overflow: auto` container.

Tahqeeq should use the same mental model:

- the Mushaf page is one composed document surface;
- the judge workspace contains a dedicated document pane;
- Fit means the whole composed page is visible, not merely fit-to-width;
- later enlargement pans inside that pane, not by moving the application page.

### 3.2 Preserve fixed Quran composition, contain exceptional overflow

[WCAG's Reflow guidance](https://www.w3.org/WAI/WCAG21/Understanding/reflow)
recognizes that fixed two-dimensional material and interfaces that must retain
their spatial relationships may need a contained scrolling region. It also
recommends limiting that scrolling to the necessary section rather than making
the entire page scroll in two axes.

For Tahqeeq, reflowing individual Quran words or lines would destroy the printed
page relationship used for judging. Therefore:

- the app chrome and judge controls continue to respond normally;
- the composed Mushaf does not reflow internally;
- any overflow belongs only to the Mushaf frame;
- the frame has no scrollbar at Fit and becomes scrollable only when content
  actually exceeds it.

### 3.3 Prefer stable shell height over page-level dynamic viewport math

[MDN's viewport-unit guidance](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Values/length)
notes that dynamic viewport units can resize while browser interfaces move,
which can degrade the interface. Small viewport units are stable and safer,
although they can leave some unused space when browser chrome retracts.

The implementation will therefore use `100svh` only at the judge app-shell
boundary. The page itself will not use `vh`, `svh`, or `dvh`. It will fit the
actual frame reported after the header, workspace padding, optional strips, and
rail have taken their space.

The existing `cqi` geometry inside `.page` remains appropriate because those
units are relative to the page container, not the browser viewport.

### 3.4 Use safe overflow behavior

[MDN's overflow reference](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/overflow)
shows that `overflow: auto` adds scrolling only when content exceeds the box.
It also warns that `overflow: clip` can leave focused interactive content
unreachable. The Mushaf frame will use `overflow: auto`; it will not hide or
clip offscreen Quran targets or page-navigation controls.

[WCAG Focus Not Obscured](https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum.html)
also requires sticky or overlaid UI not to completely cover the focused
control. Header, rail, page navigation, dialogs, and future zoom controls must
be checked with keyboard focus, not only by visual inspection.

## 4. Visual direction

The stage should feel like a calm working surface, not a new dashboard module.

- Keep the existing application background, paper, border, radius, and shadow.
- Do not add a frame border, label, eyebrow, status dot, decorative toolbar, or
  nested card around the Mushaf.
- Centre the page geometrically in both axes of the remaining viewing frame.
- Preserve at least a small frame inset so the paper shadow and focus rings do
  not touch or clip against the frame edge.
- Let naturally larger horizontal whitespace remain quiet. Do not fill it with
  instructions or metrics.
- Keep the existing 24px separation between the stage and judging rail unless
  viewport testing proves a smaller existing breakpoint is necessary.
- Optional hint/preparation strips sit above the frame and reduce its measured
  height; they never overlap the page.
- Page loading uses the selected full/split footprint so the stage does not
  jump between aspect ratios.

This keeps the current app's restrained professional character while giving
the Mushaf the strong, deliberate placement expected of the primary judging
surface.

## 5. Selected architecture

### 5.1 App-shell ownership

Add the active view to the app class, for example `app view-judge`. At the
existing two-column breakpoint and a verified safe minimum viewport height:

```text
app.view-judge (stable viewport height)
├── header (intrinsic height)
└── workspace (remaining minmax(0, 1fr))
    ├── stage (column, min-height: 0)
    │   ├── optional hint
    │   ├── optional prepared-recitation strip
    │   └── Mushaf frame (flexes, min-height: 0, owns overflow)
    └── rail (stretches to workspace content height)
```

Use CSS Grid at the view-specific app shell so the real header height is an
intrinsic row. Do not hardcode a duplicate header pixel subtraction in React or
CSS. Print styles must explicitly restore normal block flow and visible
overflow so the hidden print result sheet is unaffected.

When browser zoom or window width crosses the existing 900px layout breakpoint,
disable the fixed-height judge shell and return to the current one-column,
document-flow layout. This is important: the fixed two-column exception must
not prevent the surrounding interface from reflowing.

The safe minimum height is an implementation measurement, not an arbitrary
design guess. Start verification at 620 CSS px. If the idle panel, score rail,
or minimum faithful page size cannot fit, retain normal document flow below the
smallest passing height and record the measured threshold in the test.

### 5.2 Frame-owned Fit calculation

Introduce one pure geometry function, with no DOM or competition-state access:

```text
fitInlineSize = floor(min(
  layoutMaximum,
  frameInlineSize - 2 * frameInset,
  (frameBlockSize - 2 * frameInset) * pageAspectRatio
))
```

Inputs:

- full-page aspect ratio: existing `0.68`;
- split-spread aspect ratio: existing `1.24`;
- full-page maximum: existing `760px`;
- split-spread maximum: existing `1100px`;
- a small shared frame inset for shadow/focus clearance;
- the frame's observed content-box width and height.

The current stored Mushaf scale remains supported without changing its range in
this slice. `100%` uses the computed Fit size; values below `100%` use a uniform
fraction of that composed size. There is no above-Fit range or new judge-screen
control until the separate zoom slice.

### 5.3 Measurement seam

Add a small `MushafViewport` component (or equivalently narrow hook) around the
existing `Mushaf`. It will:

- own the frame ref;
- observe the frame with `ResizeObserver` only while stable desktop-stage mode
  is active;
- round the content-box measurement before committing it;
- ignore unchanged/sub-pixel equivalent sizes;
- compute the fitted inline size through the pure helper;
- expose only a CSS custom property/data attribute to the existing page;
- disconnect on unmount and when the layout returns to document flow.

The frame size must not depend on the page size. This one-way dependency avoids
a frame -> page -> frame measurement loop. The page's existing observer may
then remeasure word hitboxes after its committed width changes.

### 5.4 Overflow and centering

The frame uses `overflow: auto`, `overscroll-behavior: contain`, and a centred
inner canvas. At Fit and below:

- page width and height are both within the frame;
- inline and block gaps are symmetrical within a 2px rendering tolerance;
- no document or frame scrollbar is present.

The inner canvas must be at least the frame size. This allows normal centering
while content fits and gives the later above-Fit zoom slice a predictable
scrolling surface. Do not use CSS `transform: scale()`: transforms would change
the visual page without changing layout bounds and would make scrolling,
hitboxes, trays, and focus geometry harder to keep correct.

### 5.5 Rail behavior

Within stable desktop mode, the rail stretches to the workspace's real content
height instead of running a second `100vh` formula and a 760px cap. Keep the
existing internal flex behavior:

- the mistake list owns its own vertical overflow;
- Finish/Next remains visible;
- notes retain their existing bounded height;
- the idle/prepared panel remains vertically composed without forcing the page
  to scroll.

If any supported height cannot retain the primary rail action, that height does
not qualify for stable mode; do not solve it by clipping the action.

## 6. Explicitly rejected approaches

| Approach | Reason rejected |
| --- | --- |
| Replace `96px` with a better `dvh` subtraction | Optional strips, real header height, rail state, and workspace padding would still be separate assumptions. |
| Fit only to stage width | A tall full page would still force document scrolling on shorter displays. |
| Global `body { overflow: hidden }` | It would affect Settings, Results, setup, print, narrow layouts, and browser-zoom reflow. |
| `overflow: clip` around the Mushaf | It can hide interactive navigation or marked targets from keyboard users. |
| `transform: scale()` | Visual and layout geometry would disagree, complicating hitboxes and future panning. |
| Reflow Quran lines or loosen the 15-line composition | It breaks the protected printed-page and judging contract. |
| Add the zoom scrubber now | It mixes a foundational geometry correction with new interaction, persistence range, overflow, and accessibility work. |
| Add a visible frame/card/toolbar | It adds hierarchy and AI-style chrome where the page itself should remain primary. |

## 7. Implementation sequence

### Pass 0 - baseline and rollback

1. Record the current branch, commit, and dirty files; do not absorb unrelated
   `.private`, temporary, mobile-plan, ignore-file, or undecided-decision work.
2. Create a rollback checkpoint before geometry code.
3. Capture current full/split page rectangles, line rectangles, document
   `scrollHeight`, rail bounds, and page centre at the acceptance viewports.
4. Confirm the current public build and local branch relationship before any
   later publish claim.

### Pass 1 - pure fit contract

1. Add the full/split geometry constants and pure fit calculation.
2. Test width-limited, height-limited, capped, inset, invalid/zero-size, full,
   and split cases.
3. Keep all values outside competition state and Quran data.

### Pass 2 - bounded judge shell

1. Add the view-specific app class.
2. Make only qualifying desktop judge mode a stable two-row shell.
3. Make workspace, stage, frame, and rail participate in one min-height chain.
4. Reset the shell at the one-column breakpoint, short-height fallback, and
   print media.

### Pass 3 - measured Mushaf viewport

1. Add the narrow frame observer component/hook.
2. Replace `.page` and `.page-split` viewport-height maximums with the computed
   rendered inline size in stable mode.
3. Preserve the current document-flow sizing rules as the fallback for mobile,
   short-height, and unsupported-measurement states.
4. Give the loading page the chosen full/split aspect class.
5. Verify one hitbox remeasurement after a committed frame change, without a
   loop or repeated state churn.

### Pass 4 - visual integration

1. Tune only the invisible frame inset and centering; do not restyle Quran
   content or surrounding controls.
2. Verify idle, prepared, and active states with and without the hint banner.
3. Verify both rail sides and both themes.
4. Inspect short and special pages for optical stability without changing their
   fixed line geometry.

### Pass 5 - release gate

1. Run targeted geometry tests, then the entire repository test suite.
2. Run the production build and `git diff --check`.
3. Review the final diff for Quran source, scoring, preference, mobile, and
   print leakage.
4. Obtain browser visual approval before commit/push/publish.
5. Commit and publish this slice alone; verify the public deployment status and
   smoke-test the public URL.

## 8. File-level plan

| File | Planned responsibility |
| --- | --- |
| `src/App.tsx` | Add the active view class and replace the bare shell wrapper with the measured Mushaf viewport. |
| `src/components/MushafViewport.tsx` | Own the frame ref, stable-mode media subscription, one-way ResizeObserver, and fitted CSS size. |
| `src/lib/mushafFit.ts` | Pure aspect/max/inset calculation with no React, DOM, Quran, or competition dependency. |
| `src/components/Mushaf.tsx` | Only add selected-layout loading geometry if required; preserve renderer, IDs, events, and hitbox logic. |
| `src/styles/global.css` | View-specific shell rows, min-height chain, centred auto-overflow frame, rail stretch, fallback, and print reset. |
| `scripts/mushaf-fit.test.mjs` | Deterministic full/split, width/height/cap, rounding, and invalid-input coverage. |
| `scripts/solid-mushaf.test.mjs` | Protect removal of page-level viewport math in stable mode and preservation of renderer/source contracts. |
| `package.json` | Add the fit test to the existing test command. |
| `PROGRESS.md` | Record implementation and verified release only after the work passes. |

No competition reducer, scoring helper, results selector, export module, Quran
JSON, QCF font, target migration, or device-preference schema should change.

## 9. Acceptance matrix

### Viewports and modes

- 1440 x 900;
- 1280 x 800;
- 1280 x 720;
- 1024 x 768;
- the verified minimum qualifying desktop height;
- one height immediately below the fallback threshold;
- 768 x 1024 and 390 x 844 to confirm the mobile/document-flow path is not
  captured by this slice;
- browser zoom at 100%, 200%, and 400% to confirm reflow/fallback behavior;
- light and dark themes;
- left and right judge rails;
- idle, prepared, active, and completed competition states;
- hint hidden and hint visible;
- full and split layouts.

### Mushaf pages

- page 1: opening-page vertical rhythm;
- page 2: second opening page;
- page 199: known letter/tashkil and evidence regression page;
- page 300: ordinary middle-page composition;
- pages 601 and 602: late short/special layouts;
- page 604: final page and lazy-load boundary.

### Geometry assertions

- complete paper rectangle is visible at `100%`;
- no default document-level vertical scrollbar in qualifying desktop judge mode;
- no horizontal document scrollbar;
- no frame scrollbar at Fit or below;
- page aspect ratio matches `0.68` or `1.24` within normal CSS rounding;
- left/right and top/bottom frame gaps differ by no more than 2px when the page
  is below its maximum cap;
- page never exceeds the existing 760px/1100px layout maximum;
- rail stays inside the same workspace bounds and its primary action is visible;
- optional strips reduce frame height without overlap or document overflow;
- print preview contains the result sheet and is not constrained to `100svh`.

### Fidelity and interaction assertions

- the same QCF font is loaded for the same page;
- all 604 source page contracts remain valid;
- visible line count/order and source word IDs are unchanged;
- representative line and target positions retain their normalized coordinates
  within a small pre-recorded tolerance;
- pointer tap, hold/drag selection, mark tray placement, closing, and commit work;
- page navigation 604 -> 603 and 1 -> 2 works;
- mistake-log jump reaches the intended target without moving it under the
  header or rail;
- switching full/split layout and resizing the window produces one stable final
  measurement, not a loop;
- keyboard focus on page navigation and any open tray remains visible.

## 10. Automated and manual gate

```powershell
node --test --experimental-strip-types scripts/mushaf-fit.test.mjs scripts/solid-mushaf.test.mjs
npm.cmd test
npm.cmd run build
git diff --check
```

Browser QA must record, for each representative state:

- viewport and browser zoom;
- page and frame rectangles;
- document `scrollWidth`/`clientWidth` and `scrollHeight`/`clientHeight`;
- frame overflow dimensions;
- rail action visibility;
- console errors;
- screenshots for full and split layouts.

A source-only assertion is not sufficient for the final visual approval.

## 11. Rollback boundaries

The slice is intentionally reversible:

1. remove `MushafViewport` and restore the existing shell wrapper;
2. remove the view-specific desktop shell rules;
3. restore the existing `.page`/`.page-split` fallback maxima;
4. remove the pure helper and its test registration.

Competition data, preferences, records, Quran source, and migrations are not
modified, so rollback requires no data repair.

## 12. Completion definition

This slice is complete only when the default desktop judge view presents the
entire faithful full page or split spread, centred in a stable remaining-height
stage, with no unnecessary document scrolling and no regression in the rail,
marking, navigation, print, mobile fallback, or Quran geometry.

Only after that geometry is visually approved should the separate zoom slice
extend the scale above Fit and expose controls on the judge screen.

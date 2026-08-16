# Interface simplification and judging-flow plan

Status: easy fixes and Adu / Raagu required entry implemented and verified; visual approval and later slices remain

Prepared: 16 August 2026

Canonical scope: Settings, Results, idle Mushaf workspace, Adu / Raagu completion, and judge-screen zoom

Depends on: [`SETTINGS_AND_COMPETITION_SETUP_OVERHAUL_PLAN.md`](./SETTINGS_AND_COMPETITION_SETUP_OVERHAUL_PLAN.md), [`RESULTS_PASS_1_IMPLEMENTATION_PLAN.md`](./RESULTS_PASS_1_IMPLEMENTATION_PLAN.md), and [`MOBILE_MUSHAF_AND_PHONE_JUDGING_PLAN.md`](./MOBILE_MUSHAF_AND_PHONE_JUDGING_PLAN.md)

## 1. Executive decision

The next interface pass is a reduction and workflow-correction release, not a
new visual theme. The current app has sound data boundaries, but permanent
helper copy, nested cards, duplicated headings, repeated sample warnings, and a
few undersized idle states make it feel generated rather than deliberately
edited.

The release will preserve the existing architecture and make five coordinated
changes:

1. remove permanent instructional copy from Settings and teach it through a
   fast, optional first-use guide;
2. reduce Results to one title, one competition context, one status/filter
   band, and a quieter ledger-style participant list;
3. make an unentered Adu / Raagu score visibly `0 / allocation` and require the
   assigned judge to enter it before finishing;
4. replace the small, copy-heavy idle sidebar with a stronger start surface;
5. give the Mushaf a stable, centred viewing stage and a judge-screen zoom
   scrubber that writes through the existing device-preference boundary.

This plan does not change Quran data, judging categories, mark allocations,
final-result arithmetic after all inputs are complete, exports, or competition
lifecycle rules.

## 2. Current audit: addressed versus remaining

| Area | Already sound | Remaining correction | Status |
| --- | --- | --- | --- |
| Settings architecture | device preferences are separate from competition state; index/detail navigation and recovery boundaries exist | permanent header clutter is removed; flatter field/index composition remains | In progress |
| Settings explanation | the copy is factually useful | local-browser and auto-save facts now live in a versioned, optional first-use guide | Implemented |
| Results domain model | `resultsReview.ts` owns state, reasons, scope, sorting, filters, and pagination | simplify framing and visual composition without changing that selector | Planned |
| Results participant workflow | review state, source evidence, finalization, audit, and workbook boundaries exist | replace card-on-card presentation and secondary microcopy with a quieter ledger list | Planned |
| Sample isolation | stored sample and official records/exports are separated | repeated ordinary-view disclaimers are removed; consequential sample actions and exports remain explicit | Implemented |
| Adu / Raagu input | one whole-recitation criterion, half-step default, one event per committed gesture, and assignment scoping exist | active unentered marks now show zero/pending and require a deliberate selection; historical saved totals retain their legacy fallback | Implemented |
| Finish workflow | confirmation and next-reciter handoff exist | the shared picker now appears inside Finish, Save remains disabled while pending, and reducer plus App guards prevent bypass | Implemented |
| Idle judging screen | live/draft/closed states and actions are correct | copy, hierarchy, ruled data rows, and idle-only width are implemented; Mushaf stage geometry remains | In progress |
| Mushaf source fidelity | one 1405H/QCF renderer, fixed lines, page fonts, IDs, and measured hitboxes exist | viewing frame is height-derived and does not own a stable centred viewport | Planned |
| Mushaf zoom | `mushafZoom` is persisted and Settings already exposes 45–100% | add direct judge-screen access, a usable enlargement range, fit reset, and contained overflow policy | Planned |
| Phone judging | complete research plan exists | remains a later, separately approved implementation after desktop geometry is stable | Deferred |

## 3. Research translated into rules

The pass follows a small set of current external constraints:

- [Apple onboarding guidance](https://developer.apple.com/design/human-interface-guidelines/onboarding) recommends that onboarding be fast, optional, contextual, skippable, and available again later. Tahqeeq will therefore use a short first-Settings guide, never a mandatory launch wizard.
- [Apple launching guidance](https://developer.apple.com/design/human-interface-guidelines/launching/) recommends immediate access to the product and restoration of prior state. The guide opens only after Settings is ready and never blocks the Mushaf at application launch.
- [W3C APG slider guidance](https://www.w3.org/WAI/ARIA/apg/patterns/slider/) defines arrow, Home, and End behavior and warns that touch assistive technology can struggle with slider gestures. The zoom scrubber will use a native range input plus minus, plus, and Fit alternatives.
- The existing Tahqeeq research remains authoritative on auditability, 40–44px controls, logical CSS properties, one Mushaf renderer, and no silent score inference.

The visual rule is **progressive disclosure, not decorative explanation**:

- required action and error text stays beside the action;
- consequential scope text stays beside export, restore, reset, and delete;
- first-use explanation moves into the guide;
- redundant restatement is deleted;
- secondary information appears on demand rather than permanently occupying the
  primary scan path.

## 4. Settings V1.1: quieter interface, first-use guidance

### 4.1 Permanent header

The Settings header will contain only:

- Back to Mushaf;
- `Settings` as the single page title;
- one quiet Help action that can replay the introduction.

Remove from the permanent interface:

- `On this device`;
- the green-dot `Saved automatically` status;
- the paragraph about personalizing Tahqeeq;
- repeated `Preferences` eyebrows;
- `These choices affect this judge device only` from the workspace section.

Auto-save remains the behavior. It simply stops being a decorative status
element because every control already gives immediate selected-state feedback.
Actual write failure remains non-blocking, matching the existing preference
adapter.

### 4.2 First Settings guide

On the first opening of Settings in a browser profile, show a short, optional,
two-step guide:

1. **Your view, saved here** — theme, Mushaf layout, size, and panel position
   save automatically in this browser and do not change competition rules.
2. **Your competition data is local** — backup before clearing site data or
   moving to another browser.

Behavior:

- open after Settings has rendered, not during application launch;
- use an anchored popover on wide screens and a compact bottom sheet on narrow
  screens;
- provide Skip, Back, Next, and Done;
- never auto-advance;
- trap focus only while presented as a modal sheet; otherwise use a correctly
  labelled non-modal popover;
- return focus to the Help action when closed;
- store completion under a versioned key such as
  `tahqeeq:guide.settings.v1`;
- treat missing/unavailable storage safely without blocking Settings;
- allow replay from Help without resetting preferences;
- clearing browser **site data/local storage** makes the guide appear again;
  clearing the HTTP cache alone may not.

### 4.3 Settings visual composition

Keep the index/detail architecture but flatten the presentation:

- the desktop index becomes a simple ruled list, not a card inside a card;
- detail sections use one surface with dividers rather than repeated rounded
  choice cards;
- theme becomes a compact two-choice control with a restrained swatch;
- Page view and Judge panel position remain segmented controls;
- Page scale remains a labelled range control, but shares the same range,
  value, and Fit action as the judge-screen scrubber;
- Data and recovery retains stronger separation because backup, restore, and
  reset are consequential actions;
- helper text is retained only where it changes safe use, such as what a backup
  contains or why restore is locked.

## 5. Results V1.2: editorial ledger, not dashboard chrome

### 5.1 Page framing

The page header becomes:

- one `h1`: **Results**;
- one compact competition context line: name, edition when present, and
  lifecycle status;
- no Results eyebrow;
- no `Results & review` duplication;
- no overview paragraph;
- no standalone sample-warning banner.

Sample handling is reduced to the places where it changes meaning:

- one compact Sample suffix in the global competition context;
- explicit sample wording on sample export files/actions;
- full sample explanation only beside load/remove sample controls in Competition
  setup.

Do not repeat `Test mode`, `fictional data`, or isolation disclaimers in ordinary
Results, idle, or participant-review surfaces.

### 5.2 Review composition

Use a ruled ledger rather than separated floating cards:

1. one connected status band with Needs review, Ready, Finalized, and All;
2. participant search and one More filters disclosure;
3. one bordered participant list with separators;
4. the selected participant expands inline;
5. pagination, then verified export actions;
6. Judge results remains the deeper audit list below the participant workflow.

Status segments retain full low-opacity state color because color must be
visible, but remove `Resolve first`, `Can finalize`, `Current result`, and
`Complete queue`. Label, count, and selected state are enough.

Participant collapsed row priority:

1. name;
2. number and category context;
3. Needs review / Ready / Finalized;
4. proposed or final total;
5. open/close affordance.

Only Needs review keeps a concise reason in the collapsed row. Ready and
Finalized explanations move into the expanded detail or disappear when they
repeat the state label.

Expanded detail retains criterion, score, judge, revision, source choice,
finalization action, and audit meaning. Criterion color remains semantic, but
avoid a tinted card for every nested datum.

### 5.3 Analysis

Analysis keeps its current calculations and scope controls. Present it as:

- one ruled three-number summary;
- category rows with restrained bars;
- marked letters;
- ranked repeated locations;
- one `About these numbers` disclosure containing the raw-count/not-normalized
  explanation.

The methodology warning remains accessible but no longer occupies the normal
scan path permanently.

## 6. Adu / Raagu: explicit required input

### 6.1 Confirmed behavior

When Adu / Raagu is enabled and assigned to this judge:

- a new recitation shows `0 / allocation`, not full marks;
- it is visually pending until the judge explicitly commits a value;
- its configured step remains authoritative; the default remains 0.5;
- the score row remains editable during judging;
- Finish opens even when the mark is pending;
- the Finish dialog places the pending Adu / Raagu control directly inside the
  dialog and focuses its heading/control;
- Save and select next reciter remains disabled until every assigned
  whole-recitation criterion has been explicitly marked;
- selecting the mark updates the dialog total immediately;
- the judge never has to close Finish and hunt for the score row;
- no implicit full-mark event is created.

The live subtotal may numerically include zero while pending, but the row must
remain visibly incomplete. It must never be presented as a finalized result
until the required input exists.

### 6.2 One shared completion contract

Add a pure helper, owned beside scoring, that returns assigned enabled
whole-recitation criteria without an explicit mark. The same helper drives:

- pending styling in ScorePanel;
- the inline controls in FinishDialog;
- Finish button availability;
- the reducer-level `FINISH_SESSION` guard;
- source-contract and domain tests.

UI validation alone is insufficient. `FINISH_SESSION` must return the state
unchanged if a required assigned impression mark is missing, so keyboard,
stale-dialog, or future integration paths cannot bypass the rule.

### 6.3 Historical compatibility

Earlier Tahqeeq builds treated an absent enabled Adu / Raagu mark as full marks.
Existing saved sessions and finalized results must not change when this release
loads them.

Use an explicit scoring context:

- **active entry-required context**: absent mark displays zero and is incomplete;
- **legacy stored-session context**: absent mark retains the historical full-mark
  fallback when reconstructing an older saved source;
- new saved sessions never rely on either fallback because finishing requires an
  explicit mark.

Do not bulk-migrate or rewrite historical sessions. A reopened old session uses
the new entry-required workflow for its next revision, while its previous saved
revision remains exact.

### 6.4 Shared mark control

Refactor the numeric choice presentation only if needed so ScorePanel and
FinishDialog consume the same:

- clamp/step logic;
- selected value;
- marked/pending state;
- accessible value text;
- commit callback;
- pointer-up and keyboard semantics.

Do not create two separate Adu / Raagu calculation paths. The dialog may use an
expanded choice surface while the score row stays compact, but both must write
the same `SET_IMPRESSION` action and produce one ledger event per committed
change.

## 7. Idle Mushaf workspace

The idle view remains a real Mushaf with a companion start surface, not a home
dashboard.

### 7.1 Visual correction

- add an explicit idle workspace class from `App.tsx`;
- allow the idle companion rail to be approximately 350–370px on wide screens;
- increase the title and primary-action scale modestly;
- remove the uppercase state eyebrow when the primary title already conveys the
  state;
- reduce idle copy to one useful sentence at most;
- remove `Test mode` and fictional-data explanations from the panel;
- keep competition name, waiting/finished counts, judge assignment, and primary
  Prepare/Continue/Start action only when they are applicable;
- remove card-within-card styling from role and progress data; use aligned rows
  and rules;
- keep View competition setup as a quiet secondary action.

### 7.2 State-specific copy

- No competition: `The Mushaf is ready` + `Prepare competition`.
- Draft: competition name + `Continue setup`.
- Live with waiting participant: competition name, judge role, queue counts, and
  `Prepare next reciter`.
- Live complete: competition name + completion message + setup/results route.
- Closed: competition name + `View competition`.

These states remain textually distinguishable; reducing copy must not make
color the only state signal.

## 8. Stable Mushaf stage and direct zoom

### 8.1 Geometry ownership

The current `.page` width uses viewport-height arithmetic directly. The next
pass will make the workspace own a stable available stage and let the page fit
inside that stage.

Desktop/tablet structure:

```text
app header
└── judge workspace (remaining dynamic viewport height)
    ├── stage
    │   ├── optional hint/prepared strip
    │   ├── compact Mushaf toolbar
    │   └── viewing frame (centred page; owns overflow)
    └── judge/idle rail
```

Rules:

- the default Fit state has no unnecessary document-level vertical scroll;
- the page is centred in both axes inside the viewing frame;
- full and split layouts preserve their exact aspect ratios;
- page lines, QCF glyphs, spacing, marginalia, hitboxes, and source IDs remain
  unchanged;
- zoom scales the composed page uniformly and never reflows Quran words;
- only the viewing frame may scroll when a judge intentionally zooms beyond Fit;
- body scrolling remains normal in Settings, Results, setup, and other pages;
- ResizeObserver may trigger hitbox remeasurement after a committed size change,
  but must not create a measure-render-measure loop.

### 8.2 Judge-screen zoom control

Add a compact Mushaf toolbar close to page navigation containing:

- minus button;
- native range input;
- plus button;
- current percentage;
- Fit action.

Recommended initial range: 70–125%, step 5%. `100%` means Fit, not an arbitrary
fixed pixel width. Values above Fit use contained stage scrolling; values below
Fit provide an overview.

Requirements:

- Settings and the judge toolbar share `preferences.mushafZoom` and one range
  definition;
- the existing device-preference adapter remains outside competition state;
- Arrow keys change one step, Home selects the minimum, End the maximum;
- minus/plus/Fit provide non-drag alternatives for touch and assistive
  technology;
- `aria-valuetext` announces percentage and Fit when applicable;
- controls never overlap marginalia, Arabic ink, selection trays, or the judge
  sidebar;
- opening a mark tray or jumping from the mistake log retains the committed zoom;
- changing zoom closes transient mark trays safely and remeasures hitboxes once;
- mobile Focus mode remains governed by the separate mobile plan.

## 9. Implementation slices and release order

Each slice gets its own rollback checkpoint, scoped diff, visual approval, and
test gate. Do not publish all slices merely because the first passes.

### First release — durable easy fixes (implemented)

The bounded release in
[`INTERFACE_EASY_FIXES_IMPLEMENTATION_PLAN.md`](./INTERFACE_EASY_FIXES_IMPLEMENTATION_PLAN.md)
is implemented and locally verified before any scoring-state or
Mushaf-geometry work. It completes:

1. the Settings first-use guide and permanent-header cleanup;
2. the Results title/context and repeated sample-copy cleanup;
3. the idle panel copy, hierarchy, and explicit workspace-state hook.

It deliberately does not perform the full Settings flattening, Results ledger,
Adu / Raagu state correction, Mushaf stage, or zoom work. The purpose is a
small release with finished ownership and verification, not a cosmetic stopgap.

### Slice A — required Adu / Raagu entry

Dedicated implementation contract:
[`ADU_RAAGU_REQUIRED_ENTRY_IMPLEMENTATION_PLAN.md`](./ADU_RAAGU_REQUIRED_ENTRY_IMPLEMENTATION_PLAN.md).

1. Add active-versus-legacy impression fallback context.
2. Add the shared missing-required-impression helper.
3. Change live unentered display to zero/pending.
4. Add reducer-level Finish blocking.
5. Put the required mark choice in FinishDialog.
6. Verify reopening and historical source totals.

Gate: no assigned enabled impression criterion can be saved without an explicit
mark; historical saved scores remain byte-for-byte equivalent where currently
covered.

### Slice B — remaining Settings composition

The first release owns the guide and permanent-header cleanup. This later slice
completes the remaining Settings composition:

1. Flatten choice and section styling.
2. Reduce repeated helper copy inside individual settings.
3. Preserve backup, restore, reset, and mobile index/detail behavior.

Gate: the first-release guide and persistence behavior remain intact; all
Settings choices and recovery actions work in the flatter composition.

### Slice C — Results participant ledger and Analysis

The first release owns the Results framing and repeated sample copy. This later
slice completes the participant workflow:

1. Convert status cards into one connected status band.
2. Convert participant cards into one ruled expandable list.
3. Prune state-repeating secondary text.
4. Move Analysis methodology into `About these numbers`.

Gate: all review, filtering, pagination, source selection, finalization, audit,
and export tests remain unchanged; veteran users can find Needs review and the
participant action without reading helper copy.

### Slice D — stable desktop Mushaf stage

The first release owns the idle state hook and panel correction. This later
slice is therefore only the geometry-sensitive stage work:

1. Give the judge view a remaining-height stage.
2. Centre the composed page within the viewing frame.
3. Remove unnecessary default document scrolling.
4. Verify page geometry before adding enlargement.

Gate: pages 1, 2, 199, 300, 601, 602, and 604 retain their composed geometry;
the idle and active desktop views are centred with no accidental horizontal or
default vertical overflow.

### Slice E — direct zoom scrubber

1. Centralize zoom bounds/step/labels.
2. Extend the normalized supported range.
3. Add the shared Mushaf toolbar control.
4. Align the Settings control to the same contract.
5. Add contained overflow above Fit and Fit reset.
6. Re-run hitbox, mark-tray, jump, and responsive tests.

Gate: the Mushaf remains faithful at every supported scale; the judge can
operate zoom by pointer, touch, or keyboard without changing competition data.

Phone geometry and the phone judging dock remain separate later approvals from
the existing mobile plan.

## 10. File-level map

| File | Planned responsibility |
| --- | --- |
| `src/lib/scoring.ts` | active/legacy impression fallback and required-input helper |
| `src/state/store.tsx` | reducer-level Finish guard; preserve ledger/history semantics |
| `src/components/ScorePanel.tsx` | zero/pending live Adu / Raagu presentation |
| `src/components/FinishDialog.tsx` | inline required mark completion and disabled Save until complete |
| `src/components/MarkPicker.tsx` | shared numeric choice surface only if required; preserve gesture lifecycle |
| `src/lib/devicePreferences.ts` | shared zoom limits, normalization, and persistence contract |
| `src/lib/firstUseGuides.ts` | safe versioned first-use state, with no competition coupling |
| `src/components/SettingsWorkspace.tsx` | guide, replay, copy reduction, and flatter settings composition |
| `src/styles/settings.css` | remove status-dot/card styling and implement guide/settings hierarchy |
| `src/components/RecordsView.tsx` | Results framing, status band, sample-copy reduction, Analysis disclosure |
| `src/components/FinalResultsPanel.tsx` | ledger-style participant list without domain changes |
| `src/components/CompetitionIdlePanel.tsx` | concise enlarged idle/start states |
| `src/App.tsx` | workspace mode classes, shared zoom setter, and Mushaf toolbar ownership |
| `src/components/Mushaf.tsx` | keep renderer intact; accept viewing-frame integration only if necessary |
| `src/styles/global.css` | Results ledger, idle rail, stable viewing frame, zoom overflow, responsive behavior |
| `scripts/adu-raagu.test.mjs` | required-entry, legacy compatibility, reducer guard, and dialog contracts |
| `scripts/device-preferences.test.mjs` | guide storage isolation and shared zoom normalization |
| `scripts/results-review.test.mjs` | simplified Results presentation while retaining review/export contracts |
| `scripts/solid-mushaf.test.mjs` | fit/zoom geometry, hitbox remeasurement, and protected page contracts |

No new backend, authentication, remote storage, OCR, audio, or AI component is
needed.

## 11. Verification matrix

### Domain and persistence

- enabled/assigned Adu / Raagu begins zero and unmarked;
- an explicit 0 is distinguishable from not entered;
- 0.5 remains the default step and configuration overrides still work;
- Finish cannot be dispatched around the requirement;
- a selected mark creates one event;
- existing saved sessions without a mark retain historical totals;
- reopening an older result requires explicit entry before saving a revision;
- preference/guide writes never touch competition revision, snapshots, records,
  or roster drafts.

### Keyboard and accessibility

- Settings guide is skippable, replayable, and returns focus;
- hidden guide steps are not focusable;
- zoom supports Arrow, Home, End, minus, plus, and Fit;
- Finish moves focus to the missing criterion and announces the requirement;
- state remains understandable without color;
- Results maintains one `h1`, tab semantics, pressed filters, and coherent
  heading order.

### Visual and responsive

- 1440×900, 1280×800, 1024×768, 768×1024, and 390×844;
- light and dark themes;
- empty, draft, live, complete, and closed idle states;
- Results with empty, Needs review, Ready, Finalized, conflict, stale, and 50+
  candidate states;
- Settings first visit, repeat visit, replay, recovery preview, and reset;
- Mushaf pages 1, 2, 199, 300, 601, 602, and 604 at minimum/Fit/maximum zoom;
- full and split page layouts;
- no page-level horizontal overflow;
- no default judge-view vertical scroll at Fit on supported desktop viewports;
- contained stage scrolling only when the judge intentionally enlarges beyond
  Fit.

### Automated gate

```powershell
npm.cmd test
npm.cmd run build
git diff --check
```

Run scoped source/diff review separately from unrelated working-tree changes.
Publish only the exact approved commit and retain a named rollback point for
each slice.

## 12. Protected behavior

The release must not change:

- KFGQPC V1 1405H source glyphs, page/line boundaries, or Quran data;
- word IDs, target IDs, aliases, hit evidence, or mistake locations;
- pinpoint category arithmetic or deduction amounts;
- configured Adu / Raagu allocation or step;
- completed result totals after every required input is present;
- source selection, finalization revisions, placements, workbooks, or CSV
  schemas;
- judge assignment ownership or active competition snapshots;
- sample/official data separation;
- backup/restore validation;
- the rule that AI is advisory and never assigns official marks.

## 13. Explicit non-goals

- phone judging dock implementation;
- mobile Focus mode beyond keeping the architecture compatible;
- Dhivehi translation or message-catalog refactor;
- new Results rankings or exports centre;
- audio recording, speech alignment, OCR, or mistake classification;
- cloud synchronization, accounts, permissions, or consent workflow;
- a new application-wide design system.

## 14. Completion definition

This initiative is complete only when permanent instructional clutter has been
removed, the first-use guide carries the necessary local-data explanation, Adu /
Raagu cannot be silently inferred, Finish resolves pending input in place, the
idle screen has a clear primary action, Results reads as a professional ledger,
and the Mushaf is centred and directly scalable without changing its printed
geometry.

As of this update, the durable easy-fixes release is implemented and
build-verified; browser visual approval remains. Required Adu / Raagu entry,
remaining Settings/Results composition, the stable Mushaf stage, direct zoom,
and phone work remain separate planned slices.

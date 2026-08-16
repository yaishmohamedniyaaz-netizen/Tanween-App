# Interface easy-fixes implementation plan

Status: implemented and build-verified; browser visual approval remains pending

Prepared: 16 August 2026

Parent plan: [`INTERFACE_SIMPLIFICATION_AND_JUDGING_FLOW_PLAN.md`](./INTERFACE_SIMPLIFICATION_AND_JUDGING_FLOW_PLAN.md)

## 1. Release decision

The first implementation release will complete three low-risk corrections:

1. simplify the permanent Settings framing and replace its repeated explanation
   with the real first-use guide;
2. simplify the Results heading and remove repeated sample/test disclaimers;
3. simplify and strengthen the idle competition panel without changing Mushaf
   geometry.

These are "easy" because they do not change scoring arithmetic, competition
records, Quran rendering, exports, or finalization. They are still production
changes, not temporary patches. Each correction must have its final ownership,
storage behavior, accessibility, responsive behavior, and regression coverage
in this release.

## 2. Explicitly deferred from this release

The following changes stay in separate reviewable passes:

- the connected Results status band and participant-ledger rebuild;
- the Analysis redesign;
- the new required Adu / Raagu input contract and Finish-dialog picker;
- the remaining-height Mushaf stage and centring repair;
- judge-screen zoom controls and expanded zoom range;
- phone judging and Focus mode.

Do not partially prepare these features with dormant UI, provisional flags, or
duplicate calculations. Shared infrastructure may be introduced only when this
release uses it immediately.

## 3. Durable implementation rules

- Remove redundant elements from the React structure; do not merely hide them
  with CSS.
- Keep local preference and guide state outside competition state and backups.
- Keep exactly one compact Sample signal in the persistent application header.
  Results and idle panels must not restate it.
- Keep full sample warnings only where they change the consequence of an action:
  loading/removing sample data and sample-labelled exports.
- Add an explicit idle workspace class instead of styling the panel through
  fragile descendant or content selectors.
- Use existing typography, color, spacing, border, and focus tokens. Do not add
  a parallel mini design system.
- Preserve light/dark behavior, logical CSS properties, and 44px primary touch
  targets.
- Update tests to assert the new contract. Do not delete an assertion merely
  because its old wording no longer exists.

## 4. Workstream A: Settings framing and first-use guide

### 4.1 Permanent Settings surface

The permanent header contains:

- Back to Mushaf;
- one `h1`, `Settings`;
- one quiet `Help` action that replays the guide.

Remove from the permanent surface:

- `On this device`;
- the green-dot `Saved automatically` element;
- `Personalize Tahqeeq without changing competition rules or official records`;
- repeated `Preferences` eyebrows;
- `These choices affect this judge device only`.

This pass does not flatten every Settings field or redesign the index/detail
layout. It removes the most visible artificial framing while leaving the sound
navigation and recovery architecture intact.

### 4.2 Guide ownership

Create a small Settings-specific guide module rather than embedding raw storage
calls throughout the component.

Recommended ownership:

- `src/lib/settingsGuide.ts` owns the versioned key, safe read, safe completion
  write, and missing-storage fallback;
- `src/components/SettingsGuide.tsx` owns the two-step presentation, focus, and
  navigation;
- `SettingsWorkspace.tsx` decides when Settings has opened, exposes Help/replay,
  and never writes competition state.

The guide key is `tahqeeq:guide.settings.v1`. Its value records only whether
version 1 was completed or skipped. It is not part of device preferences,
competition backup, restore, or reset.

### 4.3 Guide experience

Step 1: **Your view, saved here**

- theme, Mushaf layout, scale, and panel position save in this browser;
- these view choices do not change competition rules.

Step 2: **Keep a backup of competition data**

- competition data is currently stored in this browser;
- download a backup before clearing site data or moving browsers.

Behavior:

- open after the Settings page has rendered on its first visit;
- do not open at app launch or block the Mushaf;
- wide view: anchored, contained popover associated with Help;
- narrow view: modal bottom sheet;
- controls: Skip, Back, Next, Done;
- no automatic advancement;
- Escape closes and records dismissal in the same way as Skip;
- replay never changes completion state or preferences;
- close returns focus to Help when Help initiated replay, otherwise to the
  Settings heading or first stable Settings control;
- if local storage is unavailable, Settings remains usable and the guide is
  shown once for that mounted visit only;
- clearing site data/local storage makes it appear again; clearing HTTP cache
  alone is not promised to do so.

### 4.4 Settings acceptance criteria

- None of the five removed phrases/elements remains in the permanent Settings
  DOM.
- First visit shows step 1 only after Settings exists onscreen.
- Skip and Done prevent automatic display on the next visit.
- Help reopens the guide without changing any setting.
- Back/Next/Escape and focus return work by keyboard.
- Hidden steps are not focusable or announced as visible content.
- Storage read/write failure does not crash or disable Settings.
- Backup, restore preview, confirmation, reset, mobile index/detail navigation,
  theme, layout, scale, and rail-side controls behave exactly as before.

## 5. Workstream B: Results framing and sample-language reduction

### 5.1 Results header

Replace the current three-level framing with:

- one `h1`: `Results`;
- one compact context line containing competition name, optional edition, and
  lifecycle status.

Remove:

- the `Results` eyebrow;
- the duplicate `Results & review` title;
- the overview paragraph;
- `Test mode` from the Results context;
- the complete `sample-records-notice` banner.

The Review and Analysis tabs remain unchanged in this release. This is a clean
framing correction, not the participant-ledger redesign.

### 5.2 One Sample signal

The persistent application header becomes the single ordinary-view indicator:

- use the compact word `Sample`, combined with the lifecycle where useful;
- do not use explanatory sentences or a colored warning panel;
- do not repeat Sample/Test mode in Results or the idle panel.

Competition setup keeps the detailed load/remove explanation because those
actions can create or delete sample records. Export action names and filenames
remain explicitly sample-labelled. Sample and official data remain separated.

### 5.3 Results acceptance criteria

- The visible Results page has one `h1` and no duplicate page description.
- The active competition name, optional edition, and lifecycle remain visible.
- Sample mode is identifiable once in the persistent header but is not repeated
  in the Results body.
- Review/Analysis tab behavior, counts, filters, pagination, source selection,
  finalization, audit history, and exports are unchanged.
- Empty, sample, official, draft, live, and closed contexts remain
  understandable without the removed banner.
- Deleted markup leaves no empty grid column, reserved banner gap, or orphaned
  CSS selector affecting layout.

## 6. Workstream C: idle competition panel

### 6.1 Stable structural hook

`App.tsx` adds an explicit workspace mode class when there is no active judging
session, for example `workspace is-idle`. The class is based on application
state, not text content or the existence of a particular child node.

This hook is final infrastructure for the idle layout. It must not change the
active judging workspace or pre-empt the later remaining-height Mushaf stage.

### 6.2 Content hierarchy

No competition:

- title: `The Mushaf is ready`;
- one short sentence at most;
- primary action: `Prepare competition`.

Draft:

- competition name as title;
- lifecycle appears only in the persistent header;
- primary action: `Continue setup`.

Live:

- competition name as title;
- judge name/categories, waiting/finished counts, and next participant;
- primary action: `Prepare next reciter`;
- quiet secondary action: `View competition setup`.

Live complete and closed states retain their necessary completion/result route,
but lose fictional-data and Test-mode explanations.

### 6.3 Visual correction

- Increase the wide-screen idle rail to a deliberate 350-370px range using the
  explicit idle class.
- Give the title and primary action clear dominance.
- Convert role and progress card-within-card treatments to aligned rows and
  rules.
- Remove the uppercase state eyebrow from the panel.
- Keep queue numbers tabular and easy to scan.
- Keep the mobile panel single-column and avoid increasing document width.
- Do not change Mushaf size, centring, overflow, or zoom in this release.

### 6.4 Idle acceptance criteria

- Every competition lifecycle still exposes a correct next action.
- Sample/Test wording does not appear in the idle panel.
- Assignment, queue counts, next participant, empty restored roster warning,
  and completion state remain available when applicable.
- Idle-only CSS cannot affect an active recitation.
- No horizontal overflow appears at 390px or 1280px.
- Keyboard focus order follows the visible action order.

## 7. File-level implementation map

| File | Final responsibility in this release |
| --- | --- |
| `src/lib/settingsGuide.ts` | versioned guide-state adapter with safe storage behavior |
| `src/components/SettingsGuide.tsx` | accessible two-step guide UI |
| `src/components/SettingsWorkspace.tsx` | reduced header, Help/replay, and guide orchestration |
| `src/styles/settings.css` | guide/popover/sheet styling and reduced Settings framing |
| `src/components/Header.tsx` | single compact Sample lifecycle signal |
| `src/components/RecordsView.tsx` | one Results title/context and removal of repeated sample notice |
| `src/components/CompetitionIdlePanel.tsx` | concise state-specific hierarchy |
| `src/App.tsx` | explicit idle workspace mode class |
| `src/styles/global.css` | Results-header cleanup and idle-only layout rules |
| `scripts/settings-guide.test.mjs` | guide storage, first visit, replay, and source contract |
| `scripts/competition-workspace.test.mjs` | single Sample signal and idle-state contract |
| `scripts/results-review.test.mjs` | Results framing plus unchanged review/export contract |
| `package.json` | include the new focused test in the standard suite |

If existing component boundaries make one new guide component unnecessary,
keeping the presentation inside `SettingsWorkspace.tsx` is acceptable only if
the storage adapter remains isolated and the component stays readable. Do not
create abstraction solely to satisfy this table.

## 8. Implementation and review order

1. Capture baseline screenshots and run the scoped tests.
2. Add and test the guide-state adapter.
3. Implement the guide and simplify the Settings header.
4. Establish the one-Sample-signal contract in Header, Results, and idle.
5. Simplify the Results header and remove its banner/CSS residue.
6. Add the idle workspace class and revise the idle panel hierarchy.
7. Review light/dark and responsive states together so spacing is tuned as one
   composition rather than three unrelated patches.
8. Run scoped tests, the full suite, production build, and diff validation.
9. Review the final diff before commit and publish the verified build for final
   browser approval.

## 9. Visual review matrix

Review at minimum:

- 1440 x 900 and 1280 x 800 desktop;
- 768 x 1024 tablet;
- 390 x 844 phone;
- light and dark themes;
- Settings first visit, step 2, replay, and ordinary repeat visit;
- Results with no competition, official data, and sample data;
- idle no-competition, draft, live-next-participant, live-complete, restored
  empty roster, and closed states.

The review must check hierarchy, alignment, focus visibility, long competition
and participant names, no clipped text, and no empty space left by removed UI.
This release is not approved from a single happy-path screenshot.

## 10. Verification gate

Scoped checks:

```powershell
node --test --experimental-strip-types scripts/settings-guide.test.mjs
node --test --experimental-strip-types scripts/competition-workspace.test.mjs
node --test --experimental-strip-types scripts/results-review.test.mjs
npm.cmd test
npm.cmd run build
git diff --check
```

Final diff review must confirm:

- no scoring, reducer, ledger, Quran source, export, or backup schema changed;
- no redundant copy was hidden instead of removed;
- no dormant Adu / Raagu or zoom implementation was added;
- guide state is not included in competition backups;
- the one Sample signal and consequential-action warnings remain accurate;
- unrelated working-tree files are not staged.

## 11. Completion definition

This first release is complete when Settings teaches browser-local behavior once
instead of repeating it forever, Results opens with one clear identity, sample
status is signalled once rather than explained throughout the app, and the idle
panel has a confident hierarchy without touching Mushaf geometry.

Passing tests alone is insufficient for final visual sign-off: the deployed
release must still be inspected across the visual review matrix.

Implementation evidence, 16 August 2026:

- all 244 repository tests passed, including the new Settings-guide contract;
- the production Sites build passed;
- scoped whitespace and source-contract checks passed;
- scoring, reducer, Quran, export, backup, and competition schemas were not
  changed.

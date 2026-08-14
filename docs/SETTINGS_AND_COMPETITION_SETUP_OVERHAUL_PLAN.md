# Settings and Competition Setup Overhaul V1

Status: Implemented and visually verified
Prepared: 2026-08-14
Implemented: 2026-08-15
Baseline: `b29d567` (`feat: improve participant intake workflow`)
Rollback: `checkpoint/pre-settings-overhaul-v1`
Implementation: Complete; commit recorded in the repository history

## 1. Executive decision

The missing settings overhaul should be recovered as two deliberately separate
products inside Tahqeeq:

1. **Settings** controls this device and this installation: appearance, Mushaf
   view, judging workspace layout, and local data recovery.
2. **Competition setup** prepares one competition: identity, categories,
   participants, marks, judges, question rules, review, and launch.

This separation is already established in
`docs/QUESTION_BANK_PREPARATION_PLAN.md` and should now become visible in the
interface. Competition data must not be presented as ordinary preferences, and
device preferences must never modify a competition revision or live snapshot.

The next update should be a coherent settings and setup release, not a collection
of unrelated card restyles. It will preserve the participant onboarding work that
has already shipped, simplify the parts around it, and give the very large question
builder its own workspace.

## 2. What was recovered

The earlier discussion asked for a broad settings rethink, then implementation
narrowed into participant onboarding. The following intentions are recovered:

- reduce the visual prominence of participant competition numbers and lead with
  participant names;
- group participants by **Category**, with collapsible groups and a participant
  count written plainly;
- make Excel/CSV the practical bulk-entry path;
- make manual entry and paste-from-spreadsheet faster;
- use **Category** everywhere user-facing instead of “Division”;
- use **Muqarrar start** instead of the shorter “Muqarrar” label;
- retain **Feshey kolhu**, **Nimey kolhu**, and no value as an explicit three-state
  choice, not a Boolean;
- improve age/category selection and the overall competition-setup flow;
- rethink the whole Settings page and its information architecture;
- keep OCR/photo extraction out of the immediate update.

Recent commits implemented the participant slice:

- `a1d2f32` — recoverable participant roster onboarding;
- `0ea3878` — Category language and collapsible participant groups;
- `b29d567` — participant intake V4.

They did not implement a standalone Settings workspace, navigation cleanup, a
unified save model, the Categories editor redesign, or the Question Builder
extraction. Those are the recovered next update.

One phrase in the earlier transcript sounded like “IS selection.” The most likely
meaning is **age/category selection**, because it was discussed with participant
onboarding. The plan proceeds with that interpretation but keeps the exact label as
an implementation-review item instead of silently inventing a new domain concept.

## 3. Current-state findings

### 3.1 Navigation mixes four different jobs

The header overflow currently contains:

- Page view;
- Judge panel side;
- Competition setup;
- Print result sheet;
- session and official exports;
- backup and restore.

This makes a small menu function as preferences, competition administration,
reporting, and data recovery at the same time. It is difficult to scan and leaves
no clear home for additional settings.

### 3.2 Save behavior is inconsistent

Competition details, marks, and the judging panel use local drafts with an explicit
Save action. Categories, question rules, and participant defaults dispatch changes
immediately. Marks also dispatch one action per criterion when saved. The result is
an interface in which “changing a control” has different persistence semantics on
adjacent tasks, and some small edits can increment the setup revision repeatedly.

### 3.3 The task shell is sound, but several tasks are not

The nonlinear, resumable task model is appropriate, but the current desktop
list-detail presentation is not the strongest use of it. The recovered Claude
artifact demonstrates a more compact single-column completion checklist: selecting
one task expands its controls in place and collapses the previously open task back
to a checked/unchecked summary row. The individual task content also needs
restructuring:

| Task | Current issue | Decision |
|---|---|---|
| Competition details | clear but visually sparse | retain and polish |
| Categories | all category forms expanded; about 1,278 px in the audited sample | replace with summary list plus one editor |
| Participants | useful V4 workflow, but defaults dominate setup | keep editor; move defaults into a compact disclosure |
| Marks | generally clean | retain; unify save and validation |
| Judging panel | usable but dense in custom mode | retain presets; edit one logical unit at a time |
| Question rules | saves immediately | use local draft and explicit Save |
| Draft questions | embedded page measured about 11,495 px with 326 buttons | move to a dedicated full workspace |
| Review and start | useful summary, weak issue navigation | add linked error summary and clearer readiness hierarchy |

At widths below 900 px the task list becomes a horizontal scrolling strip. That
keeps every task visible but is a weak navigation model for nine labeled tasks and
does not provide the clean “index, then detail” behavior expected on a phone.

### 3.4 Preferences are fragmented

Theme is owned by `ThemeToggle.tsx`. Page zoom, page layout, and judge rail side
are separate local-storage values in `App.tsx` and are edited in nested overflow
panels. There is no single preference schema, migration, reset action, or clear
statement that these choices apply only to the current device.

### 3.5 The underlying product boundaries are worth protecting

The current competition lifecycle already prevents structural edits after launch
and freezes a live snapshot. The overhaul must preserve this behavior. It should
not merge device preferences into `JudgingState`, change scoring semantics, or
rewrite stored competition data for a visual refactor.

## 4. Research translated into decisions

The plan uses current, public design-system guidance as constraints rather than
copying the appearance of another product.

| Evidence | Relevant guidance | Tahqeeq decision |
|---|---|---|
| [GOV.UK: Complete multiple tasks](https://design-system.service.gov.uk/patterns/complete-multiple-tasks/) and [Task list](https://design-system.service.gov.uk/components/task-list/) | task lists suit longer transactions that can be completed across sessions; use groups and meaningful statuses | retain task completion, grouping, free task order, and durable progress |
| [USWDS: Step indicator](https://designsystem.digital.gov/components/step-indicator/) | a step indicator is for a linear process | do not turn competition setup into a forced wizard or “Step 3 of 8” flow |
| [W3C: Multi-page forms](https://www.w3.org/WAI/tutorials/forms/multi-page/) | divide long forms into logical stages, communicate progress, and allow review | keep tasks small and let completed tasks be revisited |
| [GOV.UK: Check answers](https://design-system.service.gov.uk/patterns/check-answers/) | show a review before submission and preserve entered data when changing an answer | strengthen Review and start with direct Change links and no lost drafts |
| [W3C APG: Accordion](https://www.w3.org/WAI/ARIA/apg/patterns/accordion/) | an accordion is a vertical set of headings that reveals sections; one-open-at-a-time behavior is supported when state is exposed correctly | implement the recovered completion checklist as a semantic, one-open-at-a-time accordion |
| [GOV.UK: Accordion](https://design-system.service.gov.uk/components/accordion/) and [USWDS: Accordion](https://designsystem.digital.gov/components/accordion/) | accordions help familiar users compare related sections in limited space, but hidden content adds interaction cost and should not contain an entire long service | use inline expansion for compact setup tasks; route large participant/question work to dedicated pages and keep meaningful summaries visible |
| [Material 3: Canonical layout examples](https://m3.material.io/foundations/layout/canonical-examples/overview) | list-detail is a canonical adaptive layout when users explore a list of entities | reserve list-detail for Settings navigation and entity editors, not the main completion checklist |
| [Primer: Layout](https://primer.style/product/getting-started/foundations/layout/) and [Navigation](https://www.primer.style/product/ui-patterns/navigation/) | split layouts suit settings and list-detail pages; compact layouts should not merely stack a long sidebar above content | use a stable desktop settings rail and a mobile settings index with a Back action |
| [Primer: Saving](https://primer.style/product/ui-patterns/saving/) | do not mix auto-save and explicit save in the same form; warn before abandoning unsaved work | competition tasks use explicit Save; device preferences use one clearly announced auto-save model |
| [Primer: Forms](https://primer.style/product/ui-patterns/forms/) and [Carbon: Forms](https://carbondesignsystem.com/patterns/forms-pattern/) | group related controls, keep a predictable order, and disclose dependent controls only when relevant | use vertical logical groups and reveal Juz/Surah range fields only after the corresponding portion type is selected |
| [Primer: Dialog guidelines](https://primer.style/product/components/dialog/guidelines/) | dialogs are for one simple context, not whole pages; form dialogs become full-screen on narrow viewports | use pages/workspaces for categories, participants, and questions; reserve dialogs for short confirmations |
| [GOV.UK: File upload](https://design-system.service.gov.uk/components/file-upload/) | upload only when it is needed, retain a real file input, support drag/drop as an enhancement, and give exact errors | keep Excel/CSV upload explicit and accessible; no OCR or photo entry |
| [GOV.UK: Error summary](https://design-system.service.gov.uk/components/error-summary/) | focus the summary and link each message to its field | task validation and final review expose actionable linked errors |
| [WCAG 2.2: Target Size](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum) | pointer targets should be at least 24 by 24 CSS px or have adequate spacing | target 40–44 px controls throughout the settings/setup UI, exceeding the minimum |
| [WCAG 2.2: Focus Not Obscured](https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum) and [Reflow](https://www.w3.org/WAI/WCAG22/Understanding/reflow) | sticky UI must not obscure keyboard focus and content must reflow without two-dimensional scrolling | sticky actions require measured clearance; compact layouts cannot rely on horizontal task scrolling |
| [Material 3: Interaction states](https://m3.material.io/foundations/interaction/states/overview) | enabled, hover, focus, pressed, selected, and disabled states need consistent visual communication | define every interactive state once and use it across task rows, radio cards, and buttons |
| [The Futur: Typography fundamentals](https://thefutur.com/content/learn-typography) and [Clarity in communication](https://www.thefutur.com/content/clarity-in-communication-a-designer-s-role) | legibility, alignment, contrast, spacing, scale, proportion, balance, and plain audience language create hierarchy | pursue an editorial, human hierarchy without decorative Web3 clutter or unfamiliar labels |

## 5. Target information architecture

```text
Tahqeeq
├── Judge
├── Records
│   ├── Results
│   ├── Print current result
│   └── Official/session exports
├── Competition setup
│   ├── Competition
│   │   ├── Details
│   │   ├── Categories
│   │   └── Participants → dedicated participant workspace
│   ├── Judging
│   │   ├── Marks and criteria
│   │   └── Judging panel
│   ├── Questions
│   │   ├── Question rules
│   │   └── Question set → dedicated question workspace
│   └── Launch
│       └── Review and start
└── Settings
    ├── Appearance
    ├── Mushaf and judging workspace
    └── Data and recovery
```

### 5.1 Header and overflow menu

The header should keep only frequent, context-aware actions:

- Judge/Records view switch;
- competition state/name chip, opening Competition setup;
- theme quick toggle, because it is a useful accessibility shortcut and mirrors
  the full setting;
- a compact More menu containing **Settings** and only actions relevant to the
  current view.

Move actions as follows:

| Current action | New home |
|---|---|
| Page view | Settings → Mushaf view |
| Judge panel side | Settings → Judging workspace |
| Competition setup | competition state/name chip and More menu |
| Print result sheet | Records or the active result context |
| Export session JSON | Records → Exports |
| Export official CSV | Records → Exports |
| Download backup | Settings → Data and recovery |
| Restore backup | Settings → Data and recovery |

The More menu should be a launch point, not a miniature settings application.

## 6. Settings workspace

### 6.1 Shell

Desktop and wide tablet:

- maximum page width: 1,180–1,240 px;
- 252–272 px navigation rail;
- 16–24 px rail/content gap;
- main setting column capped around 760–840 px so controls do not stretch;
- title, one-sentence scope note, and a small “Saved on this device” status;
- no card around every row; use section headings, dividers, and restrained surfaces.

Compact screens:

- first show a Settings index with rows for Appearance, Mushaf and judging
  workspace, and Data and recovery;
- selecting a row opens a full-width detail page with a clear Back to settings
  action;
- use normal document scrolling;
- do not stack the entire desktop navigation above the form;
- do not introduce horizontal navigation scrolling.

### 6.2 Appearance

Controls:

- Theme: Light / Dark, using the current two-state behavior;
- optional **Use device theme** is deferred until it can be migrated and tested
  without changing the current default unexpectedly;
- preview swatches may communicate selection, but the label remains primary;
- “Reset appearance” restores the documented default.

Keep the header theme toggle. Both surfaces write through the same preference
adapter so they cannot drift.

### 6.3 Mushaf and judging workspace

Controls:

- Page view: Full page / Split page;
- Page scale: existing supported range and increments, with Reset to 100%;
- Judge panel position: Left / Right;
- one short live preview diagram may show layout direction without rendering a
  miniature Mushaf;
- each label states that the preference applies on this device.

Every control auto-saves. The section header should say **Saved automatically on
this device**, and a transient non-blocking Saved status should confirm writes.
There must be no Save button on these pages.

### 6.4 Data and recovery

Sections:

1. **Backup this device**
   - Download backup;
   - show what is included in one sentence;
   - show the last successful download time only if it is locally reliable.
2. **Restore from backup**
   - real file input plus optional drag/drop enhancement;
   - accepted format and size hint;
   - parse and validate before replacement;
   - preview the competition name, edition, participant count, record count, and
     backup timestamp;
   - require an explicit Restore confirmation;
   - never treat choosing a file as confirmation.
3. **Reset preferences**
   - resets device preferences only;
   - does not remove competitions, records, participants, or drafts;
   - use a precise confirmation rather than a generic `window.confirm`.

Official CSV and session exports remain with Records because they are output from
competition activity, not application settings.

### 6.5 Preference data contract

Add a small typed device-preference boundary, for example:

```ts
type DevicePreferencesV1 = {
  version: 1;
  theme: "light" | "dark";
  mushafLayout: "full" | "split";
  mushafZoom: number;
  judgeRailSide: "left" | "right";
};
```

Requirements:

- keep it outside competition state;
- normalize values on read;
- migrate the existing theme, zoom, layout, and rail-side keys idempotently;
- preserve current values during migration;
- do not delete legacy keys until the new object has been written and read back;
- expose one adapter/hook so Header, Settings, and App use the same state;
- a preference write must not change `setupRevision`, a roster draft, competition
  timestamps, or a live snapshot.

## 7. Competition Setup V2

### 7.1 Use the recovered completion-checklist accordion

Competition preparation is nonlinear: an organizer may add categories, begin a
roster, return to marks, then finish judge assignments. A forced wizard would make
this harder. Keep task completion and free task order, but replace the two-pane rail
with the recovered Claude artifact's Candidate B pattern:

- one centered column;
- one compact row per setup task;
- a saved, valid task collapses to a check, title, and meaningful value summary;
- selecting a row expands that task's controls directly below its heading;
- selecting another row collapses the previous task and expands the new one;
- only one setup task is expanded at a time;
- completed tasks can be reopened without losing their completed state;
- incomplete edits are protected by Save/Cancel and the dirty-navigation guard;
- the final Review and start task is a real accordion task, not a permanently
  exposed Start button.

This is a completion checklist with accordion behavior, not a general-purpose
content accordion and not a linear stepper.

Task row anatomy:

- concise title;
- one-line hint only when useful;
- status aligned consistently on the trailing edge;
- keep the status vocabulary small: Not started, In progress, Complete, and
  Locked; show validation errors as task attention messages and describe optional
  work in the task copy instead of inventing another status;
- active state must remain distinct from complete state;
- keyboard focus must remain visible independently of hover/selection.
- the full row is the expansion target and is at least 44 px tall;
- the header button exposes `aria-expanded` and `aria-controls`;
- screen-reader naming includes task name, completion state, and summary without
  reading decorative check marks as meaningless characters.

Recommended labels:

| Group | Task | Status basis |
|---|---|---|
| Competition | Details | valid name and edition saved |
| Competition | Categories | at least one valid saved Category |
| Competition | Participants | valid applied participant list |
| Judging | Marks and criteria | exactly 100 enabled marks and valid increments |
| Judging | Judging panel | every enabled criterion has exactly one owner |
| Questions | Question rules | valid saved rule set |
| Questions | Question set | optional for manual mode; count/validation for Tahqeeq set |
| Launch | Review and start | all required tasks valid |

### 7.2 Desktop and compact behavior

Desktop:

- center the checklist in a column around 760–880 px;
- collapsed rows remain compact and aligned;
- the expanded panel uses the full checklist width but caps text/form lines for
  readability;
- the document scrolls normally; do not introduce a nested setup scroll box;
- dedicated participant/question workspaces may use the full available width.

Compact:

- use the same one-column accordion instead of changing to a different mental model;
- keep row targets at least 44 px and let summaries wrap to a second line;
- expanded forms become single-column and use normal document scrolling;
- Save collapses the current task to its updated summary; an optional **Save and
  open next incomplete task** action may be tested, but must not force sequence;
- large participant and question workspaces still open as full-screen subpages with
  a clear Back to competition setup action;
- no horizontal strip of tasks.

The same checklist interaction across desktop and compact screens is a key
advantage over the previous rail/index split: it reduces implementation and
learning differences while still reflowing cleanly.

### 7.3 Corrections required beyond Claude Candidate B

The artifact is the correct direction, not a production specification. Its own
runtime comparison measured Candidate B at 400 px and 44 visible words at rest,
versus 1,073 px and 113 words for the stripped two-pane candidate. It also exposes
four issues that this implementation must correct:

1. Its collapsed rows are 40 px high. Tahqeeq will use at least 44 px and preserve
   adequate separation from controls inside the expanded panel.
2. Its collapsed Categories and Judging panel rows hide two important review facts.
   Tahqeeq will show a concise, wrapping summary or a structured secondary line,
   while the final Review task exposes the full evidence.
3. Its Start action is always visible below the checklist. Tahqeeq will place Start
   inside **Review and start**, after readiness issues and freeze consequences.
4. The artifact uses miniature placeholder controls. Production Categories,
   Participants, and Questions are much larger. Categories gets a summary plus one
   editor; Participants and Question set use dedicated workspaces rather than
   injecting their full tools into the accordion.

### 7.4 Unified competition save model

All competition-owned forms use the same pattern:

1. load a local task draft from the saved competition;
2. edit without mutating official state;
3. validate on blur and on submit;
4. Save once for the task;
5. Cancel restores the saved task state;
6. leaving with unsaved changes asks whether to discard or remain;
7. one save produces one logical state update and one revision bump.

Do not put an auto-saving competition field on the same task page as an explicit
Save button. Participant roster drafts are a documented exception because they are
recoverable working data; the final **Apply participant list** remains explicit.

For marks, replace the current loop of per-criterion `SET_CONFIG` dispatches with
one validated atomic score-configuration action. For categories, participant
defaults, and question policy, stop dispatching on each control change.

### 7.5 Dirty, error, and saved states

- show a small Unsaved changes status in the task header;
- Save is disabled only when there is nothing to save or the task is invalid;
- errors sit beside their fields and are summarized at the task top after submit;
- error-summary links focus the exact control;
- successful Save shows a restrained confirmation and updates the task-list status;
- do not use toast-only validation;
- live and closed competitions render the same task pages as read-only snapshots,
  not a different visual system.

## 8. Categories redesign

### 8.1 Replace stacked forms with a summary list

The default Categories page should show one row per Category:

- Category display name;
- age group;
- Hifz or Baliagen;
- Quran portion summary;
- participant count, if any;
- Edit action;
- trailing status/error indicator.

Only one category editor is open at a time. **Add Category** opens a blank editor.
**Duplicate** creates a draft from an existing Category but does not save until its
uniqueness errors are resolved.

This preserves overview while eliminating the long stack of repeated controls.

### 8.2 Category editor field order

Use one vertical form:

1. Age group;
2. Recitation type: Hifz / Baliagen;
3. Quran portion: Full Quran / Juz range / Surah range;
4. conditional range fields;
5. generated Category name preview;
6. optional custom display-name override under Advanced.

Age-group entry:

- select from age groups already used in this competition;
- offer **Add new age group** with free text;
- do not force a global predefined taxonomy in this release;
- trim and compare choices case-insensitively while preserving entered display
  casing;
- expose the selected age and recitation type clearly in participant entry.

Category name:

- generate a clean default from age group and recitation type;
- allow a custom name only when needed;
- never show internal Category IDs;
- use **Category** everywhere user-facing, including templates and exports;
- an internal `CompetitionDivision` type may remain during this release if renaming
  it would create unrelated migration risk, but no “Division” text may escape into
  the UI, spreadsheet, error messages, or accessible labels.

### 8.3 Validation and dependent data

Validate before save:

- age group required;
- valid recitation type;
- Juz range between 1 and 30 with start not after end;
- Surah range between 1 and 114 with start not after end;
- no duplicate effective age-group + recitation-type combination unless the domain
  rule explicitly permits it;
- display name required and unique after normalization.

Removing or materially changing a Category must first show impact:

- number of participants assigned;
- number of prepared questions/drafts that reference it;
- whether the competition is still editable;
- exact consequence of continuing.

If dependencies exist, prefer reassignment or cancellation. Do not silently orphan
participants or questions.

## 9. Participants in setup

The participant editor already supports manual entry, spreadsheet paste, Excel/CSV
upload, validation, review, and explicit apply. Preserve it.

The Competition setup task becomes a concise summary:

- applied participant count;
- count by Category in a collapsible summary;
- numbering mode;
- draft-resume notice when present;
- primary action: Open participant list / Resume draft;
- secondary action: Download template.

Move **Participant defaults** into an initially collapsed **Entry defaults** section
or into a small settings panel inside the participant workspace. The recommended
choice is inside the participant workspace because the defaults affect entry, not
competition readiness. The setup summary should only display the current default.

Retain these domain decisions:

- participant name leads every participant row/card;
- competition number is secondary and uses the clean numeric format already
  selected;
- Category groups can collapse and expose a plain participant count;
- **Muqarrar start** is the full label;
- **Feshey kolhu**, **Nimey kolhu**, and **Not set** are explicit enum choices;
- Excel and CSV remain the bulk path;
- OCR/photo extraction is out of scope.

File-import acceptance:

- real file input works with keyboard and assistive technology;
- drag/drop is an enhancement, not the only path;
- accepted file types are stated before selection;
- errors identify wrong type, empty file, changed template, missing required
  headers, and invalid rows precisely;
- imported data always enters review before replacing the applied roster.

## 10. Marks and judging panel

### 10.1 Marks and criteria

Preserve the current criterion content and competition semantics. Refine the task:

- one aligned row per criterion;
- enabled state, total marks, and increment have stable columns;
- numeric controls center their values and use tabular numerals;
- the total of 100 remains visible in the task header or a non-obscuring summary;
- Adu/Raagu defaults to 0.5 increment, while every criterion’s increment remains
  configurable as allowed by competition rules;
- one Save action commits the complete validated configuration atomically;
- show the effect on judging-panel assignments before disabling a criterion.

This plan does not redesign the live Adu/Raagu mark picker again. It protects the
whole-mark chips and half-mark gesture work that already shipped.

### 10.2 Judging panel

- keep the useful presets first;
- summarize each seat as judge label/name plus owned criteria;
- reveal the detailed assignment matrix only for custom configuration;
- edit one seat or one assignment group at a time where practical;
- prevent an enabled criterion from having zero owners;
- preserve the current single-owner foundation rule;
- save the whole panel atomically;
- keep the current-device judge-seat selection visibly separate from the official
  competition panel, because it is a device assignment rather than a scoring rule.

## 11. Questions

### 11.1 Question rules

Keep the existing manual/Tahqeeq-set distinction and fixed ending rule. Change only
the interaction model:

- edit in a local draft;
- save explicitly;
- preserve the local QPC data boundary;
- keep AI, OCR, and paid APIs out of this release;
- show Question set as Optional when mode is Manual.

### 11.2 Dedicated question workspace

The current Draft questions task is too large for the setup accordion panel. Move
it to a dedicated full-width workspace, opened from the Question set task.

The setup task itself should show:

- mode;
- prepared draft count;
- valid/needs-review count;
- last local edit time if reliable;
- Open question workspace action.

The dedicated workspace should retain exact Mushaf preview and question logic but
gain a stable page header, Back to competition setup, and responsive regions. This
is an extraction, not permission to change Quran data, question-range semantics, or
official approval rules.

## 12. Review and start

The final review page is the point of confidence, not another editable form.

Order:

1. readiness heading and status;
2. focused error summary when required items remain;
3. grouped summary rows with Change links;
4. optional-item explanation;
5. official freeze explanation;
6. Start competition action.

Requirements:

- each error links to the responsible task and, where possible, field;
- summary rows use concise values rather than semicolon-heavy paragraphs;
- Category and participant counts are scannable;
- the start action cannot obscure content or focused controls;
- changing a reviewed task preserves all other saved data;
- start still freezes roster, categories, panel, marks, question rules, and Mushaf
  data version;
- live/closed status and current lifecycle guards remain unchanged.

## 13. Visual direction

### 13.1 Character

The target is precise, calm, editorial, and unmistakably human. Use the spacing and
hierarchy discipline associated with strong studios, but do not borrow generic
Web3 decoration such as neon gradients, glass panels, excessive glow, floating
cards, or ornamental motion. Tahqeeq is an official judging tool; confidence and
legibility outrank novelty.

### 13.2 Hierarchy

- page title: 26–30 px, compact tracking;
- section title: 16–20 px;
- body/control text: 13–14 px where the existing scale permits;
- metadata/status: 11–12 px, never the only carrier of essential meaning;
- labels remain outside inputs;
- use tabular numerals for marks, counts, ranges, and competition numbers;
- use one strong heading per view and reduce repeated eyebrow labels.

### 13.3 Spacing and surfaces

- base spacing scale: 4, 8, 12, 16, 24, 32, 48;
- ordinary form-group gap: 20–24 px;
- related control gap: 8–12 px;
- section separation: 28–40 px;
- one consistent small/medium radius family;
- borders define structure; shadows are reserved for true elevation;
- avoid nesting bordered cards inside bordered cards;
- use whitespace and dividers before adding another container.

### 13.4 Color and states

- keep the current near-monochrome light/dark foundation;
- reserve accent color for selected/primary states;
- use semantic success, warning, and danger colors only where meaning requires;
- selected, complete, focused, disabled, and locked states must remain visually
  different without relying on color alone;
- focus ring remains visible in both themes;
- disabled text must still be readable, while locked controls remain clearly
  inoperable.

### 13.5 Motion

- 120–180 ms for small state transitions;
- 160–220 ms for accordion expansion and subpage entry;
- no motion needed for ordinary form value changes;
- honor `prefers-reduced-motion`;
- collapsible summaries retain content position and never animate height so slowly
  that entry feels blocked.

## 14. Responsive specification

| Range | Settings | Competition setup | Dedicated workspaces |
|---|---|---|---|
| 1080 px and above | persistent nav + detail | centered one-open checklist accordion | full-width bounded workspace |
| 780–1079 px | narrower nav + detail where readable | same checklist with reduced gutters | reduced gutters, same structure |
| below 780 px | index page then full detail | same single-column checklist; large tools open as subpages | single-column controls and normal document scroll |

Required behavior at every size:

- no page-level horizontal scrollbar;
- no two-dimensional form scrolling;
- no content hidden under sticky actions;
- visible Back path from extracted workspaces;
- long Category names wrap safely;
- error summary and target field remain reachable;
- file upload and action controls fit at 320 CSS px;
- on-screen keyboard does not cover the current input/action on supported mobile
  browsers;
- dark and light themes use the same geometry.

## 15. Implementation architecture

The final names may adapt to repository conventions, but responsibilities should
separate approximately as follows:

```text
src/
├── components/
│   ├── SettingsWorkspace.tsx
│   ├── settings/
│   │   ├── SettingsIndex.tsx
│   │   ├── AppearanceSettings.tsx
│   │   ├── WorkspaceSettings.tsx
│   │   └── DataRecoverySettings.tsx
│   ├── competition-setup/
│   │   ├── CompetitionSetupShell.tsx
│   │   ├── SetupChecklist.tsx
│   │   ├── SetupChecklistItem.tsx
│   │   ├── CompetitionDetailsTask.tsx
│   │   ├── CategoriesTask.tsx
│   │   ├── CategoryEditor.tsx
│   │   ├── ParticipantSummaryTask.tsx
│   │   ├── MarksTask.tsx
│   │   ├── JudgingPanelTask.tsx
│   │   ├── QuestionRulesTask.tsx
│   │   └── ReviewStartTask.tsx
│   └── QuestionPreparationWorkspace.tsx
├── lib/
│   ├── devicePreferences.ts
│   └── categoryValidation.ts
└── styles/
    ├── settings.css
    └── competition-setup.css
```

This split is justified because `CompetitionSetup.tsx` is already 879 lines and
`global.css` is about 7,868 lines. The update should reduce those concentration
points without refactoring unrelated judging or Mushaf code.

App-level view state should add Settings and Question Preparation as explicit views
or route-like states. Settings compact index/detail navigation and extracted
participant/question workspaces must have browser-history semantics. A lightweight
History API solution is acceptable; adding a routing dependency is not required
solely for this update.

## 16. Implementation passes and rollback gates

### Pass 0 — checkpoint and visual record

- create a rollback branch/tag from `b29d567` before UI edits;
- capture current desktop and mobile screenshots for Header, Categories,
  Participants, Marks, Question set, Review, and overflow menu;
- record local-storage preference values and a representative draft/live/closed
  competition fixture;
- no data-contract change in this pass.

Gate: current build and tests pass, screenshots are archived, and rollback commit is
named in the working log.

### Pass 1 — preference boundary and navigation shell

- add normalized `DevicePreferencesV1` with legacy-key migration;
- add Settings as a real app view;
- build the Settings index/detail shell;
- connect current theme, zoom, page layout, and panel-side controls;
- prove preference changes do not touch competition revision/state.

Gate: preference migration tests, desktop/compact navigation screenshots, and no
competition-state diff after preference changes.

### Pass 2 — menu and data-recovery cleanup

- reduce the header More menu;
- move backup/restore to Settings;
- move print/official/session exports to Records/contextual actions;
- add restore preview and precise confirmation;
- retain the header theme shortcut.

Gate: every moved action remains reachable and works; keyboard focus returns to the
trigger; restore cannot replace data before preview and confirmation.

### Pass 3 — setup shell and unified save contract

- split setup shell/tasks into focused components;
- implement explicit per-task drafts and dirty-state navigation guard;
- add atomic actions for marks, categories, question policy, and panel where needed;
- replace the two-pane/horizontal-strip setup shell with the semantic one-open
  completion checklist;
- preserve live/closed read-only behavior.

Gate: one save equals one logical revision, Cancel restores the last saved state,
and draft/live/closed lifecycle tests pass unchanged.

### Pass 4 — Categories V2

- build summary list and single Category editor;
- add existing-age selection plus Add new age group;
- add conditional Quran-range fields;
- generate a default name with optional override;
- implement duplicate/remove impact validation;
- audit all user-facing and spreadsheet wording for Category.

Gate: range, uniqueness, dependency, accessible-error, and compact-layout tests;
five or more categories remain easy to scan without rendering five open forms.

### Pass 5 — participant and question workspace integration

- keep the current participant editor and move entry defaults to its appropriate
  compact location;
- reduce the setup participant task to summary/actions;
- extract Draft questions to a dedicated workspace without logic changes;
- add reliable Back paths and status summaries.

Gate: participant import/review/apply tests stay green; question-bank and question
range tests stay green; both workspaces pass 390 × 844 QA without horizontal
scrolling.

### Pass 6 — Review, visual polish, and documentation

- add linked readiness/error summary;
- polish hierarchy, spacing, states, motion, and both themes;
- verify all target sizes, focus states, and sticky clearances;
- update foundation, setup, roster, handover, and undecided-decision Markdown where
  responsibilities or labels changed;
- publish only after the visual comparison gate is approved.

Gate: final screenshot comparison, accessibility checklist, full test/build pass,
clean scoped diff, commit, push, and successful public deployment.

## 17. Test plan

### 17.1 Automated contracts

Add or extend tests for:

- preference normalization and idempotent legacy migration;
- theme quick-toggle and Settings writing the same preference;
- preference writes leaving competition state/revision unchanged;
- menu actions existing in their new homes and old mixed menu labels being absent;
- compact settings/setup index-detail state and Back behavior;
- dirty-task guard, Save, Cancel, and one-revision-per-save;
- atomic score-config save and unchanged total/step validation;
- Category generated names, custom overrides, normalization, uniqueness, Quran
  ranges, duplicate, removal impact, and live lock;
- Category wording and Muqarrar start wording in UI/template/export surfaces;
- three-state Muqarrar start values;
- participant default behavior without changing reviewed/applied rows;
- Excel/CSV parsing and review/apply boundary;
- Question Builder extraction without question-contract changes;
- Review error links and launch readiness;
- backup parse, preview, cancel, confirm, and invalid-file paths.

### 17.2 Browser and visual QA matrix

Minimum viewports:

- 1440 × 900 desktop;
- 1280 × 720 constrained desktop;
- 1024 × 768 tablet/landscape;
- 768 × 1024 tablet/portrait;
- 390 × 844 phone;
- 320 CSS px reflow check at 200% zoom.

At each relevant viewport:

- light and dark themes;
- keyboard-only traversal;
- focus after opening/closing menus, dialogs, and workspaces;
- no obscured focused control;
- no horizontal page overflow;
- long competition, Category, judge, and institution names;
- empty, minimal, and high-volume participant/category/question data;
- draft, live, and closed competition states;
- reduced-motion mode;
- browser console free of new errors.

### 17.3 Existing release verification

Run:

```powershell
npm.cmd test
npm.cmd run build
git diff --check
```

Report targeted settings/setup tests separately from any unrelated pre-existing
repository debt. Do not claim browser QA unless the stated viewport and interaction
checks were actually performed.

## 18. Acceptance criteria

The update is complete only when all statements below are true.

### Structure

- Settings exists as a distinct workspace.
- Competition setup is not relabeled as Settings.
- Device preferences, data recovery, competition preparation, and record exports
  have clear, non-overlapping homes.
- The header More menu is short and understandable.

### Behavior and safety

- all competition task forms use explicit Save/Cancel semantics;
- all device-preference controls use the same clearly stated auto-save semantics;
- no preference changes touch competition revisions or live snapshots;
- no competition structure changes after launch;
- unsaved task edits cannot be lost silently;
- backup restore previews and validates before confirmation;
- OCR/photo extraction is absent.

### Categories and participants

- only one Category form is open at a time;
- the default Category view remains scannable with at least ten categories;
- age, recitation type, and Quran portions validate clearly;
- Category removal reports dependencies;
- user-facing “Division” text is absent;
- **Muqarrar start** is used in UI and spreadsheet surfaces;
- Feshey kolhu, Nimey kolhu, and Not set remain explicit choices;
- names lead participant cards/rows and competition numbers are secondary;
- Category participant groups remain collapsible with plain counts;
- manual, paste, Excel, and CSV entry remain functional;
- imported rows always reach review before apply.

### Visual and responsive quality

- the new UI uses a deliberate type, spacing, and alignment system;
- values, statuses, and actions align consistently;
- the interface avoids unnecessary nested cards and decorative Web3 effects;
- no required setup task becomes a horizontal-scroll navigation strip on mobile;
- no tested screen has page-level horizontal overflow;
- controls meet at least the 24 px WCAG target rule and normally reach 40–44 px;
- keyboard focus is never obscured by sticky/fixed content;
- compact Settings uses index/detail navigation, while Competition setup retains
  the same one-open checklist behavior across breakpoints;
- the question workspace no longer renders as an 11,000+ px panel inside setup.

### Verification and handoff

- focused tests, full tests, build, and diff check pass;
- before/after screenshots exist for the agreed review viewports;
- Markdown files describe the final architecture and any remaining undecided items;
- implementation is committed and pushed only after the scoped visual review;
- publication reports the exact successful public deployment URL/version.

## 19. Explicit non-goals

- OCR or photo-to-roster extraction;
- cloud sync, accounts, authentication, or multi-device preference sync;
- a new backend or database;
- changing Quran source data or Mushaf rendering semantics;
- changing official score calculations or the live Adu/Raagu selector behavior;
- enabling unreviewed AI decisions for official questions or marks;
- changing the single-owner judging foundation rule;
- broad redesign of the Judge or Records workspaces outside moved actions;
- a global age-category taxonomy that the competition rules have not confirmed;
- automatic mutation of a live competition.

## 20. Decisions to confirm at the visual checkpoint

These choices do not block architecture work, but they should be visible in the
first implementation comparison:

1. **Participant defaults location** — recommended: inside the participant
   workspace, collapsed by default; alternative: a compact disclosure in the
   Participants setup task.
2. **Header theme shortcut** — recommended: keep it for fast accessibility use and
   mirror it in Settings.
3. **Settings compact breakpoint** — recommended: switch to index/detail below
   780 px, then adjust only if measured content proves a better threshold.
4. **Category naming** — recommended: generated default plus Advanced custom
   override.
5. **“IS selection” transcript** — confirm whether this meant age selection before
   finalizing that field label; do not invent an IS setting.

## 21. Recommended implementation order

Proceed in this order:

1. checkpoint and evidence capture;
2. preference data boundary;
3. Settings shell and menu cleanup;
4. Competition Setup shell and unified save contract;
5. Categories V2;
6. participant/defaults integration;
7. dedicated Question workspace;
8. Review and start;
9. visual/accessibility pass;
10. tests, Markdown updates, screenshot review, commit, push, and publish.

The key review point is after steps 3–5. At that point the new architecture,
spacing, task navigation, and Category editor will be visible and reversible before
the large Question workspace extraction is finalized.

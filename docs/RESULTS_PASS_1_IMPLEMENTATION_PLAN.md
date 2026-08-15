# Results screen — Pass 1 implementation plan

Status: implemented and locally verified; publication is recorded in the release handoff
Prepared: 15 August 2026
Reviewed against current code: 15 August 2026
Depends on: [`RESULTS_SCREEN_DESIGN_RESEARCH.md`](./RESULTS_SCREEN_DESIGN_RESEARCH.md)
Release shape: one bounded, reversible UI/workflow pass

## Visual correction outcome — 15 August 2026

The first implementation preserved the correct domain architecture but did not
carry the researched information hierarchy through consistently. A bounded
presentation correction has now been implemented locally without changing the
review-state selector, score calculation, finalization, placement, persistence,
or export contracts.

The corrected presentation:

- turns the four status summaries into low-opacity, full-surface filters with
  text, count, pressed state, and a non-color state cue;
- makes participant identity and action state the scan path, with one open
  participant disclosure instead of exposing every evidence block at once;
- restores established criterion color to Jali, Khafi, Fasaha, and
  Adu / Raagu evidence while leading with score and retaining judge/revision
  provenance;
- keeps search immediate and moves secondary participant filters into one
  compact disclosure;
- places the finalized workbook action after the queue and states its true,
  filter-independent scope;
- repairs the Analysis cascade so metrics remain a three-column grid, category
  rows retain their labels and bars, and repeated mistakes read as a ranked
  evidence list; and
- labels Analysis as descriptive raw counts, not normalized participant
  comparison.

Validation after the correction: all 241 tests pass, the production build
succeeds, and `git diff --check` is clean. Browser review covered 1440×900,
1280×800, 1024×768, and 390×844 in light and dark themes with no horizontal
overflow, plus status filtering, advanced-filter disclosure, and participant
open/close behavior. The local rollback point is
`checkpoint/pre-results-visual-correction-v2` at
`d62c1aea1335000dc833040f322c1aa366b28ea9`. Commit and publication details are
reported in the release handoff rather than embedded as a stale self-reference
inside the implementation commit.

## Implementation outcome

Pass 1 now follows this reviewed contract. The shared review model, proposed
total seam, Results navigation, review queue, evidence blocks, independent
Analysis scope, responsive ledger styling, and documentation are implemented.
The exact release passed the full 233-test suite, a production build, and
browser checks at desktop, compact desktop, and 390px mobile widths with no
horizontal overflow. The commit and public deployment link are supplied in the
release handoff rather than embedded in this pre-commit plan.

## Review outcome

The medium draft had the correct product direction, but it was not yet safe to
implement literally. This review corrected the following material issues:

- the proposed API referred to a non-existent `ResultCandidate` type; the
  current code uses `ParticipantResultCandidate`;
- the draft did not resolve active-competition results versus the retained
  multi-competition `state.history`, which could either mix competitions or
  make older records inaccessible;
- export labels did not define whether “all” meant the filtered list, current
  competition, official history, or sample history;
- the tab proposal specified ARIA roles without the associated arrow-key,
  Home/End, focus, and activation behavior;
- review and analysis filters did not have explicit state ownership and could
  accidentally affect one another;
- there was no stable default sort or bounded navigation for a 280-participant
  queue;
- “computed total” had no specified calculation seam, creating a risk that the
  displayed proposal and finalized result could drift;
- the rollback wording could be read as requiring an empty checkpoint commit,
  and the documentation step required a commit to contain its own unknown hash.

The corrected plan below closes these issues without broadening Pass 1 into the
participant-detail, rankings, analytics, exports-center, or localization work.

## 1. Decision and outcome

Pass 1 will turn the existing user-facing `Records` destination into a clear
operational **Results** workspace without changing judging rules, score
semantics, finalization rules, rankings, import validation, or export schemas.

The navigation label becomes **Results** and the page title becomes
**Results & review**. The first task shown is participant result review, not
analytics. Existing analytics remain available in a functional **Analysis**
tab. Existing judge-section history, correction/reopen controls, source
selection, finalization, CSV export, and workbook export remain usable.

Only two top-level tabs ship in Pass 1:

1. **Review** — default; current-competition result candidates, finalization,
   and supporting judge results.
2. **Analysis** — the existing summary metrics and mistake analytics under an
   explicit stored-history scope.

Do not render disabled or empty `Rankings` and `Exports` tabs. Those destinations
appear only when their complete dedicated views exist.

## 2. Why this is the correct first slice

The current page contains valuable and sensitive operations, but its reading
order presents summary charts before the work that needs human attention. Pass
1 changes hierarchy, naming, scope clarity, and responsive composition while
retaining the existing domain behavior.

It also introduces one shared, testable definition of `needs-review`, `ready`,
and `finalized`. The header badge, status strip, filters, queue, current-final
workbook input, and later Results passes must not invent separate definitions.

The result should feel like a calm competition ledger: warm and professional,
slightly editorial, dense enough for experienced administrators, and obvious
enough that an occasional or older user can operate it without learning a
dashboard vocabulary.

## 3. Protected behavior and authority boundary

The implementation must not change:

- judging criteria, score arithmetic, rounding, denominators, or placements;
- the meaning or stored shape of judge-section results or finalized results;
- source-selection and source-revision rules used by finalization;
- the existing current/stale final-result test;
- import validation, preview, confirmation, and conflict behavior;
- reopen/correction history and the no-delete audit model;
- CSV columns, workbook sheets, workbook calculations, or verification logic;
- application state types, persistence, backup, or migration behavior;
- competition, judge assignment, participant, or category data contracts;
- sample/official isolation;
- the current local authority model: any operator who can reach the existing
  control can finalize; Pass 1 must not imply a new permission or approval
  system;
- the internal `AppView` value `"records"` or the `RecordsView.tsx` filename.

Passing an explicitly scoped subset of existing saved sessions to the existing
CSV function is permitted. Changing the CSV schema or silently changing the
scope behind an unchanged label is not.

`records` remains a valid internal/audit noun. Only the top-level user-facing
destination changes to Results in this pass.

## 4. Scope

### 4.1 Navigation

- Replace the header label `Records` with `Results`.
- Add a `fileCheck` icon to the existing icon component, matching its 24px,
  two-pixel-stroke visual language; do not add an icon package.
- Replace the chart icon with `fileCheck` for this destination.
- Use an accessible name that reflects the actual action:
  - from Judging: `Results, N unresolved participants` or `Results` when zero;
  - from Results: `Back to Judging`.
- Replace the current total saved-session badge with the unresolved participant
  count for the active competition.
- Define unresolved as `needs-review + ready`.
- Do not count finalized items, other competitions, issue quantity, or roster
  participants who have not produced a result candidate.
- Hide the visible badge when the count is zero.
- Preserve the existing route toggle and back-to-Judging behavior.

The badge counts participants, not blocking issues. The page can explain more
than one issue for a participant.

### 4.2 Page context

At the top of `RecordsView`, add a compact page header containing:

- `Results & review` as the single `h1`;
- active competition name;
- edition and lifecycle status when present;
- sample status when applicable;
- one short explanation: review judge results, resolve sources, and finalize
  participant results.

If no competition name/edition is configured, show explicit neutral wording
such as `No competition configured`; do not render blank punctuation or imply
that a result can be published.

Draft, live, closed, sample, and unconfigured states must be distinguishable by
text as well as color. Pass 1 does not introduce new lifecycle restrictions;
existing action availability remains authoritative.

The sample notice is based on the active competition/current scope, not
`state.history.some(session.isSample)`, which can be true because of an unrelated
stored competition.

### 4.3 Functional tab shell

Use a horizontal two-tab interface above the page content:

- a `role="tablist"` container with an accessible label such as
  `Results sections`;
- native `button` elements with `role="tab"`;
- stable tab IDs, `aria-selected`, `aria-controls`, and roving `tabIndex`;
- associated `role="tabpanel"`, `aria-labelledby`, and stable panel IDs;
- Review selected whenever the Results view is newly mounted;
- inactive panels kept mounted but marked `hidden` so component-local source
  choices survive a Review → Analysis → Review switch;
- minimum 44px targets and a visible keyboard focus ring.

Implement the complete keyboard contract rather than adding ARIA roles alone:

- `ArrowLeft`/`ArrowRight` move focus and activate the adjacent tab;
- `Home` activates the first tab and `End` activates the last;
- focus wraps at the ends;
- normal `Tab` moves from the active tab into its panel;
- hidden-panel controls never receive focus.

The initial English/LTR implementation follows visual order. Keep the tab
indexing isolated so the later RTL pass can reverse directional-key behavior
without changing panel ownership.

Do not add URL routing, local-storage persistence, or deep links for tabs in
Pass 1.

### 4.4 Review composition and state ownership

The Review tab has this reading order:

1. result status strip;
2. review filters and visible-result count;
3. participant result queue;
4. queue pagination when required;
5. judge results, imports, corrections, and judge-result CSV actions.

Use distinct state names and controls for review and analysis. Review search,
status, Age group, and Participant category must never reuse the existing
Analysis/Judge-results filter variables.

Recommended ownership:

- `RecordsView` owns active tab, history scope, review filters, review page, and
  the existing analysis filters;
- `RecordsView` derives all current-competition review items and the unfiltered
  summary, then filters/sorts/paginates the visible queue;
- `FinalResultsPanel` receives all current review items and the visible page of
  items, but keeps its existing transient source selections and export state;
- `Header` derives the same active-competition summary independently through the
  shared pure helper.

All state is visit-local. Switching Review/Analysis preserves it because both
panels remain mounted. Leaving Results and returning resets Review filters,
pagination, and the active tab; no preference is persisted in Pass 1.

### 4.5 Status strip

Show four compact, non-interactive counts derived before review filters:

- **Needs review**
- **Ready**
- **Finalized**
- **Result candidates**

Use a grouped strip or ruled ledger row, not four large KPI cards. Each state
needs text and a shape/icon or other non-color signifier. Use tabular numerals.

Call the total `Result candidates`, not `Participants`: roster-only participants
without a finished/imported judge section are not part of this queue.

### 4.6 Review-state and score-preview model

Add `src/lib/resultsReview.ts` as the pure source of truth for review state,
reason codes, history scope, filtering, sorting, summary, and pagination.

Use the actual current candidate type and explicit inputs:

```ts
import type {
  CategoryId,
  FinalizedResult,
  ParticipantCategory,
  SavedSession,
} from "../types";
import type { ParticipantResultCandidate } from "./finalResults";

export type ResultsReviewState = "needs-review" | "ready" | "finalized";
export type StoredResultsScope = "current" | "all";
export type FinalizationIdentityField =
  | "number"
  | "name"
  | "ageGroup"
  | "category"
  | "muqarrar";

export type ResultsReviewReason =
  | { code: "participant-details-missing"; fields: FinalizationIdentityField[] }
  | { code: "required-categories-missing"; categories: CategoryId[] }
  | { code: "source-conflict"; categories: CategoryId[] }
  | { code: "final-source-missing"; categories: CategoryId[] }
  | { code: "final-source-revision-changed"; categories: CategoryId[] }
  | { code: "newer-source-available"; categories: CategoryId[] };

export interface ResultsReviewItem {
  candidate: ParticipantResultCandidate;
  activeFinal?: FinalizedResult;
  finalIsCurrent: boolean;
  state: ResultsReviewState;
  reasons: ResultsReviewReason[];
  lastChangedAt: number;
}

export interface ResultsReviewSummary {
  needsReview: number;
  ready: number;
  finalized: number;
  total: number;
  unresolved: number;
}

export interface ResultsReviewFilters {
  query: string;
  state: "all" | ResultsReviewState;
  ageGroup: string;
  participantCategory: ParticipantCategory;
}

export function isCurrentFinalResult(
  candidate: ParticipantResultCandidate,
  result: FinalizedResult,
): boolean;

export function buildResultsReviewItems(
  history: SavedSession[],
  finalizedResults: FinalizedResult[],
  competitionId: string,
  categories: CategoryId[],
): ResultsReviewItem[];

export function selectStoredResultsHistory(
  history: SavedSession[],
  competitionId: string,
  scope: StoredResultsScope,
): SavedSession[];

export function summarizeResultsReview(
  items: ResultsReviewItem[],
): ResultsReviewSummary;

export function filterResultsReviewItems(
  items: ResultsReviewItem[],
  filters: ResultsReviewFilters,
): ResultsReviewItem[];

export function sortResultsReviewItems(
  items: ResultsReviewItem[],
): ResultsReviewItem[];
```

The implementation can refine parameter names, but it must not replace these
contracts with component-specific duplicated logic.

Classification rules, in priority order:

1. **Finalized** — one active, non-superseded final exists and the current code’s
   source-exists, source-revision, required-category, and newer-alternative tests
   all pass.
2. **Needs review** — finalization identity is incomplete; a required category
   is missing; a category has multiple sources; or an active final is stale
   because its source disappeared, its revision changed, or a newer alternative
   appeared after finalization.
3. **Ready** — finalization identity is complete, every required category has
   exactly one source, and there is no current final.

Important edge behavior:

- A current final remains Finalized even when an alternative source already
  existed before it was finalized; this preserves the current staleness rule.
- A locally selected conflicting source does not change persisted review state.
  The participant remains Needs review until finalization succeeds.
- Roster-only participants are not fabricated as missing candidates. The empty
  state explains that they are awaiting judging.
- Scope candidates and active finals to `state.competition.id` before grouping.
- Use the exact enabled criteria source already used by Final Results:
  `enabledCategories(state.competition.liveSnapshot?.scoreConfig ?? state.config)`.
- Do not assume three criteria; Adu/Raagu may make four.
- `lastChangedAt` is the latest relevant saved/imported source time or active
  finalization time and is used only for display/tie-breaking, not domain logic.

Extract the current `isCurrentFinal` function from `FinalResultsPanel.tsx`
without changing its `>` timestamp comparison or revision fallback.

Also make two behavior-preserving extractions in `src/lib/finalResults.ts`:

1. `hasCompleteFinalizationIdentity(participant)` contains the exact number,
   name, Age group, Participant category, and Muqarrar checks currently inside
   `finalizeParticipantResult`. Both finalization and review classification call
   it so the UI cannot call an item Ready that finalization rejects.
2. `buildParticipantResultPreview(candidate, selectedSessionIds)` returns the
   same `byCategory`, `total`, and `totalMax` used by finalization, or `null` when
   sources are unresolved. `finalizeParticipantResult` consumes that preview
   instead of maintaining a second score path.

The queue uses the preview for a proposed total. Never reimplement deductions or
sum scores inside a React component. Existing final-results tests must prove
that the refactor produces identical final data.

At 100–280 participants, memoized pure derivation is sufficient. Do not add a
worker, remote cache, virtual list, or new state infrastructure.

### 4.7 Competition and retained-history scope

This is a confirmed code constraint the medium draft missed:

- `FinalResultsPanel` already scopes candidates/finals to the active competition;
- `RecordsView` currently computes metrics and judge-result rows from the whole
  retained `state.history` without a competition filter;
- `downloadRecordsCSV(state.history)` exports all stored official history;
- starting another competition can retain earlier official history.

Therefore use two intentional scopes instead of silently choosing one:

- **Review queue, status strip, finalization, rankings shown in rows, and final
  workbook:** always the active competition.
- **Judge results and Analysis:** a visible `Data scope` control with
  `Current competition` (default) and `All stored competitions`.

The Data scope is shared between Judge results and Analysis. The existing Judge,
Section, Age group, and Participant category filters apply after that scope.
The review filters remain independent.

When `All stored competitions` is selected:

- each judge-result row includes its `competitionId` and version identifier, or
  a clearly labelled `Legacy record` fallback;
- do not invent a friendly competition name because saved sessions do not store
  one;
- Analysis explicitly says that it summarizes all selected stored results;
- import still validates against and imports into the active competition only.

This preserves access to historical records while making the default operational
screen safe for the active competition. A richer archived-competition selector
requires a stored competition catalog and is outside Pass 1.

### 4.8 Review filters, ordering, and pagination

Place these controls above the queue:

- status: All / Needs review / Ready / Finalized;
- participant search by number or name;
- Age group;
- Participant category;
- Clear filters, shown or enabled only when a filter is active.

These are filter buttons, not another tablist. Use `aria-pressed` for the status
buttons. All is the initial state.

Show `N of M result candidates` after filtering. Use this stable default order:

1. Needs review;
2. Ready;
3. Finalized;
4. within a state, participant number using numeric-aware comparison;
5. name and participant ID as deterministic fallbacks.

Use a 50-item client-side page size. Render Previous, `Page X of Y`, and Next
only when more than one page exists. Controls have 44px targets and explicit
accessible names. Reset to page 1 whenever a review filter changes. Preserve
source selections across pages because `FinalResultsPanel` stays mounted.

If a finalization moves an item to another sort position, recompute the valid
page and clamp it rather than showing an empty out-of-range page. Do not announce
every keystroke; announce the final result count/page change through one polite
status region.

Search is case-insensitive, trims/collapses whitespace, and matches name or
participant number. Name remains the primary visual label.

Review filters never scope CSV or workbook exports.

### 4.9 Participant result queue

Refactor the visible composition of `FinalResultsPanel`, while preserving its
local source-selection lifecycle, `window.prompt` revision-reason flow,
finalization dispatch, placement calculation, and workbook verification.
The designed confirmation flow remains Pass 2.

Each queue item surfaces, in this order:

- participant name;
- participant number as secondary information;
- Age group, Participant category, and Muqarrar start;
- review status and a concise reason when needed;
- last relevant change date;
- one source block per enabled criterion;
- proposed total, or an em dash when required sources are unresolved;
- current final total/place/revision when applicable;
- one clear consequential action.

Each source block displays criterion, judge, source revision, and that
criterion’s score/maximum. Conflicting `select` options also include judge,
revision, and score/maximum so the choice is evidence-based. Do not expose only
judge names when two revisions belong to the same judge.

On desktop, use semantic `article` rows with a stable CSS grid rather than an
HTML table that must later be deconstructed. Give each article an accessible
name from its participant heading. On mobile, the same article becomes a card;
do not force desktop-table horizontal scrolling.

Keep source choice inline in Pass 1. The participant detail drawer belongs to
Pass 2; do not build a partial drawer.

Replace the fixed `repeat(3, ...)` category grid with an adaptive
`auto-fit`/`minmax` or equivalent layout that works with three or four enabled
criteria.

### 4.10 Judge results and export scope

Rename the user-facing `Sessions` panel to **Judge results**. Preserve:

- judge/section result rows and expandable details;
- source/history information;
- `Reopen to correct` behavior;
- import preview, validation, and confirmation;
- judge-result package export;
- CSV generation through the existing function;
- the audit-preserving absence of delete and clear actions.

The panel sits below the queue because it is supporting evidence and a
correction path.

CSV actions follow the visible Data scope, never the review filters:

- Current competition: pass only current-competition history and show one
  explicit `Current competition results (.csv)` action, with sample wording when
  the active competition is sample.
- All stored competitions: preserve access to all retained history but keep
  official and sample exports separate, labelled `All stored official results
  (.csv)` and `All stored sample results (.csv)`.

Do not change CSV columns or row generation. Do not combine sample and official
records into one ambiguous action.

The final workbook always contains every current, non-stale finalized result for
the active competition and ignores review filters. Label it
`Finalized results (.xlsx)` and state that scope near the action.

### 4.11 Analysis tab

Move the current analytics into Analysis without changing their calculations:

- Sessions, Average score, and Mistakes logged;
- Judge, Section, Age group, and Participant category filters;
- Mistakes by category;
- Most marked letters;
- Most repeated mistakes.

The shared Data scope is visibly repeated or summarized in Analysis. Add honest
copy such as `Raw counts and score summaries for the selected stored judge
results`. Do not present them as normalized participant comparisons, causal
findings, or educational conclusions.

Pass 1 changes Analysis location, data-scope clarity, and hierarchy—not its
methodology or visualization system.

## 5. Visual specification

### 5.1 Character

Use the editorial verification-ledger direction: warm institutional surfaces,
firm rules, clear type hierarchy, limited ornament, and restrained category
color. Avoid a generic grid of rounded KPI cards, glass effects, gradients,
neo-grotesque novelty, or decorative animation.

Keep Tahqeeq’s existing palette, spacing rhythm, and component language:

- warm page ground and white working surfaces;
- 4px-derived spacing increments;
- 8px and 12px working radii;
- category colors only where they add meaning;
- tabular numerals for marks, totals, and counts;
- visible rules and spacing to group related evidence.

### 5.2 Type and controls

- Page title: 28–32px depending on viewport.
- Major section titles: 18–21px.
- Normal row/body text: 14–16px.
- No new or changed Results text below 12px.
- Normal controls: at least 40px high.
- Tabs, pagination, and consequential actions: at least 44px high.
- Keyboard focus: visible two-pixel outline with sufficient contrast.
- Desktop queue rows: a calm 52–60px identity/status band before source detail.

Do not globally change `.panel-title`; other screens depend on it. Create
Results-scoped heading styles.

### 5.3 Direction and future Dhivehi readiness

Pass 1 does not translate Results or add a message catalog. It must avoid making
the later Dhivehi pass harder:

- use logical CSS properties in all new/rebuilt Results styles;
- replace touched physical left/right declarations with logical equivalents;
- use `text-align: start/end`;
- isolate scores, participant numbers, dates, and mixed-direction metadata with
  `bdi`, `dir="auto"`, or `dir="ltr"` as appropriate;
- do not build full sentences by concatenating fragments;
- do not duplicate the component for another language.

No broad internationalization refactor or unreviewed Dhivehi wording is allowed
in Pass 1.

### 5.4 Motion

Add no animation dependency. Use only restrained existing transition patterns
and respect `prefers-reduced-motion`. Status, tab, filter, and pagination changes
must be understandable without motion.

## 6. Responsive composition

### Desktop — 1180px and wider

- Allow the Results content area to reach about 1200px if needed for four
  criteria.
- Keep title, context, status strip, filters, and first queue rows in the initial
  1440×900 view where representative data allows.
- Keep participant identity dominant; criteria, total, status, and action align
  in stable bands.
- Do not trade readable source controls for decorative whitespace.

### Compact desktop/tablet — 760px to 1179px

- Wrap each result into participant, source, and action bands.
- Let filters wrap in a stable order.
- Preserve 40/44px controls and readable type.
- Do not create page-level horizontal scrolling.

### Phone — below 760px

- Render each result as a semantic card with name first.
- Keep status and total near the card top.
- Stack source controls and keep one obvious primary action.
- Keep pagination compact but fully labelled.
- Tabs may scroll only inside their own control if necessary; the page must not
  scroll horizontally.
- When the header text is visually hidden, retain the full accessible action
  name and unresolved count.
- Validate the primary phone viewport at 390×844.

### Reflow and zoom

At 200% zoom or an effective width of 320 CSS pixels:

- every value and action remains available;
- controls do not overlap;
- score/source labels do not clip;
- focus order matches reading order;
- no two-dimensional page scrolling is required.

## 7. Required content states

| State | Required behavior |
| --- | --- |
| No configured competition | Identify the missing context; review queue is empty; All stored history remains reachable through Data scope. |
| No result candidates | Explain that judge sections appear after a recitation is finished or imported; do not show a wall of zero cards. |
| No filter matches | Say `No results match these filters` and offer `Clear filters`. |
| Ready | Show that required sources are present, show proposed total, and allow existing finalization. |
| Missing category | Name every missing category and classify as Needs review. |
| Conflicting sources | Explain the conflict and show judge, revision, and score evidence in the selector. |
| Finalized/current | Show finalized total, place, revision, and current status. |
| Finalized/stale | Name the source-change reason and return the item to Needs review. |
| Current scope empty but stored history exists | Explain the difference and offer the All stored competitions Data scope. |
| Sample workspace | Scope the sample notice correctly and avoid implying official publication. |
| Import preview/error | Preserve complete error, preview, cancel, and confirmation behavior. |
| Draft/live/closed | Show lifecycle context in text, not color alone. |
| Page boundary after filtering/finalization | Clamp to a valid page; never show an accidental empty page. |
| Light/dark theme | Preserve readable status, rules, focus, and controls. |

Data is synchronous. Do not add fake skeletons or loading states.

## 8. File-level implementation map

### Add

| File | Responsibility |
| --- | --- |
| `src/lib/resultsReview.ts` | Pure review state/reasons, current-final test, history scope, summary, filtering, sorting, and page helpers. |
| `scripts/results-review.test.mjs` | Domain, scope, ordering, pagination, and source-contract coverage. |

### Modify

| File | Change |
| --- | --- |
| `src/lib/finalResults.ts` | Extract identity validation and result preview; finalization consumes the same preview with identical output. |
| `src/components/Header.tsx` | Results label/icon, action-aware accessible name, and active-competition unresolved badge. |
| `src/components/Icon.tsx` | Add `fileCheck` within the existing icon system. |
| `src/components/RecordsView.tsx` | Page context, complete tabs, independent filter state, data scope, pagination, Review/Analysis composition, and Judge results wording. |
| `src/components/FinalResultsPanel.tsx` | Consume shared review items/visible page, show evidence and preview totals, preserve source/finalization/placement/workbook behavior. |
| `src/styles/global.css` | Results-scoped ledger, tabs, status, queue, pagination, responsive, focus, dark-mode, and logical-property rules. |
| `package.json` | Add the new test file to the repository’s explicit test command. |
| `README.md` | Update the user-facing Results path and describe Review/Analysis after implementation. |
| `docs/RESULTS_SCREEN_DESIGN_RESEARCH.md` | Mark Pass 1 implemented after verification and link this implementation plan. |
| `docs/PRE_QUESTION_BANK_RELEASE_PLAN.md` | Update affected user-facing `Records` paths while retaining audit/history terminology. |

If `RecordsView.tsx` becomes difficult to review, small Results-specific private
components may be extracted. Do not create a new design system or unrelated
abstraction.

## 9. Test plan

### 9.1 Pure domain and review tests

Add tests for:

- complete finalization identity and every individually missing identity field;
- result preview matches finalized `byCategory`, `total`, and `totalMax` exactly;
- preview returns null when a required source is unresolved;
- unique complete candidate → Ready;
- missing category → Needs review with category reason data;
- conflicting sources → Needs review;
- current final → Finalized, including a pre-existing alternative selected at
  finalization;
- missing final source → stale/Needs review;
- changed source revision → stale/Needs review;
- newer alternative after `finalizedAt` → stale/Needs review;
- alternative at or before `finalizedAt` preserves current behavior;
- superseded finals never become the active final;
- candidates/finals are scoped to active competition;
- Current and All stored history scopes preserve the intended records;
- Adu/Raagu enabled/disabled paths never assume three categories;
- summaries calculate Needs review, Ready, Finalized, total, and unresolved;
- status/search/Age group/Participant category filters compose correctly;
- search normalization and numeric participant-number sorting are deterministic;
- state priority is Needs review → Ready → Finalized;
- 51 items produce two pages at the 50-item boundary;
- filter and finalization changes clamp an out-of-range page.

### 9.2 Source-contract tests

Following the current Node/source-assertion convention, verify:

- Header uses visible `Results` and `fileCheck`, not `chart`, for this destination;
- action-aware accessible labels exist for Results and Back to Judging;
- page title is `Results & review`;
- Review and Analysis have tablist/tab/tabpanel relationships and key handling;
- no dead Rankings or Exports tab button is rendered;
- review and analysis filters have distinct state ownership;
- `Judge results` replaces the ambiguous Sessions panel title;
- current/all history scope is explicit;
- final-results source selection, revision prompt, and finalization remain;
- judge package, scoped CSV, and finalized workbook actions remain;
- import-validation strings and `Reopen to correct` remain;
- no delete/clear-history action is introduced.

Source checks supplement pure and browser tests; they are not evidence that
keyboard behavior works by themselves. Update intentional user-facing string
assertions only. Do not weaken domain assertions to make the redesign pass.

### 9.3 Automated validation

```powershell
npm.cmd test
npm.cmd run build
git diff --check
```

Also inspect the scoped diff and staged file list. If the broader repository has
an unrelated pre-existing failure, report it separately; every Results-related
failure still must be resolved before the pass is called verified.

### 9.4 Manual browser validation

Validate:

- 1440×900, 1280×800, and 1024×768;
- 390×844 phone;
- 200% zoom/effective 320px reflow;
- light and dark themes;
- mouse, touch-sized controls, and keyboard-only operation;
- sample and official competition workspaces;
- Current competition and All stored competitions scopes.

Keyboard checks:

- reach and activate Results from the header;
- use ArrowLeft/ArrowRight/Home/End across the two tabs;
- Tab enters only the selected panel;
- filter, clear, and paginate the queue;
- change a source and finalize using the preserved flow;
- expand a judge result and reach `Reopen to correct`;
- hidden Analysis controls never receive focus while Review is active.

Accessibility checks:

- one `h1` and a coherent heading order;
- status and scope are understandable without color;
- icon-only controls have correct action names;
- fields have visible/programmatic labels;
- selected tab and pressed status filter are announced;
- page changes have one polite announcement, not a noisy live region;
- numeric/mixed-direction content reads in stable order;
- contrast and focus remain visible in both themes.

Functional regression checks:

- a conflicting source can still be selected and finalized;
- revising a final still requires the existing prompt reason;
- finalizing supersedes the prior final in the audit trail;
- placement/ties and workbook contents are unchanged;
- current/all/sample/official CSV outputs match their visible labels;
- imports remain tied to the active competition even in All stored scope;
- reopen resumes the selected judge result safely.

## 10. Data fixtures for visual and behavioral QA

Exercise:

- no configured competition with retained history;
- empty configured competition;
- one complete/Ready candidate;
- missing participant identity fields;
- one and multiple missing categories;
- conflicting sources from the same and different judges;
- finalized result with removed source, changed revision, and newer alternative;
- current finalized result with a pre-existing alternative;
- Adu/Raagu enabled, producing four criteria;
- sample competition data plus retained official history;
- at least two official competition IDs in stored history;
- 50, 51, 100+, and 280 candidates;
- long participant/institution names and duplicate-looking names;
- export error;
- layout-only mixed-direction/Dhivehi text without adding product translation.

At 280 candidates, verify derivation, filtering, tab switching, and pagination
remain responsive. Add virtualization only after measured evidence and a
separately reviewed scope change.

## 11. Acceptance criteria

Pass 1 is complete only when:

- navigation says Results, uses fileCheck, and badges active-competition
  unresolved participants only;
- accessible navigation names reflect Results versus Back to Judging;
- Results opens on Review and identifies itself as Results & review;
- Review work appears before analytics;
- one helper drives header/status/filter/queue/current-final state;
- displayed proposed totals and finalization share one tested calculation seam;
- current and retained-history scopes are visible, correctly labelled, and do
  not make older records inaccessible;
- review filters do not affect Analysis/Judge-result filters or exports;
- All sorts Needs review → Ready → Finalized and the 50-item page boundary works;
- source selectors show judge, revision, and score evidence;
- existing source selection, prompt, finalization, placement/ties, import,
  correction/reopen, CSV schema, and workbook behavior remain intact;
- Analysis contains current metrics/summaries with honest scope wording;
- only Review and Analysis tabs are visible and functional;
- three and four criteria lay out correctly;
- no page-level horizontal overflow occurs at required viewports or 200% zoom;
- new/changed Results text is at least 12px and consequential targets are at
  least 44px;
- mobile uses readable semantic cards, not a compressed desktop table;
- light/dark, keyboard, empty, filter-empty, scope-empty, Ready, conflict, stale,
  current, sample, pagination, and export states are checked;
- automated tests, build, diff check, staged-file audit, and manual gates pass;
- shipped documentation describes actual behavior.

## 12. Explicit non-goals and later passes

Not in Pass 1:

- participant detail drawer or audio/evidence review — Pass 2;
- designed finalization confirmation/revision modal — Pass 2;
- dedicated Rankings workspace/publication workflow — Pass 3;
- normalized analytics, comparative cohorts, or redesigned charts — Pass 4;
- dedicated Exports center and parent/student report format — Pass 4;
- Dhivehi translation, message catalog, or full localization — Pass 5;
- archived competition-name catalog or per-competition historical selector;
- backend sync, authentication, roles, consent, recording, AI, or speech
  alignment;
- URL routing for Results tabs;
- scoring/tie/official competition-rule changes;
- broad application design-system refactor.

## 13. Execution sequence

1. **Checkpoint and baseline** — verify HEAD, create a named checkpoint branch at
   that commit, audit the dirty tree, and capture desktop/phone baseline states.
2. **Calculation seam** — extract identity validation and result preview in
   `finalResults.ts`; prove finalization output is identical.
3. **Review selector** — add `resultsReview.ts` and pure tests for state, reasons,
   scope, summary, ordering, and page boundaries.
4. **Navigation** — add fileCheck, Results wording, correct accessible action
   names, and shared unresolved count.
5. **Page shell** — add page context and the complete Review/Analysis tab
   contract.
6. **Review composition** — add status/filter/order/page state and restructure
   Final Results into the queue.
7. **Evidence presentation** — show source revision/category score and proposed
   total through the shared calculation seam.
8. **Judge results and scope** — add Current/All stored scope, move Judge results
   below the queue, and make CSV scope explicit without changing its schema.
9. **Analysis** — move existing metrics/filters/summaries into the mounted panel
   and apply the same visible history scope.
10. **Responsive/accessibility styling** — complete desktop, tablet, phone,
    four-criteria, dark, focus, bidi-safe, and reflow rules.
11. **Verification** — run automated gates, fixtures, viewports, keyboard,
    export, and regression checks.
12. **Documentation and commit** — update only the scoped docs, stage an explicit
    allow-list, inspect the staged diff, and create the feature commit.
13. **Publish** — only after verification and an explicit publish instruction;
    confirm public deployment success before sharing the link.

Keep the application change in one bounded feature commit if practical. Do not
put a commit hash inside the same commit that creates that hash. Report the exact
commit and deployment in the final handoff; if a permanent in-repo release log
requires the hash, add it in a separately justified follow-up commit.

## 14. Rollback and comparison path

Before implementation:

- verify the current HEAD and create a ref such as
  `checkpoint/pre-results-pass1-v1` pointing to it; do not create an empty commit
  solely to make a checkpoint;
- record `git status --short` and keep existing unrelated/untracked files out of
  all staging commands;
- capture current Records/Final results at desktop and 390×844;
- record representative source selection, finalization, import, reopen, current
  CSV, sample CSV, and workbook behavior.

After implementation, capture the same states/dimensions for comparison. Because
Pass 1 has no persisted-data migration, rollback is a normal revert of the
feature commit or a comparison against the checkpoint branch. Reverting must not
transform or discard competition data.

Do not package `.private/`, `tmp/`, local screenshots, the separate mobile Mushaf
plan, or unrelated user files into the feature commit/deployment.

## 15. Implementation stop conditions

Pause and surface the decision if implementation reveals:

- identity/preview extraction changes finalized numerical or manifest behavior;
- the current-final logic cannot be extracted without semantic change;
- badge derivation requires a state/persistence migration;
- older stored records cannot remain reachable without a data-model change;
- an export cannot truthfully match the visible scope using existing functions;
- four-criteria layout requires category-contract changes;
- tests expose undocumented ranking/finalization behavior that the UI could
  obscure;
- meaningful phone usability requires the Pass 2 detail surface rather than
  scoped inline controls.

These are product/domain decisions, not styling details, and must not be silently
resolved inside Pass 1.

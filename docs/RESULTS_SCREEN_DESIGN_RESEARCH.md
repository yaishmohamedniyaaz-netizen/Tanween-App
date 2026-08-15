# Results screen design research

Status: research complete; Pass 1 implemented and locally verified
Reviewed: 15 August 2026
Scope: navigation naming, information architecture, workflow, visual direction,
responsive behaviour, accessibility, and Dhivehi/RTL readiness

Implementation handoff: [`RESULTS_PASS_1_IMPLEMENTATION_PLAN.md`](./RESULTS_PASS_1_IMPLEMENTATION_PLAN.md),
xhigh-reviewed against the current Results code and repository contracts on
15 August 2026. Pass 1 is implemented; later-pass recommendations in this
research remain deliberately out of scope.

## Executive decision

The top-level destination should be named **Results**, not **Records**.
The page itself should be titled **Results & review**. “Records” remains useful
inside the product for saved judge-section records, audit history, and export
language, but it is too archival and too ambiguous for the main destination.
The screen's primary job is not to show charts; it is to help an administrator
find unresolved results, inspect the contributing judge sections, finalize the
right versions, publish placements, and export evidence that can be checked.

Replace the chart icon with a **file-check** or **clipboard-check** icon. A chart
icon promises analytics, while a trophy implies that every record is already a
winner or final. The navigation badge should show an **actionable unresolved
count**, not the total number of saved sessions. Hide the badge when the count is
zero.

The recommended visual direction is an **editorial verification ledger**:

- 45% institutional precision: direct language, obvious status, strong reading
  order, and no decorative ambiguity;
- 25% precision control room: excellent filters, saved scopes, dense comparison,
  and fast list-to-detail movement;
- 20% warm professional utility: Tahqeeq's existing off-white ground, quiet
  surfaces, modest radii, and humane spacing;
- 10% restrained editorial/brutalist edge: firmer rules, larger section titles,
  tabular numerals, low ornament, and a deliberate asymmetric accent when it
  improves hierarchy.

This is not a generic KPI dashboard and should not look like one. It should feel
like a calm, modern competition control ledger that an experienced judge can
understand immediately.

## What the screen must let people do

The design is successful only if a competition administrator can answer these
questions quickly and safely:

1. Which participants need attention now?
2. Why is each one blocked: missing section, duplicate source, changed revision,
   or incomplete participant details?
3. Which judge-owned sections contribute to the proposed final result?
4. Can the displayed total be reconstructed from those sections?
5. Which results are finalized and which have changed since finalization?
6. Who placed in each Age Group + Category group, including visible ties?
7. What can be exported now, and what does the export include or exclude?
8. What patterns in the mistake data are meaningful enough to improve teaching
   or competition preparation?

The Saudi Ministry's competition system explicitly covers candidates,
competitions, judges, score forms, daily participant lists, winner lists, and
reporting. Its current rules also use multiple judges, averaged marks, explicit
tie review, recordings when necessary, and score confidentiality. Al-Azhar's
description of electronic documentation frames accuracy, transparency, and fair
evaluation as part of the competition operation. These are strong signals that
Results must be an accountable operational workflow, not a decorative analytics
page.

## Audit of the current implementation

### Confirmed in the current code and local screen

- The header calls the destination `Records`, uses a chart icon, and badges the
  total `state.history.length`.
- The page has no visible page title, competition identity, or short explanation
  of where the user is.
- The current reading order is metrics, filters, mistake analytics, saved
  sessions, then Final results. The most consequential work is below the
  analytics and often below the fold.
- `Sessions` is not an accurate user label. These are judge-owned section
  results, and the distinction matters before sections are combined.
- The current metrics and filters share a flexible row that can become visually
  unbalanced or clip at intermediate widths.
- The empty state displays several large zero surfaces before explaining what
  the administrator can do next.
- In “Mistakes by category,” the label and zero can visually run together.
- The repeated-mistake and marked-letter modules are raw-count summaries without
  an exposure denominator or a plain-language conclusion.
- The participant rows put the participant number before the name, even though
  the name is the more useful recognition cue. The number should be compact
  secondary metadata.
- The final source selector uses a CSS grid fixed to three columns even though
  the product can enable a fourth criterion, Adu / Raagu.
- Final-source labels are 9px uppercase, participant metadata is 10.5px, and
  several action controls are 30–32px high. This bypasses the newer Results-wide
  opportunity to use the app's `--t-micro: 12px` minimum and a more forgiving
  target size.
- A revision reason is currently collected with `window.prompt`, which is too
  weak for an auditable confirmation step and gives no useful review context.
- The expandable session row is a `div` with button behaviour added manually.
  It works with Enter and Space, but a native button/disclosure structure would
  be clearer and easier to maintain.
- Results CSS still contains physical left/right rules. Most are easy to replace
  with logical start/end properties when this area is rebuilt.
- User-facing Results text is hard-coded across `RecordsView.tsx` and
  `FinalResultsPanel.tsx`; there is not yet a message-catalog boundary for
  Dhivehi.

### Product truth already implemented and protected

The redesign must preserve, not reinterpret, these behaviours:

- saved entries are judge-section results, not automatically final results;
- wrong-competition, missing, duplicate, and conflicting sources must not enter
  a final result silently;
- each displayed total is recalculated from saved evidence and frozen scoring
  rules;
- a missing required criterion blocks finalization and is not treated as zero;
- changed or newly conflicting sources require review;
- a correction creates a visible revision with a reason rather than erasing the
  previous final result;
- only current finalized results enter rankings;
- rankings are per **Age Group + Category**;
- equal percentages remain tied using competition ranking such as `1, 1, 3`;
- no cross-category overall winner is invented;
- the workbook contains fixed app-calculated values and is read back for
  verification before download;
- sample and official records remain clearly separated.

## Research findings that matter to Tahqeeq

### 1. Operational work should precede analytics

Stripe separates dispute action from dispute analytics. GOV.UK cautions that
dashboards are best for high-level monitoring and can leave users to interpret
the meaning themselves. Airtable provides a dedicated record-review layout for
rapid triage rather than expecting a dashboard to do review work. The practical
conclusion is that Tahqeeq should default to **Review**, with **Analysis** as a
separate view using the same active data scope.

### 2. A queue needs visible, non-clickable status and a clickable row

GOV.UK's task-list research found that users could mistake the status tag for
the action. Its pattern makes the task row the destination and keeps status as
supporting information. For Tahqeeq, the participant/name cell or whole safe row
should open review; the status lozenge should describe state and should not look
like a button.

### 3. List-to-detail is the right review model

Airtable's record-review pattern uses a persistent scan list and a focused
record detail. Stripe's detail pages group related information and consolidate
common actions. Carbon recommends expansion only for supplementary information;
when content becomes cramped, it should move to a side panel or dedicated page.
Tahqeeq should therefore use a concise participant result list plus a substantial
review detail surface. It should not keep adding deeper content inside endlessly
expanding rows.

### 4. Filters must define one trusted scope

Linear reflects filters in the current view, makes grouped counts visible, and
lets analysis operate on the filtered dataset. Airtable connects dashboard
elements to shared filters. Tahqeeq should show a persistent scope summary such
as `Under 14 · Hifz · All judges`, and Review, Rankings, Analysis, and Exports
must state whether they inherit or reset that scope. Export must never silently
use a different set than the one visibly described.

### 5. Responsive data should change representation, not disappear

Shopify's table becomes a list on narrow screens and gives each field a declared
role such as primary, secondary, or labelled numeric. W3C reflow guidance allows
complex tables to retain contained two-dimensional scrolling, but the rest of
the page should reflow and should not acquire a page-level horizontal scrollbar.
Tahqeeq should keep the comparison table on desktop and render the same semantic
fields as result cards on phone. A wide table may scroll inside its own labelled
container when comparison genuinely requires it.

### 6. Charts must make their conclusion and source explicit

USWDS recommends common chart forms, one central idea per visualization, a plain
text conclusion, and access to the underlying table. GOV.UK recommends titles
that describe the main trend and warns that interactive charts can hide the
message. Tahqeeq should use ranked lists or simple horizontal bars before
complex charts. Every chart must name its population and denominator and expose
the values as a table or export.

### 7. Official finalization needs prevention, review, and reversibility

WCAG's error-prevention guidance calls for important data submissions to be
reversible, checked, or reviewed and confirmed before finalization. That matches
Tahqeeq's revision history and verification model. The UI should use a real
review dialog or step with selected sources, calculation, warnings, confirmer,
and revision reason—not a browser prompt.

## Four visual directions

### Direction A — Civic ledger / institutional precision

References:

- [GOV.UK task list](https://design-system.service.gov.uk/components/task-list/)
- [GOV.UK pagination](https://design-system.service.gov.uk/components/pagination/)
- [USWDS process list](https://designsystem.digital.gov/components/process-list/)
- [Carbon data table](https://carbondesignsystem.com/components/data-table/usage/)

Visual character: decisive headings, wide readable rows, restrained statuses,
obvious focus, minimal cards, and strong horizontal rules.

Best qualities for Tahqeeq:

- highest immediate legibility for veteran and occasional users;
- communicates seriousness and procedural fairness;
- stays usable with long names and translated labels;
- unlikely to look dated.

Risk: copied literally, it can feel like a government form rather than a crafted
competition product. Tahqeeq should keep its warmer ground, brand mark, Quranic
colour semantics, and slightly finer spacing.

### Direction B — Precision control room

References:

- [Linear filters](https://linear.app/docs/filters)
- [Linear custom views](https://linear.app/docs/custom-views)
- [Linear Insights](https://linear.app/docs/insights)
- [Stripe Dashboard basics](https://docs.stripe.com/dashboard/basics)
- [Stripe dispute analytics](https://docs.stripe.com/payments/analytics/disputes)

Visual character: compact filtering, grouped counts, persistent scope, fast
list-to-detail navigation, and quiet dense metadata.

Best qualities for Tahqeeq:

- handles 100–280 participants without making the screen feel enormous;
- gives expert administrators fast filtering and scanning;
- supports saved views such as `Needs review`, `Missing sections`, and
  `Finalized today`;
- makes action state and data state feel current.

Risk: tiny grey text, hover-only actions, excessive pills, and dark technical
styling would be hostile to older users and would fight Tahqeeq's existing
visual voice. Borrow interaction discipline, not the full aesthetic.

### Direction C — Editorial scorebook / restrained brutalism

References:

- [GOV.UK chart guidance](https://brand.design-system.service.gov.uk/data/charts/)
- [GOV.UK dashboard guidance](https://brand.design-system.service.gov.uk/data/dashboards/)
- [World Athletics WebCIS overview](https://cis.worldathletics.org/about/WebCIS%20product%20sheet%202024.pdf)

Visual character: large tabular figures, black or dark rules, direct labels,
editorial captions, fewer rounded containers, and a visible relationship between
summary and source data.

Best qualities for Tahqeeq:

- gives the requested edge without becoming playful;
- makes placements, scores, and audit captions feel deliberate;
- fits the existing near-monochrome system and limited category colours;
- produces clean printable and public-facing result summaries.

Risk: if the heavy rules and display type spread into every row, the screen can
feel aggressive and tiring. Use this language for page titles, section openings,
rank numbers, and report summaries—not for every control.

### Direction D — Warm review desk

References:

- [Airtable record review](https://support.airtable.com/docs/interface-layout-record-review)
- [Airtable dashboard layout](https://support.airtable.com/v1/docs/interface-layout-dashboard)
- [Shopify responsive table](https://shopify.dev/docs/api/app-home/web-components/layout-and-structure/table)
- [Stripe balance reporting](https://docs.stripe.com/reports/balance)

Visual character: quiet off-white canvas, clear white work surfaces, approachable
grouping, generous rows, and less intimidating controls.

Best qualities for Tahqeeq:

- aligns most directly with the existing app;
- keeps the review process humane for small local competitions;
- provides the safest reversible alternate if the primary direction feels too
  austere.

Risk: too many soft cards and large gaps turn a serious workflow into a generic
SaaS dashboard and push important information below the fold.

## Direction assessment

This is a design assessment against Tahqeeq's known jobs, not a quantitative
user study. Scores are 1–5; the weighted total is a decision aid.

| Direction | Operational clarity 25% | Audit safety 20% | Veteran legibility 15% | Scale/density 15% | RTL/mobile 10% | Current fit 10% | Timelessness 5% | Weighted |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Civic ledger | 5 | 5 | 5 | 3 | 4 | 4 | 5 | 90/100 |
| Precision control room | 5 | 4 | 3 | 5 | 3 | 3 | 4 | 81/100 |
| Editorial scorebook | 3 | 3 | 4 | 3 | 4 | 4 | 5 | 69/100 |
| Warm review desk | 4 | 4 | 4 | 4 | 4 | 5 | 4 | 82/100 |
| Recommended hybrid | 5 | 5 | 5 | 4 | 4 | 5 | 5 | **95/100** |

Primary direction: **editorial verification ledger**, the recommended hybrid.
Reversible alternate: **warm review desk**, using the same information
architecture and component contracts with softer surface/rule tokens.

## Proposed information architecture

### Global navigation

- Nav label: **Results**
- Icon: file-check or clipboard-check
- Badge: unresolved review count
- Active-state label inside the page: **Results & review**
- Competition context: competition name, edition, mode, and lifecycle state

### Page destinations

Use four stable destinations, not one very long dashboard:

1. **Review** — default; overview, action queue, participant result review, and
   finalization.
2. **Rankings** — finalized placements by Age Group + Category, with ties and
   excluded incomplete results explained.
3. **Analysis** — mistake patterns and score distributions under a visible,
   shared scope.
4. **Exports** — official workbook, operational CSV, verification details, and
   future participant review packets.

`Overview` should not be a fifth tab. The small operational overview belongs at
the top of Review. `Judge results` is a filter or secondary view within Review,
not a competing top-level page called Sessions.

### Review screen order

1. Page title, competition identity, and one-line state.
2. Compact status strip: `Needs review`, `Ready`, `Finalized`, and `Total`.
   The first number is visually dominant because it determines the next action.
3. Quick status tabs: `Needs review`, `Ready`, `Finalized`, `All`.
4. Filter row: search, age group, participant category, judge/criterion, and
   clear filters. Advanced filters open on demand.
5. Grouped result list, defaulting to unresolved first and optionally grouped by
   Age Group + Category. Group headers show counts and may collapse.
6. Participant review detail in a wide drawer on large desktop or a dedicated
   page on narrower screens.

### Result-list fields

Desktop comparison columns:

| Field | Treatment |
| --- | --- |
| Participant | Name is primary; compact number and institution are secondary |
| Group | Age Group + Category; Muqarrar start as secondary context |
| Judge sections | criterion status summary, not raw session count |
| Proposed score | tabular number and maximum; blank when unresolved, never fake zero |
| Review state | text + shape/icon + colour, non-interactive |
| Last change | relative date with exact timestamp in detail |
| Row action | `Review` or `View`; visible without hover |

For 100–280 participants, normal rendering is sufficient; virtualization is not
needed. Use 40–60 rows per page or a clearly contained scroll region only after
a real-device performance check. Group collapse should remember state within the
current visit, and opening a result should not reset filters or scroll position.

### Participant review detail

The detail surface should contain:

1. participant identity, group, number, and result state;
2. required criterion checklist;
3. contributing judge sections with judge, revision, score, and received time;
4. calculation breakdown: starting mark, deductions, remaining mark, and total;
5. conflicts, reopened sections, and source changes in a prominent warning area;
6. mistake evidence and readable judging history;
7. revision history;
8. a finalization footer with a summary of what will be locked.

If multiple sources exist, compare them side by side only for the disputed
criterion. Do not force every participant through a wide comparison table. The
future audio/replay feature can attach to mistake evidence later without
changing this hierarchy.

### Finalization interaction

Replace the browser prompt with a designed confirmation step:

- show selected source revision for every required criterion;
- show calculated total and verification state;
- list any warning that remains allowed;
- require the confirmer name/identity only when the competition policy supports
  it;
- require a revision reason when superseding a previous final result;
- use explicit actions such as `Finalize result` and `Cancel`;
- after success, announce the new state and keep a route back to the result;
- retain the existing revision rather than overwriting it.

### Rankings

- Default to one Age Group + Category group at a time.
- Show the full ranking table as the source of truth.
- A restrained top-three strip may sit above it, but not as the only view.
- Use `1`, `1`, `3` ties exactly as the ranking engine does.
- Keep incomplete, conflicted, or stale results in a separate explanatory list;
  never mix them into placement order.
- Do not add an overall winner unless a competition rule explicitly defines it.

### Analysis

The initial analysis set should remain small:

1. mistake count and rate by criterion;
2. most repeated reviewed targets;
3. most marked letters/targets;
4. score distribution by a selected comparable group;
5. completion and review status over the competition, if operationally useful.

Each module must state:

- the active population and filters;
- count versus rate;
- the denominator or eligible exposure when a rate is shown;
- a one-sentence conclusion;
- access to the underlying rows or export.

Raw counts across unequal passages, categories, or judging exposure can be
misleading. Analysis may add normalized, clearly labelled rates, but it must not
change official marks or imply that AI has judged the recitation.

### Exports

Separate export intentions:

- **Final results workbook** — only current finalized results; verification
  summary and exclusions visible before download.
- **Judge-section CSV** — operational evidence, clearly not the final ranking.
- **Sample exports** — visibly separated from official exports.
- **Participant review packet** — future; evidence and mistakes for one
  participant, subject to review and privacy decisions.

The export action must show the exact scope and count before download. After
generation, show whether read-back verification passed. Permissions and future
central synchronization remain separate product decisions.

## Visual grammar

### Preserve from Tahqeeq

- the near-monochrome palette and warm `#f2f1ee` ground;
- white working surfaces and low shadows;
- Inter for UI and the dedicated Quran typeface for Quran text only;
- category colours as the main saturated colours;
- the 4px spacing system and existing 8/12px core radii;
- the brand mark and calm transition behaviour.

### Change for Results

- Add a real page header and a visible workflow state.
- Prefer section rules and grouped rows over a card for every number.
- Use one compact status strip rather than three oversized KPI cards.
- Use 28–32px for the page title, 18–21px for main section titles, 14–16px for
  readable body/row text, and no user-facing text below 12px.
- Use sentence case. Avoid 9px all-caps labels.
- Use tabular numerals for marks, ranks, participant numbers, and counts.
- Keep primary controls at least 40px high; use the existing 44px tap token for
  high-frequency or high-consequence actions.
- Use 52–60px desktop rows and comfortable two-line mobile cards.
- Prefer 1px rules, 8px corners, and almost no shadow in the ledger/table area.
- Reserve the firmer editorial treatment for the page header, group headers,
  ranking numerals, and report summaries.
- Always pair status colour with text and, where useful, an icon or border
  pattern.

### Proposed status language

| Internal condition | User-facing status | Suggested treatment |
| --- | --- | --- |
| Required section absent | Missing judge result | red-tinted warning + text |
| Multiple valid sources | Choose source | amber outline + comparison icon |
| Participant data incomplete | Participant details missing | amber outline + text |
| Complete, not final | Ready to finalize | green/teal outline + check icon |
| Current final result | Finalized | neutral dark text + check icon |
| Source changed after finalization | Review required | amber filled tag + refresh icon |
| Superseded result | Earlier revision | neutral tag; available in history |

Completed/finalized states should become visually quieter so unresolved work
retains attention.

## Older-user and accessibility requirements

W3C notes that older users may experience reduced contrast sensitivity, fine
motor control, concentration, and short-term memory. Existing WCAG guidance
covers most of these needs. For this screen:

- Target WCAG 2.2 AA across the full workflow.
- Provide at least 24×24px targets with spacing as a hard floor; use 40–44px for
  normal Results controls and important row actions.
- Maintain a clearly visible 2px or stronger focus indicator.
- Support keyboard operation for tabs, filters, disclosures, tables/list rows,
  source comparison, finalization, and dialogs.
- Do not require hover to reveal an action.
- Keep labels persistent; placeholders are not labels.
- Use consistent locations for filters, primary actions, warnings, and back
  navigation.
- Preserve user input and filter scope when validation fails or a detail panel
  closes.
- Provide a review/confirm/correct step before finalization and a visible
  revision path afterward.
- Keep charts understandable without interaction; provide a text conclusion and
  underlying data.
- Do not rely on colour alone for status or categories.
- Test at 200% zoom and the 320 CSS-pixel reflow equivalent. Any necessary wide
  table scroll remains inside the labelled table container.
- At narrow widths, remove sticky side panels or make them user-toggleable so
  they do not obscure content or focus.
- Use loading skeletons for known row shapes, useful empty states, and explicit
  stale/error/retry states.

## Dhivehi and RTL readiness

Adding Dhivehi does not inherently require duplicate components or a bloated
codebase. The expensive failure mode is adding it after layouts and strings have
been coupled to English and physical left/right positioning. Results is a good
place to establish the correct boundary before the rest of the app is
translated.

### Required architecture

1. Put display strings in a typed message catalog keyed by stable semantic IDs.
   Do not copy the Results component once per language.
2. Apply `lang="dv"` and `dir="rtl"` at the document or app root for Dhivehi.
   Direction is structural markup, not a CSS-only visual trick.
3. Replace physical layout properties in rebuilt Results CSS with logical
   properties such as `margin-inline-start`, `padding-inline`,
   `border-inline-start`, `inset-inline-end`, and `text-align: start/end`.
4. Keep data IDs, criterion IDs, category IDs, and status IDs language-neutral.
   Translate only their display labels.
5. Wrap mixed-direction values such as `47/50`, participant codes, revision
   numbers, and file names with `bdi`, `dir="auto"`, or a deliberate LTR numeric
   span so they do not reorder inside Thaana text.
6. Use locale-aware date and number formatting through `Intl`, then confirm with
   Maldivian users whether competition marks should keep familiar Western digits
   or use another local convention.
7. Start with Noto Sans Thaana as a technically complete open fallback, but make
   the production type choice only after a Dhivehi readability review. Test
   diacritics, line height, bold weights, table rows, tags, and small labels.
8. Maintain an approved glossary for competition and religious terms. Do not
   machine-translate or silently rewrite source-sensitive wording.
9. Mirror reading order and navigation where appropriate, but do not mirror
   numerals, score fractions, media controls, or semantic icons blindly.
10. Test English, Dhivehi, and mixed Dhivehi/Arabic/Quran content in the same
    participant detail. Quran text remains in its source-specific display layer.

W3C explicitly includes Dhivehi/Thaana among right-to-left use cases and
recommends `dir` markup plus logical CSS properties. Unicode CLDR has a `dv`
locale data set, and Noto provides a variable Noto Sans Thaana family. These are
the correct platform foundations; the final typography and competition terms
still need human Maldivian review.

## Responsive behaviour

### Desktop, 1180px and wider

- Review list and wide detail drawer can coexist.
- Keep the list at a useful comparison width; the drawer may occupy 44–52%.
- Persistent filters are acceptable, but do not make the entire page a fixed
  viewport application.

### Tablet and narrow desktop, 760–1179px

- Open participant detail as a near-full-width sheet or routed page.
- Keep only search and status filters visible; move the rest into `Filters` with
  an active count.
- Do not squeeze four criterion columns into unreadable tiles.

### Phone, below 760px

- Render each result as a semantic card: name, number/group, state, proposed
  score, missing/conflicting section summary, and one visible review action.
- Participant detail becomes a full page with a clear back action and preserved
  list scroll/filter state.
- Rankings use a card/list representation or a contained comparison table.
- Analysis uses single-column text-first modules.
- Export scope and verification remain readable without horizontal page scroll.

## Anti-patterns to reject

- KPI cards as the first and largest content on the page.
- A trophy-first podium that hides the full ranking and ties.
- Pie/donut charts for mistake categories when a ranked list is clearer.
- Decorative glass, gradients, neon, oversized radii, or floating layers.
- Dark mode as the only expression of “professional control room.”
- 9–11px grey metadata as the main carrier of meaning.
- Status shown only by colour.
- Hover-only row actions.
- A whole-page horizontal scrollbar.
- Deep accordion nesting for critical warnings or source conflicts.
- Collapsing all groups by default when unresolved work is hidden inside.
- More than one primary action in a row.
- An `Export` button whose visible filters do not match its actual dataset.
- A generic AI-generated insight without population, denominator, source rows,
  and human-verifiable calculation.

## Reversible implementation sequence

This research does not authorize implementation. When approved, build in
bounded passes:

### Pass 0 — checkpoint and fixtures

- Create a named rollback commit and capture current desktop/mobile screenshots.
- Preserve a fixture set covering empty, 100+, and 280-participant competitions;
  four criteria; missing sources; duplicates; conflicts; corrections; ties;
  sample data; export failure; and long English/Dhivehi names.

### Pass 1 — shell and Review queue

- Rename the destination, add page context and tabs, replace the icon/badge
  semantics, and move operational review above analysis.
- Build the responsive result list against existing selectors and calculation
  logic only.

### Pass 2 — participant review and finalization

- Introduce the list-to-detail surface and designed finalization/revision flow.
- Preserve current final-result types, source selection, recalculation, and
  revision history.

### Pass 3 — Rankings

- Move current placements into a dedicated group-first view.
- Test ties, exclusions, and all optional criterion configurations.

### Pass 4 — Analysis and Exports

- Reframe existing count modules with explicit scope and accessible tables.
- Create the export center around existing verified workbook/CSV functions.

### Pass 5 — RTL, responsive, and accessibility hardening

- Extract Results strings, add direction-safe layout, and test a reviewed sample
  of Dhivehi UI text.
- Complete keyboard, screen-reader, zoom/reflow, touch, print, and device checks.

Each pass must be separately reviewable and reversible. Presentation changes
must not rewrite stored results, scoring calculations, ranking rules, or export
contracts.

## Acceptance gates before publication

- The default screen makes the next unresolved action visible without scrolling
  on a normal laptop.
- A veteran user can distinguish judge-section results, proposed totals, and
  finalized results without training.
- Every participant state is understandable without colour.
- Name is the primary participant cue; number remains visible but secondary.
- All enabled criteria, including Adu / Raagu, fit without the three-column bug.
- Filters, list counts, analysis, rankings, and export scope agree.
- The list preserves scope and scroll position after participant review.
- Empty, loading, stale, error, retry, disabled, selected, focus, finalized, and
  revision-required states are designed and tested.
- No Results text is below the 12px token minimum.
- High-consequence controls use forgiving target sizes and visible focus.
- Desktop, tablet, phone, 200% zoom, and 320px-equivalent reflow pass.
- English and an RTL Dhivehi fixture produce the same information and actions.
- Existing result, ranking, workbook, backup, and migration tests pass unchanged.
- A production build passes, the exact commit is published, and the prior
  checkpoint remains available for reversal.

## Claude Code comparison brief

Claude Code can use this file directly for an independent challenge pass. Give
it the following request:

> Read `docs/RESULTS_SCREEN_DESIGN_RESEARCH.md`,
> `docs/RESULTS_SAFETY_PREPLAN.md`, `docs/PRE_QUESTION_BANK_RELEASE_PLAN.md`,
> `src/components/RecordsView.tsx`, `src/components/FinalResultsPanel.tsx`,
> `src/components/Header.tsx`, and the Results blocks in
> `src/styles/global.css`. Independently challenge the recommended Results
> direction. Do not implement anything. Return: (1) confirmed agreements,
> (2) specific disagreements with evidence, (3) up to six genuinely additive
> reference links, (4) overlooked product/data risks, (5) the strongest primary
> and reversible alternate direction, and (6) a proposed file-level
> implementation sequence that preserves all scoring, finalization, ranking,
> and export contracts. Label observations as Confirmed, Reasoned, or
> Unresolved. Do not reward visual novelty over judge usability.

The Claude comparison is deliberately not claimed as complete here because its
output is not yet present in this workspace. Merge it only where it brings new
evidence or exposes a concrete risk; do not average two opinions mechanically.

## Curated source set

### Competition operations and results

1. [Saudi Ministry Quran competition management system](https://moia.gov.sa/Systems/QuranCompetition/Pages/default.aspx) — candidates, competitions, judges, score forms, daily lists, winners, and reporting.
2. [Saudi King Salman competition rules, cycle 27](https://quran.moia.gov.sa/pdfs/file2.html) — multi-judge scoring, deductions, averages, ties, recording review, confidentiality, and score fields.
3. [Al-Azhar electronic competition documentation](https://azhar.eg/education/details/ArtMID/1141/ArticleID/99893/%D8%B1%D8%A6%D9%8A%D8%B3-%D8%A7%D9%84%D9%85%D9%86%D8%B7%D9%82%D8%A9-%D9%8A%D8%AA%D8%A7%D8%A8%D8%B9-%D8%AA%D8%B5%D9%81%D9%8A%D8%A7%D8%AA-%D9%85%D8%B3%D8%A7%D8%A8%D9%82%D8%AA%D9%8A-%D8%A7%D9%84%D9%82%D8%B1%D8%A2%D9%86-%D8%A7%D9%84%D9%83%D8%B1%D9%8A%D9%85-%E2%80%9C-%D9%88%E2%80%9D%D8%A7%D9%84%D8%B3%D9%86%D8%A9-%D8%A7%D9%84%D9%86%D8%A8%D9%88%D9%8A%D8%A9-%D8%A8%D8%A8%D9%86%D9%8A-%D8%B3%D9%88%D9%8A%D9%81) — stated accuracy, transparency, and fair-evaluation purpose.
4. [World Athletics WebCIS](https://cis.worldathletics.org/about/WebCIS%20product%20sheet%202024.pdf) — one competition information surface across schedule, entries, live detail, standings, official results, and printouts.

### Institutional and review patterns

5. [GOV.UK task list](https://design-system.service.gov.uk/components/task-list/)
6. [GOV.UK pagination](https://design-system.service.gov.uk/components/pagination/)
7. [USWDS process list](https://designsystem.digital.gov/components/process-list/)
8. [Carbon data table](https://carbondesignsystem.com/components/data-table/usage/)
9. [Shopify responsive table](https://shopify.dev/docs/api/app-home/web-components/layout-and-structure/table)

### Operational control and warm review

10. [Airtable record review](https://support.airtable.com/docs/interface-layout-record-review)
11. [Airtable dashboard layout](https://support.airtable.com/v1/docs/interface-layout-dashboard)
12. [Linear filters](https://linear.app/docs/filters)
13. [Linear custom views](https://linear.app/docs/custom-views)
14. [Linear Insights](https://linear.app/docs/insights)
15. [Stripe Dashboard basics](https://docs.stripe.com/dashboard/basics)
16. [Stripe dispute analytics](https://docs.stripe.com/payments/analytics/disputes)
17. [Stripe balance reporting](https://docs.stripe.com/reports/balance)

### Editorial data presentation

18. [GOV.UK dashboard guidance](https://brand.design-system.service.gov.uk/data/dashboards/)
19. [GOV.UK chart guidance](https://brand.design-system.service.gov.uk/data/charts/)
20. [USWDS accessible data visualizations](https://designsystem.digital.gov/components/data-visualizations/)

### Accessibility, responsive behaviour, and RTL

21. [W3C older users and accessibility](https://www.w3.org/WAI/older-users/)
22. [WCAG 2.2 target size guidance](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html)
23. [WCAG 2.2 reflow guidance](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html)
24. [WCAG use of colour guidance](https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html)
25. [WCAG error prevention for important data](https://www.w3.org/WAI/WCAG22/Understanding/error-prevention-legal-financial-data.html)
26. [W3C structural RTL markup guidance](https://www.w3.org/International/questions/qa-html-dir.html)
27. [MDN CSS logical properties](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Logical_properties_and_values)
28. [Noto Sans Thaana](https://notofonts.github.io/thaana/)
29. [Unicode CLDR Dhivehi locale summary](https://unicode.org/cldr/charts/49/summary/dv.html)

## Confidence and unresolved decisions

- **95%** — Results is the correct top-level name; `Records` is better retained
  as an internal/audit noun.
- **94%** — Review and finalization must precede analytics in the default flow.
- **92%** — the editorial verification ledger is the strongest direction for
  Tahqeeq's current visual system and professional context.
- **90%** — file-check/clipboard-check communicates the destination better than
  chart or trophy.
- **88%** — four top-level page destinations are enough; Overview should remain
  inside Review.
- **82%** — a large drawer is best on wide desktop; real-data testing may show
  that a dedicated detail page is better at all sizes.

Unresolved before implementation:

1. Who has finalization authority in the first real deployment?
2. Should unresolved badge count participants, blocking issues, or both? The
   recommendation is participants, with issue count inside the page.
3. Should filter scope persist across app restarts or only during the visit?
4. Which reviewed Dhivehi font and terminology set should ship first?
5. Which numeral convention is clearest to Maldivian judges for scores and
   participant numbers?
6. Does participant review remain a drawer at 1280px, or does user testing favour
   a dedicated page for greater concentration?

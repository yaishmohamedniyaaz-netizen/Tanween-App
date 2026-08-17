# Competition state and reciter handoff research

**Status:** research foundation for design exploration, not an approved implementation specification

**Prepared:** 17 August 2026

**Scope:** the judge-facing states before judging starts, between reciters, immediately after a question is prepared, and after the roster is complete

## Short verdict

The current problem is larger than uneven alignment. The same competition, judge,
criteria, category, queue and participant facts are repeated in several different
visual forms. This makes the idle rail, reciter picker and prepared state feel busy
while still leaving the judge unsure where to look first.

The most promising direction is a single operational hierarchy:

1. what state the competition is in;
2. who or what needs attention now;
3. the one action that advances the work;
4. details and exceptional controls only when they are needed.

This document deliberately offers several visual directions. Claude Code should use
them as starting hypotheses, inspect the app itself, perform additional research,
and produce comparable artifacts. It should not interpret this document as a rigid
pixel specification.

## What was inspected

### Live user journey

The public Tahqeeq build at
`https://tahqeeq-mobile.yaish.chatgpt.site` was operated with the real browser at
desktop width. The following path was clicked through without committing a
participant or changing competition data:

1. live waiting state in the Mushaf workspace;
2. Competition setup;
3. Select reciter;
4. Choose a question;
5. back to Select reciter;
6. close and return to the live waiting state.

The sample state had eight waiting participants, zero finished participants, Judge
1, four judging criteria, and Ahmed Rasheed as participant 01.

### Relevant implementation

- `src/components/CompetitionIdlePanel.tsx`
- `src/components/StartDialog.tsx`
- `src/components/ParticipantSelectionScreen.tsx`
- `src/components/QuestionNumberScreen.tsx`
- `src/components/PreparedSidebar.tsx`
- `src/styles/global.css`
- `src/App.tsx`

The existing studies in `docs/running-order-study.html` and
`docs/setup-flow-study.html` remain useful. The running-order study already compares
a tightened grouped list, two-column layout, table and search-first layout. A new
artifact pass should build on that work, not recreate it.

The existing `docs/DESIGN_GRAMMAR.md` also remains the local standard: one thing has
one home, important information is said once, colour carries meaning, and nothing
required becomes unreachable.

## Findings from the live click-through

### Verified: the idle rail has several competing starts

The live rail currently presents, in order:

- competition name;
- edition;
- Judge label, judge name and the full criteria list;
- separate Waiting and Finished cells;
- Prepare next reciter, with the participant number and name inside the button;
- View competition setup.

No one item is individually unreasonable. Together they form five distinct visual
blocks before the judge reaches the action. Long criteria text wraps independently
from the other rows, and the two-cell count block introduces a dashboard pattern
into what is primarily a next-action surface.

### Verified: the reciter picker repeats context before the decision

Before the first participant row, the live dialog repeats:

- competition name and test state;
- Select reciter and an explanatory sentence;
- This device, judge name, criteria and Change;
- waiting and finished counts;
- active category;
- then the recommended participant.

The judge's actual task is choosing the person. The competition and assignment are
useful guardrails, but their permanent visual weight is currently similar to the
decision itself.

### Verified: setup repeats its summary after readiness is already clear

The inspected setup showed `Prepare competition`, `8 of 8 ready`, a sequence of
locked/complete sections, and a review/start area that restates the competition,
categories, participants, panel, marks and questions. This gives the organizer
confidence, but the ready count, section states and review summary overlap. The
artifact pass should test a calmer completed setup state rather than only revising
the live rail.

### Verified: the prepared state contains product-explanatory copy

`PreparedSidebar.tsx` currently includes all of the following:

- “Prepared on this device”;
- “Check the passage, then begin”;
- an explanation that the draw is recorded and marking remains locked;
- another This device / judge / criteria block;
- “Ready · begin judging”;
- a note explaining that shared readiness will be added with future multi-device
  synchronization.

The final note describes implementation maturity, not the judge's immediate task.
The assignment is also repeated from the previous dialog and workspace context.

### Verified: the participant number is already rectangular in code

`.participant-number-badge` currently uses a 6px radius, 30px minimum width and
26px minimum height. It is not technically a full capsule. The perceived pill-like
quality is likely caused by the collection of small bordered/status shapes around
it and by inconsistent use across participant surfaces.

The number should be tested as a quiet reference ticket: rectangular, small corner
radius, tabular numerals, stable width and lower emphasis than the name. Participant
name remains the primary recognition cue.

### Verified: data and alignment structures vary by screen

The same participant is represented as:

- a small secondary line inside the idle primary button;
- a bordered recommended card with a separate Not here segment;
- a three-column queue row;
- a bordered strip above the question board;
- a different reciter chip in the prepared workspace.

This is a continuity problem as well as a spacing problem. The judge has to visually
re-identify the participant at every stage.

## Diagnosis

### 1. Repetition is being used as reassurance

Competition, assignment and participant context are repeated to prevent mistakes.
That intention is valid. The current implementation treats repetition itself as the
safety mechanism, however. A stable header, one persistent participant identity
component, and exception warnings can provide the same reassurance with less copy.

### 2. Metadata and actions use similar visual containers

Counts, participant numbers, statuses, recommended participants, assignments and
actions all appear in bordered or rounded shapes. When every fact looks actionable,
the eye cannot immediately distinguish reference information from controls.

### 3. The normal path carries exceptional controls

Changing the device judge or assignment is important, but it is not an ordinary
between-reciter action. Keeping Change beside every selection elevates a rare setup
escape route into the hot path. Missing or invalid assignments do need a prominent
blocking state; valid assignments do not need equal treatment.

### 4. The current states were composed separately

Idle, selection, question choice and prepared states each solve their local content
problem. They do not yet feel like one handoff sequence. A stronger design should
make participant identity, state, and next action visually continuous across the
sequence.

## Content hierarchy by state

This is a content model, not a prescribed layout.

| State | Judge's question | Essential now | Can be deferred | Primary action |
| --- | --- | --- | --- | --- |
| No competition | How do I begin? | Mushaf availability, start route | storage/device explanations | Prepare competition |
| Draft setup | What remains? | competition identity, readiness/progress | complete setup summary | Continue setup |
| Live, waiting | Who is next? | next participant, queue context | judge criteria when valid | Select/prepare reciter |
| Reciter selection | Is this the right person? | participant identity, number, category, queue | full competition and device detail | Choose participant/question |
| Question selection | Which question is drawn? | selected participant, question choices | repeated queue totals | Choose question |
| Prepared | Is the passage correct, and can I start? | participant, chosen passage, readiness action | device architecture explanations | Begin judging |
| Roster complete | What happens now? | completion, result/review route | queue mechanics | Review results |
| Competition closed | Where are the records? | closed state, results access | old live controls | View results |

## Information tiers

### Keep in the normal path

- next or selected participant name;
- participant reference number;
- category/muqarrar context when it prevents mistaken selection;
- waiting count, if it helps operational awareness;
- the action that advances the current stage;
- a clear exception when no valid judge assignment exists.

### Keep available, but not permanently repeated

- judge name and criteria;
- edition and test/sample state;
- finished count;
- setup/change-assignment route;
- full participant institution and secondary metadata.

Possible homes include the persistent workspace header, a judge-assignment popover,
the existing More menu, or a concise expandable detail region. The final home should
be chosen by artifact testing rather than assumed here.

### Show only for exceptions or setup

- no judge assigned;
- incompatible category or question;
- empty/restored roster;
- offline or synchronization conflict;
- device assignment changes;
- implementation/future-feature explanations.

## Alignment-specific test rules

These are guardrails for the artifacts, not a demand for one grid everywhere.

- Choose one alignment model inside each region. Do not mix a fixed key/value row,
  two dashboard tiles and a centered action in the same narrow rail without a clear
  reason.
- Give repeated participant rows a stable number column and a stable action edge.
  Names and contextual text may flex; reference numbers and actions should not jump.
- Use tabular numerals for participant, waiting, finished, judge and progress counts.
- Allow long judge/category/criteria text to wrap in a detail area. Do not let it set
  the alignment of the next-action block.
- Do not use fixed English label widths as the structural basis. Use logical inline
  properties and test a longer-language sample so future Dhivehi/RTL work does not
  require rebuilding the hierarchy.
- If a count is secondary context, keep it inline with its label (`8 waiting`). Use a
  metric tile only if the count itself is a primary thing the judge must monitor.
- Verify optical alignment, not only mathematical centering: the participant number,
  name baseline and row action should feel like one scan line.

## Participant number treatment

Treat the number as a reference, not an identity and not a status.

Promising properties to test:

- a 4–6px corner radius instead of a capsule;
- tabular numerals and stable inline size;
- enough width for `01`, `100` and larger values without changing row alignment;
- quiet neutral surface or border;
- no letter prefix in ordinary cases;
- name first in reading order, number in a consistent reference column;
- one implementation shared by idle, list, question and prepared states.

Do not use the participant number as the first or largest element unless user testing
shows judges primarily identify reciters by number.

## Design directions to prototype

These are intentionally distinct. Claude may combine them after comparison, but the
first artifact pass should keep them different enough to expose trade-offs.

### Direction A — Next-action rail

Recompose the idle and prepared rail around one participant identity block and one
primary action.

Possible shape:

- small state line: `8 waiting · 0 finished`;
- participant name as the dominant line;
- `[01] Under 14 · Hifz · Starting side` as quiet context;
- full-width `Choose question` or `Begin judging` action;
- `Not here` and `View setup` as lower-weight links/actions.

The competition identity can stay in the workspace header. The judge assignment can
be a compact header control or reveal. This direction best fits the current desktop
architecture and is the lowest-risk structural change.

Questions to test:

- Is the next participant too easily mistaken for already selected?
- Does one waiting count provide enough progress awareness?
- Can the same block survive long names and three-digit numbers?

### Direction B — Operational ledger

Make the reciter picker one aligned list rather than a recommended card followed by
a differently styled list.

Possible columns:

`number | name and context | state/action`

The recommended participant is simply the first row with a subtle recommendation
marker or stronger type. The whole row chooses the participant. `Not here` remains a
separate, clearly bounded action. Category headers can collapse the list without
changing column alignment.

This direction produces the strongest scan line and scales well from 8 to 40 or more
participants. It may feel more administrative, so typography and whitespace must
keep it humane and aligned with Tahqeeq.

Questions to test:

- Does a row-wide action make `Not here` unambiguous?
- Should finished participants remain visible, collapse, or leave this operational
  list entirely?
- Is a recommendation word needed, or is first position enough?

### Direction C — Two-zone handoff

Build on Candidate B in the existing running-order study:

- a stable next-participant/selected-participant zone;
- a bounded, scrollable running order beside it on wide screens;
- one-column reflow at compact widths.

This lets the judge confirm the expected reciter without losing access to an
out-of-order participant. It also creates space for category and absence actions
without crowding every row.

Questions to test:

- Does the fixed recommended zone hide the real length/order of the queue?
- Can the two zones preserve a clear single reading start?
- What happens when no participant is recommended?

### Direction D — Progressive command drawer

Keep the Mushaf and rail visually stable. Opening `Prepare next reciter` expands a
drawer/dock from the rail instead of launching a large centered modal. It first shows
the recommended participant and reveals search/groups on demand.

This can make the handoff feel like part of the workspace instead of a separate app
screen. It is the most architecturally adventurous direction and should be tested as
a genuine alternative, not assumed to be better.

Questions to test:

- Does it leave enough room for the Mushaf at 1024×768?
- Can focus trapping, scrolling and Escape/back behavior remain predictable?
- Is a drawer still usable for 40 or 280 participants?

### Direction E — Continuity component

This direction can be paired with A, B, C or D. Use the same participant identity
component throughout idle → participant selected → question selected → prepared.
Only its state label and action change. The number, name and context do not jump to a
new geometry at each stage.

This directly addresses the re-identification problem. It may also reduce code and
CSS duplication if implemented carefully after visual approval.

## Text-only state sketches

These sketches test content hierarchy before visual decoration. They are alternatives,
not final copy.

### Live waiting — concise operational

```text
8 waiting · 0 finished

Ahmed Rasheed                                      [01]
Under 14 · Hifz · Starting side

[ Choose question ]
Not here                             View setup
```

### Live waiting — more formal

```text
Next reciter

Ahmed Rasheed                                      [01]
Under 14 · Hifz · Starting side

[ Prepare reciter ]
8 participants waiting
```

### Live waiting — queue first

```text
Running order                              8 waiting

[01]  Ahmed Rasheed
      Under 14 · Hifz

[ Continue with Ahmed ]
View full order
```

### No competition

```text
The Mushaf is ready
Prepare a competition to begin judging.

[ Prepare competition ]
```

### Draft setup

```text
Tahqeeq Test Competition
6 of 8 setup steps ready

[ Continue setup ]
```

### Prepared

```text
Ahmed Rasheed                                      [01]
Question 7 · page 585

[ Begin judging ]
Change question                  Change reciter
```

No future synchronization note is needed here. If device confirmation becomes a
real multi-device requirement, it should return as a concrete status or exception.

### Roster complete

```text
All participants finished
8 of 8 completed

[ Review results ]
Close competition
```

### Closed

```text
Competition closed
Results and records remain available.

[ View results ]
Start another competition
```

## External research and how it translates

### Status, counts and labels need separate semantics

- [GOV.UK tags](https://design-system.service.gov.uk/components/tag/) are intended
  for status, not actions; their guidance recommends few statuses and notes that
  stronger filled tags can be mistaken for buttons.
- [Primer CounterLabel](https://primer.style/product/components/counter-label/)
  treats a number as a count attached to navigation or an action, while
  [Primer Label](https://primer.style/brand/components/Label/) is metadata/status.
- [Atlassian typography](https://atlassian.design/foundations/typography/applying-typography)
  separates metric styles for important standalone numbers from ordinary component
  text.

Translation for Tahqeeq: waiting/finished numbers, participant references, category
metadata and actionable controls should not share one generic pill language.

### Use aligned facts only when they are truly key/value facts

- [GOV.UK summary list](https://design-system.service.gov.uk/components/summary-list/)
  is for key/value facts and supports a distinct action column. It explicitly warns
  against using that pattern for simple task or item lists.
- [Carbon structured list](https://carbondesignsystem.com/components/structured-list/usage/)
  is designed for simple, scannable repeated information; selectable rows may make
  the whole row interactive.
- [Carbon contained list](https://carbondesignsystem.com/components/contained-list/usage/)
  distinguishes persistent on-page lists from temporary disclosed lists and advises
  moving to a structured list when multiple aligned columns are needed.

Translation for Tahqeeq: assignment details can use a compact key/value reveal;
participants should use a list/ledger with stable row geometry rather than a stack
of summary cards.

### Simplify the journey before adding progress chrome

- [GOV.UK task list](https://design-system.service.gov.uk/components/task-list/)
  advises simplifying a service before introducing a task list and limiting hint
  text to evidence-backed need.
- [GOV.UK complete multiple tasks](https://design-system.service.gov.uk/patterns/complete-multiple-tasks/)
  recommends related grouping and the smallest useful set of statuses.

Translation for Tahqeeq: setup progress belongs in setup. The ordinary live rail
does not need to reproduce a miniature setup/task summary.

### Operational systems foreground the work unit

- [Toast Kitchen Display System overview](https://doc.toasttab.com/doc/platformguide/platformKDSOverview.html)
  organizes the live surface around tickets and moves device configuration/status
  into dedicated controls.
- [Square KDS order completion](https://api.squareup.com/help/us/en/article/8171-complete-orders-with-square-kds)
  centers the operational unit and its completion/recall action.

These products are not visual templates for a Quran competition. They are useful
parallel evidence that device configuration should not compete with the next unit of
work during a time-sensitive handoff.

### Minimum accessibility floor

- [WCAG 2.2 target size guidance](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum)
  requires at least 24×24 CSS pixels or sufficient spacing for Level AA; Tahqeeq's
  own design grammar sets a more generous 44px live-control target.

Translation for Tahqeeq: a visually compact ledger may still use a row-wide 44px or
larger hit area. Compact appearance must not produce tiny adjacent actions.

## Flexible artifact brief for Claude Code

The following can be given directly to Claude Code. It intentionally asks for
independent judgment and further research.

> Inspect the current Tahqeeq implementation and operate the relevant local or
> deployed flow before designing. Read `docs/COMPETITION_STATE_AND_RECITER_HANDOFF_RESEARCH.md`,
> `docs/DESIGN_GRAMMAR.md`, and `docs/running-order-study.html`, then inspect
> `CompetitionIdlePanel.tsx`, `StartDialog.tsx`, `ParticipantSelectionScreen.tsx`,
> `QuestionNumberScreen.tsx`, `PreparedSidebar.tsx`, their state contracts, and the
> relevant CSS. Treat the new research document as hypotheses, not a locked brief.
>
> Build three or four deliberately different, self-contained artifact candidates
> for the complete judge handoff sequence, not only the reciter list. Include no
> competition, draft setup, live waiting, reciter selection, question selected,
> prepared, roster complete, and closed states. Reuse Tahqeeq's type, colour, spacing
> and surface character, but allow meaningful structural changes. Preserve the
> meaning of queue order, participant status, judge assignment, question draw and
> scoring data. Do not redesign backend/state semantics in the artifact.
>
> At least one candidate should explore a next-action rail, one an aligned
> operational ledger, and one a more substantial alternative such as a two-zone
> handoff or progressive drawer. Claude may add or replace a direction if further
> research reveals a better parallel. State what additional products/patterns were
> researched and which observations are evidence versus inference.
>
> Use the same realistic dataset in every candidate so differences are attributable
> to the design: long and short participant names, 2- and 3-digit participant
> numbers, long criteria text, categories, absence, finished state, missing judge,
> and roster sizes of 8, 40 and 280. Include 1-judge and multi-judge contexts without
> inventing synchronization behavior.
>
> Evaluate at 1440×900, 1280×800, 1024×768 and 390×844, in light and dark themes.
> Measure visible word count, repeated facts, number of controls before the primary
> action, scroll ownership, last-item reachability, targets below 44px, and how
> quickly the next action can be identified. Include keyboard order and focus states.
>
> End with a comparison memo: what each candidate retains, recomposes and removes;
> its strongest context; its failure mode; and the smallest reversible implementation
> slice that could be visually tested in the real app. Do not declare a winner solely
> from code or measurements. The artifact exists to support visual review.

## Artifact acceptance checks

Every candidate should make the following directly inspectable:

- where the eye lands first in every state;
- whether judge/criteria details remain discoverable after leaving the hot path;
- how a missing assignment blocks progress;
- how a recommended participant differs from merely selected or finished;
- how `Not here` avoids accidental activation;
- whether the participant identity stays visually continuous across stages;
- whether the last participant is reachable at each roster size;
- what changes at narrow width without making the desktop layout feel mobile;
- whether participant numbers behave consistently from `01` through `280`;
- whether the Mushaf remains visually primary whenever it is visible.

## Open design decisions

These should remain open until artifacts can be compared:

1. Is `Waiting` alone enough in the live rail, or do judges benefit from seeing both
   waiting and finished counts continuously?
2. Should valid judge assignment live in the workspace header, More menu, a popover,
   or a small reveal within the rail?
3. Should reciter selection remain a modal, become a rail/drawer, or vary by width?
4. Should the recommended participant have a separate zone or be the first row in
   the same ledger?
5. Which term is clearest: `Prepare next reciter`, `Select next reciter`, `Choose
   question`, or a context-dependent combination?
6. After the roster completes, should the dominant action be Review results, Close
   competition, or a controlled review/finalization step?
7. How much institution and category context do judges actually need to disambiguate
   two participants with similar names?

These are interaction/design decisions, not yet competition rules. If research
uncovers a choice that changes scoring, queue fairness, absence handling, judge
authority or result finalization, record that separately in
`docs/UNDECIDED_DECISIONS.md` rather than silently resolving it in UI.

## Suggested path after artifacts

### 1. Compare content before polish

Use the text-only states to agree on what is essential, discoverable and removable.
Do not choose shadows, borders or animation before this pass.

### 2. Compare the candidates at identical states and data

Review the same screenshot/state side by side. Include long criteria, missing judge,
out-of-order selection, absent participant and roster-complete cases.

### 3. Test with three operating perspectives

- an experienced competition judge who wants speed and predictability;
- an organizer who needs to recover from an exception;
- a user who needs larger, calmer controls and less dense secondary copy.

### 4. Choose one bounded real-app slice

The safest first implementation slice is likely the idle + prepared rail content
hierarchy, because it can be changed without replacing the running-order mechanics.
However, visual review may show that participant identity continuity requires the
idle rail and dialog row to be tested together.

### 5. Preserve reversibility

Keep the existing state transitions and event meanings. Introduce shared presentation
components only after a candidate is visually approved. Avoid a broad CSS cleanup in
the same change.

## Explicitly outside this research pass

- scoring rules or deduction behavior;
- queue order/fairness rules;
- absence policy;
- judge assignment authority;
- question draw/deck policy;
- multi-device synchronization implementation;
- result finalization policy;
- the active scoring controls and Mushaf typography.

Those areas may constrain the design, but this document does not change them.

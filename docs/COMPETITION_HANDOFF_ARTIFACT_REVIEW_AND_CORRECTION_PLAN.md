# Competition handoff artifact review and correction plan

**Status:** corrected baseline implemented and verified

**Reviewed:** 17 August 2026

**Artifact:** `docs/competition-handoff-study.html` and the attached copy supplied by the user

## Implementation outcome — 17 August 2026

Completed:

- the missing-assignment draw guard now prevents a question position from being
  recorded or spent without an immutable judge assignment;
- one shared participant-identity component now owns number formatting, name and
  context across the rail, running order, question stage and prepared state;
- the live rail opens the question board directly for the next reciter, with
  `Running order` and `Not here` kept as recovery actions;
- an all-absent queue returns to the running order instead of trapping the judge
  at Results;
- the prepared rail now contains only the participant, question/page, one primary
  `Begin judging` action and the two recovery actions;
- the running-order header and valid-assignment strip were removed, while the
  missing-assignment blocker remains explicit;
- category groups retain search, one-open-group collapse, queue order, absence and
  finished semantics;
- setup rows now use a stable aligned value column and one progress expression;
- the permanent sample-data explainer became a compact setup utility;
- arbitrary height animation and synthetic `scrollReserve` space were removed;
  Save/Cancel returns focus to the trigger and task switching uses
  `scrollIntoView({ block: "nearest" })`.

Verification:

- full automated suite: 263 passing tests;
- production build: passed;
- actual browser at 1528 × 675: idle/live/prepared rails, running order, real
  20-number board and setup accordion reviewed in the application shell;
- the question dialog measured 900 × 479 with no internal overflow;
- switching and collapsing a setup task kept the trigger at the same viewport
  position and left `scrollY` unchanged while document height contracted.

Deferred visual follow-up:

- visual matrix for 40- and 280-participant synthetic rosters and the supported
  compact viewport;

## Verdict

Claude found three real defects and one useful architectural principle, but the
artifact is not strong enough to choose a complete design.

Keep:

- the finding that the next reciter is visually buried at 10px;
- the inconsistent participant-number formatting finding;
- the missing-judge draw-consumption defect;
- a shared participant identity contract;
- the test data for long names, absent/finished participants and rosters of 8,
  40 and 280.

Do not accept:

- the candidate comparison as a verdict;
- the claim that the simulated viewport measurements represent the real app;
- the rejection of a drawer as settled;
- the idea that one candidate should govern the idle rail, selection dialog and
  prepared state;
- the artifact's continuing use of “this device” wording in the normal path.

The correction should combine the best parts of different directions:

1. a next-action rail for the ordinary next-in-order path;
2. an anchored next-reciter row plus the existing collapsible grouped queue for
   out-of-order selection;
3. the real question-board modal as its own stage;
4. one participant identity contract across all three;
5. a separate pass for the competition-setup accordion and its aligned counts.

## Evidence boundary

The artifact's complete HTML, CSS and JavaScript were inspected. Its attachment
matches the repo copy except for the final newline. The current Tahqeeq components
and state helpers were inspected alongside it.

The attached local HTML could not be opened by the browser security policy during
this review. Visual statements below are therefore limited to:

- the earlier live click-through of the deployed Tahqeeq app;
- the artifact's source-defined geometry and behavior;
- current repo source and CSS.

The artifact itself should still receive a real visual pass before it is archived,
but that will not repair the structural problems identified here.

## What Claude got right

### 1. The next participant is too weak in the current idle rail

Verified in `src/styles/global.css`: `.competition-start-reciter > span` is 10px,
reduced contrast, capped at 225px and truncated. The participant is the most
important operational fact in that state. Making the name a primary line is a
correction, not an aesthetic preference.

### 2. Participant-number presentation is inconsistent

Verified in `CompetitionIdlePanel.tsx`: the rail prints `next.number` directly.
Participant selection and question selection use `participantNumberLabel`, which
gives ordinary numeric values a two-digit minimum. The rail can therefore show `1`
while the dialog shows `01`.

This should be fixed through one presentation component/helper, not with local CSS.

### 3. A missing judge can consume a question draw

Verified in `StartDialog.tsx`:

- `chooseParticipant` advances to the draw stage without requiring an assignment;
- `drawPosition` dispatches `RECORD_DRAW` first;
- `prepareWithQuestion` then returns when `assignment` is absent.

That can leave a spent draw without a prepared recitation. This is a correctness
defect and must be fixed before the visual redesign. It is not an unresolved product
decision.

### 4. A shared identity contract is useful

Name, context and reference number should retain the same meaning and reading order
across idle, queue, question and prepared states. The component can have lead and row
density variants; “continuity” does not require pixel-identical geometry.

### 5. Large-roster and awkward-data cases belong in the test set

The long participant name, no-category participant, absent participant, finished
participant, three-digit references and 8/40/280 sizes are all worth preserving.

### 6. Result finalization should not be decided by UI copy

Whether a judge may close/finalize after the last reciter is an operations/authority
decision. The neutral UI action can be `Open results` until that rule is confirmed.

## Where the artifact is not reliable

### 1. It compares different surfaces as though they are alternatives

Candidate A is a 340px rail. Candidates B and C are 560px and 720px dialog-like
surfaces. Word count, height and focus order across those frames do not answer which
surface belongs in the actual app.

The correct comparison is within a surface:

- rail candidate versus rail candidate;
- dialog candidate versus dialog candidate;
- setup candidate versus setup candidate.

### 2. “Measured live” overstates what is measured

The viewport selector does not resize the real browser or mount candidates inside
Tahqeeq's shell. It changes fixed frame widths and subtracts a stored header/padding
formula from a selected number.

The 69px overflow number comes from `DESIGN_GRAMMAR.md`, not a fresh measurement of
the current shell. That note remains a useful warning, but it cannot decide a new
layout without remeasurement.

### 3. Candidate B does not implement its own thesis

The text describes one ledger whose first row is the recommendation. The code keeps
the recommendation outside `.ledger`, skips it from grouped rows, and leaves it
anchored while the ledger scrolls.

That implementation is actually closer to a useful solution, but it is not the
claimed single-ledger candidate. Its listed failure mode—losing the recommendation
when scrolling—is also false for the code as written because the recommended row is
outside the scroller.

Rename the useful idea: **anchored next reciter + grouped queue**.

### 4. The central question-selection state is missing

The brief required the whole handoff. The artifact defines a `board()` function but
never renders it. Choosing a participant jumps directly to `prepared`.

This removes the stage where participant continuity, back/change-reciter behavior,
spent question states, assignment guards and the 20-number board most need testing.

### 5. Search and category collapse are not tested

The search input has no filter handler. Category headings are static and cannot
collapse. Rendering 280 rows in a scroll region demonstrates neither findability nor
the category-collapse behavior the user requested.

The current app already has functional search and collapsible groups. A redesign must
not regress those behaviors.

### 6. Several metrics are mechanically weak

- `factRepeats` does not include the criteria string even though the prose cites
  repeated criteria.
- exact string repeats miss semantic repetition phrased differently;
- `[data-n]:last-of-type` can select the last matching row in an early group rather
  than the final participant;
- the “Before” result is misleading when the primary control is disabled;
- the unreachable-region detector can count intentional clipping/ellipsis without
  proving the user cannot reach an action;
- no assertion checks the actual bottom participant after scrolling a real scroller.

The metrics can assist review after they are fixed. They cannot replace visual and
interaction review.

### 7. Candidate C's Mushaf argument is unresolved

A modal overlays the Mushaf; a persistent pane allocates width beside it. Candidate C
does not specify which integration it represents. Therefore “competes with the
Mushaf” is not yet a valid reason to reject it.

It is not the safest first implementation, but it may remain a wide-screen artifact
candidate.

### 8. Rejecting the drawer is premature

A drawer could allocate layout width, overlay the workspace, or behave as a compact
dock. Only the first necessarily worsens the Mushaf width. The artifact did not build
or test these variants.

The drawer is deferred because the current modal can be improved with less risk, not
because the artifact proved it wrong.

### 9. Device wording remains in the proposed normal path

The artifact demotes the assignment but still says `Judged on this device by` and
repeats `This device` inside the disclosure. This conflicts with the user's request
to remove device-management language from ordinary judging.

Internal device assignment can remain in state. Normal UI should say nothing when
the assignment is valid. Missing assignment earns one concise exception surface.

### 10. The participant badge became slightly more pill-like

The current app uses a 6px radius. The artifact uses the shared 8px radius on a
32×26 shape. That is not a material improvement toward a quiet rectangular reference
ticket. Test a 4–6px radius instead.

### 11. Setup and post-competition states are under-designed

The artifact reduces no competition, draft, complete and closed states to generic
cards. It does not test them inside the real rail. It does not address:

- the setup accordion;
- aligned participant/category/judge/mark/question counts;
- the progress header;
- duplicate readiness indicators;
- the sample-data banner;
- collapse-induced page movement;
- the final review summary.

These are a separate and substantial part of the user's request.

## Retain, recompose, reject or defer

| Artifact idea | Decision | Grounded use |
| --- | --- | --- |
| A: next-action rail | Retain and recompose | Ordinary live and prepared rail only |
| B: operational ledger | Recompose | Anchored next reciter plus current collapsible grouped queue |
| C: two-zone handoff | Defer | Wide-dialog artifact after the corrected baseline exists |
| D: progressive drawer | Defer, not reject | Optional later artifact; no first implementation |
| E: continuity component | Retain | Shared content contract with lead/row density variants |
| Standalone state cards | Reject as proof | Rebuild inside the real rail/shell |
| Simulated comparison metrics | Reject as approval evidence | Replace with actual-browser, actual-shell checks |
| Missing-judge blocker | Retain, rewrite | Fix state defect first; show concise assignment-required copy |

## Corrected product architecture

Do not seek one winning candidate. Give each surface one job.

### Surface 1 — competition setup

Owns competition identity, categories, participant import, marks, judging panel,
question rules, draft questions and launch review.

It is the only normal place to change judge/device assignment.

### Surface 2 — idle and prepared rail

Owns the immediate handoff:

- next or selected participant;
- waiting progress;
- current question when prepared;
- one primary action;
- one or two secondary recovery actions.

It does not repeat the full judge criteria or device explanation.

### Surface 3 — running-order dialog

Owns out-of-order participant selection, category collapse, search, absence handling
and visibility of the remaining roster.

### Surface 4 — question-selection dialog

Owns the selected participant, 20-number board, spent/unavailable states, external
question option and back/change-reciter route.

### Surface 5 — active judging workspace

Remains outside this change except for receiving the same participant identity data.
Scoring, Mushaf geometry and mistake logging are protected.

### Surface 6 — complete and closed states

Own neutral result access. They do not silently decide who may finalize or close an
official competition.

## Shared participant identity contract

Create one presentation component or strict shared primitive with these fields:

- participant name — primary recognition cue;
- participant reference number — quiet rectangular ticket;
- institution/category/Muqarrar-start context — secondary and truncatable;
- optional state word — `Next`, `Selected`, `Finished`, `Not here`;
- density — `lead`, `row`, `compact`;
- number label supplied by `participantNumberLabel` everywhere.

Visual rules:

- name precedes the number in accessible reading order;
- list rows may place the number in a leading scan column, but name keeps stronger
  weight;
- 4–6px reference-ticket radius;
- tabular numerals and stable width for `01`, `099`, `100`, `280`;
- no colour unless the word represents a real state;
- no pill treatment for institution, category or ordinary counts.

## Final content decisions for the first implementation

These are decisions for the implementation baseline. They can still be refined after
visual review without changing state semantics.

### No competition

```text
Mushaf ready
Prepare a competition to begin judging.

[ Prepare competition ]
```

Remove `Browse freely` because the visible Mushaf already makes browsing obvious.

### Draft competition

```text
{Competition name}
{completed} of 8 setup steps ready

[ Continue setup ]
```

Do not repeat edition, judge and criteria in this rail state.

### Live, waiting

```text
Next reciter                              8 waiting

Ahmed Rasheed                                  [01]
Under 14 · Hifz · Starting side

[ Choose question ]
Running order                         Not here
```

The ordinary `Choose question` path opens the question stage for the displayed next
participant. `Running order` opens participant selection. The question stage retains
a visible `Change reciter` route.

This removes a redundant confirmation step without hiding recovery.

### Missing judge assignment

```text
Judge assignment required
Choose the judge and criteria before drawing a question.

[ Open competition setup ]
```

Do not mention a consumed draw in user-facing copy. Prevent it in code.

### Prepared

```text
Ahmed Rasheed                                  [01]
Question 7 · page 585

[ Begin judging ]
Change question                      Change reciter
```

Remove:

- `Prepared on this device`;
- the paragraph explaining locked marking;
- the repeated assignment card;
- the future synchronization note;
- `Ready ·` from the button label.

### Roster complete

```text
All participants finished
8 of 8 completed

[ Open results ]
View competition setup
```

Use `Open results` until result finalization authority is confirmed.

### Closed

```text
Competition closed
Results remain available.

[ View results ]
```

Starting a new competition belongs in setup/competition operations, not as an equal
rail action beside results.

## Corrected running-order dialog

The first implementation should use the low-risk combination of A and B:

### Header

- title: `Running order`;
- no competition kicker;
- no `Select the next person...` helper sentence;
- no valid-assignment/device strip;
- close button remains.

### Anchored next-reciter row

- same identity component as the rail;
- one `Next` state word;
- whole main row selects and advances to question selection;
- separate 44px-or-larger `Not here` action;
- remains visible while the grouped queue scrolls.

### Queue

- retain current category grouping and one-open-group behavior;
- active category expanded initially;
- other categories collapsible;
- retain functional search above the current threshold;
- align participant number, name/context and state/action columns;
- preserve actual queue ordering and absence/finished semantics;
- do not render a fake flat 280-row list as the finished design;
- test whether finished rows should be hidden behind a reveal, but do not change
  their visibility contract in the first visual pass.

### Question stage

- render the real 20-number board;
- show the same selected participant identity at the top;
- keep `Change reciter`/Back;
- preserve spent and manual-question behavior;
- remove repeated competition and assignment text;
- defensively prevent any draw dispatch without a valid assignment.

## Corrected competition-setup design

The current accordion architecture is worth keeping. Its hierarchy and motion need
recomposition.

### Header

- use one heading: `Prepare competition` for a new draft, otherwise the competition
  name with a quiet `Setup` context label;
- keep a single progress expression: bar plus `{n} of 8 ready`;
- remove the explanatory sentence after the first-use guide exists;
- replace the permanent sample-data banner with a compact Sample badge and a
  secondary load/remove-sample action in setup utilities;
- do not repeat fictional-data disclaimers throughout the normal setup path.

### Checklist row grid

Use one stable row structure:

```text
[state mark]  Task label / short context        value or issue       [chevron]
```

Examples of aligned values:

- Categories — `4`;
- Participants — `8`;
- Marks and criteria — `100 / 100`;
- Judging panel — `1 judge`;
- Question rules — `Manual · 10 lines`;
- Draft questions — `20 drafts`;
- Review and start — `Ready` or `3 issues`.

Rules:

- tabular numerals in the value column;
- no pills for ordinary counts;
- the completion check replaces redundant `Ready` text on ordinary rows;
- incomplete rows use an issue count or `Needs setup`, not a second decorative dot;
- locked live rows use a lock/state word only where it helps;
- long competition names stay under the task label instead of widening the value
  column;
- mobile keeps the value reachable and moves long context below the label.

### Accordion behavior

The current `scrollReserve` calculation manufactures blank document height to keep
the viewport from moving. That is likely contributing to the orientation/glitch
feeling.

Replace it with:

1. one active task at a time;
2. no animated height transition for arbitrarily tall forms;
3. a short opacity/chevron transition only;
4. after switching, keep the clicked trigger in view with `block: nearest` only if
   it would otherwise leave the viewport;
5. after Save/Cancel, return focus to the task trigger;
6. no synthetic scroll-reserve spacer;
7. no automatic page jump when a task collapses above the viewport;
8. reduced-motion behavior with no transition.

This prioritizes spatial stability over a decorative accordion animation.

### Review and start

Retain the final review because it is a genuine safety step, but use aligned summary
rows rather than mini cards:

```text
Competition       Tahqeeq Test Competition       Change
Categories        4                              Change
Participants      8                              Change
Judging panel     1 judge                        Change
Marks             100 / 100                      Change
Questions         Manual · 10 lines              Change
Draft questions   20                             Open
```

Short details may appear below the value when they prevent a mistake. Remove generic
phrases such as `Validated roster loaded` when the count/check already communicates
success.

Keep readiness issues actionable. Keep launch/close/new-competition actions below
the summary, not mixed into checklist rows.

## Implementation sequence

### Phase 0 — correctness gate

Files:

- `src/components/StartDialog.tsx`
- `scripts/question-deck.test.mjs`
- `scripts/competition-workspace.test.mjs`

Changes:

1. guard `chooseParticipant`, manual preparation and `drawPosition` with a valid
   assignment at the appropriate layer;
2. never dispatch `RECORD_DRAW` before all preparation preconditions pass;
3. show the concise assignment-required state;
4. add regression coverage proving a missing assignment cannot consume a position
   or create a draw.

Acceptance:

- no spent question without a prepared recitation;
- no silent no-op after pressing a question number;
- valid assignments preserve the current draw contract.

### Phase 1 — presentation foundation

Files:

- new shared participant identity component under `src/components/`;
- `src/lib/participantPresentation.ts`;
- `src/components/CompetitionIdlePanel.tsx`;
- `src/components/ParticipantSelectionScreen.tsx`;
- `src/components/QuestionNumberScreen.tsx`;
- `src/components/PreparedSidebar.tsx`;
- `src/components/PreparedRecitationStrip.tsx` if its duplicate identity is retained;
- `src/styles/global.css`.

Changes:

1. centralize participant number formatting;
2. add lead/row/compact identity variants;
3. standardize number width and rectangular treatment;
4. preserve accessible reading order and truncation behavior.

Acceptance:

- participant 1 is `01` everywhere in an 8-person roster;
- participant 100 fits without changing row geometry;
- name remains visually primary;
- no participant identity is rendered below the local type floor.

### Phase 2 — idle and prepared rail

Files:

- `src/components/CompetitionIdlePanel.tsx`;
- `src/components/PreparedSidebar.tsx`;
- `src/App.tsx` only if the normal-path action needs an initial dialog stage;
- `src/styles/global.css`.

Changes:

1. implement the state copy defined above;
2. make the next/selected participant the rail's visual anchor;
3. provide the direct next-in-order `Choose question` path;
4. add `Running order` and `Not here` recovery actions;
5. remove valid-assignment/device/future-sync copy;
6. implement complete and closed rail states without deciding finalization authority.

Acceptance:

- one obvious primary action in every rail state;
- no repeated judge/criteria block in the normal path;
- no important name inside a 10px secondary button line;
- idle and prepared states fit the supported desktop shell without page scroll.

### Phase 3 — running order and question selection

Files:

- `src/components/StartDialog.tsx`;
- `src/components/ParticipantSelectionScreen.tsx`;
- `src/components/QuestionNumberScreen.tsx`;
- `src/lib/rosterQueue.ts` only if presentation needs a new derived view;
- `src/styles/global.css`;
- `scripts/roster-queue.test.mjs`;
- `scripts/question-deck.test.mjs`.

Changes:

1. remove duplicate header/helper/device content;
2. preserve the anchored recommended participant outside the queue scroller;
3. retain functional search and collapsible groups;
4. align the row columns;
5. render and test the real question board as part of the sequence;
6. preserve back/change-reciter, manual question, spent question and absence behavior.

Acceptance:

- the next participant remains visible while a long queue scrolls;
- every participant remains reachable at 8, 40 and 280;
- search actually filters;
- active category opens and other categories collapse;
- `Not here` cannot be mistaken for row selection;
- keyboard focus follows the visual sequence;
- missing assignment never exposes an active draw board.

### Phase 4 — competition setup

Files:

- `src/components/CompetitionSetup.tsx`;
- `src/styles/competition-setup-v2.css`;
- supporting setup tests under `scripts/`;
- `docs/UNDECIDED_DECISIONS.md` only for newly discovered authority/rule questions.

Changes:

1. replace string-only `taskSummary` output with structured label/value/status data;
2. align task values and remove redundant Ready text;
3. simplify the setup header and sample controls;
4. remove `scrollReserve` and large height animation;
5. restore focus/viewport stability on open, close, Save and Cancel;
6. recompose the review summary into aligned facts and actions;
7. keep the current eight setup contracts and one-open-task behavior.

Acceptance:

- participant, category, judge, mark and question values share a stable scan edge;
- opening/collapsing a task does not rotate or jump the user's reading position;
- no synthetic blank spacer remains;
- every setup task and final launch action is keyboard reachable;
- incomplete and complete states remain distinguishable without relying on colour;
- 1024×768 has no unintended page-level horizontal overflow;
- mobile reflows without hiding the task's essential value.

### Phase 5 — actual-shell visual validation

Do not approve from a standalone study page.

Test the real app at:

- 1440×900;
- 1280×800;
- 1024×768;
- 768×1024;
- 390×844;
- light and dark themes;
- 8, 40 and 280 participants;
- 1 and 4 judges;
- short and long names/categories;
- valid and missing judge assignments;
- draft, live, prepared, complete and closed states.

Checks:

- actual browser viewport, not a simulated number toggle;
- no page-level horizontal overflow;
- explicit scroll owner for every long list;
- final participant verified by scrolling to the real element and checking its
  intersection with the scroller;
- 44px live controls;
- visible focus and sensible tab order;
- no clipped primary/secondary action;
- Mushaf size unchanged by a modal opening;
- setup trigger remains spatially stable when another task opens;
- no console errors or React warnings.

### Phase 6 — release discipline

1. run scoped tests during each phase;
2. run `npm.cmd test` and `npm.cmd run build` at integration;
3. inspect the final diff for accidental scoring, roster, question or Mushaf changes;
4. update the implementation log and this plan with completed/remaining items;
5. obtain visual approval on the deployed preview;
6. only then commit, push and publish.

## Corrected artifact work before implementation

If another artifact pass is desired, do not revise the existing page into a fourth
all-in-one comparison. Produce three small studies:

### Study A — rail states in the actual shell

Compare two or three rail compositions for no competition, draft, live waiting,
missing judge, prepared, complete and closed. Keep the Mushaf visible at its real
size.

### Study B — handoff dialog

Compare:

1. anchored next reciter + grouped queue;
2. true single ledger;
3. wide two-zone modal.

All must include functional search, collapsible groups, the real question-board
stage and full back/change-reciter behavior.

### Study C — setup accordion

Compare:

1. the corrected single-column accordion;
2. a wide two-pane setup layout as a genuine alternative.

Both use the same eight tasks and must demonstrate open, switch, Save, Cancel,
ready, live-locked and closed states without scroll jumps.

Each study should report retain/recompose/remove decisions. Measurements support the
review; visual approval chooses the implementation.

## Protected behavior

The correction must not change:

- scoring categories, marks or increments;
- queue fairness/order semantics;
- absence meaning;
- question-deck randomness or spent-position rules except fixing the invalid
  missing-assignment dispatch;
- prepared-recitation replacement history;
- judge authority or result-finalization rules;
- Mushaf typography, page geometry or zoom;
- mistake evidence and correction history.

## Definition of done

This update is complete only when:

- the missing-assignment draw defect is covered and fixed;
- participant identity and number formatting are consistent;
- the ordinary next-reciter path is one clear action;
- running order remains searchable, collapsible and scalable;
- question selection is part of the tested handoff;
- valid device/judge explanations no longer occupy the hot path;
- setup counts align and redundant readiness copy is gone;
- accordion switching is spatially stable;
- complete/closed states are concise without inventing authority;
- the real app passes interaction, build and visual review at the target viewports.

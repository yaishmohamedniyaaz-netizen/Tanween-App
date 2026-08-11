# Pre-question-bank release plan

Status: full implementation plan; no runtime changes in this planning pass  
Date: 2026-08-11  
Product boundary: a judging app; participants see only the Mushaf

## 1. Outcome

Before building the question bank, Tahqeeq should finish the reliable judging
and competition-results foundation already in progress.

The release order is:

1. polish the letter tray and remove the unwanted “Your section” wording;
2. create durable competition and participant setup, including a downloadable
   participant workbook;
3. allow safe judge-assignment handoffs during a recitation;
4. collect separate judge results without mixing or losing them;
5. verify and finalize results;
6. calculate placements and produce a checked spreadsheet;
7. harden recovery, offline behaviour, and migrations;
8. then begin Question Bank V1.

These are separately publishable checkpoints under one roadmap. A checkpoint
does not wait for every later feature, and each has its own rollback point.

## 2. Checkpoint P0 — tray and judging-screen cleanup

This is the next immediate implementation turn.

### Visible changes

- A one-target word gets one centered `44 x 44px` target inside a compact
  `52 x 52px` tray rather than an empty two-column-looking surface.
- Jali, Khafi, and Fasaha active/focus rings follow the complete rounded shape,
  including both exposed upper corners.
- The complete printed word remains lightly selected; the exact target remains
  strongly selected in the connected rail.
- Delete the visible words **Your section** from the live score card and finish
  dialog.
- The score card shows the number directly, such as `28 / 30`, with an
  accessible but visually quiet `Score` label.
- The finish dialog shows `28` and `Out of 30`, followed by the existing judge
  name and assigned criteria.

### Important wording boundary

Only the unwanted visible phrase is removed. Internal records must still know
that one judge's saved score is not necessarily the competition's final score.
Terms such as `judge-section` may remain in data, exports, administrator review,
and technical diagnostics until final combining is implemented.

### Files likely involved

- `src/lib/selectorLayout.ts`
- `src/components/DragMenu.tsx`
- `src/styles/global.css`
- `src/components/ScorePanel.tsx`
- `src/components/FinishDialog.tsx`
- selector layout, contract, interaction, and screenshot tests

### Exit gate

- one target is centered and compact at every supported viewport;
- no active or focus ring misses or crosses a rounded corner;
- upward and downward trays both pass;
- the exact target remains unmistakable through preview and commit;
- the exact phrase `Your section` no longer appears in runtime UI source;
- QPC fonts, page lines, Arabic target meaning, deductions, and saved history
  have no unintended change.

## 3. Checkpoint P1 — competition and participant setup

This creates the stable setup that every later result and question can use.

### Competition setup

One saved competition setup contains:

- competition name and edition;
- custom divisions, such as age groups;
- custom tracks, such as Hifz or reciting while looking;
- participant roster;
- judge seats and assigned criteria;
- starting marks and deduction values;
- a stable internal identity for the competition, every participant, and every
  attempt.

The interface can offer common starting examples, but divisions and tracks
remain editable because competition structures differ.

### Participant template in Settings

In **Settings → Competition setup → Participants**, place a secondary action
beside the upload area:

> Download participant template (.xlsx)

The download works offline and produces
`Tahqeeq-participant-template.xlsx` with:

#### Sheet 1 — Participants

| Column | Requirement | Meaning |
|---|---|---|
| Participant number | strongly recommended and unique within the competition | the number shown to judges and organizers |
| Name | required | participant's display name |
| Division | optional until configured | age group or other competition division |
| Track | optional until configured | Hifz, reciting while looking, or a custom track |
| Group / Island / Class | optional | local organizer grouping |

The sheet contains headers and formatted empty rows, but no fake participant
row that could accidentally be imported.

#### Sheet 2 — Read me

- one short example that is clearly outside the import sheet;
- which columns are required;
- accepted file types;
- a warning that participant numbers should not be reused;
- plain instructions for divisions and tracks;
- the template version.

No macros, formulas, external links, hidden participant information, dates of
birth, phone numbers, or other unnecessary personal data should be included.

### Import behaviour

- Continue accepting `.xlsx`, `.xls`, and UTF-8 `.csv`.
- Read common header aliases, but show the canonical headers in the template.
- Preview the result before replacing the current list.
- Show accepted rows, warnings, rejected rows, missing names, unknown divisions
  or tracks, and duplicate participant numbers.
- Never merge two people because their names look similar.
- Never replace the active roster until the organizer confirms the preview.
- Generate stable internal participant IDs even when a visible number is
  missing; warn that a missing number makes external matching harder.
- Keep an imported source snapshot and template/parser version in the
  competition pack.

### Workbook verification

The template generator must read its own produced workbook back and confirm:

- both expected sheets exist;
- every canonical header is present once;
- the empty Participants sheet imports as zero people rather than an error or a
  fake participant;
- representative Unicode names survive unchanged;
- no cell contains an unexpected formula;
- opening and saving through supported spreadsheet software does not change the
  imported meaning.

### Exit gate

A new organizer can download the sheet, enter a roster, upload it, review any
problems, and create one stable competition setup without manually guessing the
column names.

## 4. Checkpoint P2 — change judge responsibility during recitation

The currently disabled **Change** action becomes available while judging, but
it does not rewrite history.

### Before any mistake is recorded

- Allow the active judge and criteria assignments to be corrected.
- Record an assignment correction event.
- Keep the attempt's starting marks and deduction values frozen.

### After mistakes are recorded

- Use the wording **Change from now**.
- Close any open letter tray before showing assignment controls.
- Confirm plainly that earlier marks keep their current owner.
- Save the old and new assignment, the time, event order, and optional reason.
- Give later mistakes the new assignment-version ID.
- Reject a change that leaves a criterion unassigned or assigned twice.
- Do not allow deduction values to change in the middle of an attempt.

### Judge-facing display

The role strip always shows the assignment active now. After a handoff, a small
history action reveals who judged each earlier portion. The normal judging view
does not become an administrator dashboard.

### Finish behaviour

Finishing preserves separate judge-owned portions under one participant
attempt. It cannot silently add unlike judge sections together. The next
checkpoint decides how those portions are transferred and selected for an
official result.

### Exit gate

Refresh, undo, restore, reopen, and finish all preserve the exact handoff point,
and no earlier mistake changes judge, criteria, amount, or source target.

## 5. Checkpoint P3 — collect judge results safely

Every judge device uses the same competition pack. Every finished judge result
refers to the same competition, participant, attempt, rule set, and assigned
criteria.

Start with offline-friendly files that can be shared through the device's normal
share menu. Live synchronization and accounts are later.

Import checks:

- correct competition and edition;
- known participant and attempt;
- expected judge seat and criteria;
- matching scoring rules and data versions;
- complete readable event history;
- missing, duplicate, revised, or conflicting result.

Nothing is overwritten automatically. Conflicts appear side by side for an
administrator to choose.

### Exit gate

Wrong-competition, wrong-rule, duplicate, missing, and corrupted submissions
all stop finalization with a clear explanation.

## 6. Checkpoint P4 — review and finalize

The administrator sees each required criterion and who supplied it:

```text
Jali      Received · Judge 1 · 47 / 50
Khafi     Received · Judge 2 · 28 / 30
Fasaha    Missing

Final result unavailable — Fasaha is required.
```

When all required results exist, Tahqeeq recalculates totals from the saved
mistake events. It never trusts a typed or imported total by itself.

Finalization records:

- selected judge-result revisions;
- each starting mark and deduction total;
- warnings and resolved conflicts;
- the administrator confirmation;
- a verification manifest.

A later correction creates a new visible revision with a reason. It does not
erase the previous finalized result.

### Exit gate

Every finalized total can be reconstructed independently from its chosen judge
histories.

## 7. Checkpoint P5 — placements and verified spreadsheet

Only complete, finalized results enter rankings.

The organizer chooses the tie rule before ranking. Without a configured rule,
equal scores remain tied; Tahqeeq does not invent an order.

The result screen and `.xlsx` workbook include:

- first, second, and third place per division and track;
- participant number, name, division, track, criterion scores, and final total;
- ties, disqualifications, withdrawals, and incomplete results shown clearly;
- optional overall winner only when the competition rules define how unlike
  divisions or tracks can be compared;
- a verification sheet containing the competition/rule versions, warnings,
  result counts, and check totals.

Tahqeeq exports fixed checked values, then reads the workbook back and verifies
identities, scores, placements, and totals. Spreadsheet formulas are not the
source of truth.

### Exit gate

Golden test competitions covering ties, duplicate imports, missing judges,
corrections, disqualifications, and mixed divisions reproduce their expected
placements after workbook re-import.

## 8. Checkpoint P6 — pre-question-bank hardening

Before adding questions, complete the reliability work most likely to protect a
real competition:

- one-file backup and restore for competition setup, roster, active attempts,
  histories, and finalized results;
- readable migration report when an older app version is opened;
- storage-space and failed-save warnings;
- offline restart and service-worker upgrade tests;
- slow-phone page switching and tray interaction regression tests;
- keyboard and screen-reader checks for judge controls;
- clear audit-history filters by participant, judge, criterion, and revision;
- print-friendly finalized result review;
- real-device rehearsal of a small competition from setup through winners.

Optional exact mistake descriptions may enter here only if a qualified
recitation reviewer has approved the taxonomy and fixtures. The underlying data
can reserve a versioned optional detail field earlier, but the app must not ship
an unreviewed list as religious authority.

### Exit gate

A rehearsal can recover from refresh, offline use, an interrupted import, an
incorrect judge handoff, a corrected result, and a device backup without losing
or silently changing official evidence.

## 9. What deliberately stays after Question Bank V1

The request to fit in as much as possible must not turn into an endless delay.
These remain later research or platform work:

- automatic pronunciation or tajweed scoring;
- AI-suggested mistake types;
- audio recording and near-word replay bookmarks;
- live multi-device synchronization and user accounts;
- trusted server timestamps and organization signatures;
- reviewed pixel masks for individual targets inside QPC whole-word glyphs;
- a participant-facing application. Participants continue to see only the
  selected Mushaf surface when a competition displays it to them.

These features are valuable, but none is required to make the first question
bank sit on top of safe participant, judging, and result identities.

## 10. Question Bank V1 begins after P6

The question bank can then safely reuse:

- stable competition, division, track, participant, and attempt identities;
- the accepted QPC page renderer and exact source anchors;
- reliable judge assignments and event history;
- finalized results and audit exports;
- the tested backup and migration system.

Question Bank V1 then adds reviewed passage start/stop points, an organizer
builder, frozen tile draws, repetition controls, passage masking, and a small
approved starter bank without reopening the foundations above.

## 11. Delivery and rollback order

| Order | Checkpoint | Expected size | Publish independently? |
|---:|---|---|---|
| 1 | P0 tray and wording | one focused turn | yes |
| 2 | P1 competition setup and participant template | one to two substantial turns | yes |
| 3 | P2 active judge handoff | one substantial turn | yes, after migration tests |
| 4 | P3 safe result collection | two or more substantial turns | yes |
| 5 | P4 review and finalization | one to two substantial turns | yes |
| 6 | P5 placements and checked workbook | two substantial turns | yes |
| 7 | P6 hardening and rehearsal | one or more verification turns | yes |
| 8 | Question Bank V1 | separate initiative | after P0–P6 |

Before each checkpoint:

1. create a named rollback commit or branch;
2. capture representative state and screenshots;
3. add failing tests for the current defect or missing contract;
4. implement only that checkpoint;
5. run scoped tests, TypeScript, production build, migration checks, and visual
   comparison where relevant;
6. publish the exact verified commit;
7. keep the previous public version available for reversal.

## 12. Decisions locked by this plan

- The exact visible phrase `Your section` is removed in P0.
- The participant template is an offline `.xlsx` download inside participant
  settings, not a separate website.
- Participant names are not used as unique identity.
- Mid-recitation assignment changes apply forward only.
- Deduction amounts do not change mid-recitation.
- Judge-owned results remain separate until the administrator verifies them.
- Missing results are not zero.
- Ties remain ties unless an explicit competition rule resolves them.
- Spreadsheet formulas are not official truth.
- Participants do not receive a second control interface.
- The question bank starts only after the practical P0–P6 reliability gates.

## 13. Confidence

| Decision | Confidence |
|---|---:|
| P0 can be implemented safely in one focused turn | 95% |
| A participant template belongs with the durable competition setup | 96% |
| Removing the visible phrase does not require changing saved result meaning | 99% |
| Assignment handoffs require forward-only versions | 98% |
| Results Safety should finish before Question Bank V1 | 94% |
| P0–P6 can ship without replacing the current Mushaf renderer | 96% |
| Every optional future feature should be forced in before the question bank | 25% |

## 14. File-level implementation map

| Checkpoint | Main code areas |
|---|---|
| P0 | `selectorLayout.ts`, `DragMenu.tsx`, selector CSS, `ScorePanel.tsx`, `FinishDialog.tsx`, selector tests |
| P1 | participant and competition types, `roster.ts`, new workbook generator, `SetupDialog.tsx`, setup storage/migration, roster/template tests |
| P2 | judging event types, ledger projection, assignment helpers, `JudgeRoleStrip.tsx`, setup/handoff dialog, scoring and reopen tests |
| P3 | competition-pack and judge-result package encoders/validators, import review UI, duplicate/conflict tests |
| P4 | administrator review state, evidence recalculation, finalization/revision events, reconstruction tests |
| P5 | ranking rules, placement review UI, workbook generator and read-back verifier, golden competition fixtures |
| P6 | backup/restore package, migrations, storage diagnostics, offline and real-device regression suite |

New domain logic should remain in pure tested modules rather than being placed
inside React components. Generated files must carry format and rule versions so
future updates can migrate or reject them explicitly instead of guessing.

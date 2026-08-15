# Pre-question-bank release plan

Status: implemented foundation with final device rehearsal still required
Updated: 2026-08-11
Product boundary: Tahqeeq is a judging app; participants see only the Mushaf

## 1. Release outcome

Before Question Bank V1, Tahqeeq needs a compact letter tray, dependable
participant records, separate judge-owned results, explicit finalization,
checked placements, and recoverable local data.

The earlier proposal to change judge assignments during an active recitation
has been removed. Assignments and deduction rules are selected before the
participant starts and remain frozen until that recitation finishes. An
organizer may change the panel before starting the next participant.

## 2. P0 — letter tray and judging-screen cleanup

Implemented:

- one target uses one centered `44 x 44px` control in a compact `52px` picker;
- two or more targets retain their proven geometry and horizontal scrolling;
- active and focus rings inherit every exposed rounded corner;
- the source Mushaf keeps the whole printed kalimah selected while the
  connected rail records the exact target;
- the visible phrase **Your section** has been removed from the score and
  finish views;
- saved records remain typed as judge-owned sections so they cannot be
  mistaken for the combined competition result.

Gate: selector contracts, all 604 page invariants, TypeScript, and the
production build must stay green.

## 3. P1 — competition and participant setup

Implemented competition identity:

- competition name;
- edition, such as year;
- stable competition ID derived from the two values;
- judge seats and assigned Jali, Khafi, and Fasaha criteria;
- frozen starting marks and deductions for an active recitation.

### Participant workbook

Settings contains **Download participant template (.xlsx)**. The import sheet
has exactly these seven columns, in this order:

| Column | Requirement | Meaning |
|---|---|---|
| Participant Number | required and unique | number used by judges and organizers |
| Name | required | participant name |
| Age Group | required | for example, Under 14 or Under 16 |
| Category | required | `Baliagen` for Tarteel/reading or `Hifz` for memorisation |
| Muqarrar (Hathim Side) | required | `Feshey kolhu` for starting side or `Nimey kolhu` for ending side |
| Phone Number | optional | organizer contact number |
| Institution | optional | class, school, or `Amilla faraathun` for own/personal participation |

The workbook also contains a separate **Read me** sheet. The import sheet has
no fake participant. `.xlsx`, `.xls`, and UTF-8 `.csv` remain supported.

Import rules:

- preview accepted, rejected, and warning rows before replacement;
- reject duplicate participant numbers;
- reject unknown Category or Muqarrar values;
- never merge people because their names look similar;
- do not replace the roster until the organizer confirms;
- migrate the old Group/Class value into Institution;
- generate a stable internal participant identity separate from the displayed
  participant number.

Gate: generate the template, read it back, verify both sheet names and all
seven headers, and prove representative rows survive unchanged.

## 4. P2 — collect separate judge results safely

Implemented as offline-friendly judge-result files:

- a completed judge section can be exported as JSON;
- another device previews it before adding it to Results -> Judge results;
- the competition name and edition must be set first;
- a different competition/edition is rejected;
- an identical result is not duplicated;
- a different result with the same session ID is retained as a conflict, not
  used to overwrite evidence;
- imports are blocked while a participant is being judged.

Each package keeps the participant, judge seat, assigned criteria, scoring
snapshot, mistake evidence, and readable judging history.

Gate: a wrong competition, incomplete file, duplicate, and conflicting
revision must never enter a final score silently.

## 5. P3 — review and finalize

Implemented in **Results -> Review**:

- Jali, Khafi, and Fasaha are shown separately for every participant;
- a missing category blocks finalization;
- one available result is used directly;
- multiple available results require an explicit source choice;
- totals are recalculated from the selected session mistakes and their frozen
  scoring rules;
- finalization stores each source session ID, source revision, judge, category
  score, timestamp, revision number, and verification manifest;
- a changed or newly conflicting source marks the final result for review;
- finalizing again creates the next visible revision instead of pretending the
  previous decision never happened.

Gate: every displayed total reconstructs from the three selected judge
histories.

## 6. P4 — placements and checked Excel output

Implemented ranking boundary:

- only current finalized results enter rankings;
- ranking groups are **Age Group + Category**;
- equal percentages remain tied, using competition ranking such as `1, 1, 3`;
- no cross-category overall winner is invented;
- source conflicts and missing categories remain outside the exported result.

The `.xlsx` workbook contains:

- Place;
- all seven requested participant fields;
- Jali, Khafi, and Fasaha scores;
- total and maximum;
- final-result revision;
- verification manifest;
- a separate Verification sheet with competition identity, export time, count,
  group count, tie rule, and calculation policy.

The workbook contains fixed app-calculated values. Before download, Tahqeeq
reopens the generated file and checks the sheet structure, result count,
participant numbers, manifests, and totals. Spreadsheet formulas are not the
official source of truth.

Gate: golden fixtures cover three-judge combination, missing sections,
conflicts, ties, requested participant fields, and workbook read-back.

## 7. P5 — recovery and release hardening

Implemented now:

- download one full JSON backup of competition setup, roster, active state,
  histories, and finalized results;
- restore only when no recitation is active;
- require confirmation before replacement;
- automatically download the current state before applying a chosen backup;
- keep earlier browser-state migration checkpoints.

Required before treating this build as competition-proven:

- real desktop and phone rehearsal from roster import through Excel export;
- interrupted import and refresh rehearsal;
- storage-full and failed-save messaging;
- print review of final results;
- keyboard and screen-reader pass for the new Results controls;
- offline/service-worker upgrade rehearsal on the exact published build.

## 8. Deliberately after this release

- Question Bank V1;
- reviewed default question sets and organizer question builder;
- audio recording and near-word replay bookmarks;
- AI suggestions, never automatic official scoring;
- live multi-device synchronization, accounts, trusted timestamps, and signed
  official records;
- any religious mistake-detail taxonomy that has not been approved by a
  qualified Hafs/Quran-recitation reviewer.

## 9. Rollback and publication rule

Each release keeps a named checkpoint. Publish only the exact commit that has
passed tests and a production build. If device rehearsal reveals a regression,
return to the checkpoint rather than rewriting stored religious or judging
evidence in place.

## 10. Current test contract

- all 604 QPC V1 1405H pages retain their source/layout invariants;
- one-target and multi-target selector geometry remains stable;
- participant template round-trips with the exact seven headers;
- invalid participant rows cannot silently enter the roster;
- judge-result conflicts require a choice;
- final totals reconstruct from selected judge sections;
- ties remain ties;
- final Excel output reopens and verifies before download;
- incomplete result and backup packages are rejected.

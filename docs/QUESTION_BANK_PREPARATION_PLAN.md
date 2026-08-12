# Question bank preparation plan

Status: implementation-ready plan; no question-bank runtime work implemented
Updated: 12 August 2026

## 1. What the next release is for

The next release builds the safe boundary around competition preparation and
the Quran passage resolver. It does **not** attempt to generate an official
question bank, add participant-screen effects, or make AI decisions.

It has two visible outcomes:

1. opening Tahqeeq no longer starts a reciter or implies that an official
   competition is running;
2. all competition-specific work moves out of general settings and into a
   dedicated preparation workspace.

The release may be implemented in one uninterrupted development run, but it
must retain the three checkpoints in section 9 so data work, state changes, and
the new interface can each be reviewed or reversed independently.

## 2. The words shown to organizers and judges

Use these labels consistently:

| Location | Label |
|---|---|
| Main menu | **Competition setup** |
| Setup screen title | **Prepare competition** |
| Final setup task | **Review and start** |
| Official action | **Start competition** |
| Header before launch | **Draft competition** or **No competition running** |
| Header after launch | **Competition live** |
| Action for one participant | **Start reciter** |

“Competition setup” is the correct noun for the menu. “Prepare competition” is
the clearer action heading. Do not call this ordinary “Settings”: page size,
panel position, theme, and similar device preferences belong in settings;
competition identity, judges, marking rules, participants, and questions do
not.

## 3. What happens when the app opens

### No live competition

- Show the normal Mushaf workspace without a blocking start-reciter dialog.
- Show a quiet, persistent state near the header: **No competition running**.
- The Mushaf remains browsable for checking pages and preparing questions.
- Judging actions cannot create official mistakes or scores.
- Offer one clear action: **Prepare competition**.
- Records remain available without pretending that the user is in a live
  recitation.

### Draft competition exists

- Show **Draft competition** and its name.
- Offer **Continue setup**.
- Do not automatically open setup or start a competition.
- Preserve every completed setup task after refresh.

### Competition is live

- Show the frozen competition name, edition, question mode, and this device's
  judge role.
- Offer **Start reciter** only when no reciter is active.
- Refreshing the app restores the live competition but never starts a new
  reciter.
- If a reciter was already active before a crash or refresh, show an explicit
  **Resume reciter** recovery action.

This keeps three different actions separate:

```text
Open Tahqeeq -> prepare and review a competition -> start the competition
                                                -> start each reciter
```

## 4. The preparation workspace

This is a full screen or large workspace, not another increasingly long modal.
It uses a short task list because organizers may complete the work over more
than one sitting and may need to revisit completed sections.

### A. Competition

1. **Competition details**
   - name;
   - edition/year;
   - dates and venue later, when the shared backend is introduced.
2. **Divisions and Quran portions**
   - age group;
   - category: Baliagen or Hifz;
   - allowed surah/juz range;
   - Muqarrar direction or other competition-specific range rule.
3. **Participants**
   - download the existing template;
   - import and preview;
   - resolve rejected rows before completion.

### B. Judging

4. **Judging panel**
   - judge seats;
   - Jali, Khafi, and Fasaha assignments;
   - the judge using this device.
   - the current one-to-three scoring-seat limit remains only while each of the
     three criteria has exactly one owner; it must not become a global limit on
     organizers, reviewers, chief judges, venues, or connected devices.
5. **Marks and deductions**
   - starting marks;
   - deduction increments;
   - verified total.

### C. Questions

6. **Question rules**
   - ayah-only starts;
   - eligible Quran range for each division;
   - target printed recitation lines, default seven;
   - end at the first complete ayah ending on or after the target line;
   - include or exclude the final printed line from marking;
   - manual/off-app questions or Tahqeeq question set.
7. **Question bank**
   - initially shows “Not enabled in this foundation release”;
   - becomes the manual ayah-first builder in the following checkpoint;
   - later shows review and approval counts.

### D. Launch

8. **Review and start**
   - one readable summary of every competition rule;
   - direct **Change** links back to each section;
   - readiness failures shown beside the relevant section;
   - one explicit **Start competition** action;
   - no start until required sections pass.

Recommended task statuses are **Not started**, **In progress**, **Complete**,
**Needs attention**, and **Locked**. Status must be written as text and never
communicated by color alone.

The interaction follows established long-transaction patterns: group related
work into resumable tasks, show status, let users revisit completed tasks, and
provide a check-answers screen immediately before the consequential action.
The useful references are the
[GOV.UK complete-multiple-tasks pattern](https://design-system.service.gov.uk/patterns/complete-multiple-tasks/),
[GOV.UK check-answers pattern](https://design-system.service.gov.uk/patterns/check-answers/),
and [W3C multi-page form guidance](https://www.w3.org/WAI/tutorials/forms/multi-page/).

## 5. Official-start safety boundary

Readiness is calculated from the draft; **Ready** is not stored as a permanent
status that can become stale. Starting creates an immutable competition
version used by every later reciter and result.

For the current local build, the minimum start checks are:

- competition name and edition exist;
- at least one valid division exists;
- all judge criteria are assigned exactly once;
- this device has a judge seat;
- marks total correctly;
- participants have passed import validation;
- at least one participant is ready;
- a question mode is chosen;
- when Tahqeeq questions are used, every required question is approved and the
  set is frozen;
- the QPC V1 1405H source and question-index versions match.

Starting the competition freezes:

- competition identity and division rules;
- panel and mark rules;
- participant roster revision;
- question policy;
- approved question-set version, when used;
- Mushaf edition, data version, and question-index hash.

Edits after start must never rewrite the live version. A later product may let
an organizer create a new revision for the next round, but the first version
should require the live competition to be closed before structural edits.

## 6. Quran resolver foundation

### 6.1 What the current corpus already provides

A local audit of the shipped assets found:

- 604 QPC V1 1405H pages;
- 6,236 ayahs;
- 8,820 printed recitation-line rows;
- explicit surah, ayah, word, page, and line identities;
- 114 surah-header rows and 112 basmala rows that can be excluded from normal
  recitation-line counting.

This is sufficient for deterministic ayah-first questions. No AI, OCR, image
search, or paid API belongs in the resolver.

### 6.2 A blocker discovered by the audit

The marker for ayah 2:181 is present in the page-27 data, but its role is
currently `letter` instead of `ayah-end`. A visual Mushaf test did not catch
this because the glyph still renders correctly.

Before question authoring is enabled:

1. correct the source/build classification rather than hand-editing only the
   generated page;
2. assert that all 6,236 ayahs have exactly one semantic end;
3. assert that an ayah boundary is recoverable independently from decorative
   glyph rendering;
4. regenerate the page and question index together;
5. add 2:181 as a permanent regression fixture.

### 6.3 Generated question index

Do not make the browser load and scan all 604 page files each time an organizer
opens the builder. Generate one compact, versioned index during the build.

Each ayah entry stores:

- surah and ayah;
- first and last semantic word IDs;
- ayah-marker ID;
- start/end page and printed line;
- global recitation-line positions;
- source-data version and layout hash.

The pure resolver receives a start ayah, target line count, and policy. It
returns the exact ending ayah, pages, lines, and word anchors plus warnings. It
does not save or approve a question.

### 6.4 Corpus behavior the interface must explain

With the provisional seven-line rule, the local corpus audit found:

- 4,292 ayah starts can end on the seventh printed line;
- 1,330 first end on the eighth line;
- other starts extend further, including rare cases much longer than eight;
- the final eight ayahs near the end of the Quran do not have seven printed
  lines remaining.

Therefore the builder must show the resolved length before saving and must not
silently shorten or extend a question. The maximum permitted extension and the
Quran-end shortfall policy remain human decisions in
[`UNDECIDED_DECISIONS.md`](./UNDECIDED_DECISIONS.md).

## 7. Question and set lifecycle

The field names can remain technical internally, but the organizer sees simple
statuses.

```text
Question: Draft -> In review -> Approved -> Retired
Question set: Draft -> Checked -> Frozen -> Used
Competition: Draft -> Live -> Closed
Reciter: Waiting -> Active -> Finished
```

These are separate records. An approved question may have newer draft edits,
but a frozen set continues to point to the exact approved version it was built
from. This follows the mature question-bank principle of keeping item versions,
readiness, review, and usage distinct. QTI is a useful interoperability
reference for separating item, test, delivery, and results, but Tahqeeq's
ayah/printed-line meaning is a Quran-specific contract rather than a QTI rule:
[1EdTech QTI specification](https://www.1edtech.org/standards/qti/index).

The first implementation should use internal TypeScript/JSON records and keep
an export boundary. Building a complete QTI importer/exporter now would add
work without improving the reliability of ayah selection.

## 8. What is deliberately not in this release

- no automatically generated official questions;
- no AI difficulty or mutashabihat decisions;
- no participant-screen dimming, hiding, or opening-prompt behavior;
- no tile draw yet;
- no claim that a starter bank contains the “best” questions;
- no cloud accounts or multi-room synchronization yet;
- no live results;
- no native app.

The setup and resolver records must use a storage interface so local browser
storage can later be replaced by a shared backend without replacing the Mushaf
or question builder.

## 9. Implementation checkpoints

### Checkpoint Q0A — source and resolver

- create a rollback checkpoint;
- fix the 2:181 boundary classification at its source;
- generate the compact ayah/question index;
- implement and test the pure seven-line resolver;
- add full-corpus and edge-case tests.

Exit gate: all 6,236 ayahs resolve to one exact boundary, every eligible
seven-line start returns a deterministic end, and ineligible starts produce an
explicit reason.

### Checkpoint Q0B — competition lifecycle

- add draft/live/closed competition state;
- create a frozen live competition snapshot;
- migrate existing local state non-destructively;
- keep a named pre-question-bank browser backup;
- ensure app launch and refresh create no official session event.

Exit gate: no draft edit can change an active reciter or a saved result.

### Checkpoint Q0C — preparation workspace

- replace the long setup modal with the task workspace;
- move existing identity, panel, marks, and participant controls without
  changing their meaning;
- add the question-rules foundation;
- add Review and start;
- remove automatic StartDialog display on ordinary app launch;
- retain a clear Start reciter action only after official launch.

Exit gate: desktop and phone rehearsal can prepare, review, start, refresh,
start a reciter, finish, and close without an accidental session.

This checkpoint establishes the information architecture and dependable task
flow. It does not claim the final immersive visual treatment; that polish gets
its own review after the flow has been exercised with real organizers.

## 10. Following releases

1. **Q1 — Manual question builder**
   - choose a start ayah;
   - preview the computed ending ayah and real Mushaf pages;
   - save a draft with warnings and provenance.
2. **Q2 — Reviewable question bank**
   - review, approve, retire, version, filter, and audit questions;
   - import manually prepared official questions without losing sources.
3. **Q3 — Question sets and tiles**
   - assemble division/round sets from approved versions;
   - validate eligibility and repetition rules;
   - freeze a set before tile positions are randomized.
4. **Q4 — Shared competition service**
   - accounts, roles, central storage, multiple venues, and synchronized frozen
     sets;
   - load rehearsal for the agreed judge/device target.

## 11. Required tests

- opening the app never starts a competition or reciter;
- browsing the idle Mushaf creates no judging evidence;
- a refresh resumes only already-live state;
- every preparation task saves and restores independently;
- Review and start lists the exact frozen values;
- invalid panel, marks, roster, rules, or question versions block launch;
- all 604 pages and 6,236 ayahs pass the index contract;
- the starting printed line, headers, basmala, shared-line ayah starts,
  page changes, long extensions, 2:181, and Quran-end shortfall have fixtures;
- old browser data migrates with a recoverable backup;
- current letter tray, scoring, result finalization, and workbook tests remain
  green.

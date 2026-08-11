# Results Safety — pre-plan for the next phase

Status: quick direction before the full implementation plan  
Product boundary: judging and competition administration only

Expanded execution order: [`PRE_QUESTION_BANK_RELEASE_PLAN.md`](./PRE_QUESTION_BANK_RELEASE_PLAN.md)

The full plan adds the immediate tray/wording checkpoint, participant workbook,
safe active-recitation assignment handoffs, and a final hardening checkpoint
around the Results Safety stages below.

## The next problem to solve

Tahqeeq can now preserve an exact mistake, the responsible judge, that judge's
assigned categories, and the rules used for the reciter. Those records are
useful, but each one is still only a **judge-section result**.

The next phase must turn those separate sections into a result that a
competition administrator can safely verify, finalize, rank, and export. It
must never combine records merely because two names look similar or silently
choose what to do with a missing or duplicated judge section.

## Recommended shape of the next full plan

Treat Results Safety as one initiative with four publishable checkpoints.

### Checkpoint 3A — competition structure

The organizer creates one competition setup containing:

- competition name and edition;
- divisions such as age groups;
- tracks such as Hifz or reciting while looking;
- the participant roster and each participant's division and track;
- judge assignments;
- marks and deduction rules;
- the sections required for a result to be complete.

This setup becomes a reusable **competition pack**. Every judging device must
use the same pack so participant numbers, divisions, judge seats, and scoring
rules cannot drift apart.

Exit gate: two devices opened from the same pack identify the same participant,
judge seats, and rules without matching by typed name.

### Checkpoint 3B — collect judge sections

Each participant attempt receives one shared attempt identity. Every judge's
finished section refers to that identity and can be brought to the administrator
device as a clearly labelled result package.

Start with a reliable offline-friendly file transfer. It can be shared using
the phone or computer's normal sharing options. A QR setup shortcut can follow
once the underlying pack is proven; live synchronization is deliberately later.

Import must check:

- correct competition and edition;
- correct participant and attempt;
- expected judge seat and assigned categories;
- matching marks and deduction rules;
- readable action history;
- whether that section is missing, already present, or duplicated.

Nothing is overwritten automatically. Conflicting submissions are shown next
to one another for an administrator to resolve.

Exit gate: missing, duplicated, wrong-competition, and wrong-rule submissions
all stop finalization with a plain explanation.

### Checkpoint 3C — verify and finalize

The administrator sees one result review for each participant:

```text
Jali      received · Judge 1 · 47/50
Khafi     received · Judge 2 · 28/30
Fasaha    missing

Final result unavailable — Fasaha is required.
```

When every required section is present, the app recalculates the totals from
the saved evidence. It does not trust a total typed into a file.

Before finalization it shows:

- every contributing judge section;
- each starting mark, deduction total, and remaining score;
- any reopened or corrected section;
- a clear calculation check;
- the person who confirmed the review, if entered.

Finalization locks the chosen section versions. Later corrections create a new
revision with a reason; they do not rewrite the previous finalized result.

Exit gate: the final score can be independently reconstructed from the selected
judge-section histories, and every later change remains visible.

### Checkpoint 3D — placements and spreadsheet export

Only finalized, complete results enter rankings.

The organizer chooses the tie rule before results are ranked. If no tie rule is
configured, tied participants remain visibly tied; the app must not invent an
order.

The results screen and spreadsheet show:

- first, second, and third place for each division and track;
- every participant's section scores and final total;
- ties, disqualifications, incomplete results, and manual decisions separately;
- division totals and the optional overall winner only when the competition's
  rules define one;
- a verification sheet listing the rules, result count, warnings, and a check
  total.

The app calculates final values itself and exports fixed values. It then reads
the produced spreadsheet back and verifies that participant identities, scores,
placements, and check totals survived correctly.

Exit gate: a set of difficult test competitions—including ties, missing judges,
duplicate imports, corrections, and disqualifications—produces the expected
placements and re-imports without a mismatch.

## What the next phase must not assume

- Similar participant names are not proof of identity.
- A judge's partial score is not a final score.
- A missing section is not zero.
- The latest duplicate is not automatically the correct one.
- A spreadsheet formula is not the source of truth.
- A lower participant number does not break a tie.
- A manual correction must not erase the previous result.

## What remains outside this phase

- real-time multi-device synchronization and accounts;
- exact named tajweed mistake types;
- question selection and seven-line passage masking;
- audio recording and replay bookmarks;
- AI pronunciation suggestions or automatic scoring.

Those features can build on finalized competition and attempt identities later.

## Decisions the full plan must make

1. Which division and track fields are completely custom, and which common
   templates are offered.
2. What uniquely identifies a competition edition, participant, and attempt.
3. How the organizer distributes the competition pack to judge devices.
4. How a judge-section result is selected when two revisions or duplicates
   exist.
5. Which tie rules are supported in the first release.
6. Whether an overall winner is optional or prohibited unless a rule explicitly
   defines how different tracks are compared.
7. What the verification sheet must contain before an export is considered
   official.

The full plan should settle these decisions before implementation begins. It
should also include the exact administrator screens, recovery paths, old-data
handling, rollback checkpoint, and a golden set of competition examples.

## Confidence

- **94%:** results safety is the correct next product phase.
- **91%:** competition structure and offline result packages can be added
  without changing the Mushaf or letter tray.
- **88%:** safe finalization and placements are achievable once the competition
  owner supplies exact tie and eligibility rules.
- **72%:** combining all four checkpoints into one implementation update would
  remain easy to review. The safer delivery is four checkpoints under one full
  plan, with a publication gate after each.

## Roadmap after Results Safety

### 4. Question bank

1. Create source-anchored passages with exact start and stop points.
2. Build a fast organizer tool for selecting roughly seven Mushaf lines.
3. Add question tiles, frozen draws, and a participant Mushaf that only exposes
   the selected passage.
4. Add a small reviewed default bank covering normal, easy, and mutashabihat
   questions; every item keeps its source and approval status.

### 4.5 Exact mistake details

Add optional, reviewed mistake descriptions beneath Jali, Khafi, and Fasaha.
The judge remains responsible for the decision. The taxonomy must be approved
by a qualified recitation reviewer before it becomes competition data.

### 5. Audio evidence

Add consent-aware recording, a near-word bookmark whenever a mistake is marked,
and quick replay with manual timing adjustment. Audio supports review; it does
not automatically change marks.

### 6. Official pilot foundation

Add judge and administrator identities, permission levels, live or local-first
device synchronization, trusted timestamps, central finalization, and recovery
from network loss. Rehearse an entire competition before calling this official.

### Research track — advisory AI

Continue research on following a known passage and ranking possible mistake
types. AI remains advisory, never the official scorer, until independently
evaluated to a standard accepted by qualified experts and competition owners.

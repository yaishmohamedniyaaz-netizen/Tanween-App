# Adu / Raagu required-entry implementation plan

Status: implemented and verified

Prepared: 16 August 2026

Parent plan: [`INTERFACE_SIMPLIFICATION_AND_JUDGING_FLOW_PLAN.md`](./INTERFACE_SIMPLIFICATION_AND_JUDGING_FLOW_PLAN.md)

## 1. Release decision

The next release changes Adu / Raagu from an implicitly full optional input into
an explicit required input whenever that criterion is enabled and assigned to
the current judge.

For a new or reopened active recitation:

- an unentered Adu / Raagu mark displays `0 / allocation`;
- the mark remains visibly pending even though its numeric display is zero;
- the judge may set it at any time from the scoring rail;
- opening Finish is always allowed;
- if it is still pending, the same mark control appears inside Finish;
- saving remains disabled until the judge deliberately commits a value;
- an explicit zero is valid and complete;
- the configured increment remains authoritative, with 0.5 as the default.

The release must not change the totals of previously saved sessions merely
because the app loads the new code.

## 2. Why this is a scoring-context correction

The current code has four separate pieces of behavior that happen to agree on
the old rule:

1. `impressionScore()` gives an absent mark the full allocation;
2. `computeScores()` carries that value into the live subtotal;
3. `FinishDialog` warns that full marks will be recorded but still enables Save;
4. `FINISH_SESSION` has no independent missing-input guard.

Changing only the visible number would be unsafe. It would make the interface
say zero while the saved result still receives full marks. Changing the global
scoring fallback would also be unsafe because saved historical sessions are
reconstructed through the same scoring functions.

The durable correction is therefore an explicit scoring context, plus one
shared completeness rule used by UI, orchestration, and reducer.

## 3. Confirmed domain contract

### 3.1 Required means assigned and enabled

An impression criterion requires entry only when all of these are true:

- it is an impression/whole-recitation category;
- it is enabled in the frozen assignment score configuration;
- it belongs to the active judge's assignment;
- no projected `ImpressionMark` for it has `set: true`.

A note-only impression object remains pending. Disabled or unassigned
impression criteria never block the judge.

### 3.2 Explicit zero versus pending zero

Both states display the number zero, but they are not the same state:

- pending zero: no `impression_changed` event and `set: false` or no mark;
- explicit zero: a committed `impression_changed` event and `set: true`.

The UI must carry the distinction through text, state class, accessible value
text, and Save availability. Color alone is insufficient.

Selecting zero deliberately must create one ledger event. It must not be
discarded as a no-op merely because the displayed pending fallback was already
zero.

### 3.3 No silent full-mark event

Finish never writes a default mark. The only way to complete Adu / Raagu is a
judge action through the shared mark picker. Opening or closing Finish, moving
focus, or saving another note cannot synthesize `impression_changed`.

## 4. Explicit active and historical score modes

### 4.1 Scoring API

Add an explicit mode beside the scoring functions, using names that describe
the business meaning rather than a Boolean, for example:

```ts
type UnmarkedImpressionMode = "legacy-full" | "entry-zero";
```

Thread the mode through:

- `impressionScore`;
- `computeCategoryScores`;
- `computeAssignedScores`.

The historical/general default remains `legacy-full` so existing saved-session,
final-result, workbook, and comparison callers retain their current result.
The active-state `computeScores(state)` path passes `entry-zero` explicitly.

With `entry-zero`:

- `score` is zero while unmarked;
- `deducted` may numerically equal the allocation, but pending styling must not
  present that as a committed deduction;
- `marked` remains false;
- `count` remains zero;
- `totalMax` is unchanged.

With `legacy-full`, current historical behavior remains exact.

### 4.2 No new persisted version field

Do not add a SavedSession, ledger, or competition schema version solely for
this change. Context already supplies the distinction:

- active sessions always require entry;
- saved-session reconstruction always protects legacy absence;
- all newly saved sessions contain an explicit impression event, so their score
  is identical in either mode.

This avoids a migration that would classify old data by guessed dates or app
versions.

## 5. One missing-required-input helper

Add one pure helper beside scoring, conceptually:

```ts
missingRequiredImpressionCategories(config, impressions, assignedCategories)
```

It returns enabled, assigned impression categories without `set: true`, in
canonical category order.

The same helper must drive:

- pending rows in `ScorePanel`;
- required controls and status text in `FinishDialog`;
- Finish Save-button availability;
- the `App.tsx` post-finish navigation guard;
- the reducer-level `FINISH_SESSION` guard;
- unit and source-contract tests.

Do not duplicate the filter predicate in each component. A later additional
whole-recitation criterion must automatically inherit the same rule.

## 6. Scoring rail behavior

`ScorePanel` retains the current single Adu / Raagu home and uses the shared
`MarkPicker`.

Pending row:

- displays `0 / configured allocation`;
- retains the existing `is-pending` state;
- announces `not marked yet` through the picker value text;
- does not show a committed minus-allocation deduction;
- keeps the optional reason field editable.

Committed row:

- displays the selected value;
- calculates its real deduction;
- removes pending language;
- remains editable until the session is finished.

The first `SET_IMPRESSION` event uses zero as its active numeric origin. Thus a
full mark records `0 -> 10`, while an explicit zero records `0 -> 0` but still
sets the impression as complete. Existing projected and historical events are
not rewritten.

## 7. Finish-dialog completion experience

### 7.1 Stable dialog composition

Do not show an error and send the judge back to the rail. Finish remains open
and contains a stable whole-recitation section whenever this judge owns an
enabled impression criterion.

The section contains:

- criterion label;
- concise pending text only while required, such as `Choose a mark to save`;
- the shared `MarkPicker`;
- no duplicated note field;
- no green success dot, warning card, or decorative status paragraph.

After a mark is selected, keep the control in place so the dialog does not jump
or remove the judge's focus. The summary total updates immediately. The pending
text disappears and Save becomes available.

### 7.2 Focus and actions

- When Finish opens with a missing mark, focus the first missing picker.
- The picker remains fully operable by pointer, drag, tap, number keys, arrows,
  Home, End, Enter, and Space.
- Save is a native disabled button while anything is missing.
- The pending instruction uses `role="status"` or a restrained live region so
  the state change is announced without an alarm-style error.
- Keep judging closes Finish without creating a mark.
- Reopening Finish shows the exact committed value.

### 7.3 Portal layering

`MarkPicker` currently portals its chip bar to `document.body` at z-index 60,
while the dialog backdrop is z-index 80. Reusing it unchanged would place the
choices behind the modal layer.

Extend the shared picker with an explicit presentation-layer prop, for example:

```ts
layer?: "workspace" | "dialog";
```

The dialog variant adds a dedicated class whose z-index is above the backdrop.
The workspace default remains unchanged. Do not copy the picker or move its
calculation/gesture code into Finish.

## 8. Completion guards

### 8.1 Reducer is the authority

Before creating `session_finalized`, `FINISH_SESSION` must:

1. require an active session and session ID as today;
2. require the active assignment;
3. call the shared missing-required helper with the assignment's frozen config
   and categories;
4. return the original state unchanged when anything is missing.

The guard must run before computing or writing the saved session. No history,
participant, event, prepared-recitation, or active-session field may change on
a rejected action.

### 8.2 App navigation guard

The current `App.tsx` callback closes Finish and may open the next-reciter flow
immediately after dispatch. A reducer rejection alone would therefore leave the
session active behind a misleading next screen.

Use the same helper in the confirmation callback and return before dispatch or
navigation when anything is missing. This is orchestration protection, not a
replacement for the reducer guard.

## 9. Historical compatibility

### 9.1 Saved sessions

`normalizeSavedSession()` must continue reconstructing an enabled but absent
historical Adu / Raagu mark with the legacy full fallback. It must not:

- append a synthetic impression event;
- add an impression object;
- change the stored total or category total;
- change final-result candidates merely on load;
- bulk-rewrite browser history.

### 9.2 Reopened sessions

When an old saved session is reopened for a new revision:

- its prior saved/finalized evidence stays historically interpretable;
- the active revision switches to entry-zero behavior;
- an absent Adu / Raagu mark becomes zero/pending;
- the judge must commit a value before saving the revision;
- the new saved revision contains the explicit event.

If the old session already contains an explicit mark, reopening preserves that
value and does not require an unnecessary second selection.

### 9.3 Final results and exports

Do not change result-combination or export code unless an explicit mode argument
is required at a call site. Existing saved records without an impression use
legacy-full; new records always carry their selected value. Workbook/CSV columns
and finalization arithmetic remain unchanged.

## 10. Visual specification

Scoring rail:

- preserve the current centered numeric box and category color;
- make pending state legible through label/value treatment, not a large banner;
- do not add permanent helper prose.

Finish:

- increase dialog width only as much as the stable required-mark row needs;
- use one divider/rule rather than nesting another rounded card;
- align label, pending text, and mark box on a clean grid;
- keep the summary above and actions below;
- allow the portalled mark chips to use their existing calculated width;
- verify the chip surface remains within narrow viewports and above the dialog;
- preserve light/dark tokens and visible keyboard focus.

The result should feel like completing the final field of a form, not resolving
an application error.

## 11. File-level implementation map

| File | Planned responsibility |
| --- | --- |
| `src/lib/scoring.ts` | explicit unmarked mode and missing-required helper |
| `src/state/store.tsx` | first-event origin, reducer guard, and testable reducer seam |
| `src/components/ScorePanel.tsx` | active zero/pending presentation without a false deduction |
| `src/components/FinishDialog.tsx` | stable shared picker section, pending status, and disabled Save |
| `src/components/MarkPicker.tsx` | optional focus and dialog portal-layer support; no gesture rewrite |
| `src/App.tsx` | shared-helper guard before Finish side effects/navigation |
| `src/styles/global.css` | restrained pending/dialog row styling and portal stacking |
| `scripts/adu-raagu.test.mjs` | score modes, explicit zero, helper, reducer, reopen, and UI contracts |
| `scripts/judging-ledger.test.mjs` | unchanged event projection and historical audit behavior |
| `scripts/final-results.test.mjs` | legacy and explicit session totals remain stable in results |
| `scripts/competition-workspace.test.mjs` | Finish handoff remains in-place until requirements pass |

No type/schema file should change unless implementation proves an existing type
cannot express the confirmed behavior. `ImpressionMark.set` already carries the
required pending-versus-explicit distinction.

## 12. Test matrix

### 12.1 Pure scoring

- legacy-full absent mark is full and unmarked;
- entry-zero absent mark is zero and unmarked;
- entry-zero total excludes the pending allocation but preserves totalMax;
- marked values are identical in both modes;
- out-of-range values still clamp;
- disabled and unassigned impression criteria do not enter the required list;
- note-only remains required;
- explicit zero is complete;
- configured 0.5 and whole-number steps remain authoritative.

### 12.2 Reducer and ledger

- `FINISH_SESSION` with missing required Adu / Raagu returns the same state
  reference and writes nothing;
- setting explicit zero creates one `impression_changed` event;
- finishing after explicit zero saves zero and ends the session;
- setting full allocation creates one event and saves full allocation;
- drag/pointer-up still produces one event;
- selecting the already committed value remains a no-op;
- notes neither satisfy nor clear the mark requirement;
- an unassigned judge cannot set or be blocked by Adu / Raagu.

### 12.3 History and reopen

- a historical enabled session with no impression retains its previous full
  score during normalization;
- normalization creates no synthetic impression;
- reopening that session presents zero/pending for the active revision;
- reopening an explicitly marked session preserves the mark;
- saving the reopened revision requires and stores one explicit mark;
- finalized results and export totals remain unchanged for historical fixtures.

### 12.4 Finish UI and accessibility

- Finish opens while pending;
- the shared mark control is present and focused;
- Save is disabled while pending and enabled after selection;
- total updates in place;
- explicit zero enables Save;
- Keep judging changes no score;
- chip portal renders above the dialog backdrop;
- keyboard, touch, drag, outside press, Escape, scroll, and resize behavior stay
  covered;
- light/dark, 10-mark, and 20-mark allocations remain readable;
- narrow viewport keeps the dialog actions and mark surface reachable.

## 13. Implementation order and rollback gates

### Checkpoint 1: scoring modes and helper

1. Add the explicit mode.
2. Add the pure missing-required helper.
3. Keep historical/general defaults unchanged.
4. Make active `computeScores` pass entry-zero.
5. Add pure tests.

Gate: historical fixtures remain full; active fixtures are zero/pending.

### Checkpoint 2: reducer and orchestration safety

1. Change the first impression event origin to active zero.
2. Add the reducer guard.
3. Add the App guard before dialog/navigation side effects.
4. Add direct reducer and explicit-zero tests.

Gate: no missing-input path can save or advance the workflow.

### Checkpoint 3: shared Finish completion UI

1. Add optional focus and dialog-layer props to `MarkPicker`.
2. Render the assigned impression control stably inside Finish.
3. Disable Save from the shared helper.
4. Remove the old implicit-full warning.
5. Add focused UI/source contracts and styles.

Gate: the judge can complete the mark inside Finish without leaving the dialog,
and the portalled chip surface remains operable.

### Checkpoint 4: historical and full regression

1. Exercise old unmarked saved sessions and old explicitly marked sessions.
2. Exercise reopening and resaving both.
3. Run final-result and export fixtures.
4. Run all automated tests and the production build.
5. Inspect the scoped diff before commit and publication.

Gate: saved history does not drift and all new saved sessions are explicit.

## 14. Verification commands

```powershell
node --test --experimental-strip-types scripts/adu-raagu.test.mjs
node --test --experimental-strip-types scripts/judging-ledger.test.mjs
node --test --experimental-strip-types scripts/final-results.test.mjs
node --test --experimental-strip-types scripts/competition-workspace.test.mjs
npm.cmd test
npm.cmd run build
git diff --check
```

Browser review must cover the scoring rail and Finish dialog with pending,
explicit zero, half mark, full mark, 10-mark allocation, 20-mark allocation,
light, dark, desktop, and narrow-phone states.

## 15. Protected behavior

The release must not change:

- configured Adu / Raagu allocation or increment;
- pinpoint category arithmetic or Quran evidence;
- judge assignment ownership;
- the one-event-per-committed-picker-gesture rule;
- saved historical totals merely on load;
- finalization source selection, placements, CSV, or workbook schemas;
- competition setup, backup, restore, or sample isolation;
- Mushaf geometry, page navigation, mistake log, Results design, or Settings;
- the rule that official marks always come from a human judge.

## 16. Completion definition

This release is complete only when an assigned Adu / Raagu criterion cannot be
saved without a deliberate judge selection, a pending judge can finish the
entry directly inside the Finish dialog, explicit zero works, all completion
paths share the same helper, and historical unmarked sessions retain their
existing totals without synthetic events or bulk migration.

## 17. Implementation record

Completed on 16 August 2026.

- `scoring.ts` now separates `entry-zero` live scoring from the default
  `legacy-full` reconstruction path and owns the canonical missing-input helper.
- The scoring rail and Finish dialog render the same pending-zero meaning.
- Finish keeps one stable shared picker row, focuses a missing control, disables
  Save until entry, and places the portalled mark bar above the dialog layer.
- `FINISH_SESSION` rejects missing required impression input before calculating
  or writing a saved session. `App.tsx` checks the same helper before navigation.
- The first committed impression event records zero as its live origin, so an
  explicit `0 -> 0` remains a valid, auditable judge decision.
- Historical scoring callers retain their previous default. No schema field,
  migration, synthetic event, or export change was introduced.
- Verification passed: 31 focused Adu / Raagu tests, all 246 repository tests,
  TypeScript production build, and Sites artifact preparation.

## 18. Follow-up recorded on 17 August 2026

The required-entry contract remains implemented. A later visual review found a
score-readout alignment regression and insufficient emphasis for a missing
required mark in the Finish review. The bounded correction is planned in
[`JUDGE_WORKSPACE_FIT_RAIL_FINISH_FOLLOW_UP_PLAN.md`](./JUDGE_WORKSPACE_FIT_RAIL_FINISH_FOLLOW_UP_PLAN.md).

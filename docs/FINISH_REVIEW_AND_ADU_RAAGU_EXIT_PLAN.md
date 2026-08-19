# Finish review card and Adu / Raagu exit plan

Status: implemented locally; final visual approval, commit, and publication pending

Prepared: 18 August 2026

Implemented and browser-reviewed locally: 19 August 2026

Scope: the final review shown after `Finish recitation`, including its score
detail, remarks, required Adu / Raagu recovery, low-height behavior, and modal
focus contract. This plan does not change competition rules, scoring
arithmetic, or the saved evidence model.

Related parent plan:
[`JUDGE_WORKSPACE_FIT_RAIL_FINISH_FOLLOW_UP_PLAN.md`](./JUDGE_WORKSPACE_FIT_RAIL_FINISH_FOLLOW_UP_PLAN.md)

## 1. Verdict

The present dialog is functionally safe but visually too thin and
interactionally weak. It shows two generic metric tiles, repeats the complete
judge assignment as secondary text, hides the category breakdown and remarks,
and disables the only forward action when Adu / Raagu is missing. The judge can
see that saving is unavailable but is not carried directly into the repair.

The recommended replacement is a compact review sheet, not another dashboard:

- one clear score at the top;
- one aligned criterion table containing every category owned by this judge;
- mistake count and question/judge context as compact metadata;
- only non-empty general notes and Adu / Raagu reason;
- an Adu / Raagu row that remains editable in place;
- a live Save action that, on a missing mark, keeps the dialog open, identifies
  the exact problem, focuses the Adu / Raagu control, and expands its choices
  inside the review card.

The App guard and reducer guard remain unchanged. Explicitly selecting zero
remains valid and must be visually distinct from an uncommitted zero.

### Local implementation outcome

The bounded prototype is now the local implementation:

- Save remains active while Adu / Raagu is calmly pending.
- The first invalid Save keeps the review open, gives the complete row a
  restrained validation surface, shows a specific correction, focuses the
  shared picker, and opens its choices inside the score table.
- A deliberate zero and a half mark both clear validation without
  automatically saving.
- The same `SET_IMPRESSION` ledger event, App guard, reducer guard, scoring
  arithmetic, assignment, question snapshot, and saved evidence model remain
  in force.
- The primary label changes to `Save recitation` when no participant is
  waiting.
- Finish now uses the repository's native modal pattern for background
  inertness, Escape, and focus return. A small dialog-local boundary guard was
  added after browser testing found that Chromium could move Shift+Tab from a
  programmatically focused static heading to the document body.
- The uncommitted zero no longer paints the zero chip as selected when the
  choices first open.

Browser evidence so far covers the normal desktop window and 390 x 844 compact
view, calm pending, attempted recovery, explicit zero, 0.5 selection, live
total/deduction updates, picker-first Escape, dialog Escape, focus return to
`Finish recitation`, and Shift+Tab containment. The expanded compact dialog
measured 356.4 x 565.7 px with no horizontal document overflow. The remaining
visual approval gate is the user's review and the 20-mark/long-remarks stress
case before publication. The complete 276-test suite, Quran/question integrity
check, TypeScript build, production/Sites bundle, and `git diff --check` pass.

## 2. Verified baseline before this implementation

### 2.1 Browser evidence

At the current 1186 x 698 browser viewport, the marked-state Finish dialog is
480 x 368 px. Its two summary tiles occupy 430 x 64 px, while the only category
shown is Adu / Raagu. It has no category breakdown, no question reference, and
no remarks. The card fits, but much of its information density is spent on two
large generic tiles.

### 2.2 Source evidence

- `FinishDialog.tsx` computes the correct live section total and detects
  missing impression categories.
- A missing Adu / Raagu row receives `is-pending`, its picker receives focus,
  and the primary action is disabled immediately.
- The dialog calls the shared `MarkPicker`, so the value, half-step behavior,
  and event ledger already have one implementation.
- `App.tsx` refuses confirmation when any assigned impression mark is missing.
- The `FINISH_SESSION` reducer repeats the same guard before it writes history.
- `computeScores` uses `entry-zero`, so an uncommitted impression displays zero
  without pretending that zero was selected.
- Saved sessions already include category marks, general notes, Adu / Raagu
  note, mistakes, events, judge assignment, and question evidence. No schema
  change is needed for the proposed card.
- The previous custom modal had `role="dialog"` and `aria-modal="true"`, but
  did not establish initial focus, contain Tab focus, handle Escape, or restore
  focus to the invoking Finish button on cancel. The local implementation now
  covers those behaviors with a native modal plus the tested boundary guard.

## 3. Research translated into this product

### 3.1 Modal structure and focus

The W3C modal dialog pattern requires focus to move inside a dialog, Tab and
Shift+Tab to remain inside it, Escape to close it, and focus to return to the
invoker when the workflow is cancelled. For structured content such as a score
table and remarks, W3C recommends initially focusing a static element at the
top rather than jumping directly into the first input.

Tahqeeq application:

- initially focus the `Review and save` heading with `tabIndex="-1"`;
- keep the score table available in reading order;
- trap Tab within the Finish dialog;
- let Escape perform `Keep judging`;
- restore focus to the `Finish recitation` button on cancel;
- after successful Save, move into the next workflow rather than restoring the
  now-irrelevant Finish button.

Source:
[W3C WAI-ARIA modal dialog pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/)

### 3.2 Recoverable validation

Carbon specifies that invalid modal input should keep the modal open, mark the
specific entry, include an inline resolution message, and remove that message
once the entry is corrected. GOV.UK similarly pairs the message and error
styling with the exact field, preserves existing input, and uses direct text
that tells the user how to fix the problem.

Tahqeeq application:

- do not disable Save before the judge attempts it;
- on an attempted Save with no committed Adu / Raagu mark, keep the dialog
  open;
- apply a full, low-opacity validation surface to the Adu / Raagu row rather
  than relying on a thin line or colour alone;
- state `Choose an Adu / Raagu mark to save` next to that row;
- set `aria-invalid` and connect the picker to that message;
- focus and expand the picker;
- preserve all scores and remarks;
- clear the validation surface immediately after a deliberate selection,
  including explicit zero.

Sources:
[Carbon modal validation](https://carbondesignsystem.com/components/modal/usage/),
[GOV.UK error message guidance](https://design-system.service.gov.uk/components/error-message/)

## 4. Retain, recompose, remove

### Retain

- `missingRequiredImpressionCategories` as the canonical completeness check.
- Both the App and reducer hard guards.
- `computeScores` and its assigned-section meaning.
- The shared MarkPicker value clamping, half-mark gesture, keyboard entry,
  explicit-zero semantics, event ledger, and category colour.
- Reopen-with-reason audit behavior.
- `Keep judging` as the non-destructive exit.

### Recompose

- Recompose the modal as header, scroll-safe review body, and fixed action row.
- Recompose the two summary tiles into one dominant score plus quiet metadata.
- Recompose category results into a three-column review table: criterion,
  deducted, score.
- Recompose Adu / Raagu as the editable final table row with an inline expanded
  choice strip.
- Recompose validation as an attempted-submit state, not a permanent warning.
- Recompose the primary label according to whether a waiting reciter exists.

### Remove

- The duplicate `Check before finishing` kicker.
- The complete repeated criterion sentence below the summary.
- The two equal-weight metric cards.
- The permanently disabled Save button.
- The long paragraph explaining reopen behavior on every finish.
- Permanent error styling before the judge has attempted Save.
- Any second mistake-history view inside this dialog.

## 5. Proposed information architecture

```text
┌──────────────────────────────────────────────────────────┐
│ Review and save                              97 / 100    │
│ Ahmed Rasheed · Q 82:19–83:12 · Judge 1 · 1 mistake     │
├──────────────────────────────────────────────────────────┤
│ Criterion                         Deducted       Score    │
│ ■ Laḥn Jalī                            −2       48 / 50   │
│ ■ Laḥn Khafī                            —       30 / 30   │
│ ■ Faṣāḥa                                —       10 / 10   │
│ ■ Adu / Raagu                           −1      [9 / 10]  │
│                                                          │
│ Remarks                                                  │
│ Notes                  Needs a steadier stopping point.   │
│ Adu / Raagu reason     Pitch weakened near the end.      │
├──────────────────────────────────────────────────────────┤
│ Keep judging                         Save & choose next   │
└──────────────────────────────────────────────────────────┘
```

Rules for this layout:

- The total is dominant; mistake count is metadata, not a competing card.
- Render only categories in the frozen active judge assignment, in canonical
  order.
- Use the existing category colour marker beside each label.
- Use tabular numbers and the shared score-slot alignment.
- Show an em dash for zero deduction.
- Show the Adu / Raagu picker in the score column.
- If no general note and no Adu / Raagu reason exists, omit Remarks entirely.
- If remarks exist, show their labels and exact saved text. Do not truncate the
  data; let the review body scroll at low height.
- Do not list individual mistakes. The dialog is a final checkpoint, not a
  duplicate of View all or Results review.
- Use `Save and choose next` when another participant is waiting; otherwise use
  `Save recitation`.

## 6. Adu / Raagu exit state machine

### State A: review opens, mark already committed

- Show the awarded value and deduction in the table.
- The primary action is active.
- The judge can reopen the inline selector and change the value before saving.
- Any non-empty reason appears in Remarks and updates if the underlying value
  changes elsewhere before Save.

### State B: review opens, mark not committed

- Show `0 / allocation` because zero is the live entry default.
- Also show `Not entered` so the same numeral cannot be mistaken for explicit
  zero.
- Keep the row neutral apart from its normal Adu / Raagu identity colour.
- Keep the primary action active.
- Initial focus stays on the dialog heading; the app does not announce an error
  before the judge has attempted the action.

### State C: judge attempts Save while mark is missing

- Prevent completion locally in `FinishDialog`.
- Keep both existing hard guards untouched.
- Set `saveAttempted=true`.
- Give the whole Adu / Raagu row a restrained low-opacity validation surface
  plus readable border/ink contrast.
- Show `Choose an Adu / Raagu mark to save` with an accessible error prefix.
- Set `aria-invalid="true"` on the picker and connect it with
  `aria-describedby`.
- Focus the picker and expand the choices inline inside the dialog.
- Scroll the row into view without moving the action row off-screen.

Red is acceptable only in State C because this is now a real, fixable
validation failure. Do not use red for the calm pending state, and do not use
the criterion green as the sole error signal.

### State D: judge commits a value

- Dispatch the existing `SET_IMPRESSION` event.
- Any deliberate value, including zero, satisfies the requirement.
- Clear `saveAttempted` and the validation message immediately.
- Update deduction, score, and total live.
- Collapse the inline strip after a chip/pointer commit; keyboard arrow changes
  may leave it open until the judge closes it or continues.
- Do not automatically save. The judge presses the primary action again after
  seeing the final total.

### State E: valid Save

- Call the existing `onConfirm`.
- App rechecks the requirement.
- Reducer rechecks it again before writing the immutable saved session.
- If another participant is waiting, open that selection flow. Otherwise return
  to the idle/complete judging workspace.

## 7. MarkPicker integration design

Do not build a second marks engine for the dialog. Extend the existing
`MarkPicker` presentation without changing its scoring or gesture contract.

Recommended API additions:

- `presentation?: "floating" | "inline"`, defaulting to `floating` so the
  score rail is unchanged;
- `invalid?: boolean` and `describedBy?: string` for validation semantics;
- an imperative `focusAndOpen()` handle for the parent Finish dialog.

Inline behavior:

- render the existing chip strip as a DOM descendant of the Finish row instead
  of portalling it to `document.body`;
- let the strip span the complete criterion row;
- inherit the row's Adu / Raagu colour directly;
- keep whole-number chips and their existing half-mark pointer regions;
- do not close inline choices merely because the scroll-safe dialog body was
  scrolled;
- retain Escape, outside press, keyboard arrows, Home/End, typed numbers, and
  explicit zero behavior;
- keep the existing floating path byte-for-byte equivalent where practical.

The imperative handle is limited to focus and disclosure. MarkPicker remains
the owner of its open state and does not expose or duplicate scoring state.

## 8. Dialog geometry

Desktop and tablet:

- target width: 600-620 px, capped by `calc(100vw - 32px)`;
- target maximum height: `calc(100dvh - 32px)`;
- outer dialog: grid with `auto minmax(0, 1fr) auto` rows;
- header and action row do not scroll;
- review body owns `overflow-y: auto`;
- action row receives a quiet top divider, not a floating glass effect;
- category rows remain at least 48 px; action targets remain at least 44 px.

Compact screens:

- use `calc(100vw - 16px)` width and `calc(100dvh - 16px)` height;
- reduce outer padding, not type below the design floor;
- stack or evenly split the two actions only when their labels no longer fit;
- keep the total and participant context visible before the scroll body;
- allow the 20-mark inline strip to wrap and the body to scroll;
- never allow document/body scroll behind the modal.

## 9. Implementation map

### `src/components/FinishDialog.tsx`

- Add local `saveAttempted` state.
- Build rows from the active assignment and `computeScores(state).byCategory`.
- Render the dominant score, compact context, aligned criterion table, and
  conditional remarks.
- Keep Save enabled and intercept the first invalid attempt.
- Focus/open the first missing impression picker.
- Clear attempted validation after `SET_IMPRESSION`.
- Add structured modal focus, Escape, and Tab containment.
- Accept whether a next reciter exists so the primary label is truthful.

### `src/components/MarkPicker.tsx`

- Add the inline presentation, validation attributes, and bounded
  `focusAndOpen()` handle.
- Share the exact existing chip construction and commit path.
- Preserve the floating workspace behavior as the default.

### `src/App.tsx`

- Keep the current App guard.
- Derive `hasNextReciter` before rendering FinishDialog.
- Pass the truthful completion label state.
- Hold a ref to the Finish button so cancel can restore focus.
- Preserve the existing post-save running-order transition.

### `src/styles/global.css`

- Replace the generic finish-summary tiles with the flat review-sheet layout.
- Add the aligned criterion grid, conditional remarks, low-opacity attempted
  validation block, inline MarkPicker strip, scroll body, and fixed action row.
- Scope every rule to `.finish-dialog` or the inline MarkPicker variant.
- Do not alter the live scoring rail or other dialogs in this slice.

### Tests

Extend `scripts/adu-raagu.test.mjs`,
`scripts/competition-workspace.test.mjs`, and the focused workspace tests only
where they own the relevant contract. Do not invent a broad modal refactor to
make the test easier.

## 10. Acceptance matrix

### Scoring and data

- Missing uncommitted zero and explicitly committed zero remain distinct.
- Explicit zero passes Finish.
- `0`, `0.5`, whole values, `9.5 / 10`, `10.5 / 20`, and maximum values render
  and save exactly.
- Only assigned categories enter the table and total.
- App and reducer guards remain independently effective.
- No saved-session schema or competition-rule change occurs.
- General notes and Adu / Raagu reason are exact and appear only when non-empty.

### Interaction

- Opening the dialog focuses its heading, not the missing picker.
- Save is active in the calm state.
- An invalid Save leaves the dialog open, shows specific inline guidance,
  scrolls to, focuses, and opens the missing picker.
- Selecting zero clears the error exactly like any other mark.
- Selecting a value does not automatically finalize the recitation.
- Keep judging closes the dialog and restores focus to Finish recitation.
- Escape performs the same safe cancel.
- Tab and Shift+Tab cannot escape the modal.
- The inline picker retains pointer drag, half-mark, chip click, arrow,
  Home/End, typed-number, and Escape behavior.

### Visual and geometry

Check 1280 x 720, 1528 x 675, 1528 x 732, 1600 x 900, 1024 x 768,
768 x 1024, and 390 x 844.

At each applicable viewport, check:

- light and dark themes;
- 10- and 20-mark Adu / Raagu allocations;
- marked, pending, attempted-error, expanded, explicit-zero, and half-mark
  states;
- no remarks, one remark, both remarks, and long remarks;
- zero, one, and many mistakes;
- another waiting reciter and no waiting reciter;
- no document overflow or clipped action row;
- contained review-body scroll only when required;
- no picker collision with viewport edges.

## 11. Explicit non-goals and rejected shortcuts

| Proposal | Confidence | Decision |
| --- | ---: | --- |
| Keep Save disabled until Adu / Raagu is entered | 38 / 100 | Reject; it preserves the current dead end |
| Show error styling as soon as the dialog opens | 58 / 100 | Reject; it announces failure before an attempted action |
| Automatically save immediately after choosing Adu / Raagu | 61 / 100 | Reject; it removes the final review checkpoint |
| Permanently expand all Adu / Raagu chips | 76 / 100 | Do not ship without a comparison; too much recurring visual weight |
| Add a nested mistake-history view inside Finish | 65 / 100 | Reject for this slice; use Keep judging or existing review surfaces |
| Require a reason whenever Adu / Raagu loses marks | 35 / 100 | Not a UI decision; unresolved competition rule |
| Replace the App/reducer guards with dialog validation | 12 / 100 | Reject; presentation cannot own data integrity |

## 12. Confidence assessment

| Slice | Practicality | Architecture/data safety | Visual certainty | Decision |
| --- | ---: | ---: | ---: | --- |
| Flat detailed review card | 97 | 99 | 94 | Implemented; desktop and compact browser proof |
| Submit-time Adu / Raagu recovery | 98 | 99 | 95 | Implemented; pending, error, zero, and half states proved |
| Inline reuse of the MarkPicker chip strip | 96 | 99 | 93 | Implemented; shared commit path and compact wrap proved |
| Modal focus, Escape, and focus return | 97 | 99 | 96 | Implemented; browser edge found and corrected |
| Scroll-safe fixed action row | 96 | 99 | 94 | Implemented; compact action row remained visible |
| Dynamic next-reciter action label | 99 | 99 | 98 | Implemented |
| Conditional exact remarks | 98 | 99 | 95 | Implemented; long-text stress case remains |

After the local browser prototype, overall core-plan confidence is **96 / 100**:

- practicality: **97 / 100**;
- architecture and data safety: **99 / 100**;
- visual certainty: **93 / 100**.

The plan clears the repository's 85-point implementation threshold. The
remaining uncertainty is not the scoring model. It is the visual density of an
expanded 20-mark inline strip alongside long remarks at the shortest desktop
height. More web research will not resolve that; the implementation needs that
stress fixture and explicit visual approval before commit and publication.

## 13. Recommended implementation sequence

1. Build the flat review-sheet layout with marked Adu / Raagu and no behavior
   change. Browser-review that card first.
2. Add calm pending and attempted-validation states while retaining both hard
   guards.
3. Add inline MarkPicker presentation and `focusAndOpen()` without changing the
   workspace default.
4. Add dialog focus containment, Escape, cancel focus return, and dynamic
   completion label.
5. Run focused tests, the complete value/state matrix, low-height browser QA,
   the full repository suite, production build, and `git diff --check`.
6. Present the final visual checkpoint. Commit and publish only after explicit
   visual approval.

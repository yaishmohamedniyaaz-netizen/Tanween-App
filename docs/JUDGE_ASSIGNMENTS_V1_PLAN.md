# Judge Assignment Mode v1 — implementation plan

Status: implemented; final validation and publication tracked with the release
Product boundary: judge-facing app only; the participant sees only the Mushaf  
Release shape: one complete update, built in four separately testable passes

## 1. What this update achieves

An organizer can describe how Jali, Khafi, and Fasaha are divided between the
judges. The judge using the current device then sees only the work assigned to
them.

Examples:

- one judge handles Jali, Khafi, and Fasaha;
- three judges handle one category each;
- Judge 1 handles Jali and Fasaha while Judge 2 handles Khafi.

The judge's role remains visible while judging. The letter tray becomes faster
when only one category is assigned, and the score panel never presents one
judge's partial score as the final competition score.

This version does **not** combine scores from different devices. It produces a
clear, trustworthy result for one judge's assigned section, ready to be combined
by a later verified results system.

## 2. The exact experience

### A. Competition setup

Add a **Judging panel** section to Competition setup, above marks and the
participant list.

It begins with three plain choices:

1. **One judge covers all** — creates one row with all three categories.
2. **One judge per category** — creates three rows, one category per row.
3. **Custom panel** — lets the organizer assign the three categories across one,
   two, or three judge rows.

Each judge row contains:

- a fixed seat label such as `Judge 1`;
- an optional judge name;
- three small squared category controls: Jali, Khafi, and Fasaha;
- a remove control when more than one row exists.

The first version has these safety rules:

- every category must be assigned;
- every category must belong to exactly one judge;
- every judge row must have at least one category;
- there can be one to three judge rows;
- the judge count is the row count, so two fields can never disagree;
- changes cannot be saved while a reciter is actively being judged.

The setup shows a short summary before `Done`, for example:

```text
Judge 1 · Jali + Fasaha
Judge 2 · Khafi
```

If the setup is incomplete, `Done` stays disabled and the exact missing or
duplicate category is named next to the affected row.

### B. Choose the judge using this device

Below the panel rows, add **This device is for** with one choice for every judge
row. This is a device role, not a participant-facing setting.

- It must be selected before the first reciter can start.
- It remains selected between reciters until deliberately changed.
- If its judge row is removed, the organizer must choose again.
- Changing it is blocked during an active recitation.

The Start reciter dialog repeats the chosen role in one quiet line. It does not
ask the same question before every participant.

### C. Always-visible role strip

Add one compact strip above the score panel:

```text
Judge 2 · Jali + Fasaha                         Change
```

The assigned categories use the same squared color indicators as the scoring
system. The strip is an orientation aid, not a decorative banner. `Change`
opens Competition setup and is disabled while a reciter is active.

It must remain visible in both the left-rail and right-rail layouts. On a narrow
screen it stays inside the judge controls; it never covers the Mushaf.

### D. Score panel

Only the current judge's assigned categories appear.

- Three assigned: the existing three rows remain.
- Two assigned: only those two rows appear.
- One assigned: one clear category row appears without unused empty space.

The heading becomes **Your section**. Its maximum is the sum of the assigned
categories only. Unassigned categories are hidden, not displayed as zero.

Examples:

```text
Your section  28 / 30
Jali           18 / 20
Fasaha         10 / 10
```

The score changes directly when a mistake is recorded. No rolling-number or
slot-machine animation is used.

### E. Letter tray

The order is always Jali, then Khafi, then Fasaha. Filtering categories must not
change that order.

#### Judge assigned all three

Keep the current connected letter rail and its three category actions.

#### Judge assigned two categories

Show only those two actions. The tray remains connected to the selected word
and keeps the same letter-selection behavior.

#### Judge assigned one category

Do not ask the judge to choose the same category after every letter.

The rail instead shows a compact fixed action such as:

```text
[exact letters]    Jali · −2
```

There are two deliberate input paths:

- **Hold and drag:** the judge enters the exact-letter rail, moves onto the
  intended letter, and releases there. This records the fixed category once.
- **Tap:** tapping a word opens and pins the rail. Choosing an exact letter then
  reveals one `Mark Jali −2` button. The judge presses it to record the mistake.

The hold path is fast. The tap path keeps a confirmation so an exploratory tap
cannot deduct marks accidentally.

Nothing is recorded when:

- the judge releases without reaching an exact letter;
- the pointer is cancelled;
- the tray closes;
- the judge releases outside the valid rail/action area.

Keyboard use must remain complete: arrow keys move between exact letters,
Enter or Space selects the letter, and the fixed `Mark …` action commits it.
Escape closes the tray without recording anything.

### F. Mistake list and history

The compact mistake row does not repeat the broad category name or ayah details;
its color, selected glyph, and deduction remain the quick view. Opening details
continues to show the full location and note.

The action history adds ownership where it matters:

```text
Judging started · Judge 2 · Jali + Fasaha
```

A finished result shows:

- judge seat and optional name;
- assigned categories;
- `Section score`, never `Final score`;
- the score rules used;
- mistakes and action history.

Reopening a result restores the judge role and rules saved with that result,
even if Competition setup has since changed.

## 3. Rules that make the result reliable

The interface hiding an unassigned category is not enough. The saved-data layer
must independently reject it.

Before a mistake is accepted, the app checks:

1. a reciter session is active;
2. that session has a frozen judge assignment;
3. the selected category belongs to that judge;
4. the deduction uses the score rules frozen at session start.

The session receives its assignment when `Start reciter` is pressed. Later
settings changes cannot silently alter an active or finished result.

The result is explicitly classified as a **judge-section result**. It must not
be added to another judge's result or promoted to a final placement until the
later results-combining system validates the required sections.

## 4. Saved information

Keep two different ideas separate:

- **Live panel setup:** who is currently assigned to each category.
- **Session snapshot:** what the setup and rules were when this reciter began.

The live setup stores judge rows and which row this device is using. A session
snapshot stores:

- judge seat ID and label;
- optional judge name;
- assigned categories in their standard order;
- the complete three-category panel arrangement;
- the marks and deduction rules;
- a version number so future changes remain readable.

Each new mistake also stores the responsible judge seat ID. This allows later
exports and audits to explain who recorded it without relying on today's
settings.

A finished result gains unambiguous fields for:

- section score;
- section maximum;
- score kind: `judge-section`;
- assignment snapshot.

Legacy `total` fields remain readable during the transition, but every new
screen and export labels them by their real scope.

## 5. Existing saved data

No old judging history should change its score or disappear.

On first launch after the update:

1. create one default row, `Judge 1`;
2. assign Jali, Khafi, and Fasaha to it;
3. make that row the device's current role;
4. attach that default assignment to older sessions that have no assignment;
5. preserve their existing marks, mistakes, notes, and event history exactly;
6. retain a one-time backup of the pre-update data before conversion.

Running the conversion more than once must have no further effect. If conversion
cannot prove that a record is safe, it leaves the original record intact and
marks it for review instead of guessing.

## 6. Records and statistics

Scores with different category assignments are not directly interchangeable.
For example, a Jali-only `18 / 20` and an all-category `82 / 100` must not be
averaged as though they were the same kind of result.

For this version:

- Records can be filtered by judge seat and assigned section.
- Lists show score and maximum together.
- Any average is a percentage and is labelled **Average section score**.
- No screen calculates an official combined participant score.
- JSON and print/export views include judge ownership and score scope.

The later results phase will combine the required sections, detect missing or
duplicate submissions, verify the formula, and only then produce placements or
Excel winner sheets.

## 7. Implementation passes

The update can ship as one release, but it should be built in these reviewable
passes. Each pass must pass its own tests before the next begins.

### Pass 0 — checkpoint and baselines

- Create a rollback checkpoint before changing application code.
- Record the current all-categories setup, score, tray, finish, reopen, and
  history behavior as regression tests.
- Save representative desktop and mobile screenshots for comparison.

Gate: the existing app behaves exactly as it does now before the new feature is
introduced.

### Pass 1 — ownership and safe saved data

- Add panel, device role, and frozen session assignment information.
- Add the three setup presets and validation rules as pure, testable helpers.
- Convert old saved data to the one-judge/all-categories default.
- Add the hard saved-data rejection for unassigned categories.
- Prevent setup changes during an active reciter.

Gate: deliberately forged or stale actions cannot save an unassigned category,
and old results retain exactly the same score.

### Pass 2 — setup and judging panel

- Build the friendly panel rows and `This device is for` choice.
- Add the always-visible judge role strip.
- Filter the score panel and label it `Your section`.
- Update Start and Finish dialogs with the role and scoped score.
- Preserve both left-rail and right-rail layouts.

Gate: all valid assignment combinations look intentional on desktop and mobile,
with no participant-facing controls added to the Mushaf.

### Pass 3 — adaptive letter tray

- Pass only assigned categories into the tray.
- Keep the current path for three categories.
- Add the filtered two-category path.
- Add the fixed-category hold and tap paths.
- Add pointer-cancel, outside-release, focus, and keyboard safeguards.
- Verify exact-letter selection was not weakened.

Gate: every supported pointer, touch, and keyboard path records exactly once or
not at all as intended.

### Pass 4 — records, reopen, exports, and release check

- Store and display assignment ownership in finished results and event history.
- Restore the frozen role when reopening.
- Prevent misleading cross-section averages.
- Add scope and ownership to exports.
- Run the full corpus, interaction, migration, build, and responsive checks.

Gate: a reviewer can trace every saved deduction to the judge role and rules
that were active when it was recorded.

Only after all four gates pass should the single verified update be published.

## 8. Main code areas

The exact filenames can change during implementation, but the work should stay
separated this way:

| Area | Planned change |
| --- | --- |
| `types.ts` | Panel, judge seat, assignment snapshot, and section-score fields |
| `config.ts` | Safe one-judge default and the three panel presets |
| `lib/judgeAssignments.ts` | Validation, standard ordering, preset creation, and migration helpers |
| `state/store.tsx` | Live panel, device role, frozen assignment, conversion, and hard category guard |
| `SetupDialog.tsx` | Judging panel editor and current-device choice |
| `StartDialog.tsx` | Refuse start without a role; show the chosen role |
| new `JudgeRoleStrip.tsx` | Always-visible compact assignment indicator |
| `ScorePanel.tsx` | Assigned-only rows and `Your section` total |
| `DragMenu.tsx` | Three-, two-, and fixed-category tray modes |
| `Mushaf.tsx` | Safe commit checks and fixed-category pointer flow |
| finish/history/records/export views | Frozen assignment and clearly scoped score |
| styles and tests | Responsive states, focus states, conversions, gestures, and regressions |

The assignment logic belongs in one shared helper, not repeated separately in
the setup, tray, score panel, and records. That keeps every screen in agreement.

## 9. Required test matrix

### Assignment coverage

There are seven possible non-empty category sets for the judge using this
device. Test every one:

1. Jali
2. Khafi
3. Fasaha
4. Jali + Khafi
5. Jali + Fasaha
6. Khafi + Fasaha
7. Jali + Khafi + Fasaha

For every set, check the role strip, tray choices, score rows, section maximum,
finish summary, saved result, reopen, history, and export.

### Invalid setup

- a category is missing;
- a category is assigned twice;
- a judge row is empty;
- the current device has no selected judge;
- the selected judge row is removed;
- setup is opened during an active session;
- an unassigned category is sent directly to saved state.

Every case must fail clearly and without corrupting the active result.

### One-category tray

- hold, enter exact letter, release: one mistake;
- hold, never enter a letter, release: no mistake;
- release outside: no mistake;
- pointer cancellation or app backgrounding: no mistake;
- pinned tap, choose letter, close: no mistake;
- pinned tap, choose letter, confirm: one mistake;
- repeated pointer events: still one mistake;
- keyboard selection and confirmation: one mistake;
- Escape: no mistake.

### Data and scoring

- old history retains identical totals and mistakes;
- conversion is safe to run repeatedly;
- section maximum matches only assigned categories;
- unassigned deductions never affect or enter the record;
- settings changes after finish do not rewrite the result;
- reopen restores the old assignment and old score rules;
- different score scopes are never shown as a single final competition total.

### Visual and regression checks

- desktop with judging rail on the left and right;
- common phone widths in portrait and landscape;
- long judge names and no judge name;
- one, two, and three score rows;
- tray above and below the word near viewport edges;
- all existing Mushaf page, QPC font, target-map, page-switching, and page-604
  fixtures continue to pass unchanged.

## 10. Release acceptance checklist

The update is ready only when all of these statements are true:

- An organizer can set up the common judging arrangements without learning a
  technical model.
- The current device always makes its judge and assigned work obvious.
- A one-category judge never has to choose that category repeatedly.
- A two-category judge never sees the third category as an action.
- No hidden or crafted action can save an unassigned category.
- Every displayed score is visibly a judge-section score.
- Finished and reopened results retain their original judge, categories, and
  scoring rules.
- Old results migrate without score changes and have a recovery copy.
- Touch, mouse, and keyboard interactions are each tested.
- The Mushaf, exact-letter target map, and participant-only reading surface are
  not redesigned by this update.

## 11. Deliberately deferred

These are separate releases because each needs additional competition rules or
religious/content review:

- combining scores from several devices into one final result;
- two judges independently scoring the same category;
- averaging, dropping, or resolving conflicting judge scores;
- official placement and winner calculations;
- synchronization and judge identity accounts;
- exact named tajweed or pronunciation mistake types;
- AI suggestions or audio-based mistake classification.

The data added here gives those later systems reliable ownership to build on,
without pretending they are solved now.

## 12. Confidence and remaining risk

- **92% — feasible as one complete update.** The current category, score,
  session, and event structures already provide most of the needed seams.
- **88% — existing data can be converted safely.** The all-categories default
  preserves the current app's meaning; the backup and repeated-run test are
  still mandatory.
- **82% — the fixed-category hold gesture will feel faster without causing
  accidental deductions.** It is technically straightforward, but needs the
  full touch and cancellation test matrix before release.
- **75% — records and statistics can stay clear with mixed judge sections.** The
  plan avoids false final scores, but the eventual official combining rules
  remain intentionally unresolved.

The main danger is not code size. It is accidentally displaying a partial judge
score as a complete competition result. The frozen assignment, `Your section`
language, hard category guard, and deferred combining system are the controls
for that risk.

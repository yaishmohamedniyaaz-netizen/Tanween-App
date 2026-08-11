# Judge assignments — pre-plan for the next update

Status: accepted direction; expanded into the full implementation plan  
Scope: judging interface only; no participant screen and no multi-device score combining

## The idea in plain language

Competition organizers should be able to say which judge is responsible for
which kind of mistake.

Examples:

- Judge 1: Jali
- Judge 2: Khafi
- Judge 3: Fasaha
- Judge 1: Jali and Fasaha; Judge 2: Khafi
- One judge: all three

The app must then adapt to the judge using that device. A Jali-only judge should
not repeatedly choose Jali after selecting a letter. A judge responsible for
Jali and Fasaha should see only those two choices.

## Recommended next update

This can be one larger, carefully tested update with four connected parts.

### 1. Friendly panel setup

Competition setup asks: **How are the categories divided?**

Offer three starting choices:

1. **One judge covers all** — one judge receives Jali, Khafi, and Fasaha.
2. **One judge per category** — three judge rows are created automatically.
3. **Custom panel** — add or remove judge rows and tick the categories for each.

The number of judges should come from the number of judge rows. Do not add a
separate number field that can disagree with the rows.

Each row contains:

- an optional judge name;
- a simple seat label such as Judge 1;
- Jali, Khafi, and Fasaha assignment buttons.

For this first version, each category belongs to exactly one judge. Two judges
independently scoring the same category requires averaging or another combining
rule, so that belongs to the later multi-judge results system.

### 2. Choose who is using this device

Before judging begins, the app asks: **Which judge is using this device?**

The choice stays in place until deliberately changed. It is recorded with every
finished result so the history can explain whose category score it contains.

The judge should always see a compact identity strip at the top of the judging
panel, for example:

```text
Judge 2 · Jali + Fasaha
```

Use the existing category colors as small squared indicators. Avoid a large
banner, repeated warning, or decorative badge.

### 3. Adapt the score panel and letter tray

If the judge covers all three categories, the current interaction stays the
same.

If the judge covers two categories:

- show only those two choices after the letter;
- show only those two score sections prominently;
- label the total **Your section**, not the competition's final score.

If the judge covers one category:

- keep that category visibly fixed above the mistake list;
- remove the unnecessary three-category choice from the tray;
- the judge chooses the word and exact letter, while the app already knows the
  category;
- the score panel shows only that category and clearly labels it as the judge's
  assigned section.

The safest detailed interaction to test in the full plan is:

- **hold-and-drag:** releasing on the exact letter records the fixed category;
- **tap:** choose the exact letter, then use one small `Mark Jali` confirmation
  rather than committing from an accidental tap.

This keeps the common fast gesture while protecting the slower tap path.

Unassigned categories must never receive a mistake from that device. Hiding a
button is not enough; the saved record must reject an unassigned category too.

### 4. Preserve meaning in finished records

Every session should remember:

- the competition's panel setup at the time judging began;
- which judge/seat used the device;
- that judge's assigned categories;
- the marks and deduction rules used for those categories.

If the organizer later changes the panel, already-finished results keep their
original assignment. Reopening a result also restores its original judge role.

## What should not be included yet

Do not combine several judges' device records in this update. That later system
must decide how duplicate category scores are averaged, what happens when a
judge is missing, who may finalize the result, and how devices synchronize.

Also do not add the exact named mistake taxonomy yet. A fixed-category judge
creates a cleaner path for that future feature, but the list of possible errors
and their religious/competition meaning needs its own reviewed plan. The record
can reserve an optional place for a future mistake type without showing it now.

## Why this is the best next update

The current app already records exact letters and now preserves judge actions.
Judge assignment is the missing layer between those reliable records and future
competition-wide results. It makes today's screen faster for the most common
one-category judge without pretending that multi-device aggregation is solved.

It also prepares the product for the later sequence:

```text
judge assignment
  → each judge creates a clearly owned score
  → several owned scores can later be verified and combined
  → optional exact mistake types can be added without changing ownership
```

## Decisions for the full plan

The full plan should confirm and test these recommended choices:

1. Each category has one responsible judge in this release.
2. Judge count is derived from the panel rows.
3. The current device selects one judge/seat before the first reciter.
4. A one-category hold gesture commits on letter release; tap requires one
   visible confirmation.
5. Unassigned categories are absent from the tray and cannot be saved.
6. A scoped score says `Your section`; it never looks like the final combined
   competition score.
7. Finished sessions freeze their judge assignment and restore it when reopened.

These decisions are expanded into the exact screen flow, saved-data changes,
migration, rollback, and release checks in
[`JUDGE_ASSIGNMENTS_V1_PLAN.md`](./JUDGE_ASSIGNMENTS_V1_PLAN.md).

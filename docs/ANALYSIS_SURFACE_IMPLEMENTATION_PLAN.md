# The Analysis tab: implementation plan

> Written 18 August 2026, on `claude/result-screen-redesign-erk238` at `f8a98b1`,
> immediately after the Review tab rebuild. This is the planning stage for
> steps 3–5 of `RESULTS_AND_ANALYSIS_REDESIGN_PLAN.md`, which owns the Analysis
> surface. Nothing here is implemented yet.

The Review tab now keeps four rules taken from the Settings screen: a box means
*press this* or *attend to this now*; nesting stops at depth 2 with radii
`--r-md` / `--r-sm`; the control count does not grow with the roster; and the
row and the record are different surfaces. The Analysis tab, one `role="tab"`
away, keeps none of them. This plan makes the two tabs one design.

---

## 1. What the screen does today, verified line by line

`RecordsView.tsx`, Analysis panel:

- **`:769`** `.results-analysis-intro` — a boxed heading with a filter
  disclosure inside it. A box around a heading is grouping-by-container, the
  exact pattern the Review rebuild removed; and the disclosure hides two
  filters that Review now shows inline.
- **`:783–795`** three `.metric` cards: Judge results, **Average score**,
  Mistakes logged.
- **`:797`** the caveat: *"these are not normalized participant comparisons."*
- **`:801`** `.records-grid` holding three `.panel` boxes: **Mistakes by
  category** (`:804`, four count bars), **Most marked letters** (`:830`, ten
  chips), **Most repeated mistakes** (`:849`, eight rows).

`lib/stats.ts`, all of it:

- **The average is false.** `pctSum += (s.total / s.totalMax) * 100` runs over
  judge *sections* — a 44/50 Jalī section and an 8/10 Adu section enter the mean
  as 88 and 80 as if they measured the same thing. The result is rendered at
  26px as the largest number on the screen, with a sentence under it saying not
  to believe it. A number that needs a disclaimer in its own row is not
  information.
- **`avgScore` is computed and rendered nowhere.**
- **The evidence is discarded before the screen sees it.** A `Mistake` carries
  `tid`, `wordId`, `wordText`, `surah`, `ayah`, `page`, `glyph`, `label`,
  `amount`. `computeRecords()` keeps a glyph frequency, a per-`tid` count, and
  a label. `page` is dropped. `wordText` is dropped. `amount` survives only as
  a per-category sum. The judge (`session.assignment`) is never read.
- **Correctly excluded and staying excluded:** whole-recitation criteria
  (Adu & Raagu) have no letter-level evidence; `CATS = PINPOINT_CATEGORIES`
  is right.

So the tab spends the most precise dataset in the app — letter-exact marks with
page coordinates — on three count summaries, and crowns them with a mean that
is not a mean of anything.

## 2. The shape: the same two-pane grammar as Review

Review settled the pattern: one ledger, one record, hairlines inside both.
Analysis reuses it with different nouns. This fuses candidates **A**
(page-as-evidence) and **B** (teaching list) of `records-analysis-study.html`
the same way Review fused its B+A — the list candidate becomes the ledger, the
page candidate becomes the record.

**The ledger — repeated locations, as a table.** One row per marked location,
the full list rather than a top-eight, sorted by count:

| Word | Location | Marks | Reciters | Top category |
| --- | --- | --- | --- | --- |
| بِسْمِ | الفلق ١ · p604 | 5 | 3 | Jalī |

Every column is already in the data once §3 stops discarding it. "Reciters" is
the number the top-eight list cannot show today and the one a coach actually
asks: is this one struggling reciter, or the whole class?

**The record — the page as evidence.** Selecting a row shows the real Mushaf
page with the marked word lit in its criterion's colour, plus the drill: which
reciters, which judge, which category, each mark's amount. This is candidate A,
and it is buildable with machinery that already exists —
`QuestionMushafPreview.tsx` already renders a read-only page (`loadPage`,
`loadQcfPageFont`) and highlights a word-id set (`rangeWordIds`). The record
pane is that component's pattern with a mistake-derived word set instead of a
question range. Legacy mistakes without `wordId` fall back to showing the drill
without the page highlight — degrade, don't block.

**The metric row shrinks to what is true at a glance.** Average score goes.
Nothing replaces it that needs a caveat: *Judge results · Mistakes logged ·
Reciters marked*. Three facts, no disclaimer sentence, and the `:797` caveat
line is deleted because nothing on the screen is untrue anymore.

**Letters become a filter, not a panel.** "Most marked letters" and the
locations list answer the same question at two zoom levels — rule 2, one thing
has one home. The letter chips move above the table as filters: press ح, the
table shows locations whose glyph is ح. The category bars follow the same move:
pressing a category filters the table. What was three read-only panels becomes
one table with two filter rows.

**Filters come out of the disclosure.** Scope, age group — inline, exactly as
Review's `.results-review-bar` does it. The intro box dissolves into a heading.

Box count after: the ledger and the record. Same two as Review.

## 3. The data seam: `lib/stats.ts`

Additive changes only — every current field keeps its meaning:

- `topLocations` entries gain `page`, `wordText`, `surah`, `ayah`,
  `wordId`, `reciters` (distinct participant count), `deducted` (summed
  amount), and a per-category count map — and the `slice(0, 8)` moves out of
  the library into the view, because the library was deciding a screen
  question.
- A location keeps the sessions that marked it (`sessionId`, participant id,
  judge seat from `assignment`), so the record pane needs no second pass over
  history.
- `avgPercent` and `avgScore` are deleted, not deprecated — nothing else
  imports them (verified: `computeRecords` has one caller, `RecordsView:194`).
- New scalar: `participantsMarked` (distinct participants in scope) for the
  third metric.

`results-review.test.mjs` and a new `stats` test pin: a location aggregates
across sessions but counts reciters distinctly; a legacy mistake without
`wordId` still produces a row; Adu & Raagu never enters the counts.

## 4. The order to do it in

Each step ships and reverts alone, smallest risk first.

1. **Delete the false average, add `participantsMarked`.** `stats.ts` +
   the metric row + the caveat line. Smallest diff, closes the one active
   *wrongness* (everything else is missed opportunity). Half a day.
2. **The stats seam (§3).** No visible change yet; tests pin the new fields.
3. **The table replaces the three panels**, letter and category chips as
   filters, filters out of the disclosure, intro box dissolved. The screen
   change.
4. **The record pane with the page.** The `QuestionMushafPreview` reuse.
   Largest piece; degrade path for legacy `wordId`-less data named in §2.
5. **Judge calibration — still deferred.** Candidate C of the study remains a
   deliberate refusal: with one seat per criterion most judge pairs share no
   reciters, and the honest output is "nothing to compare". Anything stronger
   is the many-facet Rasch decision in `UNDECIDED_DECISIONS.md`, a rules
   question with an owner, not a screen.

## 5. Out of scope, named so it is not read as free

- **Cross-competition normalization.** The scope filter already mixes stored
  competitions; making their numbers comparable is a rules question.
- **Exporting the analysis.** The workbook is the export surface; nothing here
  adds sheets to it.
- **The stored-judge-results list** below the Review table (~2,400px with 32
  sessions). Its own pass.

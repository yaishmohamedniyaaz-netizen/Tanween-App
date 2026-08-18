# Results and analysis: the redesign plan

> **Revised 16 August 2026, against `main` at `aced7d1`.** The first version of
> this file was written against a branch point that predated the results Pass 1.
> Two of its four headline findings have since been fixed on main, independently
> and in substantially the way this file proposed. They are recorded as closed in
> §1 rather than deleted, because the fix confirms the finding.
>
> This file now sits alongside, not instead of, main's own results documents:
> [`RESULTS_SCREEN_DESIGN_RESEARCH.md`](./RESULTS_SCREEN_DESIGN_RESEARCH.md),
> [`RESULTS_PASS_1_IMPLEMENTATION_PLAN.md`](./RESULTS_PASS_1_IMPLEMENTATION_PLAN.md)
> and its follow-on
> [`INTERFACE_SIMPLIFICATION_AND_JUDGING_FLOW_PLAN.md`](./INTERFACE_SIMPLIFICATION_AND_JUDGING_FLOW_PLAN.md).
> Those own the **Results** surface. What this file still owns is the
> **Analysis** surface, which Pass 1 did not touch, plus three loose ends on
> Results that Pass 1 left.

Two surfaces, both inside `RecordsView.tsx` (952 lines):

| | Where | Job |
| --- | --- | --- |
| **Results** | `FinalResultsPanel.tsx` (414 lines), rendered at `RecordsView.tsx:783` | Combine each participant's judge-owned sections into one official result, then export it. |
| **Analysis** | `RecordsView.tsx:827` onward | See what the collected marks say. |

---

## 1. What Pass 1 closed

**The Review surface is now a table beside one open record.** The four tinted
status cards, the boxed review section, the filter disclosure and the
expand-in-place rows are gone. `FinalResultsPanel.tsx` renders one `.results-table`
grouped by division in place order, with `.results-record` docked beside it. The
measured reason: the shipping screen nested boxes four deep at radii 12/10/8/6
and carried 110 distinct class names against the Settings screen's 28, and
grouping-by-box is what a hairline and 22px of space do in `.settings-fieldset`.

**The total is now visible before it is committed.** `FinalResultsPanel.tsx:229`
builds a `preview` through `buildParticipantResultPreview`, and `:240` renders it
as `displayedTotal` under the label **Proposed total**, switching to **Final
total** once placed (`:294`). The judge now sees the number before pressing
Finalize. This was the single largest finding in the first version of this file,
and it is done.

**A criterion with two sources is now chosen by its mark.** `:349` renders each
option as `Judge · revision N · 27/30`, and `:359` adds a selection line reading
*"Selected revision 1 · 27/30"*. Picking a person rather than a number is no
longer possible.

Both are worth noting for a reason beyond bookkeeping: two independent passes
reached the same two fixes, which is the strongest evidence available that they
were real defects rather than preferences.

---

## 2. What still stands

Verified line by line against the current working tree, not inferred.

### Results — three loose ends

**2.1 The audit reason is a field. Closed.** `window.prompt` is gone; the
record carries a `.results-reason` textarea, and Finalize stays disabled until a
revision carries text. There is now no `window.prompt` in the application.

**2.2 The standings are on the screen. Closed.** `rankRowsByDivision()` in
`lib/finalResults.ts` ranks *any* row — a proposed total as well as a finalized
one — inside its own division, and `placeFinalizedResults()` now delegates to
it. The table's first column is Place, and the open record names the standing.
A row with no total is kept, unplaced, at the end of its division.

**2.3 The verification manifest is visible. Closed.** It is a fact in the open
record, next to the standing, reading "After finalizing" until there is one.

### Analysis — untouched by Pass 1

**2.4 Average score still averages across rubrics.** `lib/stats.ts:99` is
unchanged: the mean of `total / totalMax` over every session in scope, where
sessions are judge *sections* with different maxima and different rubrics. It is
still rendered at `RecordsView.tsx:846` as the middle metric card, at 26px.

Pass 1 did add a caveat beneath the row (`:853`): *"these are not normalized
participant comparisons."* That is an improvement and it is not sufficient — a
sentence under a number does not undo the number, and this is the largest number
on the screen. The fix is to remove the card or replace it with something that
is true at a glance, not to annotate it.

**2.5 The pinpoint data is still spent on a bar chart.** `lib/stats.ts` is
unchanged. A `Mistake` carries `tid`, `wordText`, `surah`, `ayah`, `page`,
`glyph`, `label` and `amount`; `computeRecords()` still reduces it to four
category counts, a top-ten letter frequency and a top-eight location list. Page
is discarded. Word is discarded. The three panels at `RecordsView.tsx:860`, `:886`
and `:905` are the same three.

**2.6 There is still no judge comparison anywhere.** `lib/stats.ts` contains no
reference to judge. The accountability layer `VISION.md` leads with — the record
that *"exposes weak judges"* — remains unimplemented on the screen that would
implement it.

---

## 3. The order to do it in

Scoped so each piece is separately shippable and separately revertible.

**Steps 1 and 2 — done.** See §1. The shape that shipped is the table with a
docked record, drawn as "B+A" in `results-screen-candidates`: candidate B's
columns follow `finalResultsWorkbook.ts` exactly — Place, participant number,
name, the judged criteria in reading order, Total — so the screen and the
exported sheet are one object, and candidate A's detail pane is docked rather
than overlaid. Two boxes on the screen, radii `--r-md` and `--r-sm`, nesting
depth 2.

**Step 3 — the average-score card (2.4).** A deletion plus a decision about what,
if anything, replaces it. Cheap to do, needs an owner's call on what the three
cards should say — which is why it is not bundled with step 4.

**Step 4 — the analysis surface (2.5).** The real work, and the reason the two
studies exist. Requires `computeRecords` to retain `page` and `wordText` rather
than discarding them — a contained change to `lib/stats.ts`, named here so the
studies are not read as free. Candidates **A** and **B** of
`records-analysis-study.html` are the two shapes worth building; A is the one
nothing else in the world can draw.

**Step 5 — judge calibration (2.6).** Last, because it is the only piece that
reaches past design into statistics. Candidate **C** of the analysis study is
deliberately mostly a refusal: with one seat per criterion, most judge pairs
share no reciters and the honest output is *"nothing to compare"*. Anything
stronger needs the many-facet Rasch treatment named in §2.2 of the study, and
that is a rules decision with an owner, not a screen.

---

## 4. Which study answers which step

| Step | Study | Section |
| --- | --- | --- |
| 1 | `final-results-study.html` | Candidate B's in-card reason field |
| 2 | `final-results-study.html` | Candidates C and D |
| 3 | — | Owner's decision |
| 4 | `records-analysis-study.html` | Candidates A and B, §04 amendments 1 and 3 |
| 5 | `records-analysis-study.html` | Candidate C, §02.2 |

Both studies were built before Pass 1 and mock the pre-Pass-1 screen. Their
candidates are still valid as shapes; their "today" columns are not, and should
be read against §1 above rather than against the current app.

---

## 5. Out of scope, named so it is not read as free

- **The Results surface's information architecture.** Owned by
  `INTERFACE_SIMPLIFICATION_AND_JUDGING_FLOW_PLAN.md`. Steps 1–2 above are
  additions inside that architecture, not a redesign of it.
- **Splitting Results and Analysis into separate views.** The first version of
  this file argued for it on rule-2 grounds. Pass 1 has since given them separate
  headed sections inside one view, which may be enough; deciding that is the
  owner's call and it blocks nothing above.
- **The export workbook.** `finalResultsWorkbook.ts` still writes two sheets
  against the eight `PRODUCT_FOUNDATION.md` §10.5 specifies. Real gap, separate
  work.
- **Multi-judge combining rules.** Still undecided (`UNDECIDED_DECISIONS.md`).
  Everything above shows a *choice between* two judges' sessions, never an
  average of them.

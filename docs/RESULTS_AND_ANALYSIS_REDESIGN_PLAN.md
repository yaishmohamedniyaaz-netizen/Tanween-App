# Results and analysis: the redesign plan

Two screens are in scope, and they are currently one screen:

| | Component | Job |
| --- | --- | --- |
| **Results** | `FinalResultsPanel.tsx` (310 lines) | Combine each participant's judge-owned sections into one official result, then export it. |
| **Analysis** | `RecordsView.tsx` (470 lines) | Find a past result, and see what the collected marks say. |

`RecordsView.tsx:452` renders `<FinalResultsPanel />` as its last child, and
`FinalResultsPanel` is imported nowhere else. So the act with the most
consequence in the whole product — committing an official mark — happens at the
bottom of a statistics page, after a scroll.

This file states what is wrong in terms that can be checked, then names the four
candidates built for each screen and the grammar rules each one bends.

---

## 1. What is actually wrong

Not taste. Each item below is a line of source or a number.

### 1.1 The number is invisible until after it is committed

`FinalResultsPanel.tsx:279–294`: the score renders only when `placed && !stale`
— that is, only for a participant already finalized. Before finalizing, the same
slot shows one of four grey words: `Ready`, `Needs judge result`,
`Participant details missing`, `Source changed`.

So the judge presses **Finalize** without having seen the total it produces.

The data to show it is already computed. `finalizeParticipantResult`
(`lib/finalResults.ts:97–120`) reads `computeCategoryScores(...)` per criterion,
holding `score`, `max`, `judgeName` and `sessionRevision` for each — then sums
them. Every one of those numbers exists at render time and none reaches the
screen.

This is the whole finding. Everything else on this screen is smaller than it.

### 1.2 A criterion with two sources is chosen by judge name, not by mark

`FinalResultsPanel.tsx:253–272`. When two judges have sessions for the same
criterion, the cell becomes a `<select>` whose options read
`Judge 2 · revision 1`. The two marks that differ — the only reason the choice
exists — are not shown. The judge picks a person, not a number.

### 1.3 `window.prompt()` collects the audit reason

`FinalResultsPanel.tsx:137`. The reason recorded against an official revision —
the field that makes the revision accountable — is gathered through a browser
dialog. It is the only `window.prompt` in the application (`window.confirm`
appears five times; `prompt` once). It cannot be styled, cannot be validated,
shows no character count, carries none of the app's language, and is blocked
outright in some embedded contexts.

### 1.4 The standings are computed and thrown away

`lib/finalResults.ts:151` — `placeFinalizedResults()` groups by age group and
participant category, sorts by ratio, and handles ties by not advancing the
place number. Its entire output reaches the screen as `Place 3 · revision 1` in
`<small>` inside a per-row score chip (`FinalResultsPanel.tsx:282`).

The screen is called **Final results** and cannot show a ranking. Winners by
division is sheet 2 of the export the foundation document specifies
(`PRODUCT_FOUNDATION.md` §10.5).

### 1.5 The verification hash is never shown

`lib/finalResults.ts:142` stamps every finalized result with
`manifest: fnv1a-<hash>`. `finalResultsWorkbook.ts:78` writes it into the
workbook and `:150` reads it back to verify a re-imported file. Grepping `src/`
for `manifest` returns the library, the workbook, and the type — no component.

The app computes the evidence that a result is unaltered and never lets anyone
look at it.

### 1.6 The average score averages across different rubrics

`lib/stats.ts:58`:

```js
pctSum += s.totalMax > 0 ? (s.total / s.totalMax) * 100 : 0;
```

summed over every session in scope, then divided by the count
(`stats.ts:97`). Sessions are judge-*sections*: a Jalī-only assignment and a
full-panel assignment have different maxima and different rubrics. The default
filter state is `All judges` / `All sections` (`RecordsView.tsx:166,173`), so the
default reading of **Average score** is a mean of percentages drawn from
rubrics that were never comparable.

`PRODUCT_FOUNDATION.md` §10.3 states the rule this breaks: *"Do not rank across
categories with different rubrics unless an explicit normalized 'overall winner'
rule exists."* The metric card does not rank, but it invites the same
comparison, and it is the largest number on the screen at 26px
(`global.css` `.metric-num`).

### 1.7 The pinpoint data — the product's entire differentiator — is spent on a bar chart

Every `Mistake` carries `tid`, `wordText`, `surah`, `ayah`, `page`, `glyph`,
`label` and `amount` (`types.ts:60–80`). That is a letter, located on a printed
page, with the word it belongs to.

`computeRecords()` reduces all of it to: four category counts, a top-10 letter
frequency, and a top-8 repeated-location list (`lib/stats.ts:77–92`). Page is
discarded. Word is discarded. The result is a bar chart that any judging app
with plus/minus buttons could draw.

`VISION.md` names pinpointing as the thing that *"may multiply the value of each
competition tenfold"*. The analysis screen is where that value is meant to be
realised, and it is the screen that throws the pinpoints away.

### 1.8 The accountability layer does not exist

`VISION.md`: *"Reviewable accuracy exposes weak judges, creates accountability…
Weak judges who pretend get phased out."*

Judge appears in `RecordsView` as a filter dropdown (`:163–169`) and as a name
in a session row. There is no view in which one judge's marking can be compared
with another's. The promise that justifies the product is unimplemented on the
screen that would implement it.

### 1.9 Six facts in one run-on line

`RecordsView.tsx:374–381` — a session's meta line joins age group, category,
institution, date, mistake count and judge name with `·`. Nothing aligns
between rows, so nothing can be compared down the list.

---

## 2. What other people do with this problem

Four worlds have solved a version of these two screens already. Links are to
what was actually read, not to a search page.

### 2.1 Sport that is judged rather than measured

**Figure skating's protocol sheet** is the closest living relative of the
results screen. After every performance the ISU publishes a *judges details
score* sheet: one row per element, its base value, the grade of execution each
of the nine judges gave, the trimmed mean, and the element's final score — then
the component marks, then the deductions, then the total. The arithmetic is
printed in full so that anyone can re-add it.
— [ISU Judging System](https://en.wikipedia.org/wiki/ISU_Judging_System) ·
[Reading figure skating scorecards, JudgeMate](https://www.judgemate.com/en/guides/reading-figure-skating-scorecards) ·
[Introduction to the IJS](https://www.soyouwanttowatchfs.com/guides/ijs-overview)

The transferable move: **show the addition, not the answer.** Our result is
`Jalī + Khafī + Faṣāḥa + Adu/Raagu`, each from a named judge. That is a protocol
row. Printing it before the commit fixes §1.1 and §1.2 at once.

**Gymnastics goes one step further and judges the judges.** The FIG's Judge
Evaluation Program exists to *"provide constructive feedback to judges… assign
the best judges to the most important competitions… detect bias and outright
cheating."* Its marking score scales each judge's mark against the estimated
true performance as a function of the intrinsic judging-error spread for that
apparatus, so a deviation is read relative to how noisy that apparatus is.
— [Judging the Judges (arXiv 1807.10021)](https://arxiv.org/abs/1807.10021) ·
[FIG General Judges' Rules, 16th cycle](https://www.gymnastics.sport/publicdir/rules/files/en_1.2%20-%20General%20Judges'%20Rules%202025-2028.pdf) ·
[Olympics.com on the statistics](https://www.olympics.com/en/news/how-statistical-analysis-evaluates-fairness-accuracy-gymnastics)

That is §1.8's missing screen, already designed by someone with more at stake.

### 2.2 Examinations that already measured this exact bias

Medical education calls it the **hawk–dove effect**, and has measured it for
twenty years. In the MRCP(UK) PACES clinical examination, multi-facet Rasch
modelling of examiner judgements attributed roughly **87% of score variance to
candidate differences, 1% to station differences, and 12% to differences between
examiners in leniency–stringency.**
— [Assessment of examiner leniency and stringency, BMC Medical Education](https://bmcmededuc.biomedcentral.com/articles/10.1186/1472-6920-6-42) ·
[European Diploma of Anaesthesiology cohort study, PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC11556864/)

Two things follow, and the second is the important one:

1. Judge severity is real, measurable, and worth a screen.
2. It is only measurable **when judges are compared on common candidates.** The
   Rasch approach works because examiners overlap. Any calibration view we build
   must state its own sample and refuse to compare judges who never scored the
   same reciters — otherwise the screen reports who each judge happened to be
   given, dressed up as how strictly they mark.

### 2.3 Teaching, which has recorded oral errors on a text since 1966

Marie Clay's **running records** and Goodman's **miscue analysis** are the
direct ancestors of what Tahqeeq does: a trained listener marks a reader's
errors onto the text itself, then analyses the pattern to decide what to teach
next. The coding is on the passage; the analysis is about the child.
— [Running Records 101: history, scoring, coding, analysis](https://literacypages.wordpress.com/2018/08/21/running-records-101-the-history-how-to-score-code-analyze/) ·
[Metatheoretical differences between running records and miscue analysis (NCTE)](https://publicationsncte.org/content/journals/10.58680/rte201829753) ·
[A narrative review of the evidence for running records (2026)](https://journals.sagepub.com/doi/10.3102/00346543251348258)

The transferable move: **the analysis ends in a teaching claim, not a count.**
A row that reads *"ٱلنَّفَّٰثَٰتِ — 9 of 14 reciters, mostly Jalī"* is
actionable. A bar labelled *"Lahn Jali — 184"* is not.

### 2.4 Reconciliation, election night, and dense tables

- **Transaction matching** UIs give the operator a queue that empties: a
  suggested match, a confirm, a skip, and an audit log of every action taken.
  The screen's success condition is reaching zero.
  — [Transaction matching, Nominal](https://www.nominal.so/blog/transaction-matching/)
- **Election results** solved *provisional versus final* long ago: the leader is
  shown alongside how much is still to come, so nobody mistakes an early total
  for a result. Flourish's survey of the idioms is a decent index.
  — [16 ways to visualize elections data](https://flourish.studio/blog/report-on-elections-with-flourish/)
- **Chess crosstables** put one row per player and one column per round, with
  the diagonal blocked out — the densest legible form of "who met whom, and what
  happened".
  — [FIDE Grand Swiss 2025 crosstable](https://s3.chess-results.com/tnr1246285.aspx?lan=1&art=2&rd=9&turdet=YES&flag=30&SNode=S0) ·
  [How to read a crosstable](https://chesstournamentguide.com/rules-ratings/what-is-a-crosstable-in-chess/)
- **Tufte's sparklines** are the licence for putting the evidence *inside* the
  row rather than in a chart panel beside it: *"small, intense, simple,
  word-sized graphics"* that raise the data per eyespan without a second glance.
  — [Sparkline theory and practice](https://www.edwardtufte.com/notebook/sparkline-theory-and-practice-edward-tufte/) ·
  [Small multiples](https://www.juiceanalytics.com/writing/better-know-visualization-small-multiples)

---

## 3. The candidates

Both studies follow the house format: four live candidates, measured at run time
by the same code that draws them, then failed against the grammar.

### 3.1 Results — `docs/final-results-study.html`

| | Candidate | Borrowed from | Its bet |
| --- | --- | --- | --- |
| **A** | **Protocol sheet** | ISU judges details | One row per reciter, one column per criterion, the addition printed. Comparison runs down a column. |
| **B** | **Reconciliation queue** | Transaction matching | The screen sorts itself by what blocks you and ends at zero. One reciter at a time gets the full width. |
| **C** | **Reporting board** | Election night | Division standings with a per-row completeness meter — *3 of 4 sections in*. Provisional totals are visibly provisional. |
| **D** | **Ledger page** | The printed record itself | Each result is a small signed document: figures in a column, a rule, a total, the judges as signatories, the manifest as a seal. |

Every candidate shows the criterion marks before the commit. That is not a
variable under test — §1.1 is a defect, and all four fix it.

### 3.2 Analysis — `docs/records-analysis-study.html`

| | Candidate | Borrowed from | Its bet |
| --- | --- | --- | --- |
| **A** | **The page as the evidence** | Statcast-style density on the field of play | The Mushaf page *is* the chart. Frequency is painted onto the words that were marked. |
| **B** | **The teaching list** | Running records / miscue analysis | Rows are claims a teacher can act on, with the sample size on every one and a sparkline for direction. |
| **C** | **Judge calibration** | FIG JEP, hawk–dove Rasch studies | One row per judge seat, compared only across reciters they both scored, with the overlap stated. |
| **D** | **Ask one question** | — | No dashboard. A short list of questions in plain words; answering one takes the screen. |

---

## 4. Grammar amendments

The owner's instruction was *law, but propose amendments*. Four, each with its
one sentence.

**Amendment 1 — rule 3, colour is a verdict.** Density is not a verdict, so a
heat overlay painted in category colour would be a false signal. *Proposal: in
analysis, frequency is carried in ink alpha alone; a category colour appears
only once the view is filtered to a single criterion, at which point the colour
is reporting a verdict that was actually given.* The rule survives intact.

**Amendment 2 — rule 10, a control is at least 44px.** The rule states its own
reason: *"a judge is listening to a person recite; they cannot also be aiming."*
Neither review screen is ever open during a recitation. *Proposal: record the
44px floor as a live-judging rule, and permit 32–36px rows in Records and Final
results* — which is the difference between a protocol table showing six reciters
and showing twelve. Anything destructive keeps 44px regardless.

**Amendment 3 — rule 1, the page is the evidence.** Written as a Mushaf-screen
rule, it reads as being about layout. *Proposal: promote it — the evidence is
the page wherever evidence is shown, analysis included.* This is the whole
argument for analysis candidate A, and it is the reason §1.7 is a defect rather
than a preference.

**Amendment 4 — a new rule 11.** The grammar has no rule that would have caught
§1.1. Proposed wording, in the file's own voice:

> **11. A number is visible before it is committed.**
> The mark that goes on a reciter's record is shown, with its parts, before the
> control that commits it can be pressed. A screen that reports a total only
> after the act is a screen that asked for consent to a number it did not name.
> *Fails this rule:* Final results, which shows `Ready` where the total belongs.

Rule 2 needs no amendment — it needs applying. Final results is a second home
for a distinct job and belongs in its own view, not at the foot of Records.

---

## 5. What is deliberately not in scope

- **The export workbook.** `finalResultsWorkbook.ts` writes two sheets,
  `Results` and `Verification` (`:118–119`), against the eight the foundation
  specifies (§10.5). Real gap, separate piece of work.
- **The scoring engine.** No candidate changes how a mark is computed.
- **`computeRecords` itself.** Candidates A–C of the analysis study need page
  and word retained rather than discarded (§1.7); that is a small, contained
  change to `lib/stats.ts` and it is named here so the studies are not read as
  free.
- **Multi-judge combining rules.** Still undecided
  (`UNDECIDED_DECISIONS.md` §13). The studies show the *choice between* two
  judges' sessions, never an average of them.

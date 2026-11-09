# Codex task: letter underlines for the whole Mushaf

> **Superseded (9 November 2026)** by `docs/CODEX_TASK_DIGITALKHATT_LETTER_COLOUR.md`: the app will colour the mistaken letter itself using the DigitalKhatt font, instead of underlines. **Do not continue this task.** Its code and data stay for reference.

Status: ready to hand over (6 November 2026).
Base branch: `claude/criterion-bar`. Work on a new branch `codex/letter-borders-all-pages`.
**Never push to `main`** (a push to main deploys the live app).

Read first, in this order:
1. `docs/LETTER_LEVEL_HIGHLIGHT_TRIAL_PLAN.md`: why the underline exists and the rules for it.
2. `docs/CODEX_TASK_LETTER_BORDERS.md`: the earlier task, every method tried so far, and the measured results. This task **continues** that one; don't repeat its experiments without a reason.

## The goal in one sentence

Learn from the owner's hand-approved letter borders and produce a **letter-border guess for every word on all 604 pages**, with an honest **confidence** for each word, so the app can draw the mistake underline everywhere.

## Why

When a judge marks a letter, the app draws a 2.25 px bar (the "underline") under that letter. Today the bar only appears on the 125 words whose borders the owner has approved (`public/letter-borders/`). Everywhere else the judge sees only the word highlight. The owner wants the underline on every page while he decides the marking design. Hand-approving ~77,000 words is not possible, so the borders must be learned.

## Rules you must not break

- **Do not edit** the Quran text, the page artwork, the word boxes or the letter units: `public/mushaf/`, `src/lib/judgingUnits.ts`, the page data.
- **Do not write into `public/letter-borders/`.** That folder holds *approved* borders only. Guesses go in a separate folder (see Output). A guess must never be presented as approved.
- **No change to the app (`src/`)** in this task. Claude wires the app to your output afterwards.
- Letter units are the app's own (`judgingTargetsOf`, rule version `qpc-hafs-v1-targets-4.0.0`):
  - madd alifs are merged into the letter that carries them;
  - never-pronounced letters are their own letters (flagged `silent`) and need their own borders.
- Borders, per word with N letters:
  - exactly N+1 borders, right to left, strictly decreasing;
  - the first and last are the word's rightmost and leftmost ink (already exact);
  - no gaps, no overlaps;
  - every letter at least 2 artwork px wide.
- No model decides that a border is correct. Only the owner's approvals and the held-out test say how good a method is.

## What you can learn from

| Source | What it is |
| --- | --- |
| `scripts/letter-masks/approved/all-approvals-2026-11-06.json` | **Main training set**: 125 approved words (all of pages 1–2, plus a fixed random sample of 60 words from 20 regular pages) |
| `public/letter-borders/p{N}.json` | The same approvals in the app's format (`tids`, `x` borders in artwork px, right to left) |
| Any newer file in `scripts/letter-masks/approved/` | Use it too if the owner has added approvals since this was written; say so in the hand-back |
| `public/mushaf/1405-artwork-5a5f9f3846158475/p{N}.png`, `p{N}.json` | Page artwork (1920 × 3106) and word boxes, all 604 pages |
| `scripts/letter-masks/*.py`, `*.mts` | The existing pipeline: export, letter units, all tried methods, scorers (listed in the earlier task) |

**Test-set rule (keep it strict):**
- Tune only on pages 1–2 and the **dev** half of the 60-word sample.
- Score the hidden **test** half (`sample_compare.py ... test`) **once**, at the end, and report it.
- If you add more held-out words, say how they were chosen.

## Methods to build on

The earlier task measured these. The most promising, in order:

1. **Copy from the same spelling.**
   - Warping an approved drawing of a word onto another drawing of the same word gave **75% of borders within 2 px, 5% big errors** (42 pairs).
   - The 40 most common spellings cover 19% of the Quran, 100 cover 29%, 1,000 cover 56%.
   - Use this wherever an approved drawing of the same spelling exists.
2. **Shape matching of approved letters.** Cut each approved letter's ink out of its word. Match it (normalised cross-correlation, small shifts and scale) inside new words, for the same letter in the same position (start, middle, end, alone).
3. **Joint detection.**
   - Borders between joined letters sit on the thin baseline stroke: use stroke thickness, not only column ink.
   - Treat tall letters (alif, lam, kaf) as no-cut zones.
   - Known systematic error: on stretched joins (kashida) the owner gives the stretch to the **left** letter. 95 of 103 big errors were too far left.
4. **Combine** with dynamic programming over border positions: joint score + shape score + copy score + learned width as a weak prior.
5. Method A (joined borders moved right by 0.046 of the word height) is the current best simple baseline. Beat it.

**Remember anchoring:** the owner started from the old first guess and kept 41% of its borders as they were. Report how often a method matches the approval *exactly*, and look at failures by eye before trusting a px score.

## Output

1. **Guess files:** `public/letter-borders-guess/p{N}.json` for N = 1…604, same format as the approved files, plus confidence:

   ```json
   {"page": 580, "ruleVersion": "qpc-hafs-v1-targets-4.0.0", "method": "<short name + version>",
    "words": {"76.29.8": {"tids": ["76.29.8@r0", "..."], "x": [486, 426, 382, 320, 260],
                          "confidence": "high", "source": "copy|shape|joint|fallback"}}}
   ```

   - `confidence` is one of `high`, `medium`, `low`.
   - **Calibrate it on dev, then report it on test.** `high` must mean that at least 95% of those words have every border within 2 px. Report the real rate on test, even if it is lower.
   - Skip words that already have an approved border (the app uses the approval first).
   - `public/letter-borders-guess/index.json` lists the pages and the method name.
   - Keep each page file small (integers only, no indentation).
2. **Generator:** `scripts/letter-masks/border_guess_all.py`, which builds every page from scratch with one command.
   - It must be deterministic: the same input gives the same output.
   - Document the command, the running time and the Python packages.
3. **Checks over the full Mushaf** (script plus numbers in the hand-back):
   - every word has N+1 borders, strictly decreasing, inside its word box, every letter at least 2 px;
   - every `tid` matches the app's letter units for that word (`dump_units.mts`);
   - counts per page: words, guessed words, high / medium / low.
4. **Contact sheets** for the owner to check by eye: `scripts/letter-masks/contact/`.
   - 200 random words from pages 3–604, seed 20261106.
   - Each word: its crop with the borders drawn and the confidence. 20 words per PNG.
   - Plus one sheet of the 40 **lowest-confidence common words**.
5. **Review queue:** `scripts/letter-masks/review-queue.json`. List the low-confidence words, **most common spellings first**, so that each owner approval fixes as many words in the Quran as possible.

## Measures to report (a table, like the earlier task)

On dev, and once on test:
- median error (px at desktop page size, 473.6 px page width);
- borders within 2 px;
- borders off by more than 5 px;
- words with every border within 2 px;
- words *exactly* equal to the approval;
- **short centred bar:** the share of letters where a bar at 40% of the guessed letter width, centred, sits fully under the right letter. The earlier task measured 85% for the old guess. The app may draw the shorter bar for guessed words, so this number matters most.
- the same measures per confidence level.

**Targets:**
- **within 2 px for at least 85% of inner borders**, or the short centred bar fully under the right letter for at least 95% of letters;
- plus a `high` confidence level that really is at least 95% right.

If no method reaches the targets, still deliver the best one with honest numbers, and say which letter pairs fail most.

## Hand back

- Push the branch `codex/letter-borders-all-pages`. **Not main.**
- Append to the end of this file:
  - the results table;
  - the 10 worst test words with their errors;
  - the full-Mushaf check numbers;
  - running time;
  - anything you could not do, and why.
- Then Claude:
  - connects the app to the guesses, with a prototype switch and the shorter bar for words that are not approved;
  - shows the owner the contact sheets;
  - asks him to review the queue.


---

## Codex hand-back — 6 November 2026

**Delivered on `codex/letter-borders-all-pages`; based on `claude/criterion-bar`
at `c34daec`. No app wiring or live deployment. The accuracy target was not met.**

The chosen `copy-joint-shape-v1` implementation ships exact-spelling DTW copies
where a training approval with matching target forms exists, otherwise Method A.
The bounded shape/joint DP candidate did not improve dev and was not used for
production. This is a measured improvement over A, not production-accurate letter
placement. No tuning followed the one held-out evaluation.

### Results

| Split / method | Words | Median px | Borders ≤2px | Borders >5px | Whole words ≤2px | Exact words | Exact inner borders | 40% bars contained |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Dev: First guess | 30 | 0.00 | 68.6% | 4.3% | 46.7% | 16.7% | 54.3% | 92.0% |
| Dev: Method A | 30 | 1.48 | 81.4% | 4.3% | 53.3% | 0.0% | 12.9% | 94.0% |
| Dev: Copy + Method A | 30 | 1.48 | 81.4% | 2.9% | 53.3% | 0.0% | 7.1% | 95.0% |
| Dev: Chosen / high | 5 | 0.25 | 100.0% | 0.0% | 100.0% | 0.0% | 14.3% | 100.0% |
| Dev: Chosen / medium | 1 | 2.10 | 50.0% | 0.0% | 0.0% | 0.0% | 0.0% | 100.0% |
| Dev: Chosen / low | 24 | 1.48 | 80.3% | 3.3% | 45.8% | 0.0% | 6.6% | 94.1% |
| Test (once): First guess | 30 | 1.73 | 53.3% | 22.2% | 40.0% | 3.3% | 30.0% | 70.8% |
| Test (once): Method A | 30 | 1.85 | 58.9% | 13.3% | 33.3% | 0.0% | 4.4% | 77.5% |
| Test (once): Copy + Method A | 30 | 1.73 | 64.4% | 11.1% | 36.7% | 0.0% | 2.2% | 82.5% |
| Test (once): Chosen / high | 2 | 1.11 | 100.0% | 0.0% | 100.0% | 0.0% | 0.0% | 100.0% |
| Test (once): Chosen / medium | 3 | 0.99 | 85.7% | 0.0% | 66.7% | 0.0% | 0.0% | 94.1% |
| Test (once): Chosen / low | 25 | 1.97 | 59.5% | 13.5% | 28.0% | 0.0% | 2.7% | 79.8% |

Dev: 30 words, 70 inner borders, 100 targets. Test: 30 words, 90 inner borders,
120 targets (one single-target word is included in whole-word/bar measures).
Pixel conversion is 473.6/1920. Median and border percentages use inner borders;
whole-word correctness and exact equality include **all** borders. The first
guess and A are passed through the same box/2-pixel constraints for comparison.
Consequently these are not identical denominators/endpoint semantics to the
earlier task's table. All individual predictions are committed for inspection.

The final method reaches **64.4% within 2px** and **82.5% short-bar containment**
on test, versus A's 58.9% and 77.5%. It fails both requested accuracy targets.
Test whole-word accuracy is 11/30; no word is exactly identical to the approval.
Only 2/90 inner borders are exact (dev 5/70), compared with the first guess's
27/90 (dev 38/70). This makes the anchoring effect visible; it does not establish
that different cuts are acceptable.

Confidence was fixed on dev: `high` requires a same-spelling copy and agreement
with the constrained first guess within 2px on every border. It passed 5/5 dev
and 2/2 test words. **These tiny samples do not establish a reliable 95% success
rate.** `medium` means a copy lacking agreement: 0/1 dev and 2/3 test words passed.
Other proposals are `low`. Treat all three as experimental guesses, never as
owner approvals; the high reliability target remains unproven.

### Worst ten test words

Every word below is low confidence. Errors are desktop pixels, not artwork pixels.

| Page / word | Text | Source | Maximum error px | Errors for every border, RTL (including ends) |
| --- | --- | --- | ---: | --- |
| 580 / `76.29.8` | سَبِيلٗا | joint | 26.39 | 0.00, 13.81, 20.23, 26.39, 0.00 |
| 317 / `20.78.0` | فَأَتۡبَعَهُمۡ | joint | 9.13 | 2.47, 1.97, 1.23, 0.99, 7.40, 9.13, 4.93, 0.00 |
| 436 / `35.14.12` | يَكۡفُرُونَ | joint | 8.63 | 0.74, 8.63, 0.25, 1.73, 1.73, 1.48, 0.00 |
| 348 / `23.97.6` | ٱلشَّيَٰطِينِ | fallback | 5.67 | 0.49, 0.00, 5.67, 5.18, 2.71, 5.43, 1.97, 0.00 |
| 436 / `35.12.21` | فِيهِ | joint | 5.43 | 0.49, 1.23, 5.43, 0.00 |
| 52 / `3.20.10` | أُوتُواْ | joint | 4.69 | 0.49, 1.73, 0.49, 4.69, 0.49 |
| 492 / `43.35.0` | وَزُخۡرُفٗاۚ | fallback | 4.69 | 0.00, 1.97, 1.97, 1.97, 1.97, 4.69 |
| 157 / `7.57.8` | حَتَّىٰٓ | fallback | 4.44 | 0.00, 4.44, 3.45, 3.21 |
| 277 / `16.92.29` | كُنتُمۡ | joint | 4.44 | 1.97, 3.95, 3.45, 4.44, 0.00 |
| 317 / `20.83.4` | يَٰمُوسَىٰ | fallback | 3.95 | 0.49, 3.95, 1.48, 2.47, 1.48, 0.00 |

The largest failures involve `ي | لا`, `ب | ي`, and `س | ب` in `76.29.8`;
then `ع | ه`, `ي | ك`, `ب | ع`, `ل | ش`, and `ط | ي`. Each has only one >5px
test example, so this is a failure inventory, not a stable frequency estimate.
The committed `failingPairs` table has counts and maxima for every observed pair.
Visual inspection of dev/test worst sheets confirms concentrated cuts and
misallocated stretches. Short bars still fall under the wrong target in some
cases; a shorter bar does not solve the underlying mapping.

### Full-Mushaf checks and scope

- 604 page files plus index; 77,433 registered artwork words total.
- 125 existing approved words skipped; 77,308 guesses written.
- Confidence counts: high 3,648; medium 4,023; low 69,637.
- 297,922 guessed targets, including 4,620 silent targets;
  every target ID matches the actual app's rule `qpc-hafs-v1-targets-4.0.0`.
- Zero missing/duplicate guessed words, zero approved/guess overlap, zero wrong
  target IDs, zero wrong cut counts, zero noninteger coordinates, zero guessed
  bounds/order/minimum-width violations. Minimum guessed span: 2 artwork px.
- Independent pixel check: 77,308 guessed outer spans match detected
  owned ink under the documented box constraint; 0 cases
  used box ink because component ownership yielded no ink; 28
  needed inward rounding at fractional body edges.
- 83 approved words have outer endpoints different
  from those detected extents. The existing approved data has
  5 strict-body/minimum-width exceptions, listed
  in `validation-report.json`; it was preserved byte-for-byte.
- 448 synthetic semantic basmala targets have no registered artwork word boxes.
  They are outside the 77,433-word artwork corpus and were not given fabricated
  geometry. Supporting them requires a separate geometry task.
- Per-page words/approved/guessed/high/medium/low counts are in
  `scripts/letter-masks/full-mushaf-report.json` (all 604 pages).

### Reproducibility, review assets, and checks

Run from the repository root:

```sh
python scripts/letter-masks/border_guess_all.py
node --experimental-strip-types scripts/letter-masks/check_border_guesses.mts
python scripts/letter-masks/check_border_guess_ink.py
python scripts/letter-masks/test_border_guess_all.py
```

Packages used: Python 3.14.6, NumPy 2.5.4, Pillow 13.0.0, SciPy 1.18.1;
Node v24.13.1. Full generation: **Complete in 214.97 seconds** Repeat from scratch: **Complete in 215.45 seconds**
Two complete runs produced identical SHA-256 hashes for every generated page,
index, queue, report, sample manifest and PNG (determinism manifest checked).
Combined page/index digest: `3235d4687311649a43274eca73a70980f934ca9f0c35c277785cef48d2c705c8`.

Approval files used: `page1-approvals-2026-11-05.json`, `pages1-2-approvals-2026-11-05.json`, `all-approvals-2026-11-06.json`.
No newer approval snapshot was present. The latest snapshot supplies all 125
approvals; 30 held-out words are excluded from learned templates even in the
production output, leaving 95 training words. Dev uses leave-one-word-out fits.
`sample_compare.py`'s fixed alternating-page split is preserved in the new scorer;
the new scorer adds all required measures without rerunning the old font trials.
`test-evaluation.json` was created once and the scorer refuses to overwrite it.

`scripts/letter-masks/contact/` contains ten PNGs of 20 random registered words
from pages 3–604 (seed 20261106), one sheet of 40 distinct common low-confidence
spellings, dev/test worst sheets, and the selection manifest. Cyan lines show
guesses, cyan bars show the 40% centred span; magenta ticks on failure sheets show
the owner borders. These are inspection aids, not app screenshots.
`review-queue.json` lists all 69,637 low-confidence occurrences, ordered by
descending corpus spelling frequency. The 40-common sheet uses one occurrence
per spelling; no unsupported within-low probability ranking is implied.

Validation passed: four generator regressions (including DTW equivalence and
held-out exclusion); 25 scoped existing tests; full repository suite 496 passed,
one skipped, no failures; corpus and independent ink checks; diff whitespace and
protected-path review. `src/`, Quran/page data, artwork, and approved-border files
are unchanged. There is no visible application change to browser-approve here;
desktop/compact browser acceptance belongs to Claude's subsequent integration.

### Limitations and confidence

All requested data/review artifacts are delivered, but accuracy remains below
target and the high-confidence reliability estimate is far too small to certify.
The geometric conflict between historical approved endpoints and strict body
bounds is recorded rather than silently rewriting evidence. Medium confidence
is especially weakly calibrated. More approved common spellings and new held-out
pages are needed before trusting widespread letter placement.

Confidence: **practicality 92/100** for reproducible offline generation;
**architecture/data safety 97/100** after full-corpus and protected-path checks;
**visual certainty 55/100** for correct letter attribution. Defer production
acceptance of guessed underlines; this branch is a prototype data hand-back.

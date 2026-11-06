# Codex task: letter underlines for the whole Mushaf

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

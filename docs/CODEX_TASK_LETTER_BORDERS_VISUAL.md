# Codex task: letter borders by looking, word by word (visual round)

Status: ready to hand over (6 November 2026).
Base branch: `claude/criterion-bar`. Work on a new branch `codex/letter-borders-visual`.
**Never push to `main`** (a push to main deploys the live app).

Read first:
1. `docs/CODEX_TASK_LETTER_BORDERS_ALL_PAGES.md`: the previous round and its hand-back. This round replaces its method.
2. `docs/CODEX_TASK_LETTER_BORDERS.md`: the rules for borders and everything tried before.

## The goal

Set the letter borders for every word of the Mushaf **the way the owner does: by looking at the word**. Use your own vision on rendered images, learn the owner's style from his approved words, and decide each repeated spelling once.

The owner has approved a large token budget for this. **Accuracy matters more than cost.** Do not fall back to cheap pixel heuristics where looking is possible.

## Why a new round

The previous round (`copy-joint-shape-v1`) failed on the hidden test: 64% of borders within 2 px; the short bar under the right letter 82.5%. The owner checked it by eye and rejected it. Examples:
- **مِن** (p588 `83.25.1`): the meem got 2 px and the noon got everything else.
- **بِهَا** (p141 `6.109.8`), **رَبَّنَا** (p52 `3.16.2`), **بِئۡسَمَا** (p14 `2.93.20`): one letter squeezed or misplaced.

About 6% of its words have a letter narrower than 10 artwork px. Pixel methods cannot see where one joined letter ends in this calligraphy. A careful visual reader can.

## Rules you must not break

All rules of the previous task still apply:
- Do not edit `public/mushaf/`, `src/lib/judgingUnits.ts`, the page data or `public/letter-borders/` (approved only).
- **No change to `src/`.**
- Letter units are the app's own (rule `qpc-hafs-v1-targets-4.0.0`): madd alifs merged into their carrier letter; silent letters are their own letters and need their own borders.
- Borders, per word with N letters:
  - exactly N+1 borders, right to left, strictly decreasing;
  - the outer ends are the word's ink edges;
  - every letter at least 2 artwork px wide.

And for this round:
- **A guess is never an approval.** Write only to `public/letter-borders-guess/` (replace the previous round's files; keep the same format).
- **Do not look at the 30 hidden test approvals while annotating.**
  - These are the "test" half of the 60-word sample (`sample_compare.py ... test`).
  - Annotate those words blind like any other word; score them only at the checkpoint.
  - Pages 1–2 and the "dev" half are yours to learn from.

## Step 1: learn the owner's style, and write it down

1. Render every training approval (95 words) as a large image:
   - the word crop, scaled so the ink is about 400 px tall, on white;
   - each letter's span shaded in alternating light colours;
   - the borders as thin lines;
   - the letter list printed under it, right to left.
2. **Look at them all.** Write `scripts/letter-masks/visual/STYLE_GUIDE.md`: how the owner places a border, in plain rules with an example image for each. At least:
   - stretched joins (kashida): who gets the stretch? (Earlier data says the **left** letter.);
   - letters stacked on top of each other (for example لمح, لج, the start of بسم): where the vertical cut goes when letters overlap;
   - lam-alif and other ligatures;
   - dots, hamza and small letters above or below: they do not move a border;
   - silent letters and merged madd alifs;
   - word-final letters with long tails (ن ى ه ي): how much tail goes to the letter;
   - anything else you notice.
3. Note every rule you are **unsure** of as a question for the owner.

This guide is your reference for every later decision. Keep it short and visual.

## Step 2: group the repeats

Use the app's own word text (`public/mushaf/1405-artwork-5a5f9f3846158475/p{N}.json`, field `text`) to count repeats. **No internet list is needed.** This is the exact text of this Mushaf, so it is more reliable than outside lists, which use other editions. Measured from it:

| | |
| --- | --- |
| Words (letter role) | 77,433 |
| Distinct spellings | 21,116 |
| Spellings used once | 13,959 |
| Top 40 spellings cover | 20% of all words |
| Top 100 | 29% |
| Top 500 | 48% |
| Top 1,000 | 56% |
| Top 2,000 | 64% |
| Top 5,000 | 76% |

**The same spelling is not always drawn the same way.** Line justification stretches some drawings, and joins change. So within each spelling:
1. Cluster the drawings by shape (for example: crop the body, normalise the height, align, image correlation).
2. Keep drawings together only when they really match. One spelling may give several clusters.
3. For each cluster, pick the drawing nearest its centre as the **representative**.

Write `scripts/letter-masks/visual/groups.json`: spelling → clusters → member word ids, with the representative marked.

## Step 3: decide each representative by looking

For each representative, most frequent first:
1. Render the word large, with:
   - a ruler of artwork-px ticks along the bottom (every 5 px, labelled every 20);
   - the letter list right to left with the letter names;
   - the previous round's guess as a faint dashed line (a starting point only, often wrong).
2. Using the style guide, decide the N+1 borders.
3. **Check your own work:** render your borders as shaded letter spans and look again. Fix anything that looks wrong. Up to three passes.
4. Mark your confidence honestly:
   - `high`: clear joins;
   - `medium`: one doubtful border;
   - `low`: stacked or overlapping letters where a vertical cut cannot be clean.
5. Save each decision as you go (see Resuming), with a one-line reason for any border you were unsure about.

## Step 4: carry each decision to its cluster, and check by looking

1. Carry the representative's borders to every member, by aligning the drawings (warp along x).
2. **Check every carried word by looking**, in sheets of 20 to 30 words, each shown with its shaded letter spans.
3. A member that looks wrong is decided on its own, as in step 3.
4. Words of spellings used once go straight through step 3.

## Checkpoints (stop and hand back at each)

**Checkpoint A: pilot (top 100 spellings, 29% of the Mushaf).**
- Report:
  - the score on the 30 hidden test words, using the same measures as the previous round's table;
  - the measures per confidence level;
  - the cost: images viewed, decisions made, rough tokens and time.
- Make `contact/visual-pilot-*.png`: 200 random words from the pilot, seed 20261107, with shaded spans, for the owner to check by eye.
- Add the style-guide questions.
- **Stop here.** The owner checks the sheets and decides whether to continue.

**Checkpoint B:** top 2,000 spellings (64%). Same report.

**Checkpoint C:** everything. Same report, plus the full-Mushaf structure checks of the previous round (`check_border_guesses.mts`, `check_border_guess_ink.py`).

**Targets on the hidden test:**
- borders within 2 px: at least **85%**;
- short bar fully under the right letter: at least **95%**;
- `high` confidence really at least 95% right.

## Resuming

The job will span several sessions. Keep everything resumable:
- `scripts/letter-masks/visual/decisions.jsonl`, one line per decided word: `wid`, `page`, `x` (borders), `confidence`, `source` (`visual` or `visual-copy`), `cluster`, `note`.
- `scripts/letter-masks/visual/progress.json`: which clusters are done, the counts, and the running cost.
- `scripts/letter-masks/visual/build_guess_files.py`: rebuilds `public/letter-borders-guess/p{N}.json` from `decisions.jsonl` at any time.
  - Same format as now.
  - Words not decided yet keep **no** entry (better no underline than a wrong one).
  - `method: "visual-v1"`.
- Commit and push at least at every checkpoint, so nothing is lost.

## Hand back (at each checkpoint)

- Push `codex/letter-borders-visual`. **Not main.**
- Append to this file:
  - the results table and cost;
  - the 10 worst test words, with images;
  - the style-guide questions for the owner.
- Then Claude:
  - switches the app's prototype to the new guesses;
  - shows the owner the sheets and questions.

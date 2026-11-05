# Codex task: better first guesses for letter borders

Status: ready to hand over (5 November 2026). Branch: `claude/judging-final-polish`.
Read `docs/LETTER_LEVEL_HIGHLIGHT_TRIAL_PLAN.md` first.

## Why this task exists

A mistake on the Mushaf page will be shown as the word block plus a 2.25 px bar
under the marked letter. The bar needs each letter's left and right border
inside the printed word. The owner sets these borders by hand in a review
screen. Hand-setting every word of 604 pages is too slow, so the screen should
start from a good first guess that the owner only checks.

Your job: make the first guess good enough that most borders need no change.

## Rules you must not break

- The Quran text, the artwork and the app's letter units are fixed. Do not edit
  `public/`, `src/lib/judgingUnits.ts` or the page data.
- No model decides that a border is correct. Only the owner's approvals and
  random checks do. Your code only proposes.
- Letters sit edge to edge: a word with N letters has N+1 borders, right to
  left, strictly decreasing. No gaps, no overlaps.
- Letter units are the app's own (`judgingTargetsOf`, rule version
  `qpc-hafs-v1-targets-4.0.0`): madd alifs are merged into the letter that
  carries them; never-pronounced letters are their own letters (flagged
  `silent`) and need their own borders.

## Inputs

| File | What it is |
| --- | --- |
| `public/mushaf/1405-artwork-5a5f9f3846158475/p{N}.png`, `p{N}.json` | Page artwork (1920 × 3106) and word boxes |
| `scripts/letter-masks/export_review.py` | Builds per-word crops, ink pieces and a proposed letter map |
| `scripts/letter-masks/dump_units.mts` | Writes the app's letter units per word (`units.json`) |
| `scripts/letter-masks/to_app_units.py` | Re-keys the export to the app's letter units (`review-data-app.json`) |
| `scripts/letter-masks/approved/pages1-2-approvals-2026-11-05.json` | Owner approvals: all 65 words of pages 1-2 (224 inner borders). Use this one. |
| `scripts/letter-masks/approved/page1-approvals-2026-11-05.json` | Older, smaller set (22 words of page 1) |
| `scripts/letter-masks/border_data.py` | Loads words, ink, first guess and approved borders |
| `scripts/letter-masks/border_shape_model.py` | Method tried: learned letter shapes + dynamic programming |
| `scripts/letter-masks/border_font_dtw.py` | Method tried: Hafs font rendering aligned to the artwork by warping |
| `scripts/letter-masks/border_compare.py` | Scores all methods on pages 1-2 (table below) |
| `scripts/letter-masks/sample_compare.py` | Scores methods on the regular-page sample (dev or hidden test half) |
| `scripts/letter-masks/border_shift.py` | Method A: move joined borders right by a share of the word height |
| `scripts/letter-masks/anchor_check.py` | Compares the two halves of the common-words batch (anchoring check) |
| `scripts/letter-masks/border_guess_eval.py` | Older scorer (first guess and width prior only) |

Build the inputs (from `scripts/letter-masks`):

```bash
python3 export_review.py review-data.json 1 2
node --experimental-strip-types dump_units.mts 1 2      # writes units.json
python3 to_app_units.py                                 # writes review-data-app.json
python3 border_compare.py review-data-app.json approved/pages1-2-approvals-2026-11-05.json units.json
```

Python packages: `numpy pillow scipy uharfbuzz freetype-py fonttools brotli`.

## How to score

`border_compare.py` measures only the borders *between* letters (the two
outer ends are already exact), in screen px at desktop page size (473.6 px page
width). Methods that learn are scored on words they did not learn from.

Measured 5 November 2026 on all 65 approved words of pages 1-2 (64 with more
than one letter; 35 on page 2):

| Method | Median px | Borders within 2 px | Borders off by more than 5 px | Words with every border within 2 px |
| --- | --- | --- | --- | --- |
| First guess (today), pages 1-2 | 0.74 | 64% | 18% | 28/64 (44%) |
| First guess, page 2 only | 1.23 | 59% | 14% | 14/35 (40%) |
| Learned shapes, leave one word out, pages 1-2 | 0.99 | 70% | 13% | 34/64 (53%) |
| Learned shapes, learn page 1 -> test page 2 | 1.36 | 63% | 12% | 16/35 (46%) |
| Font + warping (no learning), pages 1-2 | 1.23 | 69% | 13% | 25/64 (39%) |
| Font + warping, page 2 only | 0.99 | 78% | 6% | 14/35 (40%) |

Agreement check: when the first guess and the font method agree within 2 px on
every border, 13 of 14 such words were right (14 of 64 words qualify).

What this says:
- Learning from 65 words helps a little (+4 points of borders on a new page).
  Learning from 7, 14 or 29 words of page 1 gave the same page-2 result, so more
  of the same data is unlikely to help this model much.
- The font method needs no approvals and halves the big errors on page 2, but
  is worse on page 1. Pages 1-2 are the decorated opening pages with larger
  writing, so **none of these numbers is known to hold for pages 3-604**.
- The agreement check is a useful "safe to accept" signal, but covers few words.

Target: **within 2 px for at least 85% of inner borders, and a confidence
signal that picks out words that need no change**, measured on regular pages.

## What we learned

- Outer ends are exact: the word's leftmost and rightmost ink.
- Short words and words split into separate ink pieces are mostly right.
- The big errors are long joined runs: ٱلۡعَٰلَمِينَ, ٱلۡحَمۡدُ, نَعۡبُدُ, ٱلدِّينِ (6–17 px).
- The digital Hafs font does not match the 1405 artwork closely enough to
  place borders (letters are stretched differently).
- 15 words are too few to learn letter widths reliably.

## Regular pages (measured 6 November 2026)

The owner approved a fixed random sample of 60 words from 20 regular pages
(`sample_review.py`, seed 20261105), split by page into 30 "dev" words (for
tuning) and 30 hidden "test" words (`sample_compare.py`).

All 59 multi-letter sample words, methods not tuned on them:

| Method | Median px | Borders within 2 px | Borders off by more than 5 px | Words with every border within 2 px |
| --- | --- | --- | --- | --- |
| First guess (today) | 1.23 | 60% | 14% | 29/59 (49%) |
| Learned shapes (from pages 1-2 + dev) | 1.23 | 64% | 13% | 30/59 (51%) |
| Font + warping (no learning) | 1.60 | 56% | 14% | 17/59 (29%) |

Tuned on dev, scored once on the 30 hidden test words:

| Method | Borders within 2 px | Off by more than 5 px | Words with every border within 2 px |
| --- | --- | --- | --- |
| First guess (today) | 53% | 22% | 12/29 |
| A: joined borders moved right by 0.046 of the word height | 59% | 13% | 10/29 |
| B: learned correction from ink features (gradient boosting) | 57% | 16% | 9/29 |

Findings:
- **Anchoring.** The owner starts from the first guess and leaves borders that
  look fine: 41% of inner borders on the sample were approved exactly as
  guessed. So "distance to the approved border" favours the first guess, and a
  different method can look worse while being just as acceptable. The
  common-words batch tests this: half of its words start from guess A
  (`anchor_check.py` compares the halves).
- **Systematic error.** Big first-guess errors are almost all on joined
  strokes and almost all too far left (95 of 103): on stretched joins
  (kashida) the owner gives the stretch to the letter on the left.
- Method A halves the big errors but does not raise whole-word accuracy.
  None reaches the 85% target.
- **Copying borders between drawings of the same word** (warping one approved
  drawing onto another): 75% within 2 px, 5% big errors, on 42 pairs.
- **A shorter, centred bar** hides small border errors: with the bar at 40% of
  the guessed letter width, 85% of letters on the sample have the bar fully
  under the right letter with no review (75% of words).
- The 40 most common spellings cover 15,116 words (19% of the Quran); 100
  cover 29%, 1,000 cover 56%.

## Test set rules

- Tune only on pages 1-2 and the "dev" half of the sample. Run
  `sample_compare.py ... test` once, at the end, and report it.
- Approvals snapshot: `approved/all-approvals-2026-11-06.json` (125 words:
  pages 1-2 and the 60-word sample).
- Because of anchoring, also report how many words a method gets *exactly*
  equal to the approved borders, and look at failures by eye before trusting a
  px score.

## Ideas worth trying

1. **Shape matching of approved letters.** Cut each approved letter's ink out
   of its word and match it (normalised cross-correlation, small shifts and
   scale) inside new words of the same letter and position (start, middle,
   end, alone). The same calligraphy repeats, so this should beat width
   averages once there are a few hundred approved letters.
2. **Joint detection.** Borders between joined letters usually sit on the
   thin baseline stroke. Use stroke thickness along the baseline, not only
   column ink, and mark tall letters (alif, lam, kaf) as no-cut zones.
3. **Combine** (dynamic programming over border positions): joint score +
   shape match score + learned width as a weak prior.
4. **Font + warping, improved.** Warp on base-letter ink only is in
   `border_font_dtw.py`; try a band limit, per-letter stretch limits, and
   using the font's joint positions as soft targets for a local snap to thin
   strokes.
5. Report which letter pairs fail most, so the owner can review those first.

## Deliverables

- `scripts/letter-masks/border_guess.py` with a function
  `guess(word) -> list[int]` (N+1 cuts, right to left, inside the crop).
- `border_guess_eval.py` extended to score it, and the results table updated
  in this file.
- `export_review.py` (or a small step after it) writing the new guess into
  the review data, so the review screen starts from it.
- No change to the app (`src/`) in this task.

## Hand back

Write the measured table and the worst 10 words (with their errors) at the end
of this file, and push to the branch. The owner then maps page 2 with the new
guesses, and we measure again on page 2 only.

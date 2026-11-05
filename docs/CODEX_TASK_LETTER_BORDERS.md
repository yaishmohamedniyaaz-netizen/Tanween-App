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
| `scripts/letter-masks/border_compare.py` | Scores all methods (table below) |
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

## Before you start: a fair test set

Ask the owner to approve a random sample of words from regular pages (3-604)
in the review screen. Score on that sample, not only on pages 1-2.

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

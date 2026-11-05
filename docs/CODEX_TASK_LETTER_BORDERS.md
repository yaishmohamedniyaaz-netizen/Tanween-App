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
  `qpc-hafs-v1-targets-3.0.0`): madd alifs and never-pronounced letters are
  already merged into the sound that carries them.

## Inputs

| File | What it is |
| --- | --- |
| `public/mushaf/1405-artwork-5a5f9f3846158475/p{N}.png`, `p{N}.json` | Page artwork (1920 × 3106) and word boxes |
| `scripts/letter-masks/export_review.py` | Builds per-word crops, ink pieces and a proposed letter map |
| `scripts/letter-masks/dump_units.mts` | Writes the app's letter units per word (`units.json`) |
| `scripts/letter-masks/to_app_units.py` | Re-keys the export to the app's letter units (`review-data-app.json`) |
| `scripts/letter-masks/approved/page1-approvals-2026-11-05.json` | Owner approvals: 22 words of page 1, 15 with borders (`mode: "edges"`, `cuts`) |
| `scripts/letter-masks/border_guess_eval.py` | Scores a guess against the approvals |

Build the inputs (from `scripts/letter-masks`):

```bash
python3 export_review.py review-data.json 1 2
node --experimental-strip-types dump_units.mts 1 2      # writes units.json
python3 to_app_units.py                                 # writes review-data-app.json
python3 border_guess_eval.py review-data-app.json approved/page1-approvals-2026-11-05.json
```

## How to score

`border_guess_eval.py` measures only the borders *between* letters (the two
outer ends are already exact), in screen px at desktop page size
(473.6 px page width), leave-one-word-out when a method learns from the data.

Current numbers (15 words, 45 inner borders):

| Method | Median | Mean | Within 1 px | Within 2 px |
| --- | --- | --- | --- | --- |
| First guess (thin-joint cuts, today) | 1.48 | 3.92 | 42% | 58% |
| Width prior per letter, dynamic programming | 1.73 | 2.94 | 40% | 53% |
| Hybrid (first guess + widths + thin joints) | 1.23–2.22 | 3.85–4.04 | 33–42% | 49–58% |
| KFGQPC Hafs font letter positions, scaled | 4.19 | 5.55 | 13% | 22% |

Target: **within 2 px for at least 85% of inner borders**, measured on words the
method did not learn from. Report the table above with your method added.

## What we learned

- Outer ends are exact: the word's leftmost and rightmost ink.
- Short words and words split into separate ink pieces are mostly right.
- The big errors are long joined runs: ٱلۡعَٰلَمِينَ, ٱلۡحَمۡدُ, نَعۡبُدُ, ٱلدِّينِ (6–17 px).
- The digital Hafs font does not match the 1405 artwork closely enough to
  place borders (letters are stretched differently).
- 15 words are too few to learn letter widths reliably.

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
4. Report which letter pairs fail most, so the owner can review those first.

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

# All-page unapproved border data

This is a research data delivery. It does not activate letter bars in the app,
change scoring, or change approved data. `public/letter-borders-guess` must stay
separate from `public/letter-borders`. Claude owns subsequent app integration.

## Rebuild

Requires Node 24+ (TypeScript stripping), Python 3.14, NumPy 2.5.4, Pillow 13.0.0,
and SciPy 1.18.1. No network, fonts, model download, or app dependencies are needed
once these packages and the repository artwork are present.

From the repository root (substitute your Python executable):

```powershell
python -m pip install numpy==2.5.4 pillow==13.0.0 scipy==1.18.1
python scripts/letter-masks/border_guess_all.py
node --experimental-strip-types scripts/letter-masks/check_border_guesses.mts
python scripts/letter-masks/check_border_guess_ink.py
python scripts/letter-masks/test_border_guess_all.py
```

The generator's one command rebuilds all 604 page files, index, review queue,
per-page count report, ten 20-word random PNG sheets, and the 40-spelling common
word sheet. Intermediate units go into ignored `tmp/letter-borders`. It does not
read an old output or use a cached proposal. All ordering, selection, projection,
and tie-breaking are deterministic; the contact sample seed is 20261106. The
running time is printed separately rather than embedded in reproducible outputs.

## Chosen method

`copy-joint-shape-v1` evaluated local shape/joint DP, but ships copy + Method A:

1. Export **current app targets** using `dump_units.mts`, including silent targets
   and merged madd alifs. No Arabic text or unit rules are duplicated or changed.
2. Reuse existing connected-component ownership and first-guess cuts, mapped to
   those targets. Avoid PNG encoding/decoding in the full-corpus loop.
3. Match exact spelling **and** target joining forms against training approvals.
   Align base-ink profiles by dynamic time warping and copy the best source's
   approved cuts. The DTW recurrence is vectorised, with a reference regression.
4. Otherwise use Method A's 0.046-height rightward shift on joined boundaries.
   Failed component/cut matching is explicitly labelled `source: fallback`.
5. Constrain cuts to integer, decreasing, at least 2-pixel spans, preserving the
   detected outer ends inside the immutable body box. Do not silently drop words.

The retained shape candidate matches approved letters in the same joining form
using normalised correlation, a vertical shift, horizontally resampled segments,
a weak width prior, and thin-stroke/tall-stroke costs in a bounded DP. It did not
improve dev over copy + shift and therefore is not run for the full corpus.

## Split and confidence

The original 20 regular sample pages determine the fixed alternating page split.
All 30 test words are excluded from learned templates **even in production**.
Dev predictions use leave-one-word-out training on pages 1–2 and the other dev
words. Test predictions use all 95 training words and are frozen before test
cuts are extracted. New approval files are merged chronologically, but cannot
move the original split. The hand-back lists the actual files used.

`--dev` reproduces candidate comparisons. `--calibrate` reproduces the final dev
report. `--test` is a once-only final evaluation and refuses to overwrite its
existing report. Do not delete that guard/report to tune against test results.
The shipped report is the record of the single test run.

- **high**: an approved-spelling copy agrees with every constrained first-guess
  border within 2 desktop pixels. This achieved 5/5 whole words on dev. That is
  an observed 100%, **not** a statistically established 95% reliability claim.
- **medium**: a spelling copy without that agreement. Only one dev word qualified;
  it failed the whole-word 2-pixel criterion. This tier has insufficient calibration.
- **low**: joint/fallback output. These words form the review queue.

These labels remain proposals. Never use `high` as a synonym for owner-approved.
The test report gives observed reliability, including any failure of the 95% goal.

## Bounds and scoring

The task's assertion that approved outer ends are already exact is not uniformly
true relative to its stricter word-box/ink rule. Older approvals often end at
base-letter ink, excluding overhanging marks; some also exceed the body box.
Guesses use owned ink at threshold 128 inside the body, with the original 8-pixel
vertical crop margin. Fractional body edges require inward integer rounding.
When the ownership pass assigns no piece, use visible ink inside that box and
report the fallback count. This makes outer ends reproducible under the existing
segmentation rule; it is not an assertion that segmentation is human-verified.

The ink validator reports differences without changing approvals. Whole-word
accuracy and exact equality include outer ends; border median/2px/5px figures
use inner borders. This is stricter than the older scorer's whole-word measure,
which also ignored outer ends. The first-guess and Method A comparisons undergo
the same final constraints as the chosen method for a fair delivery comparison.
Desktop conversion is exactly 473.6 / 1920. The 40%-width centred bar is accepted
only when both ends fit the owner's corresponding full letter span; no extra
tolerance is used. Exact-border and exact-word rates expose anchoring.

The 77,433 registered artwork words define coverage. There are also 448 synthetic
printed-basmala targets in semantic page data without registered artwork word
boxes. They cannot receive mapped borders without new geometry, which this task
forbids; they are counted separately, never assigned fabricated boxes.

The review queue lists every low-confidence occurrence, most-common spelling
first. The extra sheet chooses one representative of each of the first 40
distinct spellings so review effort is not spent on duplicate instances. All
low words share the same calibrated tier; no uncalibrated probability ranking
within that tier is implied. The random sheet draws uniformly from registered
words on pages 3–604; any already-approved sampled word is explicitly labelled.

## Validation artifacts

- `dev-comparison.json`, `dev-details.json`: explored candidates and dev evidence.
- `dev-evaluation.json`, `test-evaluation.json`: final metrics, confidence groups,
  predictions, worst ten words, failing pairs, and input fingerprints.
- `full-mushaf-report.json`: every page's counts, source counts, reproducible hash.
- `validation-report.json`: independent app-unit, coverage, bound, width checks.
- `ink-validation-report.json`: independent extraction of every guessed outer end.
- `contact/manifest.json`: exact sample and common-word sheet membership.

This data-only task changes no application UI. Contact sheets are review
artifacts, not desktop/mobile acceptance of a future underline integration.

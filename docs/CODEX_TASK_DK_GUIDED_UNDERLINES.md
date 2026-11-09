# Codex task: underlines on the print, guided by DigitalKhatt (all pages)

Status: ready to hand over (9 November 2026).
Base branch: `claude/criterion-bar`. Work on a new branch **`codex/dk-guided-underlines`**.
**Never push to `main`** (a push to main deploys the live app). Push your branch at every checkpoint.

> Replaces the older underline tasks (`CODEX_TASK_LETTER_*`). Do not delete their files.
> The DigitalKhatt page-drawing task (`CODEX_TASK_DIGITALKHATT_LETTER_COLOUR.md`) is done by Claude; do not redo it.

---

## 1. Goal in one paragraph

The app shows the scanned 1405 print. When a judge marks a letter, the app draws a
short coloured **bar under that letter**. To place the bar it needs, for every word,
the left and right edge of every letter on the print. Claude's pilot gets these
edges by using the DigitalKhatt drawing of the same word as a guide: on 48 random
words, **47 had every letter body right (98%)**. Your job: run that method on
**all 77,433 words**, add automatic self-checks, check a sample by eye, and write the
files the app reads. **Spend tokens only on checking, never on per-word reasoning
that a script can do.**

## 2. Read first (short)

1. `scripts/letter-masks/dk_guided/PILOT.md` — the method and the pilot result.
2. `scripts/letter-masks/dk_guided/dkguide.py` — the code you start from.
   - `label_print(page, wid)` → for one word: `tids` (letter units in reading order)
     and `labels` (an image: for each print ink pixel, which letter it belongs to;
     0 = none). `box` = where that image sits on the page (artwork px).
   - `bars(result)` → per letter `(x0, x1)` inside the word image.
3. `scripts/letter-masks/dk_guided/pilot-sheets/` — what good results look like.

## 3. Rules you must not break

- Do not change `src/`, `public/mushaf/` (artwork and page data), `public/pages/`,
  `public/mushaf-dk/`, `public/letter-borders/` (owner-approved), or `src/lib/judgingUnits.ts`.
- Letter units (tids) are the app's own (rule `qpc-hafs-v1-targets-4.0.0`).
  `dkguide.py` already uses them; never invent or rename a tid.
- **A missing bar is better than a wrong bar.** Any word you are not sure of gets
  `status: "review"`, and the app will not draw bars for it.
- Every step runs again with one command and gives the same result (fixed seeds, sorted order).
- Never push to `main`.

## 4. Setup (once)

```sh
git checkout -b codex/dk-guided-underlines origin/claude/criterion-bar
pip install numpy scipy scikit-image pillow cairosvg
cd scripts/letter-masks/dk_guided
python3 sheet.py "$(python3 -c 'import json;print(json.dumps(json.load(open("rand48.json"))[:8]))')" /tmp/check.png 2
```
Open `/tmp/check.png`. It must look like `pilot-sheets/r0.jpg`. If not, stop and report.

## 5. Step A: run every word (computer only, no tokens)

Write `scripts/letter-masks/dk_guided/run_all.py`:

1. For every page 1–604, for every word in `public/mushaf/1405-artwork-5a5f9f3846158475/p{N}.json`
   with `role == "letter"`: call `label_print(page, wid)`.
2. Convert the word's bars to **page** artwork px: `x0 + box[0]`, `x1 + box[0]`.
3. Run the self-checks (section 6). Set `status` to `"ok"` or `"review"` and list the failed checks.
4. Write one file per page (format in section 7). Write it only when the whole page is done
   (write to a temp file, then rename), so a stop never leaves half a page.
5. **Resumable:** skip pages whose output file already exists, unless `--force`.
6. Use all CPU cores (`multiprocessing`, one page per task). The pilot took about
   0.35 s per word, so expect a few hours in total.
7. If one word raises an error, record it as `status: "review"` with `checks: ["error: ..."]`
   and continue. Never stop the whole run for one word.

Also save the **colour data** (who owns each ink pixel). It costs nothing extra now,
and lets the app colour letters later without running everything again. See section 7.

## 6. Self-checks (computer only)

A word is `"ok"` only if **all** of these pass. Record the names of the failed ones.

| Name | Check | Why |
| --- | --- | --- |
| `empty-letter` | Every tid has at least 12 ink pixels in its letter body (not counting marks). | A letter with no ink means the alignment failed. |
| `narrow-bar` | Every bar is at least 3 px wide. | Too thin to be a real letter. |
| `order` | Letter centres (x) go right to left in reading order, the same as the DigitalKhatt letters. A letter may overlap the next one (stacked letters), but its centre may not jump past it. | A swap means two letters were exchanged. |
| `size` | For each letter, print ink area ÷ DK ink area (after alignment scale) is between 0.35 and 2.8. | One letter swallowing another. |
| `fit` | The alignment score (`result['fit']`) is at most the 90th percentile of all words (compute it once over the full run, save it in the index, then apply). | Poor alignment. |
| `coverage` | At least 97% of the word's ink pixels belong to some letter or are marks. | Ink left over. |

Tune thresholds **only** on the 9 hard words (`pilot` list in `PILOT.md`) and pages 1–2,
never on the random check sample. Write the final numbers in your report.

## 7. Output files

### Underlines: `public/letter-bars-dk/p{N}.json`

```json
{
  "page": 3,
  "ruleVersion": "qpc-hafs-v1-targets-4.0.0",
  "method": "dk-guided-v1",
  "words": {
    "2.6.1": {
      "tids": ["2.6.1@r0", "2.6.1@r1", "2.6.1@r4", "2.6.1@r6", "2.6.1@r7"],
      "bars": [[1690, 1707], [1650, 1688], [1600, 1648], [1565, 1610], [1449, 1563]],
      "status": "ok"
    },
    "2.6.2": { "tids": ["..."], "bars": [["..."]], "status": "review", "checks": ["order"] }
  }
}
```

- `bars[i]` is `[left, right]` in page artwork px for `tids[i]` (left < right). Bars may overlap.
- Plus `public/letter-bars-dk/index.json`: `{ "ruleVersion", "method", "pages": [1..604], "counts": {ok, review}, "thresholds": {...} }`.

### Colour data (saved for later): `public/letter-ink-dk/p{N}.json`

Per word, per tid, the letter's ink as **run-length rows** in page artwork px:
`{ "2.6.1": { "2.6.1@r0": [[y, x0, x1], ...], ... } }` (one entry per horizontal run).
Measure the size. If the gzip size is above 250 KB for a page, store a lower-detail
version (merge runs closer than 2 px) and note it. Include `status` per word, copied
from the underline file.

## 8. Step B: check by eye (this is where tokens go)

Make check sheets with a new script `check_sheet.py`:
- **24 words per sheet** (4 columns × 6 rows), each word drawn from the **print**
  in black, about 3× size.
- Under each word, its bars **at one height** (the same y for all bars), each in its own colour.
- Lightly tint each letter body in the same colour as its bar (30% opacity), so you can see which bar belongs to which letter.
- Caption: page, wid, the word text.

For each word decide **one** of:
- `ok` — every bar is under its own letter's body. Dots and harakat do not matter.
  Overlapping bars under stacked letters are fine.
- `wrong` — at least one bar is under the wrong letter, or clearly too long or short
  (covers more than a third of a neighbouring letter).
- `unsure` — you cannot tell.

Write one line per word to `scripts/letter-masks/dk_guided/review/decisions.jsonl`:
`{"wid": "...", "page": 3, "verdict": "ok", "note": ""}`.

**Keep token use low:** one look per sheet, short verdicts, no long reasoning per
word. Only write a note for `wrong` or `unsure`.

## 9. Checkpoints (stop and hand back at each)

### Checkpoint 1 (do this first, then stop)

1. Step A on **all 604 pages** (computer only).
2. Check **300 random words** with `"status": "ok"`, seed **20261110**: these measure accuracy.
3. Check **all `"review"` words of pages 1–50** to learn why words fail.
4. Report (append to this file):
   - share of words `ok` / `review`, and how many failed each check;
   - accuracy on the 300 random `ok` words: `ok` / `wrong` / `unsure`;
   - the 10 most common failure patterns, each with an example sheet;
   - **real token use** for the checking, per 100 words checked;
   - the measured sizes of both output folders.
5. Push the branch. **Stop.**

**Target:** at least **97%** of the random `ok` words fully right. If it is lower, do
not continue: report and propose rule changes.

### Checkpoint 2 (only after the owner says go)

Fix the main failure patterns in code, rerun the affected pages, check the remaining
`review` words page by page, and turn a word to `ok` only when it passes on a sheet.
Report the same numbers.

## 10. Weekly limit: stopping safely

- Before each batch of sheets, estimate its tokens from your measured rate.
- If you are close to your limit, finish the current page, write all files, update
  `scripts/letter-masks/dk_guided/review/progress.json` (pages done, words checked,
  tokens used), commit, push, and stop.
- Next session: read `progress.json` and continue where you stopped. Never redo
  finished pages.

## 11. Hand back

- Push `codex/dk-guided-underlines`. **Not main.** Say the commit id.
- Append the report to this file.
- Claude then wires `public/letter-bars-dk/` into the app (status `ok` only), shows the
  owner, and later can switch on letter colouring from `public/letter-ink-dk/`.

## Execution log — 9 November 2026 (Checkpoint 1 in progress)

Created `codex/dk-guided-underlines` from `claude/criterion-bar` at
`a957b63061d935166ee5eb061cdb8639c8e31bd0`. The required eight-word setup sheet was
actually opened alongside `pilot-sheets/r0.jpg`; letter-body assignments and bars
visually match. Preserved the generated image, observer/hash audit and installed
package versions in `scripts/letter-masks/dk_guided/setup-evidence/`.

Implemented the atomic, resumable page runner, body-only area diagnostics,
page-coordinate bars, colour run-length exports, conservative pending status,
full-run percentile finalization, saved-output check sheets, and exact app-target
validation. The original labeling algorithm is unchanged; `dkguide.py` additionally
returns its body/mark classification and alignment scale for self-checks.

Eight batch regression tests pass. Pages 1–2 contain 65 artwork letter words;
all 65 emitted target lists match the current app dumper. Thresholds remain the
specified values (12 body pixels, 3px minimum bar, size ratio 0.35–2.8, 97% coverage,
90th fit percentile); no tuning on random words has occurred. The full 604-page
run is underway, using five workers on the available CPUs (four-CPU quota).

`review/progress.json` records completed pages. To resume generation:

```sh
.venv-letter-borders-visual/bin/python scripts/letter-masks/dk_guided/run_all.py --workers 5
```

After generation, run `run_all.py --finalize`, `validate_batch.py`, then
`check_sheet.py` with the same interpreter. `continue_checkpoint1.py` monitors
completed pages and performs these three preparation steps automatically; it
**does not perform visual review or write verdicts**. Do not launch a second
monitor or overwrite an existing sample/sheet manifest. Actual image review must
follow before any accuracy claim or Checkpoint 1 completion report.

Exact token telemetry is unavailable in this execution interface. `tokensUsed`
is recorded as null; no estimate will be presented as real measured token usage.
The requested measured per-100-word token rate is therefore unavailable, not zero.

Current confidence: practicality 85/100 (runner tested, full run pending), data
safety 95/100 (isolated outputs; protected source assets untouched), visual
certainty 78/100 for reproducing the pilot only. Full-run accuracy is unmeasured.
**Checkpoint 1 is not yet complete.** No Checkpoint 2 work or deployment authorized.

### Owner corrections and calibration — 9 November 2026

The owner's later instruction supersedes colour export and the earlier restriction
on calibration to pages 1–2: stop exporting `public/letter-ink-dk/`, remove it from
this branch, and inspect 24 random exclusive failures of each requested check
before drawing the 300-word sample. Colour labels are rebuilt only when rendering
selected review words. Existing colour exports were moved out of the checkout
and the tracked copies removed; the generator no longer creates colour files.
Compact alignment/check metrics remain available for check-only reruns.

[Calibration evidence](../scripts/letter-masks/dk_guided/calibration/) contains
three frozen 24-word samples, three sheets actually opened, their hashes,
per-word verdicts, saved prediction snapshots, and policy decisions. Seeds are
`20261111-size`, `20261111-order`, and `20261111-empty-letter`. The global fit
cutoff is not yet available, so "exclusive" means exclusive among non-fit checks.

| Check | Right | Wrong | Unsure | Decision |
|---|---:|---:|---:|---|
| size | 15 | 4 | 5 | Disable as acceptance gate; keep ratios diagnostically. |
| order | 0 | 11 | 13 | Retain actual inversions among defined centres. |
| empty-letter | 22 | 1 | 1 | Disable body-mask gate; missing/sub-3px bars remain rejected. |

The original completed-page pool had seven order-only failures and zero
empty-letter-only failures: undefined centres were also called order failures,
and missing body areas also failed size. After the size calibration, size was
disabled and the undefined-centre order dependency corrected. The order and empty
samples were then drawn from exclusive failures under that intermediate policy;
they are **not claimed to be exclusive under the original buggy combination**.
Each frozen sample records its exact eligible pool and completed pages.

A check-only rerun over the same **98 pages / 12,412 words** changed the preliminary
non-fit acceptance count from **8,061 (64.95%)** to **12,037 (96.98%)**. These are
acceptance rates, not accuracy, and exclude the pending global fit cutoff. All
exported words stay `review` with `fit-pending` until full-run finalization. Final
old/new rates will be reported over the complete corpus after the fit threshold.
Calibration and previously reviewed words are excluded from the later seeded
300-word accuracy sample. The four owner-reported examples are also excluded.

Twelve regression tests pass, including defined-centre ordering, retention of
missing-bar/coverage/error guards, and the existing atomic export checks. All
77,433 artwork word target lists match the current app target inventory. Full
batch generation resumed without colour output, skipping completed pages. There
is one batch runner and one continuation monitor. Checkpoint 1 remains in progress.

The revised-check diagnostic review is complete for 198 additional words on
pages 1–50, alongside 96 earlier diagnostic words and 72 calibration words:
**366 unique canonical verdicts**, each linked to an actually inspected image
and the saved prediction. These counts do not include the future 300-word sample
or the remaining fit-only failures. Historical colour-based audit digests remain
verifiable from commit `d240628` without restoring colour exports to the tree.

The future accuracy population excludes pages 1–2, recorded calibration/review
cases, the four owner-reported examples, `rand48.json`, and the six hard-case IDs
visible on `s1g.jpg`. The task describes nine hard cases, but only six are shown
on that saved sheet; no extra IDs were invented. The eligible list, pre-review
index and 300 predictions will be frozen with the single seed-20261110 draw.
Existing word evidence is reused only when prediction identity matches; reviewed
words will not be needlessly rendered again for the flagged-word group. All
required words remain in its completeness inventory.

## Checkpoint 1 final report — 9 November 2026

**Checkpoint 1 is complete; the quality target failed. Stop here for owner review.**

All **604 pages / 77,433 words** finished. The single runner and continuation monitor exited successfully; no worker or monitor remains active. The saved final page was p604. The labeling and bar algorithm was not tuned on the accuracy sample. No Checkpoint 2 work, app wiring, main push, merge, deployment, or live prototype change was performed.

### Owner corrections and acceptance rates

`public/letter-ink-dk/` is absent from the branch tip, exports are disabled and the path is ignored. Colour labels are rebuilt deterministically only for selected review images. The original first-34-page commit remains in history so old image evidence stays verifiable; history was not rewritten. Only `public/letter-bars-dk/` is retained as the new public output.

The three 24-word calibration sheets and their counts are recorded above. Size and empty-letter body-area checks were disabled as acceptance gates because most rejected words were visually right. Their original metrics remain saved. Actual centre inversions, missing/sub-3px bars, coverage, fit and errors remain guards. Saved metrics allowed check-only re-evaluation without realignment.

| Same full corpus and fit threshold | ok | review | ok rate |
|---|---:|---:|---:|
| Original automatic checks | 46,646 | 30,787 | 60.24% |
| Calibrated automatic checks | 68,197 | 9,236 | 88.07% |
| Final, after withholding observed wrong/unsure cases | 68,079 | 9,354 | 87.92% |

These are **acceptance rates, not accuracy**. The earlier 98-page 64.95% → 96.98% comparison excluded the still-pending fit gate and must not be compared directly with this final full-corpus table. Final thresholds: fit ≤ **4.988753931003663** (full-run 90th percentile), coverage ≥97%, bar width ≥3px, right-to-left order among defined adjacent centres. Size 0.35–2.8 and body-area 12px are preserved diagnostic values, disabled as gates.

| Final failed check | Words |
|---|---:|
| coverage | 1,064 |
| fit | 7,744 |
| narrow-bar | 79 |
| order | 645 |
| visual-unsure | 260 |
| visual-wrong | 268 |

Checks overlap, so their counts do not sum to the review count. Known visual failures and uncertainty were only withheld; no reviewed failure was promoted and no bar/tid array was edited.

### Actual visual review and accuracy

The **single frozen 300-word status-ok sample**, seed **20261110**, has **211 ok / 53 wrong / 36 unsure**: **70.33% fully right**, below the **97%** requirement. Uncertainty is included in the denominator. These are the predictions at sampling; the 89 wrong/unsure sample cases were subsequently withheld without changing their geometry. The original frozen index, eligible population, sample and prediction snapshots remain intact. No resampling or threshold tuning followed these results.

The accuracy population excludes pages 1–2, earlier reviews/calibration, the four owner examples, the original 48-word pilot, six visible hard-case IDs, and all 125 previously exposed approved word IDs. Those 125 approvals are not a fresh holdout. The result estimates this eligible status-ok population only. No new claim of generalization is made from old approval answers.

All **926 status-review words on pages 1–50** in the frozen inventory were actually checked: **505 ok / 206 wrong / 215 unsure**. Of these, 255 had matching earlier review evidence and 671 were reviewed on 28 new sheets. This diagnostic group is not an accuracy sample.

Canonical evidence totals **1,337 unique reviewed words**, **57 actual-view image/audit events** (4 early, 9 diagnostic, 3 calibration, 13 random, 28 flagged). [Decisions](../scripts/letter-masks/dk_guided/review/decisions.jsonl), [audits](../scripts/letter-masks/dk_guided/review/audit.jsonl), and [sheet manifest](../scripts/letter-masks/dk_guided/review/manifest.json) preserve observer, image path/SHA256, word IDs, review time and exact prediction digests. Setup-image viewing has its separate evidence. Generated but unseen early images are not claimed as reviewed.

### Ten most frequently tagged exception patterns

The following ranks count matching **manual exception-note tags**, not an exhaustive independent anatomical classification. Categories overlap; generic notes and uncertainty limit ranking precision. Counts combine diagnostics, calibration and the random sample and must not be interpreted as population frequencies. `report_patterns.py` reproduces the tags from existing verdicts without making new visual judgments.

| Pattern | Tagged words | Example word / actually reviewed sheet |
|---|---:|---|

| Overlapping or stacked extents cannot be resolved | 258 | [1.1.2](../scripts/letter-masks/dk_guided/review/early/sheet-001.png) |

| Alif stem merged, displaced or without a separate bar | 68 | [2.2.1](../scripts/letter-masks/dk_guided/review/early/sheet-001.png) |

| Lam stem or body absorbed; underline becomes an endpoint | 64 | [1.6.1](../scripts/letter-masks/dk_guided/review/early/sheet-001.png) |

| Initial connected tooth reduced to an endpoint | 63 | [2.167.20](../scripts/letter-masks/dk_guided/review/definite-after-calibration/sheet-003.png) |

| Wrong body receives a displaced span | 50 | [2.148.3](../scripts/letter-masks/dk_guided/review/definite-after-calibration/sheet-003.png) |

| A curve is truncated or absorbed into another target | 30 | [2.5.7](../scripts/letter-masks/dk_guided/review/early/sheet-002.png) |

| Mim loses its separate body span | 28 | [24.31.52](../scripts/letter-masks/dk_guided/review/random-ok-001.png) |

| Waw ownership or bar fails | 26 | [2.5.7](../scripts/letter-masks/dk_guided/review/early/sheet-002.png) |

| Ra ownership or bar fails | 25 | [1.6.1](../scripts/letter-masks/dk_guided/review/early/sheet-001.png) |

| Unspecified initial target missing or displaced | 22 | [2.257.4](../scripts/letter-masks/dk_guided/review/definite-after-calibration/sheet-007.png) |


Detached-ink-only targets and disconnected-gap bridges also occur (20 and 4 note tags respectively). Cropped or neighbour ink and ambiguous stacked lower strokes are retained as uncertainty where a clear per-letter extent cannot be established; no missing body was invented and no artwork was changed.

### Output sizes, time and token accounting

Underlines: **14,761,981 bytes** (14.76 MB decimal), **2,898,128 bytes** summed deterministic gzip size of all 605 JSON files including the index. Colour folder: **0 bytes / absent**. Review PNGs and compact alignment metrics are evidence/development assets, not public colour exports.

The recorded review-event window is **13:39:48–16:04:30 UTC on 9 November 2026**. This includes generation/waiting and is **not measured active review time**. Exact token telemetry and a measured per-100-word checking rate are unavailable; both remain `null`, not zero or an invented estimate.

### Validation and next decision

All **15 scoped regression tests pass**. Full saved-output validation passes for every page and all 77,433 exact app target lists, integer page coordinates, saved print-crop bounds, minimum widths on accepted words, finalized fit and index totals. Complete review validation passes for all required IDs, SHA256 image evidence, current prediction identity, calibration snapshots and seed reproduction. Protected product/artwork/page/approved-border paths are unchanged from the task base. Older task documents present on this base are unchanged, and the separate visual-border branch was not modified. Its frozen blind prediction file is absent from this task base, so that separate-branch checksum was not reverified here. No old answers or evaluator were used. `git diff --check` passes.

Useful commands (same virtualenv): `python -m unittest discover -s scripts/letter-masks/dk_guided -p "test_*.py" -q`; `python scripts/letter-masks/dk_guided/validate_review.py --complete`; `python scripts/letter-masks/dk_guided/validate_batch.py`; `python scripts/letter-masks/dk_guided/report_patterns.py`. `finalize_review.py` applies only reviewed withholding and regenerates the result/progress summaries.

**Proposed future work, not implemented:** use a body-only lower contour when deriving bars so detached ink cannot drive a span; explicitly anchor vertical stems and connected joins before allocating overlapping bodies; show overlapping bar outlines in review sheets; calibrate confidence on a separately declared development set and establish a genuinely untouched holdout before claiming new accuracy. Retain the current 300 results as a failed baseline. These need owner approval as Checkpoint 2 work; do not wire this candidate into the live app based on automatic acceptance alone.

Confidence: **practicality 95/100** for the resumable pipeline and evidence packet; **architecture/data safety 99/100** for isolated outputs and verified protected paths; **visual certainty 60/100** for treating the remaining automatically accepted corpus as correct. The unresolved risk is systematic stem/join ownership and hidden overlapping extents. This candidate is not production-ready.

[Machine-readable results](../scripts/letter-masks/dk_guided/checkpoint1-results.json) · [full-run acceptance comparison](../scripts/letter-masks/dk_guided/calibration/acceptance-full-fit.json) · [failure-pattern tags](../scripts/letter-masks/dk_guided/failure-patterns.json).
---

## Checkpoint 1b (added by Claude, 9 November 2026): new bar rule, then a fresh measure

**Why Checkpoint 1 scored 70%.** The letter labels were mostly right; the step that turns
labels into bars was wrong. `dkguide.bars()` used only each letter's lowest ink, so
upright letters (ا ل) and letters above a join (م in مِن) got end-point bars, and stacked
letters got overlapping bars that cannot be read at one height.

**The fix is in `scripts/letter-masks/dk_guided/bars_v2.py`** (`bars_v2(result)`):
whole letter body (marks ignored; a letter written on its own is a body, not a mark),
only columns with real ink, and **bars never overlap**. Claude's check on your frozen 300
(`review-v2/`): 20 of 24 earlier wrong/unsure words now right; 12 of 12 earlier right
words still right. Claude graded its own fix, so this needs your independent check.

### Do
1. **Keep the labels, replace the bars.** Rerun all 604 pages with `bars_v2` instead of
   `bars` (computer only). Keep every self-check except: drop `order` (v2 bars are
   ordered by construction) and keep `narrow-bar`, `coverage`, `fit`, `error`.
   Write `public/letter-bars-dk/` again, `"method": "dk-guided-v2"`.
2. **Re-check your 89 wrong/unsure words** from the frozen 300 with v2 bars (4 sheets).
3. **Fresh accuracy:** a new random 300 of `ok` words, seed **20261112**, excluding every
   word reviewed before. Same verdict rules as section 8, with one change: since bars no
   longer overlap, "overlapping extents" is no longer a reason for `unsure`.
4. Report: old vs new ok-rate, the 89 re-check, the fresh 300 (`ok` / `wrong` / `unsure`),
   the top failure patterns. Push `codex/dk-guided-underlines`. **Stop.**

Budget: about 16 sheets of 24 words in total. If the fresh 300 is below 90%, stop after
the first 100 words and report, to save tokens.

**Do not** fix label errors (wrong colours) in this round; just tag them `label-wrong`
in the note, so we know how many remain.


### Checkpoint 1b execution — in progress

Merged `claude/criterion-bar` at `b5fd836cfd0245702337f3c20d37a195330c1aee` into the task branch. Both the complete Checkpoint 1 report and the new Checkpoint 1b instructions are preserved. The v1 baseline remains commit `7f676c36261d5e826bcc128394d7bbe2b64649ce`; 85 historical evidence files have a saved SHA256 manifest in `checkpoint1b/v1-evidence-sha256.json`.

`run_v2.py` reruns all pages with the supplied, unmodified `bars_v2.py`. The original labels were not persisted, so deterministic alignment is recomputed and its fit, coverage, body areas, ratios, centres and crop are checked against the saved v1 metrics. No label rule is changed. Public colour exports stay disabled. Size, empty-letter and order gates are disabled; narrow-bar, coverage, fit and errors remain. The full-run fit percentile is finalized only after all pages exist. Additional geometry validation withholds source-v2 outputs that still overlap after minimum-width expansion or leave the saved crop; it does not repair their bars.

There is one v2 runner and one lock-protected continuation monitor. They atomically save/resume completed pages. The monitor can finalize, validate and prepare sheets; it cannot invent visual verdicts. `review_v2_checkpoint.py` freezes the 89 diagnostic cases and the fresh seed-20261112 draw after full generation. It renders only the first 100 fresh cases initially; the remaining 200 are guarded by the explicit ≥90-right-of-100 gate. Every earlier recorded review, pilot/owner/approved exclusion and Claude review-v2 example is excluded. No sample is yet scored. Twenty scoped tests pass, including evidence reuse, missing-bar/geometry rejection and the early-stop gate.

Checkpoint 1b is not yet complete. Exact token telemetry remains unavailable. No Checkpoint 2, main push, app wiring or deployment is performed.

Review-contract clarification found during 1b preparation: `mergeMaddAlifs` in the unchanged app target rules merges a bare madd-support alif into its preceding target. Two older **diagnostic** notes (`2.249.29`, `2.250.0`) incorrectly expected a separate final alif. Their verdicts and image evidence are preserved, and this limitation is documented in `checkpoint1b/target-contract-caveat.json`; no historical accuracy score is silently revised. V2 sheets include colour-keyed full target glyph groups from the app dumper so the independent review follows actual tids, not a count of written characters. Bar placement is judged separately from body-colour errors; remaining body-label errors are tagged `label-wrong`, including when the bar itself is right. Three renderer preflights were actually opened, with separate hash/provenance audits; they are not accuracy verdicts.

Before any 1b accuracy draw, prior review IDs were also collected read-only from `codex/letter-borders-visual` at `8d58d3ec37a89012ed641687b0ac34a4e84ffc19`: **22,673** valid artwork word IDs conservatively mentioned by 210 canonical annotation/audit files. `checkpoint1b/prior-visual-reviewed-ids.json` records source blob hashes and IDs only; no border answers are imported and that branch is not modified or merged. Its frozen prediction checksum remains `766e716327f6ee1b0e2823ad8786b5b2181954b27c3939aa5aaa0954b969e046`. These IDs are excluded along with the DK/pilot/owner/approved/Claude examples before seed 20261112 is drawn. The fresh population therefore differs materially from the historical 300; do not present their accuracy difference as a paired or same-population estimate. The 89 recheck remains diagnostic reuse.

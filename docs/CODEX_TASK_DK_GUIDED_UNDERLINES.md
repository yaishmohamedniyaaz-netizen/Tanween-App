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

# Fable handoff: DigitalKhatt-guided underlines Checkpoint 2

## Request and current stop

The owner requested: merge `origin/claude/criterion-bar` into
`codex/dk-guided-underlines`, complete
`docs/CODEX_TASK_DK_GUIDED_UNDERLINES_CP2.md`, fix one pattern at a time, keep a
fix only if it does not break the regression words, then one full run and a
fresh 300-word test with seed **20261114**, stop at **50 viewed sheets** at most,
push and report, **never push to main**.

The owner then asked to stop and hand the remaining work to Fable. This is a
**progress handoff, not a completed checkpoint or production candidate**.

Repository: https://github.com/yaishmohamedniyaaz-netizen/Tanween-App

Branch: `codex/dk-guided-underlines` only. The clean merge is
`e3efc589aca8086f803b08d74e5f09f4b0caaba0`, with parents including task baseline
`66c9e4e4085c6f48bf9f4af02683f3ef33ebfdfe` and source
`3e9dd02423559719cf7130c8b3e174eede5fddca`.

Read `AGENTS.md`, `docs/DEVELOPMENT.md`,
`docs/CODEX_TASK_DK_GUIDED_UNDERLINES.md`, and the complete CP2 instruction file
before continuing. Never change `src/`, artwork/page data, `public/mushaf-dk/`,
or approved `public/letter-borders/`. Do not wire anything into the app, deploy,
merge to main, or export colour files.

## Work preserved

All paths below are relative to `scripts/letter-masks/dk_guided/`.

- `prepare_cp2.py` builds deterministic development/regression/exclusion inputs.
- `checkpoint2/dev-failures.json`: **656 unique dev cases**, preserving the
  qualifying historical records and all 100 collision diagnostics. Some old
  failures were already repaired by v2; do not count them as new repairs.
- `checkpoint2/regression120.json`: **120** words sampled from all **350** CP1b
  `ok` words, including `ok` words tagged `label-wrong`, using the string seed
  `20261113-reg` and stable documented order.
- `checkpoint2/excluded.json`: **24,202 IDs**. It unions prior exclusions,
  all CP1b reviews, and the collision diagnostic development IDs. Add every new
  development/review exposure before the final test draw.
- `checkpoint2/input-summary.json`: hashes, source inventory, counts and rules.
- `labels_v3.py`: opt-in detached-body matching, stem matching and connected-ink
  geodesic growth. Default alignment/labels match v2. Original `dkguide.py` is
  unchanged. Detached matching is a restricted experiment with v2 fallback,
  not a complete unmatched-piece classifier.
- `bars_v3.py`: opt-in integer collision allocation and final-bowl contour
  trial. `bars_v2.py` remains untouched and runnable.
- `checkpoint2_trial.py`: runs each pattern's dev cases plus all 120 regression
  words, preserves before/after comparisons, and makes changed-word sheets.
  Candidate bars are the **upper** row, baseline bars the **lower** row.
- `record_cp2_trial.py`: records explicit visual observations and image hashes,
  enforces zero newly broken regression words, a demonstrated dev repair, and
  the sheet cap before adding a flag to `checkpoint2/kept.json`.
- `test_v3_checkpoint.py`: ten focused tests. All ten passed at handoff.
- `run_v3.py`: draft final runner, **not yet corpus-tested**. Its isolated
  `--self-test` passed. It uses atomic page writes, config/input hashes,
  app-target checks, geometry withholding and a refinalized fit percentile.
  Complete/review the end-to-end validator and test workflow before using it.

No final validator or CP2 fresh-test/review script is complete. Adapt the v2
review workflow into CP2-specific files; never overwrite CP1/CP1b evidence.

## Sequential trials so far

`checkpoint2/fix-log.json` is the authoritative per-fix record, with exact
per-word judgments. `audit.json` records only the three actually viewed sheets.

| Pattern | Computer cases / changed | Changed regressions | Observed result | Decision |
| --- | ---: | ---: | --- | --- |
| 5, collisions | 451 / 76 | 0 | 0 fully repaired, 24 still wrong on the reviewed sheet. Geometry is repaired but underlying labels still squeeze targets or put bars under neighbours. | Dropped |
| 4, detached ink | 131 / 2 | 2 | No dev bars changed. Both changed regression words were judged wrong. | Dropped |
| 2, stems | 241 / 34 | 4 | No fully repaired current 1b failure. One changed regression failed: `12.110.17`, alif span extends under lam. Of 20 reviewed dev words, 16 wrong/unsure; four looked right but were old failures, not demonstrated new repairs. | Dropped |
| 1, stacked ج ح خ | 147 / 14 | 5 | Computer pass and one sheet generated; **not viewed or scored**. | Pending |
| 3, final bowl | Not run | Not run | Code exists but no trial. | Pending |

**Kept flags: empty. Viewed sheets: 3/50. Remaining allowance: 47.**
No full run started. No new test sample drawn, frozen, rendered or viewed.
Public bars and all protected paths remain unchanged from the merge.
No experiment or generation process remains active.

## Resume precisely here

1. Do not redo the three completed sheets or call a rejected fix accepted.
2. Inspect `checkpoint2/pattern-1/comparison.json` and `manifest.json`, then open
   `checkpoint2/pattern-1/changed-001.png` once. That will be sheet **4**. It has
   five changed regression words and nine changed dev words. Record each actual
   verdict using `record_cp2_trial.record(1, verdicts, reason)` after viewing.
   A fix may be retained only with **zero** newly broken regression words.
   The owner's zero-break requirement overrides the CP2 document's <=1 clause.
3. Continue pattern 3 only after deciding pattern 1. The command is
   `python scripts/letter-masks/dk_guided/checkpoint2_trial.py 3`.
   Do not count unviewed changes as fixed or right. Small refinements remain
   possible within the requested pattern order and sheet budget; preserve
   prior image/provenance files and use distinct revision paths if iterating.
4. Freeze final kept flags and source/config hashes. If no fix survives,
   explicitly reconcile the instruction **never repeat a full run without a
   kept fix**. Do not manufacture improvement or silently spend a full run on
   identical predictions.
5. Once a reviewed fix is kept and validation is ready, run all 604 pages once
   with method `dk-guided-v3`, then finalize the global 90th-percentile fit.
   Preserve narrow-bar >=3px, coverage >=97%, fit, error and geometry gates;
   size/empty-letter/order remain disabled as in 1b. Report automatic coverage
   and require >=85%. The existing v2 run took about two hours; do not claim
   that timing for this unrun v3 implementation.
6. Only after final generation, freeze a fresh **300** `ok`-word sample using
   integer seed **20261114**, numeric page order and sorted word IDs, `p > 2`,
   excluding every historical and CP2 exposure. Save eligible population,
   exclusions, hashes, sample and prediction snapshots **before viewing**.
7. Review first 100. If **fewer than 95** are fully right, stop immediately;
   do not open the other 200. Otherwise finish 300. Judge letter-by-letter and
   save right/wrong letter counts, not just word verdicts. Follow app tids and
   merged madd alifs, ignoring dots/harakat for bars. Do not tune on this test.
8. Preserve observed wrong/unsure withholding, validate all outputs and evidence,
   append the report to the CP2 document, commit/push **this branch only**,
   verify the remote SHA and stop. Compare CP1b 91.67% with the new result as
   **different samples**, not paired improvement. Report exact test fraction,
   letter fraction, coverage, remaining patterns, sheets and runtime. Token
   telemetry is unavailable; record `null`, not an invented number.

## Environment and commands

Current checkout, if the same cloud workspace is available:
`/workspace/scratch/d00db2b452cf/Tanween-App`.

It is a partial clone with sparse public paths. A fresh checkout can use the
full repository or materialize `public/mushaf/1405-artwork-5a5f9f3846158475/`,
`public/mushaf-dk/dk-web-4213fab-v1/`, `public/pages/`, and
`public/letter-bars-dk/`. The current local interpreter is `.venv-dk/bin/python`.
Install the exact dependencies in `setup-evidence/requirements.txt` into a
virtualenv. Node must support `--experimental-strip-types` for `dump_units.mts`.

```
git checkout codex/dk-guided-underlines
git pull --ff-only origin codex/dk-guided-underlines
python -m venv .venv-dk
.venv-dk/bin/pip install -r scripts/letter-masks/dk_guided/setup-evidence/requirements.txt
.venv-dk/bin/python -m unittest discover -s scripts/letter-masks/dk_guided -p 'test_v3_checkpoint.py' -q
.venv-dk/bin/python scripts/letter-masks/dk_guided/run_v3.py --self-test
```

After the decisions and validation above, final-generation commands are:

```
.venv-dk/bin/python scripts/letter-masks/dk_guided/run_v3.py --workers 5
.venv-dk/bin/python scripts/letter-masks/dk_guided/run_v3.py --finalize
```

The ignored `checkpoint2/cache/` holds about 650MB of local alignment pickles;
it is an acceleration only, not authoritative evidence or a transferred input.
The trial script regenerates missing entries and verifies historical label
hashes on cache reuse. Neither the cache nor `.venv-dk/` is committed.

Final handoff checks passed: ten scoped tests, runner self-checks, Python
compilation, diff whitespace, and protected-path diff. No full test suite,
604-page v3 run, fresh test, browser/UI review or deployment has been performed.

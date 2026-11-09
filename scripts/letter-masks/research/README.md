# Letter positions: Checkpoint 1 research

Start with [CHECKPOINT_1.md](CHECKPOINT_1.md). **Stop at Checkpoint 1.** These are reconstructed and newly executed research results, not recovered files from the lost original checkpoint. No app code, Quran text, artwork, page data, letter units, existing approvals or public guess maps are changed.

## Reproduce

From a checkout of `codex/letter-positions-research`, with Node 22.18+, Python 3.12 and git:

```sh
bash scripts/letter-masks/research/reproduce.sh
```

The command creates an ignored Python environment, downloads pinned OFL fonts from official repositories, runs W1 registration/top100, trains the bounded W2 recognizer and W3 models, audits agreement, regenerates review/contact/staged exports and runs shared integrity tests. Allow approximately 15 minutes on a small CPU machine, plus dependency/font downloads; runtime varies. It does **not** train on all 8,820 lines or advance to Checkpoint 2. Numerical seeds and key libraries are pinned. Exact cross-platform Torch/font rasterizer equality is not promised.

To regenerate only integration outputs from committed predictions:

```sh
bash scripts/letter-masks/research/reproduce.sh --reuse-results
```

This mode does not train models. Existing committed historical projection is used; `extract_reference.py` can re-extract it from pinned visual commit `8d58d3ec37a89012ed641687b0ac34a4e84ffc19` without merging that branch. Model weights/crop caches live only under ignored `tmp/letter-positions/`. Repeat-run hashes and provenance remain in research JSON. `w2_reproduce.sh` runs the more expensive independent duplicate-training check. Workstream reports contain scoped tests and detailed recipes. Review records document actual image inspection, not automatic approvals.

## Review format and coverage

- `../review/proposals-001.json`: 22,577 low-confidence proposals spanning top 100 exact spellings, grouped into 6,068 strict historical shape families. 22,477 retain explicitly marked historical proposals; only 100 are newly inferred 2-D representatives. It is not a new model run on every member.
- `../review/proposals-001-new2d.json`: the 100 newly warped representatives alone, one per spelling. No family propagation is inferred from a single representative.
- `../review/families-001.json`: exact historical membership and ranks for the review grid.
- Fields retain exact app `wid`, `page`, ordered `tids`, `family`, `spellingRank`, `method`, `confidence` and `source`. `x` is an absolute artwork-pixel boundary list when it exists. `bars` is one **full support** `[left,right]` interval per target, in absolute artwork pixels. Overlap is allowed. Apply the central 40% transformation once for the displayed short bar; these are not already-shrunk bars.
- 39 previously approved pilot words are excluded. The 32 historical missing-body words remain withheld. Existing approved borders never become generated guesses.
- All confidence is `low`; no `medium` or `high`. Structural validity is not ownership accuracy. These suggestions need the owner's review, not automatic use in judging.

## Evaluation and safety

`checkpoint_metrics.json` has all three development strata (65 pages 1–2, 30 regular, combined 95), per-confidence and stacked/nonstacked metrics, per-word rows, explicit abstentions and requested denominators. The scorer uses historical vertical approval spans as a proxy. It cannot certify genuine 2-D ownership in stacked letters. All 125 old approvals were already exposed; none is a fresh test. W2's geometry-evaluated words are all from its training lines. The 13-word stacked-risk subset is a spelling heuristic, not manually annotated stacking truth.

Shared loader uses a fixed historical-file allowlist and provenance-bound caches. Wrong IDs/pages/target order, nonfinite/empty/out-of-body intervals, and invalid cuts are rejected before scoring. Independent `verify.py` dumps current app units afresh, checks every proposal/family and contact hash, and checks protected paths against the source baseline. Tests do not repair or overwrite user data.

`validated-guesses/` is a research-only, empty, fail-closed export (604 pages plus index). It was **not installed**: the owner subsequently required all existing `public/letter-borders-guess/` files to be preserved. Those 605 files and their 77,308 legacy entries remain unchanged. This is an explicit exception to the task's original app-facing output request, not a claim that existing public guesses passed the new gate.

## Future approval batches

`split_batch.py NNN` is prepared but **not run on any real batch**. After the owner supplies an explicitly approved new batch and instructs continuation, it freezes `ceil(15% × words)` using seed 20261108 before any learning, preserving bars verbatim. It rejects old exposed IDs, prior split IDs, changed inputs, partial outputs and unapproved records. Six temporary-fixture tests passed. Word-random splitting can share drawing families; the manifest reports known family overlap. Future training must explicitly load only the frozen training portion. Current feasibility scripts intentionally never glob future heldout files.

## Artifact map

- Verdicts and licences: `W1_REPORT.md`, `W2_REPORT.md`, `W3_REPORT.md`, `EXISTING_WORK.md`.
- Shared metrics/confidence: `checkpoint_metrics.json`, `agreement.json`, `coverage.json`, `validation.json`.
- Evidence: `development_manifest.json`, `w1_validation.json`, `w2_reconstruction_validation.json`, `w2_image_review.json`, `w3_determinism.json`, `visual_review.json`.
- Contact images: ten seeded random sheets (200 words), five new-representative sheets (100 words), five W1 comparison sheets, W1 stacked masks, two W2 sheets and five W3 sheets.
- Logs: `test-logs/`. A passed build is not deployment or physical-device approval.

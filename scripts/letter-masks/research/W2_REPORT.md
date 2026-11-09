# W2 reconstructed feasibility: real CRNN/CTC forced alignment

## Reconstruction status and verdict

These files were **reconstructed from retained actual source/tool history and regenerated**, not recovered original artifacts. Numeric results below describe the new primary run. The lost original run is only a historical comparison: 411.910 seconds, 0% training CER, 28.387% text-validation CER, 328/389 (84.319%) short-bar containment. No old timings or measurements are presented as new executions.

W2 works as a bounded centre-proposal experiment, but does **not** reach the 95% short-bar target or establish production-ready 2-D ownership. Do not scale it at Checkpoint 1. All proposals are low confidence. Practicality confidence **75/100**, architecture/data safety **97/100**, visual certainty **45/100**. These are assessments, not probabilities.

## Verified corpus and experiment

Across 604 pages: 9,046 layout rows, **8,820 ayah/text lines**, 8,820 geometry rows and **77,433 letter-role words**. The requested 8,820-line count is verified, not assumed.

- 40 original whole-line crops containing the 95 development words; 344 tokens including ayah markers; 2905 raw Unicode characters including marks and spaces.
- Six separate page-3 text-validation lines, 465 characters. No shared line IDs. No approval geometry used for recognition training or selection of epochs. Validation contains 0 unseen character classes, 0 occurrences.
- 108,213 parameters: three convolutions, vertical pooling, bidirectional GRU (64 hidden units/direction), softmax and genuine CTC loss. Input height 48; image mirrored horizontally so sequence time follows Arabic reading order.
- 68 nonblank Unicode classes; seed 20261108; two CPU threads; deterministic PyTorch algorithms; Adam 0.002; one line/update; fixed 180-epoch budget. No geometry hyperparameter tuning or best-checkpoint selection.
- PyTorch 2.15.0+cpu official CPU wheel, NumPy 2.3.5, Pillow 13.0.0, SciPy 1.17.0. Python: 3.12.14 (main, Aug 25 2026, 14:00:49) [Clang 22.1.3 ]. Actual package versions, Torch build configuration and environment isolation status are recorded in `w2_runtime.json`. This reconstruction used an ignored environment with explicitly pinned host numerical libraries; a fresh bootstrap creates an isolated environment. No pretrained recognizer or external annotation dataset. PyTorch licence: https://github.com/pytorch/pytorch/blob/main/LICENSE . Repository source-data licences remain unchanged.
- Every geometry-evaluated word occurs in a recognizer training line, including historically named validation30. **These are training-line development metrics**, not heldout geometry results. All 125 old approvals were already exposed; the old exposed30 are excluded. Fresh heldout count is zero.

## New recognition and geometry measurements

Initial CTC loss 3.990451; final loss 0.001276. Training CER **0.00%** (0/2905 edits, 40/40 exact lines). Separate text-validation CER **28.39%** (132/465 edits; 0/6 exact lines).

Forced alignment produced 95/95 support proposals, 0 abstentions. These are diagnostic unapproved research predictions, not production output. Metrics below are the **historic vertical-span proxy**, not verified per-letter 2-D ink ownership. Full artwork-pixel support intervals are shrunk to their central 40% for scoring. Border tolerance is two legacy display pixels (473.6/1920 scale), not two artwork pixels.

| Development set / confidence | Scored words | 40% bar contained | Abstentions/invalid as misses | Bar centre in span | Inner borders within 2 display px |
|---|---:|---:|---:|---:|---:|
| train65: all / low | 65/65 | 82.35% | 82.35% | 97.23% | 74.55% |
| train65: stacked-risk / low | 8/8 | 82.76% | 82.76% | 100.00% | 71.43% |
| validation30: all / low | 30/30 | 90.00% | 90.00% | 100.00% | 58.57% |
| validation30: stacked-risk / low | 5/5 | 90.00% | 90.00% | 100.00% | 80.00% |
| development95: all / low | 95/95 | 84.32% | 84.32% | 97.94% | 70.75% |
| development95: stacked-risk / low | 13/13 | 84.62% | 84.62% | 100.00% | 73.08% |

Raw CTC base-frame centres before midpoint support construction: **94.60%** inside historic spans. Midpoint support cells need not be symmetric around those raw centres, so this is distinct from the bar-centre measure. Full counts, per-word rows, confidence strata and stacked/nonstacked strata are in `w2_results.json`. Stacked-risk is a predeclared spelling proxy, not newly annotated individual stacking. **High coverage 0/77,433 = 0%.**

## Exact app-unit mapping and limitations

The transcription retains raw combining marks, spaces, ayah numerals and silent written letters. Units come from unchanged `dump_units.mts` and current `judgingTargetsOf`, not inferred base-letter counts. All corpus characters are BMP, verified, so JavaScript UTF-16 offsets equal Python character indices here. Each unit is associated with characters in its exact `[start,end)` range. Its marks stay folded into that unit, while the base-frame mean defines its centre; if no noncombining character exists, use the full range. All 11 development silent targets remain separate, in original order.

Frame centres are transformed from mirrored/resized line coordinates back to absolute artwork x. Support boundaries are adjacent unit-centre midpoints with immutable outer body edges. This avoids using narrow CTC spikes as letter widths but retains a vertical partition and cannot represent overlapping letter masks. Reversed or escaped support abstains. A finite forced path or zero training CER is not proof of correct glyph location: bidirectional context can predict away from the ink. Marks can have nonmonotonic visual positions; stacked bodies overlap; body crops may omit carriers. Six text-validation lines cannot establish full-Mushaf transfer.

## Safety differences in this reconstruction

Shared `common.py` now reads an explicit three-file historical approval allowlist, never future batch/heldout globs. Caches carry source/output SHA256 provenance (code, units, frozen approvals, page geometry and relevant artwork). Shared scoring rejects wrong IDs/pages, invalid target order, escaped/nonfinite/empty supports and invalid cuts **before** counting geometry successes; requested denominators retain invalid/abstained words. This intentionally fixes the old record-only structure-error behavior. Float support coordinates remain allowed; production export rules are separate. Structural regressions are in `common_test.py`.

## Reproducibility and new cost

New primary run: **404.443 seconds** to final recorded epoch, 7,200 line updates, plus dataset preparation/alignment/report work. CPU only; no paid OCR/model calls. Ignored runtime/weights are under `tmp/letter-positions/`. No protected source, artwork, app units or approval files are changed by this workstream.

One command for a complete fresh run, duplicate training, repeated inference and report:

```sh
bash scripts/letter-masks/research/w2_reproduce.sh
```

`w2_run.sh --reuse` redoes inference from ignored local weights. `w2_test.py` checks CTC repeated-label transitions, corpus inventory, BMP unit ranges, all 95 target identifiers and 11 silent targets. `common_test.py` tests invalid-row rejection. Model hashes compare canonical tensor bytes, not potentially variable Torch archive container bytes. Determinism across different software/CPU environments is not promised.

Primary predictions SHA256: `b93d5045617db3b92906d1bffcd37f30a9f2a0436ebb763790f8807e9981fdc3`. Canonical tensor SHA256: `4ecc35de838a061ea19f2d25125272e7ff3cc48ef4dc5594bda00a3fadf31f8e`.

Fresh duplicate training: 396.823 seconds; predictions identical: **True**; canonical tensor state identical: **True**. Repeated cached inference checked: **True**, identical: **True**. Matches the historical prediction hash retained in conversation: **True**. A matching regenerated hash does not mean lost original files were recovered. Exact evidence: `w2_reconstruction_validation.json`.

## Images and next decision

`../contact/w2_ctc_development.png`: 24 original development crops. `../contact/w2_ctc_stacked.png`: 13 stacked-risk crops. Orange thick bars show central 40% of pale-orange support; green ticked intervals are historic spans. Generation is not visual approval. New actual image-review status is tracked separately in `w2_image_review.json` when completed.

Keep W2 as an independent centre proposal only. Agreement with other methods is not ground truth. Fresh labels and 2-D evaluation remain necessary before high-confidence publication. Stop at Checkpoint 1.

"""Narrative generated from NEW reconstruction measurements; prior metrics are labelled history."""
import json
from pathlib import Path
H=Path(__file__).resolve().parent
r=json.loads((H/'w2_results.json').read_text());h=r['history'];f=lambda x:f'{100*x:.2f}%' if x is not None else 'N/A'
vr=H/'w2_reconstruction_validation.json';v=json.loads(vr.read_text()) if vr.exists() else None
rows=[]
for k in ('train65','validation30','development95'):
    for label,m in [('all / low',r['metrics'][k]['overall']),('stacked-risk / low',r['metrics'][k]['stackedRisk'])]:
        rows.append(f"| {k}: {label} | {m['scoredWords']}/{m['requestedWords']} | {f(m['shortBarContained'])} | {f(m['shortBarContainedIncludingAbstentionsAsMisses'])} | {f(m['centreInside'])} | {f(m['bordersWithin2'])} |")
s=f'''# W2 reconstructed feasibility: real CRNN/CTC forced alignment

## Reconstruction status and verdict

These files were **reconstructed from retained actual source/tool history and regenerated**, not recovered original artifacts. Numeric results below describe the new primary run. The lost original run is only a historical comparison: 411.910 seconds, 0% training CER, 28.387% text-validation CER, 328/389 (84.319%) short-bar containment. No old timings or measurements are presented as new executions.

W2 works as a bounded centre-proposal experiment, but does **not** reach the 95% short-bar target or establish production-ready 2-D ownership. Do not scale it at Checkpoint 1. All proposals are low confidence. Practicality confidence **75/100**, architecture/data safety **97/100**, visual certainty **45/100**. These are assessments, not probabilities.

## Verified corpus and experiment

Across {r['counts']['pages']} pages: {r['counts']['all_rows']:,} layout rows, **{r['counts']['ayah_rows']:,} ayah/text lines**, {r['counts']['geometry_rows']:,} geometry rows and **{r['counts']['letter_words']:,} letter-role words**. The requested 8,820-line count is verified, not assumed.

- {r['training_lines']} original whole-line crops containing the 95 development words; {r['training_words']} tokens including ayah markers; {r['train']['characters']} raw Unicode characters including marks and spaces.
- Six separate page-3 text-validation lines, {r['validation']['characters']} characters. No shared line IDs. No approval geometry used for recognition training or selection of epochs. Validation contains {len(r['validation_unseen_classes'])} unseen character classes, {r['validation_unseen_occurrences']} occurrences.
- {r['parameters']:,} parameters: three convolutions, vertical pooling, bidirectional GRU (64 hidden units/direction), softmax and genuine CTC loss. Input height 48; image mirrored horizontally so sequence time follows Arabic reading order.
- {r['vocabulary']} nonblank Unicode classes; seed 20261108; two CPU threads; deterministic PyTorch algorithms; Adam 0.002; one line/update; fixed {h[-1]['epoch']}-epoch budget. No geometry hyperparameter tuning or best-checkpoint selection.
- PyTorch {r['torch']} official CPU wheel, NumPy 2.3.5, Pillow 13.0.0, SciPy 1.17.0. Python: {r['python'].splitlines()[0]}. Actual package versions, Torch build configuration and environment isolation status are recorded in `w2_runtime.json`. This reconstruction used an ignored environment with explicitly pinned host numerical libraries; a fresh bootstrap creates an isolated environment. No pretrained recognizer or external annotation dataset. PyTorch licence: https://github.com/pytorch/pytorch/blob/main/LICENSE . Repository source-data licences remain unchanged.
- Every geometry-evaluated word occurs in a recognizer training line, including historically named validation30. **These are training-line development metrics**, not heldout geometry results. All 125 old approvals were already exposed; the old exposed30 are excluded. Fresh heldout count is zero.

## New recognition and geometry measurements

Initial CTC loss {h[0]['loss']:.6f}; final loss {h[-1]['loss']:.6f}. Training CER **{f(r['train']['cer'])}** ({r['train']['edit_errors']}/{r['train']['characters']} edits, {r['train']['exact_lines']}/{r['training_lines']} exact lines). Separate text-validation CER **{f(r['validation']['cer'])}** ({r['validation']['edit_errors']}/{r['validation']['characters']} edits; {r['validation']['exact_lines']}/6 exact lines).

Forced alignment produced {r['aligned_words']}/95 support proposals, {r['abstained_words']} abstentions. These are diagnostic unapproved research predictions, not production output. Metrics below are the **historic vertical-span proxy**, not verified per-letter 2-D ink ownership. Full artwork-pixel support intervals are shrunk to their central 40% for scoring. Border tolerance is two legacy display pixels (473.6/1920 scale), not two artwork pixels.

| Development set / confidence | Scored words | 40% bar contained | Abstentions/invalid as misses | Bar centre in span | Inner borders within 2 display px |
|---|---:|---:|---:|---:|---:|
'''+ '\n'.join(rows)+f'''

Raw CTC base-frame centres before midpoint support construction: **{f(r['raw_peak_centres']['development95']['rate'])}** inside historic spans. Midpoint support cells need not be symmetric around those raw centres, so this is distinct from the bar-centre measure. Full counts, per-word rows, confidence strata and stacked/nonstacked strata are in `w2_results.json`. Stacked-risk is a predeclared spelling proxy, not newly annotated individual stacking. **High coverage 0/77,433 = 0%.**

## Exact app-unit mapping and limitations

The transcription retains raw combining marks, spaces, ayah numerals and silent written letters. Units come from unchanged `dump_units.mts` and current `judgingTargetsOf`, not inferred base-letter counts. All corpus characters are BMP, verified, so JavaScript UTF-16 offsets equal Python character indices here. Each unit is associated with characters in its exact `[start,end)` range. Its marks stay folded into that unit, while the base-frame mean defines its centre; if no noncombining character exists, use the full range. All 11 development silent targets remain separate, in original order.

Frame centres are transformed from mirrored/resized line coordinates back to absolute artwork x. Support boundaries are adjacent unit-centre midpoints with immutable outer body edges. This avoids using narrow CTC spikes as letter widths but retains a vertical partition and cannot represent overlapping letter masks. Reversed or escaped support abstains. A finite forced path or zero training CER is not proof of correct glyph location: bidirectional context can predict away from the ink. Marks can have nonmonotonic visual positions; stacked bodies overlap; body crops may omit carriers. Six text-validation lines cannot establish full-Mushaf transfer.

## Safety differences in this reconstruction

Shared `common.py` now reads an explicit three-file historical approval allowlist, never future batch/heldout globs. Caches carry source/output SHA256 provenance (code, units, frozen approvals, page geometry and relevant artwork). Shared scoring rejects wrong IDs/pages, invalid target order, escaped/nonfinite/empty supports and invalid cuts **before** counting geometry successes; requested denominators retain invalid/abstained words. This intentionally fixes the old record-only structure-error behavior. Float support coordinates remain allowed; production export rules are separate. Structural regressions are in `common_test.py`.

## Reproducibility and new cost

New primary run: **{h[-1]['elapsed_s']:.3f} seconds** to final recorded epoch, {h[-1]['epoch']*r['training_lines']:,} line updates, plus dataset preparation/alignment/report work. CPU only; no paid OCR/model calls. Ignored runtime/weights are under `tmp/letter-positions/`. No protected source, artwork, app units or approval files are changed by this workstream.

One command for a complete fresh run, duplicate training, repeated inference and report:

```sh
bash scripts/letter-masks/research/w2_reproduce.sh
```

`w2_run.sh --reuse` redoes inference from ignored local weights. `w2_test.py` checks CTC repeated-label transitions, corpus inventory, BMP unit ranges, all 95 target identifiers and 11 silent targets. `common_test.py` tests invalid-row rejection. Model hashes compare canonical tensor bytes, not potentially variable Torch archive container bytes. Determinism across different software/CPU environments is not promised.

Primary predictions SHA256: `{r['prediction_sha256']}`. Canonical tensor SHA256: `{r['model_tensor_sha256']}`.

'''
if v:
    s+=f"Fresh duplicate training: {v['duplicateTrainingSeconds']:.3f} seconds; predictions identical: **{v['predictionFilesIdentical']}**; canonical tensor state identical: **{v['tensorStatesIdentical']}**. Repeated cached inference checked: **{v['repeatInferenceChecked']}**, identical: **{v['repeatInferenceIdentical']}**. Matches the historical prediction hash retained in conversation: **{v['matchesHistoricalPredictionHash']}**. A matching regenerated hash does not mean lost original files were recovered. Exact evidence: `w2_reconstruction_validation.json`.\n\n"
else:s+='Duplicate training/inference validation is pending; no repeatability claim yet.\n\n'
s+='## Images and next decision\n\n`../contact/w2_ctc_development.png`: 24 original development crops. `../contact/w2_ctc_stacked.png`: 13 stacked-risk crops. Orange thick bars show central 40% of pale-orange support; green ticked intervals are historic spans. Generation is not visual approval. New actual image-review status is tracked separately in `w2_image_review.json` when completed.\n\nKeep W2 as an independent centre proposal only. Agreement with other methods is not ground truth. Fresh labels and 2-D evaluation remain necessary before high-confidence publication. Stop at Checkpoint 1.\n'
(H/'W2_REPORT.md').write_text(s);print('W2_REPORT.md regenerated from NEW measurements')

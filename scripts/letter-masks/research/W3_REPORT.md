# W3 reconstruction: letter-mask segmentation feasibility

**Status: source reconstructed from retained tool-call code; two fresh executions complete; deterministic repeat verified.** The earlier files/checkpoints were lost. This is not byte-identical file recovery, and historical measurements are not presented as new measurements. No protected source/artwork/approval files are edited.

## Experiment contract

65 approved pages 1–2 words train the models; the original 30 regular-page development words validate. The exposed old 30 are excluded. No fresh heldout is loaded. Historical intervals generate **weak vertical-span masks, not genuine 2-D ownership truth**. Neither agreement nor mask-shaped arrays fixes this label limitation for stacked letters.

The reconstructed experiment retains the earlier numerical training recipe: two-level U-Net, 8/16 channels, 32×96, independent unit binary outputs, ink-only BCE with positive weight 3, Adam 0.003, 60 epochs, batch 8 words, two CPU threads, seed 20261108. Geometry inputs are ink, x, y, unit index and target count. Sequence variant adds four-dimensional current-unit embedding and mean sequence embedding: limited bag-of-sequence context plus unit index, not a full ordered sequence encoder. Vocabulary comes only from training; unknown forms map to 0. Affine augmentation alternates epochs: horizontal scale 0.9–1.1, slant ±0.08; Gaussian ink noise 0.025. This is bounded augmentation, not thorough stroke-width/internal-kashida randomization.

Three fits: weak geometry; weak conditioned; synthetic conditioned. W1 synthetic renderer must reject ambiguous clusters/missing glyphs/empty units. Shared-overlap pixels are excluded. Prefer oldmadina, Amiri fallback. Exact synthetic glyph ownership is not exact historical artwork ownership. No pretrained weights are used. Endpoint agreement with W2 is audited but **zero pseudo-label words train W3**, since reliable 2-D pseudo-label ownership is unavailable.

Independent probability ≥0.5 masks permit overlap. Bars derive from x-support of the lower 40% mask pixels, clipped to immutable body bounds. Final shared scoring validates structure and only then applies central 40% shrinkage. Empty/invalid supports abstain. No intermediate prediction JSON is exported under research. Border-error metrics are inapplicable to independently overlapping supports.

## Reproduction

After W1 font and W2 runtime setup:

```sh
bash scripts/letter-masks/research/w3_reproduce.sh
```

Pinned shared runtime: torch 2.15.0+cpu, numpy 2.3.5, Pillow 13.0.0, scipy 1.17.0. Renderer versions/provenance belong to W1. Deterministic algorithms enabled, seeds fixed, CPU threads capped 2. Models remain in ignored tmp; hashes are durable. Run twice and compare checkpoint/prediction/image hashes before claiming determinism. Five artifact regressions cover unit identity/body bounds, split disjointness, synthetic rejection, no false pseudo-training, and absence of stale prediction exports.

Fresh results, costs, actual image review and confidence verdict follow below. Historical reference only: the earlier final validation bar rates were 47%, 53%, 50%; they must not be assumed for this rebuild.

## Fresh reconstruction results (first run)

**Verdict: do not scale W3 or promote these bars to approved placements.** The fresh run reproduced the numerical short-bar outcome. This is new measured evidence, not a copied historical table. All predictions are low confidence. Full-Mushaf high coverage is **0/77,433**; nothing was generated for production.

| Model / supervision | Train contained bars | Validation contained bars | Validation centre inside | Validation whole-word bars | Validation stacked-risk bars |
|---|---:|---:|---:|---:|---:|
| Geometry / weak |91/289 (31.5%)|47/100 (47%)|77%|4/30 (13.3%)|6/10 (60%)|
| Sequence / weak |149/289 (51.6%)|53/100 (53%)|74%|9/30 (30%)|8/10 (80%)|
| Sequence / synthetic |135/289 (46.7%)|50/100 (50%)|71%|4/30 (13.3%)|7/10 (70%)|

The shared scorer reports zero structural invalids and zero abstained final words for all three models. Confidence-stratified results equal the low-confidence table because no medium/high labels were issued. Borders within two pixels are not applicable. Stacked-risk is a predeclared spelling heuristic, not visually established per-instance truth: training has eight words/29 targets; validation has five words/10 targets. Training stacked-risk bars are 10/29, 13/29, 14/29 respectively. The small validation stratum cannot establish 95% reliability.

Weak geometry ink-pixel accuracy progresses from 31.88% to 75.77% training and 40.95% to 83.00% validation. Weak sequence finishes 82.00% training/74.92% validation; the better training fit does not establish generalization. Synthetic glyph assignment reaches 91.08% training/84.80% synthetic validation, but falls to 72.43% on artwork against weak span labels. Pixel assignment and bar success diverge because independent thresholded masks can be diffuse, and distant pixels broaden the lower-part support. Low spatial resolution and the positive-weighted binary objective are additional plausible limitations, not independently isolated causes.

Synthetic audit freshly accepted 91/95 oldmadina and 95/95 Amiri words. Four rejected oldmadina examples use Amiri fallback. Both font licences are OFL 1.1, freshly checked by W1; the font revisions and exact renderer provenance are in W1_REPORT.md. These exact unambiguous font glyph masks still do not identify historical artwork strokes. The completed [W1/W2 pseudo-label audit](w3_pseudolabel_audit.json) found 10 agreeing words among 91 eligible pairs, using a maximum endpoint difference of 8.108 artwork pixels. Zero pseudo-label words trained W3; agreement does not establish 2-D ownership.

## Actual image review

Freshly opened and inspected two complete sheets: `contact/w3-sequence-stacked-masks.png` and `contact/w3-validation.png`. The former shows weak span ownership at left and predicted argmax ownership at right for 12 stacked-risk examples. Argmax is display only; actual supports use independent masks, so overlaps remain possible. In `2.4.9`, several neighbouring colours shift together; in `2.193.10`, the overlap and upper mark are reassigned. The weak labels themselves cut crossing ink vertically and cannot certify the true owner. The bar sheet visibly has overlapping blue/red support in `9.30.22` and compressed or displaced supports elsewhere. These images support the negative verdict; no visual correction was fed back into training.

Five review sheets are generated: geometry/weak-sequence/synthetic-sequence stacked masks and two validation bar sheets. They are development diagnostics, not owner approvals. The overall checkpoint includes the separate 200-word random contact review.

## Fresh runtime, integrity and scope

First fresh training run: **72.04 seconds** for the two weak models and **42.76 seconds** for synthetic. Each complete run is three models × 60 epochs × 9 updates = 1,620 optimization steps. An extra standalone synthetic-export readiness check rendered 190 words before the full runs. No GPU, paid API or pretrained download was used. Runtime is shared with W2, avoiding duplicate torch installation.

The three regenerated checkpoint SHA-256 values exactly match the hashes retained in the earlier conversation:

- Geometry: `9df1561e0f8e2f35cdc0e10a92c60bd9a09b4a2c81beed139953bf1a4e1463a4`
- Weak sequence: `b6a636f4a22f7d32a62e93db6305f6e8cae265f2f7b4e22db7d56bf921041aee`
- Synthetic sequence: `6e2b4bd3fac9ff804085b977bae4b28cda388397c6012b370f22760bbade7dfb`

This verifies faithful numerical regeneration of these weights, not recovery of the lost workspace. Prediction metadata and image labels/layout were cleaned, so their original byte identity is not claimed. The fresh shared final metric digest also matches the retained historical digest. Training-loop histories now consistently use final clipped supports/shared scoring, rather than retaining misleading pre-finalization scores.

Five scoped regression tests passed after the first run. No whole-app/browser test is claimed because no app/UI change occurred. No protected source/artwork/page/unit/approval files were changed. No full-corpus W3 training, fresh-test scoring, commit or push was performed in this workstream. No strong stroke-width/internal-kashida augmentation study or pseudo-label mixture was completed. These are bounded feasibility limitations, not concealed completed work.

Confidence: **practicality 87/100** for reproducible bounded training; **architecture/data safety 95/100** for isolated exact-unit research with validated supports; **visual certainty 35/100** for target attribution. Obtain genuine 2-D supervision and improve domain matching before scaling.

## Completed deterministic repeat

The second complete fresh run took **96.66 seconds** for the weak pair and **49.38 seconds** for synthetic. `w3_determinism.json` records **15/15 matching artifacts** across the two fresh runs: three checkpoint files, five PNG sheets, three final prediction files, shared scores, synthetic audit, and two training-history objects with elapsed seconds excluded. No metric differences were suppressed; only elapsed wall time was excluded. All five regression tests passed again.

Fresh total training: **3,240 optimizer updates**, six model fits (three configurations, twice). Synthetic rendering: **570 word-font renders** (190 readiness probe plus190 per complete run),558 accepted across these three identical audits. Two complete image sheets were visually inspected. Token cost was not measured. The completed pseudo-label audit is saved separately in `w3_pseudolabel_audit.json`; it does not retrain W3.

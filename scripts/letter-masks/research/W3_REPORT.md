# W3 reconstruction: letter-mask segmentation feasibility

**Status: source reconstructed from retained tool-call code; first fresh execution complete and deterministic repeat in progress.** The earlier files/checkpoints were lost. This is not byte-identical file recovery, and historical measurements are not presented as new measurements. No protected source/artwork/approval files are edited.

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

The shared scorer reports zero structural invalids and zero abstained final words for all three models. Confidence-stratified results equal the low-confidence table because no medium/high labels were issued. Borders within two pixels are not applicable. Stacked-risk is a predeclared spelling heuristic, not visually established per-instance truth: training has eight words/29 targets; validation has five words/10 targets. Training stacked-risk bars are 10/29,13/29,14/29 respectively. The small validation stratum cannot establish 95% reliability.

Weak geometry ink-pixel accuracy progresses from 31.88% to75.77% training and40.95% to83.00% validation. Weak sequence finishes82.00% training/74.92% validation; the better training fit does not establish generalization. Synthetic glyph assignment reaches91.08% training/84.80% synthetic validation, but falls to72.43% on artwork against weak span labels. Pixel assignment and bar success diverge because independent thresholded masks can be diffuse, and distant pixels broaden the lower-part support. Low spatial resolution and the positive-weighted binary objective are additional plausible limitations, not independently isolated causes.

Synthetic audit freshly accepted91/95 oldmadina and95/95 Amiri words. Four rejected oldmadina examples use Amiri fallback. Both font licences are OFL1.1, freshly checked by W1; the font revisions and exact renderer provenance are in W1_REPORT.md. These exact unambiguous font glyph masks still do not identify historical artwork strokes. The W1/W2 pseudo-label audit remains a separate availability check; zero pseudo-label training is claimed.

## Actual image review

Freshly opened and inspected two complete sheets: `contact/w3-sequence-stacked-masks.png` and `contact/w3-validation.png`. The former shows weak span ownership at left and predicted argmax ownership at right for12 stacked-risk examples. Argmax is display only; actual supports use independent masks, so overlaps remain possible. In `2.4.9`, several neighbouring colours shift together; in `2.193.10`, the overlap and upper mark are reassigned. The weak labels themselves cut crossing ink vertically and cannot certify the true owner. The bar sheet visibly has overlapping blue/red support in `9.30.22` and compressed or displaced supports elsewhere. These images support the negative verdict; no visual correction was fed back into training.

Five review sheets are generated: geometry/weak-sequence/synthetic-sequence stacked masks and two validation bar sheets. They are development diagnostics, not owner approvals. The parent checkpoint owns the separate200-word random contact requirement.

## Fresh runtime, integrity and scope

First fresh training run: **72.04 seconds** for the two weak models and **42.76 seconds** for synthetic. Each complete run is three models ×60 epochs ×9 updates =1,620 optimization steps. An extra standalone synthetic-export readiness check rendered190 words before the full runs. No GPU, paid API or pretrained download was used. Runtime is shared with W2, avoiding duplicate torch installation.

The three regenerated checkpoint SHA-256 values exactly match the hashes retained in the earlier conversation:

- Geometry: `9df1561e0f8e2f35cdc0e10a92c60bd9a09b4a2c81beed139953bf1a4e1463a4`
- Weak sequence: `b6a636f4a22f7d32a62e93db6305f6e8cae265f2f7b4e22db7d56bf921041aee`
- Synthetic sequence: `6e2b4bd3fac9ff804085b977bae4b28cda388397c6012b370f22760bbade7dfb`

This verifies faithful numerical regeneration of these weights, not recovery of the lost workspace. Prediction metadata and image labels/layout were cleaned, so their original byte identity is not claimed. The fresh shared final metric digest also matches the retained historical digest. Training-loop histories now consistently use final clipped supports/shared scoring, rather than retaining misleading pre-finalization scores.

Five scoped regression tests passed after the first run. No whole-app/browser test is claimed because no app/UI change occurred. No protected source/artwork/page/unit/approval files were changed. No full-corpus W3 training, fresh-test scoring, commit or push was performed by this worker. No strong stroke-width/internal-kashida augmentation study or pseudo-label mixture was completed. These are bounded feasibility limitations, not concealed completed work.

Confidence: **practicality87/100** for reproducible bounded training; **architecture/data safety95/100** for isolated exact-unit research with validated supports; **visual certainty35/100** for target attribution. Obtain genuine2-D supervision and improve domain matching before scaling.

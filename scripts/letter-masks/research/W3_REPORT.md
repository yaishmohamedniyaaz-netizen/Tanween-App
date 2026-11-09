# W3 reconstruction: letter-mask segmentation feasibility

**Status: source reconstructed from retained tool-call code; fresh execution pending.** The earlier files/checkpoints were lost. This is not byte-identical file recovery, and historical measurements are not presented as new measurements. No protected source/artwork/approval files are edited.

## Experiment contract

65 approved page1–2 words train the models; the original 30 regular-page development words validate. The exposed old30 are excluded. No fresh heldout is loaded. Historical intervals generate **weak vertical-span masks, not genuine 2-D ownership truth**. Neither agreement nor mask-shaped arrays fixes this label limitation for stacked letters.

The reconstructed experiment retains the earlier numerical training recipe: two-level U-Net, 8/16 channels, 32×96, independent unit binary outputs, ink-only BCE with positive weight3, Adam0.003,60 epochs,batch8 words,two CPU threads,seed20261108. Geometry inputs are ink,x,y,unit index and target count. Sequence variant adds four-dimensional current-unit embedding and mean sequence embedding: limited bag-of-sequence context plus unit index, not a full ordered sequence encoder. Vocabulary comes only from training; unknown forms map to0. Affine augmentation alternates epochs: horizontal scale0.9–1.1,slant±0.08; Gaussian ink noise0.025. This is bounded augmentation, not thorough stroke-width/internal-kashida randomization.

Three fits: weak geometry; weak conditioned; synthetic conditioned. W1 synthetic renderer must reject ambiguous clusters/missing glyphs/empty units. Shared-overlap pixels are excluded. Prefer oldmadina, Amiri fallback. Exact synthetic glyph ownership is not exact historical artwork ownership. No pretrained weights are used. Endpoint agreement with W2 is audited but **zero pseudo-label words train W3**, since reliable 2-D pseudo-label ownership is unavailable.

Independent probability≥0.5 masks permit overlap. Bars derive from x-support of the lower40% mask pixels, clipped to immutable body bounds. Final shared scoring validates structure and only then applies central40% shrinkage. Empty/invalid supports abstain. No intermediate prediction JSON is exported under research. Border-error metrics are inapplicable to independently overlapping supports.

## Reproduction

After W1 font and W2 runtime setup:

```sh
bash scripts/letter-masks/research/w3_reproduce.sh
```

Pinned shared runtime: torch2.15.0+cpu,numpy2.3.5,Pillow13.0.0,scipy1.17.0. Renderer versions/provenance belong to W1. Deterministic algorithms enabled, seeds fixed,CPU threads capped2. Models remain in ignored tmp; hashes are durable. Run twice and compare checkpoint/prediction/image hashes before claiming determinism. Five artifact regressions cover unit identity/body bounds,split disjointness,synthetic rejection,no false pseudo-training,and absence of stale prediction exports.

Fresh results, costs, actual image review and confidence verdict will be appended after execution. Historical reference only: the earlier final validation bar rates were47%,53%,50%; they must not be assumed for this rebuild.

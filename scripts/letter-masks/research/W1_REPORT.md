# W1 checkpoint 1: rebuilt font registration feasibility

## Verdict and reconstruction status

**Do not scale this method into approved or high-confidence bars.** Old Madina gives 77.9% short-bar containment among emitted development letters; Amiri gives 79.2%. Whole-word image overlap rises sharply under 2-D warping, but letter ownership remains unreliable. All outputs are low confidence; high coverage over 77,433 words is **0%**.

This is a faithful behavioral reconstruction from retained source/tool history, **not recovered original files**. Newly executed development results match all retained prior aggregate metrics. Original prediction digest strings were not available, so equality with missing original files is not claimed. Two new runs have byte-identical prediction files. Refactoring into a shared `predict()` helper avoids duplicated numerical logic.

Confidence: practicality **78/100** for research/synthetic data; architecture/data safety **97/100**; visual certainty **55/100** for artwork ownership. Protected scripture, runtime, artwork, page geometry, target units and approvals are unchanged. This workstream does not install app-facing predictions.

## Sources and licences freshly checked before rendering

- [Old Madina](https://github.com/DigitalKhatt/oldmadinafont), commit `6e19182f25fb6bd9b6ec05bbb34a3785b2699cca`, SIL OFL 1.1. Its README says **1995**, not an independently established match to this 1405 artwork. Stock HarfBuzz was used; no justification fork was executed.
- [Amiri Quran](https://github.com/aliftype/amiri), commit `d3d0c5cb6fe7196cb4a58608fc5c8ecd2e6e80fa`, SIL OFL 1.1.
- License copies: `w1_oldmadina_OFL.txt`, `w1_amiri_OFL.txt`. Downloaded repositories supply font data only; their code/build scripts do not execute.
- Hafs fallback remains deferred: its embedded licence, inspected in the first run, permits use/copy/distribution but restricts modification/reverse engineering. The old implementation converts WOFF2 to TTF; this rebuild does not assume that conversion is permitted and does not claim Hafs numerical results.

Font SHA-256: Old Madina `de2a8de4932726f1b346432d21449e1d9b82da898a78247d0d71303e90990656`; Amiri `8fa95faaf7bd18b71789f6f57312003e30c5029218a035e5baf613a0222ab82d`.

Runtime: uharfbuzz 0.57.0, freetype-py 2.5.1, FreeType 2.13.2, scikit-image 0.26.0, brotli 1.2.1, fonttools 4.61.1, NumPy 2.3.5, SciPy 1.17.0, Pillow 13.0.0.

## Method and honest ownership

1. Shape exact existing text at 64px with stock HarfBuzz CHARACTER clusters and FreeType without hinting.
2. Map a glyph's full cluster interval to app target intervals. Multiple intersected targets, missing glyph zero, or an empty unit triggers abstention. Unresolved glyph ink is never divided evenly or labelled as exact letters. Shared pixels remain overlapping masks; a categorical learner must ignore them.
3. Independently resize x/y into the component-owned artwork ink bounding box, including marks.
4. Fit genuine 2-D TV-L1 optical flow: Gaussian sigma 1, attachment 12, tightness .3, 5 warps, 10 iterations, tolerance .0001, prefilter true. Warp every mask using precisely the same backward field. No intersection with artwork is used to inflate overlap.
5. Full support interval is the x-range of the bottom 40% of each transported unit's ink pixels. Clip to immutable body geometry and abstain if empty. The shared scorer independently computes the centred 40% short bar.

`w1_render.render_unit_masks(text, units, font_path, px=64)` returns bool `ink[H,W]`, `masks[N,H,W]`, and diagnostics. These are exact rasterized **font glyph identities**, not exact artwork ground truth. W3 uses this API with missing/ambiguous/overlap precautions. None of these 190 renderings had a detected multi-target cluster; that is dataset-specific, not a guarantee about all Arabic shaping.

## Newly measured development results

All accuracy numbers below are **historic vertical-span proxies**, not verified 2-D ownership. Old exposed30 approvals are excluded. No fresh held-out approvals exist. Borders-within-2px is not applicable because independent overlapping intervals do not define a vertical partition; the historical 1-D DTW border result cannot be directly compared.

| Font / split | Emitted words | Contained short bars | Centre inside |
|---|---:|---:|---:|
| Old Madina pages 1–2 | 63/65 | 214/283 = 75.6% | 87.6% |
| Old Madina regular development | 28/30 | 79/93 = 84.9% | 91.4% |
| Old Madina development 95 | 91/95 | 293/376 = 77.9% | 88.6% |
| Amiri pages 1–2 | 65/65 | 221/289 = 76.5% | 92.4% |
| Amiri regular development | 30/30 | 87/100 = 87.0% | 89.0% |
| Amiri development 95 | 95/95 | 308/389 = 79.2% | 91.5% |

Including abstentions as misses, Old Madina development 95 is 293/389 = **75.3%**, regular development **79.0%**. All confidence levels above are low; medium/high have no outputs. All emitted predictions pass the hardened common structural validator.

On the predeclared **stacked-risk spelling subset** (13 words, 39 letters), Old Madina has **34/39  = 87.2%** short-bar containment and 94.9% centre-inside; Amiri **29/39  = 74.4%** and 100% centre-inside. This is not a per-instance visual stacking ground truth.

| Mean union-ink IoU | Old Madina | Amiri |
|---|---:|---:|
| Seeded 50, initial resizing | .27894 | .24084 |
| Seeded 50, 2-D warped | .86881 | .85100 |
| Development95, initial resizing | .29537 | .23529 |
| Development95, 2-D warped | .87846 | .85869 |
| Mean fold fraction | .00865 | .01236 |
| Maximum word fold fraction | .02590 | .03086 |

The field is not diffeomorphic: negative-Jacobian folds, missing thin strokes and competing marks can improve global overlap while corrupting correspondence. **Union IoU is not a confidence certificate.** Missing-glyph abstentions are `2.2.5`, `2.5.2`, `3.173.11`, `40.31.4`; all remain explicitly represented with reasons.

## Actual renewed visual review

All five newly generated 10-word sheets and the 13-example stacked-mask sheet were opened and inspected in this rebuild. Results confirm the earlier failure pattern rather than merely reusing the earlier observations:

- `1.1.1`, repeated Allah forms, and `2.2.2` have close overall outlines, but font weight/marks are not identical to artwork.
- `1.1.2`, `1.4.1`, `1.7.3` and `2.194.1` show initial stacking/vertical differences. Flow can erase or bend letters into place without establishing correspondence.
- `1.2.0`, `1.2.3`, `1.5.3` and `2.2.6` show differing kashida and marks. Union overlap conceals who owns the stretch.
- `2.1.0` is a particularly clear topology/arrangement mismatch; the warped middle structure is damaged.
- `2.4.10` versus `2.5.6` demonstrates substantially different drawings of the same short spelling.
- Unsupported Old Madina character symbols are visible for the four abstentions; warping their union is not permission to emit labels.
- `33.39.8`, `6.59.16` and `7.197.7` have uneven ligature-stroke fit. The coloured mask view exposes overlap, fragments and missing portions.
- `6.59.15` and `9.30.10` retain thin-stroke/long-stretch errors. Old Madina is often closer before warping, but is not drawing-exact under stock shaping.

Images: [01](../contact/w1_compare50_01.png), [02](../contact/w1_compare50_02.png), [03](../contact/w1_compare50_03.png), [04](../contact/w1_compare50_04.png), [05](../contact/w1_compare50_05.png), [stacked masks](../contact/w1_stacked_masks.png). The exact seeded 50 IDs are in `w1_metrics.json`.

## Reproduction, validation and cost

From repository root: `bash scripts/letter-masks/research/w1_reproduce.sh`. Then `tmp/letter-positions/.venv-w2/bin/python scripts/letter-masks/research/w1_test.py`.

New runs: **190 registrations each**, 34.86s and 37.01s, excluding installation and shared crop-cache preparation. Both prediction JSON SHA-256 checks matched between new runs. Five tests pass: repeatable masks/union, explicitly unassigned clusters, missing-character detection, true composed multi-unit cluster rejection, identity registration on tightly cropped ink. New results match the retained earlier aggregate values; this is not evidence of recovered original bytes.

Next: retain OFL fonts for synthetic initialization, collect actual 2-D stack/ligature labels, and test topology-preserving/semantically anchored registration and justification alternatives. Stop at checkpoint 1; do not turn high image overlap into high confidence or scale into production.

## Top 100 demonstration

The rebuilt runner selects one representative from the largest eligible family per spelling, preserving family IDs and rank. It excludes 32 historical missing-body IDs **and all 125 existing approvals**, as directed during rebuilding. This latter exclusion can change representatives from the early source history. Each run re-extracts selected page crops from source rather than trusting unchecked pickle caches; runtime is kept outside prediction JSON. No family-wide correctness or production coverage is implied. Completed new top100 run results are recorded below.

New top100 results: **100/100 emitted, all low**, with zero approved-ID overlap, zero withheld-ID overlap, and zero structural errors. Fresh-source runs took **45.42s** and **42.08s**; the entire prediction JSON matched SHA-256 between runs. The additional approval exclusion happened not to change these selected representatives compared with the earlier retained selection rule. These are unapproved review proposals, not measured correctness on new words.

`w1_validation.json` records all three newly generated prediction checksums and validated counts. Run `tmp/letter-positions/.venv-w2/bin/python scripts/letter-masks/research/w1_validate.py` to repeat artifact checks against fresh source geometry and app IDs. The top100 command is `OPENBLAS_NUM_THREADS=1 OMP_NUM_THREADS=1 tmp/letter-positions/.venv-w2/bin/python scripts/letter-masks/research/w1_top100.py` after the setup/development command. It requires the pinned visual-reference extraction supplied by the checkpoint coordinator.

# Checkpoint 1: research verdicts

Date: 9 November 2026. **Checkpoint 1 only. Stop here for the owner's decision.**

## Decision

No tested method meets the 95% placement target. **Do not scale a trusted automatic output yet.** W2 is useful for letter-centre proposals; W1 provides genuine transported glyph masks and synthetic training inputs; their agreement is a candidate for a small owner-reviewed trial, not a reliable `high` label. W3 is not competitive in this bounded experiment.

The next useful investment is genuine 2-D supervision on stacked/ligature examples and a fresh owner-approved batch, with 15% frozen before any retraining. Preserve the current 100-spelling review queue; do not generate the top 1,000 or train the full recognizer until instructed to continue. Confidence assessments: practicality **78/100** for the next research stage, architecture/data safety **97/100**, visual certainty **45/100** for automatic letter ownership. These are judgments, not statistical accuracy.

## Provenance and reconstruction

Source branch `claude/criterion-bar` was read at **1166bedebe53c710607dee23647f2f479a5ed732**. Work is only on `codex/letter-positions-research`. Historical visual pilot is pinned to **8d58d3ec37a89012ed641687b0ac34a4e84ffc19**, read without merging.

The first unpublished checkpoint workspace became unavailable. Its local commit `e5e51a78d021b75118a1be1f6beec96122973fc5` and original large outputs were not recovered. Source was reconstructed from retained implementation history; experiments were executed again. W2 regenerated prediction/tensor hashes and W3 regenerated weight hashes match retained historical hashes. W1 original file equality was not established. Two fresh prototype runs match each other. A later workspace loss was recovered from a newly saved archive whose 95 files were individually SHA-256 verified; that archive contained **reconstructed outputs**, not the missing originals. Current reports and regenerated integration outputs are explicit about this distinction.

## What was actually tried

- **W1:** stock HarfBuzz/FreeType per-unit glyph masks from OFL Old Madina and Amiri; true non-rigid 2-D TV-L1 flow; masks carried through the same warp; supports derived from lower ink. Old Madina union-ink IoU rises .2954→.8785, Amiri .2353→.8587. This does not establish letter ownership: local folds and rearrangements can improve outline overlap while assigning ink wrongly. Fifty development comparisons and stacked masks were actually reviewed. Old Madina has four missing-glyph abstentions. Hafs was not used because modification rights were unclear; justification-aware DigitalKhatt shaping was researched, not executed. See [W1 report](W1_REPORT.md).
- **W2:** a real 108,213-parameter CRNN/CTC recognizer, 40 training lines, six separate text-validation lines, 180 epochs. All 8,820 text lines were inventoried, not all trained. Training CER 0%; separate text-validation CER 28.39%. Forced alignment maps raw Unicode positions/marks to unchanged app target intervals, including 11 silent targets. Its midpoint supports remain a vertical partition. All geometry-evaluated words are on training lines; regular30 is not independent geometry test data. See [W2 report](W2_REPORT.md).
- **W3:** three tiny U-Net fits: weak-span geometry, weak-span sequence-conditioned, and OFL synthetic sequence-conditioned. 65 development words train; regular30 validates. Six fits in duplicate experiments reproduce the same artifacts. Weak historical spans are not actual ownership masks; synthetic glyph truth has a domain gap. Bounded affine/slant/noise augmentation was tried, not a full stroke-width/internal-kashida study. W1/W2 endpoint agreement found 10/91 pairs, but zero pseudo-label words were trained because agreement does not establish 2-D labels. See [W3 report](W3_REPORT.md).
- **W4:** independently combine full support intervals only on prediction-agreement subsets. Ordinary thresholds are centres within 2 display px and endpoints within 4; stricter thresholds are 1/2. Arithmetic-mean supports score 105/114 = 92.11% for Old Madina+CTC (31 words), and 115/127 = 90.55% for Amiri+CTC (32 words). Tight subsets have 15/15 letters in six words and 9/9 in four words: too small, exposed, correlated, and selected to certify 95%. Whole-word Wilson bounds are recorded; all remain low. See [agreement audit](agreement.json).
- **W5:** primary-source/licence survey covers QUL/Tarteel, QCF, DigitalKhatt, Arabic segmentation/alignment research, Kraken, Calamari, PaddleOCR and TrOCR. No reusable verified per-letter mask set for this 1405 artwork was found. QUL/layout and QCF word-contour information do not solve semantic letter ownership; unresolved/restrictive assets were not imported. See [existing work](EXISTING_WORK.md).

## Comparable measurements

These are the **historic vertical-span proxy**, not the requested true 2-D ink-ownership ground truth. Full support is shrunk to central 40% once. Two-pixel tolerance uses the legacy display scale 473.6/1920. The 95 development words contain 389 app targets. All 125 historical approvals are exposed; old exposed30 is not scored. Fresh heldout: **0 words**.

| Method | Emitted words | Development bar containment | Abstentions as misses | Regular30 bar containment | Development centre inside | Borders within 2px | Stacked-risk bars |
|---|---:|---:|---:|---:|---:|---:|---:|
| first-guess-reference | 95/95 | 300/389 (77.12%) | 77.12% | 92.00% | 88.17% | 64.97% | 30/39 (76.92%) |
| method-A-reference | 95/95 | 328/389 (84.32%) | 84.32% | 94.00% | 92.03% | 76.19% | 33/39 (84.62%) |
| W1-oldmadina | 91/95 | 293/376 (77.93%) | 75.32% | 84.95% | 88.56% | N/A | 34/39 (87.18%) |
| W1-Amiri | 95/95 | 308/389 (79.18%) | 79.18% | 87.00% | 91.52% | N/A | 29/39 (74.36%) |
| W2-CTC | 95/95 | 328/389 (84.32%) | 84.32% | 90.00% | 97.94% | 70.75% | 33/39 (84.62%) |
| W3-geometry | 95/95 | 138/389 (35.48%) | 35.48% | 47.00% | 69.92% | N/A | 16/39 (41.03%) |
| W3-sequence | 95/95 | 202/389 (51.93%) | 51.93% | 53.00% | 78.41% | N/A | 21/39 (53.85%) |
| W3-synthetic-sequence | 95/95 | 185/389 (47.56%) | 47.56% | 50.00% | 74.55% | N/A | 21/39 (53.85%) |

All generated predictions are low confidence. Medium/high have zero outputs, so no accuracy estimate. First-guess/Method-A rows are rerun historical baselines, not newly invented methods. W1/W3 have independent possibly overlapping supports, so vertical-border measures are N/A. Stacked-risk is 13 words/39 targets selected by a predeclared spelling heuristic, not per-instance annotated stacking. Counts, centre/border metrics, whole-word results, per-confidence, stacked/nonstacked and all three splits are in [checkpoint_metrics.json](checkpoint_metrics.json). **High coverage is 0/77,433 = 0%.**

## Review deliverable and actual images

Top 100 spellings cover 22,648 artwork occurrences (29.25% of 77,433), in 6,068 strict historical shape families. Export contains **22,577 low-confidence proposals** after excluding 39 already approved pilot words and 32 missing-body words. Only **100 are newly inferred 2-D representatives**. The other **22,477 are clearly marked historical-reference suggestions**, downgraded to low; they are not new 2-D predictions. No new representative is propagated blindly to its family.

- [Complete owner review queue](../review/proposals-001.json), [100 newly warped representatives](../review/proposals-001-new2d.json), [family membership](../review/families-001.json).
- [Random sheet 1](../contact/research-random-01.png) through [sheet 10](../contact/research-random-10.png): exactly 200 words drawn with seed 20261108 from the unapproved top100 pilot population (including withheld IDs in the sampling universe; none selected in this draw). This is a pilot sample, not a random sample of the entire Mushaf.
- [New 2-D sheet 1](../contact/research-new2d-01.png) through [sheet 5](../contact/research-new2d-05.png): all 100 new representatives, viewed.
- [W1 stacked masks](../contact/w1_stacked_masks.png), [W2 stacked alignment](../contact/w2_ctc_stacked.png), [W3 stacked masks](../contact/w3-sequence-stacked-masks.png).

All 15 coordinator sheets were opened, and hashes/word IDs plus observations are saved in [visual_review.json](visual_review.json). Workstream reports record their separate actual comparison/mask views. Visual review found readable crops/labels and the expected narrow, shifted and overlapping support problems, especially on stacks and kashida. It is neither owner approval nor a quantitative ink-ownership evaluation.

## Scope exception: existing public maps preserved

The owner explicitly required preserving all existing public guess maps. The 605 files under `public/letter-borders-guess/`, containing 77,308 legacy guesses, therefore remain byte-identical to the source baseline. **No new predictions were installed into the app.** The research-only [validated-guesses/](validated-guesses/) export contains zero trusted words, and [export_status.json](export_status.json) says `installed: false`.

This deliberately does not fulfill the original instruction to replace the app-facing guess output with passing-only words: doing so would clear existing guesses. It is a disclosed compatibility boundary, resolved by retaining the existing maps and staging research output separately. Existing legacy guesses must not be mistaken for validated results from this research.

## Validation and reproducibility

Shared schema checks reject wrong IDs/pages, target order, escaped/nonfinite/empty bars and invalid cuts before accuracy counting; abstained/invalid requested words stay in denominators. Frozen historical-file allowlist prevents accidental future-heldout loading. Caches bind code, source geometry, app targets, approval snapshots and crops. Independent verification re-dumps app units, checks every exported word/family/target, exact contact hashes and protected paths.

`split_batch.py` is prepared for the next owner-approved batch only. It freezes ceil(15%) of numeric-sorted word IDs with seed 20261108, rejects historical/previously split IDs, requires explicit approved status, writes exclusively, and preserves provided geometry. Six fixture tests pass. No new batch or fresh heldout file was invented. Word-random splitting can share drawing families; it is not a family-heldout test.

Run `bash scripts/letter-masks/research/reproduce.sh` for all bounded experiments and integration; `--reuse-results` skips training. The reuse command passed end-to-end. The full command also passed end-to-end, including a third fresh training run and all scoped checks. Node 22.18 validation passed: 497 tests, 1 optional skip, 0 failures; production build passed with the existing >500 kB chunk warning. See [end_to_end_validation.json](end_to_end_validation.json) and [logs](test-logs/). Full app/UI source is unchanged, so no new browser/device or hosted acceptance is claimed.

## Cost, failures and next questions

Counts here cover the rebuild, not unknown costs of lost earlier attempts. Prototype duplicate runs: W1 two passes over 190 word-font cases and two passes over 100 representatives; W2 two 180-epoch fits = 14,400 line updates; W3 six model fits = 3,240 updates plus 570 synthetic rendering attempts (558 accepted, including the readiness audit). A third end-to-end run passed: another 190 W1 word-font cases plus 100 representatives, 7,200 CTC line updates and 1,620 W3 updates/190 synthetic renders. The rebuild total is therefore three 190-case W1 passes plus three 100-representative passes, 21,600 CTC updates, nine W3 fits/4,860 updates, and 760 synthetic render attempts (744 accepted). Additional renderer regression probes are not included in these training/render counts. Initial duplicate training durations were W2 404.44s + 396.82s, W3 72.04s + 42.76s + 96.66s + 49.38s; W1 34.86s + 37.01s, top100 45.42s + 42.08s, excluding setup/cache extraction. Zero paid OCR/inference APIs and no GPU used. Token/dollar cost was not available; no estimate is invented. Final integrated run timers: W1 37.82s, top100 41.51s, CTC 407.05s, W3 weak pair 116.56s and synthetic 62.71s. Prediction hashes match the earlier new duplicate runs; all 15 W3 artifacts also match after excluding only elapsed seconds from training histories. Source survey, downloads, cache extraction, visual review and publication are additional work not included in training timers.

Failures: original workspace/commit loss; missing terminal GitHub credentials; interrupted original artifact upload; second workspace loss recovered from the rebuilt archive; high union overlap without reliable ownership; CTC overfit/text generalization gap; weak/synthetic U-Net attribution failure; no genuinely fresh test. Publication uses verified incremental branch commits and a persistent reconstructed-artifact archive instead of assuming uncommitted workspace durability.

Before any continuation, decide with the owner:
1. Approve/correct the pilot in the review grid and collect true stacked/ligature 2-D ownership examples.
2. Keep 15% of each new batch untouched before retraining; consider an additional family-disjoint evaluation for stronger generalization evidence.
3. Compare topology-preserving/semantically anchored W1 and CTC centre proposals on those labels before committing to full-corpus training.
4. If results eventually pass, obtain a separate instruction for installing a new public guess set and changing app rendering to overlapping bars. Neither is done here.

**No Checkpoint 2, top1,000 generation, main push, merge or deployment was performed.**

## Final validation boundary

The only repository workflow is deployment-oriented and triggers on `main` and a different named branch, not this research branch. No hosted deployment or fresh browser/device acceptance is claimed. The final publication must be verified against the staged Git tree; a local file or an uploaded orphan blob alone is not a published checkpoint.

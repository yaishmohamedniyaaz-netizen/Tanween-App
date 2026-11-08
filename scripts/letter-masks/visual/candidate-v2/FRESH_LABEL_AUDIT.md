# Fresh-label inventory and confidence policy

Recorded 2026-11-08T14:32:43.020555+00:00 by `cloud041_055-fresh-label-audit`. Scope: IDs, page numbers, top-level/entry keys and status-field presence in public approvals; membership in existing training/test manifests and historical review records; saved Checkpoint A aggregate metrics. No unseen approval coordinates were selected, printed, compared, or rendered. JSON records were parsed only to extract permitted metadata; `x` values were not inspected. This report is the only repository write by this audit. No annotation, approved label, frozen prediction, historical file, or evaluator was changed or run.

## Fresh approved holdout: none available

`public/letter-borders/` contains **125 distinct approved word IDs across 22 pages**. Its 125 entries have only the keys `tids` and `x`; none has a per-word `status` field. “Approved” here identifies the existing approved-border directory, not a newly inferred status or a fresh owner approval.

| Inventory | Words |
|---|---:|
| Public approved IDs | 125 |
| Existing training manifest | 95 |
| Existing training review-log IDs | 95 |
| Opened Checkpoint A test IDs | 30 |
| Training/test overlap | 0 |
| Approved IDs in training | 95 |
| Approved IDs in opened test | 30 |
| Approved IDs outside both sets | **0** |
| Training or test IDs absent from public approvals | 0 |
| Approved IDs with no recorded training/test exposure | **0** |

The public approved set equals the disjoint union of the 95 training IDs and 30 opened test IDs. The training review log matches all 95 training manifest IDs exactly. Additional historical visual audit records cover 60 approved IDs: 30 training IDs and all 30 test IDs. Counts of audit records or files are not counts of independent labels: the same word may appear repeatedly. Training exposure alone already disqualifies the other 65 labels from being an untouched holdout. The opened 30 test answers now provide diagnostic examples only; they cannot support a new unbiased generalization claim after candidate development uses their findings.

This set equality is sufficient to conclude that **no defensible fresh approved holdout exists in the current checkout**. It does not assert that no labels exist outside this repository, and it does not treat missing audit events as proof of nonexposure.

### Page inventory (metadata only)

| Page | Approved | Training | Opened test | Outside both |
|---:|---:|---:|---:|---:|
| 1 | 29 | 29 | 0 | 0 |
| 2 | 36 | 36 | 0 | 0 |
| 30 | 3 | 3 | 0 | 0 |
| 52 | 3 | 0 | 3 | 0 |
| 72 | 3 | 3 | 0 | 0 |
| 103 | 3 | 0 | 3 | 0 |
| 134 | 3 | 3 | 0 | 0 |
| 157 | 3 | 0 | 3 | 0 |
| 176 | 3 | 3 | 0 | 0 |
| 177 | 3 | 0 | 3 | 0 |
| 191 | 3 | 3 | 0 | 0 |
| 277 | 3 | 0 | 3 | 0 |
| 307 | 3 | 3 | 0 | 0 |
| 317 | 3 | 0 | 3 | 0 |
| 323 | 3 | 3 | 0 | 0 |
| 348 | 3 | 0 | 3 | 0 |
| 423 | 3 | 3 | 0 | 0 |
| 436 | 3 | 0 | 3 | 0 |
| 470 | 3 | 3 | 0 | 0 |
| 492 | 3 | 0 | 3 | 0 |
| 500 | 3 | 3 | 0 | 0 |
| 580 | 3 | 0 | 3 | 0 |

## Implications for candidate-v2 evaluation

Continue improvement using the existing 95 training labels and the opened 30 as explicitly exposed diagnostic material. Any later comparison on those 30 is a diagnostic regression comparison, not a new blind score. Preserve the original frozen predictions and one-run Checkpoint A results unchanged; do not rerun or bypass its guarded evaluator for candidate experimentation.

For a defensible new evaluation, obtain new owner-approved reference labels for IDs selected before examining their target coordinates. Keep the reference coordinates and rendered approval overlays separate from candidate work, freeze candidate predictions before opening them, and specify the selection rule, metrics and tolerances in advance. To support a claim about new spellings or layouts, keep the relevant spelling/shape families or pages out of tuning as well; randomly splitting near-duplicate carried words would support a narrower claim. Existing unlabeled or unreviewed words are possible inputs for such future annotation, but they are not approved reference labels today. No fresh split was invented or reserved by this audit.

## What the saved confidence results show

Source: `checkpoint-a-summary.json` (already opened Checkpoint A results). Inner-border accuracy uses the saved display-pixel tolerance; whole-word tolerance includes endpoints. Short-bar containment is a separate target, not a synonym for border accuracy.

| Frozen category | Words | Inner borders | Borders within 2px | Borders over 5px | Whole words within 2px | Short bars contained |
|---|---:|---:|---:|---:|---:|---:|
| High | 16 | 36 | 63.9% (23/36) | 25.0% (9/36) | 37.5% (6/16) | 86.5% (45/52) |
| Medium | 2 | 10 | 80.0% (8/10) | 0% (0/10) | 50.0% (1/2) | 83.3% (10/12) |
| Low | 12 | 44 | 63.6% (28/44) | 11.4% (5/44) | 16.7% (2/12) | 82.1% (46/56) |
| All | 30 | 90 | 65.6% (59/90) | 15.6% (14/90) | 30.0% (9/30) | 84.2% (101/120) |

The “high” category does not establish 95% correctness under any of the reported measures. Its border-within-2px rate is almost the same as “low”, and its fraction of large border errors is higher. Its better whole-word and short-bar values are descriptive observations on this small, selected, now-opened set, not evidence of a calibrated probability. The medium category has only two words and cannot establish a reliable ordering. Borders within one word are related observations; 90 borders should not be presented as 90 independent word-level trials.

## Honest qualitative policy for new work

Preserve historical category labels and metrics as recorded. For candidate-v2, describe confidence as **visual assessment with explicit reasons**, not a predicted percentage or an owner-approval substitute:

- **Visually clear:** all target bodies are present; representative original and shaded spans have been reviewed; each carried occurrence has its own image review; body ownership and joins are visually unambiguous. This means strong visual support, not “95% correct”.
- **Ambiguous:** a join, stacked stroke, overlapping return, or ownership choice admits more than one plausible cut. Record the specific target/border and the ambiguity; use low confidence pending review. Agreement between repeated copies does not remove a shared interpretation error.
- **Clipped:** own body or associated-mark ink visibly crosses the immutable box. Keep borders inside and flag clipping with low confidence. A shaded ink endpoint alone is not proof of clipping; compare actual box context. Distinguish a tiny antialiased mark-edge loss from a missing body in the note.
- **Withheld:** a required target body is entirely absent or no valid noninvented span can be drawn inside the immutable box. Keep the exception outside accepted-decision totals, with actual-view evidence.

Keep geometry validity, visual ambiguity, source/review provenance, and owner approval as separate facts. Passing N+1/span/box checks proves structural safety, not visual correctness. Confidence should not automatically propagate from a representative to its carries, and a low flag should not be removed merely because a mechanical check passed. If existing high/medium/low fields must be retained, explicitly call them uncalibrated review labels and avoid numeric reliability claims; apply the ambiguous/clipped/withheld rules above conservatively. Reserve any future “at least 95% correct” statement for a clearly defined metric on a genuinely fresh evaluation set, with uncertainty and its selection scope reported.

## Evidence and unchanged boundaries

Metadata sources: `public/letter-borders/index.json`, its 22 page JSON files, `visual/training/manifest.json`, `visual/training/review-log.json`, `visual/blind/test-ids.json`, and existing `visual/audit/*.jsonl`. Metrics source: `visual/checkpoint-a-summary.json`; the already-opened `checkpoint-a-test.json` was also read, but no new approvals were exposed. No approval image was opened or rendered during this audit.

The frozen prediction SHA256 was checked and remains `766e716327f6ee1b0e2823ad8786b5b2181954b27c3939aa5aaa0954b969e046`. Checkpoint A stays an immutable historical result; this report authorizes no B/C expansion, publication, main-branch mutation, or deployment. No new annotation is claimed. Confidence in the zero-fresh-label count is high because the complete ID sets reconcile exactly; confidence in any new numeric reliability claim is presently unsupported.

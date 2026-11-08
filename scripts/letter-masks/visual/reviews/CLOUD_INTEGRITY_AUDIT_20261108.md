# Cloud integrity audit — 2026-11-08

Report saved at **2026-11-08T11:45:34Z** by `cloud041_055` after a read-only cross-rank audit. The exact start/end of the audit commands was not captured. This is the snapshot observed immediately before this report, not a final Checkpoint A result: other agents were appending annotations and audits concurrently, so the file reads were not an atomic repository snapshot. No scoring or hidden-answer inspection occurred. A final rerun is pending after all ranks finish.

## Snapshot counts

- 20,664 annotations, all unique: 6,195 `visual` and 14,469 `visual-copy`.
- 85 ranks had complete assignment coverage when their documented withheld exceptions were counted separately.
- 27 withheld exceptions were recorded in the examined rank directories. These are not accepted decisions.
- Existing partial annotation files: rank023 had 199 unresolved assignments; rank052 had 81. Ranks without an annotation file were not included in the 85 complete ranks or that partial-file list.
- Complete ranks: 001–022, 026–051, 056–068, 071–092, 095–096.

## Checks and findings

No defects were found in the examined annotations for exact app-target N+1 border count, descending borders with every span at least 2 pixels, containment in the immutable word body using ceiling/floor bounds, supported source values, duplicate IDs within or across ranks, assignment to the correct spelling rank, overlap with withheld decisions, or overlap with frozen test IDs.

The frozen prediction file `scripts/letter-masks/visual/blind/decisions.jsonl` retained SHA256:

`766e716327f6ee1b0e2823ad8786b5b2181954b27c3939aa5aaa0954b969e046`

All accepted words had a shaded-check or carried-word review record. Every accepted cluster representative had original-image review coverage. Image-hash checks verified 2,094 cloud image events and 739 historical image events. All new cloud events examined had observer, image path, word IDs, phase or stage, and SHA256. Reused-evidence events had an earlier matching valid viewed-image hash. This establishes record coverage and byte integrity; it does not independently certify the visual correctness of another observer's judgments.

## Historical caveats preserved

One historical hash mismatch remains: the old rank005 event at `2026-11-07T03:49:50.729326+00:00` for `reviews/rank005/representatives-original-013.png`. Its recorded historical SHA differs from the current image. Historical bytes were not recovered or silently repaired.

Fresh `cloud-root-20261108` original and check events cover the six affected words: `48.23.10`, `1.1.1`, `2.195.3`, `2.244.3`, `3.167.9`, and `4.82.8`. Their current image hashes match their fresh records:

- Original: `364caf3ed8db7ae0f51b4c51186fa25f310962f18d65ac49cf5a5e63ef04fa37`.
- Shaded check: `89bcb722f8f78dd2153410ff06133455b375b7fcfc66706c52085087f4a88672`.

There are 163 older viewed-image events without SHA256: rank003 48, rank004 10, rank028 10, rank036 27, rank037 24, rank038 25, rank039 11, and rank040 8. They are historical provenance limitations, not new cloud events. No hashes or observer claims were backfilled.

Source/phase interpretation also matters. Forty-four manually corrected carried words use `source: visual` while retaining carried-word image evidence: rank006 3, rank018 3, rank019 20, rank021 2, rank022 5, rank035 1, rank066 4, and rank090 6. They are not missing visual reviews merely because they are no longer labelled `visual-copy`. Rank004 has 662 nonrepresentative `visual` rows covered by the historical `single-target-shaded-check` workflow; its cluster representatives have original-image coverage and every app variant has one target. The audit did not reinterpret those records as separate original-image view events.

## Scope and remaining work

The cross-rank audit changed no annotations, audits, global artifacts, frozen predictions, approved answers, or source/artwork/page data. This report is its sole new deliverable. No evaluator was run. Final completeness, final integrity rerun, and any authorized guarded evaluation remain with the root agent. Historical limitations above must remain visible in subsequent reports.

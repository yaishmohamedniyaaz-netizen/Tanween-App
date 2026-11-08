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


## Final independent audit — all 100 ranks

**GO for the root agent's one guarded evaluation, provided its existing complete-pilot gate also passes.** The independent integrity audit found no unresolved pilot assignments, geometry defects, missing required review coverage, missing reviewed-image files, new cloud hash mismatch, or frozen-test assignment contamination. This is an integrity clearance, not an evaluation result or a claim that Checkpoint A deliverables are already complete. No evaluator or hidden-answer file was opened or run by this observer.

Observer: `cloud041_055-final-audit`. Final read-only audit began **2026-11-08T12:09:02.885728+00:00** and finished **2026-11-08T12:09:05.451636+00:00**. It examined 321 input files (100 canonical rank annotation files, 100 rank audit files, 100 rank manifests or cluster manifests, 20 pending-owner files, and consolidated decisions). Rank054 metadata reconciliation and the fresh rank039 audit were already present. Input files read before the end-of-run stability check were unchanged when rehashed; consolidated decisions were read afterward and matched every rank decision exactly. This is a checked stable read sequence, not a filesystem transaction. Input-path/hash fingerprint: `ab03acfbcb66c0d6ce9b52eee0d9684ee71219f9f7f0a72a4af54e1a39752c4f`. The final audit command took about 2.6 seconds; investigating legacy formats and provenance beforehand took several minutes. Exact token use is unavailable.

### Complete pilot and canonical records

- **22,639 eligible pilot words across 100 ranks = 22,607 accepted + 32 separately withheld exceptions.** No unresolved words. Withheld exceptions are not accepted decisions.
- Accepted sources: **6,755 visual**, **15,852 visual-copy**.
- Accepted confidence: **5,955 high**, **3,165 medium**, **13,487 low**. These are pilot confidence counts, not test performance metrics.
- Consolidated `decisions.jsonl` contains 22,637 rows: the 22,607 pilot decisions and 30 frozen predictions. All pilot rows match their canonical rank records exactly; no duplicate IDs or accepted/withheld overlap.
- All accepted records have exact app-target **N+1** borders, finite coordinates, strictly descending spans of at least **2 pixels**, and containment between ceiling(left) and floor(right) of immutable word boxes. Pages, spelling ranks, cluster IDs, and source values agree.
- Every rank manifest or cluster list agrees with current canonical word membership, representative membership, target units, pages, and immutable boxes. Forty-three ranks use `clusters.json`, and rank004 uses the older sheet-list `manifest.json`; those formats were interpreted explicitly instead of treating them as missing manifests. Rank004's sheet-list word IDs exactly match eligible assignments.
- No accepted pilot word is one of the 30 frozen test IDs. Their prediction-file SHA256 remains `766e716327f6ee1b0e2823ad8786b5b2181954b27c3939aa5aaa0954b969e046`.

### Review coverage and image integrity

All **6,038 accepted cluster representatives** have original-image review coverage. Every accepted word has shaded-check or carried-word review coverage, and every `visual-copy` has carried-word review coverage. Source labels alone were not substituted for phase evidence: 55 manually refined nonrepresentatives use `visual` with carry evidence, and 662 rank004 nonrepresentatives retain the historical single-target shaded-check workflow.

All **32 withheld words** have actual-view audit coverage, explanations, and at least one matching hashed review record after the fresh rank039 review below. Explicit exception image paths and supplied hashes resolve correctly. No target slot was invented by this audit.

Checked **3,362 image-reference events**: **2,459 cloud hashes match**, **739 historical hashes match**, **163 historical events have no hash**, and **one documented historical rank005 hash mismatches**. There are 3,023 distinct image paths with hash-bearing references. All current cloud image events have observer, path, word IDs, phase/stage, timestamp, and SHA256, with IDs belonging to the correct eligible rank. All 64 reused-evidence events have an earlier matching viewed-image hash. Byte integrity and coverage validate the records; they cannot independently prove another observer's visual judgment.

### Historical caveats, explicitly retained

The 163 missing historical hashes and sole original rank005 mismatch are unchanged from the earlier section. The fresh root rank005 original/check audit provides current matching bytes for its six affected words; it does not recover the old bytes. No old record was silently repaired.

Fourteen legacy manifests retain the earlier `groupsSha256` stamp `dc57f6e59f522502d388588905836065ccff43e7d53c19d7daac9c7d59abc84b`: ranks **001, 005–008, 071–079**. Current groups SHA256 is `90ea4e4e8aa964d20eb2f2c372e468c2b2015aede6b7c9102d26959c0686ac07`. Direct comparisons of their current member sets, representative membership, immutable boxes, pages, and complete target units all pass. These are stale whole-file provenance stamps, not current semantic mismatches; the original stamps remain unchanged. This caveat is nonblocking for geometry/completeness and must remain visible.

### Fresh actual view of the previously unhashed rank039 exception

During this final audit I actually opened `scripts/letter-masks/visual/reviews/rank039/representatives-09.png` with `view_image`. Observer: `cloud041_055-final-audit`; phase: original-inspection; visibly inspected IDs: **7.176.7, 9.74.41, 10.61.28, 10.99.6, 11.61.16, 25.63.5**. Current SHA256: `c42f92ee63a462af54dcf39b8e12f7d1864d37d8ea431702ab772992aa34fb50`. One distinct image was newly viewed by this observer during this final integrity audit; the other cross-rank checks read existing evidence records and hashes, not newly viewed images.

For bottom-right `25.63.5`, the separate initial wasl/alif body is absent; the rightmost visible upright belongs to the lam-alif structure. The withheld status is supported. This is a fresh current-image observation, not a reconstruction of the historical unhashed event. Root appended a canonical audit event using this actual observer and current SHA, with a truthful transcription note, before the final audit run. The old no-SHA event remains preserved.

### Practical confidence and next boundary

Data integrity and immutable-box safety: **high confidence** from exhaustive numeric, membership, coverage, hash, and canonical reconciliation checks. Visual certainty: **high for the directly inspected rank039 absence**, while the remaining full-pilot visual judgments rely on their named observers and recorded evidence; this was not a second visual pass over 22,607 words. Practical readiness: **GO for the existing guarded single evaluation**, with the historical provenance limitations above retained. Root still owns the gate execution, one evaluation, test metrics/worst-image and seeded-contact-sheet deliverables, scoped validation, task-branch commit/push, and stop at Checkpoint A. No annotation, canonical audit, global artifact, source, artwork, approved answer, or frozen prediction was changed by this audit; this appended report is its sole repository write.

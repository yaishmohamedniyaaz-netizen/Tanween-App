# Visual letter borders —Checkpoint A

## Checkpoint A handback —2026-11-08

**Pilot completion passed; visual quality targets failed. Stop for owner review.** All 100 spelling ranks are complete: 22,616 pilot decisions, 32 separately withheld absent-target exceptions, zero unresolved, 22,648 reviewed words (29.25% of 77,433). The rank files contain 22,607 decisions; nine frozen test predictions are also in the pilot. Including 21 frozen non-pilot words, the consolidated file contains 22,637 decisions. Withheld words have no fabricated slot or emitted guess.

The frozen 30 were evaluated exactly once after the full completeness gate and independent numeric/evidence checks passed. The blind prediction file retains SHA256 `766e716327f6ee1b0e2823ad8786b5b2181954b27c3939aa5aaa0954b969e046`. No annotation or frozen prediction changed after evaluation. [Pre-evaluation snapshot](reviews/PRE_EVALUATION_PILOT_SNAPSHOT.json); [Saved evaluation](checkpoint-a-test.json).

| Confidence | Words | Inner borders | Letters | Median error px | Borders ≤2 px | Borders >5 px | Words ≤2 px | Exact words | Short bar contained |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| All | 30 | 90 | 120 | 1.73 | 65.6% | 15.6% | 30.0% | 0.0% | 84.2% |
| high | 16 | 36 | 52 | 1.36 | 63.9% | 25.0% | 37.5% | 0.0% | 86.5% |
| medium | 2 | 10 | 12 | 1.36 | 80.0% | 0.0% | 50.0% | 0.0% | 83.3% |
| low | 12 | 44 | 56 | 1.97 | 63.6% | 11.4% | 16.7% | 0.0% | 82.1% |

Errors use display scale 473.6/1920. Border percentages measure inner borders; word tolerance includes all endpoints. Short bars use the central 40% of each predicted span and must lie entirely inside the approved span. The overall 65.6% border result misses 85%;84.2% short-bar containment misses 95%. High-confidence predictions reach only 63.9% for inner borders and 86.5% for short bars (37.5% whole-word tolerance), so the confidence calibration target also fails. The medium group has only two words. The previous rejected round was 64%/82.5%; this result is only a small numerical improvement and is not evidence for scale-up.

### Ten worst frozen test words

All ten comparisons were actually opened after evaluation. Left is the unchanged frozen prediction; right is the saved approval used by the single evaluation. This is diagnostic evidence, not retuning.

| Word | Confidence | Maximum error px | Comparison image |
|---|---|---:|---|
| 35.13.23 | low | 11.35 | [Open comparison](contact/visual-test-worst-01-35.13.23.png) |
| 76.29.8 | high | 11.10 | [Open comparison](contact/visual-test-worst-02-76.29.8.png) |
| 8.2.13 | high | 8.63 | [Open comparison](contact/visual-test-worst-03-8.2.13.png) |
| 35.12.21 | high | 8.39 | [Open comparison](contact/visual-test-worst-04-35.12.21.png) |
| 16.92.29 | low | 8.14 | [Open comparison](contact/visual-test-worst-05-16.92.29.png) |
| 8.2.11 | high | 7.65 | [Open comparison](contact/visual-test-worst-06-8.2.11.png) |
| 20.83.4 | low | 7.40 | [Open comparison](contact/visual-test-worst-07-20.83.4.png) |
| 35.14.12 | low | 6.66 | [Open comparison](contact/visual-test-worst-08-35.14.12.png) |
| 20.86.8 | high | 6.17 | [Open comparison](contact/visual-test-worst-09-20.86.8.png) |
| 23.97.6 | high | 5.67 | [Open comparison](contact/visual-test-worst-10-23.97.6.png) |

Visual observation: 35.13.23 leaves a very narrow nun span;76.29.8 and 35.12.21 under-allocate connected ya spans;20.86.8 under-allocates the lam connection. These examples show systematic join/body-allocation problems beyond crop clipping. Vertical cuts through stacked or returning strokes remain uncertain. No corrective annotations were made from these opened test answers.

### Seeded pilot sheets

Exactly 200 unique decided pilot words were sampled with `random.Random(20261107).sample(sorted(decided pilot IDs),200)`;32 withheld words are excluded and reported separately. Ten 20-word shaded sheets were generated and actually opened. Their immutable sampled IDs and image SHA256 values are in [the contact manifest](contact/checkpoint-a-manifest.json). Generating an image never created an audit claim; [the separate actual-view audit](audit/checkpoint-a-contact.jsonl) records the later views. These views are not owner approval.

[Sheet 01](contact/visual-pilot-01.png) · [Sheet 02](contact/visual-pilot-02.png) · [Sheet 03](contact/visual-pilot-03.png) · [Sheet 04](contact/visual-pilot-04.png) · [Sheet 05](contact/visual-pilot-05.png) · [Sheet 06](contact/visual-pilot-06.png) · [Sheet 07](contact/visual-pilot-07.png) · [Sheet 08](contact/visual-pilot-08.png) · [Sheet 09](contact/visual-pilot-09.png) · [Sheet 10](contact/visual-pilot-10.png)

### Withheld exceptions —32, excluded from decisions

Each fixed word box lacks an entire target body or retains only a marginal trace/connector. All 32 have actual image review and a matching hashed evidence event. Original records remain preserved; the table links current evidence and the exception record.

| Word | Reason | Evidence | Exception record |
|---|---|---|---|
| 10.85.2 | Original viewed individually: whole alif body is outside immutable box; no honest target span. | [Image](reviews/rank005/missing-cluster-member-original.png) | [Record](reviews/rank005/pending-owner.json) |
| 2.171.4 | Actual original review: wasl mark fragment survives at right edge, but alif target body entirely absent below it. No target slot invented. | [Image](reviews/rank032/representatives-07.png) | [Record](reviews/rank032/pending-owner.json) |
| 21.56.4 | Direct original review shows the alif/wasl target body entirely beyond immutable right crop edge; only a wasl mark fragment remains. No empty target span invented. | [Image](reviews/rank041/representatives-09.png) | [Record](reviews/rank041/pending-owner.json) |
| 22.11.1 | Original 006 actually reviewed: initial alif target body absent from fixed crop; only partial wasla and negligible edge trace, no defensible body slot. Entire word withheld; box immutable. | [Image](reviews/rank094/representatives-check-006.png) | [Record](reviews/rank094/pending-owner.json) |
| 24.43.2 | Immutable right edge omits the alif body; only marginal trace below clipped hamza survives. No useful target body to allocate without inventing a slot. Original representatives-original-008.png actually reviewed. | [Image](reviews/rank079/representatives-check-008.png) | [Record](reviews/rank079/pending-owner.json) |
| 25.63.5 | Exact app target 1 wasl has no visible body inside the immutable word box. The rightmost visible upright belongs to lam in the lam-alif ligature. No invented slot or out-of-box border was created. | [Image](reviews/rank039/representatives-09.png) | [Record](reviews/rank039/pending-owner.json) |
| 27.40.25 | The immutable crop contains mim and small upper marks, but the alif carrier body is entirely outside the right edge. No target slot invented. | [Image](reviews/rank077/representatives-check-006.png) | [Record](reviews/rank077/pending-owner.json) |
| 3.167.9 | Alif body wholly absent from immutable crop; no honest target span can be placed. | [Image](reviews/rank005/representatives-check-013.png) | [Record](reviews/rank005/pending-owner.json) |
| 30.30.19 | Original 007 actually reviewed: initial alif and wasla entirely absent from fixed crop; lam/nun-alif/sin remain. Entire word withheld rather than inventing an alif slot. | [Image](reviews/rank094/representatives-check-007.png) | [Record](reviews/rank094/pending-owner.json) |
| 30.41.5 | Ba upright/head entirely absent beyond immutable right crop; only long joining baseline and meem-alif remain. Do not invent ba slot from connector. | [Image](reviews/rank024/representatives-original-007.png) | [Record](reviews/rank024/pending-owner.json) |
| 33.37.46 | Entire alif body lies outside immutable box; cannot place honest target span. | [Image](reviews/rank005/representatives-check-014.png) | [Record](reviews/rank005/pending-owner.json) |
| 33.38.19 | Entire alif body lies outside immutable box; no honest alif span can be placed. | [Image](reviews/rank005/representatives-check-015.png) | [Record](reviews/rank005/pending-owner.json) |
| 33.71.4 | Actual original and wider red-box context show initial lam upright/head entirely beyond immutable right edge. Only connector/base continues inside; no principal lam body slot invented. | [Image](reviews/rank054/root-33.71.4-context.png) | [Record](reviews/rank054/pending-owner.json) |
| 34.36.10 | Original 007 actually reviewed: initial alif body absent apart from negligible anti-aliased edge trace; partial wasla remains. No defensible full target body slot, entire word withheld within immutable box. | [Image](reviews/rank094/representatives-check-007.png) | [Record](reviews/rank094/pending-owner.json) |
| 35.10.21 | Actual image inspection: initial alif carrier body entirely absent inside immutable box. Only clipped attached marks remain at right edge; no invented carrier slot. | [Image](reviews/rank060/representatives-10.png) | [Record](reviews/rank060/pending-owner.json) |
| 35.11.32 | Entire alif body lies outside immutable box; no honest alif span can be placed. | [Image](reviews/rank005/representatives-check-015.png) | [Record](reviews/rank005/pending-owner.json) |
| 35.3.10 | Entire alif body lies outside immutable box; no honest alif span can be placed. | [Image](reviews/rank005/representatives-check-015.png) | [Record](reviews/rank005/pending-owner.json) |
| 35.39.1 | Direct enlarged original review: alif body absent except a marginal gray edge trace; only clipped wasl mark remains recognizable. No empty span invented. | [Image](reviews/rank032/carry35.39.1-original.png) | [Record](reviews/rank032/pending-owner.json) |
| 37.168.1 | Alif stem body entirely outside immutable right edge; only clipped hamza above nun remains. Original representatives-original-009.png actually reviewed; no fabricated slot. | [Image](reviews/rank079/representatives-check-009.png) | [Record](reviews/rank079/pending-owner.json) |
| 4.5.6 | Actual image inspection: initial alif carrier wholly absent within immutable body. Attached mark alone cannot justify fabricating a carrier span. Owner instructed keep inside box; no valid complete target sequence can be drawn. | [Image](reviews/rank006/representatives-original-013.png) | [Record](reviews/rank006/pending-owner.json) |
| 4.58.21 | Actual image inspection: detached initial alif carrier wholly absent within immutable body. Only merged paired-lam and final ha bodies remain; no invented target slot. | [Image](reviews/rank010/representatives-original-012.png) | [Record](reviews/rank010/pending-owner.json) |
| 4.59.16 | Owner requires borders inside box and clipped-ink flags; the entire alif body is missing so no honest target slot is available. Withheld, not awaiting policy. | [Image](reviews/rank005/representatives-check-012.png) | [Record](reviews/rank005/pending-owner.json) |
| 4.95.27 | Actual image inspection: initial alif carrier wholly absent within immutable body. Attached mark alone cannot justify fabricating a carrier span. Owner instructed keep inside box; no valid complete target sequence can be drawn. | [Image](reviews/rank006/representatives-original-014.png) | [Record](reviews/rank006/pending-owner.json) |
| 40.33.11 | Actual image inspection: initial alif carrier wholly absent within immutable body. Attached mark alone cannot justify fabricating a carrier span. Owner instructed keep inside box; no valid complete target sequence can be drawn. | [Image](reviews/rank006/representatives-original-015.png) | [Record](reviews/rank006/pending-owner.json) |
| 42.42.3 | The wasl-alif body is entirely outside the immutable box; no visually grounded span can be drawn inside it. No guess emitted. | [Image](reviews/rank002/representatives-33.png) | [Record](reviews/rank002/pending-owner.json) |
| 46.20.2 | The wasl-alif body is entirely outside the immutable box; no visually grounded span can be drawn inside it. No guess emitted. | [Image](reviews/rank002/representatives-33.png) | [Record](reviews/rank002/pending-owner.json) |
| 51.52.11 | Actual original and enlarged image show waw plus clipped hamza/vowel fragments, but entire alif body is outside immutable crop. No honest alif body span exists; withheld rather than fabricated. | [Image](reviews/rank022/cloud-check-009.png) | [Record](reviews/rank022/pending-owner.json) |
| 57.10.6 | Entire alif body lies outside immutable box; no honest alif span can be placed. | [Image](reviews/rank005/representatives-check-015.png) | [Record](reviews/rank005/pending-owner.json) |
| 57.5.5 | Entire alif body lies outside immutable box; no honest alif span can be placed. | [Image](reviews/rank005/representatives-check-015.png) | [Record](reviews/rank005/pending-owner.json) |
| 58.7.2 | Alif body absent from immutable right crop apart from tiny marginal trace; clipped hamza above survives. Original representatives-original-009.png actually reviewed; no fabricated slot. | [Image](reviews/rank079/representatives-check-009.png) | [Record](reviews/rank079/pending-owner.json) |
| 61.11.6 | Entire alif body is outside immutable crop; no honest target span. | [Image](reviews/rank005/representatives-check-016.png) | [Record](reviews/rank005/pending-owner.json) |
| 62.11.12 | Entire alif body is outside immutable crop; no honest target span. | [Image](reviews/rank005/representatives-check-016.png) | [Record](reviews/rank005/pending-owner.json) |

### Cost and verification

The handoff baseline had 8,013 total decisions (7,992 pilot),18 withheld, 921 actual-view events and 893 distinct audited paths. This continuation added 14,624 decisions and 14 withheld exceptions. Current cumulative audit counts are 3,320 actual-view events and 3,139 distinct paths; the continuation added 2,399 events and 2,246 additional paths. Repeated image views count as events, not new images. The legacy `auditedImagePaths` counter also includes generated-only records; the actual-view-only distinct-path total above is the review cost. Twenty final contact/comparison images are included. Historical training-view counters remain separately recorded; the actual Linux Arabic smoke image was also opened at setup and RAQM was confirmed.

Approximate cloud wall time: 10:50–12:13 UTC on 2026-11-08, about 84 minutes at report time. Parallel observer durations overlap and are not added as labor time. Historical work began 2026-11-06 across interrupted sessions. Exact tokens and a defensible rough numeric token estimate are unavailable; no invented accounting is reported. See[machine-readable summary](checkpoint-a-summary.json).

- Completeness: 100/100 ranks, zero unresolved, all pilot words reviewed;32 exceptions separately accounted for.
- Scoped Node tests: 10 passed, 0 failed. Exact target N+1, finite coordinates, strictly descending≥2 px spans, immutable-box containment, rank membership, duplicate checks and frozen-test exclusion passed.
- Final builder: 22,577 guess entries;60 decisions already having approved borders omitted. All undecided/withheld words retain no guess entry.
- All new cloud audit hashes, original representative coverage and shaded/carry coverage passed. The independent audit is [CLOUD_INTEGRITY_AUDIT_20261108.md](reviews/CLOUD_INTEGRITY_AUDIT_20261108.md).
- Source, artwork, page data, judging targets, approved borders and blind files are unchanged frome 9 c 81 c 4. Only the authorized task branch is pushed. No main merge, deployment, prototype switch, CheckpointB orC was performed.

Historical provenance caveats remain visible: 163 old view events lack hashes; the old rank 005 original 013 hash still differs, with fresh current original/check reviews covering its six words. Historical bytes were not recovered. Fourteen legacy whole-groups hash stamps are stale, while exact word-box, target-unit and membership comparisons pass. The fresh rank 039 absence review adds current SHA evidence without rewriting its old event. Coverage and hashes validate records, not another observer’s visual judgment.

### Owner style-guide questions and next boundary

1. For a connected medial letter, confirm how much of the baseline connector belongs to it before the following bowl/head. The frozen ya/nun examples above show this boundary remains poorly calibrated.
2. For vertically stacked/returning bodies such as على and لكم, confirm the preferred compromise for a single x-boundary when no vertical split can contain every stroke and keep the short bar under the intended body.
3. Confirm whether minimal antialiased mark-tip crossings should remain clipped-ink/low, or be distinguished from material letter-body clipping. This pilot conservatively flags them; boxes were never expanded.
4. Review the 200-word sheets and 32 withheld cases before authorizing any future revision. If the method is revised, use fresh evaluation data; do not reuse these now-opened 30 answers as a new blind test.

Confidence: practicality 60/100 (workflow completed, but quality and review cost do not justify scale-up);architecture/data safety 95/100 (scoped invariants and freeze passed, with explicit historical provenance limits);visual certainty 55/100 (quality targets and high-confidence calibration failed). **Checkpoint A handback is complete; owner approval remains pending. Do not proceed to B/C or publication.**

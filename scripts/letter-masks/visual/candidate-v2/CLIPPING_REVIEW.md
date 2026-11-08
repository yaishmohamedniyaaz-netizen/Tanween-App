# Candidate v2 clipping and stacking review

Observer: `agent012-candidate-v2-clipping`. Phase: `candidate-original-immutable-context`; detail phase: `candidate-immutable-right-edge-detail`. Recorded after actual image review: 2026-11-08T14:36:38.102107+00:00.

All six original sheets were actually opened with view_image and every one of their 24 words inspected. One additional right-edge detail image was generated under a unique filename and actually opened to resolve four edge contacts. No candidate draft, annotation, canonical audit, workbench, old Checkpoint A evidence, or artwork was changed.

**Clipping classification: 14 none; 10 mark-tip; 0 body-partial; 0 whollyabsent.** All requested target bodies remain visible inside the immutable boxes. Mark-tip means some of the vowel stroke lies outside the box; it does not mean a missing target body. For 11.64.4, 9.95.2 and 23.77.10, enlargement confirms a very small terminal tip crossing. The ain tip in 9.27.6 reaches the edge but no continuation is visible beyond it; classified none.

Stacking uncertainty is distinct from clipping and is not a replacement confidence assignment. High means the bodies overlap in x so vertical cuts cannot cleanly isolate their full two-dimensional shapes; moderate means connected/diagonal joins or a loop make the cut convention important; low means little vertical stacking, though joining stretches still need an explicit convention.

## Actual-view evidence

- Observer `agent012-candidate-v2-clipping`; phase `candidate-original-immutable-context`; path `scripts/letter-masks/visual/candidate-v2/images/original-01.png`; SHA256 `76cb0dbe0f7d90291691d9c17532086f2ce653b428cd8c0db60a5e7a0328798b`; IDs: 13.6.14, 8.11.17, 9.27.6, 42.29.11.
- Observer `agent012-candidate-v2-clipping`; phase `candidate-original-immutable-context`; path `scripts/letter-masks/visual/candidate-v2/images/original-02.png`; SHA256 `08fb20e228027df341c809af5f3d5bbc533a584198d9388638827d79d0eddfa4`; IDs: 20.72.3, 31.17.9, 12.9.6, 12.18.8.
- Observer `agent012-candidate-v2-clipping`; phase `candidate-original-immutable-context`; path `scripts/letter-masks/visual/candidate-v2/images/original-03.png`; SHA256 `99840d579876065cb166b7b35604b668e13fcb0a2f169603d6aa9f9ff2412582`; IDs: 64.17.6, 11.64.4, 8.9.4, 9.95.2.
- Observer `agent012-candidate-v2-clipping`; phase `candidate-original-immutable-context`; path `scripts/letter-masks/visual/candidate-v2/images/original-04.png`; SHA256 `28c4f0972950b0faefd613adcd8be96d2f4237b95b8d6032976d0e102938d9e1`; IDs: 23.77.10, 16.64.9, 24.37.16, 11.116.23.
- Observer `agent012-candidate-v2-clipping`; phase `candidate-original-immutable-context`; path `scripts/letter-masks/visual/candidate-v2/images/original-05.png`; SHA256 `68ac05e8a9ddda2f78dd4aa3767115f525b7a8f41d2e787680f4b3a249b11358`; IDs: 6.139.15, 9.108.15, 53.36.1, 24.13.6.
- Observer `agent012-candidate-v2-clipping`; phase `candidate-original-immutable-context`; path `scripts/letter-masks/visual/candidate-v2/images/original-06.png`; SHA256 `46945682d938487ffb508a842e2eddc5a36746a0652e169add55034d48ead9a8`; IDs: 60.8.5, 24.35.29, 4.102.20, 7.46.14.
- Observer `agent012-candidate-v2-clipping`; phase `candidate-immutable-right-edge-detail`; path `scripts/letter-masks/visual/candidate-v2/images/context-details-agent012-01.png`; SHA256 `0c8aa6ebb12e0ae44f81cb3c0fc5ddb894bddd0665cc9744edaaca47e0426317`; IDs: 9.27.6, 11.64.4, 9.95.2, 23.77.10.

## Per-word findings

| Word | Family / shape | Clipping | Visible evidence | Stacking uncertainty |
|---|---|---|---|---|
| 13.6.14 | rank017 compact | none | No target ink continuation observed outside the box. | High: ain bowl, lam base, and maqsura return overlap in x; three vertical slots require an explicit projection convention. |
| 8.11.17 | rank017 compact | none | No target ink continuation observed outside the box. | High: ain bowl, lam base, and maqsura return overlap in x; three vertical slots require an explicit projection convention. |
| 9.27.6 | rank017 compact | none | Ain tip reaches right edge; enlarged context shows no continuation beyond it. Nearby ink belongs to a neighbor. | High: ain bowl, lam base, and maqsura return overlap in x; three vertical slots require an explicit projection convention. |
| 42.29.11 | rank017 extended | none | No target ink continuation observed outside the box. | High: ain bowl, lam base, and maqsura return overlap in x; three vertical slots require an explicit projection convention. |
| 20.72.3 | rank017 extended | none | No target ink continuation observed outside the box. | High: ain bowl, lam base, and maqsura return overlap in x; three vertical slots require an explicit projection convention. |
| 31.17.9 | rank017 extended | none | No target ink continuation observed outside the box. | High: ain bowl, lam base, and maqsura return overlap in x; three vertical slots require an explicit projection convention. |
| 12.9.6 | rank054 compact | none | No target ink continuation observed outside the box. | Moderate: descending kaf stroke overlaps the lower joining region near mim; lam/kaf and kaf/mim cuts are convention-sensitive. |
| 12.18.8 | rank054 compact | none | No target ink continuation observed outside the box. | Moderate: descending kaf stroke overlaps the lower joining region near mim; lam/kaf and kaf/mim cuts are convention-sensitive. |
| 64.17.6 | rank054 compact | none | No target ink continuation observed outside the box. | Moderate: descending kaf stroke overlaps the lower joining region near mim; lam/kaf and kaf/mim cuts are convention-sensitive. |
| 11.64.4 | rank054 extended | mark-tip | Lam fatha extends beyond immutable right edge; all letter bodies intact. Small final tip verified at 4x source scale. | Moderate: long kaf loop overlaps its baseline in x; isolate the actual mim body and lam stem without assigning the whole connecting run to lam. |
| 8.9.4 | rank054 extended | none | No target ink continuation observed outside the box. | Moderate: long kaf loop overlaps its baseline in x; isolate the actual mim body and lam stem without assigning the whole connecting run to lam. |
| 9.95.2 | rank054 extended | mark-tip | Lam fatha extends beyond immutable right edge; all letter bodies intact. Small final tip verified at 4x source scale. | Moderate: long kaf loop overlaps its baseline in x; isolate the actual mim body and lam stem without assigning the whole connecting run to lam. |
| 23.77.10 | rank082 compact | mark-tip | Fa kasra extends beyond immutable right edge; fa/ya/ha bodies intact. Small final tip verified at 4x source scale. | Low stacking; small ya tooth and the following join can be confused with the fa bowl. Keep ya dots associated with its body. |
| 16.64.9 | rank082 compact | mark-tip | Fa kasra extends beyond immutable right edge; fa/ya/ha bodies intact. | Low stacking; small ya tooth and the following join can be confused with the fa bowl. Keep ya dots associated with its body. |
| 24.37.16 | rank082 compact | mark-tip | Fa kasra extends beyond immutable right edge; fa/ya/ha bodies intact. | Low stacking; small ya tooth and the following join can be confused with the fa bowl. Keep ya dots associated with its body. |
| 11.116.23 | rank082 extended | mark-tip | Fa kasra extends beyond immutable right edge; fa/ya/ha bodies intact. | Low stacking; extended baseline makes fa/ya joining-stretch allocation uncertain unless the convention is fixed. |
| 6.139.15 | rank082 extended | none | No target ink continuation observed outside the box. | Low stacking; extended baseline makes fa/ya joining-stretch allocation uncertain unless the convention is fixed. |
| 9.108.15 | rank082 extended | none | No target ink continuation observed outside the box. | Low stacking; extended baseline makes fa/ya joining-stretch allocation uncertain unless the convention is fixed. |
| 53.36.1 | rank086 compact | mark-tip | Lam fatha extends beyond immutable right edge; all letter bodies intact. | Low stacking; two bodies and their join are visible. Mim loop/tail and lam stem are separable, with joining-stretch convention still relevant. |
| 24.13.6 | rank086 compact | mark-tip | Lam fatha extends beyond immutable right edge; all letter bodies intact. | Low stacking; two bodies and their join are visible. Mim loop/tail and lam stem are separable, with joining-stretch convention still relevant. |
| 60.8.5 | rank086 compact | none | No target ink continuation observed outside the box. | Low stacking; two bodies and their join are visible. Mim loop/tail and lam stem are separable, with joining-stretch convention still relevant. |
| 24.35.29 | rank086 extended | none | No target ink continuation observed outside the box. | Low stacking; two bodies and their join are visible. Mim loop/tail and lam stem are separable, with joining-stretch convention still relevant. |
| 4.102.20 | rank086 extended | mark-tip | Lam fatha extends beyond immutable right edge; all letter bodies intact. | Low stacking; two bodies and their join are visible. Mim loop/tail and lam stem are separable, with joining-stretch convention still relevant. |
| 7.46.14 | rank086 extended | mark-tip | Lam fatha extends beyond immutable right edge; all letter bodies intact. | Low stacking; two bodies and their join are visible. Mim loop/tail and lam stem are separable, with joining-stretch convention still relevant. |

## Limits and next use

These observations support clipping flags and uncertainty notes only; root owns candidate border placement and shaded self-checks. The six rank017 words remain intrinsically uncertain for vertical-span ownership despite having no clipped bodies. The rank054 extended shapes need a consistent loop/baseline convention. The rank082 and rank086 examples present clearer body ordering, but mark clipping remains a separate low-confidence condition where listed.

No approvals or scores were accessed for this review. Seven images were actually viewed (six provided originals and one newly generated detail). Token usage and exclusive elapsed work time are unavailable; no estimates are represented as measurements.

## Corrective addendum: 12.9.6 edge review

Recorded 2026-11-08T14:38:17.406479+00:00 after actual view. The original overview finding for **12.9.6 is corrected from none to mark-tip**. At 10x nearest-neighbor source scale, with guide ticks only above/below the image rather than over the ink, a small gray antialiased terminal pixel of the lam fatha is visibly present at source column x=963. The immutable crop ends at x=963 (exclusive), so that pixel is outside the box. The lam body and all other target bodies remain intact. Retain the clipped-ink flag and low-confidence treatment; no box expansion is proposed.

The previous overview was insufficient to resolve this minimal tip and its no-clip conclusion was mistaken. The earlier text is preserved as the historical review, and this explicit correction supersedes that one row and the initial totals. **Updated totals: 13 none; 11 mark-tip; 0 body-partial; 0 whollyabsent.** Stacking findings are unchanged.

Actual-view evidence: observer `agent012-candidate-v2-clipping`; phase `candidate-corrective-immutable-edge-detail`; path `scripts/letter-masks/visual/candidate-v2/images/context-details-agent012-12.9.6-edge-10x.png`; SHA256 `e8ed10ec03982187b9c1fc6fac6dc56204598a06605e11bb2c26cb56255587df`; word IDs `12.9.6`; source `public/mushaf/1405-artwork-5a5f9f3846158475/p236.png`; immutable body `[837,1478,963,1648]`; displayed source context `[928,1473,973,1533]`. This new image was actually opened with view_image before this finding was written. The guide is offset from the pixels and cannot hide the gray tip.

This addendum modifies the separate review report only. No annotations or canonical audits were changed. Total actual image views for this candidate clipping review are now eight.

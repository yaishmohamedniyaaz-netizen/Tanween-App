# Candidate-v2 implementation review

**Result: PASS for the isolated 24-word candidate package; no blocking code/data defect found.** This is an implementation and integrity review, not an independent visual-quality verdict or evidence of improved generalization. The old 30 opened answers remain diagnostic material only. No scorer was run or blind word reannotated.

Reviewer: `cloud041_055-implementation-review`. Recorded 2026-11-08T14:44:59.578770+00:00. The only repository write by this review is this report. Reviewed workbench SHA256: `9f09f63a546fdd61a707548ca4ca701fbf8ef20c63485b48640bedf1b03396f8`. The current workbench includes the identity/source/provenance guards added during the review; the final checks and tests used that version.

## Preservation and scope

- HEAD remains `0c7a7fa5dba20b46dc120825e6e24b999ad11eee`. `git diff --quiet 0c7a7fa5dba20b46dc120825e6e24b999ad11eee --` passes: no tracked file content or mode differs from the preserved Checkpoint A baseline. At inspection, changes were confined to the new untracked `candidate-v2/` directory. This independently checks the broader historical scope, beyond the workbench's six explicitly frozen files.
- All six `checkpoint-a-preservation.json` hashes and both `candidate-input-freeze.json` hashes match current bytes. Frozen inputs are selection and before-records; every before-record exactly equals the preserved consolidated Checkpoint A row.
- Blind predictions retain SHA256 `766e716327f6ee1b0e2823ad8786b5b2181954b27c3939aa5aaa0954b969e046`. No original annotations, old audit events, approved borders, source/artwork/page data, or old evaluation artifacts changed.
- Candidate output remains local under `candidate-v2/candidate-guesses/`, with method `visual-v2-candidate` and `ownerApproved: false`; nothing was promoted into public guesses or approved labels.

## Selection and frozen metadata

Independently reproduced the saved selection exactly: ranks017,054,082,086 each contribute six words; each rank has compact and extended cluster examples, each with one representative and two members. Total: **24 unique IDs, eight representatives and sixteen members**. The rule uses aspect extremes only to choose examples; it does not calculate border locations. Its description correctly labels the set as targeted owner review, not a random sample or blind holdout.

All24 IDs belong to the completed pilot, and all are disjoint from both the125 public approved IDs and the30 old test IDs. The frozen approved-ID exclusion list matches the current125-ID inventory. Current selected IDs, order, before-record keys and candidate-record keys match exactly. Canonical groups independently confirm spelling rank, cluster membership, page, immutable body box, full ordered target units and target IDs for every word.

## Final decisions, confidence, clipping and exports

- **24 accepted candidate records;20 border arrays changed,4 retained.** Confidence is **19low,5medium,0high**. These remain explicitly uncalibrated qualitative labels.
- Clipping is **11mark-tip,13none-observed,0body-partial,0wholly-absent**. Every non-none clipping record carries `clipped-ink` and low confidence; stacking flags also require low. The separate clipping report's corrective addendum explicitly supersedes its earlier12.9.6 overview and reconciles the total to11mark-tip cases. All eight image/hash references in that report match their bytes. The absence/body assertions here verify the saved reviewed classifications; I did not newly inspect these images in this code-review task.
- Every decision has the exact ordered target count plus one border, integer coordinates, descending spans of at least2pixels, and immutable-box containment. Word ID, page, cluster and `visual` source agree with frozen metadata. Visual rationale and confidence basis are present.
- `draft-final.json`, `candidate-decisions.json`, and all24 JSONL rows agree exactly. The23 exported page files contain exactly those24 words, with matching target IDs, cuts, confidence, source and flags, consistent page/ruleVersion metadata, and no duplicate or extra words. The saved `validation.json` equals the updated validator's current output.

## Evidence bindings and final revisions

The candidate audit has **19view events for19distinct images**: six originals, six before-images, six candidate-v2 shaded sheets, and one candidate-v3 sheet. Every event's provenance fields and current image SHA match. All24 words have original review coverage and before-review coverage whose record digest matches its frozen before-decision.

Every final decision is bound by its full canonical record digest to a `visually-reviewed` shaded-image event: **22words bind to candidate-v2;11.116.23 and6.139.15 bind to candidate-v3-01**. Thus the later fa-side edge restorations are covered by a fresh final-image event and cannot be accepted using only their older v2 images. Full-record digests also bind notes and confidence, so later metadata edits would require corresponding final evidence rather than silently reusing a stale decision digest.

These checks establish path/byte/decision binding and recorded observer coverage. The review does not claim that hashes prove visual quality or that I personally viewed root's19images. Root remains the actual named observer for those events; the separate clipping observer's eight-image evidence remains separately attributed.

## Code review and tests

The helper computes no proposed inner cuts; it selects fixed examples, renders supplied decisions, records explicitly requested view events, validates them, and writes isolated outputs. Exclusive creation (`x`/`xb`) protects existing stage files from accidental overwrites. Acceptance requires frozen inputs, preserved checkpoint hashes, matching image bytes, complete audit provenance, correct decision identity/source, exact geometry, conservative confidence/clipping policy, manual rationales, original review and matching final shaded-decision evidence.

Ran the ten candidate gate regression tests against the final reviewed workbench: **10passed,0failed**. They cover missing original reviews, stale shaded evidence after a border edit, missing v3 evidence, image hash tampering, box escapes, invalid spans, uncalibrated high confidence, false identity and checkpoint-freeze changes. Also ran independent metadata, selection, geometry, export and digest reconciliation outside the helper; all passed. No scorer or renderer was invoked by this review. Root's separate Node-test results were not rerun or claimed as this observer's tests.

## Limits and nonblocking hardening notes

No blocking current-data defect remains. The workbench preservation guard covers six named checkpoint files, rather than all baseline-tracked files; the independent baseline diff above supplies the stronger whole-checkout check for this package. Repeat that broader diff before future accept/commit operations, or extend the guard if the helper becomes a reusable workflow. Likewise the fixed selection excludes the current approved inventory, which presently includes all30old tests; if later test IDs exist outside that inventory, exclude them explicitly too. Current24-word disjointness was checked independently.

The comparison packet root is preparing is downstream presentation work and was not part of this final-export review. This report clears the reviewed candidate records and their existing evidence for an owner-review handoff. It does not clear any later changed decision or claim a fresh accuracy score, approval to expand to B/C, publication, main mutation, or deployment. Data-safety confidence is high; visual-quality improvement remains for owner review.

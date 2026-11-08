# Cloud visual continuation: ranks 008–011

Observer: `cloud-ranks008_011`. The prior rank008 120 accepted representatives were preserved. This report supersedes only the rank008–011 pending counts in `RESUME-007-025.md`; historical events and evidence remain intact.

| Rank | Accepted | Withheld | New accepted in this continuation | Unique images actually opened |
|---|---:|---:|---:|---:|
|008|609|0|489|65|
|009|604|0|604|60|
|010|564|1|564|53|
|011|562|0|562|79|
|Total|2339|1|2219|257|

All remaining representative originals, rendered shaded decisions, and every carried destination were actually opened and checked. Audits in `audit/rank008.jsonl` through `rank011.jsonl` record observer, path, word IDs, phase/stage, UTC time, and SHA256. Acceptance records sometimes repeat an already viewed image; 329 audit events represent 257 unique images, not 329 unique views. Image tooling does not expose token totals; none are estimated. The audit window was 2026-11-08 10:51:12–11:33:41 UTC, approximately 42.5 minutes, excluding earlier setup and this final validation/report.

## Withheld exception

Rank010 word **4.58.21**, cluster `s00010-c0067`, page87: the detached initial alif carrier is wholly absent inside the immutable crop. No target slot was invented. See `rank010/pending-owner.json` and the actually opened `rank010/representatives-original-012.png` (SHA256 `6e4e0367940b5546f8349f7a4a2fb12a890a9bf6ebcfab188fdcf951b3f1aa64`). This is separate from the accepted count and remains for owner review.

## Visual corrections and limitations

Rank008 received four carried-boundary refinements after enlarged original and shaded review. Rank009 compact words **20.94.5** and **47.33.7** needed individually refined cuts and remain low confidence because body projections overlap and crop clipping limits certainty. Rank010 received eight individually reviewed lam/ha refinements, including representative **40.20.11**. Rank010 **22.37.2** and **33.21.15** needed corrected outer endpoints to retain visible alif ink omitted by the initial endpoint helper; all corrected endpoints remain inside the original immutable word boxes. Rank011 **36.69.8** received a corrected division after the first shaded check intersected the upper alif stem. The initial and refined images and superseded decisions remain preserved.

Each carried destination was assigned confidence from its own image. Visible clipped marginal bodies or marks are low confidence with `clipped-ink`; fully visible examples with clear divisions are high confidence. Large numbers of low-confidence words reflect actual crop limitations, not unchecked transfer. Partial visible alif fragments were retained and flagged rather than withheld as wholly absent.

## Validation and handback

PASS for all four canonical annotation files: unique IDs; exact app target count +1; integer, descending coordinates with spans >=2px; endpoints within ceil/floor immutable body limits; no blind test IDs. All audit image SHA256 values written by this observer match the current files. Frozen `blind/decisions.jsonl` SHA256 remains `766e716327f6ee1b0e2823ad8786b5b2181954b27c3939aa5aaa0954b969e046`.

Scoped tests passed **10/10**: `node --experimental-strip-types --test scripts/letter-borders.test.mjs scripts/border-queue.test.mjs`.

No hidden answers or evaluator were accessed. No commit, push, deploy, or global build was performed by this delegate. No denied or uncertain actions remain. Data-safety confidence is high from scope and integrity checks; geometric validity is high; visual certainty remains deliberately low for clipped/overlapping cases. Practicality is demonstrated for these four high-frequency spellings, with 257 unique image reviews required for 2,219 new accepted decisions. Global completeness, frozen-test evaluation, metrics, contact sheets, and Checkpoint A handback remain the parent agent's responsibility. Do not interpret completion of these four ranks as completion of Checkpoint A.

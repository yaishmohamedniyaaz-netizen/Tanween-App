# Phase 0 validation

Date: 9 November 2026. Base: `5d08cfa3028dc711852c6f1aaa9082f4ed5e5972`
(`claude/criterion-bar`). Work branch: `codex/digitalkhatt-pages`.

## Passed

- All 604 pages audited, 77,433 app words and 848,524 PDF glyph shows checked.
- 14 focused Python tests, including actual-PDF samples 1, 2, 3, 50, 187, 293,
  582, 600 and 604, plus the embedded basmala on page 379.
- A separate complete 604-page rerun produced byte-identical `parity.json`,
  `PARITY.md` and `PARITY_DETAILS.md`. Measured rerun time: **57.668 seconds**.
- Node 22.18.0: `npm test` had **497 passes, 0 failures, 1 explicit skip** out of
  498 tests. The skip is the existing optional local Tilawa-release-assets test.
- `npx --no-install tsc -b` passed.
- `npm run build` passed. Existing large-chunk notices and an npm proxy-config
  deprecation warning remain; neither was a failure.
- No changes to `src/`, `public/mushaf/`, `public/letter-borders/`, legacy
  underline data/code or any saved-session contract.

No live browser/device acceptance was run: this is an audit-only branch with
no runtime changes. Passing app checks does not approve DigitalKhatt rendering.

## Reproduction hashes

File | SHA256
--- | ---
Input PDF | `86809d64b7b4c7d3699c19bdde21b3056dd0736a8422d2d221998b2f772389f9`
Combined protected page JSON | `fa39aeb5e6effea289f88e222d50f15000837477df13a80be0fc4e0a81cc997b`
parity.json | `f58827882fc12877ba6b7e72ce437a1c3637c595e0ea2bdeec89b6398763768b`
PARITY.md | `fb57b4fff66c66bf3de45479eb04a48dab9ad8b65547e3bc85285e2c592ffe7f`
PARITY_DETAILS.md | `a5dcc5aa4f2ab81c2f6676d88235b1d56d38e795d3b3a9865f6ad900ba797da9`

Environment: Python 3.12.14, PyMuPDF 1.26.6, pypdf 6.21.4. No new app dependency.

## Review and confidence

An independent review reproduced the sample-page geometry, inspected all PDF
page transforms/font matrices and confirmed that the first-page mismatch is
not an axis-flip bug. Review improvements were applied: preserve uncomposed
hamza, compare geometry for all line slots, label spelling-uncertain pairs,
classify zero overlap before rounding, pin the PDF hash and avoid calling d1
bounds pixel-exact ink.

Confidence is for the **stop-gate audit**, not a production renderer:

- Practicality: **95/100**. Reproducible full-corpus comparison and tests pass.
- Architecture/data safety: **98/100**. Protected data and runtime code remain
  unchanged; unsupported source structures fail closed.
- Visual certainty: **88/100** for the demonstrated frame mismatch. No all-page
  visual approval, letter-colour ownership proof or tablet acceptance is claimed.

## Cost and work limits

This effort completed four full audit executions, one early development run
stopped on an unhandled section marker, focused sample probes, one full app test
run, one TypeScript check and one build. Two independent read-only reviews
covered licensing and audit correctness. The final whole-audit rerun was timed
above. Total end-to-end wall time and token counts were not instrumented, so no
precise totals are claimed.

No A/B/C delivery benchmark, Phase 2 mapping, UI switch, offline integration,
colour/contact sheets or tablet performance run was started. Those are deferred
because the task explicitly requires a stop when Phase 0 differs on more than
a few pages. Checkpoint 1 and Checkpoint 2 are not complete.

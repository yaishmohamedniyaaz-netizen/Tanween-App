# Replay implementation — slice 1

Status: implemented locally, not committed or published. Fetched origin before
editing; the release branch remains at `6be4495`. Existing unrelated QA files and
outputs were preserved. No layout, fonts, scoring or live-following changes.

## Accepted evidence

User accepted both six-word listening samples, including the two separate Qaf
occurrences. Occasional preceding partial-word audio is acceptable for now.
These are sample listening approvals, not global model accuracy or a permission
to mark all machine timings reviewed.

## Implemented

- Moved exact adjacent-ayah context matching into the production replay analysis
  library. The QA compatibility wrapper now reuses that implementation.
- Connected the real replay worker. All missing/excluded reference positions are
  retained as barriers; no filtering may silently bridge them. Chapter boundaries,
  nonconsecutive ayahs and ambiguous contexts do not become matches.
- Added optional `model.referenceStrategy: tilawa-contiguous-v1` provenance for
  new suggestions. Existing revision version, CTC method, audio hashes, sample
  clock, statuses and manual corrections remain unchanged. Legacy records without
  the optional field still validate.
- Suggestions remain suggested. No auto-review, correctness verdicts, invented
  word boundaries or changed playback lead-in.

## Validation

- 37 focused tests passed before the additional standard-suite provenance tests.
- Standard suite: 387 passed, one skipped (local Tilawa corpus assets absent from
  this checkout), zero failed. TypeScript project check passed.
- Production build passed using the established `npm.cmd run build` after the
  Sites build wrapper failed to resolve its Windows npm path. No dependencies,
  package scripts, hosting configuration or lockfile changed. Existing bundle-size
  warning remains.
- Real production worker, private Qaf audio, isolated Chromium: windows at 0, 20
  and 40 s produced 13, 11 and 8 suggestions, matching prior context-trial counts.
  Combined 29 unique IDs in this three-window subset; do not compare directly to
  the prior seven-window 39-ID total.
- The QA runner initially labelled production-only results as `baseline` and
  absent alternate-reference results as `lost`. Those were reporting labels, NOT
  lost production suggestions. Fixed the runner's mode-specific reporting after
  inspecting the output. The actual suggestions were present and counted above.
- Diff whitespace check passed. No full React persistence interaction or new
  physical-device test performed. No visible UI changed, so no visual approval
  claimed for this slice.

## Still to implement

1. Pin and package the source-verified alternative spelling reference, including
   redistribution/attribution clearance and offline availability. This slice uses
   the existing Tilawa spelling reference, so it does NOT yet reproduce all gains
   of the addressed-reference experiment.
2. Integrate preparation/occurrence selection into the intended low-friction
   replay flow while preserving the distinction between suggestions and reviewed
   evidence. The current manual timing tools are not the intended final workflow.
3. Selected-kalima presentation matching the actual Mushaf artwork (legacy QCF
   fallback), plus visible browser checks and user approval.
4. End-to-end real-recording, missing-audio, repeat, cancellation and offline QA
   before release. Do not publish an intermediate matcher as the complete feature.

Confidence for this local slice: practicality 90/100, architecture/data safety
93/100; visual certainty not applicable because presentation is unchanged. Overall
release readiness is not established by these confidence judgments.

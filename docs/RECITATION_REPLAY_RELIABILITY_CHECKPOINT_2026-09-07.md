# Saved-recording replay reliability checkpoint

## Scope and release base

Prepared on codex/replay-reliability-release-117 from origin/main
9525f59dbcefcdf892ef91b3947a33293344419e, retaining the latest Mushaf
proportion/ink-target fixes and ad77ed0 page-scale comparison. Only the replay
reliability slice and its QA fixtures are added. Unrelated experimental drafts
in the original checkout are not included.

Retained: shared recording vault, revision history, existing replay UI and
experimental automatic suggestions. No scoring, Quran text, Mushaf geometry,
mistake ledger, export, or saved device-preference changes.

## Completed

- Missing, empty, mismatched or failed recording parts remain visible as
  unavailable; later parts never silently inherit their numbering.
- A final queued storage failure cannot mark a recording complete.
- Finalized audio cannot be silently replaced; timing saves verify original
  audio identity and reject unavailable sources.
- Concurrent timing corrections require explicit reload, retain the unsaved
  draft and preserve earlier revisions. Storage failures clear stale success.
- Switching sources, parts or replay modes releases old audio and cancels stale
  playback intentions. Closing word review releases its media.

## Validation

- Release worktree: 381 automated tests, 380 passed, one corpus-dependent test
  skipped because the local optional Tilawa corpus is not copied into release.
  The full 12-test Tilawa suite, including that corpus test, passed in the
  original checkout with its pinned local corpus.
- Production build, strict QA TypeScript check and git diff --check passed.
- Real Chromium browser: 35 storage/audio-clock checks and 11 playback lifecycle
  checks passed, including missing chunks, quota failures and revision races.
- Replay component inspected at 1024x768, 1280x800 and 1400x900, plus requested
  393x852 portrait (browser rounded actual width to 394). Controls remained
  reachable without horizontal overflow. No product CSS changed in this slice.
- Newer page-scale proof remains a build entry. Physical Safari/iOS installed
  PWA playback, Android, dark-mode visual acceptance and user visual approval
  are not established by these checks.

## Remaining boundaries

Automatic recognition is not authoritative audio timing. Suggestions still
need listening/review; this checkpoint does not certify word alignment accuracy
or offline readiness. Real-device recording, reload and replay acceptance is
required after publication. Synthetic audio and database fault tests establish
reliability behavior, not Quran recognition accuracy.

Confidence for this bounded reliability slice: practicality 94/100;
architecture/data safety 92/100; visual certainty 85/100 for inspected Chromium
views only. These scores are judgment, not physical-device proof.

Publication status belongs to the deployment record; this document records
pre-release evidence and does not itself assert successful deployment.

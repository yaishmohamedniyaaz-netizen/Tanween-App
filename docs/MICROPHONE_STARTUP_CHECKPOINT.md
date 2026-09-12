# Microphone recovery — acquisition safety slice

## Interruption slice (local, not published)

Added ended-track detection with a foreground recheck, once-only reporting and
listener cleanup. Mute/quiet input/visibility changes alone do not stop capture.
Unexpected native stops default to interrupted. The existing header says
Recording interrupted and offers its existing Resume action after finalization.
No new dialog or control. Recording chunks and duration origins are local to the
segment; manifest/UI updates reject a different or finished current session.
Session changes/unmount stop active capture; original-session saves retain their
captured IDs. No audio schema, scoring, or preferences changes.

28 focused tests passed. Synthetic Chromium: an ended track preserved nonzero
saved audio, a denied Resume left that manifest exactly unchanged, and explicit
successful Resume followed by pause/resume succeeded. Existing cancellation,
late grant and Finish-during-startup browser checks also pass. Build passes.

Remaining: physical Safari/PWA interruptions and audible replay; extended
fault injection of delayed database writes across rapid participant changes.
Those are not established by synthetic capture or source ownership guards.

## Owner correction: simplified recovery UI

The owner rejected the details dialog and technical-copy UI. Both component
files were removed; the source can be recovered from this task's patch history.
The sections below describing that UI are historical, not the accepted design.
Prepared startup now shows Starting microphone, Cancel and Begin without
recording. Failure shows Recording couldn’t start, Try again and Begin without
recording. Active judging retains its quiet recording status. No details modal,
copy button or delayed explanatory UI remains. Startup/cancellation protections
and developer-only opt-in diagnostic collection are retained. No publication.

## Current checkpoint: recovery controls (September 12, local only)

This section supersedes the remaining-work lists below; those are historical.

Implemented a compact recording-details native dialog with explicit Close,
Escape dismissal, focus restoration, safe-area height limits, and diagnostic
copy with a selectable-text fallback when clipboard access fails. It does not
reflow the Mushaf. The prepared recovery row distinguishes Cancel (no judging
start) from Begin without recording. After five seconds, startup offers
"Taking longer? Details". Active startup/error controls open the same details.
Normal pause/resume controls retain their existing behavior.

The panel does not claim that permission means successful recording, or that
saved bytes prove complete playback. Diagnostics omit participant names, audio
and device IDs; detailed stage collection remains opt-in with
`recordingDiagnostics=1`.

Recorder ownership now remains held through finalization, blocking overlapping
resume/start. The stopped recorder releases its own stream. Finalization storage
has a bounded wait while its underlying pending operation still blocks retries.
Finish during armed/starting capture invalidates startup and stops the stream.

Validation: 24 focused tests passed; full suite 381 passed / 1 existing skipped;
TypeScript and production build passed (existing bundle-size warning).
Isolated Chromium checks at 390x844 and 1280x800 cover slow-start details,
dialog bounds/Escape, clipboard failure fallback, Cancel without session start,
late-grant disposal, Begin without recording, and one session-start event.
Synthetic capture start/pause/resume/pause and missing native-start-event timeout
also pass. Screenshots: outputs/microphone-recovery-390.png and -1280.png.

Still required: physical iPhone Safari and installed-PWA recording/playback,
background/foreground and device interruption checks, broader late-storage
session-transition fault injection, enlarged-text/dark/landscape visual checks,
and user visual approval. Native recording reliability is NOT yet confirmed.
No commit, push or publication in this slice. Unrelated work retained.

Confidence: practicality 90; architecture/data safety 85; visual certainty 80
(browser-reviewed, not yet user/native-device accepted).

## Post-permission follow-up (local, not release-approved)

Added 15-second bounded waits for initial audio recovery, storage read/create,
segment creation and chunk writes; 10-second acknowledgement deadline for the
native recorder start event. These are provisional app policies. Underlying
storage operations are not cancelled; pending operations block new startup/
resume attempts until settled. Previously stored chunks are not deleted.

Recording is not labelled active before its start event. Header now distinguishes
Starting recording from Saving audio. Duplicate in-flight segment startup is
guarded. Quiet input or delayed chunk delivery is not itself treated as failure.

Opt-in `recordingDiagnostics=1` collects at most 40 stage/timing entries in memory.
Controller getDiagnostics supplies build asset identifier, visibility, status
and pending flags, without participant/device identities or audio. A user-facing
copy control remains to be connected; this is not yet a complete phone diagnostic
handoff. No claim of OS-level microphone repair.

24 focused tests pass (9 capture, 5 stage/diagnostic, 10 existing audio). Chromium
fixtures pass pending-request fallback on phone/desktop, native synthetic audio
start/pause/resume/pause, and missing start-event timeout after a successful
microphone grant, with the judging session retained. TypeScript passes.

Still open: stage-error presentation after Begin, copy diagnostics, slow-start
guidance, Cancel-only action, exhaustive hook-level stale-finalization/late-write
and interruption tests, extended visual review and physical Safari/PWA testing.
The original remaining-work list below is historical; bounded startup waits are
now implemented but do not remove these gates.

Local implementation on top of 4003106; uncommitted and unpublished.

Implemented:
- Testable single-flight microphone attempt owner, 20-second app deadline,
  foreground/deferred-resolution deadline checks, immediate logical cancellation,
  stopped late streams and explicit recorder ownership transfer.
- Begin and Resume use the owner. No automatic second browser request while
  the first remains unresolved. Retry remains explicit.
- Prepared screen offers Begin without recording during a pending request;
  requesting and armed labels are distinguished.
- Prepared-context changes invalidate waiting attempts; App checks context
  before dispatching Begin. Storage continuations check an operation generation.
- Existing saved formats, scoring and current Adu / Raagu popup are unchanged.

Verified:
- 9 new behavior tests; 10 existing audio tests; TypeScript compilation.
- Existing full suite: 381 passed, 1 existing local-Tilawa-assets skip.
- Isolated Chromium at 390x844 and 1280x800: pending fallback visible/in viewport;
  selecting it then delivering a late fake grant stops that stream exactly once
  and leaves exactly one session-start event. No real microphone access or user
  browser data was used. Script: scripts/qa/microphone-startup-browser.mjs.

Remaining before the complete recovery plan is done:
- Bounded opt-in stage diagnostics and the proposed 5-second slow-start guidance.
- Post-permission storage/MediaRecorder-start watchdogs, duplicate-start and
  cleanup tests for session transitions with storage operations outstanding.
- Explicit Cancel-only UX and appropriate pending-browser retry messaging.
- Full hook-level resume/interruption coverage, real audio playback, enlarged
  text/landscape visual checks and physical Safari/installed-PWA acceptance.
- Production build, final scoped review and approval before commit/publication.

Do not report the original iPhone defect fixed. Capture timeout recovery is
implemented, but a storage/startup stall after a successful grant remains to be
instrumented and bounded. Existing audio segment recovery remains the fallback
for abandoned in-progress storage records; do not delete prior audio.

Confidence for this slice: practicality 90, architecture/data safety 88 pending
hook-level lifecycle tests, visual certainty 78 pending full visual acceptance.

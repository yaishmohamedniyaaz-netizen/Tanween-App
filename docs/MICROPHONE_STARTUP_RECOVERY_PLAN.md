# Microphone startup and recovery plan

Planning only, 12 September 2026. Baseline: `4003106` or its verified successor.
Preserve the floating Adu / Raagu release and unrelated dirty work. No deployment
or source implementation is authorized by this planning document alone.

## Outcome and constraints

A microphone attempt must not trap judging behind an endless wait, silently
discard the user's recording choice, attach audio to another reciter, or leave
a cancelled stream capturing. Explain the actual startup stage and retain an
explicit way to continue without recording. Do not promise to repair an OS-level
capture failure; provide safe recovery and evidence of where it occurred.

Keep Practice-only recording scope, existing audio formats, segmented pause/
resume storage, session IDs, evidence timing, scores and preferences unchanged.
No backend, new recording library, raw-audio telemetry or automatic retries.

## Verified source facts versus unresolved diagnosis

- `prepare()` and `resume()` await `getUserMedia` without a deadline.
- PreparedSidebar labels both requesting and armed as Waiting for microphone;
  fallback appears only after an error, not during an unresolved request.
- `cancelPrepared()` stops the currently held stream but cannot invalidate a
  pending request's future completion. There is no attempt-generation guard.
- App begins the participant after `prepare()` returns; actual MediaRecorder
  startup follows asynchronously, after recovery/storage prerequisites.
- Persistence permission is fire-and-forget, not an awaited mic-start barrier.
  It must not be blamed for the permission wait without runtime evidence.
- Exact cause on the owner's iPhone is unknown. Cached builds were observed
  in a separate browser session; verify build identity before reproduction.

## Options

1. UI watchdog only: add delayed help, timeout and retry to existing awaits.
   Smallest patch, but insufficient by itself: late grants and lifecycle races
   remain. Practicality 95/100, data/lifecycle safety 65/100 as a standalone fix.
2. Bounded, cancellable startup controller (recommended): one owner for each
   attempt and resource, with stage diagnostics and explicit recovery. Reuse
   the existing recorder/storage; extract only the lifecycle needed to test
   it. Practicality 90/100; architecture/data safety 92/100 after named tests.

These are engineering confidence estimates, not measured success percentages.

## Slice 1 — observe and reproduce

Add a bounded opt-in diagnostic buffer containing build ID, elapsed times,
startup stages, visibility/standalone state, standardized error names, track
live/muted state, recorder start and first nonempty saved chunk. Do not collect
audio, transcripts, participant names, device labels or persistent device IDs.
Expose Copy recording diagnostics only on demand; no routine UI clutter.

Separate requesting microphone, stream obtained, preparing storage, recorder
started, first chunk received and first chunk stored. Separate the AudioContext
meter from recording: a suspended meter is not proof that recording failed.
Distinguish quiet input from a muted/ended track; never require speech to begin.

Reproduce immediate and delayed success, unresolved acquisition, explicit
denial, no device, busy device, invalid constraints, muted/ended streams,
storage failure and stalled startup. Establish behavior with the supported
default constraints before changing device processing or codecs.

## Slice 2 — safe attempt ownership

- Allocate an attempt ID and capture the prepared-recitation/session identity
  synchronously before requesting microphone access. Keep that request on the
  user-action path; avoid introducing an awaited preflight before it.
- One active capture request per controller; repeated taps do not duplicate it.
- On Cancel, timeout, reciter/question change, disabling recording, unmount or
  ending the session, invalidate the attempt. Every asynchronous continuation
  checks its ownership before changing state or dispatching Begin.
- Stop all tracks returned by an obsolete attempt immediately. Do not assume
  Promise.race cancels getUserMedia: logical cancellation is app-controlled,
  while the browser may still deliver a result later.
- Apply the same guard to resume; preserve existing segments on failure. Bind
  storage/recorder completions to their original session, never the new one.
- Define resources for each stage and idempotent cleanup. Handle explicit
  track.stop cleanup directly, not only through an ended-event listener.
- A browser request may remain unresolved after app cancellation. Do not start
  retry loops or accumulate parallel requests. If it never settles, offer an
  explicit reload/reopen route after preserving session state; native pending-
  request recovery behavior needs iPhone evidence.

## Slice 3 — compact recovery UX

Retain Begin and Record locations; no new modal or Mushaf resizing.
Use stage-accurate labels: Requesting microphone / Starting recording / Recording.
Keep Cancel accessible during startup. Offer Begin without recording explicitly,
never automatically. Completion of an obsolete request cannot later begin or
record that participant. Use an accessible status message without repeated
screen-reader timer announcements.

Provisional policy to test: after 5 seconds expose slow-start guidance; after
20 seconds stop waiting in the app and show recovery options. These numbers
are product proposals, not a WebKit rule or evidence of permission denial.
Measure elapsed time on return to foreground; background timers can be delayed.
Do not cancel merely on blur/visibility change because permission UI can itself
affect focus. A known actual track interruption needs separate handling.

Retry starts only from another explicit tap when it is safe to do so. If the
browser's original request is still outstanding, explain reopening instead of
pretending a second request cancels the first. Never ask the owner to clear site
storage, delete the PWA or lose recordings as routine recovery.

Keep judging state and recording readiness distinct. If startup fails after
Begin, keep that session and its marks intact and show Recording not started;
do not retroactively claim earlier speech was captured. A later successful
recording starts at its real audio time. Do not invent replay coverage.

## Slice 4 — acceptance tests

Automated fake-media/fake-clock controller tests:

- Success, denial, forever pending, timeout, late success/rejection after cancel.
- Double Begin, cancellation then another reciter, navigation, unmount/StrictMode.
- A stale stream is stopped exactly once and cannot dispatch Begin or replace
  a newer stream; no overlapping recorder instances or listener leaks.
- Resume timeout/failure preserves previous audio and paused/interrupted state.
- Permission succeeds but storage/start/first write fails: accurate stage/error,
  no false Ready/recording-complete evidence and no loss of judging data.
- Permission dialog focus changes do not prematurely abort an ordinary grant.

Browser UI checks: 390x844, 430x932, constrained/enlarged text, desktop and
landscape. Recovery actions reachable, page geometry stable, keyboard/focus
usable, score/Finish contracts unchanged, no duplicate session start.

Physical acceptance (not replaceable with desktop emulation): current iPhone
Safari and installed PWA; first grant, previously allowed access, refusal,
background/return, screen lock/return, pause/resume, competing audio route, and
a short audible replay after each successful case. Do not promise background
recording continuity. Preserve prior chunks if interrupted.

## Release gate

Runtime-stage evidence and controller tests first, then browser checks and an
opt-in phone trial if needed. Do not call the reported iPhone defect fixed until
verified there. Run proportional full validation, review the scoped diff,
obtain UI approval and explicit publication request. Desktop paging, navigation
restyling and Fade coverage remain separate tasks.

Overall confidence: practicality 90, architecture/data safety 92 with lifecycle
tests, visual certainty 78 pending prototype and physical phone acceptance.

## Primary references

- [MDN getUserMedia](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia): requests may remain unresolved; documented errors.
- [MDN track stop](https://developer.mozilla.org/en-US/docs/Web/API/MediaStreamTrack/stop): explicit resource cleanup.
- [MDN track muted](https://developer.mozilla.org/en-US/docs/Web/API/MediaStreamTrack/muted): source unavailable differs from quiet speech.
- [WebKit MediaRecorder](https://webkit.org/blog/11353/mediarecorder-api/): Safari recording support; not proof of current device-specific reliability.

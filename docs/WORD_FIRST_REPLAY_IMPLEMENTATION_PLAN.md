# Word-first replay: implementation and acceptance plan

Status: proposed, 2026-09-08. No implementation in this planning pass.
Source base: 8f50fa1 on codex/results-overview-first.
This direction supersedes proposals for automatic correct/incorrect coverage shading
and mandatory participant/word review workflows. It does not change competition rules.

## Product contract

In participant review, enter Replay, tap a printed kalima, hear the selected
participant's recording from shortly before its spoken occurrence, and continue
until paused or another word is selected. Do not stop at the word's end.
Do not imply that recognized words were pronounced correctly.

Retain: participant navigation, existing Mushaf renderer and spread preference,
judge findings, score detail, original audio, timing revisions and source identity.
Recompose: existing recording controls into one persistent compact transport.
Remove from primary flow: mandatory timing review, duplicate players, technical
timing fields, automatic coverage colors and word-end auto-stop.
Retain specialist timing correction behind secondary tools.

## Current source findings

- ParticipantReviewWorkspace already owns selected-word, finding and source context.
- RecitationReplayPlayer opens recording sources and parts, decodes selected media,
  provides transport, editing and experimental suggestions in one component.
- wordReplayChoices searches only the decoded part. It prefers word intervals and
  otherwise offers an exact reviewed ayah span. Repetitions require a choice.
- Direct playback currently needs a Play action, adds 0.4 seconds on each side,
  and stops at the interval end. These semantics differ from the new request.
- Automatic CTC suggestions explicitly use an unverified frame/time mapping.
  They cannot support an accuracy claim without real-recording measurements.
- Some older roadmap documents describe pre-implementation limitations. Current
  source and later checkpoints take precedence over those historical tables.

## Screen and interaction structure

One participant screen, not a new Results tab or a separate review hierarchy.
Add one explicit Replay on/off control beside the recording transport. Replay off
preserves existing word/finding inspection. Replay on gives word taps playback
meaning, keeps existing finding marks intact and permits inspection through its
existing findings list. Label the active mode visibly; never rely on hidden gestures.
Only initialize Replay on after explicit entry; do not carry it to live judging.

Desktop: preserve the current one/two-page Mushaf. Place transport in the existing
recording area, not over the text. Avoid duplicating the full scorecard.
Phone: use one compact transport dock outside the Mushaf in the review layout.
Reserve its height on entry to review so playback/loading/occurrence selection do
not resize the page. Respect safe areas and preserve normal page scrolling.
Prototype the geometry before selecting exact dimensions; target 44px controls.

Primary controls: Play/Pause, Back 3 seconds, seek/time, Replay mode.
Secondary menu: playback speed if already available, recording source when multiple,
timing correction, recording details. Do not add a waveform merely for decoration.
Keep source visible when ambiguity could misattribute audio; never combine judges'
recordings or switch judge sources without deliberate selection.

Selecting a word may show a quiet selected-word indicator, not correctness or
coverage shading. Do not add animated word-following in this slice. Existing
mistake colors remain evidence and are not modified by playback state.

## Routing rules

1. One validated eligible word occurrence: start at max(0, word start - lead-in).
2. Multiple occurrences: show a compact list with chronological times; no silent
   first/last selection. Dismiss does not commit a seek. Selecting one starts it.
3. Suggested/approximate timing only: do not silently autoplay as exact. Offer
   an explicit approximate preview, or reviewed ayah fallback when available.
4. No word interval but usable reviewed ayah timing: offer Play from ayah start.
   Partial ayah spans must be labelled as recorded spans, not the true ayah start.
5. No reliable interval: concise notice plus whole recording and manual seeking.
   Missing timing alone does not prove that the reciter skipped the word.
6. Unavailable audio: state that clearly; never fabricate a location or play a
   different participant/source. Imported score data does not carry audio.

Start with a 0.5-second lead-in, compare against 1 second on real recitation. Keep
the chosen default centralized; no new settings panel in the first iteration.
Near a part boundary, clamp to available recorded audio; do not fabricate pauses.
Back 3 seconds follows actual media time, not recognition arrival time.

Rapid taps: latest explicit playback request wins. Cancel old load/decode/seek
requests. On a new target, pause old audio before preparing the new target; a failed
request must not leave unrelated old audio playing. Loading changes only transport
status. If Safari blocks delayed playback, show a prominent Play action, not silence.
Pause during loading cancels pending autoplay. Leaving participant/source stops and
releases audio. Page browsing alone does not grade, edit timing or start playback.

## Internal separation

Keep the UI integrated but separate four responsibilities:

- Replay resolver: pure read-only lookup across the chosen source's recording parts,
  using the current timing revisions and immutable Quran/recording identity.
- Transport controller: one audio owner, seek/readiness/cancel/pause/continuation,
  decoded media time, resource cleanup and interruption handling.
- Timing preparation: experimental analysis produces separate derived suggestions;
  no score or ledger writes and no forced mapping of every printed word to sound.
- Review UI: renders resolver outcomes and controls; no independent copy of judging
  state. Keep correction UI separate from everyday playback controls.

Use existing recording vault and revision contracts. Index metadata across parts;
decode only needed audio, with bounded caching. Do not load an entire competition's
audio into memory. Distinguish continuation within one recording from crossing to
another source. Preserve gap/partial-recording disclosure. A failed part must not
renumber later parts or make an invented continuous time axis.

No new model dependency or cloud service in the UI slice. Keep automatic timing
behind the existing experimental boundary until the accuracy gate passes. Recognition
timestamps and receipt times are not substitutes for recorded audio-time evidence.

## Incremental delivery

### A. Resolver and transport foundation
Search valid timing across all parts of one selected source. Add explicit request
identity and playback policy (continue rather than bounded clip). Reuse existing
controls first; no visible redesign. Tests: repeats, superseded revisions, missing
parts, stale requests, source isolation, pause while loading, end-of-part behavior.

### B. Replay-mode prototype with known timings
Use synthetic fixtures and existing reviewed intervals to build the one-screen UI.
Test direct tap, Back 3 seconds, occurrence choice, truthful fallback and missing
audio. Preserve off-mode inspection. Show desktop/portrait for user approval before
expanding the work. This proves interaction, not automatic timing accuracy.

### C. Real-audio timing benchmark
With permission, use representative recordings across reciters, rates and devices.
Include clean speech, repeats/backtracking, omissions, incorrect substitutions,
long pauses, boundaries, basmalah and joined printed-token cases.
Human-label target onsets/occurrences independently of the model. Measure location
coverage, wrong-occurrence rate, onset error (median and p95), clipping after lead-in,
fallback rate, preparation time and peak memory separately. Report numerator and
denominator; do not hide abstentions in an accuracy percentage.
Define promotion thresholds before evaluating the held-out set. Zero observed wrong
source/participant routing is mandatory but is not a statistical proof of zero risk.
No universal '95% confidence' gate from uncalibrated model scores.

### D. Integrate eligible automatic timings
Only if C passes: prepare/index saved audio without forcing judges to approve every
word. Keep uncertainty and repetitions separate from correctness. If C fails, ship
truthful reviewed-timing/ayah navigation and keep automatic word timing experimental.

### E. Physical-device and release acceptance
Record -> pause/resume -> finish -> reload -> tap word -> replay on iPhone Safari
and installed PWA. Also verify foreground/background interruption, output routing,
offline after required assets are cached, storage failures, and recordings not on
this device. Do not claim iOS/offline acceptance from Chromium or synthetic tones.

UI matrix: 393x852 portrait, smaller 320/375-class widths, 852x393 landscape,
1024x768, 1280x800, 1400x900; light/dark, reduced motion, keyboard, VoiceOver,
200% text and one/two-page views. During transport state changes, compare Mushaf,
header and footer rectangles for unintended movement. Do not demand desktop pixel
identity for the deliberate replay transport change; protect unrelated judging UI.

Release in scoped commits after validation and visual approval. Fetch remote changes
before integration. Push and publication are distinct permissions; publication remains
unapproved. The separate More-menu layering repair is not part of replay implementation.

## Guidance and confidence

- W3C interactive transcripts: https://www.w3.org/WAI/media/av/transcripts/
  Supports text-to-media navigation; the canonical Quran is not necessarily a verbatim
  transcript of an imperfect recitation and must not be represented as one.
- W3C slider pattern: https://www.w3.org/WAI/ARIA/apg/patterns/slider/
  Keyboard/time semantics and physical touch-assistive-technology testing.
- Apple motion: https://developer.apple.com/design/human-interface-guidelines/motion
  Purposeful restrained feedback, not whole-surface movement on playback actions.

Plan judgment: practicality 90/100, architecture/data safety 94/100,
visual certainty 78/100 until prototype approval. Reliable automatic timing remains
an unproven technical gate, not a promised percentage or deadline.

# Saved-recording replay prototype checkpoint

2026-09-05. Local implementation; not committed, pushed, or published.
Scope: the first saved-recording slice of
[the recitation plan](RECITATION_FOLLOWING_AND_WORD_REPLAY_PLAN.md).

## What is implemented

Practice Results now offers **Ayah & word replay → Review words** when exact
question evidence is available. It reuses the existing recording sources and
Mushaf evidence renderer. The developer fixture is available with `npm run dev`
at `/scripts/qa/recitation-replay.html`; it is not included in the production
build and never creates competition/scoring records.

- Open a finalized local recording part and select a kalimah or an ayah within
  the frozen recorded span. A mistake selected from the Results log also selects
  its source session and printed word. Selecting a word with one reviewed
  occurrence seeks there; repeated occurrences require an explicit choice.
- Set start/end from playback position or edit seconds, replay with 0.4 seconds
  of context, repeat, and save as reviewed. New timings preserve repetitions;
  corrections append revisions. Removal retains a tombstone/history revision.
- Reviewed, non-conflicting word intervals drive a neutral Mushaf focus.
  Suggestions, grouped words, overlaps and unspoken gaps do not produce a
  supposedly verified playback highlight.
- Review playback uses a derived mono PCM WAV with a fixed 48 kHz decode clock,
  checked against the media element duration. The original compressed blobs
  remain unchanged. The review timeline is segment-relative, not the old
  wall-clock duration or a fabricated concatenated timeline.
- IndexedDB version 2 adds a timing-revision store. Each record binds session,
  recording creation identity, segment, original-media SHA-256, decoded clock,
  and question fingerprint. Recording deletion also deletes its sidecars.
  Transactions reject stale corrections and saves after source deletion.
- **Experimental word suggestions** analyzes up to 20 seconds from the playhead
  through the existing local Tilawa ONNX worker. It retains greedy CTC emission
  frames and accepts only uniquely matched three-word contexts in the supplied
  passage. It withholds window edges, unmatched positions, and joined tokens
  that need separate printed-word boundaries. No interpolation fills omissions.
- Suggested positions are persisted with model/vocabulary hashes and an
  explicitly unverified frame-mapping version. The reviewer must listen and
  correct them before marking them reviewed. Reanalysis does not overwrite
  existing overlapping timing records.
- Closing review or changing source/part stops the old media and terminates
  analysis. Backgrounding the page pauses review playback. Recording, scoring,
  official result finalization, export contents, and device preferences retain
  their existing contracts.

## What this does not establish

This is **not validated automatic exact-word alignment**. CTC emission spikes
are provisional acoustic locations, not reliable word starts/ends. The current
prototype uses the frame position within the analyzed window; it does not prove
the model's stride/padding or a phoneme boundary. A clean reference clip is not
representative of participant mistakes, prompting, children, accents, or noise.

Automatic whole-session alignment, automatic complete ayah intervals, live
shared capture, the live resampler correction, backward-jump tracking, and
official-competition recording remain outside this checkpoint. The original
live follower and original full-recording playback remain separate. No new
automatic classifications, deductions, scoring rules, cloud uploads, or model
training have been introduced.

Review currently supports decodable parts up to five minutes, with a 12 MiB
compressed-file guard. Decoding still allocates the source buffer before the
duration check; mobile memory limits need physical-device testing. Unsupported
or damaged media can use the existing full-playback path where playable.

The review actor is labelled `local-reviewer`, not an authenticated official
identity. Cross-device evidence sharing and authenticated review permissions
are not established. The database upgrade preserves audio, but rolling back to
an older binary hardcoded to database version 1 requires retaining the version-2
compatible audio reader; never delete or downgrade the audio database to roll back.

## Validation completed

| Check | Result |
| --- | --- |
| `npm test` | 365 passed; 0 failed; 0 skipped |
| `npm run build` | Production build succeeds; existing large-chunk warnings remain |
| New behavior tests | Invalid bounds, source/clock identity, revision history, repetitions, ambiguity, PCM duration, CTC frame handling, unique/ambiguous/missing/wrong-word contexts |
| Actual browser storage | Version-1 migration retained manifest and audio blob; new timing store present; concurrent revisions guarded; history retained; deletion cascaded; late saves rejected |
| Actual browser audio | 44.1/48 kHz WAV decode duration within 1 ms; original hashes retained; synthetic MediaRecorder compressed-audio onset within 100 ms and duration within 150 ms |
| Playback interaction | A synthetic 4–5 second interval started with context at 3.6 seconds and paused at 5.403643 seconds; two same-word occurrences remained selectable |
| Persistence | Suggested intervals remained available after a page reload |
| Model smoke test | Public Alafasy 112:1 clip decoded to about 2.92 seconds; worker produced two internal-word suggestions marked Needs review |
| Source/format guards | The synthetic recording deliberately stored a 999-second wall-clock estimate; word review correctly displayed its 12-second decoded duration |

The public smoke-test clip came from
[EveryAyah's Alafasy 112:1 audio](https://everyayah.com/data/Alafasy_128kbps/112001.mp3).
It was downloaded to an untracked local output directory and analyzed locally.
It is neither bundled into the product nor a word-boundary-labelled fixture.
The test transcript has not been certified by a human reviewer; its suggestions
remain unreviewed. Synthetic tones are explicitly labelled as non-recitation.

Actual CSS viewport dimensions were checked (the browser's display scaling was
accounted for):

| Viewport | Horizontally clipped replay controls | Document overflow after fixture fix |
| --- | --- | --- |
| 1400 × 900 | 0 | None |
| 1024 × 768 | 0 | None |
| 844 × 390 | 0 | None |
| 390 × 844 | 0 | None |
| 320 × 568 | 0 | None |

Ordinary desktop and compact viewport screenshots were inspected. This was the
real reusable player/Mushaf component fixture, not physical iOS/Android testing
or a complete multi-judge Results acceptance run. Visual inspection by the
agent is not the user's visual approval.

## Next gate

Collect consented participant clips with independently reviewed word boundaries
and evaluate errors/coverage/repetitions against the original plan before
promoting automatic timing or connecting live following. Also test physical
Safari/PWA and Android capture/replay, quota failure, damaged parts, long-part
memory use, and source/part switching under load before a production release.

Confidence for this local prototype: **practicality 88/100; architecture/data
safety 91/100; visual certainty 82/100**. Automatic word-boundary accuracy is
unproven and must remain experimental. The user approved committing and publishing this experimental slice on 2026-09-05.

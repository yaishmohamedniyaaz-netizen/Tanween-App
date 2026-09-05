# Recitation following and exact-word replay

Date: 2026-09-05. Status: first saved-recording prototype implemented locally;
automatic acoustic boundaries remain unvalidated. See the
[implementation and validation checkpoint](RECITATION_REPLAY_PROTOTYPE_CHECKPOINT.md).
Baseline: `f423fb72c7130b0a1bd4877888fa02b48c145bb2`.

## Verdict and current checkpoint

Yes: resume the existing recording and Tilawa work. The target experience is
to follow a recitation in the Mushaf, then select an ayah, kalimah, or marked
mistake and hear the corresponding occurrence in that participant's recording.
Reliable automatic word timing still needs a measured prototype.

Earlier research predates the implementation in `feefb94` ("Add local
recitation evidence and Tilawa tracking"). Current source takes precedence:

| Capability | Verified current implementation | Remaining limit |
| --- | --- | --- |
| Capture | Practice opt-in, microphone level, pause/resume, local IndexedDB chunks | Not enabled for official competitions; physical-device reliability not revalidated here |
| Replay | Participant Results detail offers local source selection, play/pause, seek, segment progression, deletion | No word/ayah timing map or mistake-to-audio link |
| Live following | `?tilawaPrototype=1`, More actions > Recitation tracking; local ONNX worker, ayah page navigation, word focus | Experimental; output is visual state, not persisted audio alignment |
| Passage identity | Assignments now freeze exact range/provenance; question evidence reconciles sources | Legacy/manual/conflicting sources can remain unresolved |
| Word identity | Mapping covers basmalah placement and three known joined-token differences | An address resolving to a printed word does not prove acoustic boundaries |

Source entry points: [recorder](../src/hooks/useRecitationRecorder.ts),
[audio storage](../src/lib/recitationAudioStorage.ts),
[player](../src/components/SessionRecordingPlayer.tsx),
[Results detail](../src/components/ParticipantResultDetail.tsx),
[tracker panel](../src/components/TilawaPrototypePanel.tsx),
[worker](../src/workers/tilawaPrototype.worker.ts),
[word mapping](../src/lib/tilawaWordFocus.ts),
[assignment snapshot](../src/lib/reciterQuestions.ts), and
[question evidence](../src/lib/questionEvidence.ts).

## Findings that determine the architecture

1. **Recognition is not alignment.** The installed `@tilawa/core@0.1.0`
   `WordProgressMessage` supplies Quran location and matched indices, with no
   word start/end audio offsets. The current upstream
   [protocol](https://github.com/yazinsai/tilawa/blob/main/packages/core/src/types.ts)
   has the same limitation. Event arrival includes model/queue delay; stamping
   arrival time, or subtracting a fixed delay, cannot establish a word boundary.
2. **Capture paths are separate.** The recorder and tracker each acquire their
   own microphone stream and AudioContext. They have no shared sample origin.
   The worker coalesces queued audio but does not carry segment/sample addresses.
3. **Recorded duration is an estimate.** The recorder uses `Date.now()` for
   elapsed segment duration; interruption recovery may measure until reopening
   the app. The player sums those durations for seeking. Exact replay must use
   decoded media duration and explicit gaps, not these wall-clock estimates.
   [MDN](https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder/dataavailable_event)
   also documents that recorder chunk delivery intervals are not exact timers.
4. **The live resampler needs correction before timing work.** In
   [the worklet](../public/tilawa-audio-processor.js), fractional sampling phase
   restarts for every input block. A numerical reproduction using 128-frame
   blocks yields 16,192.97 output samples/second at 44.1 kHz and 16,125 at
   48 kHz, although input to the model is treated as 16 kHz. This demonstrates
   a sample-count mismatch (about 1.21% / 0.78%), not a measured device or
   recognition error. Use a continuous, filtered resampler with explicit counts.
5. **The current cursor intentionally suppresses repetition and jumps.** It
   rejects backward/non-adjacent movement and limits forward progress. That
   is a visual heuristic; it cannot be the evidence log. A repeated ayah/word
   needs separate occurrences. An ayah spanning two pages also needs word-page
   lookup; navigating only to the ayah's start page is insufficient.

## Recommended sequence

### 1. Prove timing on a saved Practice recording

This is the next implementation slice. Use existing local segment blobs;
do not require the user to record the same recitation again when decodable
audio already exists. Begin with a short recording and its frozen passage.

- Decode each finalized segment to PCM; retain actual sample rate, decoded
  duration, segment identity, and a hash of the original media bytes.
- Keep original audio immutable. Derive a versioned alignment sidecar in the
  audio database; never insert blobs into judging state, backups, or exports.
- Establish mapping from decoded samples to the existing player's media time.
  Verify decoder/codec delay and segment seeks with known audible fixtures.
  Treat interrupted/truncated audio as partial; never invent an unsaved tail.
- Prototype ayah location first, then CTC frame-to-token alignment within
  candidate passages using the existing ONNX output (`logprobs`, `timeSteps`,
  `vocabSize`) and its matching vocabulary. Prove frame stride, window origin,
  padding, resampling, and overlap handling against the original audio.
- Preserve actual repetitions, omissions, wrong words, pauses, and unmatched
  speech. Do not force the assigned correct text onto every sound. Constrain
  candidate discovery with the frozen passage, but report outside-passage
  speech explicitly rather than coercing it into an in-range word.
- Allow a reviewer to set/correct a word or ayah interval manually. If the
  automatic word gate fails, deliver adjustable ayah/near-word replay and keep
  automatic exact-word navigation experimental.

CTC forced alignment is a credible method for deriving token intervals from
acoustic emissions and a transcript; it is not proof of Quran error tolerance.
The [PyTorch tutorial](https://docs.pytorch.org/audio/stable/tutorials/ctc_forced_alignment_api_tutorial.html)
is a conceptual reference only: it explicitly says its featured APIs were
removed in 2.9. Do not add that obsolete API as a production dependency.

### 2. Connect the timing map to Results review

- Extend `SessionRecordingPlayer` with an explicit request containing recording,
  segment, occurrence, and interval. Wait for media readiness and cancel stale
  seek requests when sources change.
- Add a Replay action for the selected ayah, word, or mistake. Start slightly
  before the word and offer repeat plus boundary adjustment. The context window
  and timing thresholds are prototype choices, not competition rules.
- During playback, derive the neutral Mushaf focus from media time. Selecting
  a word seeks the same recording/occurrence; selecting a mistake retains its
  existing printed target, category, and judge identity.
- For repeated words, show available occurrences or use an explicitly reviewed
  occurrence association. A skipped word has no spoken interval: offer nearby
  context with that explanation. A letter-level mark may replay its containing
  word; this does not claim a letter/phoneme boundary.
- Keep automatic/unreviewed, manually verified, ambiguous, and unavailable
  timing distinguishable. Unknown intervals remain gaps in highlighting.

### 3. Reconnect live following to the recording

Once saved-audio replay is proven, use one capture owner feeding recorder and
recognizer. Carry capture epoch, segment ID, sample rate, and absolute sample
range through the worklet and worker; keep received-at time diagnostic only.
Correct resampling and explicitly flush tails at pause/finish. Drop stale
worker results after reset, participant changes, or a new recording segment.

Persist provisional observations separately from finalized alignment. Support
repeat/backtrack recovery and a deliberate "Follow from here" action that
changes recognition context only. Manual page inspection suspends automatic
page turning until the judge resumes following. Model failure must leave
recording and judging usable. Bound queues and report lag rather than silently
dropping audio or pretending the cursor is current.

## Proposed sidecar contract

Store one versioned analysis per recording identity and media revision:

- Source: session ID, recording ID, segment ID/hash, decoded sample rate/count,
  capture epoch where known, media-time mapping revision, frozen question
  fingerprint, and Quran layout/text/token mapping versions.
- Analysis provenance: model/vocabulary hashes, aligner version, creation time,
  revision, coverage, and known unavailable intervals.
- Occurrence: stable occurrence ID, ayah reference, printed word ID(s), start/end
  samples and segment-relative media times, match status, model score when
  available, and review status. One model token may map to multiple printed
  words; do not manufacture separate timing boundaries for a joined token.
- Manual correction: append a revision with prior interval, corrected interval,
  reviewer identity, and timestamp. Optional mistake links identify the exact
  source session/revision and mistake ID as well as the audio occurrence.

No inferred word becomes an official mistake or deduction. No audio is shared
between judge sources merely because participant names or word IDs match.
Deletion removes associated sidecars; reanalysis never rewrites original audio
or silently replaces reviewed corrections. Legacy recordings can be analyzed
from surviving media, but absent provenance/timing remains explicitly unknown.

## Visual scope and acceptance

Retain the approved Mushaf typography/geometry, scoring rail, mistake targets,
source selection, and category colours. Recompose the existing Results player
and evidence selection into one replay interaction. Remove no scoring controls
or evidence fields; avoid adding a second permanent panel over Quran text.
Use neutral focus/status styling and the product's spacing/type tokens.

Start with Results review only. Prototype live UI separately in step 3. Check
desktop 1400x900 and 1024x768, compact 390x844 and 320x568, and landscape in a
real browser. Keep controls reachable and live controls at least 44px. Review
QCF font-loaded screenshots and actual listening behavior. Explicit visual
approval is required before committing or publishing a visible implementation.

## Prototype gates and stop conditions

Proposed engineering targets, subject to review after the first fixture run:

| Gate | Required evidence |
| --- | --- |
| Media clock | Known-tone/speech fixtures at 44.1/48 kHz; variable input blocks; duration and seek error within 100 ms; no accumulating drift after pause/resume |
| Word timing | At least 20 short consented clips from at least 5 reciters, with held-out clips/reciters; human-reviewed intervals; report boundary error, wrong-location rate, and coverage separately |
| Automatic seek | Provisional target: at least 95% of accepted word boundaries within 250 ms of reviewed labels, at least 80% coverage on clean in-range speech, and zero silently accepted wrong-ayah/occurrence seeks in the fixture set |
| Difficult speech | Repetition, backtracking, omission, substitution, similar ayahs, mid-ayah starts, long madd, pauses, prompting/background speech, basmalah, joined tokens, page boundaries; ambiguity must remain visible |
| Storage/recovery | Old recording still plays; sidecar migration/deletion, quota failure, truncated segment, reload, source switch, interrupted recording, and stale async result checks pass |
| Device | Actual microphone capture, background/lock/interruption, decoding, and audible seeking on target iOS Safari/PWA and Android Chrome devices; browser emulation is insufficient |
| Data safety | Existing scoring, evidence fingerprints, result finalization, imports, and ordinary export contents remain unchanged |

For a boundary pair, measure start and end errors independently; a single good
average must not hide incorrect ends or missed occurrences. Small-fixture
success permits an experimental pilot, not a broad accuracy claim. If word
alignment fails, narrow to verified ayah/context replay. If media clocks fail,
do not expose automatic word seeking at all.

Tarteel's [current playback guide](https://support.tarteel.ai/en/articles/14423894-how-to-listen-to-your-recitation-recordings-and-mistakes)
documents both session and specific-mistake playback. That validates the review
pattern, not availability of its model/API or equivalent accuracy in Tahqeeq.
Reference-reciter timestamps must never be reused for a participant's audio.

## Verification performed for this plan

Ran `node --test --experimental-strip-types scripts/recitation-audio.test.mjs
scripts/tilawa-prototype.test.mjs`: **19 passed, 0 failed, 0 skipped**, including
the available 6,236-ayah word-address corpus check. These tests cover contracts,
mapping logic, and source wiring; they do not establish microphone quality,
recognition accuracy, audible boundary accuracy, or physical-device behavior.
The resampler finding was separately reproduced with numerical sample counts.

No browser/audio-device test, new inference experiment, implementation, commit,
push, or publication was performed. Existing untracked directories were retained.

## Confidence and next checkpoint

- **Practicality: 82/100.** Enough existing infrastructure for the bounded
  saved-recording prototype. Automatic word alignment remains unmeasured.
- **Architecture/data safety: 91/100.** Separate, source-bound sidecars preserve
  judging contracts, subject to migration, media mapping, and recovery checks.
- **Visual certainty: 74/100.** Reuse of Results limits the scope, but occurrence
  selection and compact replay controls still need browser proof and approval.

Proceed to a saved-recording timing prototype, then review its measured report
and playable examples before integrating automatic word replay. Open product
choices are tracked in [decision 21](UNDECIDED_DECISIONS.md).

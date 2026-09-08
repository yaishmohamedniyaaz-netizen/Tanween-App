# Word-first replay Slice A — foundation checkpoint

2026-09-08. Current status: connected to the player; cross-part continuation and
missing-part stopping implemented and browser-verified. Broader adversarial browser
checks remain before closing Slice A. Earlier checkpoints below are historical.

Implemented in `src/lib/wordReplayNavigation.ts`:

- Read-only lookup across independently verified parts of one recording source.
- Source, recording creation, frozen question, segment, hash and decoded-clock matching.
- Revision resolution before availability filtering: deleted or mismatched latest
  revisions do not resurrect old timings. Conflicting equal revisions are withheld.
- Separate reviewed words, approximate words and reviewed ayah-span alternatives.
  Repeated occurrences remain choices; no automatic selection or skip inference.
- Explicit continuous request policy: 0.5-second lead-in, no word-end stop.
  Bounded correction previews remain a separate policy.
- Generation-based request cancellation, source replacement, pause during prepare,
  seek or delayed play, and failure cleanup through an injected transport adapter.

Validation: 11 new deterministic tests; full suite 426 passed, one existing optional
Tilawa-assets skip. Build passes. No UI or production player behavior changed.

Remaining Slice A integration:

1. Vault adapter enumerates actual parts and verifies media independently of saved
   timing metadata. Do not decode/retain all parts concurrently on phones.
2. Adapter reloads current timing revisions immediately before playback, validates
   target identity and returns a separately owned, idempotently releasable audio handle.
3. Connect requests and all-part choices to existing player, preserving its correction
   tools. Keep approximate and ayah fallbacks explicit.
4. Define/test actual end-of-part continuation and gaps without inventing a continuous
   wall-clock timeline or crossing recording sources.
5. Browser media tests for rapid choices, late readiness, errors, missing parts,
   blocked play and source changes; physical iOS is a later acceptance gate.

The new module is deliberately not imported by production UI yet. Unit tests prove
the resolver/controller contracts with fake transports, not real browser audio or
automatic Quran timing accuracy. Slice A is NOT complete at this checkpoint.

Confidence for tested foundation: practicality 90/100, data safety 92/100.
Visual certainty not assessed: no visible change. No commit, push or publication.

## Player integration continuation

Now connected to RecitationReplayPlayer: sequential identity-only indexing of parts
with saved timings, all-part choices, explicit cross-part navigation, fresh vault
and revision validation, cancellable preparation, and continuous playback within
the selected part. The existing correction-preview interval policy is retained.
No direct-tap mode or automatic timing changes yet.

New service: replayRecordingIndex.ts. Latest timing is rechecked after decode;
changed media, removal, revised boundaries and a cancelled decoder are rejected.
Prepared PCM is not retained in parent navigation state. The current player retains
its existing HTML audio ownership and cancellation refs; the standalone controller
remains a tested abstraction rather than a second simultaneously active audio owner.

Validation: 429 tests passed, one existing skip; production build passed. Actual
Chromium fixture selected Part 1, found the only word interval in Part 2, navigated
there and emitted `play 0.500`, `ended 4.000` for a stored 1.0–1.5s interval.
This establishes cross-part routing and continuous playback, not Quran accuracy.
Fixture: scripts/qa/word-navigation.html, synthetic audio only.

Remaining before declaring Slice A complete: end-of-part continuation/gap policy
and its integration; broader real-media cancellation/source-switch regression tests;
compact/browser acceptance of preparation and error states. Physical iOS remains
unverified. Nothing committed, pushed or published in this continuation.

## Continuous recording-part playback checkpoint

Implemented sequential continuation after word replay: verify the current source
and bytes again, decode the next consecutive part, then start it at zero. Missing,
empty or failed parts stop continuation; later parts are never silently skipped.
No silence duration is invented between parts. Bounded correction previews retain
their previous behavior. Preparation can be cancelled and is cancelled when the
page becomes hidden.

Validation on 2026-09-08:

- Full suite: 431 passed, one existing optional local Tilawa-assets skip.
- Production build passed (existing large-chunk warning); diff whitespace check passed.
- Chromium three-part fixture: `play 0.500`, `ended 4.000`, `play 0.000`,
  `ended 4.000`; final selection Part 3 and End of recording notice.
- Chromium missing-part fixture: empty Part 3 with valid Part 4; replay remained
  on Part 2, emitted only `play 0.500`, `ended 4.000`, and explained the stop.
- Pause after word playback returned to paused at 0.5 seconds.
- Existing browser lifecycle fixture: all 11 checks passed (source changes,
  media release, revision conflict recovery, quota failure, part changes, close).
- 393x852 fixture screenshot: missing-part message and controls readable without
  overlap. This is isolated-component Chromium QA, not full participant-screen
  visual approval or physical iPhone/PWA acceptance.

Remaining Slice A acceptance: controlled delayed readiness/play rejection and rapid
word changes in the actual React player, beyond deterministic controller tests.
Direct kalimah-tap playback and reduced replay UI are Slice B, not implemented here.
Real recitation alignment accuracy, physical Safari and offline reload remain open.
No scoring, ledger, Quran text or saved preference changes. No commit, push or publish.

Confidence: practicality 92/100; architecture/data safety 91/100;
visual certainty 82/100 for the isolated component, not final app approval.

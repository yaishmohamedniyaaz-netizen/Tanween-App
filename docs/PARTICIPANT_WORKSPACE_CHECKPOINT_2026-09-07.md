# Participant workspace — second-slice checkpoint

Branch: `codex/results-overview-first`. Re-fetched origin; main remains `b4ac5b2`.
The first-slice work is retained. User deferred phone visual approval and asked
to proceed with slice two. This is not approval to publish or enable new rules.

## Retained / recomposed / removed

- Retained: frozen passage validation, actual QCF page surface, selected-source
  scoring, judge findings and notes, source revisions, and existing audio storage
  and timing-revision safeguards. The published/default view remains unchanged.
- Recomputed presentation only: participant header, one expandable score/source
  summary, previous/next within the filtered list, one paginated Mushaf surface,
  side finding inspector and shared recording transport.
- Removed from the experimental default detail: repeated status/section banners,
  per-person finalize action, separate Review words entry button, permanently
  expanded timing forms, and persistent mistake underlines.
- Multiple findings on one word remain individually attributed and readable.
  Missing/unlocatable findings remain inspectable; no guessed Quran assignment.

Enabled through the existing `?resultsOverview=1` flag. Selecting a word only
changes view state. It does not play, score, approve, edit a note or write timing.

The same existing player is embedded for practice word timing. Competition
recordings retain ordinary playback; extending their word timing is slice three.
The transport is explicitly labelled Play recording, not Play word. Existing word
interval selection/correction lives in secondary Timing tools until the direct
select-then-Play and occurrence/fallback work is complete.

## Safety and lifecycle

- Participant, evidence fingerprint and selected source revisions key the workspace.
  Source changes reset selection/player state. Leaving Review unmounts the player;
  returning retains the participant but does not resume playback automatically.
- Missing audio has a local-device explanation, not a blank player or inferred
  timing. JSON score imports do not transfer recordings.
- Explicit Close on phone word detail and score disclosure; Escape closes the word
  inspector. The phone inspector is non-modal, scrollable and safe-area-aware.
- Word/finding selection does not resize the page. Desktop page width fits the
  viewport height proportionally; the phone retains available-width reading scale.
- A browser-discovered page-navigation trap was fixed: locating a finding is a
  one-time request, not a persistent command forcing the page back after Next.

## Checks performed

- Full suite: 399 tests, 398 pass, zero failures, one existing Tilawa-assets skip.
  Five new server-render tests cover unchanged input, missing passage, preserved
  notes/attribution, inactive-player omission and navigation boundaries.
- TypeScript and production build pass; existing bundle-size warning remains.
- In-app Chromium with actual QCF pages 603–604 and synthetic judge fixtures:
  1024x768, 1280x800, 1400x900, requested 393x852, and 320x568. Light/dark views
  inspected; no horizontal document overflow at the inspected sizes.
- Page navigation 603 -> 604; selecting a finding returns to 603. Only the active
  page frame occupies layout. Nested surface nodes are not separate pages.
- Selecting a word did not start playback. One audio element was mounted; Play
  recording changed paused=false and Pause restored paused=true. Leaving Review
  reduced the count to zero. Switching to a participant with no audio also yielded
  zero audio elements and cleared the inspector.
- Desktop selection: page stayed 367.0875 x 539.825, same x/y at 1280x800.
  Phone sheet open/close: page stayed 350.4 x 515.288, document top 286.8.
- Two same-word findings retained separate category, deduction, judge and notes.
  Score disclosure showed 48/50, 29/30, 10/10, Adu/Raagu 10/10; total 97/100.

Synthetic audio is a four-second tone, NOT Quran recitation or evidence that
word boundaries are correct. No physical iPhone/Safari/PWA, screen-reader,
200%-text-zoom, real-audio accuracy or complete failure-matrix acceptance claimed.
Source switching with multiple real judge recordings remains an integration gate.

## Still next

1. Direct Play word / labelled approximate preview, occurrence choice, ayah
   fallback and no-timing states through the same transport.
2. Competition recording timing integration and real-audio lifecycle/seek tests.
3. Neutral audio-coverage annotations only from adequate timing evidence; missing
   timing must not be labelled a recitation error. No automatic coverage shipped.
4. User phone visual acceptance and full integrated regression/release checks.
5. Head/Normal judge assurance and official/export workflow remain separately
   gated; no authorization policy or export format changed here.

Confidence: practicality 91/100, architecture/data safety 87/100, visual certainty
79/100. Implementation is experimental and locally tested, not visually approved,
committed, pushed or published.

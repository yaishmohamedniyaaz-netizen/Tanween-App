# Replay player layout checkpoint — 2026-09-10

Implemented locally in `codex/fixed-mushaf-replay-integration`. Not committed, pushed, or published. User visual approval is still required.

## This slice

- Retained: the existing audio element/controller, recorded-time evidence, continuous playback with its lead-in, scoring, notes, exports, and fixed Quran page geometry.
- Recomposed: compact and medium-width review uses a reserved bottom transport area. Wide desktop and short landscape keep controls in the recording column. Transport precedes selected-word details in that column.
- Removed: the phone's fixed-height, internally scrolling recording card. Recording details now participate in the passage area's scrolling content; Details scrolls and focuses that panel.
- One media element remains mounted outside the presentation portal. The portal moves controls only; no mobile copy of playback or judging state exists.
- Gated by the existing `wordReplayPrototype=1` path. No preference format changes.

## Verification

- Production build passed (existing large-bundle warning remains).
- Main suite: 380 passed, one optional asset test skipped.
- Focused integration/results/navigation/replay suites: 54 passed. Static-render tests emit React's useLayoutEffect server-render warning; this application renders this measured layout on the client.
- `git diff --check` passed; Windows line-ending warnings only.
- Real in-app Chromium browser: 320x568, 393x852, 852x393, 1024x768, and 1280x800 inspected. Compact dark and light themes inspected. No physical Safari/iPhone/PWA acceptance is claimed.
- At 393x852, tapping the saved word retained the Quran image's 334.21 x 540.65 dimensions. The dock occupied its own layout row (bottom 840, viewport 852), rather than covering the page.
- One transport and one audio element after responsive layout changes. Synthetic four-second audio continued past the selected word's 1.5-second endpoint to the recording end.
- Details kept the compact dock visible. At 320px there was no horizontal document overflow. Missing-recording participant displayed a status fallback, with zero audio elements.

## Still separate / not complete

Approximate/repeated-position feedback remains in Details. Simplifying those choices, separating loading from unavailable status, changing the replay-mode label, neutral word selection, and a specialist timing-tools surface remain later slices. Real-device playback, keyboard/screen-reader acceptance, and final visual approval remain release gates. This checkpoint is not a claim that the entire replay redesign is finished.

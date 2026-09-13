# Stable tap-open letter rail

Scope: letter selector styling only; no scoring, source text, state, preferences,
or page geometry changes. Awaiting user visual approval; not committed/published.

The pinned (tap-open) CSS allowed wrapping and centred each resulting row,
unlike the held selector. Reinstating that old CSS in an isolated browser
reproduced the second row at 390px. The fix uses nowrap, start alignment,
horizontal overflow and pan-x for the pinned rail, matching the held rail.
Letter targets remain 44px wide. Existing opening animation is retained.

Validation:
- `node scripts/qa/letter-rail.mjs`: 390x844, 430x932, 1024x768,
  1280x800, 1400x900; five words per size, up to eight/nine letters.
- Held-to-pinned rail bounds identical after animation settles.
- One row, unchanged 44px targets, last letter reachable via RTL arrow keys,
  stable rail position, Escape dismissal, no accidental marks or page errors.
- Screenshots inspected at compact and desktop sizes.
- Focused selector tests: 24 passed. Full suite: 382 passed, one skipped.
- Production build passed (existing large-chunk advisory remains).

Physical iOS/PWA touch scrolling and native fullscreen remain unverified;
viewport tests are not native-device acceptance. Existing animation has not
been removed speculatively. User visual review is the next gate.

Confidence: practicality 95/100; architecture/data safety 98/100;
visual certainty 88/100 pending user and physical-device acceptance.

# Desktop page replacement: minimal slice

Implemented locally above 4003106, preserving the unrelated microphone changes.
No commit, push or publication.

Desktop keeps its displayed page set while loading the requested replacement,
then passes artwork and semantic word data to Mushaf together. Old image URLs
are released after React commits the replacement. Cancelled loads are serialized
and disposed, and stale destinations cannot replace the latest requested set.
No speculative preloading or new cache. The shared evidence/review loader and
calibrated mobile controller are unchanged. `desktopReadyPages=0` allows direct
comparison with the previous desktop path.

Existing pending-navigation behavior closes selections and disables marking
until replacement, rather than allowing a gesture to cross page identities.
Failure retains the displayed spread and existing compact Retry status.

Browser evidence (`scripts/qa/desktop-ready-spread.mjs`):
- Settled prepared workspace screenshots byte-identical at 1024x768,
  1280x800 and 1400x900 against the old path.
- Slowed requests keep the old spread and matching page label visible.
- Rapid jumps end at the latest request; observed DOM mutations show no loading
  placeholder or incomplete/mixed spread after initial readiness.
- Failed fetch preserves previous pages; Retry succeeds.
- Marking disabled while pending; a mark after replacement records page 400.
- Test run owns two image URLs when settled, peak four during replacement.
- Mobile existing browser suite passes at 390x844, 430x932 and 320x568, including
  offline cached navigation, missing-page Retry and rotation.
- Full suite 381 pass / 1 existing optional skip; TypeScript/build pass.

Browser checks are Chromium, not physical Safari proof. User acceptance of
transition feel and further stress testing at layout boundaries remain open.
No claim of immediate uncached loading: the change removes the blank-screen
interruption, not the underlying network/decode cost.

Confidence: practicality 92, architecture/data safety 88, visual certainty 88.

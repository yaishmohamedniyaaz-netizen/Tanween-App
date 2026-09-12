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

## Follow-up: bounded desktop preparation (local, not released)

Owner reopened speed work after trying release 130. The desktop controller now
prepares the neighbouring spreads in the background, prioritising the last
travel direction. At most three spreads/six page resources are admitted,
including the active load. This is not a browser-wide memory guarantee; six
1920x3106 RGBA images alone are roughly 137 MiB before browser overhead.
Mobile's existing controller is unchanged. Only one preparation job runs at a
time, so cancellation cannot start an unbounded pile of decoders.

Already-ready neighbouring spreads are admitted together, with matching text
and geometry. The mounted spread remains pinned until React commits its
replacement. Background failures stay silent; requesting a missing spread
retries it, and a visible failure retains the current page with Retry.
No scoring, Fade, artwork or layout policy changes in this slice.

Controlled Chromium comparison at 1280x800, 80ms injected asset-request delay,
1.2-second reading pause between turns (same harness/settings):
- Baseline: 398, 419, 369ms click-to-visible.
- Prepared candidate: 151, 146, 139ms.
These include automation and rendering overhead; they are not physical device
or universal network performance claims. Distant jumps and rapid flipping
which outruns preparation still incur loading time. The tradeoff is bounded
extra memory and background reads for faster nearby turns.

Safety: controller tests cover atomic pairs, warm reuse, late cancelled loads,
failed second page, explicit retry, book ends, single pages and disposal.
Browser regression checks passed: identical settled workspace screenshots at
1024x768, 1280x800, 1400x900; slow/rapid navigation; stale marking disabled;
failed load retention/retry; next-page mark targets page400; owned image URLs
remain bounded at six. No commit/publication or physical iOS claim.

Confidence: practicality 93, architecture/data safety 92, visual certainty 90.

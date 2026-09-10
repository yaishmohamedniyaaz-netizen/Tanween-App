# PWA HTML delivery recovery

## Reproduced failure

On 2026-09-10, the v121 application JS/CSS and other hashed bundles matched
their build hashes, but the root HTML did not. The live HTML contained an
additional Cloudflare challenge-platform script. The service worker rejects
that mismatch during installation and removes its incomplete new shell cache.
This explains a missing update-ready state for affected responses; it does
not independently prove the exact state of the user's iPhone.

## Attempt and live finding

The first attempt added Cache-Control: no-transform to HTML responses,
preserving existing cache directives, status, headers and body bytes. Both
normal HTML and SPA fallback pass through the helper. Assets are unchanged.
Live v122 verification still found transformed HTML without the header. The
Sites static delivery path does not expose this Worker header on the root
response. The local header test is therefore insufficient as a release gate.

## Scoped recovery

The build now emits a content-addressed app-shell-<hash>.bin containing the
exact index.html bytes and records its URL in the pinned SW manifest. During
install, repair and missing-shell recovery, the worker downloads that opaque
asset, verifies the full SHA-256, then stores it at '/' with text/html MIME.
HTML rewriting on the normal document route cannot affect those bytes.
Corrupt or missing copies still fail closed. No unverified HTML fallback is
used by missing-shell recovery. Normal page navigation continues to serve the
already-installed shell until the browser naturally activates the update.
No forced activation, cache purge, preference migration, judging data mutation
or visual redesign is added.

Cloudflare documents no-transform as opting HTML out of automatic JavaScript
Detections injection:
https://developers.cloudflare.com/cloudflare-challenges/challenge-types/javascript-detections/#if-your-origin-sends-a-no-transform-header

## Evidence and gates

- Five focused tests cover response-byte preservation, SPA fallback,
  unchanged non-document errors, rejected injected/corrupt HTML, preservation
  of the old shell/Mushaf cache, and successful pinned install despite root
  HTML transformation, followed by natural activation.
- The lifecycle test executes the real service-worker source in a controlled
  VM with simulated CacheStorage and edge injection. It is not an iOS browser.
- Main suite: 380 pass, one optional local model asset skip. Build passed.
- Run scripts/verify-pwa-delivery.mjs against the published origin to compare
  the pinned document, every hashed application asset and every core Mushaf
  asset against the actual published service-worker manifest.
- Physical iPhone PWA activation remains user acceptance. Do not claim it
  based on unit tests or a successful deployment alone.

Confidence before live verification: practicality 88/100; data safety 97/100;
visual certainty unchanged (no UI edits). The critical remaining gate is that
the hosting edge delivers the pinned document as exact bytes.

# Normal-app and evidence connection: local review checkpoint

Historical checkpoint: the subsequent [offline/default checkpoint](./MUSHAF_OFFLINE_DEFAULT_CHECKPOINT_2026-09-10.md)
supersedes the review-switch/default and offline status below. The local app now
defaults to artwork; its compiled offline-capable preview is on port 5302.

The new renderer is connected to the real App and RecitationEvidenceSpan.
Use `http://127.0.0.1:5295/?fixedMushaf=1` on the existing local review server.
This is a whole-app review switch, not another disposable judging implementation.
Without the switch the existing release renderer remains the default. There was
no commit, push or publication in this pass; hosted review revision 4 is unchanged.

## What changed

- `ConnectedFixedMushaf` owns the visible image set inside the real viewport.
  It passes verified semantic pages into the existing Mushaf component, avoiding
  a second semantic-data request. Loading errors remove targets and retain the
  page selector plus retry. Page changes dispose of obsolete image resources.
- App uses the accepted fixed-page ratio and bottom control allocation in review
  mode, with existing preferences, score rails, prepared/live state and mobile
  controls. The compact breakpoint and viewport layout agree. Default focus is
  the existing fade preference; explicit saved choices are not overwritten.
- Page navigation skips legacy font prefetch in fixed mode. The legacy default
  path keeps its font prefetch and viewport behavior.
- Saved-evidence viewing uses the same package, source coordinates and semantic
  identities. It preserves finding buttons, counts, replay callbacks, keyboard
  focus and selected-range validation. It renders two images for a two-page
  desktop span, one on compact screens, and one paged image for longer spans.
  The full semantic range remains available to evidence/replay callbacks.
- Fixed evidence buttons stay inside their word regions. Finding-page navigation
  and focus are separate: clicking Next no longer snaps back to the currently
  selected finding's page. Late image readiness still allows finding focus.
- The design grammar records the accepted bottom row as the fixed-renderer
  replacement, while distinguishing the existing default layout.

Retained: source artwork/proportions, paper color, opening-page centering,
uniform line bands, independent findings, letter tray, scoring, export and
preference contracts. Recombined: the real viewport and existing controls.
Removed in fixed review: duplicate semantic fetch, unnecessary QCF prefetch,
and use of the old font surface in evidence. No new competition rule or zoom
feature was introduced.

## Evidence

`scripts/qa/fixed-app-browser.mjs` exercises the real App, seeded through the
existing isolated judging harness, and the real evidence component. Browser
contexts are disposable; user production storage is not edited.

49 checks passed across 1400px with left/right score rails and 390px compact:
real marking and recategorization, target identity after reload, bottom selector,
return-to-question, default fade, no horizontal overflow, evidence finding and
replay identity, evidence page navigation, a valid 30-line multi-page range,
prepared-session marking lock, corrupt image rejection and successful retry.
No browser exceptions. An initial test fixture omitted required draw metadata;
it was corrected to the existing Prepared contract, without loosening the app's
validation. An invalid 60-line test request was likewise replaced with an
existing supported 30-line request; product limits were unchanged.

All 381 existing app tests and 11 fixed-package/geometry tests passed. The
existing viewport source-contract test now checks the explicit review/default
component choice. Strict QA TypeScript and full app build passed; the existing
large-chunk warning remains. Desktop live, compact live and compact prepared
screenshots, plus evidence views, were inspected. These are browser checks,
not physical phone/tablet acceptance.

Reports and screenshots: `outputs/fixed-mushaf-source/app-browser-results.json`,
`full-tests.txt`, `app-build.txt`, `app-live-*.png`, `app-prepared-*.png`,
and `evidence-*.png`.

## Remaining release boundary

The next slice adapts the existing offline installation and service worker to
the artwork package. The old font package must not count as a complete artwork
installation. Test interruption/resume, storage limits, fresh offline launch,
old-install migration and preservation of active judging before changing the
release default. Full-package redistribution terms and physical-device checks
also remain release gates. Do not describe the review switch as offline-ready.

Confidence for this connection: practicality 95/100, architecture/data safety
94/100, visual certainty 89/100. Owner approval of the integrated app and native
device acceptance remain distinct from these local checks.

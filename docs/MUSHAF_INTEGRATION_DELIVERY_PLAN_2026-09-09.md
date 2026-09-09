# Next update: normal-app integration and reliable Mushaf delivery

Status: package, normal-app/evidence connection, verified offline downloads and
default activation are implemented locally. See the latest
[offline/default checkpoint](./MUSHAF_OFFLINE_DEFAULT_CHECKPOINT_2026-09-10.md).
Real-device acceptance and release remain open; nothing new is published.
This expands the remaining work in the practical completion plan. It does not
reopen the accepted artwork, layout or practical word-boundary approach.

## Starting point and correction

The public Stage 2 preview uses real judging components and has owner acceptance
of page accuracy and general interaction. All 604 pages passed structural word
and identity checks. Only 15 artwork pages are packaged in that preview; this
is not a complete offline installation or activation in the normal App entry.
See [checkpoint evidence](./MUSHAF_STAGE2_RESULTS_2026-09-09.md).

The owner clarified the default passage treatment: the assigned recitation
stays normal and surrounding Quran text fades. The preview currently hardcodes
`questionFocusMode="shade"`; normal device preferences already default to `fade`.
Remove the preview override and use the existing preference in the integrated
app. Preserve explicit saved preferences. With no assigned passage, the whole
page remains normal. Mistake colors and evidence must remain legible; fading
does not change which words may be judged or introduce a competition rule.

## Result of the next update

The ordinary judging app and its saved-evidence view use the approved fixed
artwork. All 604 pages are available, and the existing offline controls install
the new package with truthful progress and recovery. Existing sessions, word
and letter identities, scoring, exports and device preferences remain compatible.

Retain original artwork proportions, paper color, rounded surfaces, opening-page
centering, uniform highlight bands, letter tray and current zoom scope.
Recompose the real app's page area around its score rails and mobile controls.
Remove the preview-only toolbar, top selector allocation, duplicate page numbers
and forced passage shading from the normal integration. The selector stays
separate and compact below the pages with minimal spacing. Return-to-question
must remain available without moving the selector. No further bridge variants.

## Slice 1: one shared, complete page package

Promote the useful loading and integrity checks out of the QA harness into a
shared production loader. Do not promote its disposable session creation,
diagnostic toolbar or isolated storage assumptions.

Generate reproducible per-page artwork and geometry assets from the pinned
source and existing verified build corrections. Bind image dimensions, hashes,
geometry and semantic page identity in a versioned manifest. Validate all 604
generated pages against existing word/text/role/line IDs and verify every image
can decode. Keep source artwork unchanged; no runtime contour tracing or new
manual diacritic corrections. Confirm source provenance and applicable reuse
terms before publishing the complete package.

Use immutable, versioned same-origin asset paths. Give the artwork package its
own version; do not change the existing text version or saved question layout
identity merely because rendering changes. Measure and report actual package
bytes, including required metadata. Neither the old 50 MB font package nor the
earlier approximately 124 MB artwork estimate is the new measured total.

Load the current page or spread first. Keep decoded images bounded to a small
working set; begin with the visible pages and at most the next spread. Release
unused image resources and ignore obsolete navigation responses. Do not fetch
or decode all 604 images on first entry. A mismatched or missing page shows a
clear loading/retry state and cannot receive marks against stale geometry.

Finished when the exact generated package passes identity/integrity checks,
arbitrary pages outside the sample set load, and rapid navigation or failed
requests cannot display or mark the wrong page.

## Slice 2: replace the normal app's Mushaf surfaces

Connect the shared loader to `App.tsx`, `Mushaf` and `MushafViewport`. Check idle,
prepared and live judging, score rail on either side, single-page and spread
layouts, compact mobile controls and the existing 100-150% scale range. Keep
the accepted modest top inset and minimal bottom spacing; do not add new zoom
gestures or desktop zoom controls.

Use the same artwork and geometry in `RecitationEvidenceSpan.tsx`, which still
uses the font surface. Preserve its selected passage, finding buttons, multiple
finding counts, keyboard access and replay callbacks. Preserve its existing
page/line presentation intent using the shared source coordinates where needed;
do not change stored findings or recording-time evidence to fit the image.

Use the existing focus preference, with fade as the default. Check partial
lines, whole context lines, page-spanning passages and non-recitation headings.
Use the paper-colored overlay already available and verify that it does not
obscure selected text or actual mistake indicators. Preserve semantic text and
accessible labels behind the visible artwork.

Update the top-row wording in `DESIGN_GRAMMAR.md` to the accepted bottom control
when implementation lands. Keep one coherent previous renderer available for
release rollback; do not silently switch renderer for individual failed pages.

Finished when a real assigned question can be marked, edited, undone, navigated
away from, reloaded, exported and reviewed with the same target IDs and totals.
Desktop and compact browser inspection must show usable controls, no clipped
headings and no accidental findings from scrolling or cancellation.

## Slice 3: adapt the existing offline installation and update path

Reuse `offlineMushaf.ts`, its hook and settings controls for progress, pause,
resume, retry and removal. Extend `mushafAssets.ts` and `public/sw.js` to recognize
the new versioned assets. Do not build a second download manager.

An existing font download must not appear as a completed artwork download.
Readiness requires the matching artwork, geometry and semantic data, plus the
app resources needed for a fresh offline start. Verify assets before recording
successful installation; interrupted attempts resume by requesting only missing
or invalid files. Use the measured missing bytes for storage/progress estimates.
If later eviction or damage removes an asset, detect it and show incomplete
status/recovery instead of trusting an old completed flag.

Keep online entry usable without requiring the full download. Full offline
installation remains an explicit action through existing controls. Explain
missing pages when offline, preserve judging state, and provide retry when a
connection returns. Storage failure must never delete findings or recordings.

The current service worker immediately activates and deletes older cache
versions. Adjust that lifecycle so an update cannot replace a live judging
session's package or discard its usable assets prematurely. Pin each running
session to a coherent package; activate the new app/package at a safe idle
boundary. Verify the replacement before marking it ready. Retain the last
usable package through transition, then remove obsolete app-owned assets only
when no active client needs them. Account for temporary double storage; report
insufficient space rather than silently deleting the working installation.

Finished when a download survives interruption and reload, damaged files can
be repaired without a full redownload, and a fresh offline launch reaches early,
middle and late pages. An update from the previous installed app must preserve
an active session, saved findings and truthful installation status.

## Release checks and delivery order

1. Run scoped loader, geometry, focus, judging and offline tests as each slice
   lands. Reuse existing audits; no full-corpus pixel analysis.
2. Validate the exact 604-page package and a representative browser journey:
   opening pages, surah start, dense lines, short words, spread transition,
   question fade, saved evidence, export and offline recovery. Compare repeated
   navigation memory/loading behavior with the current preview; fix sustained
   growth or stalls, not speculative performance issues.
3. Run proportionate full-app validation and review the complete dependency
   diff. Build from a scoped clean release checkout so unrelated work cannot
   enter the preview. Test old-install upgrade as well as fresh installation.
4. Present one integrated preview for the owner's review. After the applicable
   visible-change gate, commit, push and publish the exact validated source to
   the review site, then verify its hosted assets and interactions. Existing
   authorization for the review site is not production-release authorization.
5. Check touch, scrolling and fresh offline launch on the intended physical
   phone/tablet before claiming device readiness. Record devices actually
   tested. Production publication follows its separate authorization and
   retains a verified rollback to the previous coherent release.

The owner subsequently authorized implementation. Work started with Slice 1
and continues in bounded slices rather than another open-ended research round.
The document alone does not authorize production publication.

## Trade-offs and remaining uncertainty

The gain is stable page artwork with one coordinate system and consistent
judging behavior across live and saved views. Costs are a larger installation,
some initial page loading and a real offline-update migration. Ordinary word
body taps remain the target; a rare projecting vowel can belong to the adjacent
tap region under the accepted policy. This does not change the artwork or IDs.

No border redesign, Unicode mode, new pinch gestures, exhaustive manual pixel
correction or certification against a specific physical printing belongs here.
Physical 1405 print identity and native-device readiness remain separate,
unverified claims. The final package size and target-device behavior must be
measured, not inferred from the successful sample preview.

The earlier roughly 60% completion figure is a planning estimate, not a measured
metric. Planning this update does not increase it. Report completion by these
three slices and the release gate, distinguishing local, preview and production.

Plan confidence: practicality 94/100; architecture/data safety 92/100; visual
certainty 84/100. The approach is practical and grounded in existing components;
the real app shell and fade treatment still need browser evidence. These scores
are judgments, not test results or claims that offline migration is already safe.

# Complete artwork package and shared loader: local checkpoint

The first implementation slice of the integration/delivery plan is working
locally. Normal App activation, evidence-view replacement, offline installation
and safe service-worker migration are still outstanding. Nothing was committed
or published in this pass; the hosted review remains revision 4.

## Implemented

- Downloaded and fully decoded all 604 unchanged 1920 x 3106 PNGs from the
  reviewed `quran/quran-ios` revision
  `422ece54cee15d474654dc11466f8e2f0e39c3e6`. Previously reviewed sample hashes
  match. Fetching is resumable and the source manifest records each URL/hash.
- Generated immutable per-page geometry, artwork and semantic text assets.
  All 77,433 recited word body anchors and 6,444 inactive markers were checked
  against the existing page data. Text version and question identities did not
  change. Build-time regions ship directly; no contour calculations in the UI.
- Added a shared hash-checking loader and React page-set owner. Only requested
  images decode; navigation, abort and failure release owned blob URLs. Retry
  clears a rejected manifest request. Corrupt content cannot enable marking.
- Connected the local real-judging QA harness to that loader and all 604 pages.
  Normal App remains on its previous renderer pending the remaining slices.
- Changed the local preview default to fade. The fade is a separate paper wash
  behind interaction overlays, so it does not reduce finding-control opacity.
  Without an assigned passage, the page stays normal. No spacing changes.

Package `1405-artwork-5a5f9f3846158475`:

| Content | Exact bytes |
| --- | ---: |
| Artwork | 118,203,707 |
| Complete page package, including manifest, geometry and semantic data | 142,126,684 |

The complete package is about 142 MB decimal / 135.5 MiB. This excludes the app
shell and other app features. It is not yet an offline download offered in the
normal settings screen. Source URLs establish provenance; full-package artwork
redistribution terms remain to be confirmed before publication.

## Verification

- All 604 images fully decoded by the build acquisition check.
- All 604 pages passed semantic correspondence and ordinary body-target checks.
- Rebuilding produced the identical package version and manifest SHA-256:
  `517acf6a4190afa4b52c787030429ade2ae066aef19a8d7ea3524f080f01431d`.
- 11 focused geometry/package tests passed: integrity, byte totals, arbitrary
  pages, corruption, retry, abort and resource cleanup.
- Existing real-judging browser suite: 121/121 passed; edge suite: 21/21 passed
  after updating fault injection to the new immutable asset paths.
- New package browser suite: 24/24 passed at 1400px and 390px. Pages 4, 178,
  400 and 602 loaded beyond the old sample set. Navigation retained one owned
  image for a single page and two for a spread. This checks ownership, not a
  physical browser's total memory usage. It did not download the full corpus
  automatically. New-page marking and fade/default behavior passed.
- Desktop and compact fade screenshots were visually inspected. Full app
  type/build checks passed with the existing large-chunk warning.

Evidence: `outputs/fixed-mushaf-source/package-report.json`,
`browser-results.json`, `package-fade-1400.png`, `package-fade-390.png` and the
existing integration reports in `outputs/mushaf-word-boundary-2026-09-09/`.
Browser emulation is not physical-device or offline acceptance.

## Reproduction and next slice

`scripts/fetch-fixed-mushaf.py` uses Python with Pillow (the existing local
study dependency directory is supported). `npm run data:fixed-mushaf` builds
from that download and the existing audited `practical-source-corpus.json`.
The corpus's SHA is recorded in the manifest. Retain those audited build inputs
when preparing the scoped release checkout; the app itself never loads them.
`npm run test:fixed-mushaf` runs the focused checks after package generation.

Next: use the shared package in the normal app and saved-evidence surfaces,
then adapt existing offline progress/resume and service-worker update behavior.
Do not publish an App-default switch with the old font-only readiness label.
Before any preview build, include the new versioned package path: the old
15-image copy recipe is no longer sufficient for the updated QA harness.

Confidence for this local slice: practicality 95/100; architecture/data safety
93/100; visual certainty 89/100. Remaining release gates have not passed merely
because the package loader passes its local tests.

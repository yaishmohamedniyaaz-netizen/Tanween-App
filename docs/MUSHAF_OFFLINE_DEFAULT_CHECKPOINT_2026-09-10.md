# Offline downloads and default activation: local checkpoint

The approved fixed artwork is now the normal app and saved-evidence default.
The explicit `?fixedMushaf=0` route retains the legacy renderer for rollback
checks. No commit, push or publication was performed in this pass. Public review
revision 4 and production remain unchanged.

## Implemented behavior

- The installed app's existing download controls install all 604 pages. A page
  counts as ready only after its image, geometry and semantic files pass integrity
  checks and are stored. Old font downloads never count toward this package.
- Pause, reload and resume preserve verified progress. Missing or damaged files
  are fetched again individually. Ordinary viewing also stores verified pages.
- Completion additionally requires the manifest and a working, matching cached
  app shell. A missing app file prevents a false completed status and can be
  repaired online. Existing semantic-data consumers can read the same package
  offline without a second full semantic download.
- The package is 142,126,684 bytes; the interface displays about 143 MB, plus app
  files. Free-space checks use the actual missing bytes with a margin. Insufficient
  space produces an error without deleting earlier downloads or judging records.
- Updates wait until all controlled app windows close. Failed installation keeps
  the previous app. One previous app shell and prior Mushaf/font caches are kept;
  this intentionally requires additional storage during migration.
- Removing the current download retains its manifest and core page 604. It does
  not remove judging records. The UI disables removal during a live session.
- The accepted artwork proportions, paper color, compact bottom selector and
  existing fade preference remain. No new spacing correction system was added.
  Scoring, word identity and device-preference versions were not changed.

## Verified evidence

- 381 app tests passed: `outputs/fixed-mushaf-source/offline-full-tests.txt`.
- 29 compiled-app offline/update checks passed:
  `outputs/offline-validation/browser-results.json`. These cover interrupted
  download, reload/resume, all-page installation, offline reopening, corruption,
  missing manifest/app files, two-window updates, and removal. A real finding,
  active question and judging history survived closing windows, updating and
  reopening offline.
- 7 previous-worker migration checks passed:
  `outputs/offline-validation/legacy-browser-results.json`. This uses the actual
  previous app-v29 worker with the local test app, not a reconstructed old UI.
- 49 connection checks passed earlier in this pass:
  `outputs/fixed-mushaf-source/app-browser-results.json`.
- Production download/pause/resume controls passed at 1400px and 390px with
  installed mode emulated. Both screenshots were visually inspected:
  `outputs/offline-validation/controls-results.json` and
  `download-controls-{1400,390}.png` in the same directory.
- Production build and diff whitespace check passed. Existing large bundle
  warning remains. Build log:
  `outputs/fixed-mushaf-source/offline-production-build.txt`.

The compiled local preview is `http://127.0.0.1:5302/`. Dev-server behavior is not
the offline release test. QA globals are confined to the separate local harness.

## Remaining release work

Real installed iOS/Android acceptance, OS-driven storage eviction and native
offline reopening have not been certified by these Chromium tests. Confirm
source artwork redistribution terms before publishing the complete package.
Literal comparison against a physical 1405 print remains distinct from the
verified package integrity and accepted preview appearance. Review the scoped
diff and approved dependency set before commit, push, publication and hosted
verification; preserve unrelated working-tree changes.

Confidence judgments: practicality 95/100; architecture/data safety 94/100;
visual certainty 89/100. These reflect the evidence above, not real-device or
publication approval.

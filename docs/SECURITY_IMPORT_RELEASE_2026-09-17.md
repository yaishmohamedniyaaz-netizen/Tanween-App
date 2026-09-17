# Import security and validation workflow

Base: Tanween release source `70a1f98` (runtime matches published `ca19494`).
This is a source-validation record, not proof of a production deployment.

## Change

The spreadsheet reader now uses the official SheetJS 0.20.3 artifact, with a
pinned URL and lockfile integrity. XLSX, legacy XLS and CSV intake remain.
No other dependency version was deliberately upgraded.

Backup validation checks scalar/container types and saved evidence before
restoration. Optional fields remain optional for supported legacy backups.
Normalization runs inside the existing Settings error boundary before the
restore preview. Invalid imports must not reach the reducer or replace current
state. Existing confirmation and safety-download behavior is retained.

There are no layout, CSS, Quran, scoring, assignment, storage-key or schema changes.
This bounded validation does not authenticate judge records and is not exhaustive
validation of every nested setup field.

## Validation

- Seven focused security tests pass, including unchanged fixtures generated with
  SheetJS 0.18.5. Arabic/Dhivehi names, leading-zero numbers and optional fields
  survive XLSX/XLS/CSV imports.
- Standard suite: 394 passed, one optional asset test skipped, zero failed.
- Fixed-Mushaf suite: 14 passed. Compact calibration suite: 20 passed.
- Production build passes with the existing large-chunk warning.
- Production dependency audit reports zero findings. Development-tool findings
  remain separate; this is not an all-dependency security clearance.
- Isolated Chromium sessions at 1440x900 and 390x900 compare the original and
  patched Data and Recovery view: screenshot bytes are identical at each size.
- Actual Settings file input: valid preview/cancel preserves current state;
  malformed fields/history and migration failure produce the existing error;
  confirmed valid restore downloads a safety backup and persists across reload.
  No page errors occurred in the successful run.

The browser fixtures use synthetic data in separate local origins. No real
participant data or recordings were used. Physical devices, complete offline
operation and microphone/playback behavior were not retested for this slice.

## Workflow and publication boundary

The separate workflow commit adds `Validate app`: npm ci, the standard suite,
fixed-Mushaf tests, compact tests and a production build, with no deployment
secrets. Actions are pinned to upstream commit SHAs and token access is read-only.

The previous combined workflow's observed failure was missing Cloudflare
deployment credentials after successful build/tests. Its replacement retains
Cloudflare deployment only as a manual action requiring the selected exact SHA
and explicit confirmation. The Sites publication path is unchanged.

An independent Cloudflare Workers Builds integration also creates branch previews.
The dashboard requires authentication to inspect its production triggers. Do not
assume that changing GitHub Actions controls that independent integration. Merge
and publication must wait until that boundary is understood; no production
deployment is recorded by this document.

Required-check enforcement follows a passing live PR run and installation of the
workflow on main. Do not require a check that other PRs cannot yet execute.

Confidence: practicality 97/100; architecture/data safety 95/100 for the bounded
import change; visual preservation 98/100 for the two tested Settings viewports.
No whole-app or physical-device visual approval is implied.

References:
- https://docs.sheetjs.com/docs/getting-started/installation/nodejs/
- https://docs.github.com/en/actions/reference/security/secure-use

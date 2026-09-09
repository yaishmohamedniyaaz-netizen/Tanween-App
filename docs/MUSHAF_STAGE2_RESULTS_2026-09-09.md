# Stage 2: real judging integration, local checkpoint

## Subsequent public preview publication

The owner explicitly requested publication. The same integrated preview is now
public at https://tahqeeq-mushaf-review-sep09.yaish.chatgpt.site/scripts/qa/fixed-mushaf.html?review=4 .
The exact review origin is allowed in the preview guard. An isolated static
build includes its 15 images, bound manifest, public page data, question index
and UI/Arabic fonts. Existing older review routes remain available.

Review-site commit: `a841623c5b8f9f92f924da31fb896d6af98b411f`.
Sites version 4: `appgprj_6aa1553efc4081919533ddd9a616134e~appgver_53a403df66608191b374156a892e858b`.
Deployment `appgdep_6aa180292e208191ae98c1a7cf8afd56` succeeded.
Anonymous hosted browser checks at 1400px and 390px verified artwork, actual
marking and navigation to p412 without browser errors. The main app was not
published. Earlier local-only status below describes the preceding checkpoint.

## What changed

The owner asked to begin Stage 2 and save the clear communication preference.
The preceding turn changed the plan only, so the practical-selection prerequisite
was implemented first. No further detached-contour research was undertaken.

`fixedMushafGeometry.ts` now builds deterministic reading-order word regions
from existing body data. Gaps use shared boundaries; overlapping envelopes use
the division between body centers. Source IDs/text/line/role/ayah must match the
existing page before input is admitted. Marker cells remain inactive. Earlier
verified body corrections and the p254 split are retained as build data; tiny
fragment override masks are not part of the new path.

The source-coordinate sweep covered all 604 pages: 77,433 recited words and
6,444 non-recited markers. Every recited body center selected its own word,
with no missing/duplicate IDs, reversed-center failures or invalid generated
regions. One region is narrower than the diagnostic 8px threshold at a 350px
artwork width: p380 `27.40.25`, 7.65625px. Its coordinate tap opened the correct
letter tray in the compact browser test. This is not a physical-finger usability
guarantee, and body-center tests do not certify every visible letter contour.

`Mushaf` now accepts an explicit optional `fixedPages` integration input. When
supplied it uses the new fixed image surface, uniform line bands and practical
regions while retaining its existing letter tray, commit/undo callbacks,
semantic target generation and judging store. Without that input the old
renderer remains the default. `App.tsx` does not yet enable the fixed renderer.

The viewport accepts an explicit page ratio and bottom-navigation allocation;
existing callers retain their original defaults. The fixed surface keeps
#fbfaf7 paper, rounded corners, modest inset, one shared image/region scale and
the separate compact bottom navigator. Pages 1 and 2 translate the complete
composition vertically using measured source alpha bounds. No source image,
letter spacing or semantic Quran text is rewritten. Question shade bands were
adapted to avoid obscuring the image; compact fitted sizing and the current
100-150% scale range are exercised without introducing a new zoom feature.

## Local integration harness

`scripts/qa/fixed-mushaf.html` runs the actual `JudgingProvider`, `Mushaf`,
`MushafViewport`, `PageNav`, `MistakeLog` and session exporter on isolated
`127.0.0.1:5295` storage. It creates disposable fixture sessions through the
real reducer, including a versioned question range. It does not copy the old
proof's custom marking store or load the user's production-origin sessions.

The development-only harness binds its source manifest and images to SHA-256
values, decodes and verifies the requested image dimensions, loads only the
requested one/two pages, rejects stale results and releases blob URLs on cleanup.
It currently includes 15 sample images. Unavailable sample pages are explicit
errors, not silent typography fallback. Manifest and image mismatch tests
exercise failure plus successful retry. This loader still belongs to the
development harness, not the production offline package manager.

The preview toolbar is diagnostic UI. It is not the proposed final product
toolbar, and its extra controls should not be copied into the judging screen.

## Verification

- `check_practical_geometry.mjs`: all 604 pages, all recited body centers,
  semantic correspondence, markers and generated geometry passed. The narrow
  target report remains available rather than being hidden by padding.
- `test_integrated_mushaf.mjs`: 121 checks passed at 1400x900, 1024x768,
  390x844 and 844x390. Three complete pages (254, 293, 412) used actual word and
  letter selection, independent findings, in-place category changes, navigation,
  reload, real downloaded session JSON, score/history comparisons and undo.
- `test_integrated_edges.mjs`: 21 checks passed. Browser touch input opened the
  correct target; active cancellation, second-touch cancellation and actual
  container scrolling created no findings. Opening compositions were centered;
  the narrow p380 word and p50/51 spread were inspected. Invalid manifests/images,
  recovery and late page results were checked. No browser exceptions recorded.
- Five new geometry/fit unit tests and 37 existing focused fit, geometry,
  ledger, migration and question-evidence tests passed.
- Scoped strict TypeScript, the app build and diff whitespace checks passed.
  The build retains its existing large-chunk warning. These checks do not claim
  full offline or physical-device readiness.
- Desktop, compact, opening-page and spread screenshots were visually inspected.
  A real in-app browser tab also loaded the integrated screen and opened a test
  session. Browser touch emulation is not an iOS/Android device test.

Evidence: `outputs/mushaf-word-boundary-2026-09-09/` contains
`practical-geometry-results.json`, `integrated-results.json`,
`integrated-edge-results.json` and `integrated-*.png` screenshots.

## What remains

Stage 2's core judging flow now works in the local integration harness. Before
calling Stage 2 complete, connect the verified loader/renderer option into the
normal App entry and check its actual score-panel placements, prepared/live
question flows, Return to question, all existing question-focus settings and
compact control ownership. Reuse this implementation; do not start another
renderer or pixel-correction project.

Stage 3 remains: full image delivery, bounded caching, installation/recovery,
fresh offline launch, provenance/reuse-term closure, device/performance checks,
integrated owner acceptance and authorized release. Exact physical-edition
identity remains a separate reference-based acceptance claim.

Nothing was committed, pushed or published in this slice. The public six-word
preview and production site remain unchanged. Existing unrelated work is retained.

Confidence for continuing integration: practicality 94/100, architecture/data
safety 95/100, visual certainty 86/100 for this preview. Full release readiness
is not implied by those scores.

## Communication skill

Created `C:/Users/idraw/.codex/skills/clear-project-updates/SKILL.md` as a small
discoverable skill. It asks for plain English, clear completed/remaining status,
practical trade-offs and honest distinctions between local, preview and production.
The skill-creator validator passed. No memory registry was modified.

## Reproduction

Use the bundled Python runtime with `tmp/mushaf-study-python` for the build-time
Pillow dependency. Run `build_practical_data.py`, then the Node
`check_practical_geometry.mjs`. Start Vite with
`--config scripts/qa/fixed-mushaf.vite.ts`, and open
`http://127.0.0.1:5295/scripts/qa/fixed-mushaf.html`.
Run the two integrated browser scripts and `scripts/fixed-mushaf.test.mjs`.
The harness has an exact development-origin guard and must not be published as
the main app. Generated source data still depends on the pinned local research
inputs; consolidate those inputs in Stage 3 rather than silently fetching latest.

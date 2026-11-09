# Mapping continuation validation

Date: 9 November 2026. Branch: `codex/digitalkhatt-pages`, continuing local audit
commit `d174b92`. This is research evidence, not Checkpoint 1 completion or a UI
release. The original Phase 0 evidence is preserved byte-for-byte.

## Verified checks

- All 604 pages and 77,433 unique word IDs paired by physical line/read order.
  All 293 strict notation exceptions are explicitly classified and fingerprinted.
- The PDF source-span audit covers all 298,431 app targets with no unresolved or
  shared assignments. 757,512 corpus glyphs have one target; 4,358 decorative
  waqf glyphs intentionally have no target. No runtime assignment file is shipped.
- Two independent executions of `checkpoint_research.py` produced byte-identical
  copies of all nine generated reports listed below. Both commands completed.
- 39 Python tests passed, including the pinned-PDF integration tests. No skips.
- Node 22.18.0: `npm test` passed 497 tests, failed zero, and retained one explicit
  existing optional Tilawa-assets skip. `npx --no-install tsc -b` and
  `npm run build` passed. Existing large-chunk and npm proxy notices remain.
- `node --check scripts/digitalkhatt/measure_svg_browser.mjs` passed syntax check.
- No changes to `src/`, `public/`, the original prototype, saved marks, scoring,
  competition rules, target rules, or the prior underline research branch.

## Deterministic report hashes

Report | SHA256
--- | ---
parity.json | `f58827882fc12877ba6b7e72ce437a1c3637c595e0ea2bdeec89b6398763768b`
PARITY.md | `fb57b4fff66c66bf3de45479eb04a48dab9ad8b65547e3bc85285e2c592ffe7f`
PARITY_DETAILS.md | `a5dcc5aa4f2ab81c2f6676d88235b1d56d38e795d3b3a9865f6ad900ba797da9`
word-mapping.json | `bf5b836a6ac8b686e64398cf7b00391a8f026add6a38181a09ee9052377e13aa`
WORD_MAPPING.md | `aa962fa218141fd926fa0ea39d713cde3117512afd5aeded07ae34921d912019`
mapping.json | `6ce684aabbd2e24dea0b2fed78bf2acfc951a5ee51c9d528480982dd8f8256f5`
MAPPING.md | `cc0fa8e54c5bb3731319ea888f29b97a695fd2d0d9788e82e906815f78322ad4`
svg-research.json | `b19aec226ebe14c1706684e88f299e775e125f623d329759ad5cded6205a8d96`
SVG_RESEARCH.md | `59f00d5443db71f70e540f548b68e41bfe4350cebc216ca46a90624ded2e54d6`

## Independent review and limits

An independent reviewer checked all exception directions, all-page next-word
context, zero-ink omissions, off-frame declared bounds and representative mark
ownership. The review caught stop signs being included as colorable letter ink;
they are now decorative with no target. The reviewer independently verified the
fix. The final repeated totals above include it.

Page 1's missing SVG use is a genuinely empty space, not missing Arabic ink.
Page 187 has the same class of zero-ink omission. Local PDF/SVG raster inspection
covered pages 1, 2, 293 and 582 plus ownership crops. Those images are not shipped.
Three out-of-frame declared boxes remain explicit diagnostics, not clipped data.

Chromium first-paint testing was attempted but could not start because this
executor denied IPC socket creation. An approved elevated attempt returned the
same failure. No attempt bypassed that restriction. Consequently no browser
timing, Safari/iPad test, tablet performance, app switch, offline integration
or all-page visual approval is claimed. The later source-only color sheets
below do not replace those browser and app checks.

PDF reuse rights remain unclear. The independent licensed-source engine route
is documented separately in [PIPELINE_FEASIBILITY.md](PIPELINE_FEASIBILITY.md);
its native glyph indices and geometry must be validated separately from the PDF
audit. Source coverage is not proof that every rendered outline can be colored
correctly without overlap.

Confidence: practicality **97/100** for correspondence/source-span research;
architecture/data safety **97/100** with protected contracts unchanged;
visual certainty **75/100** for sampled ownership, below production approval.

## Native source and visual-proof completion

The independent fitted native mapper subsequently covered all 298,431 targets
with nonempty glyph evidence and no unresolved/shared assignments. There are
757,526 visible owned glyphs, 4,358 decorative waqf glyphs and 5,860 empty
word-internal placeholders; the latter two groups deliberately have no target.
Independent reruns reproduced the native JSON/Markdown. Native generation
reproduced its binary, sidecar and placement stream across three fitted runs.
The machine reports identify the exact native source/profile hashes.

The final source test suite passed 29 tests: 14 native mapping, 11 color linkage
and four output-safety tests. Combined with the 39 core research tests, 68 focused
tests passed. These are not browser or physical-device tests.

Fourteen source-only color sheets contain 254 distinct words. Their 14 SVGs,
14 PNGs and manifest reproduced byte-for-byte. A nine-page source-body comparison
PDF was rendered, visually inspected and reproduced byte-for-byte; all 18 input
images stayed unchanged. See COLOUR_PROOF.md and the task handback for exact
scope and hashes. No PDF-derived outlines were used in these new source proofs.

Additional report hashes:

Report | SHA256
--- | ---
native-mapping.json | `0fc9df8a60e89ee04c46eca48adddc4f808c6782edd08e3ec1e15302cee4abf1`
NATIVE_MAPPING.md | `ccabdf336d32e0366ae3bd8d7e10b10dcd07e269047742da955a0948cedecea5`
native-pipeline.json | `a95976255b0eae9d8afac7736d3d1e13bf1d2594d0871d2ca622f00712d49ee2`

Original native-frame clipping and the separate +120-unit padding candidate
remain documented; no page-frame production decision is implied. Headings,
actual app integration, broader color approval and browser tests remain open.

## Cost record

Work was split across word mapping, glyph ownership, source-engine feasibility
and independent reviews, followed by integrated validation. The final aggregate
was executed twice; full app tests, TypeScript and production build were rerun.
Development probes and earlier all-page iterations also ran. Total wall time and
token counts were not instrumented; no precise aggregate cost is claimed.

# Third bounded interaction case: page 412

Latest: [next implementation results](./MUSHAF_NEXT_IMPLEMENTATION_2026-09-09.md).
The six-word probe was subsequently published publicly; its expanded
262-check browser regression now passes, including exact p412 fragment
targeting and compact viewports. Earlier open-test statements below are
historical, not the current validation status.

## Change

The local boundary probe now has six experimental word targets on three
pages. Added `31.17.1` and `31.17.2` using unchanged page 412 artwork and
existing semantic/letter identities. The public review site has not been
updated in this slice; it still contains the previous four-target version.

Pinned upstream `Page.pm` specifies `int(1920/21)=91` points and a rendering
resolution of 96 by 94 DPI. A separate eight-case fit uses those source
parameters (121.333 horizontal pixels, vertical ratio 94/96) instead of
optimizing scale freely. This places p158's previously drifting projection
onto its six-pixel source island, and independently supports the positions
of all five isolated fragment candidates. PIL is not the original GD rasterizer;
the source-scale fit is additional evidence, not pixel-identical reproduction.

For p412, the main body fits with correlation 0.9495. Its remote contour
projects to the isolated, fully opaque ten-pixel island at x=306..307 and
y=2097..2101. The bounded prototype assigns this exact 2x5 region to the
source word, without padding or enlarging the highlight wash. This is an
experimental ownership policy consistent with the earlier p293 case.

The two main regions share a y band of 2053.5..2245.5 derived from neighboring
source rows. Their inner division x=538 lies in source columns 535..540,
which are entirely transparent over y=2070..2239. Outer ends are presentation
candidates, not anatomical ink claims. Markers remain non-selectable.

## Validation

- 23 data checks passed: existing identities, unchanged image, equal row
  heights, transparent split, exact fragment pixels, correct geometric hit
  precedence, neighboring positions and compiled geometry hash.
- The earlier 13 source/shape/pixel checks passed again.
- Strict scoped TypeScript and isolated Vite build passed.
- In the Codex in-app browser: p412 loaded; each body opened the correct
  letter tray; separate Khafi and Jali sample marks retained `31.17.1@r0`
  and `31.17.2@r2`; both survived reload and could be removed independently.
  Earlier p254 and p293 loaded correctly with the expanded integrity package.
- A desktop screenshot was inspected: main highlights have equal heights,
  the divider separates the intended words and the artwork is unchanged.
- A visual coordinate click near the subpixel fragment selected the neighbor;
  it does not establish that the exact fragment received a browser pointer.
  Exact fragment precedence is currently verified at data level, not claimed
  as a completed subpixel browser or physical-touch check for p412.

The old 166-check suite was not rerun in this slice and its results must not
be represented as validation of the expanded six-target build. Compact/device
checks and full gesture regression of this expanded package remain to do.
Production source, assets, preferences and judging ledger are unchanged.

## Next

Complete expanded browser regression including exact fragment targeting and
compact viewports before publishing this updated probe. Keep p11, p53 and
p485 remote contributions unresolved: their windows reach larger marks and
cannot be assigned wholesale. Other isolated candidates can follow after
their complete word-pair geometry is verified. Do not enable entire pages.

Evidence: `fragment-source-scale-registration.json`,
`page412-probe-verification.json`, and `public/boundary-probe-v1.json` in the
existing isolated proof folders. Source images/fonts remain hash-bound.

Confidence: practicality 95/100, architecture/data safety 93/100, visual
certainty 83/100 pending expanded compact/browser checks. No production
readiness or final physical-edition fidelity is claimed.

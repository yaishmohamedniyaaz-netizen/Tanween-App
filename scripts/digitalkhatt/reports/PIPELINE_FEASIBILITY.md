# PDF-independent DigitalKhatt pipeline feasibility

Source-generation research completed, 9 November 2026. No production assets or runtime files changed.
No sample-PDF contours were used in the source probe. No unlicensed analyzer used.

## Current finding

A PDF-independent route exists. The official native generator can evaluate the
OFL font's real MetaPost outlines and export positioned whole glyphs. Its own
layout is the target; fitting outlines to artwork is neither necessary nor proposed.
The official website also supplies a separately licensed full old-Madina source
corpus and TypeScript justification implementation. Full native generation and repeatability are now proven on all 604 pages. Browser rendering, complete decorative resources and the owner’s visual approval remain open.

## Pinned sources and licence boundaries

- Font: [oldmadinafont adc60f3865b507684bda856d59940a7f3602be32](https://github.com/DigitalKhatt/oldmadinafont/tree/adc60f3865b507684bda856d59940a7f3602be32), [SIL OFL 1.1](https://github.com/DigitalKhatt/oldmadinafont/blob/adc60f3865b507684bda856d59940a7f3602be32/LICENSE). Preserve notices and font naming obligations for modified font software. Credit DigitalKhatt, OFL 1.1, sponsored by Tarteel.
- Engine: [VisualMetaFont 220658be8bad76cfe628ddf0e903c5a86e454e4f](https://github.com/DigitalKhatt/visualmetafont/tree/220658be8bad76cfe628ddf0e903c5a86e454e4f), [AGPL v3](https://github.com/DigitalKhatt/visualmetafont/blob/220658be8bad76cfe628ddf0e903c5a86e454e4f/LICENSE). Section 2 distinguishes program execution from covered output; using the generator does not automatically license every output under AGPL. Conversely, copied engine code, resources and fonts retain their own obligations. Build-time-only separation is a promising architecture, not a legal clearance.
- HarfBuzz submodule: `38258fac64114c8a9ffcc778224598c475571866`, explicitly pinned by that engine tree. Use its own notices; do not describe all dependencies as AGPL.
- Website: [digitalkhatt.org 4213fab9892774f74f7164c70a70dd84a14f0215](https://github.com/DigitalKhatt/digitalkhatt.org/tree/4213fab9892774f74f7164c70a70dd84a14f0215), [MIT root licence](https://github.com/DigitalKhatt/digitalkhatt.org/blob/4213fab9892774f74f7164c70a70dd84a14f0215/LICENSE). [Old-Madina corpus](https://github.com/DigitalKhatt/digitalkhatt.org/blob/4213fab9892774f74f7164c70a70dd84a14f0215/ClientApp/src/app/services/quran_text_old_madinah.ts) has no separate file notice or exception. Root MIT is the located grant, not a guarantee about every upstream contributor's rights. Preserve its copyright/permission notice. Embedded WASM and third-party code must not be relabelled MIT merely because bundled there.
- The sample PDF's separate reuse grant remains unclear; see LICENSING.md. These findings do not clear it for shipping.

## Independent measured probe

The reproducible [source probe](../source_pipeline/README.md) reads only the official website corpus, app JSON and pinned
OFL OTF. System HarfBuzz 10.2.0 performs default shaping; fontTools 4.61.1 exports
source-font paths. No new third-party shaping binary was installed.

| Measurement | Result |
| --- | --- |
| Official website pages | 604 |
| Body words / lines after explicit non-word exclusion | 77,433 / 8,820 |
| Per-body-line word-count mismatches against app | 0 |
| Strict skeleton notation differences | 293, on 222 pages |
| Differences remaining under existing hamza diagnostic | 0 |
| Default-shaped glyph placements, including headings | 850,414 |
| Missing `.notdef` placements | 0 |
| All-corpus shaping plus comparison loop | 2.409 seconds, one run |
| Page 3, first line | 99 placements / 42 distinct glyphs |
| First-line source-outline SVG | 63,248 bytes raw / 13,763 gzip-9 |

Exclusions are explicit: `سُورَةُ` heading lines; standalone unnumbered basmala;
ayah tokens; rub-el-hizb and sajda ornaments. The initial probe counted two
ornament tokens as words; fixing that classifier produced the exact 77,433 count.
This is independent textual/count evidence, not proof of identical geometry,
letter ownership, religious proofreading or approved notation migration.

The SVG contains actual OFL font outlines at default HarfBuzz positions. It has
not run the official line-justification policy. It is not a checkpoint page,
not a production renderer, and not a browser first-paint measurement.

| Source asset | Raw bytes | gzip-9 bytes |
| --- | ---: | ---: |
| pinned oldmadina.woff2 | 531,000 | 526,621 |
| pinned oldmadina.ttf | 2,574,752 | 501,203 |
| pinned oldmadina.otf | 1,728,016 | 756,231 |
| website hb.wasm | 345,204 | 136,194 |
| website VisualMetaFontWasm.wasm | 4,123,031 | 1,721,043 |
| website old-Madina text TypeScript | 1,556,898 | 306,315 |

These are individual file sizes, not complete application bundles. WASM files
were measured as bytes, not executed or approved for distribution. OTF and TTF
have no `fvar` axis table in this pin; arbitrary live MetaPost parameter variants
cannot simply be presumed present in those static font files.

## Route B: official generator and source contours

[Native CLI documentation](https://github.com/DigitalKhatt/visualmetafont/blob/220658be8bad76cfe628ddf0e903c5a86e454e4f/lib/digitalkhatt/docs/generate-mushaf.md) and
[implementation](https://github.com/DigitalKhatt/visualmetafont/blob/220658be8bad76cfe628ddf0e903c5a86e454e4f/lib/digitalkhatt/tools/generate_mushaf.cpp) establish:

- Qt-free CLI; C++23 compiler, CMake, Ninja, Flex, Bison, SQLite development headers/library and pinned custom HarfBuzz.
- Font plugin compiled alongside `oldmadina.mp`, `glyphs.mp`, `features.fea`, `parameters.json`; source font alone is insufficient.
- Source line shaping/justification and optional XPBD mark adjustment, using saved settings or explicit flags.
- `--no-pdf --layout-binary PATH` can export direct whole-glyph DKLY v4 plus text/glyph-name/baseline sidecar. `--placement-data PATH` streams shaped/final placement JSONL.
- Binary exports must start at page 1. Use `--pages 1-3` for a first test, then `1-604`; isolated p582 binary export is rejected.
- Exported surah headings use ID zero and need a separately licensed heading treatment. Do not silently ship the sample-PDF heading resources.

Read the pinned [writer](https://github.com/DigitalKhatt/visualmetafont/blob/220658be8bad76cfe628ddf0e903c5a86e454e4f/lib/digitalkhatt/src/otlayout/Layout/WholeGlyphLayout.cpp), not just the older format table: version 4 now includes `pageWidth` and `lineSpacing` uint32 fields directly after the version. The version number was not bumped. Page height and explicit line baselines are not in the binary; retain the sidecar/settings. Variants include the complete parameter vector and are generated from `GlyphVis::mpPath()` directly, not interpolated from static master outlines.

The source checkout excludes `src/Resources/quran-data.sqlite` in `.gitignore`.
The native query requires `qpc_v1_layout(page,line,type,range_start,range_end)`
and `words(word_number_all,dk_v1)`. A source-only adapter can populate these from
the MIT website corpus, but must validate native corpus assembly. The current
native source performs extra normalization, has a page-213 assembly special case,
and differs from the older website in first-page/short-line width constants.
Therefore website layout and native layout must not be claimed identical.

Native dependencies pinned in CMake include PDF-Writer v4.9.0, Clipper2 1.5.4,
PCRE2 10.47 and glaze 7.5.0. Record resolved dependency commits and notices before
publishing any pipeline or renderer. The CLI links PDF code even with `--no-pdf`.

## Routes A and C

A source-generated shared outline atlas plus page placements is a good candidate
for offline use and deterministic letter-colouring. Its contours must come from
licensed font generation, not the sample PDF. Exact total size and first paint
remain unmeasured; the separate PDF research measurements are not a production
asset licence or a substitute for this test.

[Official TypeScript justification](https://github.com/DigitalKhatt/digitalkhatt.org/blob/4213fab9892774f74f7164c70a70dd84a14f0215/ClientApp/src/app/components/otfmushaf/just.service.ts) is a second source route, using a HarfBuzz wrapper and explicit line features/positions. Porting it would require preserving MIT and upstream notices, all source text transformations, feature ranges and line geometry, followed by browser QA.

C (`woff2` plus SVG text/tspans) is not yet exact: text APIs do not directly address
arbitrary glyph IDs or native MetaPost variants, and per-character tspans can
change shaping across joins. A 531 KB font file is not proof of native layout
parity or Safari correctness. Keep C experimental until Chromium and WebKit show
identical glyph selection, advances, marks and connected-letter colour behavior.

## Completed native build and all-page source proof

The native CLI and OFL font plugin built successfully with a local toolchain.
[Exact setup, source/dependency pins, two Linux build adjustments and commands](../source_pipeline/BUILD_NATIVE.md)
are recorded separately. The only engine source patch changes invalid Linux
`dlopen(path,0)` to `RTLD_LAZY`; a target-specific HarfBuzz diagnostic switch and
`-Wno-error=narrowing` permit existing integer-to-double initializer warnings.
Nothing is installed into system directories or integrated into app runtime.

The original default `harfbuzz` / `same-size-by-page` / `shrink none` profile
produced deterministic source glyphs, but **failed visual inspection** on p582:
line3 advances were18,113 against a16,400-unit target and text clipped on the
left. That profile is rejected for visual delivery. Default-profile size numbers
must not be presented as a winning complete page renderer.

The revised candidate uses the **documented native policy**:
`--justifier decl-policy --style font-size-xscale --shrink standard`.
Force/XPBD and Tajweed are off. It uses the native17000×27400 frame and1800 line
spacing, not artwork registration. The separate SQLite adapter is generated
only from the pinned MIT website text.

| Native fitted-profile measurement | Verified result |
| --- | --- |
| Pages / all lines |604 /9,046 |
| App body words / body lines |77,433 /8,820 |
| Per-line body word-count differences |0 |
| Strict notation differences / hamza diagnostic remaining |293 /0 |
| Page213 native assembly |15 lines; all app line counts match |
| Nonheading glyph placements |854,159, including spaces/ayah markers/basmalas |
| Mark placements reported by engine |435,360 |
| Direct whole-glyph variants |4,306 |
| Missing outline references / invalid source clusters |0 /0 |
| Empty contours |Only space:81,245 binary placements |
| First / repeated full generation |32.134 /32.805 seconds |
| Independent rerun comparison |Binary, text sidecar and placement JSONL byte-identical |

The generator normalizes already-adjusted website text, including duplicate CGJ
in some words. All mapping must use the final native sidecar's UTF16 offsets;
raw website character offsets and PDF glyph indices are not interchangeable.
The final sidecar still preserves all77,433 app-word correspondences. A separate
native-unit mapper handles ownership; source count proof alone does not prove it.

Binary SHA-256:
`78800d93d3864398062dfa9d13310a06311da096b8f59a56e68f245d25b7ede8`.
Sidecar:
`a88ec463bf0d8df24082b01d29cda4678559ba647887ca04b13e14b434cb09fd`.
Placement JSONL:
`51babdf89874160043e39033ba69a401875f2c1a8c524f1fe439b414b36c78b0`.
Run manifests intentionally contain elapsed time and were excluded from the
byte-equality assertion. The generation driver records hashes and actual stats. A third full run through
the packaged driver completed in28.931 seconds and matched all three output hashes.

## Real source-generated A/B measurements

All sizes below come from independently generated source contours, not PDF
extraction. Gzip level9 and Brotli quality9 (Brotli1.2.1) were measured. Inline SVG
uses exact decoded float32 outline coordinates, not rounded/optimized artwork.

| Candidate asset | Raw bytes | Gzip9 | Brotli9 |
| --- | ---: | ---: | ---: |
| B: full604-page DKLY |9,758,305 |4,335,075 |2,415,830 |
| B: final text/name/baseline sidecar |1,797,218 |314,934 |245,333 |
| A: shared4306-outline SVG atlas |13,363,543 |1,590,007 |988,061 |
| A: all 604 separate SVG position-page payloads, summed |103,367,853 |13,060,653 |11,737,856 |

Nine inline SVG page sizes and shared-page min/median/max are recorded in
[native-pipeline.json](native-pipeline.json). These estimates omit decorative
surah headers, app wid/tid ownership metadata, renderer code and offline packaging.
SVG atlas references were constructed for size measurement, not browser-tested.
B is a promising compact source format; no production winner is selected without
paint/offline/device checks and complete page resources. C remains unproven.

## Visual and all-frame bounds evidence

Local source-only SVG/PNG proofs were generated for pages1–3,50,187,293,582,600,604.
Pages1,3 and582 were directly inspected: line structures are coherent, and the
fitted p582 no longer loses words on the left. Decorative headers are intentionally
blank, and the proof is not the final Mushaf design. It is not a religious
proofread, all-page visual approval, or a browser screenshot.

The decoder implements the pinned writer's `fontSize * xscale` for body lines,
plain `fontSize` for basmala, right-edge offsets, advances and flipped Y outlines.
It checks source UTF16 lengths/clusters before rendering. 7,443 lines have nonunit
scaling. All 772,914 nonempty placements were checked using exact cubic extrema
from the float32 contours and those same transforms in the original source frame.

**Six original-frame ink failures remain**, all final-line `smalllowmeem` below
the bottom edge; there are no line-advance endpoints outside the page:

| Page | App word ID | Overflow below 27400, source units |
| --- | --- | ---: |
|26 |2.176.12 |12.96 |
|294 |18.15.9 |89.46 |
|378 |27.22.11 |73.00 |
|407 |30.32.7 |54.78 |
|589 |84.25.8 |21.26 |
|601 |105.5.2 |7.55 |

The complete boxes are retained in the machine report. No word shifting, scaling
to artwork or automatic crop fitting was applied. A separately labelled uniform
**120-unit bottom-padding research candidate** (height 27520) retains exactly
the same glyph coordinates/scales and has **zero out-of-frame ink placements**
on all 604 pages. The nine SVG outline/transform sections are byte-identical to
the original-frame proofs; only the canvas is taller. Original-frame failures
remain recorded. This candidate is not a selected production frame.

## Reproducibility and remaining release gates

The source corpus/default-shaping probe and SQLite adapter were repeated with
byte-identical outputs. Explicit checks remain active under `python -O`, include
raw input and full app-corpus hashes, reject output paths/symlinks into the
repository, and publish after validation. The adapter uses unique temporary files.
A read-only review verified protected-output refusal, altered-input refusal,
symlink preservation and deterministic normal/optimized runs. Four committed
filesystem-guard tests also passed under `python -O`; syntax compilation and
machine-report JSON validation passed.

The official native build and all 604-page candidate are reproducible with the
recorded toolchain and portability changes. Separate scripts provide one-command
source probing, database generation, fitted generation, and decoding/bounds
verification. No source outlines, page assets or native binaries are committed.

Before app integration: retain the separate verified native app-unit ownership audit, choose the
page-frame treatment explicitly, supply licensed headings/remaining decorations,
measure browser/Safari/tablet first paint and offline behavior, and obtain visual
approval. Browser launch was blocked by executor IPC restrictions, so no first-paint
or device timing is claimed. XPBD/reporting were disabled: “0 findings” in native
logs is not proof of no glyph collisions.

Confidence: practicality **87/100** for a reproducible independent source pipeline,
architecture/data safety **94/100** for isolated build-time generation and unchanged
app contracts, visual certainty **72/100** for the candidate. Six original-frame
clips, omitted headers and untested browser rendering still block production claims.

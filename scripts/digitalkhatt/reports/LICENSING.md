# DigitalKhatt licensing findings

Reviewed 9 November 2026. This is a conservative source review, not legal advice.

## Font: explicit OFL grant

Pinned font source: `DigitalKhatt/oldmadinafont` commit
`adc60f3865b507684bda856d59940a7f3602be32`.

The [LICENSE](https://github.com/DigitalKhatt/oldmadinafont/blob/adc60f3865b507684bda856d59940a7f3602be32/LICENSE)
expressly licenses “This Font Software” under SIL OFL 1.1 and credits DigitalKhatt
contributors. The [README](https://github.com/DigitalKhatt/oldmadinafont/blob/adc60f3865b507684bda856d59940a7f3602be32/README.md)
describes the 1995 old Madina Mushaf font and sponsorship by Tarteel.

Required app attribution when an approved implementation ships: **DigitalKhatt,
SIL OFL 1.1, sponsored by Tarteel**. The audit does not alter the app's credits.

## Sample PDF: no separate reuse grant located

The OFL defines Font Software and says documents created using fonts do not have
to use the same licence. That statement does not itself grant redistribution
rights over this particular PDF. No PDF-specific grant was found in the checked
README, LICENSE or PDF notice/metadata. It remains unclear, not “definitely
unlicensed” and not automatically “OFL”.

The [sample PDF](https://github.com/DigitalKhatt/oldmadinafont/blob/adc60f3865b507684bda856d59940a7f3602be32/old_Madinah_mushaf.pdf)
has a leading development notice followed by 604 Mushaf pages. The notice calls
it experimental, not final and potentially containing errors, generated
2026-06-01 16:11:26 UTC. Metadata identifies DigitalKhatt Project / Visual MetaFont
Editor. The notice provides no explicit reuse grant.

This branch publishes research measurements and limited textual comparisons,
not the PDF, page outlines, rendered contact sheets or PDF-derived app assets.
Do not ship extracted page assets on an assumption that the font's OFL covers
the PDF's entire contents.

## Official independent generation route

VisualMetaFont `master` was `220658be8bad76cfe628ddf0e903c5a86e454e4f` at review.

- [Native generation documentation](https://github.com/DigitalKhatt/visualmetafont/blob/220658be8bad76cfe628ddf0e903c5a86e454e4f/lib/digitalkhatt/docs/generate-mushaf.md)
  documents `digitalkhatt_generate_mushaf oldmadinafont/oldmadina.mp --output mushaf.pdf`.
  It uses font sources and Quran SQLite layout data rather than the sample PDF,
  with layout-table selection and saved settings.
- [Native generator](https://github.com/DigitalKhatt/visualmetafont/blob/220658be8bad76cfe628ddf0e903c5a86e454e4f/lib/digitalkhatt/tools/generate_mushaf.cpp)
  shapes/justifies source lines and can export a whole-glyph layout binary.
- [Whole-glyph export documentation](https://github.com/DigitalKhatt/visualmetafont/blob/220658be8bad76cfe628ddf0e903c5a86e454e4f/tools/bake_layout_variants.md)
  describes DKLY v4 with direct MetaPost contours, positions, clusters and a text
  sidecar. This is a candidate for Phase 1 option B, not a measured winner yet.
- VisualMetaFont's [root licence](https://github.com/DigitalKhatt/visualmetafont/blob/220658be8bad76cfe628ddf0e903c5a86e454e4f/LICENSE)
  is **AGPL v3**, separate from the font's OFL. Build-time use, integration and
  distribution have different implications. Exported contours, layout data and
  other embedded resources also need provenance review.

Exact regeneration of the June sample has not been demonstrated. Pinning the
font alone is insufficient: engine revision, SQLite layout, justification,
page geometry, settings and resources also matter. Neither the generator nor
the browser renderer was built during Phase 0. No code from the unlicensed
`medinamushafanalyzer` was used.

## Continuation: independent official source corpus

The mapping continuation located the complete old-Madina corpus and justification
source in the official `DigitalKhatt/digitalkhatt.org` repository at
`4213fab9892774f74f7164c70a70dd84a14f0215`, whose root licence is MIT. A separate
source-font probe reads that corpus and the OFL font without reading the sample
PDF. Its body-line counts agree with all 77,433 app words.

This offers a PDF-independent production route, subject to exact native layout,
output-resource provenance, required notices and visual validation. It does not
resolve the sample PDF's reuse grant, relicense bundled WASM/dependencies as MIT,
or permit copying unlicensed ornaments. See the current pinned source links,
measurements and unresolved native-generation gates in
[PIPELINE_FEASIBILITY.md](PIPELINE_FEASIBILITY.md).

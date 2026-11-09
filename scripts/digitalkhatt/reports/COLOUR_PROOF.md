# Native source colour proof

Research only, 9 November 2026. No runtime, protected corpus, judging rules,
production assets or PDF-derived outlines changed. This is not app UI approval.

## Delivered locally

Output directory: `../digitalkhatt-colour-proof` relative to this checkout.
Generated SVG/PNG assets remain outside the repository.

- 200 distinct corpus words sampled without replacement with Python seed
  **20261109**, one seeded random app tid per word, across ten 20-word sheets.
- 40 additional distinct words, across two sheets, selected deterministically
  from base-letter skeletons containing lam-alif or equal to على / لكم / بسم.
  This is a transparent textual candidate classifier, not a claim that all 40
  have independently verified stacked geometry.
- `hard-cases.svg/png`: five exact source-assignment cases below.
- `nine-pages.svg/png`: one native colour word from each checkpoint page
  1, 2, 3, 50, 187, 293, 582, 600, 604. These are **word examples**, not nine
  complete coloured pages.
- `manifest.json`: 254 distinct words, unchanged app text, wid, tid and page,
  native text, selected nonempty JSONL source indices, no-tid glyph indices,
  exact input pins, selection lists, rule version and attribution.
- Each image labels page, wid, tid, selected source indices and exact app text.
  The small app-text label is system-font text; the large coloured word is
  entirely decoded native source contours.

## Binary/JSONL linkage

Before colouring, all **772,914 nonempty occurrences** on all 604 pages passed a
strict occurrence-order bijection between the independent DKLY binary decoder
and JSONL placements. Each paired occurrence must match physical line, UTF-16
source cluster, native codepoint, glyph name, final x/y offsets and shaped
horizontal advance. JSONL indices are retained only after these checks. The
binary's different decorative-space inventory is not silently index-transferred:
only verified empty space outlines and JSONL space records are excluded from
this nonempty linkage. Missing, extra, reordered-identity or changed-position
occurrences fail closed. Binary geometry and outline variants, not JSONL's
rounded coordinates, supply the rendered paths.

Both input streams and normalized source sidecar are checked against the fitted
profile's SHA-256 pins. The protected app corpus, tokenizer and judging rules
are also pinned. The unchanged app target exporter runs in Node; source slices
and rule `qpc-hafs-v1-targets-4.0.0` are checked. The existing semantic mapper is
called without PDF extraction or the baseline singleton workaround. Each
sample must have zero unresolved assignments and zero unmapped targets.

Selected tids colour whole native glyph contours, including assigned dots and
harakat. Waqf and empty placeholders receive no tid; no contour cutting,
vertical slicing, artwork alignment or artwork warping is used. Each crop is a
uniform display scaling of the native word's true cubic-extrema ink bounds.

Exact hard cases (source JSONL indices are page-local):

| Word | tid | Coloured nonempty indices |
| --- | --- | --- |
| 2.72.3 | 2.72.3@r7 | 456, 457, 458 |
| 17.7.11 | 17.7.11@r4 | 1115, 1116, 1117, 1118 |
| 1.7.7 | 1.7.7@r2 | 333, 334, 335 |
| 2.4.9 | 2.4.9@r7 | 351, 353, 354 |
| 2.2.3 | 2.2.3@r2 | 81, 82, 83 |

## Visual checks and remaining limits

Inspected actual Inkscape PNG pixels for the hard-case sheet, first 20 random
words and first 20 special candidates. The raa and dagger-alif are coloured
without the following hamza; the added-maddah example colours sin, small waw
and maddah; lam-alif contours follow the unchanged merged app unit; long hamza
follows its mapped unit; the three-dot waqf stays black. Dots and harakat remain
with the selected letter in inspected examples. A first rendering exposed
clipped RTL text labels; the final output corrects their text anchoring and was
re-inspected. No full 254-word religious/visual approval is claimed.

The original 27400-high page frame's six low-meem clipping failures and the
separate +120 bottom-padding proposal remain the source-render report's
responsibility. Cropping words by their actual native geometry neither fixes
nor conceals that full-page gate. Headings are irrelevant to these body-word
crops. Tablet/browser timings, touch hit boxes, complete page decorations,
licensing packaging and owner approval are still separate gates.

Attribution on every sheet: **DigitalKhatt, OFL 1.1, sponsored by Tarteel**.
The source generator is VisualMetaFont under AGPL v3; source corpus attribution
and licence boundaries remain as documented in PIPELINE_FEASIBILITY.md. These
research images are not a licence clearance or production distribution package.

## Reproduce

Dependencies: Python/fontTools, the existing semantic mapper dependencies,
Node with type stripping, and Inkscape. No network or browser is used.

```sh
python scripts/digitalkhatt/source_pipeline/color_proof.py --native ../digitalkhatt-source-research/native-fit --output ../digitalkhatt-colour-proof
python -m unittest discover -s scripts/digitalkhatt/source_pipeline -p test_color_proof.py
```

Output-directory and symlink guards keep assets outside the repository and
reject writing through output symlinks. A complete rerun reproduced all 29 output files byte-for-byte (14 SVGs, 14
PNGs and the manifest). Eleven focused tests pass, including
identity/cluster/offset/count mismatch rejection, duplicate-index rejection,
output guards and whole-glyph selected/unowned colour separation.

Confidence: practicality **96/100** for reproducible local proof generation;
architecture/data safety **97/100** for pinned identity linkage and unchanged
rules; visual certainty **88/100** for the inspected sheets, not all-page or
production visual approval.

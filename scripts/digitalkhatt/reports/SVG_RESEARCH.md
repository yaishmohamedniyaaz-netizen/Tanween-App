# Local-only SVG delivery measurements

Research measurements, not a selected production pipeline. No SVG, outline, image or font is committed by this script.

## Nine checkpoint pages

Page | Raw SVG bytes | Gzip 9 bytes | Brotli 11 bytes | Traces / SVG uses | Omitted empty spaces
--- | --- | --- | --- | --- | ---
1 | 1,328,110 | 168,969 | 81,643 | 356 / 355 | 1
2 | 1,344,856 | 179,022 | 85,375 | 472 / 472 | 0
3 | 404,065 | 54,807 | 41,751 | 1392 / 1392 | 0
50 | 1,586,177 | 211,207 | 109,382 | 1443 / 1443 | 0
187 | 1,488,564 | 192,624 | 100,046 | 1385 / 1384 | 1
293 | 1,656,499 | 217,398 | 115,079 | 1426 / 1426 | 0
582 | 1,776,857 | 216,554 | 110,072 | 1304 / 1304 | 0
600 | 2,595,716 | 323,941 | 103,494 | 919 / 919 | 0
604 | 3,620,912 | 451,380 | 103,344 | 665 / 665 | 0

## Page 1 prototype gap explained

The 356-trace/355-use difference is an omitted zero-ink `space` at zero-based trace index 129, origin (99, 147.75). Its Type3 bounds are exactly zero. No Arabic ink glyph is removed to make the counts agree. The stricter research alignment accepts only this kind of omitted space and rejects any other skipped trace or extra SVG use.

This explains the count failure; it does not approve all glyph-to-unit assignments or fix the reference prototype in place. Page 187 has one additional omitted zero-ink space, also recorded in svg-research.json.

## Limits and next gate

- Inline SVG option A was measured for nine pages only. Embedded decorative images remain in these local research files.
- A deduplicated atlas, all-page transfer size, first paint and tablet memory are not measured.
- The local Chromium first-paint harness was prepared (measure_svg_browser.mjs), but Chromium could not start: socket() failed with Operation not permitted. An approved elevated execution returned the same failure. No timing result exists; no attempt was made to bypass the restriction.
- B source-engine and C positioned-font feasibility are tracked separately in PIPELINE_FEASIBILITY.md.
- No option is selected until provenance, exact geometry, letter ownership and browser rendering pass.
- The sample PDF redistribution grant remains unresolved. Local files are not app assets or a public preview.

Confidence: practicality 90/100 for these size/count measurements; architecture/data safety 98/100 for keeping them outside runtime assets; visual certainty 60/100 until independent all-page rendering and colour review.

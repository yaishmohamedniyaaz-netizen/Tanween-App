# Native source glyph mapping

**Research only; independent native cluster evidence, not transferred PDF indices.**

Native policy: fitted-candidate (decl-policy, font-size-xscale, shrink standard). Independent native decoder reports no out-of-frame line advance endpoints; not full visual approval.

Measure | Count
--- | ---
words | 77433
units | 298431
unmapped_units | 0
units_with_source_glyph | 298431
units_touching_shared_clusters | 0
units_with_nonempty_source_glyph | 298431
zero_contour_corpus_glyphs | 5860
glyphs_single | 757526
glyphs_empty-placeholder | 5860
glyphs_decorative | 4358
glyphs_shared | 0
glyphs_unowned | 0
unresolved_words | 0
glyphs_exact_singleton_resolved | 0

## Method

The final normalized native sidecar provides UTF-16 source lines. Word starts and ends are derived from that exact source. Each unique native cluster ends at the next cluster within its word or the word end. Every glyph index, word/line bound, native codepoint/name and mark/base attachment is validated before adapting clusters into source spans.

The semantic mapper executes unchanged app targets in Node and applies only independently validated directional notation classifications. Its PDF extraction code is never called. For the default-baseline coarse clusters, a single exact native word (2.72.3) can resolve reh.isol to source raa offset7 and smallalef.isol to dagger-alif offset9, both in app target@r7. This requires exact app/native strings, classifier, glyph-name inventory, candidate tids and source-character checks. The fitted-candidate output has finer source clusters and needs zero such supplemental resolutions; the count above records actual use. Geometric base attachments are never treated as letter ownership. Native cluster spans can be coarser than PDF ActualText spans: unresolved multi-target clusters remain ambiguous; no forced shape-name ownership or whole-word mapping is added.

Waqf glyphs and empty in-word space placeholders receive no tid. In-word empty placeholders are counted separately from word=0 separator spaces; neither contributes visible ink. Spaces, standalone basmalas, ayah/section markers and header lines are excluded. Al-Fatiha basmala remains judged. Detailed glyph positions/outlines are not emitted by this report.

## Limits

Contour audit: {'variants': 4306, 'emptyVariantNames': ['space'], 'allNativeGlyphCodesHaveVariantEvidence': True, 'binaryEmptySpaceOccurrences': 81245, 'note': 'Native JSONL and binary decorative-space occurrence inventories differ; no index transfer asserted.'}. Assigned source glyphs are not proof of visible ink when contour validation is unavailable.
Unknown shared clusters and source-glyph coverage are reported separately. Even complete cluster coverage is not full visual, browser, licensing or release approval. Native output may differ visually from the PDF. The nonheading export omits surah headings and is not yet a complete-page app renderer. No app source, rules or production assets are changed.

## Reproduce

```sh
python scripts/digitalkhatt/source_pipeline/map_native.py --placements /outside/repo/native-fit/placements.jsonl --sidecar /outside/repo/native-fit/oldmadina.bin.json --binary /outside/repo/native-fit/oldmadina.bin --contour-audit /outside/repo/native-fit-proof/native-proof.json --out scripts/digitalkhatt/reports/native-mapping.json
python -m unittest discover -s scripts/digitalkhatt/source_pipeline -p test_native_mapping.py
```

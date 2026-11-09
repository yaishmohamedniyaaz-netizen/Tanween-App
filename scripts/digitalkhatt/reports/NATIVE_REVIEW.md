# Independent native source-unit review

9 November 2026. Research review only. No runtime edits, binary assets, images, commit or publication. This review is separate from the completed PDF mapping audit.

## Final fitted-candidate re-review

The final report now describes a separate pinned profile: decl-policy justification, font-size-xscale style and standard shrinking. The baseline observations below are historical evidence and must not be substituted for these final counts.

A fresh independent invocation of the final mapper against native-fit placements, binary and sidecar plus native-fit-proof contour evidence produced a byte-identical native-mapping.json to the repository report. All 14 updated native tests passed.

- 604 pages, 77,433 words and 298,431 distinct targets.
- All 298,431 targets have nonempty source-glyph evidence.
- 757,526 single-owner nonempty corpus glyphs.
- 4,358 waqf glyphs and 5,860 in-word empty placeholders have no tid.
- 0 unmapped units, shared clusters, unowned glyphs or unresolved words.
- 0 supplemental exact-singleton glyph resolutions.

Direct inspection of fitted 2.72.3 confirms that native clusters now separate source raa [7:8], fatha [8:9], dagger-alif [9:10] and CGJ/hamza/sukun [10:13]. Calling the shared semantic mapper alone, without the supplemental native exception, gives raa/fatha/smallalef to app r7 and hamza/sukun to app r10 with no ambiguity. The visual baseline inspection below remains supporting evidence for contour identity; no new fitted visual approval is claimed.

Requested hardening is present: distinct target IDs, unchanged source slices and rule version are asserted. Placements/binary pins are profile-specific; sidecar, protected corpus and semantic-rule pins are validated. Contour evidence is linked to the binary/sidecar checksums, covers all 4,306 variants, and permits empty contours only for space. Empty body placeholders are explicitly excluded before source coverage is computed. This is variant-code evidence, not a claim of a one-to-one transferred index between JSONL and binary; the report explicitly notes differing decorative-space inventories.

Final report SHA-256 at comparison: `0fc9df8a60e89ee04c46eca48adddc4f808c6782edd08e3ec1e15302cee4abf1`.

## Verified baseline

The reviewer read the task, working agreement, PDF mapping report, pipeline feasibility report, native adapter and native tests. A separate all-604-page loop read native placements and the pinned normalized sidecar, executed the unchanged Node target exporter, adapted source clusters, and checked every app word and target identifier and target source slice.

- 77,433 distinct wid and 298,431 distinct tid; every target fullGlyph equals its unchanged app source slice.
- 0 unmapped units; 763,384 single-owner glyph records, 2 shared glyph records, 4,358 decorative waqf records with empty tids.
- Only unresolved word: 2.72.3. The two shared records are reh.isol and smallalef.isol in its coarse native cluster. Three other marks in this cluster resolve by explicit Unicode identity.
- Source exception inventory: 277 long-initial-hamza words, 13 below-yeh words, one below-waw word, one standalone-combining-hamza singleton and one added-maddah singleton. Remaining 77,140 words compare strictly.
- Excluded records: 75,385 word-separator spaces, 6,436 ayah/section glyphs and 4,594 standalone-basmala glyphs. Headings are omitted by this native export and should not be described as rendered.
- A second all-page review excludes all 5,860 zero-contour body space placeholders: every one of the 298,431 targets still has at least one non-space assignment (including the two ambiguous singleton candidates). This is contour-bearing coverage, not unique-owner or full visual proof.
- All 10 native unit tests available at review time passed.

These counts describe the initial conservative mapper before its proposed pinned singleton resolution, not a claim that later output has the same unresolved count.

## Provenance and independent checks

Native indices are contiguous per page; source positions use the exact normalized sidecar lines. The BMP-only assertion makes Python character offsets equal to UTF-16 units for this corpus. Word membership is bounded by source whitespace and validated against declared word text, line, cluster and codepoint/name. Cluster ends come from the next native cluster within the word, not PDF indices or artwork boxes. Native geometric mark attachment is checked for structural validity but is deliberately not used as semantic ownership.

The semantic map_word helper is shared with the PDF research script, but this route does not invoke PDF extraction or read a PDF. Its source-span naming still mentions ActualText/pdfText; those labels should not be mistaken for evidence that a PDF was input to this run.

The reviewer separately parsed the DKLY binary with a scratch parser, consumed every byte, and counted 854,159 nonheading placements. The only empty-contour variant was space. This validates that native non-space variants have contours; contour existence alone does not prove meaningful visible ink or correct ownership. A full per-record binary/placements linkage remains a useful audit hardening check.

## Singleton 2.72.3 visual review

The reviewer independently rendered page 11, physical line 5, directly from binary contours and positions. No sample PDF or extracted PDF outlines were used. A scratch color rendering made reh.isol, fatha and smallalef.isol red, and hamzaabove and sukun blue. Visual inspection confirms a separately drawn raa body/dagger-alif and a separately drawn hamza/sukun. No outline cut is needed.

The source cluster covers word offsets 7–13: raa, fatha, dagger-alif, CGJ, combining hamza, sukun. App raa target is 2.72.3@r7 (offsets 7–10); standalone hamza target is 2.72.3@r10 (10–12). Assigning reh/fatha/smallalef to r7 and hamza/sukun to r10 is supported for this exact pinned singleton. The native engine geometrically attaches hamza/sukun to smallalef; following that attachment as semantic ownership would be wrong. This inspection supports only the exact exception, not a general glyph-name heuristic.

## Additional source-assignment samples

- 2.4.9: long initial hamza and following alif share app r7; native lam remains r5. The placeholder space in the hamza cluster has no contours.
- 10.15.23 and 56.23.1: below-seat glyph identities preserve the app hamza target offsets under the directional source classifications.
- 17.7.11: smallhighwaw and added maddah remain under sin r4; joined hamza remains r6. No glyph/text deletion is used.
- 1.7.7: separate native lam/alif contours both inherit app r2 because the unchanged app rule merges the madd alif.
- 2.17.8 smallwaw inherits heh r6; 2.22.12 smallyeh inherits heh r2; 1.1.2 smallalef.joined inherits meem r7.
- 2.2.3 waqf.smallhighthreedots has no tid. All 4,358 native waqf assignments were checked for empty tids.

These additional samples are source-assignment inspections, not individual rendered-color approvals.

## Requested hardening and remaining gates

The initial native main checked distinct wid but omitted explicit distinct tid, fullGlyph/source-slice and ruleVersion assertions present in the PDF main. The independent review verified the first two over all 604 pages and requested those assertions in the mapper itself. Also distinguish zero-contour placeholder spaces inside body words from separator spaces and real ink. Do not infer visible target coverage merely from a placeholder assignment.

Broad color-sheet inspection, headings, production licensing packaging, browser/device QA, hit boxes, performance and release approval remain separate gates. No runtime integration is approved by this review.

Confidence: practicality 95/100 for research mapping; architecture/data safety 96/100 with pinned inputs and unchanged app rules; visual certainty 88/100 for the specifically inspected singleton, 70/100 for all-page visual correctness pending broad color review.

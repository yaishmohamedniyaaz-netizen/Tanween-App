# DigitalKhatt glyph-to-target research

**Source-based coverage checkpoint, not a production renderer or full visual approval.**

## Measured coverage

Measure | Count
--- | ---
Pages | 604
Unique app words | 77433
Unique app letter units | 298431
Units with source-glyph evidence | 298431
Unmapped units | 0
Units touching ambiguous/shared assignments | 0
Single-owner corpus glyph shows | 757512
Explicit mark-identity disambiguations | 1546
Decorative waqf glyphs with no tid | 4358
Other unowned glyphs | 0
Quarantined glyphs | 0
Unresolved words | 0

## Method and safety

Words are paired by page, physical line and one-based reading-order slot. Node executes the unchanged judgingTargetsOf rules, preserving every wid, tid, source span and silent flag. Next-word context stops at ayah/page boundaries; an independent all-page comparison with the app nextRecitedWords helper found no differences.

Each PDF ActualText character span is aligned to ordered source letter groups and then to app target source offsets. Glyphs inherit only their explicit span owner. No nearest box, approximate base-shape label, whole-word ownership or proportional cut is used. Small-letter marks and madd alifs follow the exported app target span, not a separate rule reimplementation. Units flagged silent remain independent. The app also explicitly merges its silent-plural-alif feature into the waw target; this existing rule is preserved, not replaced by a blanket one-unit-per-written-letter policy.

The word classifier admits only three localized directional notation replacements (277 long initial hamzas, 13 below-yeh hamzas, one below-waw hamza) and two exact wid/skeleton-pinned singleton variants. Long hamza maps both source hamza and alif to the app target whose unchanged source span contains the long hamza. Below-seat replacements preserve the app target offset.

For 2.72.3, a separate source hamzaabove/sukun span after raa plus small alif is projected to the app standalone hamza target at offset 10. For 17.7.11, added small high waw/maddah glyphs remain under their source sin host; only the extra maddah is omitted from the alignment key. Neither source text nor glyph is deleted. Independent crop inspection supports these two local projections, not theological or full-text equivalence.

Multi-target ActualText spans are resolved only when an explicit Type3 mark name identifies a Unicode mark at one unique target offset: kasra, fatha, damma, sukun, maddahabove, hamzaabove, hamzaabove.joined and hamzaabove.lamalef. Unknown or repeated ambiguous ownership remains unresolved. The original candidate tids and resolution basis are retained in examples. A cross-target source span is not automatically an intrinsic shared-outline ligature.

Waqf stop-sign glyphs are decorative and deliberately receive no tid even when inside a word ActualText span. Their kinds/counts appear below. Standalone basmalas, headers, ayah and section markers are outside corpus-word mapping; Al-Fatiha basmala remains included. Those excluded page decorations are audited in parity.json, not included in the corpus counts above.

Input hashes cover the PDF, all protected app page files, judgingUnits.ts and tokenizer. The exported target rule version is checked. Every page is cross-checked against parity.Extractor.page, including its content/trace identity validation. Word and target IDs are unique, app spans retain their original text, and glyph indices are unique per page. The audit rejects Python -O so validation cannot be disabled.

## Special-case inventory

Category | Count
--- | ---
allah_lam_units | 2557
silent_units | 4632
dagger-alif | 9726
hamza_units | 19156
madd-alif | 21191
lam_alif_source_pairs | 4267
silent-plural-alif | 3703
small-waw | 1256
small-ya | 995

Counts overlap. Lam-alif source-pair counts are orthographic adjacency, not a count of shared glyph outlines. Ten structured examples per available category are in mapping.json; categories with fewer than ten occurrences include all available cases.

## Glyphs without a unique target

Kind | Count
--- | ---
waqf.smallhighthreedots | 12
waqf.sad | 1681
waqf.qaf | 603
waqf.jeem | 1972
waqf.lam | 68
waqf.meem | 22

## Remaining gates

- Source-based ownership coverage does not prove every outline contains only that letter, nor that every dot/mark is visually correct. No all-page color sheet, 200-word color review, touch-target test, or browser/device approval is claimed.
- Representative crops independently support joined hamza, lam-alif hamza and the two singleton cases. Ten rendered image examples per category have not been produced by this mapper; JSON examples are not a substitute for that visual gate.
- No PDF outlines, positions or image assets are published by this report. The unresolved sample-PDF redistribution licence and independent generation route remain separate blockers to production.
- No app mode, scoring rule, protected asset, production rendering or persisted evidence format is changed. Zero unresolved source assignments, if measured above, is not permission to ship.

## Reproduce

From repository root with requirements-parity.txt installed and Node supporting --experimental-strip-types:

```sh
python scripts/digitalkhatt/glyph_mapping.py --pdf /path/to/old_Madinah_mushaf.pdf
python -m unittest discover -s scripts/digitalkhatt -p "test_*mapping.py"
```

The mapping command generates mapping.json and MAPPING.md together. Optional --pages accepts 1..604 for diagnostics; a partial run never establishes all-page coverage.

Confidence: practicality 95/100; architecture/data safety 96/100 for this pinned research pipeline; visual certainty 75/100 pending broad color/outline review.

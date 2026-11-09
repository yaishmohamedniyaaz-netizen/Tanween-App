# DigitalKhatt word correspondence

**Research only: all 77,433 words paired; no glyph-to-tid or visual approval claimed.**

The owner approved same-page, physical-line, reading-order pairing with DigitalKhatt’s own geometry. This supersedes the artwork-overlap gate only for this word-correspondence investigation. No religious text, app wid/tid, judging rule, runtime file, PDF, outline or public asset is changed.

## Validation

- All 604 pages, 77,433 unique app word IDs, identical physical corpus lines and words per line.
- 77,140 strict skeleton pairs and 293 explicitly classified exceptions on 222 pages.
- The source PDF and combined protected app files are SHA256-pinned. The exact exception inventory (page, line, wid, both original strings) has an additional pinned fingerprint.
- New lines, counts, IDs, unknown edits, invalid geometry or changed exception records fail closed. The report is written only after all checks pass.
- Every pair is checked with exact original strings and full-precision source-coordinate bounds. The publishable JSON stores per-page inventory hashes, diagnostic counts and all exception pairs without geometry. Optional --pairs-out writes the complete local research inventory outside the repository. Keys are page + physical line + one-based reading-order slot; wid is retained verbatim.

Class | Words
--- | ---
below_waw_hamza | 1
below_yeh_hamza | 13
extra_source_maddah | 1
long_initial_hamza | 277
standalone_combining_hamza | 1
strict_skeleton_equal | 77140

## Geometry and limits

Bounds are the source Type3 d1 union excluding waqf signs, not independently measured tight ink. No artwork box, IoU, fitting, warping or nearest-neighbour search is used to establish correspondence. Source-frame containment and descending RTL word-box centres are diagnostics, not matching inputs. Invalid/nonfinite/empty bounds are fatal.

Geometry diagnostics: `{"inside_source_frame_failures": 3}`. An empty object means no failures.

Strict skeleton validation removes the same ordinary marks/CGJ as the existing parity audit. It is not exact full-text equality or theological review. Raw texts remain untouched. Three directional local replacement rules handle long hamza and below-seat hamza; the two singleton cases are restricted to their exact wid and entire skeleton pair. No generic hamza/maddah deletion is allowed.

In particular the extra maddah at 17.7.11 is retained in the source string and classified separately, not silently erased. This is correspondence evidence, not permission to omit it when rendering or assigning glyphs.

Repeated words are intentionally paired by their approved physical slot, never searched by text. Identical repeated words cannot independently prove semantic order; the pinned sources, extractor trace checks and exact count/order contract constrain that risk.

Standalone basmalas, headers, ayah/section markers are excluded by the unchanged parity extractor. Al-Fatiha’s judged basmala is retained. The unresolved PDF redistribution licence still prohibits treating this report as a production asset grant.

## Reproduce

From the repository root, with requirements-parity.txt installed:

```sh
python scripts/digitalkhatt/word_mapping.py --pdf /path/to/old_Madinah_mushaf.pdf
python -m unittest discover -s scripts/digitalkhatt -p "test_word_mapping.py"
```

Run the generator with a second --out directory and compare both outputs byte-for-byte. No timestamp or machine-local input path is recorded.

Confidence: practicality 97/100; architecture/data safety 98/100; visual certainty 60/100 for final glyph rendering/colour ownership, which is explicitly outside this word-level proof.

## All 293 exceptions

Each entry gives page/line/slot, app wid, class, exact app and exact source text.

- p2 / line 6 / slot 6; 2.4.9; long_initial_hamza: app `وَبِٱلۡأٓخِرَةِ` → source `وَبِٱلْـٔ͏َاخِرَةِ`.
- p3 / line 4 / slot 6; 2.8.7; long_initial_hamza: app `ٱلۡأٓخِرِ` → source `ٱلْـٔ͏َاخِرِ`.
- p6 / line 10 / slot 1; 2.34.4; long_initial_hamza: app `لِأٓدَمَ` → source `لِـٔ͏َادَمَ`.
- p10 / line 2 / slot 5; 2.62.11; long_initial_hamza: app `ٱلۡأٓخِرِ` → source `ٱلْـٔ͏َاخِرِ`.
- p11 / line 5 / slot 3; 2.72.3; standalone_combining_hamza: app `فَٱدَّٰرَٰءۡتُمۡ` → source `فَٱدَّٰرَٰ͏ْٔتُمْ`.
- p13 / line 10 / slot 3; 2.86.5; long_initial_hamza: app `بِٱلۡأٓخِرَةِۖ` → source `بِٱلْـٔ͏َاخِرَةِۖ`.
- p15 / line 1 / slot 6; 2.94.5; long_initial_hamza: app `ٱلۡأٓخِرَةُ` → source `ٱلْـٔ͏َاخِرَةُ`.
- p16 / line 8 / slot 4; 2.102.63; long_initial_hamza: app `ٱلۡأٓخِرَةِ` → source `ٱلْـٔ͏َاخِرَةِ`.
- p18 / line 7 / slot 3; 2.114.27; long_initial_hamza: app `ٱلۡأٓخِرَةِ` → source `ٱلْـٔ͏َاخِرَةِ`.
- p18 / line 14 / slot 3; 2.118.21; long_initial_hamza: app `ٱلۡأٓيَٰتِ` → source `ٱلْـٔ͏َايَٰتِ`.
- p19 / line 14 / slot 9; 2.126.17; long_initial_hamza: app `ٱلۡأٓخِرِۚ` → source `ٱلْـٔ͏َاخِرِۖ`.
- p20 / line 8 / slot 3; 2.130.15; long_initial_hamza: app `ٱلۡأٓخِرَةِ` → source `ٱلْـٔ͏َاخِرَةِ`.
- p25 / line 5 / slot 4; 2.164.40; long_initial_hamza: app `لَأٓيَٰتٖ` → source `لَـٔ͏َايَٰتࣲ`.
- p27 / line 2 / slot 6; 2.177.14; long_initial_hamza: app `ٱلۡأٓخِرِ` → source `ٱلْـٔ͏َاخِرِ`.
- p31 / line 12 / slot 9; 2.200.21; long_initial_hamza: app `ٱلۡأٓخِرَةِ` → source `ٱلْـٔ͏َاخِرَةِ`.
- p31 / line 14 / slot 3; 2.201.9; long_initial_hamza: app `ٱلۡأٓخِرَةِ` → source `ٱلْـٔ͏َاخِرَةِ`.
- p34 / line 9 / slot 4; 2.217.50; long_initial_hamza: app `وَٱلۡأٓخِرَةِۖ` → source `وَٱلْـٔ͏َاخِرَةِۖ`.
- p34 / line 15 / slot 5; 2.219.23; long_initial_hamza: app `ٱلۡأٓيَٰتِ` → source `ٱلْـٔ͏َايَٰتِ`.
- p35 / line 1 / slot 3; 2.220.2; long_initial_hamza: app `وَٱلۡأٓخِرَةِۗ` → source `وَٱلْـٔ͏َاخِرَةِۗ`.
- p36 / line 6 / slot 7; 2.228.20; long_initial_hamza: app `ٱلۡأٓخِرِۚ` → source `ٱلْـٔ͏َاخِرِۚ`.
- p37 / line 8 / slot 5; 2.232.23; long_initial_hamza: app `ٱلۡأٓخِرِۗ` → source `ٱلْـٔ͏َاخِرِۗ`.
- p40 / line 15 / slot 4; 2.248.25; long_initial_hamza: app `لَأٓيَةٗ` → source `لَـٔ͏َايَةࣰ`.
- p44 / line 13 / slot 5; 2.264.17; long_initial_hamza: app `ٱلۡأٓخِرِۖ` → source `ٱلْـٔ͏َاخِرِۖ`.
- p45 / line 8 / slot 2; 2.266.32; long_initial_hamza: app `ٱلۡأٓيَٰتِ` → source `ٱلْـٔ͏َايَٰتِ`.
- p52 / line 15 / slot 3; 3.22.6; long_initial_hamza: app `وَٱلۡأٓخِرَةِ` → source `وَٱلْـٔ͏َاخِرَةِ`.
- p55 / line 15 / slot 7; 3.45.17; long_initial_hamza: app `وَٱلۡأٓخِرَةِ` → source `وَٱلْـٔ͏َاخِرَةِ`.
- p56 / line 9 / slot 6; 3.49.40; long_initial_hamza: app `لَأٓيَةٗ` → source `لَـٔ͏َايَةࣰ`.
- p57 / line 7 / slot 7; 3.56.8; long_initial_hamza: app `وَٱلۡأٓخِرَةِ` → source `وَٱلْـٔ͏َاخِرَةِ`.
- p57 / line 10 / slot 5; 3.58.4; long_initial_hamza: app `ٱلۡأٓيَٰتِ` → source `ٱلْـٔ͏َايَٰتِ`.
- p59 / line 14 / slot 4; 3.77.13; long_initial_hamza: app `ٱلۡأٓخِرَةِ` → source `ٱلْـٔ͏َاخِرَةِ`.
- p61 / line 5 / slot 7; 3.85.10; long_initial_hamza: app `ٱلۡأٓخِرَةِ` → source `ٱلْـٔ͏َاخِرَةِ`.
- p64 / line 12 / slot 6; 3.114.3; long_initial_hamza: app `ٱلۡأٓخِرِ` → source `ٱلْـٔ͏َاخِرِ`.
- p65 / line 8 / slot 6; 3.118.26; long_initial_hamza: app `ٱلۡأٓيَٰتِۖ` → source `ٱلْـٔ͏َايَٰتِۖ`.
- p68 / line 9 / slot 8; 3.145.19; long_initial_hamza: app `ٱلۡأٓخِرَةِ` → source `ٱلْـٔ͏َاخِرَةِ`.
- p68 / line 15 / slot 5; 3.148.6; long_initial_hamza: app `ٱلۡأٓخِرَةِۗ` → source `ٱلْـٔ͏َاخِرَةِۗ`.
- p69 / line 10 / slot 3; 3.152.27; long_initial_hamza: app `ٱلۡأٓخِرَةَۚ` → source `ٱلْـٔ͏َاخِرَةَۚ`.
- p73 / line 5 / slot 9; 3.176.18; long_initial_hamza: app `ٱلۡأٓخِرَةِۖ` → source `ٱلْـٔ͏َاخِرَةِۖ`.
- p75 / line 7 / slot 7; 3.190.8; long_initial_hamza: app `لَأٓيَٰتٖ` → source `لَـٔ͏َايَٰتࣲ`.
- p85 / line 2 / slot 4; 4.38.10; long_initial_hamza: app `ٱلۡأٓخِرِۗ` → source `ٱلْـٔ͏َاخِرِۗ`.
- p85 / line 3 / slot 8; 4.39.6; long_initial_hamza: app `ٱلۡأٓخِرِ` → source `ٱلْـٔ͏َاخِرِ`.
- p87 / line 15 / slot 4; 4.59.23; long_initial_hamza: app `ٱلۡأٓخِرِۚ` → source `ٱلْـٔ͏َاخِرِۚ`.
- p89 / line 3 / slot 8; 4.67.1; long_initial_hamza: app `لَّأٓتَيۡنَٰهُم` → source `لَّـٔ͏َاتَيْنَٰهُم`.
- p89 / line 14 / slot 4; 4.74.8; long_initial_hamza: app `بِٱلۡأٓخِرَةِۚ` → source `بِٱلْـٔ͏َاخِرَةِۚ`.
- p90 / line 10 / slot 2; 4.77.41; long_initial_hamza: app `وَٱلۡأٓخِرَةُ` → source `وَٱلْـٔ͏َاخِرَةُ`.
- p97 / line 11 / slot 1; 4.119.2; long_initial_hamza: app `وَلَأٓمُرَنَّهُمۡ` → source `وَلَـٔ͏َامُرَنَّهُمْ`.
- p97 / line 11 / slot 5; 4.119.6; long_initial_hamza: app `وَلَأٓمُرَنَّهُمۡ` → source `وَلَـٔ͏َامُرَنَّهُمْ`.
- p99 / line 15 / slot 4; 4.134.9; long_initial_hamza: app `وَٱلۡأٓخِرَةِۚ` → source `وَٱلْـٔ͏َاخِرَةِۚ`.
- p100 / line 7 / slot 6; 4.136.23; long_initial_hamza: app `ٱلۡأٓخِرِ` → source `ٱلْـٔ͏َاخِرِ`.
- p103 / line 15 / slot 4; 4.162.21; long_initial_hamza: app `ٱلۡأٓخِرِ` → source `ٱلْـٔ͏َاخِرِ`.
- p107 / line 15 / slot 7; 5.5.40; long_initial_hamza: app `ٱلۡأٓخِرَةِ` → source `ٱلْـٔ͏َاخِرَةِ`.
- p112 / line 7 / slot 7; 5.27.15; long_initial_hamza: app `ٱلۡأٓخَرِ` → source `ٱلْـٔ͏َاخَرِ`.
- p113 / line 9 / slot 7; 5.33.31; long_initial_hamza: app `ٱلۡأٓخِرَةِ` → source `ٱلْـٔ͏َاخِرَةِ`.
- p114 / line 15 / slot 5; 5.41.64; long_initial_hamza: app `ٱلۡأٓخِرَةِ` → source `ٱلْـٔ͏َاخِرَةِ`.
- p119 / line 12 / slot 5; 5.69.11; long_initial_hamza: app `ٱلۡأٓخِرِ` → source `ٱلْـٔ͏َاخِرِ`.
- p120 / line 13 / slot 5; 5.75.20; long_initial_hamza: app `ٱلۡأٓيَٰتِ` → source `ٱلْـٔ͏َايَٰتِ`.
- p125 / line 10 / slot 8; 5.106.50; long_initial_hamza: app `ٱلۡأٓثِمِينَ` → source `ٱلْـٔ͏َاثِمِينَ`.
- p131 / line 8 / slot 4; 6.32.7; long_initial_hamza: app `ٱلۡأٓخِرَةُ` → source `ٱلْـٔ͏َاخِرَةُ`.
- p133 / line 3 / slot 10; 6.46.19; long_initial_hamza: app `ٱلۡأٓيَٰتِ` → source `ٱلْـٔ͏َايَٰتِ`.
- p134 / line 6 / slot 3; 6.55.2; long_initial_hamza: app `ٱلۡأٓيَٰتِ` → source `ٱلْـٔ͏َايَٰتِ`.
- p135 / line 11 / slot 6; 6.65.24; long_initial_hamza: app `ٱلۡأٓيَٰتِ` → source `ٱلْـٔ͏َايَٰتِ`.
- p137 / line 5 / slot 3; 6.76.14; long_initial_hamza: app `ٱلۡأٓفِلِينَ` → source `ٱلْـٔ͏َافِلِينَ`.
- p139 / line 6 / slot 7; 6.92.15; long_initial_hamza: app `بِٱلۡأٓخِرَةِ` → source `بِٱلْـٔ͏َاخِرَةِ`.
- p140 / line 5 / slot 8; 6.97.13; long_initial_hamza: app `ٱلۡأٓيَٰتِ` → source `ٱلْـٔ͏َايَٰتِ`.
- p140 / line 7 / slot 3; 6.98.10; long_initial_hamza: app `ٱلۡأٓيَٰتِ` → source `ٱلْـٔ͏َايَٰتِ`.
- p140 / line 12 / slot 1; 6.99.41; long_initial_hamza: app `لَأٓيَٰتٖ` → source `لَـٔ͏َايَٰتࣲ`.
- p141 / line 6 / slot 1; 6.105.2; long_initial_hamza: app `ٱلۡأٓيَٰتِ` → source `ٱلْـٔ͏َايَٰتِ`.
- p141 / line 13 / slot 5; 6.109.11; long_initial_hamza: app `ٱلۡأٓيَٰتُ` → source `ٱلْـٔ͏َايَٰتُ`.
- p142 / line 6 / slot 7; 6.113.6; long_initial_hamza: app `بِٱلۡأٓخِرَةِ` → source `بِٱلْـٔ͏َاخِرَةِ`.
- p144 / line 5 / slot 1; 6.126.6; long_initial_hamza: app `ٱلۡأٓيَٰتِ` → source `ٱلْـٔ͏َايَٰتِ`.
- p145 / line 5 / slot 2; 6.134.3; long_initial_hamza: app `لَأٓتٖۖ` → source `لَـٔ͏َاتࣲۖ`.
- p148 / line 10 / slot 3; 6.150.23; long_initial_hamza: app `بِٱلۡأٓخِرَةِ` → source `بِٱلْـٔ͏َاخِرَةِ`.
- p151 / line 15 / slot 1; 7.11.8; long_initial_hamza: app `لِأٓدَمَ` → source `لِـٔ͏َادَمَ`.
- p152 / line 5 / slot 4; 7.17.1; long_initial_hamza: app `لَأٓتِيَنَّهُم` → source `لَـٔ͏َاتِيَنَّهُم`.
- p154 / line 4 / slot 9; 7.32.23; long_initial_hamza: app `ٱلۡأٓيَٰتِ` → source `ٱلْـٔ͏َايَٰتِ`.
- p156 / line 4 / slot 3; 7.45.8; long_initial_hamza: app `بِٱلۡأٓخِرَةِ` → source `بِٱلْـٔ͏َاخِرَةِ`.
- p158 / line 2 / slot 5; 7.58.14; long_initial_hamza: app `ٱلۡأٓيَٰتِ` → source `ٱلْـٔ͏َايَٰتِ`.
- p168 / line 10 / slot 1; 7.147.4; long_initial_hamza: app `ٱلۡأٓخِرَةِ` → source `ٱلْـٔ͏َاخِرَةِ`.
- p170 / line 1 / slot 8; 7.156.7; long_initial_hamza: app `ٱلۡأٓخِرَةِ` → source `ٱلْـٔ͏َاخِرَةِ`.
- p172 / line 13 / slot 12; 7.169.34; long_initial_hamza: app `ٱلۡأٓخِرَةُ` → source `ٱلْـٔ͏َاخِرَةُ`.
- p173 / line 7 / slot 4; 7.174.2; long_initial_hamza: app `ٱلۡأٓيَٰتِ` → source `ٱلْـٔ͏َايَٰتِ`.
- p176 / line 14 / slot 1; 7.205.11; long_initial_hamza: app `وَٱلۡأٓصَالِ` → source `وَٱلْـٔ͏َاصَالِ`.
- p185 / line 13 / slot 3; 8.67.16; long_initial_hamza: app `ٱلۡأٓخِرَةَۗ` → source `ٱلْـٔ͏َاخِرَةَۗ`.
- p188 / line 10 / slot 4; 9.11.10; long_initial_hamza: app `ٱلۡأٓيَٰتِ` → source `ٱلْـٔ͏َايَٰتِ`.
- p189 / line 9 / slot 9; 9.18.8; long_initial_hamza: app `ٱلۡأٓخِرِ` → source `ٱلْـٔ͏َاخِرِ`.
- p189 / line 12 / slot 9; 9.19.10; long_initial_hamza: app `ٱلۡأٓخِرِ` → source `ٱلْـٔ͏َاخِرِ`.
- p191 / line 6 / slot 6; 9.29.7; long_initial_hamza: app `ٱلۡأٓخِرِ` → source `ٱلْـٔ͏َاخِرِ`.
- p193 / line 6 / slot 7; 9.38.19; long_initial_hamza: app `ٱلۡأٓخِرَةِۚ` → source `ٱلْـٔ͏َاخِرَةِۚ`.
- p193 / line 7 / slot 6; 9.38.25; long_initial_hamza: app `ٱلۡأٓخِرَةِ` → source `ٱلْـٔ͏َاخِرَةِ`.
- p194 / line 8 / slot 4; 9.44.6; long_initial_hamza: app `ٱلۡأٓخِرِ` → source `ٱلْـٔ͏َاخِرِ`.
- p194 / line 10 / slot 5; 9.45.7; long_initial_hamza: app `ٱلۡأٓخِرِ` → source `ٱلْـٔ͏َاخِرِ`.
- p198 / line 5 / slot 1; 9.69.28; long_initial_hamza: app `وَٱلۡأٓخِرَةِۖ` → source `وَٱلْـٔ͏َاخِرَةِۖ`.
- p199 / line 6 / slot 6; 9.74.37; long_initial_hamza: app `وَٱلۡأٓخِرَةِۚ` → source `وَٱلْـٔ͏َاخِرَةِۚ`.
- p202 / line 13 / slot 6; 9.99.6; long_initial_hamza: app `ٱلۡأٓخِرِ` → source `ٱلْـٔ͏َاخِرِ`.
- p205 / line 2 / slot 3; 9.112.6; long_initial_hamza: app `ٱلۡأٓمِرُونَ` → source `ٱلْـٔ͏َامِرُونَ`.
- p208 / line 13 / slot 9; 10.5.20; long_initial_hamza: app `ٱلۡأٓيَٰتِ` → source `ٱلْـٔ͏َايَٰتِ`.
- p208 / line 15 / slot 5; 10.6.11; long_initial_hamza: app `لَأٓيَٰتٖ` → source `لَـٔ͏َايَٰتࣲ`.
- p210 / line 3 / slot 4; 10.15.23; below_yeh_hamza: app `تِلۡقَآيِٕ` → source `تِلْقَا͏ٓي͏ٔ͏ِ`.
- p211 / line 14 / slot 4; 10.24.40; long_initial_hamza: app `ٱلۡأٓيَٰتِ` → source `ٱلْـٔ͏َايَٰتِ`.
- p216 / line 3 / slot 5; 10.64.6; long_initial_hamza: app `ٱلۡأٓخِرَةِۚ` → source `ٱلْـٔ͏َاخِرَةِۚ`.
- p216 / line 10 / slot 1; 10.67.12; long_initial_hamza: app `لَأٓيَٰتٖ` → source `لَـٔ͏َايَٰتࣲ`.
- p220 / line 3 / slot 6; 10.99.3; long_initial_hamza: app `لَأٓمَنَ` → source `لَـٔ͏َامَنَ`.
- p220 / line 7 / slot 4; 10.101.8; long_initial_hamza: app `ٱلۡأٓيَٰتُ` → source `ٱلْـٔ͏َايَٰتُ`.
- p223 / line 6 / slot 6; 11.16.5; long_initial_hamza: app `ٱلۡأٓخِرَةِ` → source `ٱلْـٔ͏َاخِرَةِ`.
- p223 / line 15 / slot 7; 11.19.8; long_initial_hamza: app `بِٱلۡأٓخِرَةِ` → source `بِٱلْـٔ͏َاخِرَةِ`.
- p224 / line 5 / slot 2; 11.22.4; long_initial_hamza: app `ٱلۡأٓخِرَةِ` → source `ٱلْـٔ͏َاخِرَةِ`.
- p233 / line 8 / slot 6; 11.103.3; long_initial_hamza: app `لَأٓيَةٗ` → source `لَـٔ͏َايَةࣰ`.
- p233 / line 8 / slot 10; 11.103.7; long_initial_hamza: app `ٱلۡأٓخِرَةِۚ` → source `ٱلْـٔ͏َاخِرَةِۚ`.
- p239 / line 9 / slot 9; 12.35.7; long_initial_hamza: app `ٱلۡأٓيَٰتِ` → source `ٱلْـٔ͏َايَٰتِ`.
- p239 / line 11 / slot 6; 12.36.11; long_initial_hamza: app `ٱلۡأٓخَرُ` → source `ٱلْـٔ͏َاخَرُ`.
- p239 / line 15 / slot 7; 12.37.23; long_initial_hamza: app `بِٱلۡأٓخِرَةِ` → source `بِٱلْـٔ͏َاخِرَةِ`.
- p240 / line 9 / slot 5; 12.41.8; long_initial_hamza: app `ٱلۡأٓخَرُ` → source `ٱلْـٔ͏َاخَرُ`.
- p242 / line 7 / slot 1; 12.57.1; long_initial_hamza: app `ٱلۡأٓخِرَةِ` → source `ٱلْـٔ͏َاخِرَةِ`.
- p247 / line 12 / slot 7; 12.101.16; long_initial_hamza: app `وَٱلۡأٓخِرَةِۖ` → source `وَٱلْـٔ͏َاخِرَةِۖ`.
- p248 / line 10 / slot 2; 12.109.23; long_initial_hamza: app `ٱلۡأٓخِرَةِ` → source `ٱلْـٔ͏َاخِرَةِ`.
- p249 / line 6 / slot 7; 13.2.21; long_initial_hamza: app `ٱلۡأٓيَٰتِ` → source `ٱلْـٔ͏َايَٰتِ`.
- p249 / line 9 / slot 5; 13.3.21; long_initial_hamza: app `لَأٓيَٰتٖ` → source `لَـٔ͏َايَٰتࣲ`.
- p249 / line 12 / slot 6; 13.4.24; long_initial_hamza: app `لَأٓيَٰتٖ` → source `لَـٔ͏َايَٰتࣲ`.
- p251 / line 4 / slot 4; 13.15.10; long_initial_hamza: app `وَٱلۡأٓصَالِ۩` → source `وَٱلْـٔ͏َاصَالِ`.
- p252 / line 12 / slot 7; 13.26.13; long_initial_hamza: app `ٱلۡأٓخِرَةِ` → source `ٱلْـٔ͏َاخِرَةِ`.
- p253 / line 15 / slot 3; 13.34.6; long_initial_hamza: app `ٱلۡأٓخِرَةِ` → source `ٱلْـٔ͏َاخِرَةِ`.
- p255 / line 9 / slot 4; 14.3.5; long_initial_hamza: app `ٱلۡأٓخِرَةِ` → source `ٱلْـٔ͏َاخِرَةِ`.
- p255 / line 15 / slot 5; 14.5.17; long_initial_hamza: app `لَأٓيَٰتٖ` → source `لَـٔ͏َايَٰتࣲ`.
- p259 / line 5 / slot 3; 14.27.10; long_initial_hamza: app `ٱلۡأٓخِرَةِۖ` → source `ٱلْـٔ͏َاخِرَةِۖ`.
- p266 / line 4 / slot 1; 15.75.3; long_initial_hamza: app `لَأٓيَٰتٖ` → source `لَـٔ͏َايَٰتࣲ`.
- p266 / line 5 / slot 1; 15.77.3; long_initial_hamza: app `لَأٓيَةٗ` → source `لَـٔ͏َايَةࣰ`.
- p266 / line 11 / slot 2; 15.85.10; long_initial_hamza: app `لَأٓتِيَةٞۖ` → source `لَـٔ͏َاتِيَةࣱۖ`.
- p268 / line 8 / slot 5; 16.11.13; long_initial_hamza: app `لَأٓيَةٗ` → source `لَـٔ͏َايَةࣰ`.
- p268 / line 10 / slot 6; 16.12.12; long_initial_hamza: app `لَأٓيَٰتٖ` → source `لَـٔ͏َايَٰتࣲ`.
- p268 / line 12 / slot 3; 16.13.10; long_initial_hamza: app `لَأٓيَةٗ` → source `لَـٔ͏َايَةࣰ`.
- p269 / line 8 / slot 4; 16.22.6; long_initial_hamza: app `بِٱلۡأٓخِرَةِ` → source `بِٱلْـٔ͏َاخِرَةِ`.
- p270 / line 8 / slot 5; 16.30.15; long_initial_hamza: app `ٱلۡأٓخِرَةِ` → source `ٱلْـٔ͏َاخِرَةِ`.
- p271 / line 14 / slot 6; 16.41.13; long_initial_hamza: app `ٱلۡأٓخِرَةِ` → source `ٱلْـٔ͏َاخِرَةِ`.
- p273 / line 7 / slot 1; 16.60.3; long_initial_hamza: app `بِٱلۡأٓخِرَةِ` → source `بِٱلْـٔ͏َاخِرَةِ`.
- p274 / line 2 / slot 1; 16.65.13; long_initial_hamza: app `لَأٓيَةٗ` → source `لَـٔ͏َايَةࣰ`.
- p274 / line 5 / slot 5; 16.67.12; long_initial_hamza: app `لَأٓيَةٗ` → source `لَـٔ͏َايَةࣰ`.
- p274 / line 8 / slot 10; 16.69.21; long_initial_hamza: app `لَأٓيَةٗ` → source `لَـٔ͏َايَةࣰ`.
- p275 / line 15 / slot 8; 16.79.15; long_initial_hamza: app `لَأٓيَٰتٖ` → source `لَـٔ͏َايَٰتࣲ`.
- p277 / line 6 / slot 2; 16.90.5; below_yeh_hamza: app `وَإِيتَآيِٕ` → source `وَإ͏ِيتَا͏ٓي͏ٔ͏ِ`.
- p279 / line 9 / slot 7; 16.107.6; long_initial_hamza: app `ٱلۡأٓخِرَةِ` → source `ٱلْـٔ͏َاخِرَةِ`.
- p279 / line 13 / slot 1; 16.109.4; long_initial_hamza: app `ٱلۡأٓخِرَةِ` → source `ٱلْـٔ͏َاخِرَةِ`.
- p281 / line 5 / slot 7; 16.122.6; long_initial_hamza: app `ٱلۡأٓخِرَةِ` → source `ٱلْـٔ͏َاخِرَةِ`.
- p282 / line 14 / slot 2; 17.7.10; long_initial_hamza: app `ٱلۡأٓخِرَةِ` → source `ٱلْـٔ͏َاخِرَةِ`.
- p282 / line 14 / slot 3; 17.7.11; extra_source_maddah: app `لِيَسُـُٔواْ` → source `لِيَسُ͏ࣳٓـٔ͏ُوا۟`.
- p283 / line 4 / slot 5; 17.10.4; long_initial_hamza: app `بِٱلۡأٓخِرَةِ` → source `بِٱلْـٔ͏َاخِرَةِ`.
- p284 / line 3 / slot 1; 17.19.2; long_initial_hamza: app `ٱلۡأٓخِرَةَ` → source `ٱلْـٔ͏َاخِرَةَ`.
- p284 / line 6 / slot 4; 17.21.6; long_initial_hamza: app `وَلَلۡأٓخِرَةُ` → source `وَلَلْـٔ͏َاخِرَةُ`.
- p286 / line 9 / slot 8; 17.45.9; long_initial_hamza: app `بِٱلۡأٓخِرَةِ` → source `بِٱلْـٔ͏َاخِرَةِ`.
- p288 / line 1 / slot 5; 17.59.4; long_initial_hamza: app `بِٱلۡأٓيَٰتِ` → source `بِٱلْـٔ͏َايَٰتِ`.
- p288 / line 2 / slot 9; 17.59.18; long_initial_hamza: app `بِٱلۡأٓيَٰتِ` → source `بِٱلْـٔ͏َايَٰتِ`.
- p288 / line 6 / slot 5; 17.61.4; long_initial_hamza: app `لِأٓدَمَ` → source `لِـٔ͏َادَمَ`.
- p289 / line 11 / slot 4; 17.72.7; long_initial_hamza: app `ٱلۡأٓخِرَةِ` → source `ٱلْـٔ͏َاخِرَةِ`.
- p292 / line 15 / slot 6; 17.104.10; long_initial_hamza: app `ٱلۡأٓخِرَةِ` → source `ٱلْـٔ͏َاخِرَةِ`.
- p294 / line 1 / slot 7; 18.5.6; long_initial_hamza: app `لِأٓبَآئِهِمۡۚ` → source `لِـٔ͏َابَا͏ٓي͏ٔ͏ِهِمْۚ`.
- p299 / line 9 / slot 1; 18.50.4; long_initial_hamza: app `لِأٓدَمَ` → source `لِـٔ͏َادَمَ`.
- p315 / line 4 / slot 6; 20.54.6; long_initial_hamza: app `لَأٓيَٰتٖ` → source `لَـٔ͏َايَٰتࣲ`.
- p320 / line 4 / slot 3; 20.116.4; long_initial_hamza: app `لِأٓدَمَ` → source `لِـٔ͏َادَمَ`.
- p321 / line 2 / slot 9; 20.127.9; long_initial_hamza: app `ٱلۡأٓخِرَةِ` → source `ٱلْـٔ͏َاخِرَةِ`.
- p321 / line 4 / slot 6; 20.128.14; long_initial_hamza: app `لَأٓيَٰتٖ` → source `لَـٔ͏َايَٰتࣲ`.
- p321 / line 7 / slot 2; 20.130.13; below_yeh_hamza: app `ءَانَآيِٕ` → source `ءَانَا͏ٓي͏ٔ͏ِ`.
- p333 / line 8 / slot 7; 22.11.20; long_initial_hamza: app `وَٱلۡأٓخِرَةَۚ` → source `وَٱلْـٔ͏َاخِرَةَۚ`.
- p333 / line 14 / slot 8; 22.15.9; long_initial_hamza: app `وَٱلۡأٓخِرَةِ` → source `وَٱلْـٔ͏َاخِرَةِ`.
- p343 / line 4 / slot 6; 23.20.8; long_initial_hamza: app `لِّلۡأٓكِلِينَ` → source `لِّلْـٔ͏َاكِلِينَ`.
- p344 / line 3 / slot 5; 23.30.3; long_initial_hamza: app `لَأٓيَٰتٖ` → source `لَـٔ͏َايَٰتࣲ`.
- p344 / line 6 / slot 5; 23.33.8; long_initial_hamza: app `ٱلۡأٓخِرَةِ` → source `ٱلْـٔ͏َاخِرَةِ`.
- p346 / line 15 / slot 5; 23.74.4; long_initial_hamza: app `بِٱلۡأٓخِرَةِ` → source `بِٱلْـٔ͏َاخِرَةِ`.
- p350 / line 4 / slot 11; 24.2.20; long_initial_hamza: app `ٱلۡأٓخِرِۖ` → source `ٱلْـٔ͏َاخِرِۖ`.
- p351 / line 2 / slot 4; 24.11.15; below_yeh_hamza: app `ٱمۡرِيٕٖ` → source `ٱمْرِي͏ٔ͏ࣲ`.
- p351 / line 7 / slot 3; 24.14.7; long_initial_hamza: app `وَٱلۡأٓخِرَةِ` → source `وَٱلْـٔ͏َاخِرَةِ`.
- p351 / line 12 / slot 4; 24.18.3; long_initial_hamza: app `ٱلۡأٓيَٰتِۚ` → source `ٱلْـٔ͏َايَٰتِۚ`.
- p351 / line 14 / slot 3; 24.19.14; long_initial_hamza: app `وَٱلۡأٓخِرَةِۚ` → source `وَٱلْـٔ͏َاخِرَةِۚ`.
- p352 / line 8 / slot 5; 24.23.9; long_initial_hamza: app `وَٱلۡأٓخِرَةِ` → source `وَٱلْـٔ͏َاخِرَةِ`.
- p354 / line 15 / slot 8; 24.36.13; long_initial_hamza: app `وَٱلۡأٓصَالِ` → source `وَٱلْـٔ͏َاصَالِ`.
- p357 / line 15 / slot 6; 24.58.45; long_initial_hamza: app `ٱلۡأٓيَٰتِۗ` → source `ٱلْـٔ͏َايَٰتِۗ`.
- p358 / line 15 / slot 4; 24.61.73; long_initial_hamza: app `ٱلۡأٓيَٰتِ` → source `ٱلْـٔ͏َايَٰتِ`.
- p367 / line 7 / slot 5; 26.8.3; long_initial_hamza: app `لَأٓيَةٗۖ` → source `لَـٔ͏َايَةࣰۖ`.
- p370 / line 4 / slot 3; 26.64.2; long_initial_hamza: app `ٱلۡأٓخَرِينَ` → source `ٱلْـٔ͏َاخَرِينَ`.
- p370 / line 5 / slot 3; 26.66.2; long_initial_hamza: app `ٱلۡأٓخَرِينَ` → source `ٱلْـٔ͏َاخَرِينَ`.
- p370 / line 5 / slot 7; 26.67.3; long_initial_hamza: app `لَأٓيَةٗۖ` → source `لَـٔ͏َايَةࣰۖ`.
- p371 / line 1 / slot 6; 26.84.5; long_initial_hamza: app `ٱلۡأٓخِرِينَ` → source `ٱلْـٔ͏َاخِرِينَ`.
- p371 / line 10 / slot 11; 26.103.3; long_initial_hamza: app `لَأٓيَةٗۖ` → source `لَـٔ͏َايَةࣰۖ`.
- p372 / line 6 / slot 8; 26.121.3; long_initial_hamza: app `لَأٓيَةٗۖ` → source `لَـٔ͏َايَةࣰۖ`.
- p373 / line 2 / slot 5; 26.139.5; long_initial_hamza: app `لَأٓيَةٗۖ` → source `لَـٔ͏َايَةࣰۖ`.
- p373 / line 14 / slot 7; 26.158.5; long_initial_hamza: app `لَأٓيَةٗۖ` → source `لَـٔ͏َايَةࣰۖ`.
- p374 / line 8 / slot 7; 26.172.2; long_initial_hamza: app `ٱلۡأٓخَرِينَ` → source `ٱلْـٔ͏َاخَرِينَ`.
- p374 / line 9 / slot 8; 26.174.3; long_initial_hamza: app `لَأٓيَةٗۖ` → source `لَـٔ͏َايَةࣰۖ`.
- p375 / line 6 / slot 4; 26.190.3; long_initial_hamza: app `لَأٓيَةٗۖ` → source `لَـٔ͏َايَةࣰۖ`.
- p377 / line 4 / slot 1; 27.3.6; long_initial_hamza: app `بِٱلۡأٓخِرَةِ` → source `بِٱلْـٔ͏َاخِرَةِ`.
- p377 / line 4 / slot 8; 27.4.4; long_initial_hamza: app `بِٱلۡأٓخِرَةِ` → source `بِٱلْـٔ͏َاخِرَةِ`.
- p377 / line 6 / slot 3; 27.5.7; long_initial_hamza: app `ٱلۡأٓخِرَةِ` → source `ٱلْـٔ͏َاخِرَةِ`.
- p381 / line 12 / slot 1; 27.52.8; long_initial_hamza: app `لَأٓيَةٗ` → source `لَـٔ͏َايَةࣰ`.
- p383 / line 4 / slot 7; 27.66.4; long_initial_hamza: app `ٱلۡأٓخِرَةِۚ` → source `ٱلْـٔ͏َاخِرَةِۚ`.
- p384 / line 12 / slot 2; 27.86.12; long_initial_hamza: app `لَأٓيَٰتٖ` → source `لَـٔ͏َايَٰتࣲ`.
- p389 / line 4 / slot 5; 28.30.4; below_yeh_hamza: app `شَٰطِيِٕ` → source `شَٰطِي͏ٔ͏ِ`.
- p389 / line 8 / slot 2; 28.31.18; long_initial_hamza: app `ٱلۡأٓمِنِينَ` → source `ٱلْـٔ͏َامِنِينَ`.
- p393 / line 15 / slot 4; 28.70.10; long_initial_hamza: app `وَٱلۡأٓخِرَةِۖ` → source `وَٱلْـٔ͏َاخِرَةِۖ`.
- p394 / line 13 / slot 6; 28.77.5; long_initial_hamza: app `ٱلۡأٓخِرَةَۖ` → source `ٱلْـٔ͏َاخِرَةَۖ`.
- p395 / line 12 / slot 7; 28.83.2; long_initial_hamza: app `ٱلۡأٓخِرَةُ` → source `ٱلْـٔ͏َاخِرَةُ`.
- p396 / line 14 / slot 6; 29.5.8; long_initial_hamza: app `لَأٓتٖۚ` → source `لَـٔ͏َاتࣲۚ`.
- p398 / line 10 / slot 9; 29.20.12; long_initial_hamza: app `ٱلۡأٓخِرَةَۚ` → source `ٱلْـٔ͏َاخِرَةَۚ`.
- p399 / line 2 / slot 8; 29.24.17; long_initial_hamza: app `لَأٓيَٰتٖ` → source `لَـٔ͏َايَٰتࣲ`.
- p399 / line 9 / slot 7; 29.27.15; long_initial_hamza: app `ٱلۡأٓخِرَةِ` → source `ٱلْـٔ͏َاخِرَةِ`.
- p400 / line 11 / slot 4; 29.36.10; long_initial_hamza: app `ٱلۡأٓخِرَ` → source `ٱلْـٔ͏َاخِرَ`.
- p401 / line 13 / slot 1; 29.44.8; long_initial_hamza: app `لَأٓيَةٗ` → source `لَـٔ͏َايَةࣰ`.
- p402 / line 10 / slot 6; 29.50.9; long_initial_hamza: app `ٱلۡأٓيَٰتُ` → source `ٱلْـٔ͏َايَٰتُ`.
- p404 / line 1 / slot 10; 29.64.9; long_initial_hamza: app `ٱلۡأٓخِرَةَ` → source `ٱلْـٔ͏َاخِرَةَ`.
- p405 / line 2 / slot 8; 30.7.7; long_initial_hamza: app `ٱلۡأٓخِرَةِ` → source `ٱلْـٔ͏َاخِرَةِ`.
- p405 / line 5 / slot 1; 30.8.19; below_yeh_hamza: app `بِلِقَآيِٕ` → source `بِلِقَا͏ٓي͏ٔ͏ِ`.
- p406 / line 1 / slot 6; 30.16.5; below_yeh_hamza: app `وَلِقَآيِٕ` → source `وَلِقَا͏ٓي͏ٔ͏ِ`.
- p406 / line 1 / slot 7; 30.16.6; long_initial_hamza: app `ٱلۡأٓخِرَةِ` → source `ٱلْـٔ͏َاخِرَةِ`.
- p406 / line 9 / slot 4; 30.21.17; long_initial_hamza: app `لَأٓيَٰتٖ` → source `لَـٔ͏َايَٰتࣲ`.
- p406 / line 11 / slot 3; 30.22.11; long_initial_hamza: app `لَأٓيَٰتٖ` → source `لَـٔ͏َايَٰتࣲ`.
- p406 / line 12 / slot 8; 30.23.11; long_initial_hamza: app `لَأٓيَٰتٖ` → source `لَـٔ͏َايَٰتࣲ`.
- p406 / line 15 / slot 6; 30.24.18; long_initial_hamza: app `لَأٓيَٰتٖ` → source `لَـٔ͏َايَٰتࣲ`.
- p407 / line 8 / slot 4; 30.28.24; long_initial_hamza: app `ٱلۡأٓيَٰتِ` → source `ٱلْـٔ͏َايَٰتِ`.
- p408 / line 7 / slot 5; 30.37.12; long_initial_hamza: app `لَأٓيَٰتٖ` → source `لَـٔ͏َايَٰتࣲ`.
- p411 / line 5 / slot 1; 31.4.6; long_initial_hamza: app `بِٱلۡأٓخِرَةِ` → source `بِٱلْـٔ͏َاخِرَةِ`.
- p414 / line 6 / slot 3; 31.31.15; long_initial_hamza: app `لَأٓيَٰتٖ` → source `لَـٔ͏َايَٰتࣲ`.
- p416 / line 3 / slot 3; 32.13.2; long_initial_hamza: app `لَأٓتَيۡنَا` → source `لَـٔ͏َاتَيْنَا`.
- p417 / line 9 / slot 7; 32.26.15; long_initial_hamza: app `لَأٓيَٰتٍۚ` → source `لَـٔ͏َايَٰتٍۖ`.
- p418 / line 8 / slot 7; 33.5.1; long_initial_hamza: app `لِأٓبَآئِهِمۡ` → source `لِـٔ͏َابَا͏ٓي͏ٔ͏ِهِمْ`.
- p419 / line 14 / slot 1; 33.14.8; long_initial_hamza: app `لَأٓتَوۡهَا` → source `لَـٔ͏َاتَوْهَا`.
- p420 / line 13 / slot 7; 33.21.13; long_initial_hamza: app `ٱلۡأٓخِرَ` → source `ٱلْـٔ͏َاخِرَ`.
- p421 / line 13 / slot 1; 33.29.6; long_initial_hamza: app `ٱلۡأٓخِرَةَ` → source `ٱلْـٔ͏َاخِرَةَ`.
- p426 / line 6 / slot 7; 33.57.9; long_initial_hamza: app `وَٱلۡأٓخِرَةِ` → source `وَٱلْـٔ͏َاخِرَةِ`.
- p428 / line 4 / slot 2; 34.1.13; long_initial_hamza: app `ٱلۡأٓخِرَةِۚ` → source `ٱلْـٔ͏َاخِرَةِۚ`.
- p429 / line 1 / slot 12; 34.8.11; long_initial_hamza: app `بِٱلۡأٓخِرَةِ` → source `بِٱلْـٔ͏َاخِرَةِ`.
- p429 / line 5 / slot 1; 34.9.25; long_initial_hamza: app `لَأٓيَةٗ` → source `لَـٔ͏َايَةࣰ`.
- p430 / line 9 / slot 8; 34.19.15; long_initial_hamza: app `لَأٓيَٰتٖ` → source `لَـٔ͏َايَٰتࣲ`.
- p430 / line 12 / slot 5; 34.21.10; long_initial_hamza: app `بِٱلۡأٓخِرَةِ` → source `بِٱلْـٔ͏َاخِرَةِ`.
- p439 / line 10 / slot 9; 35.43.4; below_yeh_hamza: app `ٱلسَّيِّيِٕۚ` → source `ٱلسَّيِّي͏ٔ͏ِۚ`.
- p448 / line 9 / slot 2; 37.66.1; long_initial_hamza: app `لَأٓكِلُونَ` → source `لَـٔ͏َاكِلُونَ`.
- p449 / line 1 / slot 8; 37.78.3; long_initial_hamza: app `ٱلۡأٓخِرِينَ` → source `ٱلْـٔ͏َاخِرِينَ`.
- p449 / line 3 / slot 5; 37.82.2; long_initial_hamza: app `ٱلۡأٓخَرِينَ` → source `ٱلْـٔ͏َاخَرِينَ`.
- p450 / line 4 / slot 1; 37.108.3; long_initial_hamza: app `ٱلۡأٓخِرِينَ` → source `ٱلْـٔ͏َاخِرِينَ`.
- p450 / line 11 / slot 3; 37.119.3; long_initial_hamza: app `ٱلۡأٓخِرِينَ` → source `ٱلْـٔ͏َاخِرِينَ`.
- p451 / line 2 / slot 4; 37.129.3; long_initial_hamza: app `ٱلۡأٓخِرِينَ` → source `ٱلْـٔ͏َاخِرِينَ`.
- p451 / line 5 / slot 5; 37.136.2; long_initial_hamza: app `ٱلۡأٓخَرِينَ` → source `ٱلْـٔ͏َاخَرِينَ`.
- p453 / line 5 / slot 2; 38.5.1; long_initial_hamza: app `ٱلۡأٓلِهَةَ` → source `ٱلْـٔ͏َالِهَةَ`.
- p453 / line 7 / slot 6; 38.7.5; long_initial_hamza: app `ٱلۡأٓخِرَةِ` → source `ٱلْـٔ͏َاخِرَةِ`.
- p459 / line 12 / slot 1; 39.9.8; long_initial_hamza: app `ٱلۡأٓخِرَةَ` → source `ٱلْـٔ͏َاخِرَةَ`.
- p461 / line 10 / slot 1; 39.26.7; long_initial_hamza: app `ٱلۡأٓخِرَةِ` → source `ٱلْـٔ͏َاخِرَةِ`.
- p463 / line 5 / slot 9; 39.42.23; long_initial_hamza: app `لَأٓيَٰتٖ` → source `لَـٔ͏َايَٰتࣲ`.
- p463 / line 10 / slot 5; 39.45.9; long_initial_hamza: app `بِٱلۡأٓخِرَةِۖ` → source `بِٱلْـٔ͏َاخِرَةِۖ`.
- p464 / line 8 / slot 7; 39.52.12; long_initial_hamza: app `لَأٓيَٰتٖ` → source `لَـٔ͏َايَٰتࣲ`.
- p469 / line 2 / slot 6; 40.18.2; long_initial_hamza: app `ٱلۡأٓزِفَةِ` → source `ٱلْـٔ͏َازِفَةِ`.
- p471 / line 12 / slot 8; 40.39.7; long_initial_hamza: app `ٱلۡأٓخِرَةَ` → source `ٱلْـٔ͏َاخِرَةَ`.
- p472 / line 4 / slot 11; 40.43.12; long_initial_hamza: app `ٱلۡأٓخِرَةِ` → source `ٱلْـٔ͏َاخِرَةِ`.
- p474 / line 1 / slot 3; 40.59.2; long_initial_hamza: app `لَأٓتِيَةٞ` → source `لَـٔ͏َاتِيَةࣱ`.
- p477 / line 9 / slot 7; 41.7.5; long_initial_hamza: app `بِٱلۡأٓخِرَةِ` → source `بِٱلْـٔ͏َاخِرَةِ`.
- p478 / line 10 / slot 7; 41.16.14; long_initial_hamza: app `ٱلۡأٓخِرَةِ` → source `ٱلْـٔ͏َاخِرَةِ`.
- p480 / line 4 / slot 3; 41.31.6; long_initial_hamza: app `ٱلۡأٓخِرَةِۖ` → source `ٱلْـٔ͏َاخِرَةِۖ`.
- p482 / line 13 / slot 3; 41.53.3; long_initial_hamza: app `ٱلۡأٓفَاقِ` → source `ٱلْـٔ͏َافَاقِ`.
- p485 / line 8 / slot 5; 42.20.4; long_initial_hamza: app `ٱلۡأٓخِرَةِ` → source `ٱلْـٔ͏َاخِرَةِ`.
- p485 / line 9 / slot 10; 42.20.19; long_initial_hamza: app `ٱلۡأٓخِرَةِ` → source `ٱلْـٔ͏َاخِرَةِ`.
- p487 / line 2 / slot 8; 42.33.11; long_initial_hamza: app `لَأٓيَٰتٖ` → source `لَـٔ͏َايَٰتࣲ`.
- p488 / line 14 / slot 9; 42.51.10; below_yeh_hamza: app `وَرَآيِٕ` → source `وَرَا͏ٓي͏ٔ͏ِ`.
- p492 / line 2 / slot 7; 43.35.8; long_initial_hamza: app `وَٱلۡأٓخِرَةُ` → source `وَٱلْـٔ͏َاخِرَةُ`.
- p493 / line 11 / slot 3; 43.56.3; long_initial_hamza: app `لِّلۡأٓخِرِينَ` → source `لِّلْـٔ͏َاخِرِينَ`.
- p497 / line 10 / slot 4; 44.33.2; long_initial_hamza: app `ٱلۡأٓيَٰتِ` → source `ٱلْـٔ͏َايَٰتِ`.
- p499 / line 3 / slot 2; 45.3.4; long_initial_hamza: app `لَأٓيَٰتٖ` → source `لَـٔ͏َايَٰتࣲ`.
- p499 / line 15 / slot 7; 45.13.13; long_initial_hamza: app `لَأٓيَٰتٖ` → source `لَـٔ͏َايَٰتࣲ`.
- p505 / line 13 / slot 7; 46.27.7; long_initial_hamza: app `ٱلۡأٓيَٰتِ` → source `ٱلْـٔ͏َايَٰتِ`.
- p524 / line 7 / slot 10; 52.21.15; below_yeh_hamza: app `ٱمۡرِيِٕۭ` → source `ٱمْرِي͏ٔ͏ِۭ`.
- p526 / line 14 / slot 1; 53.25.1; long_initial_hamza: app `ٱلۡأٓخِرَةُ` → source `ٱلْـٔ͏َاخِرَةُ`.
- p527 / line 1 / slot 5; 53.27.4; long_initial_hamza: app `بِٱلۡأٓخِرَةِ` → source `بِٱلْـٔ͏َاخِرَةِ`.
- p528 / line 6 / slot 7; 53.57.1; long_initial_hamza: app `ٱلۡأٓزِفَةُ` → source `ٱلْـٔ͏َازِفَةُ`.
- p534 / line 14 / slot 9; 56.14.2; long_initial_hamza: app `ٱلۡأٓخِرِينَ` → source `ٱلْـٔ͏َاخِرِينَ`.
- p535 / line 3 / slot 8; 56.23.1; below_waw_hamza: app `ٱللُّؤۡلُوِٕ` → source `ٱللُّو͏ٔ͏ْلُو͏ٔ͏ِ`.
- p535 / line 10 / slot 4; 56.40.2; long_initial_hamza: app `ٱلۡأٓخِرِينَ` → source `ٱلْـٔ͏َاخِرِينَ`.
- p535 / line 15 / slot 2; 56.49.3; long_initial_hamza: app `وَٱلۡأٓخِرِينَ` → source `وَٱلْـٔ͏َاخِرِينَ`.
- p536 / line 1 / slot 6; 56.52.0; long_initial_hamza: app `لَأٓكِلُونَ` → source `لَـٔ͏َاكِلُونَ`.
- p537 / line 15 / slot 3; 57.3.2; long_initial_hamza: app `وَٱلۡأٓخِرُ` → source `وَٱلْـٔ͏َاخِرُ`.
- p539 / line 13 / slot 11; 57.17.10; long_initial_hamza: app `ٱلۡأٓيَٰتِ` → source `ٱلْـٔ͏َايَٰتِ`.
- p540 / line 6 / slot 6; 57.20.26; long_initial_hamza: app `ٱلۡأٓخِرَةِ` → source `ٱلْـٔ͏َاخِرَةِ`.
- p545 / line 1 / slot 7; 58.22.6; long_initial_hamza: app `ٱلۡأٓخِرِ` → source `ٱلْـٔ͏َاخِرِ`.
- p545 / line 15 / slot 7; 59.3.11; long_initial_hamza: app `ٱلۡأٓخِرَةِ` → source `ٱلْـٔ͏َاخِرَةِ`.
- p550 / line 1 / slot 12; 60.6.11; long_initial_hamza: app `ٱلۡأٓخِرَۚ` → source `ٱلْـٔ͏َاخِرَۚ`.
- p551 / line 6 / slot 4; 60.13.12; long_initial_hamza: app `ٱلۡأٓخِرَةِ` → source `ٱلْـٔ͏َاخِرَةِ`.
- p558 / line 9 / slot 3; 65.2.23; long_initial_hamza: app `ٱلۡأٓخِرِۚ` → source `ٱلْـٔ͏َاخِرِۚ`.
- p565 / line 10 / slot 1; 68.33.3; long_initial_hamza: app `ٱلۡأٓخِرَةِ` → source `ٱلْـٔ͏َاخِرَةِ`.
- p569 / line 14 / slot 8; 70.38.2; below_yeh_hamza: app `ٱمۡرِيٕٖ` → source `ٱمْرِي͏ٔ͏ࣲ`.
- p572 / line 11 / slot 2; 72.9.8; long_initial_hamza: app `ٱلۡأٓنَ` → source `ٱلْـٔ͏َانَ`.
- p575 / line 15 / slot 6; 74.16.3; long_initial_hamza: app `لِأٓيَٰتِنَا` → source `لِـٔ͏َايَٰتِنَا`.
- p577 / line 3 / slot 2; 74.52.3; below_yeh_hamza: app `ٱمۡرِيٕٖ` → source `ٱمْرِي͏ٔ͏ࣲ`.
- p577 / line 4 / slot 1; 74.53.4; long_initial_hamza: app `ٱلۡأٓخِرَةَ` → source `ٱلْـٔ͏َاخِرَةَ`.
- p578 / line 1 / slot 6; 75.21.1; long_initial_hamza: app `ٱلۡأٓخِرَةَ` → source `ٱلْـٔ͏َاخِرَةَ`.
- p580 / line 14 / slot 7; 77.17.2; long_initial_hamza: app `ٱلۡأٓخِرِينَ` → source `ٱلْـٔ͏َاخِرِينَ`.
- p584 / line 3 / slot 1; 79.20.1; long_initial_hamza: app `ٱلۡأٓيَةَ` → source `ٱلْـٔ͏َايَةَ`.
- p584 / line 4 / slot 9; 79.25.3; long_initial_hamza: app `ٱلۡأٓخِرَةِ` → source `ٱلْـٔ͏َاخِرَةِ`.
- p585 / line 13 / slot 6; 80.37.1; below_yeh_hamza: app `ٱمۡرِيٕٖ` → source `ٱمْرِي͏ٔ͏ࣲ`.
- p592 / line 1 / slot 5; 87.17.0; long_initial_hamza: app `وَٱلۡأٓخِرَةُ` → source `وَٱلْـٔ͏َاخِرَةُ`.
- p595 / line 15 / slot 4; 92.13.2; long_initial_hamza: app `لَلۡأٓخِرَةَ` → source `لَلْـٔ͏َاخِرَةَ`.
- p596 / line 7 / slot 1; 93.4.0; long_initial_hamza: app `وَلَلۡأٓخِرَةُ` → source `وَلَلْـٔ͏َاخِرَةُ`.

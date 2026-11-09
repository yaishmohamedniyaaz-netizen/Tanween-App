# W1 faithful source rebuild: checkpoint 1

This is reconstructed from retained source/tool history, not recovered original files. New numerical and visual checks are pending. Source is ready for incremental persistence before runs.

Method preserved: exact app units; stock HarfBuzz CHARACTER clusters; FreeType 64px no hinting; ambiguous/missing glyph or empty unit causes abstention; overlapping font glyph pixels remain explicitly overlapping. TV-L1 2-D registration transports each mask with the same displacement field (attachment12, tightness.3, five warps, ten iterations, sigma1). Full support uses x-extents of the lowest40% of unit ink, clipped to immutable body box; scorer shrinks independently to centred40% bars. Refactoring into shared predict() avoids runner duplication; no claim of identical original source bytes.

Pinned fonts: oldmadinafont 6e19182f25fb6bd9b6ec05bbb34a3785b2699cca; Amiri d3d0c5cb6fe7196cb4a58608fc5c8ecd2e6e80fa. Both previously inspected as SIL OFL1.1 and will be reinspected before use. Old Madina README describes1995 rather than independently proving1405 match. Hafs WOFF2 conversion remains deferred due restrictive embedded license. No downloaded repository code executes.

Prior retained results (not new evidence): oldmadina293/376 short bars,91/95 words; Amiri308/389,95/95; regular-development Amiri87/100. IoU affine→2-D .2954→.8785 and .2353→.8587. All low, high coverage0%. Registration can fold and erase strokes; high union overlap does not prove ownership. Historic span metrics cannot establish actual2-D ink labels.

Run bash scripts/letter-masks/research/w1_reproduce.sh; then venv Python w1_test.py. Top100 runner w1_top100.py requires reference_visual_pilot.json. No source/artwork/page/unit/approval edits and no publication by W1 worker.

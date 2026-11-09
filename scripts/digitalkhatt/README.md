# DigitalKhatt research pipeline

The owner approved continuing with page/line/reading-order word correspondence
and DigitalKhatt's own geometry after the initial artwork-overlap stop. The
original Phase 0 report remains unchanged as historical evidence. Word mapping,
source-span letter mapping, source-engine feasibility and local-only SVG research
are now separate checks. **Checkpoint 1 is not complete; no drawing switch or
production assets are included.**

Read [reports/WORD_MAPPING.md](reports/WORD_MAPPING.md),
[reports/MAPPING.md](reports/MAPPING.md),
[reports/PIPELINE_FEASIBILITY.md](reports/PIPELINE_FEASIBILITY.md),
[reports/INDEPENDENT_REVIEW.md](reports/INDEPENDENT_REVIEW.md), and the hand-back in
[`CODEX_TASK_DIGITALKHATT_LETTER_COLOUR.md`](../../docs/CODEX_TASK_DIGITALKHATT_LETTER_COLOUR.md).
The existing `prototype/` remains reference code, unchanged.

## Reproduce

One command reruns the PDF research checks, retaining derived SVGs outside the
repository and writing only measurement/coverage reports here:

```sh
python scripts/digitalkhatt/checkpoint_research.py \
  --pdf /path/to/oldmadinafont/old_Madinah_mushaf.pdf \
  --local-out /path/outside/repo/digitalkhatt-research
```

Use `--report-out /second/report/directory` for a deterministic comparison.
This requires the Python packages below, Node 22.18+, and `pdftocairo`. It does
not run a browser, generate production assets or approve their use. Individual
commands remain available for each stage.

The independent, PDF-free corpus/font probe and source database adapter have
their own [source pipeline instructions](source_pipeline/README.md). Their
default HarfBuzz measurements are not exact native justification proof.

### Original parity audit

Python 3.12.14 was used. Install the pinned dependencies in a virtual environment:

```sh
python -m pip install -r scripts/digitalkhatt/requirements-parity.txt
git clone https://github.com/DigitalKhatt/oldmadinafont /path/to/oldmadinafont
git -C /path/to/oldmadinafont checkout adc60f3865b507684bda856d59940a7f3602be32
```

One command regenerates all three deterministic reports for all 604 pages:

```sh
python scripts/digitalkhatt/parity.py --pdf /path/to/oldmadinafont/old_Madinah_mushaf.pdf
```

The supplied PDF's SHA256 is checked before parsing. The pipeline reads, but
never rewrites, the protected app page JSON. Reports contain source/tool versions
and a combined checksum of all app page JSON in numeric page order. There are
no timestamps or random sampling in the generated reports. `--out DIR` writes a
second copy for byte-for-byte verification.

Run focused tests, including the real pinned PDF:

```sh
DK_PDF=/path/to/oldmadinafont/old_Madinah_mushaf.pdf python -m unittest discover -s scripts/digitalkhatt -p 'test_*.py' -v
```

Without `DK_PDF`, the three PDF integration tests are explicitly skipped; do not
describe that as complete source validation.

## Scope and limits

- Unicode comes from `/ActualText`, not the prototype's approximate glyph labels.
- Every shown glyph is checked against PyMuPDF's trace identity. This does not
  prove glyph-to-letter ownership, which remains Phase 2 work.
- Physical row detection is specific to the pinned PDF's text matrices.
- Boxes use declared Type3 bounds. They are rough geometry, not pixel segmentation.
- Whole-frame scale is literal. No registration or fitted crop masks the mismatch.
- Strict spelling differences remain listed even if a separate hamza-notation
  diagnostic compares equal. The word mapper separately validates all 293 exact
  pairs using five directional, pinned classifications. Neither step changes
  religious text, judging units or saved marks.
- The source PDF, outlines and rendered pages are not redistributed. See
  [licensing findings](reports/LICENSING.md).
- Source-span glyph assignments are evidence for ownership, not automatic
  approval of every outline or a replacement for colored-sheet visual review.
- The Chromium benchmark harness is supplied, but could not run in this
  environment because browser IPC sockets were denied. No browser timing or
  tablet/Safari acceptance is claimed. See [SVG_RESEARCH.md](reports/SVG_RESEARCH.md).

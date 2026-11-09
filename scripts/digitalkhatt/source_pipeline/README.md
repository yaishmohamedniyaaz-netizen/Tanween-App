# Independent source-font research

These scripts read no sample PDF and do not generate runtime app assets. Run with
Python 3.12, fontTools 4.61.1 and a system HarfBuzz shared library (measured with
10.2.0). The reused `parity.py` text normalizers also import the PDF libraries
pinned in `scripts/digitalkhatt/requirements-parity.txt`; those libraries must be
installed even though this probe never opens a PDF. Install dependencies only through your permitted package workflow.

External input checkouts:

- `DigitalKhatt/oldmadinafont` at `adc60f3865b507684bda856d59940a7f3602be32` (OFL 1.1).
- `DigitalKhatt/digitalkhatt.org` at `4213fab9892774f74f7164c70a70dd84a14f0215` (root MIT, retain separate third-party notices).

The scripts check the corpus and OTF SHA-256 pins before use. They take external
paths rather than copying those projects into this repository. Output belongs in
a separate research directory, never `public/`.

From the Tanween repository root:

```sh
python scripts/digitalkhatt/source_pipeline/probe.py \
  --website /path/to/digitalkhatt.org \
  --font /path/to/oldmadinafont/fonts/oldmadina.otf \
  --app-pages public/mushaf/1405-artwork-5a5f9f3846158475 \
  --output /path/to/source-proof

python scripts/digitalkhatt/source_pipeline/build_source_database.py \
  --website /path/to/digitalkhatt.org \
  --output /path/to/source-proof
```

`probe.json` includes all strict text differences, independent per-line count
checks, missing-glyph counts, compressed asset sizes and input hashes.
`p3-line1-standard-hb.svg` proves that source-font outlines can be exported with
positions. It uses default shaping, not official native line justification. No
claim about browser paint, native pixel equality or letter-unit ownership follows.
The probe reuses the audit's unchanged skeleton and hamza diagnostic functions;
it does not change the app's religious text or judging units.

`website-source.sqlite` contains only the schema the pinned native CLI reads,
populated from the official website text. The adapter verifies the SQL query
roundtrips every body line byte-for-byte. The generated database is our adapter,
not DigitalKhatt's unpublished original database. Native normalization, heading
assembly and settings need separate checks before claiming native layout parity.
`website-source-database.json` records row counts and hashes. Repeating both
commands in the same pinned toolchain produces byte-identical outputs; elapsed
wall time is intentionally excluded.

See [pipeline feasibility](../reports/PIPELINE_FEASIBILITY.md) for the native
build status, licensing boundaries, missing release gates and exact engine pin.

Output paths resolving inside this checkout are rejected. Existing output-file
symlinks are rejected; publication uses atomic replacement after explicit validation
(which still runs under `python -O`). The SQLite adapter uses a unique temporary
file and records the Python/SQLite versions used for byte reproducibility.

## Native generation and raster/bounds proof

Install pinned dependencies with `python -m pip install -r
scripts/digitalkhatt/source_pipeline/requirements.txt` in your permitted research
environment. See [BUILD_NATIVE.md](BUILD_NATIVE.md) for exact source compilation,
portability patch, fitted generation and decoding commands. The decoder audits
all 604 pages and writes only external local SVG/PNG proofs. Its optional
`--bottom-padding 120` creates a separately labelled 27520-unit canvas, without
changing any glyph coordinates or scales; baseline 27400-unit failures remain
in the same report. This is a research comparison, not a production decision.

Filesystem guard tests: `python -O -m unittest discover -s
scripts/digitalkhatt/source_pipeline -p test_safety.py -v` (four passed).

## Source-only visual review sheets

Generate seeded colored-word sheets after fitted native generation. Inkscape
is required for SVG rasterization; the pinned input hashes and all nonempty
binary/JSONL occurrences are verified before coloring:

```sh
python scripts/digitalkhatt/source_pipeline/color_proof.py \
  --native /path/to/native-candidate --output /path/to/colour-proof
```

This produces 200 random words, 40 explicitly text-selected special candidates,
five exact cases and nine checkpoint-page word examples. It does not integrate
the app or claim all samples have human approval. See
[COLOUR_PROOF.md](../reports/COLOUR_PROOF.md).

Create the nine-page comparison PDF from the padded native PNGs and unchanged
artwork. ReportLab/Pillow and the default Liberation Sans fonts (or explicit
`--font-regular`/`--font-bold` paths) are required:

```sh
python scripts/digitalkhatt/source_pipeline/contact_proof.py \
  --artwork public/mushaf/1405-artwork-5a5f9f3846158475 \
  --native /path/to/native-padded-proof \
  --report scripts/digitalkhatt/reports/native-pipeline.json \
  --output /path/to/contact-proof
```

The PDF labels missing decorative headings and the separate padding candidate.
Neither image is cropped or fitted to the other. Render all PDF pages and
inspect them before delivery. The measured nine-page output was byte-identical
on a repeat run; source images were unchanged. Review artifacts stay outside
the repository and are delivered separately, not deployed as app assets.

Run the native mapping, color linkage and output-guard tests together:

```sh
python -m unittest discover -s scripts/digitalkhatt/source_pipeline -p 'test_*.py' -v
```

#!/usr/bin/env python3
"""Validate pinned direct-outline DKLY v4 and render local source-only proofs.
Not a browser renderer or a linguistic ownership proof. Headings are omitted.
"""

import argparse
from collections import Counter
import gzip
import hashlib
import json
import math
from pathlib import Path
import struct
import re
from fontTools.svgLib.path import parse_path
from fontTools.pens.boundsPen import BoundsPen
import sys
import fitz
import brotli
from safety import atomic_write, output_directory

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from parity import skeleton, hamza_diagnostic

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("--binary", type=Path, required=True)
parser.add_argument("--sidecar", type=Path, required=True)
parser.add_argument("--binary-sha256", required=True)
parser.add_argument("--sidecar-sha256", required=True)
parser.add_argument("--app-pages", type=Path, required=True)
parser.add_argument("--expected-pages", type=int, default=604)
parser.add_argument("--render-pages", default="1,2,3,50,187,293,582,600,604")
parser.add_argument("--output", type=Path, required=True)
parser.add_argument(
    "--bottom-padding",
    type=int,
    default=0,
    help="Explicit research-only uniform page extension; never shifts/scales glyphs",
)
args = parser.parse_args()
if not 0 <= args.bottom_padding <= 1000:
    raise ValueError("Research bottom padding must be0..1000 source units")
render_height = 27400 + args.bottom_padding
out = output_directory(args.output)
data = args.binary.read_bytes()
sidecar_bytes = args.sidecar.read_bytes()
if hashlib.sha256(data).hexdigest() != args.binary_sha256:
    raise ValueError("Native binary checksum differs")
if hashlib.sha256(sidecar_bytes).hexdigest() != args.sidecar_sha256:
    raise ValueError("Native sidecar checksum differs")
meta = json.loads(sidecar_bytes)
i = 0


def get(fmt):
    global i
    size = struct.calcsize(">" + fmt)
    if i + size > len(data):
        raise ValueError("Truncated native binary")
    values = struct.unpack_from(">" + fmt, data, i)
    i += size
    if any(isinstance(v, float) and not math.isfinite(v) for v in values):
        raise ValueError("Nonfinite native geometry")
    if any(isinstance(v, float) and abs(v) > 1000000 for v in values):
        raise ValueError("Native outline coordinate exceeds research safety bound")
    return values[0] if len(values) == 1 else values


if get("I") != 0x444B4C59 or get("H") != 4:
    raise ValueError("Expected pinned extended-header DKLY v4")
width, spacing = get("II")
if (width, spacing) != (17000, 1800):
    raise ValueError("This proof expects default 17000/1800 native geometry")
variant_count = get("H")
paths, codes, empty, contour_counts = {}, {}, {}, {}
for vid in range(1, variant_count + 1):
    code = get("H")
    codes[vid] = code
    name = meta["glyphNames"].get(str(code))
    if not name or name in (".notdef", "notdef"):
        raise ValueError(f"Missing native glyph identity: {code}")
    contour_count = get("B")
    contour_counts[vid] = contour_count
    path = []
    for contour in range(contour_count):
        x, y = get("ff")
        path.append(f"M{x!r} {y!r}")
        for cubic in range(get("B")):
            path.append("C" + " ".join(repr(x) for x in get("ffffff")))
        path.append("Z")
    paths[vid] = " ".join(path)
    if not path:
        empty[vid] = name
page_count = get("H")
if (
    page_count != args.expected_pages
    or len(meta["pages"]) != page_count
    or len(meta["baselines"]) != page_count
):
    raise ValueError("Native page/sidecar coverage differs")
pages = []
placements = 0
empty_placements = Counter()
for pn in range(page_count):
    lines = []
    count = get("B")
    if count != len(meta["pages"][pn]) or count != len(meta["baselines"][pn]):
        raise ValueError(f"Native line/sidecar coverage differs on page {pn+1}")
    for ln in range(count):
        glyphs = []
        for glyph in range(get("B")):
            vid, cluster, mask = get("HBB")
            if mask & 240:
                raise ValueError("Unknown native placement bitmask")
            values = [
                get(fmt) if mask & (1 << bit) else 0
                for bit, fmt in enumerate(("h", "h", "h", "B"))
            ]
            glyphs.append((vid, cluster, *values))
        kind, x, xscale, font_size, text_length = get("BhiiH")
        if kind not in (0, 1, 2):
            raise ValueError("Unknown native line type")
        surah = get("B") if kind == 1 else None
        line = dict(
            glyphs=glyphs,
            type=kind,
            x=x,
            xscale=xscale / 65536,
            fontSize=font_size / 65536,
            textlen=text_length,
            surah=surah,
        )
        text = meta["pages"][pn][ln]
        if text_length != len(text.encode("utf-16-le")) // 2:
            raise ValueError("Native UTF16 text length differs")
        if not all(0 <= glyph[1] < text_length for glyph in glyphs):
            raise ValueError("Native source cluster outside line")
        if kind == 1:
            if any(g[0] != 0 for g in glyphs):
                raise ValueError("Unexpected heading outline")
        else:
            if any(g[0] not in paths for g in glyphs):
                raise ValueError("Missing native outline reference")
            if not (0 < line["fontSize"] < 100 and 0 < line["xscale"] < 100):
                raise ValueError("Invalid native line scaling")
            placements += len(glyphs)
            empty_placements.update(empty[g[0]] for g in glyphs if g[0] in empty)
        lines.append(line)
    pages.append(lines)
if i != len(data):
    raise ValueError("Unparsed native binary data")
# Empty outlines need explicit accounting, not a missing-ink success claim.
if any(not name.startswith("space") for name in empty.values()):
    raise ValueError(f"Unexpected non-space empty contours: {empty}")

app_hash = hashlib.sha256()
for pn in range(1, 605):
    filename = f"p{pn}.json"
    app_hash.update(
        filename.encode() + b"\0" + (args.app_pages / filename).read_bytes()
    )
if (
    app_hash.hexdigest()
    != "fa39aeb5e6effea289f88e222d50f15000837477df13a80be0fc4e0a81cc997b"
):
    raise ValueError("App corpus differs from verified pin")
words = 0
body_lines = 0
strict = []
native_token_owners = {}
for pn, textpage in enumerate(meta["pages"], 1):
    native_words, native_counts, native_spans = [], [], []
    for line_number, text in enumerate(textpage, 1):
        if text.startswith("سُورَةُ") or text in (
            "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ",
            "بِّسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ",
        ):
            continue
        matches = [
            m
            for m in re.finditer(r"\S+", text)
            if not m.group().startswith(("۝", "۩")) and m.group() != "۞"
        ]
        linewords = [m.group() for m in matches]
        native_spans.extend((line_number, m.start(), m.end()) for m in matches)
        native_words.extend(linewords)
        native_counts.append(len(linewords))
    app = [
        word
        for word in json.loads((args.app_pages / f"p{pn}.json").read_bytes())["words"]
        if word["role"] == "letter"
    ]
    if native_counts != list(Counter(word["line"] for word in app).values()):
        raise ValueError(f"Native/app body-line counts differ on page {pn}")
    for span, target in zip(native_spans, app, strict=True):
        line_number, start, end = span
        native_token_owners.setdefault((pn, line_number), []).append(
            (start, end, target["wid"])
        )
    for source, target in zip(native_words, app, strict=True):
        if hamza_diagnostic(source) != hamza_diagnostic(target["text"]):
            raise ValueError(f'Unknown native/app source difference: {target["wid"]}')
        if skeleton(source) != skeleton(target["text"]):
            strict.append(
                dict(page=pn, wid=target["wid"], source=source, app=target["text"])
            )
    words += len(native_words)
    body_lines += len(native_counts)
if page_count == 604 and (words, body_lines, len(strict)) != (77433, 8820, 293):
    raise ValueError("Full native corpus coverage differs")


def sizes(payload):
    return dict(
        bytes=len(payload),
        gzip9=len(gzip.compress(payload, compresslevel=9, mtime=0)),
        brotli9=len(brotli.compress(payload, quality=9)),
    )


atlas = (
    '<svg xmlns="http://www.w3.org/2000/svg"><defs>'
    + "".join(f'<path id="g{vid}" d="{paths[vid]}"/>' for vid in sorted(paths))
    + "</defs></svg>"
).encode()
shared_pages = []
selected = [int(n) for n in args.render_pages.split(",")]
if any(n < 1 or n > page_count for n in selected):
    raise ValueError("Selected render page outside binary")
rendered = []
advance_overflows = []
variant_bounds = {}
for vid, path in paths.items():
    pen = BoundsPen(None)
    parse_path(path, pen)
    variant_bounds[vid] = pen.bounds
ink_outside_frame = []
ink_outside_padded_frame = []
ink_checked = 0
nonunit_scale_lines = 0
for pn in range(1, page_count + 1):
    uses, ids = [], set()
    for ln, line in enumerate(pages[pn - 1]):
        if line["type"] == 1:
            continue  # Deliberately omit separately rendered decorative headers.
        right = width - line["x"]
        line_scale = line["fontSize"] * (line["xscale"] if line["type"] == 0 else 1)
        left_advance = right - sum(glyph[2] for glyph in line["glyphs"]) * line_scale
        if left_advance < 0:
            advance_overflows.append(
                dict(page=pn, line=ln + 1, left_advance=left_advance)
            )
        x = right
        scale = line["fontSize"] * (line["xscale"] if line["type"] == 0 else 1)
        if scale != 1 or line["fontSize"] != 1:
            nonunit_scale_lines += 1
        for vid, cluster, ax, dx, dy, color in line["glyphs"]:
            x -= ax
            px = right + (x + dx - right) * scale
            py = -meta["baselines"][pn - 1][ln] - dy * line["fontSize"]
            bounds = variant_bounds[vid]
            if bounds is not None:
                ink_checked += 1
                a, b, c, d = bounds
                box = [
                    px + a * scale,
                    py - d * line["fontSize"],
                    px + c * scale,
                    py - b * line["fontSize"],
                ]
                if (
                    box[0] < -0.001
                    or box[1] < -0.001
                    or box[2] > width + 0.001
                    or box[3] > render_height + 0.001
                ):
                    ink_outside_padded_frame.append(
                        dict(page=pn, line=ln + 1, variant=vid, box=box)
                    )
                if (
                    box[0] < -0.001
                    or box[1] < -0.001
                    or box[2] > width + 0.001
                    or box[3] > 27400.001
                ):
                    wid = next(
                        (
                            wid
                            for start, end, wid in native_token_owners.get(
                                (pn, ln + 1), []
                            )
                            if start <= cluster < end
                        ),
                        None,
                    )
                    ink_outside_frame.append(
                        dict(
                            page=pn,
                            line=ln + 1,
                            wid=wid,
                            cluster=cluster,
                            variant=vid,
                            name=meta["glyphNames"][str(codes[vid])],
                            box=box,
                        )
                    )
            ids.add(vid)
            uses.append(
                f'<use href="#g{vid}" transform="translate({px!r} {py!r}) scale({scale!r} {-line["fontSize"]!r})"/>'
            )
    position_svg = (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width} {render_height}">'
        + "".join(uses).replace('href="#g', 'href="atlas.svg#g')
        + "</svg>"
    ).encode()
    shared_pages.append(dict(page=pn, **sizes(position_svg)))
    if pn not in selected:
        continue
    svg = (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width} {render_height}"><rect width="100%" height="100%" fill="white"/><defs>'
        + "".join(f'<path id="g{vid}" d="{paths[vid]}"/>' for vid in sorted(ids))
        + "</defs>"
        + "".join(uses)
        + "</svg>"
    )
    svg_bytes = svg.encode()
    source_doc = fitz.open(stream=svg_bytes, filetype="svg")
    # Rasterize only our generated source SVG, never the sample Mushaf PDF.
    raster_doc = fitz.open("pdf", source_doc.convert_to_pdf())
    page = raster_doc[0]
    pix = page.get_pixmap(
        matrix=fitz.Matrix(850 / page.rect.width, 850 / page.rect.width)
    )
    atomic_write(out / f"p{pn}-native.svg", svg_bytes)
    atomic_write(out / f"p{pn}-native.png", pix.tobytes("png"))
    rendered.append(
        dict(
            page=pn,
            lines=len(pages[pn - 1]),
            placements=len(uses),
            variants=len(ids),
            svg_bytes=len(svg_bytes),
            gzip9=len(gzip.compress(svg_bytes, compresslevel=9, mtime=0)),
            brotli9=len(brotli.compress(svg_bytes, quality=9)),
        )
    )
    raster_doc.close()
    source_doc.close()
result = dict(
    advance_overflows_beyond_page=advance_overflows,
    padded_frame_candidate=dict(
        bottom_padding=args.bottom_padding,
        height=render_height,
        glyph_coordinates_unchanged=True,
        outside_frame=ink_outside_padded_frame,
        production_choice=False,
    ),
    ink_bounds=dict(
        method="Exact cubic extrema from decoded float32 paths, then upstream line horizontalScale/offset transforms; fixed 17000x27400 native frame, 0.001 tolerance; no crop fitting.",
        checked_nonempty_placements=ink_checked,
        nonunit_scale_lines=nonunit_scale_lines,
        outside_frame=ink_outside_frame,
    ),
    compression_tools=dict(brotli=brotli.__version__, python=sys.version.split()[0]),
    native_binary_sizes=sizes(data),
    native_sidecar_sizes=sizes(sidecar_bytes),
    shared_atlas_sizes=sizes(atlas),
    shared_placement_page_sizes=shared_pages,
    shared_placement_totals={
        key: sum(page[key] for page in shared_pages)
        for key in ("bytes", "gzip9", "brotli9")
    },
    binary_sha256=args.binary_sha256,
    sidecar_sha256=args.sidecar_sha256,
    app_pages_sha256=app_hash.hexdigest(),
    pages=page_count,
    body_words=words,
    body_lines=body_lines,
    nonheading_glyph_placements=placements,
    variants=variant_count,
    variant_contours={
        vid: dict(
            codepoint=codes[vid],
            name=meta["glyphNames"][str(codes[vid])],
            contours=contour_counts[vid],
        )
        for vid in paths
    },
    empty_contour_variants=empty,
    empty_contour_placements=dict(empty_placements),
    strict_differences=strict,
    native_clusters_valid=True,
    missing_outline_references=0,
    binary_bytes=len(data),
    binary_gzip9=len(gzip.compress(data, compresslevel=9, mtime=0)),
    rendered=rendered,
    caveat="Source-only research. Placements include spaces, verse markers and basmalas. Headers and semantic app-unit metadata omitted from SVG size estimates. No browser timing, visual approval or app-unit ownership proof.",
)
atomic_write(
    out / "native-proof.json", json.dumps(result, ensure_ascii=False, indent=2).encode()
)
print(
    json.dumps({k: v for k, v in result.items() if k != "strict_differences"}, indent=2)
)

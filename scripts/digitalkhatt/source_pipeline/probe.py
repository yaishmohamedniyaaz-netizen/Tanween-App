#!/usr/bin/env python3
"""Local research only. Reads no PDF. Uses system HarfBuzz, not native justification.
Pinned source corpus and font hashes are checked before shaping.
"""

import argparse, ast, ctypes as C, ctypes.util, json, gzip, hashlib, collections, sys
from pathlib import Path
from safety import output_directory, atomic_write
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.boundsPen import BoundsPen

parser = argparse.ArgumentParser(
    description="PDF-independent source-corpus and default-font-shaping probe; not an exact-layout renderer."
)
parser.add_argument(
    "--website",
    type=Path,
    required=True,
    help="Pinned official digitalkhatt.org checkout",
)
parser.add_argument("--font", type=Path, required=True, help="Pinned OFL oldmadina.otf")
parser.add_argument("--app-pages", type=Path, required=True)
parser.add_argument(
    "--output",
    type=Path,
    required=True,
    help="Research directory outside production assets",
)
args = parser.parse_args()
ROOT = output_directory(args.output)
FONT = args.font
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from parity import skeleton, hamza_diagnostic

source = args.website / "ClientApp/src/app/services/quran_text_old_madinah.ts"
text = source.read_text()
expected = "08972d48c6c250fda4ce9c58a2f23be52c17b0cf097ac093a040e3c392b79f07"
if hashlib.sha256(source.read_bytes()).hexdigest() != expected:
    raise ValueError("Source corpus differs from verified pin")
if (
    hashlib.sha256(FONT.read_bytes()).hexdigest()
    != "e83c1bdb8feffddf3596116de25cb04028ac96d86b5500db69478417917bf16f"
):
    raise ValueError("OTF differs from verified pin")
app_hash = hashlib.sha256()
for number in range(1, 605):
    filename = f"p{number}.json"
    app_hash.update(
        filename.encode() + b"\0" + (args.app_pages / filename).read_bytes()
    )
app_sha256 = app_hash.hexdigest()
if app_sha256 != "fa39aeb5e6effea289f88e222d50f15000837477df13a80be0fc4e0a81cc997b":
    raise ValueError("App page corpus differs from verified pin")
pages = ast.literal_eval(text[text.index("[") : text.rindex("]") + 1])
library = ctypes.util.find_library("harfbuzz")
if not library:
    raise RuntimeError("System HarfBuzz library is required")
hb = C.CDLL(library)


def bind(n, rest, args):
    f = getattr(hb, n)
    f.restype = rest
    f.argtypes = args
    return f


P = C.c_void_p
U = C.c_uint
I = C.c_int


class Info(C.Structure):
    _fields_ = [("codepoint", U), ("mask", U), ("cluster", U), ("var1", U), ("var2", U)]


class Pos(C.Structure):
    _fields_ = [
        ("x_advance", I),
        ("y_advance", I),
        ("x_offset", I),
        ("y_offset", I),
        ("var", U),
    ]


blob = bind("hb_blob_create_from_file_or_fail", P, [C.c_char_p])(str(FONT).encode())
if not blob:
    raise RuntimeError("HarfBuzz could not load verified OTF")
face = bind("hb_face_create", P, [P, U])(blob, 0)
font = bind("hb_font_create", P, [P])(face)
bind("hb_ot_font_set_funcs", None, [P])(font)
create = bind("hb_buffer_create", P, [])
add = bind("hb_buffer_add_utf8", None, [P, C.c_char_p, I, U, I])
guess = bind("hb_buffer_guess_segment_properties", None, [P])
shape = bind("hb_shape", None, [P, P, P, U])
infos = bind("hb_buffer_get_glyph_infos", C.POINTER(Info), [P, C.POINTER(U)])
poses = bind("hb_buffer_get_glyph_positions", C.POINTER(Pos), [P, C.POINTER(U)])
destroy = bind("hb_buffer_destroy", None, [P])
ft = TTFont(FONT)
names = ft.getGlyphOrder()
glyphs = ft.getGlyphSet()
paths = {}


def run(line):
    b = create()
    raw = line.encode()
    add(b, raw, len(raw), 0, len(raw))
    guess(b)
    shape(font, b, None, 0)
    n = U()
    inf = infos(b, C.byref(n))
    pos = poses(b, C.byref(n))
    out = [
        dict(
            gid=inf[i].codepoint,
            cluster=inf[i].cluster,
            ax=pos[i].x_advance,
            dx=pos[i].x_offset,
            dy=pos[i].y_offset,
        )
        for i in range(n.value)
    ]
    destroy(b)
    return out


allglyphs = 0
missing = 0
bodywords = 0
linecount = 0
mismatches = []
strict = []
diagnostic = []
for pn, page in enumerate(pages, 1):
    actual = json.loads((args.app_pages / f"p{pn}.json").read_text())
    expected = collections.Counter(
        w["line"] for w in actual["words"] if w["role"] == "letter"
    )
    counts = []
    sourcewords = []
    for line in page:
        data = run(line)
        allglyphs += len(data)
        missing += sum(x["gid"] == 0 for x in data)
        if (
            line.startswith("سُورَةُ")
            or line == "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ"
        ):
            continue
        words = [
            w
            for w in line.split()
            if not w.startswith("۝") and not w.startswith("۩") and w != "۞"
        ]
        counts.append(len(words))
        sourcewords.extend(words)
        bodywords += len(words)
        linecount += 1
    if counts != list(expected.values()):
        mismatches.append({"page": pn, "web": counts, "app": list(expected.values())})
    appwords = [w for w in actual["words"] if w["role"] == "letter"]
    for word, app in zip(sourcewords, appwords, strict=True):
        record = {"page": pn, "wid": app["wid"], "source": word, "app": app["text"]}
        if skeleton(word) != skeleton(app["text"]):
            strict.append(record)
        if hamza_diagnostic(word) != hamza_diagnostic(app["text"]):
            diagnostic.append(record)
sample = pages[2][0]
data = run(sample)
x = 0
uses = []
ink = []
for item in data:
    gid = item["gid"]
    if gid not in paths:
        pen = SVGPathPen(glyphs)
        glyphs[names[gid]].draw(pen)
        paths[gid] = pen.getCommands()
    bounds = BoundsPen(glyphs)
    glyphs[names[gid]].draw(bounds)
    if bounds.bounds:
        a, b, c, d = bounds.bounds
        ink.append(
            (x + item["dx"] + a, -item["dy"] - d, x + item["dx"] + c, -item["dy"] - b)
        )
    uses.append(
        f'<use href="#g{gid}" transform="translate({x+item["dx"]} {-item["dy"]})"/>'
    )
    x += item["ax"]
box = (
    min(b[0] for b in ink) - 100,
    min(b[1] for b in ink) - 100,
    max(b[2] for b in ink) + 100,
    max(b[3] for b in ink) + 100,
)
svg = (
    f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{box[0]:.3f} {box[1]:.3f} {box[2]-box[0]:.3f} {box[3]-box[1]:.3f}"><defs>'
    + "".join(
        f'<path id="g{gid}" d="{path}" transform="scale(1 -1)"/>'
        for gid, path in paths.items()
    )
    + "</defs>"
    + "".join(uses)
    + "</svg>"
)
assets = {}
for p in [
    FONT.parent / name for name in ("oldmadina.otf", "oldmadina.ttf", "oldmadina.woff2")
] + [
    args.website / "ClientApp/src/assets/hb.wasm",
    args.website / "ClientApp/src/assets/VisualMetaFontWasm.wasm",
    source,
]:
    raw = p.read_bytes()
    assets[p.name] = {
        "bytes": len(raw),
        "gzip9": len(gzip.compress(raw, compresslevel=9, mtime=0)),
        "sha256": hashlib.sha256(raw).hexdigest(),
    }
result = {
    "python_version": sys.version.split()[0],
    "website_commit": "4213fab9892774f74f7164c70a70dd84a14f0215",
    "website_license": "https://github.com/DigitalKhatt/digitalkhatt.org/blob/4213fab9892774f74f7164c70a70dd84a14f0215/LICENSE",
    "font_commit": "adc60f3865b507684bda856d59940a7f3602be32",
    "font_license": "https://github.com/DigitalKhatt/oldmadinafont/blob/adc60f3865b507684bda856d59940a7f3602be32/LICENSE",
    "app_pages_sha256": app_sha256,
    "hb_version": bind("hb_version_string", C.c_char_p, [])().decode(),
    "fonttools_version": __import__("fontTools").__version__,
    "pages": len(pages),
    "body_words": bodywords,
    "body_lines": linecount,
    "perline_count_mismatches": mismatches,
    "shaped_glyphs_including_headings": allglyphs,
    "notdef_glyphs": missing,
    "strict_differences": strict,
    "hamza_diagnostic_remaining": diagnostic,
    "sample": {
        "page": 3,
        "line": 1,
        "glyphs": len(data),
        "unique_glyphs": len(paths),
        "advance": x,
        "svg_bytes": len(svg.encode()),
        "gzip9": len(gzip.compress(svg.encode(), compresslevel=9, mtime=0)),
    },
    "assets": assets,
    "caveat": "Default system HarfBuzz only. No official justification, no exact-layout proof, no browser paint measurement.",
}
if not (len(pages) == 604 and bodywords == 77433 and linecount == 8820):
    raise ValueError("Source corpus coverage failed")
if mismatches or diagnostic or missing or len(strict) != 293:
    raise ValueError("Source text/shaping validation failed; outputs not published")
atomic_write(ROOT / "p3-line1-standard-hb.svg", svg.encode())
atomic_write(
    ROOT / "probe.json", json.dumps(result, ensure_ascii=False, indent=2).encode()
)
print(
    json.dumps(
        {k: v for k, v in result.items() if k not in ("strict_differences", "assets")},
        ensure_ascii=False,
        indent=2,
    )
)

bind("hb_font_destroy", None, [P])(font)
bind("hb_face_destroy", None, [P])(face)
bind("hb_blob_destroy", None, [P])(blob)

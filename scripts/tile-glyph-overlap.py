"""Check every letter tile for marks that touch or hide in other ink.

Shapes each distinct tile text (as the tray shows it, tashkeel on) with the
app's Hafs font through HarfBuzz, rasterises each glyph with FreeType at
120 px per em, and reports any mark whose ink overlaps another glyph.

    pip install uharfbuzz freetype-py fonttools brotli numpy
    python3 scripts/tile-glyph-overlap.py          # tiles as shown
    python3 scripts/tile-glyph-overlap.py --raw    # source text, no display fix
"""
import json, subprocess, sys, tempfile, unicodedata
import numpy as np, uharfbuzz as hb, freetype
from fontTools.ttLib import TTFont

PX = 120
ttf = tempfile.NamedTemporaryFile(suffix=".ttf", delete=False).name
font_tt = TTFont("public/fonts/hafs.18.woff2"); font_tt.flavor = None; font_tt.save(ttf)
names = font_tt.getGlyphOrder(); classes = font_tt["GDEF"].table.GlyphClassDef.classDefs
face = hb.Face(hb.Blob.from_file_path(ttf)); font = hb.Font(face); upem = face.upem
ft = freetype.Face(ttf); ft.set_char_size(PX * 64)

def glyphs(text):
    buf = hb.Buffer(); buf.add_str(text); buf.guess_segment_properties()
    buf.cluster_level = hb.BufferClusterLevel.CHARACTERS; hb.shape(font, buf, {})
    x = y = 0
    for info, pos in zip(buf.glyph_infos, buf.glyph_positions):
        ft.load_glyph(info.codepoint, freetype.FT_LOAD_RENDER | freetype.FT_LOAD_NO_HINTING)
        g = ft.glyph; bm = g.bitmap
        a = np.array(bm.buffer, np.uint8).reshape(bm.rows, bm.width) if bm.rows else None
        mark = classes.get(names[info.codepoint]) == 3 or unicodedata.category(text[info.cluster]) == "Mn"
        if a is not None and a.max() > 100:
            yield dict(mark=mark, ch=text[info.cluster], a=a > 100,
                       x=round((x + pos.x_offset) * PX / upem) + g.bitmap_left,
                       y=-round((y + pos.y_offset) * PX / upem) - g.bitmap_top)
        x += pos.x_advance; y += pos.y_advance

def overlap(text):
    gs = list(glyphs(text))
    if len(gs) < 2: return 0
    x0 = min(g["x"] for g in gs); y0 = min(g["y"] for g in gs)
    W = max(g["x"] + g["a"].shape[1] for g in gs) - x0; H = max(g["y"] + g["a"].shape[0] for g in gs) - y0
    full = []
    for g in gs:
        z = np.zeros((H, W), bool); h, w = g["a"].shape
        z[g["y"] - y0:g["y"] - y0 + h, g["x"] - x0:g["x"] - x0 + w] = g["a"]; full.append(z)
    worst = 0
    for i in range(len(gs)):
        for j in range(i + 1, len(gs)):
            if gs[i]["mark"] or gs[j]["mark"]:
                worst = max(worst, int((full[i] & full[j]).sum()))
    return worst

args = ["node", "--experimental-strip-types", "scripts/tile-glyph-dump.mts"] + (["--raw"] if "--raw" in sys.argv else [])
tiles = json.loads(subprocess.run(args, capture_output=True, text=True, check=True).stdout)
bad = sorted(((overlap(t), v["n"], t, v["ex"]) for t, v in tiles.items()), reverse=True)
bad = [b for b in bad if b[0] >= 4]
print(f"{len(tiles)} tile texts; {len(bad)} with a mark overlapping other ink "
      f"({sum(b[1] for b in bad)} tiles in the Quran)")
for px, n, t, ex in sorted(bad, key=lambda b: -b[1]):
    print(f"  {n:5d}  {t}  ({' '.join(f'{ord(c):04X}' for c in t)})  overlap {px} px  e.g. {ex}")

"""Review sheet for underlines: print word, letter bodies lightly tinted, new bars.
Bars are drawn on two alternating rows only so overlaps are visible."""
import sys, json
import numpy as np
from PIL import Image, ImageDraw, ImageFont
sys.path.insert(0, __import__('os').path.dirname(__import__('os').path.dirname(__import__('os').path.abspath(__file__))))
import dkguide as G
from bars_v2 import bars_v2

PAL = [(202, 36, 77), (51, 88, 212), (213, 142, 58), (40, 140, 90), (140, 60, 180), (0, 150, 170), (190, 90, 20), (90, 90, 90)]
FONT = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 22)


def tile(p, wid, n, scale=2.0):
    r = G.label_print(p, wid)
    lab, ink = r['labels'], r['ink']
    H, W = lab.shape
    img = np.full((H, W, 3), 255, np.uint8)
    img[ink] = (25, 25, 25)
    k2 = 0
    for k, t in enumerate(r['tids']):
        if t == '__none__':
            continue
        m = (lab == k + 1) & ink
        c = np.array(PAL[k2 % len(PAL)])
        img[m] = (0.45 * c + 0.55 * np.array([25, 25, 25])).astype(np.uint8)
        k2 += 1
    bh = 8
    canvas = np.full((H + 4 * bh, W, 3), 255, np.uint8)
    canvas[:H] = img
    k2 = 0
    for t, b in bars_v2(r).items():
        if t == '__none__':
            continue
        if b:
            y = H + bh + (k2 % 2) * 7
            canvas[y:y + 5, max(0, b[0]):min(W, b[1])] = PAL[k2 % len(PAL)]
        k2 += 1
    im = Image.fromarray(canvas)
    return im.resize((int(W * scale), int((H + 4 * bh) * scale)), Image.LANCZOS)


def sheet(items, path, cols=3):
    tiles = [(tile(p, w, i), f"{i}. p{p} {w}") for i, (p, w) in enumerate(items, 1)]
    cw = max(t.width for t, _ in tiles) + 30
    rows = [tiles[i:i + cols] for i in range(0, len(tiles), cols)]
    rh = [max(t.height for t, _ in row) + 36 for row in rows]
    out = Image.new('RGB', (cw * cols, sum(rh)), 'white')
    d = ImageDraw.Draw(out)
    y = 0
    for row, h in zip(rows, rh):
        for c, (im, cap) in enumerate(row):
            out.paste(im, (c * cw + (cw - im.width) // 2, y + 30))
            d.text((c * cw + 6, y + 2), cap, fill=(0, 0, 0), font=FONT)
        y += h
    out.thumbnail((2000, 2000))
    out.save(path, quality=85)


if __name__ == '__main__':
    items = json.loads(sys.argv[1])
    sheet([tuple(x[:2]) for x in items], sys.argv[2])
